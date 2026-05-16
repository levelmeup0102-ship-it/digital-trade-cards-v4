'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getCurrentTeacher, getClass,
  getTeamRankings, subscribeToClassProgress,
} from '@/lib/teacher';
import type { Teacher, Class, Team } from '@/lib/teacher';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  navy: '#111111',
  bg: '#0A0A0A',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  indigo: '#6366F1',
};

const CARD_NAMES: Record<string, string> = {
  '01': '시장 개요', '02': '시장 분석', '03': '세분화', '04': '경쟁 분석',
  '05': '시장 기회', '06': '규제', '07': '고객 여정', '08': '비즈니스 모델',
  '09': '가격 전략', '10': '제품 전략', '11': '유통 채널', '12': '마케팅',
  '13': 'GTM 실행', '14': '리스크', '15': '성장 전략', '16': 'TBT·인증',
};

type CompletionToast = {
  id: number;
  teamName: string;
  cardId: string;
  cardName: string;
};

const FLOATING_CARDS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: [10, 85, 25, 75, 5, 90, 50, 15, 70, 40][i],
  top: [20, 30, 65, 75, 50, 15, 85, 5, 95, 60][i],
  size: [40, 50, 35, 45, 50, 38, 42, 36, 48, 40][i],
  duration: [16, 18, 14, 20, 17, 15, 19, 13, 16, 18][i],
  delay: [0, 2, 1, 3, 0.5, 2.5, 1.5, 3.5, 0.8, 2.2][i],
  rotate: [-15, 12, -8, 20, -22, 10, -18, 8, -25, 15][i],
}));

// ⭐⭐⭐ NEW: 양옆 큰 SIGNAL 카드 (좌5장 + 우5장 = 10장) ⭐⭐⭐
// 시안에서 보여준 진짜 카드처럼 보이는 큰 배경 카드들
const SIDE_CARDS = [
  // ─── 좌측 5장 ───
  { id: 'L1', side: 'left',  topPx: 150, offsetPx: 20,  width: 120, height: 160, rotate: -12, color: '#06B6D4', cardNum: '01', duration: 18, delay: 0 },
  { id: 'L2', side: 'left',  topPx: 30,  offsetPx: 90,  width: 110, height: 145, rotate: 8,   color: '#8B5CF6', cardNum: '04', duration: 20, delay: 1.5 },
  { id: 'L3', side: 'left',  topPx: 340, offsetPx: 40,  width: 125, height: 165, rotate: 15,  color: '#E7FE55', cardNum: '07', duration: 22, delay: 3 },
  { id: 'L4', side: 'left',  topPx: 480, offsetPx: 140, width: 115, height: 150, rotate: -8,  color: '#FF6FB5', cardNum: '09', duration: 19, delay: 0.8 },
  { id: 'L5', side: 'left',  topPx: 660, offsetPx: 20,  width: 100, height: 135, rotate: 20,  color: '#FF671F', cardNum: '13', duration: 21, delay: 2.2 },
  // ─── 우측 5장 ───
  { id: 'R1', side: 'right', topPx: 80,  offsetPx: 30,  width: 130, height: 170, rotate: 15,  color: '#8B5CF6', cardNum: '02', duration: 18, delay: 1 },
  { id: 'R2', side: 'right', topPx: 250, offsetPx: 80,  width: 115, height: 155, rotate: -12, color: '#06B6D4', cardNum: '05', duration: 20, delay: 2.5 },
  { id: 'R3', side: 'right', topPx: 420, offsetPx: 20,  width: 125, height: 160, rotate: 10,  color: '#E7FE55', cardNum: '11', duration: 22, delay: 0.5 },
  { id: 'R4', side: 'right', topPx: 580, offsetPx: 100, width: 110, height: 145, rotate: -18, color: '#FF6FB5', cardNum: '14', duration: 19, delay: 3.2 },
  { id: 'R5', side: 'right', topPx: 720, offsetPx: 30,  width: 95,  height: 130, rotate: 6,   color: '#FF671F', cardNum: '16', duration: 17, delay: 1.8 },
];

const PARTICLES = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 1 + Math.random() * 2.5,
  duration: 3 + Math.random() * 4,
  delay: Math.random() * 5,
  color: i % 5 === 0 ? S.cyan : i % 5 === 1 ? S.blue : i % 5 === 2 ? S.purple : i % 5 === 3 ? S.green : '#fff',
}));

// ⭐ NEW: 폭죽 입자 (1위 변경 시)
const FIREWORK_COLORS = [S.gold, S.cyan, S.green, S.purple, S.blue, '#FF6FB5'];

export default function RankingPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [completionToasts, setCompletionToasts] = useState<CompletionToast[]>([]);
  const [recentlyUpdatedTeam, setRecentlyUpdatedTeam] = useState<string | null>(null);
  const [screenFlash, setScreenFlash] = useState(false);
  const toastIdRef = useRef(0);
  const teamsRef = useRef<Team[]>([]);
  const [currentTime, setCurrentTime] = useState('');

  // ⭐ NEW: 1등 변경 감지 + 폭죽
  const previousFirstTeamRef = useRef<string | null>(null);
  const [showFirework, setShowFirework] = useState(false);
  const [newFirstTeamName, setNewFirstTeamName] = useState<string | null>(null);

  // ⭐⭐⭐ NEW: 카드 진행 격자 펼침 상태 (한 번에 1개만 열림)
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  // ⭐⭐⭐ NEW: 전체화면 모드 ⭐⭐⭐
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error('전체화면 전환 실패:', e);
    }
  };

  // 브라우저 풀스크린 변화 감지 (ESC 키로 빠져나갈 때도 대응)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      if (!t) { router.push('/teacher'); return; }
      setTeacher(t);

      const [clsData, teamsData] = await Promise.all([
        getClass(classId),
        getTeamRankings(classId),
      ]);
      setCls(clsData);
      setTeams(teamsData);
      // 초기 1등 기록
      if (teamsData.length > 0 && (teamsData[0].completed_count || 0) > 0) {
        previousFirstTeamRef.current = teamsData[0].id;
      }
      setLoading(false);
    })();
  }, [classId, router]);

  useEffect(() => {
    if (loading || teams.length === 0) return;
    const teamIds = teams.map(t => t.id);

    const unsubscribe = subscribeToClassProgress(
      classId,
      teamIds,
      async (event) => {
        if (!event.isCompleted) return;

        const team = teamsRef.current.find(t => t.id === event.teamId);
        if (!team) return;

        const id = ++toastIdRef.current;
        const cardName = CARD_NAMES[event.cardId] || `카드 ${event.cardId}`;
        setCompletionToasts(prev => [
          ...prev,
          { id, teamName: team.name, cardId: event.cardId, cardName },
        ]);
        setTimeout(() => {
          setCompletionToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);

        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 800);

        setRecentlyUpdatedTeam(event.teamId);
        setTimeout(() => setRecentlyUpdatedTeam(null), 2000);

        const newRankings = await getTeamRankings(classId);

        // ⭐ NEW: 1등 변경 감지
        const newFirstTeam = newRankings[0];
        if (
          newFirstTeam &&
          (newFirstTeam.completed_count || 0) > 0 &&
          previousFirstTeamRef.current !== newFirstTeam.id
        ) {
          // 1등이 바뀜! 폭죽 발사
          previousFirstTeamRef.current = newFirstTeam.id;
          setNewFirstTeamName(newFirstTeam.name);
          setShowFirework(true);
          setTimeout(() => {
            setShowFirework(false);
            setNewFirstTeamName(null);
          }, 3500);
        }

        setTeams(newRankings);
      }
    );

    return () => unsubscribe();
  }, [classId, loading, teams.length]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <p className="text-gray-500 font-mono text-sm">불러오는 중...</p>
    </div>
  );

  // ⭐ 정렬: 완료 카드 수 내림차순
  const sortedTeams = [...teams].sort((a, b) => (b.completed_count || 0) - (a.completed_count || 0));
  // ⭐⭐⭐ NEW: 5등까지만 표시
  const top5Teams = sortedTeams.slice(0, 5);

  const totalCompleted = sortedTeams.reduce((sum, t) => sum + (t.completed_count || 0), 0);
  const totalCards = sortedTeams.length * 16;
  const overallProgress = totalCards > 0 ? Math.round((totalCompleted / totalCards) * 100) : 0;

  // ⭐ NEW: 시상대 팀 분리
  const firstPlace = top5Teams[0];
  const secondPlace = top5Teams[1];
  const thirdPlace = top5Teams[2];
  const fourthFifth = top5Teams.slice(3, 5);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: S.bg }}>

      {/* 배경 메시 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 20%, ${S.cyan}15 0%, transparent 40%),
            radial-gradient(circle at 85% 75%, ${S.blue}12 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, ${S.purple}10 0%, transparent 60%)
          `,
        }} />

      {/* 격자 패턴 배경 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${S.cyan} 1px, transparent 1px),
            linear-gradient(90deg, ${S.cyan} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />

      {/* 떠다니는 카드 (배경 장식) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {FLOATING_CARDS.map(card => (
          <div key={card.id} className="absolute rounded-lg"
            style={{
              left: `${card.left}%`,
              top: `${card.top}%`,
              width: `${card.size}px`,
              height: `${card.size * 1.4}px`,
              background: `linear-gradient(135deg, ${S.cyan}15, ${S.blue}10)`,
              border: `1px solid ${S.cyan}20`,
              boxShadow: `0 4px 20px ${S.cyan}10`,
              animation: `floatCardBg ${card.duration}s ease-in-out ${card.delay}s infinite`,
              transform: `rotate(${card.rotate}deg)`,
            }} />
        ))}
      </div>

      {/* ⭐⭐⭐ NEW: 양옆 큰 SIGNAL 카드 (좌5 + 우5) ⭐⭐⭐ */}
      {/* 와이드 화면 (xl+)에서만 표시 - 1280px 이상 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden xl:block">
        {SIDE_CARDS.map(card => {
          const positionStyle = card.side === 'left'
            ? { left: `${card.offsetPx}px` }
            : { right: `${card.offsetPx}px` };

          return (
            <div key={card.id} className="absolute side-card-float"
              style={{
                top: `${card.topPx}px`,
                ...positionStyle,
                width: `${card.width}px`,
                height: `${card.height}px`,
                background: `linear-gradient(135deg, ${card.color}40 0%, ${card.color}25 100%)`,
                border: `1px solid ${card.color}80`,
                borderRadius: '14px',
                boxShadow: `0 8px 24px ${card.color}30, 0 0 20px ${card.color}20`,
                transform: `rotate(${card.rotate}deg)`,
                animation: `sideCardFloat ${card.duration}s ease-in-out ${card.delay}s infinite`,
                padding: '10px',
              }}>
              {/* 상단 라인 */}
              <div className="w-full h-[2px] mb-2 rounded"
                style={{ background: `${card.color}66` }} />
              {/* 카드 번호 */}
              <p className="text-center font-mono font-black mb-3"
                style={{ color: card.color, fontSize: '11px', letterSpacing: '1px' }}>
                {card.cardNum}
              </p>
              {/* 가짜 텍스트 라인 (스켈레톤) */}
              <div className="space-y-1.5">
                <div className="h-[2px] rounded" style={{ width: '80%', background: `${card.color}50` }} />
                <div className="h-[2px] rounded" style={{ width: '60%', background: `${card.color}50` }} />
                <div className="h-[2px] rounded mt-3" style={{ width: '70%', background: `${card.color}40` }} />
                <div className="h-[2px] rounded" style={{ width: '50%', background: `${card.color}40` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 빛 입자 (별) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map(p => (
          <div key={p.id} className="absolute rounded-full"
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

      {/* ⭐⭐⭐ NEW: 사이드 빛 줄기 (좌우 가로지르는 신호) ⭐⭐⭐ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute h-[2px] rank-beam rank-beam-cyan"
          style={{ top: '12%', left: '0', width: '180px' }} />
        <div className="absolute h-[2px] rank-beam rank-beam-purple"
          style={{ top: '38%', right: '0', width: '200px' }} />
        <div className="absolute h-[2px] rank-beam rank-beam-green"
          style={{ top: '68%', left: '0', width: '140px' }} />
        <div className="absolute h-[2px] rank-beam rank-beam-cyan"
          style={{ top: '88%', right: '0', width: '160px' }} />
      </div>

      {/* ⭐⭐⭐ NEW: 네 모서리 코너 장식 (사이버펑크 프레임) ⭐⭐⭐ */}
      <div className="fixed top-4 left-4 w-14 h-14 pointer-events-none z-[5]"
        style={{
          borderTop: `2px solid ${S.cyan}`,
          borderLeft: `2px solid ${S.cyan}`,
          boxShadow: `inset 2px 2px 8px ${S.cyan}33`,
        }} />
      <div className="fixed top-4 right-4 w-14 h-14 pointer-events-none z-[5]"
        style={{
          borderTop: `2px solid ${S.purple}`,
          borderRight: `2px solid ${S.purple}`,
          boxShadow: `inset -2px 2px 8px ${S.purple}33`,
        }} />
      <div className="fixed bottom-4 left-4 w-14 h-14 pointer-events-none z-[5]"
        style={{
          borderBottom: `2px solid ${S.purple}`,
          borderLeft: `2px solid ${S.purple}`,
          boxShadow: `inset 2px -2px 8px ${S.purple}33`,
        }} />
      <div className="fixed bottom-4 right-4 w-14 h-14 pointer-events-none z-[5]"
        style={{
          borderBottom: `2px solid ${S.cyan}`,
          borderRight: `2px solid ${S.cyan}`,
          boxShadow: `inset -2px -2px 8px ${S.cyan}33`,
        }} />

      {/* 상단 빛 줄기 */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '300px',
          background: `radial-gradient(ellipse at top, ${S.cyan}25 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }} />

      {/* 화면 전체 플래시 */}
      {screenFlash && (
        <div className="fixed inset-0 pointer-events-none z-[100]"
          style={{
            background: `radial-gradient(circle at center, ${S.cyan}50 0%, transparent 60%)`,
            animation: 'screenFlashRanking 0.8s ease-out forwards',
          }} />
      )}

      {/* ⭐⭐⭐ NEW: 1등 변경 폭죽 ⭐⭐⭐ */}
      {showFirework && (
        <>
          {/* 폭죽 입자 */}
          <div className="fixed inset-0 pointer-events-none z-[150] flex items-center justify-center">
            {Array.from({ length: 50 }).map((_, i) => {
              const angle = (Math.PI * 2 * i) / 50 + Math.random() * 0.3;
              const distance = 200 + Math.random() * 200;
              const color = FIREWORK_COLORS[i % FIREWORK_COLORS.length];
              const size = 4 + Math.random() * 6;
              return (
                <div key={i} className="absolute rounded-full firework-particle"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    background: color,
                    boxShadow: `0 0 ${size * 2}px ${color}`,
                    ['--tx' as any]: `${Math.cos(angle) * distance}px`,
                    ['--ty' as any]: `${Math.sin(angle) * distance}px`,
                  }} />
              );
            })}
          </div>

          {/* 1위 변경 알림 */}
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[151] pointer-events-none firework-banner">
            <div className="rounded-3xl px-8 py-5 text-center"
              style={{
                background: `linear-gradient(135deg, ${S.gold} 0%, #FFA500 100%)`,
                boxShadow: `0 20px 80px ${S.gold}AA, 0 0 100px ${S.gold}88`,
                border: `3px solid ${S.gold}`,
              }}>
              <p className="text-[10px] font-mono tracking-[6px] font-bold mb-1"
                style={{ color: 'rgba(0,0,0,0.7)' }}>
                NEW LEADER
              </p>
              <p className="text-2xl font-black mb-1" style={{ color: S.navy }}>
                👑 {newFirstTeamName}
              </p>
              <p className="text-[12px] font-black" style={{ color: 'rgba(0,0,0,0.75)' }}>
                1위 등극!
              </p>
            </div>
          </div>
        </>
      )}

      <div className="relative z-10 px-4 md:px-6 py-6 max-w-6xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          {/* ⭐ NEW: 풀스크린 시 숨김 */}
          {!isFullscreen ? (
            <button onClick={() => router.push(`/teacher/class/${classId}`)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-bold">
              <span>←</span>
              <span>수업 상세로</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <div className="text-[15px] font-mono text-white font-bold tabular-nums">{currentTime}</div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
              <div className="w-2.5 h-2.5 rounded-full live-pulse" style={{ background: '#EF4444' }} />
              <span className="text-[12px] font-bold font-mono" style={{ color: '#EF4444' }}>LIVE</span>
            </div>
            {/* ⭐⭐⭐ NEW: 전체화면 토글 버튼 ⭐⭐⭐ */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? '전체화면 해제 (ESC)' : '전체화면 (몰입 모드)'}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                background: isFullscreen ? `${S.cyan}25` : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isFullscreen ? S.cyan + '88' : 'rgba(255,255,255,0.15)'}`,
                color: isFullscreen ? S.cyan : '#ccc',
                fontSize: '15px',
                lineHeight: 1,
                boxShadow: isFullscreen ? `0 0 12px ${S.cyan}55` : 'none',
              }}>
              {isFullscreen ? '⊠' : '⛶'}
            </button>
          </div>
        </div>

        {/* 타이틀 */}
        <div className="text-center mb-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: '500px',
              height: '500px',
              background: `radial-gradient(circle, ${S.cyan}08 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }} />

          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="hidden md:block flex-1 max-w-[200px] h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${S.cyan}AA 100%)` }} />
            <p className="text-[12px] tracking-[8px] font-mono font-bold relative"
              style={{ color: S.cyan, textShadow: `0 0 12px ${S.cyan}AA` }}>
              REAL-TIME LEADERBOARD
            </p>
            <div className="hidden md:block flex-1 max-w-[200px] h-[1px]"
              style={{ background: `linear-gradient(90deg, ${S.cyan}AA 0%, transparent 100%)` }} />
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight relative">
            🏆 SIGNAL <span style={{
              color: S.cyan,
              textShadow: `0 0 30px ${S.cyan}88, 0 0 60px ${S.cyan}55`,
            }}>랭킹</span>
          </h1>
          <p className="text-sm md:text-base text-gray-300 font-bold relative">{cls?.name}</p>

          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-1 h-1 rounded-full" style={{ background: S.cyan, boxShadow: `0 0 8px ${S.cyan}` }} />
            <div className="w-2 h-2 rounded-full" style={{ background: S.blue, boxShadow: `0 0 8px ${S.blue}` }} />
            <div className="w-1 h-1 rounded-full" style={{ background: S.purple, boxShadow: `0 0 8px ${S.purple}` }} />
          </div>
        </div>

        {/* 전체 진행률 카드 */}
        <div className="aurora-card rounded-2xl p-5 md:p-6 mb-8 relative overflow-hidden">
          <div className="aurora-layer aurora-1" />
          <div className="aurora-layer aurora-2" />
          <div className="aurora-layer aurora-3" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <p className="text-[10px] md:text-[11px] font-mono tracking-widest mb-1 font-bold flex items-center gap-2"
                  style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: S.cyan, boxShadow: `0 0 8px ${S.cyan}` }} />
                  OVERALL PROGRESS
                </p>
                <p className="text-[16px] md:text-[18px] font-black text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  전체 진행 상황
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl md:text-4xl font-black font-mono"
                  style={{
                    color: S.cyan,
                    textShadow: `0 0 20px ${S.cyan}AA, 0 2px 4px rgba(0,0,0,0.8)`,
                  }}>
                  {overallProgress}<span className="text-lg text-gray-300">%</span>
                </p>
                <p className="text-[11px] md:text-[12px] text-gray-200 font-mono font-bold"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {totalCompleted} / {totalCards} 카드
                </p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden relative" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                style={{
                  width: `${overallProgress}%`,
                  background: `linear-gradient(90deg, ${S.cyan} 0%, ${S.blue} 50%, ${S.purple} 100%)`,
                  boxShadow: `0 0 20px ${S.cyan}AA`,
                }}>
                <div className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                    animation: 'shimmerRank 2s ease-in-out infinite',
                  }} />
              </div>
            </div>
            <p className="text-[11px] md:text-[12px] text-gray-200 mt-2 font-mono font-bold flex items-center gap-1.5"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <span className="text-base">🎮</span> 참여 팀 {sortedTeams.length}개 (TOP 5 표시)
            </p>
          </div>
        </div>

        {/* 섹션 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${S.gold}66 100%)` }} />
          <p className="text-[12px] font-mono tracking-widest font-bold"
            style={{ color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
            🏆 PODIUM · TOP 5
          </p>
          <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, ${S.gold}66 0%, transparent 100%)` }} />
        </div>

        {sortedTeams.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🎴</p>
            <p className="text-gray-300 text-lg font-bold">아직 팀이 없어요</p>
          </div>
        ) : (
          <>
            {/* ⭐⭐⭐ 시상대 (1, 2, 3등) ⭐⭐⭐ */}
            <div className="podium-container mb-8 max-w-5xl mx-auto">
              {/* 데스크탑: 2-1-3 가로 배치 / 모바일: 1-2-3 세로 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:items-end">

                {/* 2등 (왼쪽, 데스크탑) */}
                {secondPlace && (
                  <div className={`podium-slot podium-slot-2 ${recentlyUpdatedTeam === secondPlace.id ? 'rank-flash' : ''}`}>
                    <PodiumCard
                      team={secondPlace}
                      rank={1}
                      isExpanded={expandedTeamId === secondPlace.id}
                      onToggle={() => setExpandedTeamId(prev => prev === secondPlace.id ? null : secondPlace.id)}
                    />
                  </div>
                )}

                {/* 1등 (중앙, 가장 큼) */}
                {firstPlace && (
                  <div className={`podium-slot podium-slot-1 ${recentlyUpdatedTeam === firstPlace.id ? 'rank-flash' : ''}`}>
                    <PodiumCard
                      team={firstPlace}
                      rank={0}
                      isExpanded={expandedTeamId === firstPlace.id}
                      onToggle={() => setExpandedTeamId(prev => prev === firstPlace.id ? null : firstPlace.id)}
                    />
                  </div>
                )}

                {/* 3등 (오른쪽, 데스크탑) */}
                {thirdPlace && (
                  <div className={`podium-slot podium-slot-3 ${recentlyUpdatedTeam === thirdPlace.id ? 'rank-flash' : ''}`}>
                    <PodiumCard
                      team={thirdPlace}
                      rank={2}
                      isExpanded={expandedTeamId === thirdPlace.id}
                      onToggle={() => setExpandedTeamId(prev => prev === thirdPlace.id ? null : thirdPlace.id)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 4-5등 리스트 */}
            {fourthFifth.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${S.cyan}44 100%)` }} />
                  <p className="text-[11px] font-mono tracking-widest font-bold"
                    style={{ color: '#888' }}>
                    RUNNER-UP
                  </p>
                  <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, ${S.cyan}44 0%, transparent 100%)` }} />
                </div>

                <div className="space-y-2.5">
                  {fourthFifth.map((team, idx) => {
                    const rank = idx + 3; // 4등 = 3, 5등 = 4
                    const completed = team.completed_count || 0;
                    const progress = (completed / 16) * 100;
                    const isUpdated = recentlyUpdatedTeam === team.id;
                    const isExpanded = expandedTeamId === team.id;

                    return (
                      <div key={team.id}
                        className={`rounded-xl transition-all overflow-hidden ${isUpdated ? 'rank-flash' : ''}`}
                        style={{
                          background: isExpanded ? 'rgba(6, 182, 212, 0.06)' : 'rgba(255,255,255,0.04)',
                          border: isExpanded ? `1px solid ${S.cyan}66` : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isExpanded ? `0 4px 24px ${S.cyan}33` : '0 2px 8px rgba(0,0,0,0.2)',
                        }}>
                        {/* 클릭 가능한 헤더 */}
                        <button
                          onClick={() => setExpandedTeamId(prev => prev === team.id ? null : team.id)}
                          className="w-full p-3 md:p-4 flex items-center gap-4 text-left hover:bg-white/5 transition">
                          {/* 순위 번호 */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: '#aaa',
                            }}>
                            {rank + 1}
                          </div>

                          {/* 팀 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-base md:text-lg font-black text-white"
                                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                                {team.name}
                              </h4>
                              {team.item && (
                                <span className="text-[10px] md:text-[11px] px-2 py-0.5 rounded-full font-bold truncate max-w-[150px] md:max-w-none"
                                  style={{
                                    color: S.cyan,
                                    background: `${S.cyan}15`,
                                    border: `1px solid ${S.cyan}40`,
                                  }}>
                                  {team.item}
                                </span>
                              )}
                            </div>
                            {/* 진행률 바 */}
                            <div className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: 'rgba(0,0,0,0.4)' }}>
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${progress}%`,
                                  background: completed > 0
                                    ? `linear-gradient(90deg, ${S.cyan} 0%, ${S.blue} 100%)`
                                    : 'transparent',
                                  boxShadow: completed > 0 ? `0 0 8px ${S.cyan}66` : 'none',
                                }} />
                            </div>
                          </div>

                          {/* 점수 */}
                          <div className="flex-shrink-0 text-right">
                            <p className="font-black font-mono text-lg md:text-xl"
                              style={{
                                color: completed > 0 ? S.cyan : '#888',
                                textShadow: completed > 0 ? `0 0 8px ${S.cyan}66` : 'none',
                              }}>
                              {completed}<span className="text-xs text-gray-500">/16</span>
                            </p>
                            {team.member_count !== undefined && (
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                👥 {team.member_count}
                              </p>
                            )}
                          </div>

                          {/* 펼침 화살표 */}
                          <div className="flex-shrink-0 text-gray-500 text-xs"
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s',
                            }}>
                            ▼
                          </div>
                        </button>

                        {/* ⭐ NEW: 카드 진행 격자 (펼침) */}
                        {isExpanded && (
                          <div className="px-3 md:px-4 pb-3 md:pb-4 pt-1">
                            <CardProgressGrid team={team} compact />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5등 이하 안내 */}
            {sortedTeams.length > 5 && (
              <div className="text-center rounded-xl p-3 mb-6"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.1)',
                }}>
                <p className="text-[11px] font-mono" style={{ color: '#666' }}>
                  그 외 <span style={{ color: '#aaa', fontWeight: 700 }}>{sortedTeams.length - 5}개 팀</span>도 함께 진행 중 🎯
                </p>
              </div>
            )}
          </>
        )}

        {/* ⭐⭐⭐ NEW: SIGNAL 워터마크 영역 (사이버틱 로고 + 회로선) ⭐⭐⭐ */}
        <div className="relative mt-16 mb-10 select-none pointer-events-none hidden md:block">
          {/* 상단 정보 라인 */}
          <div className="flex items-center justify-between mb-6 px-8">
            <div>
              <p className="text-[10px] font-mono tracking-widest font-bold mb-1"
                style={{ color: S.cyan }}>
                ▸ SYSTEM ID
              </p>
              <p className="text-[10px] font-mono" style={{ color: '#666' }}>
                SGN-2026-LIVE
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono tracking-widest font-bold mb-1"
                style={{ color: S.purple }}>
                STATUS ◂
              </p>
              <p className="text-[10px] font-mono flex items-center justify-end gap-1.5" style={{ color: '#666' }}>
                CONNECTED
                <span className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: S.cyan, boxShadow: `0 0 6px ${S.cyan}` }} />
              </p>
            </div>
          </div>

          {/* ⭐⭐⭐ 회로선 (화면 양끝까지 확장) ⭐⭐⭐ */}
          {/* 화면 너비를 가득 채우기 위해 부모의 max-w 제한 밖으로 빼냄 (negative margin) */}
          <div className="relative" style={{
            marginLeft: 'calc(50% - 50vw)',
            marginRight: 'calc(50% - 50vw)',
            width: '100vw',
          }}>
            <svg className="w-full" viewBox="0 0 2000 180" preserveAspectRatio="none"
              style={{ height: '180px' }}>
              <defs>
                <linearGradient id="logoGradCyanPurple" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={S.cyan} />
                  <stop offset="100%" stopColor={S.purple} />
                </linearGradient>
              </defs>

              {/* ─── 좌측 회로선 (긴 거리 + 노드 3개 + 분기) ─── */}
              <g stroke={S.cyan} strokeWidth="1" fill="none" opacity="0.4">
                {/* 상단 회로선 */}
                <path d="M 0,40 L 150,40 L 180,70 L 380,70 L 410,55 L 600,55 L 630,70 L 750,70" />
                {/* 하단 회로선 */}
                <path d="M 0,140 L 100,140 L 130,120 L 280,120 L 310,140 L 480,140 L 510,120 L 680,120" />
                {/* 수직 분기 */}
                <line x1="180" y1="40" x2="180" y2="70" strokeWidth="0.8" opacity="0.5" />
                <line x1="410" y1="40" x2="410" y2="55" strokeWidth="0.8" opacity="0.5" />
                {/* 노드 점들 */}
                <circle cx="180" cy="70" r="3" fill={S.cyan} />
                <circle cx="410" cy="55" r="2.5" fill={S.cyan} />
                <circle cx="630" cy="70" r="3" fill={S.purple} />
                <circle cx="130" cy="120" r="2.5" fill={S.purple} />
                <circle cx="310" cy="140" r="2.5" fill={S.cyan} />
                <circle cx="510" cy="120" r="3" fill={S.purple} />
                {/* 시작점 점멸 (좌측 끝) */}
                <circle cx="10" cy="40" r="2" fill={S.cyan} opacity="0.7" />
                <circle cx="10" cy="140" r="2" fill={S.cyan} opacity="0.7" />
              </g>

              {/* ─── 우측 회로선 (긴 거리 + 노드 3개 + 분기) ─── */}
              <g stroke={S.purple} strokeWidth="1" fill="none" opacity="0.4">
                {/* 상단 회로선 */}
                <path d="M 1250,70 L 1370,70 L 1400,55 L 1590,55 L 1620,70 L 1820,70 L 1850,40 L 2000,40" />
                {/* 하단 회로선 */}
                <path d="M 1320,120 L 1490,120 L 1520,140 L 1690,140 L 1720,120 L 1870,120 L 1900,140 L 2000,140" />
                {/* 수직 분기 */}
                <line x1="1590" y1="40" x2="1590" y2="55" strokeWidth="0.8" opacity="0.5" />
                <line x1="1850" y1="40" x2="1850" y2="55" strokeWidth="0.8" opacity="0.5" />
                {/* 노드 점들 */}
                <circle cx="1370" cy="70" r="3" fill={S.purple} />
                <circle cx="1590" cy="55" r="2.5" fill={S.purple} />
                <circle cx="1820" cy="70" r="3" fill={S.cyan} />
                <circle cx="1490" cy="120" r="2.5" fill={S.cyan} />
                <circle cx="1720" cy="120" r="2.5" fill={S.purple} />
                <circle cx="1900" cy="140" r="3" fill={S.cyan} />
                {/* 끝점 점멸 (우측 끝) */}
                <circle cx="1990" cy="40" r="2" fill={S.purple} opacity="0.7" />
                <circle cx="1990" cy="140" r="2" fill={S.purple} opacity="0.7" />
              </g>

              {/* 거대 SIGNAL 로고 (윤곽선) - 가운데 */}
              <text x="1000" y="115" textAnchor="middle"
                style={{
                  fill: 'none',
                  stroke: 'url(#logoGradCyanPurple)',
                  strokeWidth: '1.5',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '90px',
                  fontWeight: 900,
                  letterSpacing: '-3px',
                }}>
                SIGNAL
              </text>
            </svg>
          </div>

          {/* 코너 마커 (4개) */}
          <div className="absolute top-0 left-0" style={{ width: '20px', height: '20px', borderTop: `1px solid ${S.cyan}88`, borderLeft: `1px solid ${S.cyan}88` }} />
          <div className="absolute top-0 right-0" style={{ width: '20px', height: '20px', borderTop: `1px solid ${S.purple}88`, borderRight: `1px solid ${S.purple}88` }} />
          <div className="absolute bottom-0 left-0" style={{ width: '20px', height: '20px', borderBottom: `1px solid ${S.purple}88`, borderLeft: `1px solid ${S.purple}88` }} />
          <div className="absolute bottom-0 right-0" style={{ width: '20px', height: '20px', borderBottom: `1px solid ${S.cyan}88`, borderRight: `1px solid ${S.cyan}88` }} />

          {/* 하단 데이터 라인 */}
          <div className="mt-2 mx-auto"
            style={{
              width: '70%',
              height: '1px',
              background: `linear-gradient(90deg, transparent 0%, ${S.cyan}88 50%, transparent 100%)`,
            }} />
          <p className="text-center text-[10px] font-mono tracking-[6px] font-bold mt-3"
            style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}55` }}>
            ─── CONNECTAI · LIVE DATA STREAM ───
          </p>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-12 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: S.cyan, boxShadow: `0 0 8px ${S.cyan}` }} />
            <div className="w-1 h-1 rounded-full" style={{ background: S.blue, boxShadow: `0 0 8px ${S.blue}` }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: S.purple, boxShadow: `0 0 8px ${S.purple}` }} />
          </div>
          <p className="text-[11px] text-gray-500 font-mono font-bold">
            © 2026 SIGNAL — ConnectAI · 실시간 자동 갱신
          </p>
        </div>
      </div>

      {/* 카드 완료 toast */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-md px-4">
        {completionToasts.map(toast => (
          <div key={toast.id}
            className="rounded-2xl px-5 py-4 flex items-center gap-4 backdrop-blur-md toast-slide-big"
            style={{
              background: `linear-gradient(135deg, ${S.cyan}30 0%, ${S.blue}20 100%)`,
              border: `2px solid ${S.cyan}88`,
              boxShadow: `0 12px 48px ${S.cyan}66`,
            }}>
            <span className="text-4xl flex-shrink-0">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-200 font-mono mb-0.5 font-bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                CARD COMPLETED
              </p>
              <p className="text-base md:text-lg font-black text-white"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
                <span style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}88` }}>{toast.teamName}</span>이 카드 {toast.cardId} 완료!
              </p>
              <p className="text-[12px] text-gray-200 mt-0.5 font-bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                {toast.cardName}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        /* 시머 진행률 바 */
        @keyframes shimmerRank {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* LIVE 펄스 */
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .live-pulse {
          animation: livePulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 12px #EF4444;
        }

        /* ⭐ 시상대 슬롯 진입 애니메이션 */
        .podium-slot {
          animation: podiumEntry 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }
        .podium-slot-1 { animation-delay: 0.2s; }
        .podium-slot-2 { animation-delay: 0.1s; }
        .podium-slot-3 { animation-delay: 0.3s; }

        @keyframes podiumEntry {
          0% { opacity: 0; transform: translateY(30px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ⭐ 카드 완료 순위 플래시 */
        @keyframes rankFlash {
          0% { transform: scale(1); }
          30% { transform: scale(1.04); filter: brightness(1.2); }
          100% { transform: scale(1); filter: brightness(1); }
        }
        .rank-flash {
          animation: rankFlash 1.5s ease-out;
        }

        /* 화면 플래시 */
        @keyframes screenFlashRanking {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Toast 슬라이드 */
        @keyframes toastSlideBig {
          0% { opacity: 0; transform: translateY(-30px) scale(0.9); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          85% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-15px) scale(0.95); }
        }
        .toast-slide-big {
          animation: toastSlideBig 5s ease-out forwards;
        }

        /* 떠다니는 카드 */
        @keyframes floatCardBg {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(var(--rotate, 0deg));
            opacity: 0.3;
          }
          25% { transform: translateY(-30px) translateX(15px); opacity: 0.5; }
          50% { transform: translateY(-15px) translateX(-20px); opacity: 0.4; }
          75% { transform: translateY(-25px) translateX(10px); opacity: 0.5; }
        }

        /* ⭐⭐⭐ NEW: 양옆 큰 SIGNAL 카드 (천천히 움직임) ⭐⭐⭐ */
        @keyframes sideCardFloat {
          0%, 100% {
            translate: 0 0;
          }
          25% {
            translate: -8px -12px;
          }
          50% {
            translate: 4px -6px;
          }
          75% {
            translate: -4px -10px;
          }
        }

        /* 빛 입자 (별) */
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(15px); opacity: 1; }
          50% { transform: translateY(-50px) translateX(-10px); opacity: 0.6; }
          75% { transform: translateY(-30px) translateX(20px); opacity: 1; }
        }

        /* ⭐⭐⭐ NEW: 사이드 빛 줄기 (가로지르는 신호) ⭐⭐⭐ */
        .rank-beam {
          opacity: 0;
        }
        .rank-beam-cyan {
          background: linear-gradient(90deg, transparent, #06B6D4, transparent);
          box-shadow: 0 0 12px #06B6D4, 0 0 24px rgba(6,182,212,0.4);
          animation: rankBeamRight 6s linear infinite;
        }
        .rank-beam-purple {
          background: linear-gradient(90deg, transparent, #8B5CF6, transparent);
          box-shadow: 0 0 12px #8B5CF6, 0 0 24px rgba(139,92,246,0.4);
          animation: rankBeamLeft 7s linear infinite 1s;
        }
        .rank-beam-green {
          background: linear-gradient(90deg, transparent, #E7FE55, transparent);
          box-shadow: 0 0 12px #E7FE55, 0 0 24px rgba(231,254,85,0.4);
          animation: rankBeamRight 5s linear infinite 2s;
        }
        @keyframes rankBeamRight {
          0% { transform: translateX(-200px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        @keyframes rankBeamLeft {
          0% { transform: translateX(200px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        /* 오로라 카드 */
        .aurora-card {
          background: rgba(10, 10, 10, 0.7);
          border: 1px solid rgba(6, 182, 212, 0.3);
        }
        .aurora-layer {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.6;
          filter: blur(40px);
          mix-blend-mode: screen;
        }
        .aurora-1 {
          background: radial-gradient(ellipse at 20% 50%, ${S.cyan} 0%, transparent 50%);
          animation: aurora1 8s ease-in-out infinite;
        }
        .aurora-2 {
          background: radial-gradient(ellipse at 80% 30%, ${S.blue} 0%, transparent 50%);
          animation: aurora2 10s ease-in-out infinite;
        }
        .aurora-3 {
          background: radial-gradient(ellipse at 50% 70%, ${S.purple} 0%, transparent 50%);
          animation: aurora3 12s ease-in-out infinite;
        }
        @keyframes aurora1 {
          0%, 100% { transform: translate(0%, 0%) scale(1); opacity: 0.5; }
          33% { transform: translate(30%, -20%) scale(1.2); opacity: 0.7; }
          66% { transform: translate(-20%, 30%) scale(0.9); opacity: 0.6; }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0%, 0%) scale(1); opacity: 0.4; }
          50% { transform: translate(-40%, 20%) scale(1.3); opacity: 0.6; }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0%, 0%) scale(1); opacity: 0.3; }
          25% { transform: translate(20%, -30%) scale(1.1); opacity: 0.5; }
          75% { transform: translate(-30%, 10%) scale(0.95); opacity: 0.4; }
        }

        /* ⭐⭐⭐ 폭죽 (1등 변경 시) ⭐⭐⭐ */
        @keyframes fireworkBurst {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(2);
            opacity: 0;
          }
        }
        .firework-particle {
          animation: fireworkBurst 2.5s ease-out forwards;
        }

        @keyframes fireworkBanner {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          25% { transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        }
        .firework-banner {
          animation: fireworkBanner 3.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ⭐⭐⭐ NEW: 시상대 카드 컴포넌트 ⭐⭐⭐
function PodiumCard({
  team,
  rank,
  isExpanded,
  onToggle,
}: {
  team: Team;
  rank: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const completed = team.completed_count || 0;
  const progress = (completed / 16) * 100;

  const medals = [
    { icon: '👑', color: S.gold, glow: S.gold, height: 'auto', size: 'lg', label: '1위' },
    { icon: '🥈', color: S.silver, glow: S.silver, height: 'auto', size: 'md', label: '2위' },
    { icon: '🥉', color: S.bronze, glow: S.bronze, height: 'auto', size: 'md', label: '3위' },
  ];

  const m = medals[rank];
  const isFirst = rank === 0;
  const isSecond = rank === 1;
  const isThird = rank === 2;

  return (
    <button
      onClick={onToggle}
      className={`relative rounded-2xl p-4 md:p-5 transition-all w-full text-left cursor-pointer ${isFirst ? 'podium-1st' : ''}`}
      style={{
        background: isFirst
          ? `linear-gradient(135deg, ${m.color}25 0%, ${S.cyan}15 100%)`
          : `linear-gradient(135deg, ${m.color}15 0%, rgba(255,255,255,0.04) 100%)`,
        border: `${isFirst ? '3px' : '2px'} solid ${m.color}`,
        boxShadow: isFirst
          ? `0 0 40px ${m.color}88, 0 12px 50px ${m.color}55, inset 0 0 40px ${m.color}15`
          : `0 0 24px ${m.color}55, 0 6px 24px ${m.color}33`,
        transform: isFirst ? 'scale(1)' : 'scale(0.92)',
        minHeight: isFirst ? '280px' : '220px',
      }}>

      {/* 1등 코너 장식 */}
      {isFirst && (
        <>
          <div className="absolute top-2 left-2 w-10 h-10 pointer-events-none"
            style={{ borderTop: `2.5px solid ${m.color}`, borderLeft: `2.5px solid ${m.color}`, borderTopLeftRadius: '10px' }} />
          <div className="absolute top-2 right-2 w-10 h-10 pointer-events-none"
            style={{ borderTop: `2.5px solid ${m.color}`, borderRight: `2.5px solid ${m.color}`, borderTopRightRadius: '10px' }} />
          <div className="absolute bottom-2 left-2 w-10 h-10 pointer-events-none"
            style={{ borderBottom: `2.5px solid ${m.color}`, borderLeft: `2.5px solid ${m.color}`, borderBottomLeftRadius: '10px' }} />
          <div className="absolute bottom-2 right-2 w-10 h-10 pointer-events-none"
            style={{ borderBottom: `2.5px solid ${m.color}`, borderRight: `2.5px solid ${m.color}`, borderBottomRightRadius: '10px' }} />
        </>
      )}

      {/* 순위 라벨 */}
      <div className="text-center mb-2">
        <p className="text-[10px] font-mono tracking-widest font-bold"
          style={{ color: m.color, textShadow: `0 0 8px ${m.color}AA` }}>
          {m.label}
        </p>
      </div>

      {/* 메달 아이콘 */}
      <div className="flex justify-center mb-3">
        <div className={`rounded-full flex items-center justify-center font-black ${isFirst ? 'medal-pulse-big' : 'medal-pulse-small'}`}
          style={{
            width: isFirst ? '90px' : '70px',
            height: isFirst ? '90px' : '70px',
            fontSize: isFirst ? '46px' : '36px',
            background: isFirst
              ? `radial-gradient(circle, ${m.color} 0%, ${m.color}AA 100%)`
              : `radial-gradient(circle, ${m.color}33 0%, ${m.color}11 100%)`,
            boxShadow: isFirst
              ? `0 0 40px ${m.color}AA, 0 8px 24px ${m.color}77`
              : `0 0 20px ${m.color}66, 0 4px 16px ${m.color}44`,
            border: isFirst ? 'none' : `2px solid ${m.color}66`,
          }}>
          {m.icon}
        </div>
      </div>

      {/* 팀 이름 */}
      <h3 className="text-center font-black text-white mb-1"
        style={{
          fontSize: isFirst ? '28px' : '22px',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)',
        }}>
        {team.name}
      </h3>

      {/* 아이템 (있을 때만) */}
      {team.item && (
        <p className="text-center text-[11px] mb-3 font-bold truncate px-2"
          style={{
            color: S.cyan,
            background: `${S.cyan}10`,
            border: `1px solid ${S.cyan}33`,
            borderRadius: '999px',
            padding: '3px 10px',
            display: 'inline-block',
            margin: '0 auto 12px',
            maxWidth: '100%',
          }}>
          {team.item}
        </p>
      )}

      {/* 점수 (가장 큰 글씨) */}
      <div className="text-center mb-3">
        <p className="font-black font-mono leading-none"
          style={{
            fontSize: isFirst ? '52px' : '40px',
            color: isFirst ? m.color : completed > 0 ? S.cyan : '#888',
            textShadow: completed > 0
              ? `0 0 16px ${isFirst ? m.color : S.cyan}AA, 0 2px 4px rgba(0,0,0,0.8)`
              : '0 2px 4px rgba(0,0,0,0.8)',
          }}>
          {completed}<span className="text-lg text-gray-400">/16</span>
        </p>
        <p className="text-[11px] text-gray-300 font-mono font-bold mt-1"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {Math.round(progress)}% 완료
        </p>
      </div>

      {/* 진행률 바 */}
      <div className="h-2 rounded-full overflow-hidden relative"
        style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
          style={{
            width: `${progress}%`,
            background: isFirst
              ? `linear-gradient(90deg, ${m.color} 0%, ${S.cyan} 100%)`
              : completed > 0
                ? `linear-gradient(90deg, ${m.color} 0%, ${S.cyan} 100%)`
                : 'transparent',
            boxShadow: completed > 0 ? `0 0 12px ${m.color}AA` : 'none',
          }}>
          {completed > 0 && (
            <div className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                animation: 'shimmerRank 2s ease-in-out infinite',
              }} />
          )}
        </div>
      </div>

      {/* 팀원 수 */}
      {team.member_count !== undefined && team.member_count > 0 && (
        <p className="text-center text-[11px] text-gray-300 font-mono mt-2 font-bold"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          👥 {team.member_count}명
        </p>
      )}

      {/* 1등 메시지 */}
      {isFirst && completed > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: `${m.color}40` }}>
          <p className="text-[12px] md:text-[13px] font-black text-center"
            style={{
              color: m.color,
              textShadow: `0 0 8px ${m.color}66, 0 1px 2px rgba(0,0,0,0.8)`,
            }}>
            ⭐ 현재 1위 {completed === 16 ? '· 🎉 완주!' : `· ${16 - completed}장 남음`}
          </p>
        </div>
      )}

      {/* ⭐⭐⭐ NEW: 카드 진행 격자 (펼침) ⭐⭐⭐ */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: `${m.color}33` }}>
          <CardProgressGrid team={team} />
        </div>
      )}

      {/* 펼침 인디케이터 */}
      <div className="text-center mt-2 text-[10px] font-mono"
        style={{ color: `${m.color}AA` }}>
        {isExpanded ? '▲ 접기' : '▼ 카드 진행 보기'}
      </div>

      <style jsx>{`
        @keyframes medalPulseBig {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.08); filter: brightness(1.3); }
        }
        .medal-pulse-big {
          animation: medalPulseBig 1.8s ease-in-out infinite;
        }

        @keyframes medalPulseSmall {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.04); filter: brightness(1.15); }
        }
        .medal-pulse-small {
          animation: medalPulseSmall 2.5s ease-in-out infinite;
        }

        @keyframes podium1stGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(255,215,0,0.5), 0 12px 50px rgba(255,215,0,0.3); }
          50% { box-shadow: 0 0 60px rgba(255,215,0,0.8), 0 12px 60px rgba(255,215,0,0.5); }
        }
        .podium-1st {
          animation: podium1stGlow 3s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
}

// ⭐⭐⭐ NEW: 카드 진행 격자 컴포넌트 (재사용 가능) ⭐⭐⭐
const CARD_NAMES_FULL: Record<string, string> = {
  '01': '시장 개요', '02': '시장 분석', '03': '세분화', '04': '경쟁 분석',
  '05': '시장 기회', '06': '규제', '07': '고객 여정', '08': '비즈니스 모델',
  '09': '가격 전략', '10': '제품 전략', '11': '유통 채널', '12': '마케팅',
  '13': 'GTM 실행', '14': '리스크', '15': '성장 전략', '16': 'TBT·인증',
};

function CardProgressGrid({ team, compact = false }: { team: Team; compact?: boolean }) {
  const completedIds = team.completed_card_ids || [];
  const completedSet = new Set(completedIds);

  // 완료한 카드 중 가장 마지막 = 진행 중 카드 다음 번호
  // 예: ['01', '02', '03'] 완료 → '04'가 진행 중
  let inProgressId: string | null = null;
  if (completedIds.length > 0 && completedIds.length < 16) {
    const lastCompletedNum = parseInt(completedIds[completedIds.length - 1], 10);
    const nextNum = lastCompletedNum + 1;
    if (nextNum <= 16) {
      inProgressId = String(nextNum).padStart(2, '0');
    }
  } else if (completedIds.length === 0) {
    // 아직 시작 안 함 → 01번이 진행 중
    inProgressId = '01';
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <p className="text-[10px] font-mono tracking-widest font-bold mb-1.5"
        style={{ color: S.cyan, textShadow: `0 0 6px ${S.cyan}66` }}>
        🃏 CARD PROGRESS
      </p>

      {/* 4x4 격자 */}
      <div className="grid grid-cols-8 gap-1 md:gap-1.5">
        {Array.from({ length: 16 }, (_, i) => {
          const cardId = String(i + 1).padStart(2, '0');
          const isCompleted = completedSet.has(cardId);
          const isInProgress = cardId === inProgressId;
          const isWaiting = !isCompleted && !isInProgress;

          let bg = 'rgba(255,255,255,0.05)';
          let color = '#555';
          let border = '1px solid rgba(255,255,255,0.08)';
          let boxShadow = 'none';
          let className = '';

          if (isCompleted) {
            bg = S.cyan;
            color = S.navy;
            border = `1px solid ${S.cyan}`;
            boxShadow = `0 0 8px ${S.cyan}66`;
          } else if (isInProgress) {
            bg = `${S.gold}25`;
            color = S.gold;
            border = `1.5px solid ${S.gold}`;
            boxShadow = `0 0 10px ${S.gold}88`;
            className = 'card-in-progress-pulse';
          }

          return (
            <div key={cardId}
              className={`rounded relative ${className}`}
              style={{
                aspectRatio: '1',
                background: bg,
                color: color,
                border: border,
                boxShadow: boxShadow,
                fontSize: compact ? '9px' : '10px',
                fontWeight: 700,
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}>
              {isCompleted ? (
                <span style={{ fontSize: '12px' }}>✓</span>
              ) : (
                <span>{cardId}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* 범례 + 진행 중 카드 안내 */}
      <div className="flex items-center justify-between gap-2 flex-wrap mt-2">
        <div className="flex items-center gap-2 text-[9px] font-mono" style={{ color: '#888' }}>
          <span className="flex items-center gap-1">
            <span style={{ width: '8px', height: '8px', background: S.cyan, borderRadius: '2px', display: 'inline-block' }} />
            완료
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: '8px', height: '8px', background: `${S.gold}66`, border: `1px solid ${S.gold}`, borderRadius: '2px', display: 'inline-block' }} />
            진행 중
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: '8px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', display: 'inline-block' }} />
            대기
          </span>
        </div>
      </div>

      {/* 현재 진행 카드 이름 */}
      {inProgressId && CARD_NAMES_FULL[inProgressId] && (
        <div className="rounded-lg px-3 py-2 mt-2"
          style={{
            background: `${S.gold}12`,
            border: `1px solid ${S.gold}44`,
          }}>
          <p className="text-[11px] font-bold" style={{ color: S.gold }}>
            📍 <span className="font-mono">{inProgressId}</span>. {CARD_NAMES_FULL[inProgressId]} 진행 중
          </p>
        </div>
      )}

      {/* 완주 시 */}
      {completedIds.length === 16 && (
        <div className="rounded-lg px-3 py-2 mt-2 text-center"
          style={{
            background: `${S.gold}20`,
            border: `1.5px solid ${S.gold}`,
          }}>
          <p className="text-[12px] font-black" style={{ color: S.gold }}>
            🎉 모든 카드 완주!
          </p>
        </div>
      )}

      <style jsx>{`
        @keyframes cardInProgressPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .card-in-progress-pulse {
          animation: cardInProgressPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
