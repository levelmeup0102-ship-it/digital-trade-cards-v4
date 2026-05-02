'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getTeamWithMembersByCode, joinAsStudent,
  assignRoles, startTeamGame,
  subscribeToTeamStart, subscribeToTeamMembers,
  getTeamGameStatus, getTeamMembers,
} from '@/lib/teacher';
import { supabase } from '@/lib/supabase';
import type { Team, TeamMember } from '@/lib/teacher';
import { ROLES, MEMBER_ROLE_SETS, getRecommendedRoles, getRole, type RoleCode } from '@/data/roleData';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };

const ITEMS = ['💄 K-뷰티 (스킨케어)', '🍜 K-푸드 (라면·스낵)', '🧬 바이오/디지털 헬스케어', '🎮 디지털 콘텐츠 (웹툰·게임)', '📱 스마트 기기 (IoT)', '✏️ 직접 입력'];
const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', timer: 1800, minChars: 20,  color: '#059669' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50,  color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', timer: 900,  minChars: 100, color: '#582C83' },
};

const WAITING_MESSAGES = [
  '✨ 잠시만 기다려주세요...',
  '🎯 팀장이 전략을 짜고 있어요',
  '🌏 디지털 무역의 세계로 떠날 준비!',
  '🎴 카드를 섞고 있어요...',
  '👥 팀원들이 모두 모이는 중',
  '🚀 곧 게임이 시작됩니다',
  '💼 당신의 직무가 배정될 거예요',
];

const CARD_COLORS_LIST = [
  '#4FB0C6', '#1A237E', '#009688', '#6A1B9A', '#F9A825',
  '#546E7A', '#4CAF50', '#880E4F', '#E53935', '#00838F',
  '#00695C', '#4E342E', '#E64A19', '#1565C0', '#2E7D32', '#1976D2',
];

const FLOATING_CARDS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  color: CARD_COLORS_LIST[i * 2],
  cardNum: String((i * 2) + 1).padStart(2, '0'),
  left: [10, 85, 20, 75, 5, 90, 30, 65][i],
  top: [15, 20, 75, 80, 50, 55, 5, 90][i],
  size: [40, 50, 35, 45, 50, 40, 45, 38][i],
  duration: [12, 14, 10, 15, 13, 11, 16, 12][i],
  delay: [0, 1.5, 0.8, 2.2, 0.4, 1.8, 1.2, 2.6][i],
  rotate: [-15, 12, -8, 20, -22, 10, 18, -12][i],
}));

const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 1.5 + Math.random() * 2,
  duration: 6 + Math.random() * 6,
  delay: Math.random() * 5,
  color: i % 3 === 0 ? S.green : i % 3 === 1 ? S.aqua : '#C1A8F0',
}));

type Step = 'code' | 'confirm' | 'select' | 'leader-setup' | 'waiting' | 'welcome';

// ⭐ 리플 효과 타입
type Ripple = { id: number; x: number; y: number; key: string };

// ⭐ 클릭 시 빛 입자 터짐 타입
type BurstEffect = { id: number; key: string };

// ⭐ 인터랙티브 버튼 컴포넌트 — 오로라 파동만
function InteractiveButton({
  isSelected,
  onClick,
  color,
  children,
  className,
  style,
  uniqueKey,
}: {
  isSelected: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  uniqueKey: string;
}) {
  const [auroraWave, setAuroraWave] = useState(false);

  const handleClick = () => {
    // 오로라 파동 한 번 (물결처럼 흐름)
    setAuroraWave(true);
    setTimeout(() => setAuroraWave(false), 2500);

    onClick();
  };

  return (
    <button onClick={handleClick}
      className={`relative overflow-hidden interactive-btn ${isSelected ? 'is-selected' : ''} ${className || ''}`}
      style={style}>
      {/* 호버 시 빛 흐름 (광택) */}
      <span className="absolute inset-0 -translate-x-full hover-shine pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color}55 50%, transparent 100%)`,
        }} />

      {/* ⭐ 오로라 파동 (박스 전체에 깔리고 물결처럼 흐름) */}
      {auroraWave && (
        <div className="absolute inset-0 pointer-events-none aurora-wave"
          style={{
            background: 'linear-gradient(110deg, #06B6D4 0%, #8B5CF6 25%, #3B82F6 50%, #8B5CF6 75%, #06B6D4 100%)',
            backgroundSize: '200% 200%',
            mixBlendMode: 'screen',
          }} />
      )}

      <span className="relative z-10">{children}</span>
    </button>
  );
}

export default function StudentJoin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('code');
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [level, setLevel] = useState('standard');

  const [roleAssignments, setRoleAssignments] = useState<Record<string, RoleCode>>({});

  const [waitingMsgIdx, setWaitingMsgIdx] = useState(0);
  const [recentJoiners, setRecentJoiners] = useState<TeamMember[]>([]);
  const previousMembersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (step !== 'waiting') return;
    const interval = setInterval(() => {
      setWaitingMsgIdx(i => (i + 1) % WAITING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== 'waiting' || !team) return;

    const unsubscribe = subscribeToTeamStart(team.id, () => {
      handleGameStart();
    });

    (async () => {
      const isStarted = await getTeamGameStatus(team.id);
      if (isStarted) handleGameStart();
    })();

    return () => unsubscribe();
  }, [step, team]);

  useEffect(() => {
    if ((step !== 'waiting' && step !== 'leader-setup') || !team) return;

    const unsubscribe = subscribeToTeamMembers(team.id, (newMembers) => {
      const prevSet = previousMembersRef.current;
      const newJoiners = newMembers.filter(m =>
        m.joined_at && !prevSet.has(m.id)
      );

      if (newJoiners.length > 0 && step === 'waiting') {
        setRecentJoiners(prev => [...prev, ...newJoiners]);
        newJoiners.forEach(joiner => {
          setTimeout(() => {
            setRecentJoiners(prev => prev.filter(j => j.id !== joiner.id));
          }, 3000);
        });
      }

      newMembers.forEach(m => {
        if (m.joined_at) prevSet.add(m.id);
      });

      setMembers(newMembers);
    });

    members.forEach(m => {
      if (m.joined_at) previousMembersRef.current.add(m.id);
    });

    return () => unsubscribe();
  }, [step, team]);

  const handleCodeSubmit = async () => {
    if (joinCode.trim().length < 4) { setCodeError('올바른 코드를 입력해주세요.'); return; }
    setLoading(true); setCodeError('');
    try {
      const result = await getTeamWithMembersByCode(joinCode);
      if (!result) { setCodeError('팀 코드를 찾을 수 없어요. 관리자에게 확인하세요.'); setLoading(false); return; }

      if (result.team.game_started) {
        setTeam(result.team);
        setMembers(result.members);
        setStep('select');
        setLoading(false);
        return;
      }

      setTeam(result.team);
      setMembers(result.members);
      if (result.team.item) setItem(result.team.item);
      if (result.team.level) setLevel(result.team.level);
      setStep('confirm');
    } catch (e) {
      setCodeError('오류가 발생했어요. 다시 시도해주세요.');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!selectedMember || !team) return;
    setLoading(true);
    await joinAsStudent(team.id, selectedMember.id);

    if (team.game_started) {
      finalizeAndStart();
      return;
    }

    if (selectedMember.is_leader) {
      setStep('leader-setup');

      const updatedMembers = await getTeamMembers(team.id);
      setMembers(updatedMembers);

      const nonLeaderMembers = updatedMembers.filter(m => !m.is_leader);
      const recommended = getRecommendedRoles(nonLeaderMembers.length);
      const initial: Record<string, RoleCode> = {};
      nonLeaderMembers.forEach((m, idx) => {
        if (recommended[idx]) initial[m.id] = recommended[idx];
      });
      setRoleAssignments(initial);

      setLoading(false);
    } else {
      setStep('waiting');
      setLoading(false);
    }
  };

  const handleLeaderSetup = async () => {
    if (!item || !team || !selectedMember) return;
    setLoading(true);
    const finalItem = item === '✏️ 직접 입력' ? customItem : item;

    try {
      await supabase.from('teams').update({ item: finalItem, level }).eq('id', team.id);

      const assignments: Array<{ memberId: string; roleCode: string }> = [];
      members.forEach(m => {
        if (m.is_leader) {
          assignments.push({ memberId: m.id, roleCode: 'ceo' });
        } else if (roleAssignments[m.id]) {
          assignments.push({ memberId: m.id, roleCode: roleAssignments[m.id] });
        }
      });
      await assignRoles(team.id, assignments);

      await startTeamGame(team.id);

      finalizeAndStart(finalItem, level);
    } catch (e) {
      setLoading(false);
      alert('설정 중 오류가 발생했어요. 다시 시도해주세요.');
    }
  };

  const finalizeAndStart = (finalItem?: string, finalLevel?: string) => {
    if (!selectedMember || !team) return;
    const useItem = finalItem || team.item || '';
    const useLevel = finalLevel || team.level || 'standard';

    const myMember = members.find(m => m.id === selectedMember.id);
    const myRole = myMember?.role_code || (selectedMember.is_leader ? 'ceo' : roleAssignments[selectedMember.id]);

    localStorage.setItem('dtc_session_token_v2', JSON.stringify({
      teamId: team.id,
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      isLeader: selectedMember.is_leader,
      joinCode: team.join_code,
      item: useItem,
      level: useLevel,
      roleCode: myRole,
    }));

    setStep('welcome');
    setLoading(false);
  };

  const handleGameStart = async () => {
    if (!team || !selectedMember) return;
    const latestMembers = await getTeamMembers(team.id);
    setMembers(latestMembers);

    const myMember = latestMembers.find(m => m.id === selectedMember.id);
    const myRole = myMember?.role_code || null;

    const { data: latestTeam } = await supabase
      .from('teams')
      .select('item, level')
      .eq('id', team.id)
      .single();

    localStorage.setItem('dtc_session_token_v2', JSON.stringify({
      teamId: team.id,
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      isLeader: selectedMember.is_leader,
      joinCode: team.join_code,
      item: latestTeam?.item || '',
      level: latestTeam?.level || 'standard',
      roleCode: myRole,
    }));

    setStep('welcome');
  };

  const handleStart = () => router.push('/');

  const allRolesAssigned = (() => {
    const nonLeaderCount = members.filter(m => !m.is_leader).length;
    const assignedCount = Object.keys(roleAssignments).length;
    if (nonLeaderCount === 0) return true;
    if (assignedCount !== nonLeaderCount) return false;
    const codes = Object.values(roleAssignments);
    return new Set(codes).size === codes.length;
  })();

  const availableRoles = (Object.keys(ROLES) as RoleCode[]).filter(c => c !== 'ceo');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">

      {/* ⭐⭐⭐ 사이버틱 배경 효과 ⭐⭐⭐ */}

      {/* ⭐ 빛나며 흐르는 회로 신호 (펄스 - 가로 방향) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* 신호 1 — 위쪽 */}
        <div className="absolute circuit-signal-1"
          style={{
            top: '15%',
            left: 0,
            width: '80px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
            boxShadow: `0 0 12px ${S.green}, 0 0 20px ${S.green}66`,
          }} />
        {/* 신호 2 — 중간 */}
        <div className="absolute circuit-signal-2"
          style={{
            top: '50%',
            right: 0,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.aqua}, transparent)`,
            boxShadow: `0 0 12px ${S.aqua}, 0 0 20px ${S.aqua}66`,
          }} />
        {/* 신호 3 — 아래 */}
        <div className="absolute circuit-signal-3"
          style={{
            top: '80%',
            left: 0,
            width: '60px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
            boxShadow: `0 0 12px ${S.green}, 0 0 20px ${S.green}66`,
          }} />
        {/* 신호 4 — 세로 방향 */}
        <div className="absolute circuit-signal-vertical"
          style={{
            left: '20%',
            top: 0,
            width: '2px',
            height: '60px',
            background: `linear-gradient(180deg, transparent, ${S.aqua}, transparent)`,
            boxShadow: `0 0 12px ${S.aqua}, 0 0 20px ${S.aqua}66`,
          }} />
      </div>

      {/* 메시 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 25%, ${S.green}12 0%, transparent 40%),
            radial-gradient(circle at 85% 70%, ${S.aqua}10 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, #C1A8F008 0%, transparent 60%)
          `,
        }} />

      {/* 스캔라인 (위→아래) */}
      <div className="fixed inset-0 pointer-events-none scanline"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${S.green}06 50%, transparent 100%)`,
          height: '120px',
        }} />

      {/* 네온 입자 별들 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => {
          const colors = [S.green, S.aqua, '#C1A8F0'];
          const left = (i * 7 + 13) % 100;
          const top = (i * 13 + 7) % 100;
          const size = 1.5 + (i % 3) * 0.5;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full neon-particle"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: colors[i % 3],
                boxShadow: `0 0 ${size * 4}px ${colors[i % 3]}`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }} />
          );
        })}
      </div>

      {/* 코너 HUD 장식 (좌상) */}
      <div className="fixed top-4 left-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 left-0 w-6 h-[2px]" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
          <div className="absolute top-0 left-0 w-[2px] h-6" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        </div>
      </div>
      {/* 코너 HUD 장식 (우상) */}
      <div className="fixed top-4 right-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 right-0 w-6 h-[2px]" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
          <div className="absolute top-0 right-0 w-[2px] h-6" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        </div>
      </div>
      {/* 코너 HUD 장식 (좌하) */}
      <div className="fixed bottom-4 left-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute bottom-0 left-0 w-6 h-[2px]" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
          <div className="absolute bottom-0 left-0 w-[2px] h-6" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        </div>
      </div>
      {/* 코너 HUD 장식 (우하) */}
      <div className="fixed bottom-4 right-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute bottom-0 right-0 w-6 h-[2px]" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
          <div className="absolute bottom-0 right-0 w-[2px] h-6" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        </div>
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* 로고 — 사이버틱 네온 */}
        <div className="text-center mb-8 relative">
          {/* 로고 뒤 글로우 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse, ${S.green}25 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }} />

          {/* 양쪽 장식 라인 */}
          <div className="flex items-center justify-center gap-3 mb-1.5 relative">
            <div className="flex-1 h-[1px] max-w-[60px]"
              style={{ background: `linear-gradient(90deg, transparent, ${S.green}AA)` }} />
            <p className="text-[10px] tracking-[5px] font-mono font-bold"
              style={{ color: S.green, textShadow: `0 0 10px ${S.green}AA` }}>
              CONNECTAI
            </p>
            <div className="flex-1 h-[1px] max-w-[60px]"
              style={{ background: `linear-gradient(90deg, ${S.green}AA, transparent)` }} />
          </div>

          {/* SIGNAL — 글리치 효과 */}
          <h1 className="text-5xl font-black text-white tracking-tight relative inline-block glitch-text"
            style={{
              textShadow: `0 0 20px ${S.green}66, 0 0 40px ${S.green}33`,
            }}>
            SIGNAL
          </h1>

          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1 h-1 rounded-full" style={{ background: S.green, boxShadow: `0 0 6px ${S.green}` }} />
            <p className="text-[12px] font-bold tracking-[3px] font-mono"
              style={{ color: S.aqua, textShadow: `0 0 8px ${S.aqua}66` }}>
              DIGITAL TRADE CARDS
            </p>
            <div className="w-1 h-1 rounded-full" style={{ background: S.aqua, boxShadow: `0 0 6px ${S.aqua}` }} />
          </div>
        </div>

        {/* ── Step 1: 코드 입력 ── */}
        {step === 'code' && (
          <div>
            {/* Step 카드 — HUD 스타일 */}
            <div className="rounded-2xl p-5 mb-4 relative overflow-hidden cyber-card"
              style={{
                background: `linear-gradient(135deg, ${S.green}08 0%, ${S.aqua}05 100%)`,
                border: `1px solid ${S.green}40`,
                boxShadow: `0 0 30px ${S.green}15, inset 0 0 20px ${S.green}08`,
              }}>
              {/* 코너 장식 */}
              <div className="absolute top-2 left-2 w-4 h-4 pointer-events-none"
                style={{ borderTop: `2px solid ${S.green}`, borderLeft: `2px solid ${S.green}` }} />
              <div className="absolute top-2 right-2 w-4 h-4 pointer-events-none"
                style={{ borderTop: `2px solid ${S.green}`, borderRight: `2px solid ${S.green}` }} />
              <div className="absolute bottom-2 left-2 w-4 h-4 pointer-events-none"
                style={{ borderBottom: `2px solid ${S.green}`, borderLeft: `2px solid ${S.green}` }} />
              <div className="absolute bottom-2 right-2 w-4 h-4 pointer-events-none"
                style={{ borderBottom: `2px solid ${S.green}`, borderRight: `2px solid ${S.green}` }} />

              <p className="text-[10px] font-mono tracking-widest mb-1 flex items-center gap-2"
                style={{ color: S.green, textShadow: `0 0 8px ${S.green}AA` }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                  style={{ background: S.green, boxShadow: `0 0 6px ${S.green}` }} />
                STEP 1 / 4
              </p>
              <h2 className="text-lg font-black text-white mb-1"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                팀 코드 입력
              </h2>
              <p className="text-[12px] text-gray-400">{`>`} 관리자가 알려준 코드를 입력하세요</p>
            </div>
            <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setCodeError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              placeholder="예) DT-AB-X7K2"
              maxLength={12}
              className="w-full px-4 py-4 rounded-2xl text-white text-lg font-black tracking-widest uppercase text-center mb-3 cyber-input"
              style={{
                background: 'rgba(0,0,0,0.5)',
                border: joinCode ? `2px solid ${S.green}` : `2px solid ${S.green}30`,
                outline: 'none',
                fontFamily: 'monospace',
                boxShadow: joinCode
                  ? `0 0 20px ${S.green}55, inset 0 0 12px ${S.green}15`
                  : `inset 0 0 8px rgba(0,0,0,0.5)`,
                color: joinCode ? S.green : '#fff',
                textShadow: joinCode ? `0 0 8px ${S.green}` : 'none',
              }} />
            {codeError && <p className="text-red-400 text-[12px] text-center mb-3">⚠ {codeError}</p>}
            <button onClick={handleCodeSubmit} disabled={loading || joinCode.trim().length < 4}
              className="relative w-full py-4 font-black rounded-2xl text-[15px] transition disabled:opacity-30 overflow-hidden group cyber-btn"
              style={{
                background: S.green,
                color: S.navy,
                boxShadow: `0 0 30px ${S.green}66, 0 10px 30px -5px ${S.green}88`,
                border: `1px solid ${S.green}`,
              }}>
              <span className="relative z-10 tracking-wider">{loading ? '> 확인 중...' : '> 팀 확인하기 →'}</span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }} />
            </button>
          </div>
        )}

        {/* ── Step 2: 팀 확인 ── */}
        {step === 'confirm' && team && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 2 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">이 팀이 맞으세요?</h2>
            </div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] text-gray-500 font-mono">팀 이름</p>
                  <p className="text-xl font-black text-white">{team.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-500 font-mono">코드</p>
                  <p className="text-base font-black font-mono" style={{ color: S.green }}>{team.join_code}</p>
                </div>
              </div>
              {team.item && (
                <div className="rounded-lg px-3 py-2 mt-2" style={{ background: `${S.green}10`, border: `1px solid ${S.green}20` }}>
                  <p className="text-[11px] text-gray-500">아이템: <span style={{ color: S.green }}>{team.item}</span> · 수준: <span style={{ color: S.green }}>{LEVELS[team.level || 'standard']?.label}</span></p>
                </div>
              )}
            </div>
            <button onClick={() => setStep('select')}
              className="w-full py-4 font-black rounded-2xl text-[15px] transition mb-3"
              style={{ background: S.green, color: S.navy }}>
              맞아요! 이름 선택하기 →
            </button>
            <button onClick={() => { setStep('code'); setTeam(null); setMembers([]); }}
              className="w-full py-3 rounded-2xl text-[13px] text-gray-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ← 다시 입력하기
            </button>
          </div>
        )}

        {/* ── Step 3: 이름 선택 ── */}
        {step === 'select' && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 3 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">본인 이름을 선택하세요</h2>
              <p className="text-[12px] text-gray-500">명단에서 내 이름을 찾아 선택하세요</p>
            </div>
            {members.length === 0 ? (
              <div className="rounded-2xl p-5 text-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-gray-500 text-[13px]">아직 명단이 등록되지 않았어요</p>
                <p className="text-gray-600 text-[12px] mt-1">관리자에게 명단 등록을 요청하세요</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {members.map(m => (
                  <InteractiveButton key={m.id}
                    uniqueKey={`member-${m.id}`}
                    isSelected={selectedMember?.id === m.id}
                    onClick={() => setSelectedMember(selectedMember?.id === m.id ? null : m)}
                    color={S.green}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition"
                    style={{
                      background: selectedMember?.id === m.id ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.04)',
                      border: selectedMember?.id === m.id ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: m.is_leader ? S.green : 'rgba(255,255,255,0.1)', color: m.is_leader ? S.navy : '#fff' }}>
                      {m.is_leader ? '👑' : m.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-[14px]">{m.name}</p>
                      <p className="text-[11px]" style={{ color: m.is_leader ? S.green : '#666' }}>
                        {m.is_leader ? '팀장 (CEO)' : '팀원'}
                        {m.joined_at && (
                          <span className="ml-2 font-bold"
                            style={{
                              color: '#FF6FB5',
                              textShadow: '0 0 8px rgba(255, 111, 181, 0.6)',
                            }}>
                            이미 입장함
                          </span>
                        )}
                      </p>
                    </div>
                    {selectedMember?.id === m.id && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          background: '#8B5CF6',
                          boxShadow: '0 0 12px #8B5CF6AA',
                        }}>
                        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                      </div>
                    )}
                  </InteractiveButton>
                ))}
              </div>
            )}
            <button onClick={handleJoin} disabled={!selectedMember || loading}
              className="w-full py-4 font-black rounded-2xl text-[15px] transition disabled:opacity-30 mb-3"
              style={{ background: selectedMember ? S.green : 'rgba(255,255,255,0.08)', color: selectedMember ? S.navy : '#555' }}>
              {loading ? '입장 중...' : selectedMember ? `${selectedMember.name}으로 입장하기 →` : '이름을 선택하세요'}
            </button>
            <button onClick={() => setStep('confirm')}
              className="w-full py-3 rounded-2xl text-[13px] text-gray-500"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ← 뒤로
            </button>
          </div>
        )}

        {/* ── Step 3.5: 팀장 설정 ── */}
        {step === 'leader-setup' && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>👑 팀장 설정</p>
              <h2 className="text-lg font-black text-white mb-1">팀 기본 설정</h2>
              <p className="text-[12px] text-gray-500">팀장만 설정할 수 있어요. 팀원들에게도 적용됩니다.</p>
            </div>

            {/* ⭐ ① 아이템 — 인터랙티브 버튼 */}
            <div className="mb-5">
              <p className="text-sm font-bold text-white mb-2">① 팀 아이템 선택</p>
              <div className="grid grid-cols-2 gap-2">
                {ITEMS.map(it => (
                  <InteractiveButton key={it}
                    uniqueKey={`item-${it}`}
                    isSelected={item === it}
                    onClick={() => setItem(it)}
                    color={S.green}
                    className="px-3 py-2.5 rounded-xl text-left text-[12px] transition"
                    style={{
                      background: item === it ? `${S.green}15` : 'rgba(255,255,255,0.04)',
                      border: item === it ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.08)',
                      color: item === it ? S.green : '#9ca3af',
                      fontWeight: item === it ? 700 : 400,
                      boxShadow: item === it ? `0 0 16px ${S.green}33` : 'none',
                    }}>
                    {it}
                  </InteractiveButton>
                ))}
              </div>
              {item === '✏️ 직접 입력' && (
                <input value={customItem} onChange={e => setCustomItem(e.target.value)}
                  placeholder="예) 제주 감귤 주스"
                  className="w-full mt-2 px-3 py-2.5 rounded-xl text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
              )}
            </div>

            {/* ⭐ ② 수준 — 인터랙티브 버튼 */}
            <div className="mb-5">
              <p className="text-sm font-bold text-white mb-2">② 수업 수준</p>
              {Object.entries(LEVELS).map(([k, v]) => (
                <InteractiveButton key={k}
                  uniqueKey={`level-${k}`}
                  isSelected={level === k}
                  onClick={() => setLevel(k)}
                  color={v.color}
                  className="w-full mb-2 px-4 py-3 rounded-xl flex items-center gap-3 transition"
                  style={{
                    background: level === k ? v.color + '22' : 'rgba(255,255,255,0.04)',
                    border: level === k ? `1px solid ${v.color}` : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: level === k ? `0 0 16px ${v.color}33` : 'none',
                  }}>
                  <span className="text-xl">{v.emoji}</span>
                  <div className="flex-1 text-left text-[13px] font-bold text-white">{v.label}</div>
                  <span className="text-[11px] text-gray-500">{Math.floor(v.timer / 60)}분 · {v.minChars}자</span>
                </InteractiveButton>
              ))}
            </div>

            {/* ③ 직무 */}
            <div className="mb-6">
              <p className="text-sm font-bold text-white mb-1">③ 팀원 직무 배정</p>
              <p className="text-[11px] text-gray-500 mb-3">팀장은 자동으로 CEO입니다. 팀원들의 직무를 정해주세요.</p>

              {members.filter(m => m.is_leader).map(m => (
                <div key={m.id} className="rounded-xl p-3 mb-2 flex items-center gap-3"
                  style={{ background: `${S.green}10`, border: `1px solid ${S.green}40` }}>
                  <span className="text-2xl">👑</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-white">{m.name}</p>
                    <p className="text-[11px]" style={{ color: S.green }}>대표이사 (CEO)</p>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono">자동 배정</span>
                </div>
              ))}

              {members.filter(m => !m.is_leader).map(m => (
                <div key={m.id} className="rounded-xl p-3 mb-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black bg-white/10 text-white">
                      {m.name[0]}
                    </div>
                    <p className="text-[13px] font-bold text-white flex-1">{m.name}</p>
                    {m.joined_at && <span className="text-[10px]" style={{ color: S.aqua }}>● 입장</span>}
                  </div>
                  <select
                    value={roleAssignments[m.id] || ''}
                    onChange={e => setRoleAssignments(prev => ({ ...prev, [m.id]: e.target.value as RoleCode }))}
                    className="w-full px-3 py-2 rounded-lg text-[12px] text-white outline-none transition"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: roleAssignments[m.id] ? `1px solid ${ROLES[roleAssignments[m.id]]?.color}66` : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: roleAssignments[m.id] ? `0 0 12px ${ROLES[roleAssignments[m.id]]?.color}22` : 'none',
                    }}>
                    <option value="" style={{ background: '#0A0A0A' }}>직무 선택...</option>
                    {availableRoles.map(code => {
                      const r = ROLES[code];
                      const usedByOther = Object.entries(roleAssignments).some(([mid, rc]) => mid !== m.id && rc === code);
                      return (
                        <option key={code} value={code} disabled={usedByOther} style={{ background: '#0A0A0A' }}>
                          {r.icon} {r.nameKr} ({r.nameEn}) {usedByOther ? '· 이미 배정됨' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {roleAssignments[m.id] && (
                    <p className="text-[10px] text-gray-500 mt-1.5 px-1">
                      {ROLES[roleAssignments[m.id]]?.description}
                    </p>
                  )}
                </div>
              ))}

              {members.filter(m => !m.is_leader).length === 0 && (
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[12px] text-gray-500">팀원이 없어요. 혼자 진행됩니다.</p>
                </div>
              )}
            </div>

            <button onClick={handleLeaderSetup}
              disabled={!item || (item === '✏️ 직접 입력' && !customItem.trim()) || !allRolesAssigned || loading}
              className="relative w-full py-4 font-black rounded-2xl text-[15px] transition disabled:opacity-30 overflow-hidden group"
              style={{ background: S.green, color: S.navy, boxShadow: `0 10px 30px -5px ${S.green}55` }}>
              <span className="relative z-10">
                {loading ? '설정 중...' : !allRolesAssigned ? '모든 팀원의 직무를 배정하세요' : '🚀 게임 시작!'}
              </span>
              {!loading && allRolesAssigned && (
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
              )}
            </button>
            <p className="text-[10px] text-gray-600 text-center mt-2">시작하면 모든 팀원이 자동으로 게임 화면으로 이동합니다.</p>
          </div>
        )}

        {/* 대기실 */}
        {step === 'waiting' && team && selectedMember && (
          <div className="text-center relative">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="halo-pulse"
                style={{
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${S.green}25 0%, ${S.aqua}15 40%, transparent 70%)`,
                }} />
            </div>

            <div className="relative h-48 mb-6 flex items-center justify-center z-10">
              {[0, 1, 2, 3, 4].map((i) => {
                const cardColor = CARD_COLORS_LIST[i * 3];
                return (
                  <div
                    key={i}
                    className="absolute rounded-xl flex items-center justify-center text-white font-black text-sm font-mono"
                    style={{
                      background: cardColor,
                      boxShadow: `0 8px 24px ${cardColor}66, 0 0 20px ${cardColor}44`,
                      animation: `cardShuffle 3s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                      animationDelay: `${i * 0.15}s`,
                      width: '60px',
                      height: '84px',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl p-5 mb-4 relative z-10" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>WAITING ROOM</p>
              <h2 className="text-lg font-black text-white mb-1">
                {team.name} · {selectedMember.name}님
              </h2>
              <p className="text-[12px] text-gray-500">팀장이 게임을 준비하고 있어요</p>
            </div>

            <div className="rounded-xl p-4 mb-4 min-h-[60px] flex items-center justify-center relative z-10"
              style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p key={waitingMsgIdx} className="text-[13px] font-bold text-white"
                style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {WAITING_MESSAGES[waitingMsgIdx]}
              </p>
            </div>

            <div className="rounded-xl p-4 mb-4 text-left relative z-10"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-mono tracking-widest text-gray-500 mb-2">
                입장 현황 ({members.filter(m => m.joined_at).length} / {members.length})
              </p>
              <div className="space-y-1.5">
                {members.map(m => {
                  const joined = !!m.joined_at;
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-[12px]">
                      <div className="w-2 h-2 rounded-full"
                        style={{ background: joined ? S.green : 'rgba(255,255,255,0.15)', boxShadow: joined ? `0 0 8px ${S.green}` : 'none' }} />
                      <span className={joined ? 'text-white font-bold' : 'text-gray-600'}>
                        {m.is_leader ? '👑 ' : ''}{m.name}
                      </span>
                      {joined && <span className="text-[10px] ml-auto" style={{ color: S.aqua }}>입장 완료</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-gray-600 font-mono relative z-10">
              ⚡ 게임이 시작되면 자동으로 화면이 전환됩니다
            </p>

            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
              {recentJoiners.map(joiner => (
                <div key={joiner.id}
                  className="rounded-xl px-4 py-2.5 flex items-center gap-2 backdrop-blur-md"
                  style={{
                    background: `${S.green}15`,
                    border: `1px solid ${S.green}40`,
                    animation: 'slideDownFade 3s ease-out forwards',
                  }}>
                  <span className="text-lg">✨</span>
                  <span className="text-[13px] font-bold text-white">
                    <span style={{ color: S.green }}>{joiner.name}</span>님 입장!
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 환영 */}
        {step === 'welcome' && selectedMember && team && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl pulse-glow"
              style={{ background: `${S.green}20`, border: `2px solid ${S.green}40` }}>
              {selectedMember.is_leader ? '👑' : '👋'}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">환영해요, {selectedMember.name}!</h2>
            <p className="text-[13px] text-gray-400 mb-1">{team.name} · {selectedMember.is_leader ? '팀장' : '팀원'}</p>

            {(() => {
              const myMember = members.find(m => m.id === selectedMember.id);
              const myRoleCode = myMember?.role_code || (selectedMember.is_leader ? 'ceo' : null);
              const myRole = myRoleCode ? getRole(myRoleCode) : null;
              if (myRole) {
                return (
                  <div className="rounded-xl px-4 py-3 mt-4 mb-6"
                    style={{ background: `${myRole.color}15`, border: `1px solid ${myRole.color}40` }}>
                    <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: myRole.color }}>YOUR ROLE</p>
                    <p className="text-2xl mb-1">{myRole.icon}</p>
                    <p className="text-[15px] font-black text-white">{myRole.nameKr}</p>
                    <p className="text-[11px] font-mono mb-2" style={{ color: myRole.color }}>{myRole.nameEn}</p>
                    <p className="text-[11px] text-gray-400">{myRole.description}</p>
                  </div>
                );
              }
              return null;
            })()}

            <button onClick={handleStart}
              className="relative w-full py-4 font-black rounded-2xl text-[15px] transition-all hover:scale-[1.02] overflow-hidden group"
              style={{ background: S.green, color: S.navy, boxShadow: `0 10px 30px -5px ${S.green}66` }}>
              <span className="relative z-10">카드게임 시작하기 →</span>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
            </button>
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono relative z-10">© 2026 SIGNAL — ConnectAI</p>
      </div>

      {/* 대기실 배경 효과 */}
      {step === 'waiting' && (
        <>
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {FLOATING_CARDS.map(card => (
              <div
                key={card.id}
                className="absolute rounded-lg flex items-center justify-center text-white font-mono font-black opacity-20"
                style={{
                  left: `${card.left}%`,
                  top: `${card.top}%`,
                  width: `${card.size}px`,
                  height: `${card.size * 1.4}px`,
                  background: card.color,
                  boxShadow: `0 4px 20px ${card.color}40`,
                  fontSize: `${card.size * 0.3}px`,
                  animation: `floatCard ${card.duration}s ease-in-out ${card.delay}s infinite`,
                  transform: `rotate(${card.rotate}deg)`,
                }}>
                {card.cardNum}
              </div>
            ))}
          </div>

          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {PARTICLES.map(p => (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  background: p.color,
                  boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
                  animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
                }} />
            ))}
          </div>
        </>
      )}

      {/* 키프레임 + 인터랙티브 버튼 스타일 */}
      <style jsx>{`
        @keyframes cardShuffle {
          0% { transform: translateY(0) rotate(-15deg) translateX(-60px); opacity: 0.7; }
          25% { transform: translateY(-20px) rotate(-5deg) translateX(-30px); opacity: 1; }
          50% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 1; }
          75% { transform: translateY(-20px) rotate(5deg) translateX(30px); opacity: 1; }
          100% { transform: translateY(0) rotate(15deg) translateX(60px); opacity: 0.7; }
        }

        @keyframes slideDownFade {
          0% { opacity: 0; transform: translateY(-20px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0) translateX(0) rotate(var(--rotate, 0deg)); }
          25% { transform: translateY(-30px) translateX(15px) rotate(calc(var(--rotate, 0deg) + 8deg)); }
          50% { transform: translateY(-15px) translateX(-20px) rotate(calc(var(--rotate, 0deg) - 5deg)); }
          75% { transform: translateY(-25px) translateX(10px) rotate(calc(var(--rotate, 0deg) + 5deg)); }
        }

        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          25% { transform: translateY(-40px) translateX(20px); opacity: 1; }
          50% { transform: translateY(-80px) translateX(-15px); opacity: 0.7; }
          75% { transform: translateY(-50px) translateX(25px); opacity: 1; }
        }

        .halo-pulse {
          animation: haloPulse 4s ease-in-out infinite;
        }

        @keyframes haloPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }

        /* ⭐⭐⭐ 인터랙티브 버튼 효과 ⭐⭐⭐ */

        /* 호버 시 빛 흐름 (광택) */
        .interactive-btn .hover-shine {
          transition: transform 0.7s ease-out;
        }
        .interactive-btn:hover .hover-shine {
          transform: translateX(100%);
        }

        /* 클릭 시 살짝 눌림 효과 */
        .interactive-btn {
          transition: transform 0.15s ease-out;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          appearance: none;
        }
        .interactive-btn:focus,
        .interactive-btn:focus-visible {
          outline: none;
          box-shadow: none;
        }
        .interactive-btn::-moz-focus-inner {
          border: 0;
        }
        .interactive-btn:active {
          transform: scale(0.97);
        }

        /* 선택된 상태 — 펄스 글로우 */
        .interactive-btn.is-selected {
          animation:
            selectedPulse 2s ease-in-out infinite,
            auroraSelectedGlow 3s ease-in-out infinite;
        }
        @keyframes selectedPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.1); }
        }

        /* ⭐⭐⭐ 선택 시 박스 테두리 오로라 색 순환 글로우 ⭐⭐⭐ */
        @keyframes auroraSelectedGlow {
          0%, 100% {
            box-shadow:
              0 0 16px #06B6D4AA,
              0 0 32px #06B6D466,
              0 0 56px #8B5CF644;
          }
          33% {
            box-shadow:
              0 0 16px #8B5CF6AA,
              0 0 32px #8B5CF666,
              0 0 56px #3B82F644;
          }
          66% {
            box-shadow:
              0 0 16px #3B82F6AA,
              0 0 32px #3B82F666,
              0 0 56px #06B6D444;
          }
        }

        /* ⭐⭐⭐ 오로라 파동 (물결처럼 흐름 - X+Y 같이 변동) ⭐⭐⭐ */
        .aurora-wave {
          animation: auroraSweep 2.5s ease-in-out forwards;
          background-position: 0% 0%;
          opacity: 0;
        }
        @keyframes auroraSweep {
          0% {
            background-position: 0% 0%;
            opacity: 0;
          }
          12% {
            opacity: 0.85;
          }
          25% {
            background-position: 25% 100%;
            opacity: 0.95;
          }
          50% {
            background-position: 50% 0%;
            opacity: 1;
          }
          75% {
            background-position: 75% 100%;
            opacity: 0.95;
          }
          88% {
            opacity: 0.6;
          }
          100% {
            background-position: 100% 0%;
            opacity: 0;
          }
        }

        /* ⭐⭐⭐ 회로 신호 (라인을 따라 빛이 흐름) ⭐⭐⭐ */

        /* 신호 1 - 좌→우 (위쪽) */
        .circuit-signal-1 {
          animation: signalRight 4s linear infinite;
        }
        @keyframes signalRight {
          0% { transform: translateX(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        /* 신호 2 - 우→좌 (중간) */
        .circuit-signal-2 {
          animation: signalLeft 5s linear infinite 1s;
        }
        @keyframes signalLeft {
          0% { transform: translateX(100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        /* 신호 3 - 좌→우 (아래) */
        .circuit-signal-3 {
          animation: signalRight 6s linear infinite 2s;
        }

        /* 세로 신호 - 위→아래 */
        .circuit-signal-vertical {
          animation: signalDown 5s linear infinite 0.5s;
        }
        @keyframes signalDown {
          0% { transform: translateY(-60px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        /* ⭐⭐⭐ 사이버틱 효과 ⭐⭐⭐ */

        /* 스캔라인 — 위에서 아래로 빛이 흐름 */
        .scanline {
          animation: scanlineMove 4s linear infinite;
        }
        @keyframes scanlineMove {
          0% { transform: translateY(-120px); }
          100% { transform: translateY(100vh); }
        }

        /* 네온 입자 깜빡임 */
        .neon-particle {
          animation-name: neonTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes neonTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        /* SIGNAL 글리치 텍스트 */
        .glitch-text {
          position: relative;
          animation: glitchPulse 5s ease-in-out infinite;
        }
        @keyframes glitchPulse {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(231, 254, 85, 0.4),
              0 0 40px rgba(231, 254, 85, 0.2);
          }
          50% {
            text-shadow:
              -1px 0 0 rgba(193, 232, 235, 0.7),
              1px 0 0 rgba(231, 254, 85, 0.7),
              0 0 30px rgba(231, 254, 85, 0.6),
              0 0 60px rgba(193, 232, 235, 0.3);
          }
        }

        /* 사이버 카드 — 미세하게 빛이 흐름 */
        .cyber-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            120deg,
            transparent 30%,
            rgba(231, 254, 85, 0.05) 50%,
            transparent 70%
          );
          animation: cardSweep 4s linear infinite;
          pointer-events: none;
        }
        @keyframes cardSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* 사이버 인풋 — 포커스 시 펄스 */
        .cyber-input:focus {
          animation: inputPulse 1.5s ease-in-out infinite;
        }
        @keyframes inputPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(231, 254, 85, 0.4), inset 0 0 12px rgba(231, 254, 85, 0.1); }
          50% { box-shadow: 0 0 30px rgba(231, 254, 85, 0.7), inset 0 0 18px rgba(231, 254, 85, 0.2); }
        }

        /* 사이버 버튼 — 글로우 펄스 */
        .cyber-btn {
          animation: btnNeonPulse 2.5s ease-in-out infinite;
        }
        @keyframes btnNeonPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(231, 254, 85, 0.4), 0 10px 30px -5px rgba(231, 254, 85, 0.5); }
          50% { box-shadow: 0 0 40px rgba(231, 254, 85, 0.7), 0 10px 40px -5px rgba(231, 254, 85, 0.8); }
        }
      `}</style>
    </div>
  );
}
