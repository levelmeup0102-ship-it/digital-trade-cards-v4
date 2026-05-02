'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getCurrentTeacher, getClass,
  getTeamRankings, subscribeToClassProgress,
} from '@/lib/teacher';
import type { Teacher, Class, Team } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A', gold: '#FFD700' };

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

  // 현재 시간 업데이트
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

  // Realtime 구독
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

        // toast 추가
        const id = ++toastIdRef.current;
        const cardName = CARD_NAMES[event.cardId] || `카드 ${event.cardId}`;
        setCompletionToasts(prev => [
          ...prev,
          { id, teamName: team.name, cardId: event.cardId, cardName },
        ]);
        setTimeout(() => {
          setCompletionToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);

        // 화면 전체 플래시
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 800);

        // 깜빡임 효과
        setRecentlyUpdatedTeam(event.teamId);
        setTimeout(() => setRecentlyUpdatedTeam(null), 2000);

        // 랭킹 다시 가져오기
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

  const getMedal = (rank: number) => {
    if (rank === 0) return { icon: '👑', color: S.gold };
    if (rank === 1) return { icon: '🥈', color: '#C0C0C0' };
    if (rank === 2) return { icon: '🥉', color: '#CD7F32' };
    return { icon: `${rank + 1}`, color: '#666' };
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: S.bg }}>
      {/* 메시 그라디언트 배경 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 20%, ${S.green}15 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, ${S.aqua}10 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, ${S.gold}08 0%, transparent 60%)
          `,
        }} />

      {/* 화면 전체 플래시 (카드 완료 시) */}
      {screenFlash && (
        <div className="fixed inset-0 pointer-events-none z-[100]"
          style={{
            background: `radial-gradient(circle at center, ${S.green}40 0%, transparent 60%)`,
            animation: 'screenFlashRanking 0.8s ease-out forwards',
          }} />
      )}

      <div className="relative z-10 px-6 py-6 max-w-7xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push(`/teacher/class/${classId}`)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition text-sm">
            <span>←</span>
            <span>수업 상세로</span>
          </button>

          <div className="flex items-center gap-4">
            {/* 시계 */}
            <div className="text-[15px] font-mono text-gray-400 font-bold">{currentTime}</div>
            {/* Live */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
              <div className="w-2.5 h-2.5 rounded-full live-pulse" style={{ background: '#EF4444' }} />
              <span className="text-[12px] font-bold font-mono" style={{ color: '#EF4444' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* 타이틀 */}
        <div className="text-center mb-8">
          <p className="text-[12px] tracking-[8px] font-mono mb-2" style={{ color: S.green }}>
            REAL-TIME LEADERBOARD
          </p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
            🏆 SIGNAL <span style={{ color: S.green }}>랭킹</span>
          </h1>
          <p className="text-base text-gray-400">{cls?.name}</p>
        </div>

        {/* 전체 진행률 (요약 카드) */}
        <div className="rounded-2xl p-5 mb-8"
          style={{
            background: `linear-gradient(135deg, ${S.green}10 0%, ${S.aqua}05 100%)`,
            border: `1px solid ${S.green}30`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>OVERALL PROGRESS</p>
              <p className="text-[15px] font-bold text-white">전체 진행 상황</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black font-mono" style={{ color: S.green }}>
                {overallProgress}<span className="text-lg text-gray-500">%</span>
              </p>
              <p className="text-[11px] text-gray-500 font-mono">{totalCompleted} / {totalCards} 카드</p>
            </div>
          </div>
          {/* 큰 진행률 바 */}
          <div className="h-3 rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{
                width: `${overallProgress}%`,
                background: `linear-gradient(90deg, ${S.gold} 0%, ${S.green} 100%)`,
                boxShadow: `0 0 16px ${S.green}88`,
              }}>
              <div className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                  animation: 'shimmerRank 2s ease-in-out infinite',
                }} />
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 font-mono">참여 팀 {sortedTeams.length}개</p>
        </div>

        {/* 랭킹 목록 */}
        {sortedTeams.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">🎴</p>
            <p className="text-gray-500 text-lg">아직 팀이 없어요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTeams.map((team, rank) => {
              const medal = getMedal(rank);
              const completed = team.completed_count || 0;
              const progress = (completed / 16) * 100;
              const isFirst = rank === 0 && completed > 0;
              const isUpdated = recentlyUpdatedTeam === team.id;

              return (
                <div key={team.id}
                  className={`rounded-2xl p-5 transition-all duration-500 ${isUpdated ? 'rank-flash' : ''}`}
                  style={{
                    background: isFirst
                      ? `linear-gradient(135deg, ${S.gold}20 0%, ${S.green}15 100%)`
                      : 'rgba(255,255,255,0.04)',
                    border: isFirst
                      ? `2px solid ${S.gold}66`
                      : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: isFirst
                      ? `0 8px 40px ${S.gold}40, inset 0 0 30px ${S.gold}15`
                      : '0 4px 12px rgba(0,0,0,0.3)',
                    transform: isFirst ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  <div className="flex items-center gap-5">
                    {/* 메달 — 큰 사이즈 */}
                    <div className="flex-shrink-0">
                      <div className={`rounded-2xl flex items-center justify-center font-black ${isFirst ? 'medal-pulse' : ''}`}
                        style={{
                          width: isFirst ? '90px' : '70px',
                          height: isFirst ? '90px' : '70px',
                          fontSize: isFirst ? '40px' : '28px',
                          background: isFirst
                            ? `radial-gradient(circle, ${S.gold} 0%, ${S.gold}AA 100%)`
                            : rank < 3
                              ? `${medal.color}22`
                              : 'rgba(255,255,255,0.06)',
                          color: isFirst ? '#000' : rank < 3 ? medal.color : '#888',
                          boxShadow: isFirst
                            ? `0 0 30px ${S.gold}AA, 0 8px 20px ${S.gold}66`
                            : rank < 3
                              ? `0 4px 16px ${medal.color}33`
                              : 'none',
                        }}>
                        {medal.icon}
                      </div>
                    </div>

                    {/* 팀 정보 + 진행률 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-white"
                            style={{ fontSize: isFirst ? '32px' : '24px' }}>
                            {team.name}
                          </h3>
                          {team.item && (
                            <span className="text-[14px] px-3 py-1 rounded-full font-bold"
                              style={{ color: S.aqua, background: `${S.aqua}10`, border: `1px solid ${S.aqua}30` }}>
                              {team.item}
                            </span>
                          )}
                        </div>
                        {/* 완료 카드 수 */}
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-gray-500 mb-1">COMPLETED</p>
                          <p className="font-black font-mono leading-none"
                            style={{
                              fontSize: isFirst ? '36px' : '28px',
                              color: isFirst ? S.gold : completed > 0 ? S.green : '#555',
                            }}>
                            {completed}<span className="text-lg text-gray-600">/16</span>
                          </p>
                        </div>
                      </div>

                      {/* 진행률 바 — 큰 사이즈 */}
                      <div className="h-3 rounded-full overflow-hidden relative mb-2"
                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                          style={{
                            width: `${progress}%`,
                            background: isFirst
                              ? `linear-gradient(90deg, ${S.gold} 0%, ${S.green} 100%)`
                              : completed > 0 ? S.green : 'transparent',
                            boxShadow: completed > 0 ? `0 0 16px ${isFirst ? S.gold : S.green}88` : 'none',
                          }}>
                          {completed > 0 && (
                            <div className="absolute inset-0"
                              style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                                animation: 'shimmerRank 2s ease-in-out infinite',
                              }} />
                          )}
                        </div>
                      </div>

                      {/* 진행률 % + 팀원 수 */}
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] text-gray-500 font-mono">
                          {team.member_count ? `👥 ${team.member_count}명` : '-'}
                        </p>
                        <p className="font-bold font-mono"
                          style={{
                            fontSize: isFirst ? '20px' : '16px',
                            color: isFirst ? S.gold : '#888',
                          }}>
                          {Math.round(progress)}%
                        </p>
                      </div>

                      {/* 1등에게 추가 메시지 */}
                      {isFirst && completed > 0 && (
                        <div className="mt-3 pt-3 border-t" style={{ borderColor: `${S.gold}30` }}>
                          <p className="text-[12px] font-bold text-center" style={{ color: S.gold }}>
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
          <p className="text-[10px] text-gray-700 font-mono">
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
              background: `linear-gradient(135deg, ${S.green}25 0%, ${S.aqua}15 100%)`,
              border: `2px solid ${S.green}66`,
              boxShadow: `0 12px 48px ${S.green}55`,
              minWidth: '420px',
            }}>
            <span className="text-4xl">🎉</span>
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 font-mono mb-0.5">CARD COMPLETED</p>
              <p className="text-lg font-black text-white">
                <span style={{ color: S.green }}>{toast.teamName}</span>이 카드 {toast.cardId}을(를) 완료!
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">{toast.cardName}</p>
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
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.2);
          }
        }
        .medal-pulse {
          animation: medalPulse 2s ease-in-out infinite;
        }

        @keyframes rankFlash {
          0% {
            background: rgba(255, 215, 0, 0.04);
            transform: scale(1);
          }
          30% {
            background: rgba(231, 254, 85, 0.3);
            transform: scale(1.02);
          }
          100% {
            background: rgba(255, 215, 0, 0.04);
            transform: scale(1);
          }
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
          0% {
            opacity: 0;
            transform: translateY(-30px) scale(0.9);
          }
          15% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          85% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-15px) scale(0.95);
          }
        }
        .toast-slide-big {
          animation: toastSlideBig 5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
