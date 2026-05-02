'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  getCurrentTeacher, getClass, getTeamsByClass, getTeamMembers, saveTeamMembers,
  getTeamRankings, subscribeToClassProgress,
} from '@/lib/teacher';
import type { Teacher, Class, Team, TeamMember } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A', gold: '#FFD700' };

// 카드 ID → 카드 이름 매핑 (toast에서 사용)
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

export default function ClassDetail() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // 명단 편집
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [memberInputs, setMemberInputs] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ⭐ NEW: 랭킹 + Realtime
  const [completionToasts, setCompletionToasts] = useState<CompletionToast[]>([]);
  const [recentlyUpdatedTeam, setRecentlyUpdatedTeam] = useState<string | null>(null);
  const toastIdRef = useRef(0);
  const teamsRef = useRef<Team[]>([]);

  // teams 변경 시 ref 업데이트 (콜백 안에서 최신 값 참조하기 위해)
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      if (!t) { router.push('/teacher'); return; }
      setTeacher(t);

      const [clsData, teamsData] = await Promise.all([
        getClass(classId),
        getTeamRankings(classId), // 랭킹 순으로 정렬됨
      ]);
      setCls(clsData);
      setTeams(teamsData);

      // 각 팀 명단 불러오기
      const membersMap: Record<string, TeamMember[]> = {};
      await Promise.all(teamsData.map(async team => {
        const members = await getTeamMembers(team.id);
        membersMap[team.id] = members;
        setMemberInputs(prev => ({
          ...prev,
          [team.id]: members.map(m => m.name).join('\n'),
        }));
      }));
      setTeamMembers(membersMap);
      setLoading(false);
    })();
  }, [classId, router]);

  // ⭐ Realtime: 카드 진행 상황 구독
  useEffect(() => {
    if (loading || teams.length === 0) return;
    const teamIds = teams.map(t => t.id);

    const unsubscribe = subscribeToClassProgress(
      classId,
      teamIds,
      async (event) => {
        if (!event.isCompleted) return;

        // 어느 팀이 완료했는지 찾기
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
        }, 4000);

        // 깜빡임 효과
        setRecentlyUpdatedTeam(event.teamId);
        setTimeout(() => setRecentlyUpdatedTeam(null), 1500);

        // 랭킹 다시 가져오기
        const newRankings = await getTeamRankings(classId);
        setTeams(newRankings);
      }
    );

    return () => unsubscribe();
  }, [classId, loading, teams.length]);

  const handleSaveMembers = async (teamId: string) => {
    setSaving(true);
    const names = (memberInputs[teamId] || '').split('\n').map(n => n.trim()).filter(Boolean);
    const saved = await saveTeamMembers(teamId, names);
    setTeamMembers(prev => ({ ...prev, [teamId]: saved }));
    setEditingTeamId(null);
    setSaving(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <p className="text-gray-500 font-mono text-sm">불러오는 중...</p>
    </div>
  );

  // 랭킹 계산: 완료 카드 수 내림차순으로 정렬된 팀
  const sortedTeams = [...teams].sort((a, b) => (b.completed_count || 0) - (a.completed_count || 0));

  // 순위 메달
  const getMedal = (rank: number) => {
    if (rank === 0) return { icon: '👑', color: S.gold, label: '1위' };
    if (rank === 1) return { icon: '🥈', color: '#C0C0C0', label: '2위' };
    if (rank === 2) return { icon: '🥉', color: '#CD7F32', label: '3위' };
    return { icon: `${rank + 1}`, color: '#666', label: `${rank + 1}위` };
  };

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: S.bg }}>
      <div className="max-w-lg mx-auto">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/teacher/dashboard')}
            className="text-gray-600 hover:text-gray-400 transition text-sm">← 대시보드</button>
        </div>

        <div className="rounded-2xl p-5 mb-6"
          style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
          <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>수업 상세</p>
          <h1 className="text-xl font-black text-white">{cls?.name}</h1>
          <p className="text-[12px] text-gray-500 mt-1">{cls?.school} {cls?.schedule && `· ${cls.schedule}`}</p>
        </div>

        {/* 학생 접속 URL 안내 */}
        <div className="rounded-xl p-4 mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] font-bold text-gray-400 mb-1">학생 접속 주소</p>
          <p className="text-[12px] font-mono" style={{ color: S.aqua }}>
            digital-trade-cards-production.up.railway.app/student/join
          </p>
          <p className="text-[11px] text-gray-600 mt-1">학생들에게 팀 코드와 함께 공유하세요</p>
        </div>

        {/* ⭐⭐⭐ 실시간 팀 랭킹 위젯 ⭐⭐⭐ */}
        <div className="rounded-2xl overflow-hidden mb-6 ranking-widget"
          style={{
            background: 'linear-gradient(135deg, rgba(231,254,85,0.06) 0%, rgba(193,232,235,0.04) 100%)',
            border: `1px solid ${S.green}30`,
            boxShadow: `0 8px 30px ${S.green}10`,
          }}>
          {/* 위젯 헤더 */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-[10px] font-mono tracking-widest" style={{ color: S.green }}>REAL-TIME RANKING</p>
                <h2 className="text-lg font-black text-white">실시간 팀 랭킹</h2>
              </div>
            </div>
            {/* Live 표시 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="w-2 h-2 rounded-full live-pulse" style={{ background: '#EF4444' }} />
              <span className="text-[10px] font-bold font-mono" style={{ color: '#EF4444' }}>LIVE</span>
            </div>
          </div>

          {/* 랭킹 리스트 */}
          <div className="px-4 pb-5 space-y-2.5">
            {sortedTeams.length === 0 ? (
              <p className="text-center text-gray-500 py-6 text-sm">아직 팀이 없어요</p>
            ) : (
              sortedTeams.map((team, rank) => {
                const medal = getMedal(rank);
                const completed = team.completed_count || 0;
                const progress = (completed / 16) * 100;
                const isFirst = rank === 0 && completed > 0;
                const isUpdated = recentlyUpdatedTeam === team.id;

                return (
                  <div key={team.id}
                    className={`rounded-xl p-3.5 transition-all ${isUpdated ? 'rank-flash' : ''}`}
                    style={{
                      background: isFirst
                        ? `linear-gradient(135deg, ${S.gold}15 0%, ${S.green}10 100%)`
                        : 'rgba(255,255,255,0.04)',
                      border: isFirst
                        ? `1.5px solid ${S.gold}66`
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isFirst ? `0 4px 20px ${S.gold}33` : 'none',
                    }}>
                    <div className="flex items-center gap-3 mb-2">
                      {/* 메달 / 순위 */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                        style={{
                          background: isFirst
                            ? `radial-gradient(circle, ${S.gold} 0%, ${S.gold}AA 100%)`
                            : rank < 3
                              ? `${medal.color}22`
                              : 'rgba(255,255,255,0.06)',
                          color: isFirst ? '#000' : rank < 3 ? medal.color : '#888',
                          boxShadow: isFirst ? `0 0 16px ${S.gold}88` : 'none',
                        }}>
                        {medal.icon}
                      </div>
                      {/* 팀 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-black ${isFirst ? 'text-base' : 'text-[15px]'}`}
                            style={{ color: isFirst ? S.gold : '#fff' }}>
                            {team.name}
                          </h3>
                          {team.item && (
                            <span className="text-[10px] truncate" style={{ color: S.aqua }}>
                              {team.item}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 완료 수 */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-[18px] font-black font-mono leading-none"
                          style={{ color: isFirst ? S.gold : completed > 0 ? S.green : '#555' }}>
                          {completed}
                          <span className="text-[11px] text-gray-600">/16</span>
                        </div>
                        <p className="text-[9px] text-gray-600 font-mono mt-0.5">완료</p>
                      </div>
                    </div>

                    {/* 진행률 바 — shimmer 효과 */}
                    <div className="h-2 rounded-full overflow-hidden relative"
                      style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
                        style={{
                          width: `${progress}%`,
                          background: isFirst
                            ? `linear-gradient(90deg, ${S.gold} 0%, ${S.green} 100%)`
                            : completed > 0 ? S.green : 'transparent',
                          boxShadow: completed > 0 ? `0 0 12px ${isFirst ? S.gold : S.green}88` : 'none',
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

                    {/* 진행률 % */}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-gray-500 font-mono">
                        {team.member_count ? `${team.member_count}명` : '-'}
                      </p>
                      <p className="text-[11px] font-bold font-mono"
                        style={{ color: isFirst ? S.gold : '#888' }}>
                        {Math.round(progress)}%
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 팀 목록 (기존 — 명단 관리) */}
        <div className="mb-4">
          <p className="text-sm font-bold text-white">팀 관리 ({teams.length}개)</p>
          <p className="text-[11px] text-gray-600 mt-0.5">팀 코드 복사 · 학생 명단 등록</p>
        </div>

        <div className="space-y-4">
          {teams.map(team => {
            const members = teamMembers[team.id] || [];
            const isEditing = editingTeamId === team.id;

            return (
              <div key={team.id} className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* 팀 헤더 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{team.name}</h3>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        완료 {team.completed_count || 0}/16장
                      </p>
                    </div>
                    {/* 팀 코드 */}
                    <button onClick={() => copyCode(team.join_code)}
                      className="flex flex-col items-end gap-1">
                      <p className="text-[9px] text-gray-600 font-mono">수업 코드</p>
                      <div className="px-3 py-1.5 rounded-lg font-black font-mono text-sm transition"
                        style={{ background: copiedCode === team.join_code ? `${S.green}20` : 'rgba(255,255,255,0.08)', color: copiedCode === team.join_code ? S.green : '#fff', border: `1px solid ${copiedCode === team.join_code ? S.green : 'rgba(255,255,255,0.12)'}` }}>
                        {copiedCode === team.join_code ? '✓ 복사됨' : team.join_code}
                      </div>
                    </button>
                  </div>

                  {/* 학생 명단 */}
                  {!isEditing ? (
                    <div>
                      {members.length === 0 ? (
                        <p className="text-[12px] text-gray-600 mb-3">아직 학생 명단이 없어요</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {members.map(m => (
                            <span key={m.id}
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                              style={{ background: m.is_leader ? `${S.green}20` : 'rgba(255,255,255,0.06)', color: m.is_leader ? S.green : '#aaa', border: `1px solid ${m.is_leader ? S.green + '40' : 'rgba(255,255,255,0.08)'}` }}>
                              {m.is_leader ? '👑 ' : ''}{m.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <button onClick={() => {
                        setEditingTeamId(team.id);
                        setMemberInputs(prev => ({
                          ...prev,
                          [team.id]: members.map(m => m.name).join('\n'),
                        }));
                      }}
                        className="w-full py-2 rounded-xl text-[12px] font-bold transition"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888' }}>
                        {members.length === 0 ? '+ 학생 명단 입력' : '✏️ 명단 수정'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-2">
                        한 줄에 한 명씩 입력 · 첫 번째 학생이 자동으로 팀장이 됩니다
                      </p>
                      <textarea
                        value={memberInputs[team.id] || ''}
                        onChange={e => setMemberInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                        placeholder={"이서연\n김민준\n박서아\n정하율"}
                        rows={5}
                        className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none mb-3"
                        style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${S.green}40`, outline: 'none', fontFamily: 'monospace' }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingTeamId(null)}
                          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#666' }}>
                          취소
                        </button>
                        <button onClick={() => handleSaveMembers(team.id)} disabled={saving}
                          className="flex-[2] py-2.5 rounded-xl text-[13px] font-black transition disabled:opacity-50"
                          style={{ background: S.green, color: S.navy }}>
                          {saving ? '저장 중...' : '저장하기'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      {/* ⭐ 카드 완료 toast 알림 */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none">
        {completionToasts.map(toast => (
          <div key={toast.id}
            className="rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-md toast-slide"
            style={{
              background: `linear-gradient(135deg, ${S.green}20 0%, ${S.aqua}10 100%)`,
              border: `1px solid ${S.green}40`,
              boxShadow: `0 8px 32px ${S.green}33`,
              minWidth: '280px',
            }}>
            <span className="text-2xl">🎉</span>
            <div className="flex-1">
              <p className="text-[11px] text-gray-400 font-mono">CARD COMPLETED</p>
              <p className="text-[13px] font-bold text-white">
                <span style={{ color: S.green }}>{toast.teamName}</span>이 카드 {toast.cardId}을(를) 완료했습니다!
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">{toast.cardName}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 키프레임 애니메이션 */}
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
          box-shadow: 0 0 8px #EF4444;
        }

        @keyframes rankFlash {
          0% { background: rgba(231, 254, 85, 0.04); }
          30% { background: rgba(231, 254, 85, 0.25); }
          100% { background: rgba(231, 254, 85, 0.04); }
        }

        .rank-flash {
          animation: rankFlash 1.5s ease-out;
        }

        @keyframes toastSlide {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
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
            transform: translateY(-10px) scale(0.95);
          }
        }

        .toast-slide {
          animation: toastSlide 4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
