'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getTeamWithMembersByCode, joinAsStudent,
  assignRoles, startTeamGame,
  subscribeToTeamStart, subscribeToTeamMembers,
  getTeamGameStatus, getTeamMembers,
  subscribeToClassGameStart, getClass,
} from '@/lib/teacher';
import { supabase } from '@/lib/supabase';
import type { Team, TeamMember, Class } from '@/lib/teacher';
import { ROLES, MEMBER_ROLE_SETS, getRecommendedRoles, getRole, type RoleCode } from '@/data/roleData';
import { getRoleMission } from '@/data/roleMissions';
import RoleCard from '@/components/RoleCard';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
};

const INDUSTRIES = ['💄 K-뷰티 (스킨케어)', '🍜 K-푸드 (라면·스낵)', '🧬 바이오/디지털 헬스케어', '🎮 디지털 콘텐츠 (웹툰·게임)', '📱 스마트 기기 (IoT)', '🔖 기타'];
const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', timer: 1800, minChars: 20,  color: '#059669' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50,  color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', timer: 900,  minChars: 100, color: '#582C83' },
};

// ⭐ 직무별 한 줄 소개 (CEO 제외, 팀원 6직무)
const MEMBER_ROLE_GUIDES: Array<{ code: RoleCode; tagline: string }> = [
  { code: 'market_analyst',     tagline: '데이터·통계로 시장 규모와 트렌드를 분석해 가능성을 예측해요.' },
  { code: 'brand_strategist',   tagline: '브랜드 정체성과 경쟁사 대비 차별화 포인트를 설계해요.' },
  { code: 'customer_insight',   tagline: '타깃 고객의 진짜 욕구와 행동 패턴을 깊이 이해해요.' },
  { code: 'global_sales',       tagline: '진출국을 정하고 바이어·파트너를 발굴하는 글로벌 영업을 맡아요.' },
  { code: 'digital_marketer',   tagline: 'SNS·콘텐츠 등 디지털 채널로 브랜드를 알리고 고객을 끌어와요.' },
  { code: 'compliance_officer', tagline: '진출국별 인증·통관·관세 등 법적 요건을 분석하고 해결해요.' },
];

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

type Step = 'code' | 'confirm' | 'select' | 'leader-setup' | 'waiting' | 'countdown' | 'welcome';

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
  const [auroraOpacity, setAuroraOpacity] = useState(0);

  const handleClick = () => {
    setAuroraWave(true);
    setAuroraOpacity(0);
    setTimeout(() => setAuroraOpacity(1), 50);
    setTimeout(() => setAuroraOpacity(0), 1500);
    setTimeout(() => setAuroraWave(false), 2500);
    onClick();
  };

  return (
    <button onClick={handleClick}
      className={`relative overflow-hidden interactive-btn ${isSelected ? 'is-selected' : ''} ${className || ''}`}
      style={style}>
      <span className="absolute inset-0 -translate-x-full hover-shine pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color}55 50%, transparent 100%)`,
        }} />
      {auroraWave && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(110deg, #06B6D4 0%, #8B5CF6 25%, #3B82F6 50%, #8B5CF6 75%, #06B6D4 100%)',
            mixBlendMode: 'screen',
            borderRadius: 'inherit',
            opacity: auroraOpacity,
            transition: 'opacity 1s ease-in-out',
          }} />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function StudentJoinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ⭐ NEW: URL 파라미터에서 팀 코드 읽기 (학급 페이지에서 팀 클릭 시 자동 전달)
  const codeFromUrl = searchParams.get('code');

  const [step, setStep] = useState<Step>('code');
  const [joinCode, setJoinCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);

  // ⭐ NEW: URL 자동 처리 중인지 (중복 호출 방지)
  const autoProcessedRef = useRef(false);

  // ⭐ NEW: 직무 가이드 펼침 상태
  const [showRoleGuide, setShowRoleGuide] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const imageUrls = [
      '/roles/ceo.jpg',
      '/roles/analyst.jpg',
      '/roles/brand.jpg',
      '/roles/customer.jpg',
      '/roles/global.jpg',
      '/roles/marketer.jpg',
      '/roles/compliance.jpg',
    ];
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [level, setLevel] = useState('standard');

  const [roleAssignments, setRoleAssignments] = useState<Record<string, RoleCode>>({});

  const [waitingMsgIdx, setWaitingMsgIdx] = useState(0);

  const [countdown, setCountdown] = useState(5);
  const [recentJoiners, setRecentJoiners] = useState<TeamMember[]>([]);
  const previousMembersRef = useRef<Set<string>>(new Set());

  // ⭐⭐⭐ NEW 8번: welcome 화면 3가지 상태 ⭐⭐⭐
  // 'waiting'   - 다른 팀 대기 중 (관리자 신호 대기)
  // 'rejoining' - 이미 게임 시작됨 → 재입장 가능
  // (countdown 신호 받으면 step을 'countdown'으로 전환하여 기존 멋진 카운트다운 재활용)
  type WelcomeState = 'waiting' | 'rejoining';
  const [welcomeState, setWelcomeState] = useState<WelcomeState>('waiting');
  const [cls, setCls] = useState<Class | null>(null);

  useEffect(() => {
    if (step !== 'waiting') return;
    const interval = setInterval(() => {
      setWaitingMsgIdx(i => (i + 1) % WAITING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (step !== 'countdown') return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // ⭐⭐⭐ NEW 8번: countdown 끝나면 welcome이 아닌 game(/)으로 직접 이동
          setTimeout(() => router.push('/'), 700);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, router]);

  // ⭐⭐⭐ NEW 8번: welcome 화면 진입 시 학급 정보 로드 + Realtime 구독 ⭐⭐⭐
  useEffect(() => {
    if (step !== 'welcome' || !team) return;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        // 1. 학급 정보 가져오기 (game_started_at 확인용)
        const classInfo = await getClass(team.class_id);
        if (!classInfo) return;
        setCls(classInfo);

        // 2. 이미 게임이 시작됐는지 체크 (재입장 케이스)
        if (classInfo.game_started_at) {
          setWelcomeState('rejoining');
          return; // 재입장 모드는 구독 안 함, 버튼 누르면 직접 이동
        }

        // 3. 기본 대기 모드 → Realtime 구독
        setWelcomeState('waiting');
        unsubscribe = subscribeToClassGameStart(team.class_id, (gameStartedAt) => {
          // 관리자 일괄 시작 신호 받음 → 5초 카운트다운 시작
          setStep('countdown');
        });
      } catch (e) {
        console.error('학급 정보 로드 실패', e);
      }
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [step, team]);

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

  // ⭐⭐⭐ NEW: URL 파라미터 자동 처리 (학급 페이지에서 팀 클릭 시)
  // /student/join?code=DT-XX-XXXX 형태로 들어왔을 때 자동으로 팀 정보 조회 + 이름 선택 단계로 이동
  useEffect(() => {
    if (!codeFromUrl) return;
    if (autoProcessedRef.current) return;
    autoProcessedRef.current = true;

    const autoJoin = async () => {
      const upperCode = codeFromUrl.toUpperCase().trim();
      setJoinCode(upperCode);
      setLoading(true);
      setCodeError('');

      try {
        const result = await getTeamWithMembersByCode(upperCode);
        if (!result) {
          setCodeError('팀 코드를 찾을 수 없어요. 관리자에게 확인하세요.');
          setLoading(false);
          // URL 코드 잘못된 경우 → 코드 입력 화면 유지 (수동 입력 가능)
          return;
        }

        setTeam(result.team);
        setMembers(result.members);
        if (result.team.item) setItem(result.team.item);
        if (result.team.level) setLevel(result.team.level);

        // 게임 시작 여부 관계없이 바로 이름 선택 단계로
        // (학급 페이지에서 이미 팀 골랐으니 confirm 단계 스킵)
        setStep('select');
      } catch (e) {
        setCodeError('오류가 발생했어요. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    autoJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

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
    const finalItem = item === '🔖 기타'
      ? customItem
      : (customItem ? `${item} / ${customItem}` : item);

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

    localStorage.removeItem('dtc_session_token');
    localStorage.removeItem('dtc_session_token_v2');
    sessionStorage.setItem('dtc_session_token_v2', JSON.stringify({
      teamId: team.id,
      teamName: team.name,
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      isLeader: selectedMember.is_leader,
      joinCode: team.join_code,
      item: useItem,
      level: useLevel,
      roleCode: myRole,
    }));

    // ⭐⭐⭐ NEW 8번: countdown 거치지 않고 welcome으로 바로 (대기 모드)
    // welcome 화면에서 관리자 일괄 시작 신호 받으면 → countdown → game
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

    localStorage.removeItem('dtc_session_token');
    localStorage.removeItem('dtc_session_token_v2');
    sessionStorage.setItem('dtc_session_token_v2', JSON.stringify({
      teamId: team.id,
      teamName: team.name,
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      isLeader: selectedMember.is_leader,
      joinCode: team.join_code,
      item: latestTeam?.item || '',
      level: latestTeam?.level || 'standard',
      roleCode: myRole,
    }));

    // ⭐⭐⭐ NEW 8번: countdown 거치지 않고 welcome으로 바로 (대기 모드)
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

  // ⭐⭐⭐ NEW: URL 코드 자동 처리 중에는 코드 입력 화면 깜빡임 방지 (로딩 화면 표시)
  // URL에 code 파라미터가 있고, 아직 'code' 단계인 동안 = 자동 처리 중
  if (codeFromUrl && step === 'code') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#0A0A0A' }}>
        <div className="flex flex-col items-center gap-6">
          {/* SIGNAL 로고 */}
          <div className="text-center">
            <p className="text-[10px] tracking-[5px] font-mono font-bold mb-1"
              style={{ color: S.green, textShadow: `0 0 8px ${S.green}AA` }}>
              CONNECTAI
            </p>
            <h1 className="text-4xl font-black text-white"
              style={{ textShadow: `0 0 20px ${S.green}66, 0 0 40px ${S.green}33` }}>
              SIGNAL
            </h1>
            <p className="text-[10px] font-bold tracking-[2.5px] font-mono mt-1"
              style={{ color: S.aqua }}>
              DIGITAL TRADE CARDS
            </p>
          </div>

          {/* 회전 스피너 */}
          <div className="relative" style={{ width: '48px', height: '48px' }}>
            <div className="absolute inset-0 rounded-full join-loader-ring"
              style={{
                border: `3px solid ${S.green}22`,
                borderTopColor: S.green,
                boxShadow: `0 0 12px ${S.green}66`,
              }} />
          </div>

          {/* 로딩 메시지 */}
          <p className="text-[13px] font-mono font-bold"
            style={{ color: S.green, textShadow: `0 0 6px ${S.green}66` }}>
            {`>`} 팀 정보 불러오는 중...
          </p>

          {/* 에러 발생 시 표시 (혹시 모를 케이스) */}
          {codeError && (
            <div className="rounded-xl p-4 max-w-sm text-center"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}>
              <p className="text-[12px] text-red-400 mb-3">⚠ {codeError}</p>
              <button
                onClick={() => {
                  // URL 코드를 무효화하고 수동 입력 화면으로
                  autoProcessedRef.current = false;
                  setCodeError('');
                  setJoinCode('');
                  // codeFromUrl을 null로 만들 수는 없지만, joinCode 초기화하면 사용자가 다시 입력 가능
                  router.replace('/student/join');
                }}
                className="w-full py-2.5 rounded-lg text-[12px] font-bold transition hover:scale-[1.02]"
                style={{
                  background: S.green,
                  color: S.navy,
                }}>
                → 팀 코드 직접 입력하기
              </button>
            </div>
          )}
        </div>

        <style jsx>{`
          .join-loader-ring {
            animation: joinLoaderSpin 1s linear infinite;
          }
          @keyframes joinLoaderSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">

      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute circuit-signal-1"
          style={{
            top: '15%', left: 0, width: '80px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
            boxShadow: `0 0 12px ${S.green}, 0 0 20px ${S.green}66`,
          }} />
        <div className="absolute circuit-signal-2"
          style={{
            top: '50%', right: 0, width: '100px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.aqua}, transparent)`,
            boxShadow: `0 0 12px ${S.aqua}, 0 0 20px ${S.aqua}66`,
          }} />
        <div className="absolute circuit-signal-3"
          style={{
            top: '80%', left: 0, width: '60px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.green}, transparent)`,
            boxShadow: `0 0 12px ${S.green}, 0 0 20px ${S.green}66`,
          }} />
        <div className="absolute circuit-signal-vertical"
          style={{
            left: '20%', top: 0, width: '2px', height: '60px',
            background: `linear-gradient(180deg, transparent, ${S.aqua}, transparent)`,
            boxShadow: `0 0 12px ${S.aqua}, 0 0 20px ${S.aqua}66`,
          }} />
      </div>

      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 25%, ${S.green}12 0%, transparent 40%),
            radial-gradient(circle at 85% 70%, ${S.aqua}10 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, #C1A8F008 0%, transparent 60%)
          `,
        }} />

      <div className="fixed inset-0 pointer-events-none scanline"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${S.green}06 50%, transparent 100%)`,
          height: '120px',
        }} />

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
                left: `${left}%`, top: `${top}%`,
                width: `${size}px`, height: `${size}px`,
                background: colors[i % 3],
                boxShadow: `0 0 ${size * 4}px ${colors[i % 3]}`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }} />
          );
        })}
      </div>

      <div className="fixed top-4 left-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 left-0 w-6 h-[2px]" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
          <div className="absolute top-0 left-0 w-[2px] h-6" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        </div>
      </div>
      <div className="fixed top-4 right-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 right-0 w-6 h-[2px]" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
          <div className="absolute top-0 right-0 w-[2px] h-6" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        </div>
      </div>
      <div className="fixed bottom-4 left-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute bottom-0 left-0 w-6 h-[2px]" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
          <div className="absolute bottom-0 left-0 w-[2px] h-6" style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        </div>
      </div>
      <div className="fixed bottom-4 right-4 pointer-events-none z-0">
        <div className="w-12 h-12 relative">
          <div className="absolute bottom-0 right-0 w-6 h-[2px]" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
          <div className="absolute bottom-0 right-0 w-[2px] h-6" style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        </div>
      </div>

      <div className="w-full max-w-sm relative z-10">

        <div className="text-center mb-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse, ${S.green}25 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }} />

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

        {step === 'code' && (
          <div>
            <div className="rounded-2xl p-5 mb-4 relative overflow-hidden cyber-card"
              style={{
                background: `linear-gradient(135deg, ${S.green}08 0%, ${S.aqua}05 100%)`,
                border: `1px solid ${S.green}40`,
                boxShadow: `0 0 30px ${S.green}15, inset 0 0 20px ${S.green}08`,
              }}>
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
              <p className="text-[12px] text-white" style={{ opacity: 0.75 }}>{`>`} 관리자가 알려준 코드를 입력하세요</p>
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

        {step === 'confirm' && team && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 2 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">이 팀이 맞으세요?</h2>
            </div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] font-mono text-white" style={{ opacity: 0.6 }}>팀 이름</p>
                  <p className="text-xl font-black text-white">{team.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono text-white" style={{ opacity: 0.6 }}>코드</p>
                  <p className="text-base font-black font-mono" style={{ color: S.green }}>{team.join_code}</p>
                </div>
              </div>
              {team.item && (
                <div className="rounded-lg px-3 py-2 mt-2" style={{ background: `${S.green}10`, border: `1px solid ${S.green}20` }}>
                  <p className="text-[11px] text-white" style={{ opacity: 0.85 }}>아이템: <span style={{ color: S.green }}>{team.item}</span> · 수준: <span style={{ color: S.green }}>{LEVELS[team.level || 'standard']?.label}</span></p>
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

        {step === 'select' && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>STEP 3 / 4</p>
              <h2 className="text-lg font-black text-white mb-1">본인 이름을 선택하세요</h2>
              <p className="text-[12px] text-white" style={{ opacity: 0.75 }}>명단에서 내 이름을 찾아 선택하세요</p>
            </div>
            {members.length === 0 ? (
              <div className="rounded-2xl p-5 text-center mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-white text-[13px]" style={{ opacity: 0.7 }}>아직 명단이 등록되지 않았어요</p>
                <p className="text-white text-[12px] mt-1" style={{ opacity: 0.5 }}>관리자에게 명단 등록을 요청하세요</p>
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
                      <p className="text-[11px]" style={{ color: m.is_leader ? S.green : 'rgba(255,255,255,0.6)' }}>
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

        {step === 'leader-setup' && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>👑 팀장 설정</p>
              <h2 className="text-lg font-black text-white mb-1">팀 기본 설정</h2>
              <p className="text-[12px] text-white" style={{ opacity: 0.75 }}>팀장만 설정할 수 있어요. 팀원들에게도 적용됩니다.</p>
            </div>

            {/* ⭐ ① 산업군 선택 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                    style={{
                      background: S.green,
                      color: S.navy,
                      boxShadow: `0 0 10px ${S.green}88`,
                    }}>
                    1
                  </div>
                  <p className="text-sm font-bold text-white">팀 산업군 선택</p>
                </div>
                <p className="text-[10px] text-white" style={{ opacity: 0.6 }}>우리 팀이 다룰 큰 카테고리</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map(it => (
                  <InteractiveButton key={it}
                    uniqueKey={`industry-${it}`}
                    isSelected={item === it}
                    onClick={() => { setItem(it); setCustomItem(''); }}
                    color={S.green}
                    className="px-3 py-2.5 rounded-xl text-left text-[12px] transition relative"
                    style={{
                      background: item === it ? `${S.green}15` : 'rgba(255,255,255,0.04)',
                      border: item === it ? `1.5px solid ${S.green}` : '1px solid rgba(255,255,255,0.08)',
                      color: item === it ? S.green : '#9ca3af',
                      fontWeight: item === it ? 700 : 400,
                      boxShadow: item === it ? `0 0 16px ${S.green}33` : 'none',
                    }}>
                    {it}
                  </InteractiveButton>
                ))}
              </div>
            </div>

            {/* ⭐ ② 세부 아이템 입력 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                    style={{
                      background: item ? S.aqua : 'rgba(255,255,255,0.1)',
                      color: item ? S.navy : '#666',
                      boxShadow: item ? `0 0 10px ${S.aqua}88` : 'none',
                      transition: 'all 0.3s ease',
                    }}>
                    2
                  </div>
                  <p className="text-sm font-bold text-white">세부 아이템 입력</p>
                  {item && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold"
                      style={{
                        background: `${S.aqua}20`,
                        color: S.aqua,
                        border: `1px solid ${S.aqua}50`,
                      }}>
                      {item}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white" style={{ opacity: 0.6 }}>팀이 다룰 구체 제품·브랜드</p>
              </div>

              {!item ? (
                <div className="rounded-xl p-4 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                  }}>
                  <p className="text-[12px] text-white" style={{ opacity: 0.6 }}>먼저 위에서 산업군을 선택하세요</p>
                </div>
              ) : (
                <div className="rounded-xl p-3 transition-all"
                  style={{
                    background: `${S.aqua}08`,
                    border: `1.5px solid ${S.aqua}40`,
                    boxShadow: `0 0 14px ${S.aqua}15`,
                  }}>
                  <input
                    value={customItem}
                    onChange={e => setCustomItem(e.target.value)}
                    placeholder={
                      item.includes('K-뷰티') ? '예) 마스크팩, 토너 세트' :
                      item.includes('K-푸드') ? '예) 신라면, 핫도그' :
                      item.includes('바이오') ? '예) 비타민, 헬스케어 앱' :
                      item.includes('디지털 콘텐츠') ? '예) 웹툰 플랫폼, 모바일 게임' :
                      item.includes('스마트 기기') ? '예) 스마트워치, 공기청정기' :
                      item.includes('기타') ? '예) 제주 감귤 주스' :
                      '구체적인 품목을 입력하세요'
                    }
                    className="w-full px-3 py-2.5 rounded-lg text-white text-[14px] outline-none transition"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: customItem ? `1px solid ${S.aqua}` : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: customItem ? `0 0 12px ${S.aqua}33` : 'none',
                    }}
                  />
                  <div className="mt-2 px-1">
                    <p className="text-[10px] text-white leading-relaxed" style={{ opacity: 0.7 }}>
                      💡 한 가지에 집중할수록 카드별 답변이 구체적으로 나옵니다 · 여러 개라면 쉼표로 구분
                    </p>
                  </div>
                </div>
              )}
            </div>

            {item && customItem && (
              <div className="rounded-xl p-3 mb-5 flex items-center gap-2 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${S.green}15 0%, ${S.aqua}10 100%)`,
                  border: `1.5px solid ${S.green}50`,
                  boxShadow: `0 0 16px ${S.green}25`,
                }}>
                <div className="text-[10px] font-mono font-bold tracking-widest px-2 py-1 rounded"
                  style={{ background: `${S.green}25`, color: S.green }}>
                  최종 선택
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-white truncate">
                    <span style={{ color: S.aqua }}>{item.split(' (')[0]}</span>
                    <span className="text-white mx-1" style={{ opacity: 0.5 }}>·</span>
                    <span style={{ color: S.green }}>{customItem}</span>
                  </p>
                </div>
                <span className="text-[14px]" style={{ color: S.green }}>✓</span>
              </div>
            )}

            {/* ⭐ Step 3 — 팀원 직무 배정 (이전 Step 4) */}
            {/* 수업 수준(난이도)는 학급에서 자동 적용되므로 학생 화면에서 제거됨 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0"
                  style={{
                    background: S.pink,
                    color: '#fff',
                    boxShadow: `0 0 10px ${S.pink}88`,
                  }}>
                  3
                </div>
                <p className="text-sm font-bold text-white">팀원 직무 배정</p>
              </div>
              <p className="text-[11px] text-white mb-3" style={{ opacity: 0.85 }}>
                팀장은 자동으로 CEO입니다. 팀원들의 직무를 정해주세요.
              </p>

              {/* 👑 CEO 카드 */}
              {members.filter(m => m.is_leader).map(m => (
                <div key={m.id} className="rounded-xl p-3 mb-2 flex items-center gap-3"
                  style={{ background: `${S.green}10`, border: `1px solid ${S.green}40` }}>
                  <span className="text-2xl">👑</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-white">{m.name}</p>
                    <p className="text-[11px]" style={{ color: S.green }}>대표이사 (CEO)</p>
                  </div>
                  <span className="text-[10px] font-mono text-white" style={{ opacity: 0.6 }}>자동 배정</span>
                </div>
              ))}

              {/* ⭐⭐⭐ NEW: 직무 가이드 박스 (펼치기/접기) */}
              {members.filter(m => !m.is_leader).length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={() => setShowRoleGuide(!showRoleGuide)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all hover:scale-[1.01]"
                    style={{
                      background: showRoleGuide ? `${S.cyan}12` : `${S.cyan}06`,
                      border: `1px dashed ${S.cyan}${showRoleGuide ? '66' : '40'}`,
                      color: S.cyan,
                    }}>
                    <span className="text-[12px] font-bold flex items-center gap-1.5">
                      📖 직무 가이드 보기
                      <span className="text-[10px] font-mono opacity-70">(어떤 직무들이 있는지)</span>
                    </span>
                    <span className="text-[11px] transition-transform"
                      style={{ transform: showRoleGuide ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ⌄
                    </span>
                  </button>

                  {showRoleGuide && (
                    <div className="mt-2 rounded-xl p-3 role-guide-expand"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                      <p className="text-[10px] font-mono tracking-widest text-white font-bold mb-2.5"
                        style={{ opacity: 0.65 }}>
                        팀원 직무 가이드 (6개)
                      </p>
                      <div className="space-y-0">
                        {MEMBER_ROLE_GUIDES.map((guide, idx) => {
                          const role = ROLES[guide.code];
                          const isLast = idx === MEMBER_ROLE_GUIDES.length - 1;
                          return (
                            <div key={guide.code}
                              className="flex gap-2.5 py-2"
                              style={{
                                borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)',
                              }}>
                              <span className="text-[15px] flex-shrink-0 leading-snug">{role.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11.5px] font-bold mb-0.5"
                                  style={{ color: role.color }}>
                                  {role.nameKr}
                                </p>
                                <p className="text-[11px] text-white leading-snug"
                                  style={{ opacity: 0.9 }}>
                                  {guide.tagline}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-white mt-2 italic"
                        style={{ opacity: 0.55 }}>
                        💡 위 가이드를 참고해서 팀원들에게 직무를 배정해주세요
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 팀원 직무 배정 드롭다운 */}
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
                  {/* ⭐ 직무 설명 — 회색에서 흰색으로 (가독성 개선) */}
                  {roleAssignments[m.id] && (
                    <p className="text-[11px] text-white mt-1.5 px-1 leading-relaxed"
                      style={{ opacity: 0.85 }}>
                      {ROLES[roleAssignments[m.id]]?.description}
                    </p>
                  )}
                </div>
              ))}

              {members.filter(m => !m.is_leader).length === 0 && (
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[12px] text-white" style={{ opacity: 0.6 }}>팀원이 없어요. 혼자 진행됩니다.</p>
                </div>
              )}
            </div>

            <button onClick={handleLeaderSetup}
              disabled={!item || !customItem.trim() || !allRolesAssigned || loading}
              className="relative w-full py-4 font-black rounded-2xl text-[15px] transition disabled:opacity-30 overflow-hidden group"
              style={{ background: S.green, color: S.navy, boxShadow: `0 10px 30px -5px ${S.green}55` }}>
              <span className="relative z-10">
                {loading ? '설정 중...'
                  : !item ? '산업군을 선택하세요'
                  : !customItem.trim() ? '구체적 품목을 입력하세요'
                  : !allRolesAssigned ? '모든 팀원의 직무를 배정하세요'
                  : '🚀 게임 시작!'}
              </span>
              {!loading && allRolesAssigned && (
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                  style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
              )}
            </button>
            <p className="text-[10px] text-white text-center mt-2" style={{ opacity: 0.6 }}>
              시작하면 모든 팀원이 자동으로 게임 화면으로 이동합니다.
            </p>
          </div>
        )}

        {step === 'waiting' && team && selectedMember && (
          <div className="text-center relative">
            <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="halo-pulse"
                style={{
                  width: '320px', height: '320px', borderRadius: '50%',
                  background: `radial-gradient(circle, ${S.cyan}25 0%, ${S.purple}15 40%, transparent 70%)`,
                  filter: 'blur(20px)',
                }} />
            </div>

            <div className="relative z-10 mb-5 flex justify-center">
              {(() => {
                const myMember = members.find(m => m.id === selectedMember.id);
                const myRoleCode = myMember?.role_code || (selectedMember.is_leader ? 'ceo' : null);
                const myRole = myRoleCode ? getRole(myRoleCode) : null;
                if (myRole) {
                  return <RoleCard role={myRole} memberName={selectedMember.name} isMobile={isMobile} />;
                }
                return (
                  <div className="relative rounded-2xl overflow-hidden waiting-role-card"
                    style={{
                      width: isMobile ? '220px' : '280px',
                      height: isMobile ? '180px' : '220px',
                      background: `linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,40,0.9) 100%)`,
                      border: `2px solid ${S.cyan}66`,
                      boxShadow: `0 0 24px ${S.cyan}33, inset 0 0 20px ${S.cyan}11`,
                    }}>
                    <div className="absolute inset-0 opacity-30 pointer-events-none"
                      style={{
                        backgroundImage: `linear-gradient(${S.cyan}44 1px, transparent 1px), linear-gradient(90deg, ${S.cyan}44 1px, transparent 1px)`,
                        backgroundSize: '14px 14px',
                      }} />
                    <div className="absolute top-2 left-2 font-mono text-[8px] waiting-bit-1" style={{ color: `${S.cyan}AA` }}>01010111</div>
                    <div className="absolute top-2 right-2 font-mono text-[8px] waiting-bit-2" style={{ color: `${S.cyan}AA` }}>10110001</div>
                    <div className="absolute bottom-2 left-2 font-mono text-[8px] waiting-bit-3" style={{ color: `${S.cyan}AA` }}>11001010</div>
                    <div className="absolute bottom-2 right-2 font-mono text-[8px] waiting-bit-4" style={{ color: `${S.cyan}AA` }}>00101101</div>
                    <div className="absolute left-0 right-0 pointer-events-none waiting-scan-line"
                      style={{
                        height: '3px',
                        background: `linear-gradient(180deg, transparent, ${S.cyan}, transparent)`,
                        boxShadow: `0 0 12px ${S.cyan}, 0 0 24px ${S.cyan}66`,
                      }} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <div className="relative mb-3">
                        <div className="rounded-full waiting-ring-outer"
                          style={{
                            width: '50px', height: '50px',
                            border: `2px solid ${S.cyan}`,
                            borderTopColor: 'transparent',
                            borderRightColor: 'transparent',
                            boxShadow: `0 0 12px ${S.cyan}, inset 0 0 8px ${S.cyan}66`,
                          }} />
                        <div className="absolute inset-0 m-auto rounded-full waiting-ring-inner"
                          style={{
                            width: '30px', height: '30px', top: '10px', left: '10px',
                            border: `2px solid ${S.purple}`,
                            borderBottomColor: 'transparent',
                            borderLeftColor: 'transparent',
                            boxShadow: `0 0 10px ${S.purple}`,
                          }} />
                        <div className="absolute inset-0 m-auto rounded-full waiting-center-dot"
                          style={{
                            width: '8px', height: '8px', top: '21px', left: '21px',
                            background: S.cyan,
                            boxShadow: `0 0 12px ${S.cyan}, 0 0 24px ${S.cyan}AA`,
                          }} />
                      </div>
                      <p className="font-mono font-bold tracking-[3px] mb-1 waiting-scan-text"
                        style={{ fontSize: '11px', color: S.cyan, textShadow: `0 0 8px ${S.cyan}` }}>
                        ASSIGNING ROLE
                      </p>
                      <p className="font-mono font-bold tracking-widest waiting-dots"
                        style={{ fontSize: '14px', color: S.cyan, textShadow: `0 0 6px ${S.cyan}` }}>
                        ▰▰▰
                      </p>
                    </div>
                    <div className="absolute inset-0 pointer-events-none waiting-glitch"
                      style={{ background: `linear-gradient(90deg, transparent 49%, ${S.cyan}33 50%, transparent 51%)` }} />
                  </div>
                );
              })()}
            </div>

            <div className="rounded-2xl p-4 mb-4 relative z-10"
              style={{
                background: `${S.cyan}08`,
                border: `1px solid ${S.cyan}33`,
                boxShadow: `inset 0 0 12px ${S.cyan}11`,
              }}>
              <p className="text-[10px] font-mono tracking-widest mb-1 font-bold"
                style={{ color: S.cyan, textShadow: `0 0 6px ${S.cyan}AA` }}>
                {`>`} WAITING ROOM
              </p>
              <h2 className="text-base font-black text-white">
                {team.name}
              </h2>
              <p className="text-[12px] text-white mt-0.5" style={{ opacity: 0.7 }}>팀장이 게임을 준비하고 있어요</p>
            </div>

            <div className="rounded-xl p-4 mb-4 min-h-[60px] flex items-center justify-center relative z-10"
              style={{
                background: `${S.purple}08`,
                border: `1px solid ${S.purple}33`,
                boxShadow: `inset 0 0 12px ${S.purple}11`,
              }}>
              <p key={waitingMsgIdx} className="text-[13px] font-bold text-white"
                style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {WAITING_MESSAGES[waitingMsgIdx]}
              </p>
            </div>

            <div className="rounded-xl p-4 mb-4 text-left relative z-10"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${S.cyan}22` }}>
              <p className="text-[10px] font-mono tracking-widest mb-2 font-bold"
                style={{ color: S.cyan }}>
                {`>`} 입장 현황 ({members.filter(m => m.joined_at).length} / {members.length})
              </p>
              <div className="space-y-2">
                {members.map(m => {
                  const joined = !!m.joined_at;
                  const memberRole = m.role_code ? getRole(m.role_code) : (m.is_leader ? getRole('ceo') : null);
                  return (
                    <div key={m.id} className="flex items-center gap-2.5">
                      {memberRole && (
                        <div className="rounded-lg overflow-hidden flex-shrink-0"
                          style={{
                            width: '32px', height: '32px',
                            border: `1.5px solid ${joined ? memberRole.color : 'rgba(255,255,255,0.1)'}`,
                            boxShadow: joined ? `0 0 8px ${memberRole.color}66` : 'none',
                            opacity: joined ? 1 : 0.3,
                          }}>
                          <img src={memberRole.image} alt={memberRole.nameKr}
                            className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              background: joined ? S.cyan : 'rgba(255,255,255,0.15)',
                              boxShadow: joined ? `0 0 6px ${S.cyan}` : 'none',
                            }} />
                          <span className={`text-[12px] truncate ${joined ? 'text-white font-bold' : 'text-gray-600'}`}>
                            {m.is_leader ? '👑 ' : ''}{m.name}
                          </span>
                        </div>
                        {memberRole && (
                          <p className="text-[10px] font-mono ml-3 truncate"
                            style={{ color: joined ? memberRole.color : '#444' }}>
                            {memberRole.nameKr}
                          </p>
                        )}
                      </div>
                      {joined && <span className="text-[9px] font-mono flex-shrink-0"
                        style={{ color: S.cyan }}>✓ READY</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] font-mono relative z-10" style={{ color: '#666' }}>
              ⚡ 게임이 시작되면 자동으로 화면이 전환됩니다
            </p>

            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
              {recentJoiners.map(joiner => {
                const joinerRole = joiner.role_code ? getRole(joiner.role_code) : (joiner.is_leader ? getRole('ceo') : null);
                const toastColor = joinerRole?.color || S.cyan;
                return (
                  <div key={joiner.id}
                    className="rounded-xl px-4 py-2.5 flex items-center gap-2 backdrop-blur-md"
                    style={{
                      background: `${toastColor}15`,
                      border: `1px solid ${toastColor}66`,
                      boxShadow: `0 0 16px ${toastColor}33`,
                      animation: 'slideDownFade 3s ease-out forwards',
                    }}>
                    {joinerRole && (
                      <div className="rounded-md overflow-hidden flex-shrink-0"
                        style={{ width: '24px', height: '24px', border: `1px solid ${toastColor}` }}>
                        <img src={joinerRole.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <span className="text-[13px] font-bold text-white">
                      <span style={{ color: toastColor }}>{joiner.name}</span>님 입장!
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'countdown' && (() => {
          const colorMap: Record<number, { main: string; glow: string; label: string }> = {
            5: { main: S.cyan,   glow: S.cyan,   label: 'STANDBY' },
            4: { main: S.blue,   glow: S.blue,   label: 'STANDBY' },
            3: { main: S.purple, glow: S.purple, label: 'INITIALIZING' },
            2: { main: S.pink,   glow: S.pink,   label: 'WARMING UP' },
            1: { main: '#FF9500', glow: '#FF9500', label: 'GET READY' },
            0: { main: S.green,  glow: S.green,  label: 'GO!' },
          };
          const c = colorMap[countdown] || colorMap[5];
          const ringSize = isMobile ? 280 : 420;
          const ticksCount = 60;

          return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.92)' }}>

              <div className="fixed inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, ${c.main}1F 0%, ${c.main}0A 40%, transparent 75%)`,
                  animation: 'screenAuroraFlash 1s ease-in-out infinite',
                  transition: 'background 0.4s ease',
                }} />

              <div className="relative flex items-center justify-center"
                style={{ width: `${ringSize}px`, height: `${ringSize}px` }}>

                {Array.from({ length: ticksCount }).map((_, i) => {
                  const isMajor = i % 5 === 0;
                  const tickH = isMajor ? (isMobile ? 16 : 22) : (isMobile ? 8 : 12);
                  const tickW = isMajor ? 3 : 1.5;
                  const angle = (i / ticksCount) * 360;
                  return (
                    <div key={i} className="absolute top-1/2 left-1/2 origin-center pointer-events-none countdown-tick"
                      style={{
                        width: `${tickW}px`,
                        height: `${tickH}px`,
                        background: c.main,
                        boxShadow: `0 0 6px ${c.glow}, 0 0 12px ${c.glow}66`,
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${ringSize / 2 - tickH / 2 - 4}px)`,
                        animationDelay: `${i * 0.015}s`,
                        opacity: 0.8,
                        transition: 'background 0.4s ease, box-shadow 0.4s ease',
                      }} />
                  );
                })}

                <div className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    boxShadow: `0 0 60px ${c.glow}33, inset 0 0 80px ${c.glow}11`,
                    transition: 'box-shadow 0.4s ease',
                  }} />

                <div key={countdown}
                  className="relative countdown-digital-number"
                  style={{
                    color: c.main,
                    fontFamily: '"DS-Digital", "Courier New", monospace',
                    fontWeight: 700,
                    fontSize: countdown === 0 ? (isMobile ? '64px' : '100px') : (isMobile ? '110px' : '170px'),
                    letterSpacing: countdown === 0 ? '4px' : '0',
                    textShadow: `0 0 20px ${c.glow}, 0 0 40px ${c.glow}, 0 0 80px ${c.glow}AA, 0 0 120px ${c.glow}66`,
                    transition: 'color 0.4s ease, text-shadow 0.4s ease',
                    zIndex: 10,
                  }}>
                  {countdown === 0 ? 'START' : `0${countdown}`}
                </div>
              </div>

              <div className="fixed bottom-20 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <p className="font-mono tracking-[4px] md:tracking-[6px] font-bold"
                  style={{
                    fontSize: isMobile ? '11px' : '13px',
                    color: c.main,
                    textShadow: `0 0 10px ${c.glow}, 0 0 20px ${c.glow}88`,
                    transition: 'color 0.4s ease, text-shadow 0.4s ease',
                    animation: 'countdownTextPulse 1s ease-in-out infinite',
                  }}>
                  {`> ${c.label}`}
                </p>
              </div>
            </div>
          );
        })()}

        {step === 'welcome' && selectedMember && team && (() => {
          const myMember = members.find(m => m.id === selectedMember.id);
          const myRoleCode = myMember?.role_code || (selectedMember.is_leader ? 'ceo' : null);
          const myRole = myRoleCode ? getRole(myRoleCode) : null;
          const myMission = getRoleMission(myRoleCode);

          return (
            <div className="text-center md:fixed md:inset-0 md:flex md:items-center md:justify-center md:p-6 md:overflow-y-auto md:z-20">
              <div className="md:max-w-4xl md:w-full md:relative">
                <p className="text-[10px] font-mono tracking-widest mb-2 font-bold"
                  style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
                  {`>`} WELCOME ABOARD
                </p>
                <h2 className="text-2xl md:text-3xl font-black text-white mb-1">환영해요, {selectedMember.name}!</h2>
                <p className="text-[13px] md:text-[14px] text-white mb-5 md:mb-6" style={{ opacity: 0.75 }}>
                  {team.name} · {selectedMember.is_leader ? '팀장' : '팀원'}
                </p>

                <div className="flex flex-col md:flex-row md:items-stretch gap-5 md:gap-6 mb-5 md:mb-6 md:text-left">
                  {myRole && (
                    <div className="flex justify-center md:flex-shrink-0 md:items-start">
                      <RoleCard role={myRole} memberName={selectedMember.name} isMobile={isMobile} />
                    </div>
                  )}

                  {myMission && myRole && (
                    <div className="rounded-2xl p-4 md:p-5 text-left relative overflow-hidden md:flex-1 md:min-w-0 md:flex md:flex-col"
                      style={{
                        background: `linear-gradient(135deg, rgba(10,10,18,0.92) 0%, rgba(20,20,30,0.88) 100%), ${myRole.color}10`,
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: `1.5px solid ${myRole.color}60`,
                        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${myRole.color}30, inset 0 0 20px rgba(0,0,0,0.4)`,
                      }}>
                      <div className="absolute top-2 left-2 w-3 h-3 pointer-events-none"
                        style={{ borderTop: `2px solid ${myRole.color}`, borderLeft: `2px solid ${myRole.color}` }} />
                      <div className="absolute top-2 right-2 w-3 h-3 pointer-events-none"
                        style={{ borderTop: `2px solid ${myRole.color}`, borderRight: `2px solid ${myRole.color}` }} />
                      <div className="absolute bottom-2 left-2 w-3 h-3 pointer-events-none"
                        style={{ borderBottom: `2px solid ${myRole.color}`, borderLeft: `2px solid ${myRole.color}` }} />
                      <div className="absolute bottom-2 right-2 w-3 h-3 pointer-events-none"
                        style={{ borderBottom: `2px solid ${myRole.color}`, borderRight: `2px solid ${myRole.color}` }} />

                      <div className="flex items-center gap-2 mb-3 pb-2 border-b relative z-10"
                        style={{ borderColor: `${myRole.color}30` }}>
                        <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ background: myRole.color, boxShadow: `0 0 6px ${myRole.color}` }} />
                        <p className="text-[10px] font-mono tracking-widest font-bold"
                          style={{ color: myRole.color, textShadow: `0 0 8px ${myRole.color}66` }}>
                          MISSION BRIEFING
                        </p>
                        <div className="flex-1" />
                        <span className="text-[9px] font-mono tracking-wider"
                          style={{ color: `${myRole.color}99` }}>
                          [CLASSIFIED]
                        </span>
                      </div>

                      <p className="text-[14px] md:text-[15px] font-black text-white mb-2 leading-tight relative z-10"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                        "{myMission.tagline}"
                      </p>

                      <p className="text-[12px] md:text-[13px] text-gray-200 leading-relaxed mb-3 relative z-10">
                        {myMission.description}
                      </p>

                      <div className="rounded-lg p-2.5 md:p-3 mb-3 relative z-10"
                        style={{
                          background: `linear-gradient(135deg, ${myRole.color}18, ${myRole.color}08)`,
                          borderLeft: `3px solid ${myRole.color}`,
                          boxShadow: `inset 0 0 12px rgba(0,0,0,0.3)`,
                        }}>
                        <p className="text-[9px] font-mono tracking-widest mb-1 font-bold flex items-center gap-1.5"
                          style={{ color: myRole.color }}>
                          <span className="inline-block w-1 h-1 rounded-full" style={{ background: myRole.color }} />
                          이번 게임에서 할 일
                        </p>
                        <p className="text-[11.5px] md:text-[12.5px] text-gray-100 leading-relaxed font-medium">
                          {myMission.inGameMission}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap relative z-10">
                        <span className="text-[9px] font-mono text-gray-400">CORE SKILLS ·</span>
                        {myMission.strengths.map((s, i) => (
                          <span key={i}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${myRole.color}25`,
                              color: myRole.color,
                              border: `1px solid ${myRole.color}50`,
                              textShadow: `0 0 6px ${myRole.color}66`,
                            }}>
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="hidden md:flex md:flex-1 md:items-end md:mt-4 md:pt-3 md:border-t relative z-10 overflow-hidden"
                        style={{ borderColor: `${myRole.color}20` }}>
                        <div className="w-full relative">
                          <p className="text-[9px] font-mono tracking-[3px] mb-0.5"
                            style={{ color: `${myRole.color}88` }}>
                            ROLE
                          </p>
                          {(() => {
                            const nameUpper = myRole.nameEn.toUpperCase();
                            const len = nameUpper.length;
                            const fontSize = len <= 5 ? 'clamp(36px, 5vw, 56px)'
                              : len <= 10 ? 'clamp(30px, 4.2vw, 46px)'
                              : len <= 14 ? 'clamp(26px, 3.6vw, 38px)'
                              : len <= 18 ? 'clamp(22px, 3vw, 32px)'
                              : 'clamp(18px, 2.4vw, 26px)';
                            return (
                              <p className="font-black tracking-tight leading-none whitespace-nowrap"
                                style={{
                                  color: myRole.color,
                                  fontSize,
                                  letterSpacing: '-0.02em',
                                  textShadow: `0 0 24px ${myRole.color}66, 0 0 48px ${myRole.color}33, 0 2px 12px rgba(0,0,0,0.5)`,
                                  fontFamily: '"JetBrains Mono", "Courier New", monospace',
                                }}>
                                {nameUpper}
                              </p>
                            );
                          })()}
                          <div className="absolute bottom-1 right-0 flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full"
                              style={{ background: myRole.color, boxShadow: `0 0 4px ${myRole.color}` }} />
                            <div className="w-1 h-1 rounded-full"
                              style={{ background: `${myRole.color}88` }} />
                            <div className="w-1 h-1 rounded-full"
                              style={{ background: `${myRole.color}44` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ⭐⭐⭐ NEW 8번: welcome 화면 상태별 박스 ⭐⭐⭐ */}
                {welcomeState === 'rejoining' ? (
                  // 상태 3) 재입장: 이미 게임 시작됨 → [▶ 게임으로 돌아가기]
                  <div className="rounded-2xl p-4 md:p-5 md:max-w-md md:mx-auto"
                    style={{
                      background: `linear-gradient(135deg, ${S.green}15 0%, ${S.aqua}10 100%)`,
                      border: `1.5px solid ${S.green}66`,
                      boxShadow: `0 0 24px ${S.green}33`,
                    }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-base">✅</span>
                      <p className="text-[11px] font-mono tracking-[3px] font-bold"
                        style={{ color: S.green, textShadow: `0 0 8px ${S.green}88` }}>
                        GAME IN PROGRESS
                      </p>
                    </div>
                    <p className="text-[13px] md:text-[14px] text-center text-white mb-4 font-bold">
                      게임이 이미 시작되었어요!
                    </p>
                    <button onClick={handleStart}
                      className="cyber-cta-btn relative w-full py-3.5 font-black rounded-2xl text-[14px] transition-all hover:scale-[1.02] overflow-hidden group"
                      style={{
                        background: S.green,
                        color: S.navy,
                        boxShadow: `0 10px 30px -5px ${S.green}66, 0 0 24px ${S.green}55`,
                      }}>
                      <span className="relative z-10">▶ 게임으로 돌아가기</span>
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
                    </button>
                  </div>
                ) : (
                  // 상태 1) 대기 중: 노란 펄스 + 안내 메시지 (관리자 신호 대기)
                  <div className="rounded-2xl p-4 md:p-5 md:max-w-md md:mx-auto"
                    style={{
                      background: 'rgba(234,179,8,0.06)',
                      border: '1.5px solid rgba(234,179,8,0.35)',
                      boxShadow: '0 0 20px rgba(234,179,8,0.15)',
                    }}>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="w-2.5 h-2.5 rounded-full waiting-pulse-dot"
                        style={{ background: '#EAB308', boxShadow: '0 0 10px #EAB308' }} />
                      <p className="text-[11px] font-mono tracking-[3px] font-bold"
                        style={{ color: '#EAB308', textShadow: '0 0 8px rgba(234,179,8,0.7)' }}>
                        WAITING FOR START
                      </p>
                      <span className="w-2.5 h-2.5 rounded-full waiting-pulse-dot"
                        style={{ background: '#EAB308', boxShadow: '0 0 10px #EAB308', animationDelay: '0.5s' }} />
                    </div>
                    <p className="text-[14px] md:text-[15px] text-center text-white mb-2 font-bold leading-relaxed">
                      다른 팀이 준비되는 동안<br/>잠시만 기다려주세요
                    </p>
                    <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      관리자가 시작 신호 보내면 자동으로 시작됩니다
                    </p>

                    {/* 사원증 / 미션을 다시 읽으라는 힌트 */}
                    <div className="mt-3 pt-3 border-t flex items-center justify-center gap-1.5"
                      style={{ borderColor: 'rgba(234,179,8,0.2)' }}>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>💡</span>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        그동안 위의 사원증과 미션을 다시 읽어보세요
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono relative z-10">© 2026 SIGNAL — ConnectAI</p>
      </div>

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
        .halo-pulse { animation: haloPulse 4s ease-in-out infinite; }
        @keyframes haloPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        .interactive-btn .hover-shine { transition: transform 0.7s ease-out; }
        .interactive-btn:hover .hover-shine { transform: translateX(100%); }
        .interactive-btn {
          transition: transform 0.15s ease-out;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          appearance: none;
        }
        .interactive-btn:focus, .interactive-btn:focus-visible { outline: none; box-shadow: none; }
        .interactive-btn::-moz-focus-inner { border: 0; }
        .interactive-btn:active { transform: scale(0.97); }
        .interactive-btn.is-selected {
          animation:
            selectedPulse 2s ease-in-out infinite,
            auroraSelectedGlow 3s ease-in-out infinite;
        }
        @keyframes selectedPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.1); }
        }
        @keyframes auroraSelectedGlow {
          0%, 100% { box-shadow: 0 0 16px #06B6D4AA, 0 0 32px #06B6D466, 0 0 56px #8B5CF644; }
          33% { box-shadow: 0 0 16px #8B5CF6AA, 0 0 32px #8B5CF666, 0 0 56px #3B82F644; }
          66% { box-shadow: 0 0 16px #3B82F6AA, 0 0 32px #3B82F666, 0 0 56px #06B6D444; }
        }
        .aurora-wave { animation: auroraPulse 2.5s ease-in-out forwards; opacity: 0; }
        @keyframes auroraPulse {
          0% { opacity: 0; }
          15% { opacity: 0.5; }
          30% { opacity: 0.85; }
          50% { opacity: 1; }
          70% { opacity: 0.85; }
          85% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        .circuit-signal-1 { animation: signalRight 4s linear infinite; }
        @keyframes signalRight {
          0% { transform: translateX(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        .circuit-signal-2 { animation: signalLeft 5s linear infinite 1s; }
        @keyframes signalLeft {
          0% { transform: translateX(100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }
        .circuit-signal-3 { animation: signalRight 6s linear infinite 2s; }
        .circuit-signal-vertical { animation: signalDown 5s linear infinite 0.5s; }
        @keyframes signalDown {
          0% { transform: translateY(-60px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .scanline { animation: scanlineMove 4s linear infinite; }
        @keyframes scanlineMove {
          0% { transform: translateY(-120px); }
          100% { transform: translateY(100vh); }
        }
        .neon-particle {
          animation-name: neonTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes neonTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        .glitch-text { position: relative; animation: glitchPulse 5s ease-in-out infinite; }
        @keyframes glitchPulse {
          0%, 100% {
            text-shadow: 0 0 20px rgba(231, 254, 85, 0.4), 0 0 40px rgba(231, 254, 85, 0.2);
          }
          50% {
            text-shadow:
              -1px 0 0 rgba(193, 232, 235, 0.7),
              1px 0 0 rgba(231, 254, 85, 0.7),
              0 0 30px rgba(231, 254, 85, 0.6),
              0 0 60px rgba(193, 232, 235, 0.3);
          }
        }
        .cyber-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(231, 254, 85, 0.05) 50%, transparent 70%);
          animation: cardSweep 4s linear infinite;
          pointer-events: none;
        }
        @keyframes cardSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .cyber-input:focus { animation: inputPulse 1.5s ease-in-out infinite; }
        @keyframes inputPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(231, 254, 85, 0.4), inset 0 0 12px rgba(231, 254, 85, 0.1); }
          50% { box-shadow: 0 0 30px rgba(231, 254, 85, 0.7), inset 0 0 18px rgba(231, 254, 85, 0.2); }
        }
        .cyber-btn { animation: btnNeonPulse 2.5s ease-in-out infinite; }
        @keyframes btnNeonPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(231, 254, 85, 0.4), 0 10px 30px -5px rgba(231, 254, 85, 0.5); }
          50% { box-shadow: 0 0 40px rgba(231, 254, 85, 0.7), 0 10px 40px -5px rgba(231, 254, 85, 0.8); }
        }
        .waiting-role-card { animation: waitingCardPulse 2s ease-in-out infinite; }
        @keyframes waitingCardPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(6, 182, 212, 0.2), inset 0 0 20px rgba(6, 182, 212, 0.07); }
          50% { box-shadow: 0 0 36px rgba(6, 182, 212, 0.4), inset 0 0 30px rgba(6, 182, 212, 0.15); }
        }
        .waiting-scan-line { animation: waitingScanFlow 1.8s ease-in-out infinite; top: 0; }
        @keyframes waitingScanFlow {
          0% { top: 0; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .waiting-bit-1 { animation: waitingBitBlink 1s ease-in-out infinite 0s; }
        .waiting-bit-2 { animation: waitingBitBlink 1s ease-in-out infinite 0.25s; }
        .waiting-bit-3 { animation: waitingBitBlink 1s ease-in-out infinite 0.5s; }
        .waiting-bit-4 { animation: waitingBitBlink 1s ease-in-out infinite 0.75s; }
        @keyframes waitingBitBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
        .waiting-ring-outer { animation: waitingRingSpin 2s linear infinite; }
        @keyframes waitingRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .waiting-ring-inner { animation: waitingRingSpinReverse 1.5s linear infinite; }
        @keyframes waitingRingSpinReverse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        .waiting-center-dot { animation: waitingDotPulse 1s ease-in-out infinite; }
        @keyframes waitingDotPulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        .waiting-scan-text { animation: waitingScanTextPulse 1.5s ease-in-out infinite; }
        @keyframes waitingScanTextPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .waiting-dots { animation: waitingDotsFlow 0.8s ease-in-out infinite; }
        @keyframes waitingDotsFlow {
          0%, 100% { letter-spacing: 4px; opacity: 0.5; }
          50% { letter-spacing: 8px; opacity: 1; }
        }
        .waiting-glitch { animation: waitingGlitchEffect 3s ease-in-out infinite; opacity: 0; }
        @keyframes waitingGlitchEffect {
          0%, 95% { opacity: 0; transform: translateX(0); }
          96% { opacity: 1; transform: translateX(-2px); }
          97% { opacity: 1; transform: translateX(2px); }
          98% { opacity: 1; transform: translateX(-1px); }
          100% { opacity: 0; transform: translateX(0); }
        }
        @keyframes screenAuroraFlash {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .countdown-tick { animation: tickPulse 1s ease-in-out infinite; }
        @keyframes tickPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .countdown-digital-number { animation: digitalNumberEnter 0.4s ease-out forwards; }
        @keyframes digitalNumberEnter {
          0% { opacity: 0; transform: scale(0.85); filter: blur(6px); }
          50% { opacity: 1; transform: scale(1.05); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes countdownTextPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .role-guide-expand {
          animation: roleGuideExpand 0.25s ease-out;
        }
        @keyframes roleGuideExpand {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* ⭐⭐⭐ NEW 8번: welcome 대기 상태 펄스 ⭐⭐⭐ */
        @keyframes waitingPulseDot {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.35); }
        }
        .waiting-pulse-dot {
          animation: waitingPulseDot 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ⭐⭐⭐ NEW: Suspense 래퍼 (useSearchParams는 Suspense boundary 필요)
export default function StudentJoin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#0A0A0A' }}>
        <p className="font-mono text-sm" style={{ color: '#06B6D4' }}>
          {`>`} 로딩 중...
        </p>
      </div>
    }>
      <StudentJoinInner />
    </Suspense>
  );
}
