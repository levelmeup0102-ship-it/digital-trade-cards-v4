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
  // ⭐ 사이안/블루 오로라 색상
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

// ⭐ 떠다니는 카드 (배경 장식용)
const FLOATING_CARDS = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  left: [10, 85, 25, 75, 5, 90][i],
  top: [20, 30, 65, 75, 50, 15][i],
  size: [40, 50, 35, 45, 50, 38][i],
  duration: [16, 18, 14, 20, 17, 15][i],
  delay: [0, 2, 1, 3, 0.5, 2.5][i],
  rotate: [-15, 12, -8, 20, -22, 10][i],
}));

// ⭐ 빛 입자 (별처럼 반짝)
const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 1 + Math.random() * 2,
  duration: 3 + Math.random() * 4,
  delay: Math.random() * 5,
  color: i % 3 === 0 ? S.cyan : i % 3 === 1 ? S.blue : S.purple,
}));

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

  const sortedTeams = [...teams].sort((a, b) => (b.completed_count || 0) - (a.completed_count || 0));
  const totalCompleted = sortedTeams.reduce((sum, t) => sum + (t.completed_count || 0), 0);
  const totalCards = sortedTeams.length * 16;
  const overallProgress = totalCards > 0 ? Math.round((totalCompleted / totalCards) * 100) : 0;

  const getMedalInfo = (rank: number) => {
    if (rank === 0) return { icon: '👑', color: S.gold, label: '1위', glow: S.gold };
    if (rank === 1) return { icon: '🥈', color: S.silver, label: '2위', glow: S.silver };
    if (rank === 2) return { icon: '🥉', color: S.bronze, label: '3위', glow: S.bronze };
    return { icon: `${rank + 1}`, color: '#666', label: `${rank + 1}위`, glow: '#666' };
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: S.bg }}>

      {/* ⭐ 배경 메시 그라디언트 (사이안 톤) ⭐ */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 15% 20%, ${S.cyan}15 0%, transparent 40%),
            radial-gradient(circle at 85% 75%, ${S.blue}12 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, ${S.purple}10 0%, transparent 60%)
          `,
        }} />

      {/* ⭐ 격자 패턴 배경 ⭐ */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(${S.cyan} 1px, transparent 1px),
            linear-gradient(90deg, ${S.cyan} 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />

      {/* ⭐ 떠다니는 카드 (배경 장식) ⭐ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {FLOATING_CARDS.map(card => (
          <div
            key={card.id}
            className="absolute rounded-lg"
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

      {/* ⭐ 빛 입자 (별) ⭐ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
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

      {/* ⭐ 상단 빛 줄기 (스포트라이트) ⭐ */}
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

      <div className="relative z-10 px-6 py-6 max-w-7xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push(`/teacher/class/${classId}`)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-bold">
            <span>←</span>
            <span>수업 상세로</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="text-[15px] font-mono text-white font-bold">{currentTime}</div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
              <div className="w-2.5 h-2.5 rounded-full live-pulse" style={{ background: '#EF4444' }} />
              <span className="text-[12px] font-bold font-mono" style={{ color: '#EF4444' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ⭐ 타이틀 — 양쪽 장식 라인 ⭐ */}
        <div className="text-center mb-8 relative">
          {/* 배경 장식 원 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: '500px',
              height: '500px',
              background: `radial-gradient(circle, ${S.cyan}08 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }} />

          <div className="flex items-center justify-center gap-4 mb-3">
            {/* 좌측 장식 라인 */}
            <div className="hidden md:block flex-1 max-w-[200px] h-[1px]"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${S.cyan}AA 100%)` }} />
            <p className="text-[12px] tracking-[8px] font-mono font-bold relative"
              style={{
                color: S.cyan,
                textShadow: `0 0 12px ${S.cyan}AA`,
              }}>
              REAL-TIME LEADERBOARD
            </p>
            {/* 우측 장식 라인 */}
            <div className="hidden md:block flex-1 max-w-[200px] h-[1px]"
              style={{ background: `linear-gradient(90deg, ${S.cyan}AA 0%, transparent 100%)` }} />
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight relative">
            🏆 SIGNAL <span style={{
              color: S.cyan,
              textShadow: `0 0 30px ${S.cyan}88, 0 0 60px ${S.cyan}55`,
            }}>랭킹</span>
          </h1>
          <p className="text-base text-gray-300 font-bold relative">{cls?.name}</p>

          {/* 하단 장식 점 */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="w-1 h-1 rounded-full" style={{ background: S.cyan, boxShadow: `0 0 8px ${S.cyan}` }} />
            <div className="w-2 h-2 rounded-full" style={{ background: S.blue, boxShadow: `0 0 8px ${S.blue}` }} />
            <div className="w-1 h-1 rounded-full" style={{ background: S.purple, boxShadow: `0 0 8px ${S.purple}` }} />
          </div>
        </div>

        {/* ⭐⭐⭐ 전체 진행률 카드 — 사이안/블루 오로라 ⭐⭐⭐ */}
        <div className="aurora-card rounded-2xl p-6 mb-8 relative overflow-hidden">
          {/* 오로라 레이어 */}
          <div className="aurora-layer aurora-1" />
          <div className="aurora-layer aurora-2" />
          <div className="aurora-layer aurora-3" />

          {/* 좌상단 코너 장식 */}
          <div className="absolute top-3 left-3 w-12 h-12 pointer-events-none"
            style={{
              borderTop: `2px solid ${S.cyan}AA`,
              borderLeft: `2px solid ${S.cyan}AA`,
              borderTopLeftRadius: '12px',
            }} />
          {/* 우하단 코너 장식 */}
          <div className="absolute bottom-3 right-3 w-12 h-12 pointer-events-none"
            style={{
              borderBottom: `2px solid ${S.cyan}AA`,
              borderRight: `2px solid ${S.cyan}AA`,
              borderBottomRightRadius: '12px',
            }} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] font-mono tracking-widest mb-1 font-bold flex items-center gap-2"
                  style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ background: S.cyan, boxShadow: `0 0 8px ${S.cyan}` }} />
                  OVERALL PROGRESS
                </p>
                <p className="text-[18px] font-black text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  전체 진행 상황
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black font-mono"
                  style={{
                    color: S.cyan,
                    textShadow: `0 0 20px ${S.cyan}AA, 0 2px 4px rgba(0,0,0,0.8)`,
                  }}>
                  {overallProgress}<span className="text-xl text-gray-300">%</span>
                </p>
                <p className="text-[12px] text-gray-200 font-mono font-bold"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {totalCompleted} / {totalCards} 카드
                </p>
              </div>
            </div>
            {/* 큰 진행률 바 */}
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
            <p className="text-[12px] text-gray-200 mt-2 font-mono font-bold flex items-center gap-1.5"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              <span className="text-base">🎮</span> 참여 팀 {sortedTeams.length}개
            </p>
          </div>
        </div>

        {/* ⭐ 섹션 헤더 ⭐ */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, transparent 0%, ${S.cyan}66 100%)` }} />
          <p className="text-[12px] font-mono tracking-widest font-bold"
            style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}66` }}>
            ⚡ TEAM RANKINGS
          </p>
          <div className="h-[1px] flex-1" style={{ background: `linear-gradient(90deg, ${S.cyan}66 0%, transparent 100%)` }} />
        </div>

        {/* 랭킹 목록 */}
        {sortedTeams.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🎴</p>
            <p className="text-gray-300 text-lg font-bold">아직 팀이 없어요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTeams.map((team, rank) => {
              const medal = getMedalInfo(rank);
              const completed = team.completed_count || 0;
              const progress = (completed / 16) * 100;
              const isFirst = rank === 0;
              const isSecond = rank === 1;
              const isThird = rank === 2;
              const isMedalist = rank < 3;
              const isUpdated = recentlyUpdatedTeam === team.id;

              let borderColor = 'rgba(255,255,255,0.08)';
              let borderWidth = '1px';
              let boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              let bgGradient = 'rgba(255,255,255,0.04)';

              if (isFirst) {
                borderColor = S.gold;
                borderWidth = '3px';
                boxShadow = `0 0 30px ${S.gold}66, 0 8px 40px ${S.gold}40, inset 0 0 30px ${S.gold}15`;
                bgGradient = `linear-gradient(135deg, ${S.gold}20 0%, ${S.cyan}10 100%)`;
              } else if (isSecond) {
                borderColor = S.silver;
                borderWidth = '2.5px';
                boxShadow = `0 0 24px ${S.silver}55, 0 6px 24px ${S.silver}33`;
                bgGradient = `linear-gradient(135deg, ${S.silver}15 0%, rgba(255,255,255,0.04) 100%)`;
              } else if (isThird) {
                borderColor = S.bronze;
                borderWidth = '2.5px';
                boxShadow = `0 0 24px ${S.bronze}55, 0 6px 24px ${S.bronze}33`;
                bgGradient = `linear-gradient(135deg, ${S.bronze}18 0%, rgba(255,255,255,0.04) 100%)`;
              }

              return (
                <div key={team.id}
                  className={`rounded-2xl p-5 transition-all duration-500 relative ${isUpdated ? 'rank-flash' : ''} ${isMedalist ? 'medal-card' : ''}`}
                  style={{
                    background: bgGradient,
                    border: `${borderWidth} solid ${borderColor}`,
                    boxShadow: boxShadow,
                    transform: isFirst ? 'scale(1.02)' : 'scale(1)',
                  }}>

                  {/* 1등 카드에 코너 장식 */}
                  {isFirst && (
                    <>
                      <div className="absolute top-2 left-2 w-8 h-8 pointer-events-none"
                        style={{
                          borderTop: `2px solid ${S.gold}`,
                          borderLeft: `2px solid ${S.gold}`,
                          borderTopLeftRadius: '8px',
                        }} />
                      <div className="absolute top-2 right-2 w-8 h-8 pointer-events-none"
                        style={{
                          borderTop: `2px solid ${S.gold}`,
                          borderRight: `2px solid ${S.gold}`,
                          borderTopRightRadius: '8px',
                        }} />
                      <div className="absolute bottom-2 left-2 w-8 h-8 pointer-events-none"
                        style={{
                          borderBottom: `2px solid ${S.gold}`,
                          borderLeft: `2px solid ${S.gold}`,
                          borderBottomLeftRadius: '8px',
                        }} />
                      <div className="absolute bottom-2 right-2 w-8 h-8 pointer-events-none"
                        style={{
                          borderBottom: `2px solid ${S.gold}`,
                          borderRight: `2px solid ${S.gold}`,
                          borderBottomRightRadius: '8px',
                        }} />
                    </>
                  )}

                  <div className="flex items-center gap-5 relative">
                    {/* 메달 */}
                    <div className="flex-shrink-0">
                      <div className={`rounded-2xl flex items-center justify-center font-black ${isFirst ? 'medal-pulse' : ''}`}
                        style={{
                          width: isFirst ? '90px' : '70px',
                          height: isFirst ? '90px' : '70px',
                          fontSize: isFirst ? '40px' : '28px',
                          background: isFirst
                            ? `radial-gradient(circle, ${S.gold} 0%, ${S.gold}AA 100%)`
                            : isSecond
                              ? `radial-gradient(circle, ${S.silver}33 0%, ${S.silver}11 100%)`
                              : isThird
                                ? `radial-gradient(circle, ${S.bronze}33 0%, ${S.bronze}11 100%)`
                                : 'rgba(255,255,255,0.06)',
                          color: isFirst ? '#000' : isMedalist ? medal.color : '#888',
                          boxShadow: isFirst
                            ? `0 0 30px ${S.gold}AA, 0 8px 20px ${S.gold}66`
                            : isMedalist
                              ? `0 0 20px ${medal.glow}66, 0 4px 16px ${medal.color}33`
                              : 'none',
                          border: isMedalist && !isFirst ? `2px solid ${medal.color}66` : 'none',
                        }}>
                        {medal.icon}
                      </div>
                    </div>

                    {/* 팀 정보 + 진행률 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-black text-white"
                            style={{
                              fontSize: isFirst ? '32px' : '24px',
                              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                            }}>
                            {team.name}
                          </h3>
                          {team.item && (
                            <span className="text-[14px] px-3 py-1 rounded-full font-bold"
                              style={{
                                color: S.cyan,
                                background: `${S.cyan}15`,
                                border: `1px solid ${S.cyan}40`,
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                              }}>
                              {team.item}
                            </span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[10px] font-mono text-gray-300 mb-1 font-bold"
                            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                            COMPLETED
                          </p>
                          <p className="font-black font-mono leading-none"
                            style={{
                              fontSize: isFirst ? '36px' : '28px',
                              color: isFirst ? S.gold : completed > 0 ? S.cyan : '#888',
                              textShadow: completed > 0
                                ? `0 0 12px ${isFirst ? S.gold : S.cyan}AA, 0 2px 4px rgba(0,0,0,0.8)`
                                : '0 2px 4px rgba(0,0,0,0.8)',
                            }}>
                            {completed}<span className="text-lg text-gray-400">/16</span>
                          </p>
                        </div>
                      </div>

                      {/* 진행률 바 */}
                      <div className="h-3 rounded-full overflow-hidden relative mb-2"
                        style={{ background: 'rgba(0,0,0,0.4)' }}>
                        <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                          style={{
                            width: `${progress}%`,
                            background: isFirst
                              ? `linear-gradient(90deg, ${S.gold} 0%, ${S.cyan} 100%)`
                              : completed > 0
                                ? `linear-gradient(90deg, ${S.cyan} 0%, ${S.blue} 100%)`
                                : 'transparent',
                            boxShadow: completed > 0 ? `0 0 16px ${isFirst ? S.gold : S.cyan}AA` : 'none',
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

                      {/* 진행률 % + 팀원 수 */}
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] text-gray-200 font-mono font-bold"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                          {team.member_count ? `👥 ${team.member_count}명` : '-'}
                        </p>
                        <p className="font-black font-mono"
                          style={{
                            fontSize: isFirst ? '20px' : '16px',
                            color: isFirst ? S.gold : isMedalist ? medal.color : '#aaa',
                            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                          }}>
                          {Math.round(progress)}%
                        </p>
                      </div>

                      {/* 1등 메시지 */}
                      {isFirst && completed > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: `${S.gold}40` }}>
                          <p className="text-[13px] font-black text-center"
                            style={{
                              color: S.gold,
                              textShadow: `0 0 8px ${S.gold}66, 0 1px 2px rgba(0,0,0,0.8)`,
                            }}>
                            ⭐ 현재 1위 · {completed === 16 ? '🎉 완주!' : `${16 - completed}장 남음`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center mt-12 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: S.cyan, boxShadow: `0 0 8px ${S.cyan}` }} />
            <div className="w-1 h-1 rounded-full" style={{ background: S.blue, boxShadow: `0 0 8px ${S.blue}` }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: S.purple, boxShadow: `0 0 8px ${S.purple}` }} />
          </div>
          <p className="text-[11px] text-gray-500 font-mono font-bold">
            © 2026 SIGNAL — ConnectAI · 자동 새로고침 활성화됨
          </p>
        </div>
      </div>

      {/* 카드 완료 toast */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none">
        {completionToasts.map(toast => (
          <div key={toast.id}
            className="rounded-2xl px-6 py-4 flex items-center gap-4 backdrop-blur-md toast-slide-big"
            style={{
              background: `linear-gradient(135deg, ${S.cyan}30 0%, ${S.blue}20 100%)`,
              border: `2px solid ${S.cyan}88`,
              boxShadow: `0 12px 48px ${S.cyan}66`,
              minWidth: '420px',
            }}>
            <span className="text-4xl">🎉</span>
            <div className="flex-1">
              <p className="text-[11px] text-gray-200 font-mono mb-0.5 font-bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                CARD COMPLETED
              </p>
              <p className="text-lg font-black text-white"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
                <span style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}88` }}>{toast.teamName}</span>이 카드 {toast.cardId}을(를) 완료!
              </p>
              <p className="text-[13px] text-gray-200 mt-0.5 font-bold"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                {toast.cardName}
              </p>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes shimmerRank {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .live-pulse {
          animation: livePulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 12px #EF4444;
        }

        @keyframes medalPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.2); }
        }
        .medal-pulse {
          animation: medalPulse 2s ease-in-out infinite;
        }

        @keyframes rankFlash {
          0% { transform: scale(1); }
          30% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .rank-flash {
          animation: rankFlash 2s ease-out;
        }

        @keyframes screenFlashRanking {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes toastSlideBig {
          0% { opacity: 0; transform: translateY(-30px) scale(0.9); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          85% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-15px) scale(0.95); }
        }
        .toast-slide-big {
          animation: toastSlideBig 5s ease-out forwards;
        }

        @keyframes medalCardGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.05); }
        }
        .medal-card {
          animation: medalCardGlow 3s ease-in-out infinite;
        }

        /* 떠다니는 카드 애니메이션 */
        @keyframes floatCardBg {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(var(--rotate, 0deg));
            opacity: 0.3;
          }
          25% {
            transform: translateY(-30px) translateX(15px) rotate(calc(var(--rotate, 0deg) + 8deg));
            opacity: 0.5;
          }
          50% {
            transform: translateY(-15px) translateX(-20px) rotate(calc(var(--rotate, 0deg) - 5deg));
            opacity: 0.4;
          }
          75% {
            transform: translateY(-25px) translateX(10px) rotate(calc(var(--rotate, 0deg) + 5deg));
            opacity: 0.5;
          }
        }

        /* 빛 입자 (별) 애니메이션 */
        @keyframes particleFloat {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-30px) translateX(15px);
            opacity: 1;
          }
          50% {
            transform: translateY(-50px) translateX(-10px);
            opacity: 0.6;
          }
          75% {
            transform: translateY(-30px) translateX(20px);
            opacity: 1;
          }
        }

        /* ⭐⭐⭐ 사이안/블루 오로라 ⭐⭐⭐ */
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
      `}</style>
    </div>
  );
}
