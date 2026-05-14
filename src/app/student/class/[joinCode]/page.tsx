'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getClassWithTeamsByCode } from '@/lib/teacher';
import type { Class, Team } from '@/lib/teacher';
import SignalIntro from '@/components/SignalIntro';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  gold: '#FFD700',
};

const LEVELS: Record<string, { label: string; emoji: string; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', color: '#4ADE80' },
  standard: { label: '표준', emoji: '📘', color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', color: '#A78BFA' },
};

// 팀별 컬러 (시안에서 가져옴 - 1팀부터 순서대로 순환)
const TEAM_COLORS = [
  '#06B6D4', '#8B5CF6', '#FF6FB5', '#E7FE55',
  '#FFD700', '#06B6D4', '#8B5CF6', '#FF6FB5',
];

export default function StudentClassPage() {
  const router = useRouter();
  const params = useParams();
  const joinCode = (params.joinCode as string).toUpperCase();

  const [cls, setCls] = useState<Class | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // ⭐ NEW: 검색 쿼리
  const [searchQuery, setSearchQuery] = useState('');

  // ⭐⭐⭐ NEW: 인트로 표시 여부 (sessionStorage로 기록, 첫 진입만 강제 5초) ⭐⭐⭐
  // 'unknown' = 아직 sessionStorage 안 읽음 (SSR 안전성)
  // 'show'    = 인트로 표시 중
  // 'done'    = 인트로 끝남 (또는 이미 본 적 있음)
  const [introState, setIntroState] = useState<'unknown' | 'show' | 'done'>('unknown');

  useEffect(() => {
    // ⭐⭐⭐ NEW: 학급 페이지 진입 시 이전 학생 세션 자동 초기화 (같은 기기 다른 학생 보호)
    // 게임 화면 상단에 이전 학생의 직무가 남아있는 문제 해결
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('dtc_session_token');
      sessionStorage.removeItem('dtc_session_token_v2');
      // 옛 localStorage 흔적도 같이 청소
      localStorage.removeItem('dtc_session_token');
      localStorage.removeItem('dtc_session_token_v2');

      // ⭐⭐⭐ NEW: 인트로 본 적 있는지 확인 ⭐⭐⭐
      // 키: 'dtc_intro_seen_v1' = 'true' 이면 한 번 봤음 → 스킵
      // 같은 탭 새로고침: sessionStorage 유지 → 자동 스킵
      // 새 탭/새 학생: sessionStorage 비어있음 → 처음 봄 → 5초 인트로
      const introSeen = sessionStorage.getItem('dtc_intro_seen_v1');
      if (introSeen === 'true') {
        setIntroState('done'); // 이미 봤음 → 스킵
      } else {
        setIntroState('show'); // 처음 → 표시
      }
    }

    (async () => {
      try {
        const result = await getClassWithTeamsByCode(joinCode);
        if (!result) {
          setError('학급을 찾을 수 없어요. 학급 코드를 다시 확인해주세요.');
          setLoading(false);
          return;
        }
        setCls(result.class);
        setTeams(result.teams);
      } catch (e) {
        setError('학급 정보를 불러오는 중 오류가 발생했어요.');
      } finally {
        setLoading(false);
      }
    })();
  }, [joinCode]);

  // ⭐⭐⭐ NEW: 인트로 완료 핸들러 ⭐⭐⭐
  const handleIntroComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dtc_intro_seen_v1', 'true');
    }
    setIntroState('done');
  };

  // ⭐ NEW: 검색 필터링 (이름 + 번호 둘 다)
  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(team => {
      const name = team.name.toLowerCase();           // "3팀"
      const nameOnly = name.replace(/팀$/, '').trim(); // "3"
      // "3" 검색 → "3팀"의 "3" 매칭, "3팀" 검색 → "3팀" 매칭
      return name.includes(q) || nameOnly.includes(q);
    });
  }, [teams, searchQuery]);

  // 팀 선택 → 기존 student/join 페이지로 이동 (팀 코드 URL 파라미터로 전달)
  const handleTeamSelect = (team: Team) => {
    setSelectedTeamId(team.id);
    setTimeout(() => {
      router.push(`/student/join?code=${team.join_code}`);
    }, 300);
  };

  // ⭐⭐⭐ NEW: 인트로 표시 중이면 인트로만 렌더 (학급 정보는 백그라운드에서 로딩) ⭐⭐⭐
  if (introState === 'show') {
    return <SignalIntro onComplete={handleIntroComplete} durationMs={5000} />;
  }

  // ⭐ 인트로 상태가 'unknown'이면 (SSR 안전) 잠깐 빈 화면 — 클라이언트 렌더 후 즉시 결정됨
  if (introState === 'unknown') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#0A0A0A' }} />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#0A0A0A' }}>
        <p className="font-mono text-sm" style={{ color: S.cyan }}>{`>`} 학급 정보 불러오는 중...</p>
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: '#0A0A0A' }}>

        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[5px] font-mono font-bold mb-2"
            style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
            CONNECTAI
          </p>
          <h1 className="text-4xl font-black text-white"
            style={{ textShadow: `0 0 20px ${S.cyan}66` }}>
            SIGNAL
          </h1>
        </div>

        <div className="max-w-sm w-full rounded-2xl p-5 text-center"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}>
          <p className="text-4xl mb-3">❌</p>
          <p className="text-[14px] font-bold text-white mb-2">학급을 찾을 수 없어요</p>
          <p className="text-[12px] text-gray-400 leading-relaxed mb-4">{error}</p>
          <p className="text-[10px] font-mono mb-4" style={{ color: '#666' }}>
            입력한 코드: {joinCode}
          </p>
          <button onClick={() => router.push('/student/join')}
            className="w-full py-3 rounded-xl text-[13px] font-bold"
            style={{ background: S.cyan, color: S.navy }}>
            → 팀 코드 직접 입력하기
          </button>
        </div>
      </div>
    );
  }

  const lvlInfo = cls.level ? LEVELS[cls.level] : null;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 relative overflow-hidden"
      style={{ background: '#0A0A0A' }}>

      {/* 배경 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, ${S.gold}0F 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      {/* 빛 신호 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute class-signal-1"
          style={{
            top: '20%', left: 0, width: '100px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
        <div className="absolute class-signal-2"
          style={{
            top: '60%', right: 0, width: '120px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.purple}, transparent)`,
            boxShadow: `0 0 14px ${S.purple}, 0 0 28px ${S.purple}66`,
          }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* SIGNAL 헤더 */}
        <div className="text-center mb-5">
          <p className="text-[10px] tracking-[5px] font-mono font-bold mb-1"
            style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
            CONNECTAI
          </p>
          <h1 className="text-4xl font-black text-white"
            style={{ textShadow: `0 0 20px ${S.cyan}66, 0 0 40px ${S.cyan}33` }}>
            SIGNAL
          </h1>
          <p className="text-[11px] font-bold tracking-[2.5px] font-mono mt-1"
            style={{ color: S.aqua }}>
            DIGITAL TRADE CARDS
          </p>
        </div>

        {/* 학급 정보 박스 */}
        <div className="rounded-2xl p-4 mb-4 relative overflow-hidden"
          style={{
            background: `${S.gold}08`,
            border: `1px solid ${S.gold}40`,
            boxShadow: `0 0 20px ${S.gold}22`,
          }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
            <p className="text-[9px] font-mono tracking-[2.5px] font-bold"
              style={{ color: S.gold, textShadow: `0 0 6px ${S.gold}AA` }}>
              ★ CLASS
            </p>
            <p className="ml-auto text-[9px] font-mono"
              style={{ color: `${S.gold}AA` }}>
              {cls.join_code}
            </p>
          </div>
          <h2 className="text-[16px] font-black text-white leading-tight mb-1.5">
            {cls.name}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {lvlInfo && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: `${lvlInfo.color}15`,
                  color: lvlInfo.color,
                  border: `1px solid ${lvlInfo.color}40`,
                }}>
                {lvlInfo.emoji} {lvlInfo.label}
              </span>
            )}
            <span className="text-[10px] font-mono" style={{ color: '#888' }}>
              {cls.school}{cls.schedule ? ` · ${cls.schedule}` : ''}
            </span>
          </div>
        </div>

        {/* 안내 문구 */}
        <p className="text-[13px] font-bold text-white mb-2.5 px-1">
          본인 팀을 선택하세요
        </p>

        {/* ⭐⭐⭐ NEW: 검색창 (항상 표시) ⭐⭐⭐ */}
        <div className="mb-3 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 팀 이름 또는 번호 검색..."
            className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-[13px] text-white transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: searchQuery
                ? `1.5px solid ${S.cyan}66`
                : '1px solid rgba(255,255,255,0.08)',
              outline: 'none',
              boxShadow: searchQuery ? `0 0 12px ${S.cyan}22` : 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[14px] font-bold transition hover:scale-110"
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#aaa',
              }}
              aria-label="검색어 지우기">
              ✕
            </button>
          )}
        </div>

        {/* 팀 카드 그리드 (2열) */}
        {teams.length === 0 ? (
          // 학급에 팀이 아예 없는 경우
          <div className="rounded-2xl p-5 text-center mb-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.15)',
            }}>
            <p className="text-[13px] text-white mb-1" style={{ opacity: 0.7 }}>
              이 학급에 아직 팀이 없어요
            </p>
            <p className="text-[11px]" style={{ color: '#666' }}>
              관리자에게 문의해주세요
            </p>
          </div>
        ) : filteredTeams.length === 0 ? (
          // ⭐ NEW: 검색 결과가 없는 경우
          <div className="rounded-2xl p-5 text-center mb-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px dashed rgba(255,255,255,0.15)',
            }}>
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-[13px] text-white mb-1" style={{ opacity: 0.8 }}>
              검색 결과가 없어요
            </p>
            <p className="text-[11px]" style={{ color: '#666' }}>
              다시 확인해주세요
            </p>
          </div>
        ) : (
          <>
            {/* 검색 중일 때 결과 개수 표시 */}
            {searchQuery && (
              <p className="text-[10px] font-mono mb-2 px-1" style={{ color: '#888' }}>
                {`>`} {filteredTeams.length}개 팀 일치
              </p>
            )}

            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {filteredTeams.map((team) => {
                // ⭐ 원본 teams 배열에서 인덱스 찾기 (컬러 일관성 유지)
                const originalIdx = teams.findIndex(t => t.id === team.id);
                const teamColor = TEAM_COLORS[originalIdx % TEAM_COLORS.length];
                const isSelected = selectedTeamId === team.id;
                const memberCount = team.member_count || 0;
                // E7FE55, FFD700 같은 밝은 색은 검은 글씨, 나머지는 흰 글씨
                const isLight = teamColor === '#E7FE55' || teamColor === '#FFD700';
                const numTextColor = isLight ? S.navy : '#fff';

                return (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSelect(team)}
                    disabled={isSelected}
                    className="team-card rounded-2xl p-3 text-center transition-all hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden disabled:opacity-60"
                    style={{
                      background: isSelected ? `${teamColor}25` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${isSelected ? teamColor : teamColor + '50'}`,
                      boxShadow: isSelected
                        ? `0 0 18px ${teamColor}88, inset 0 0 20px ${teamColor}22`
                        : `0 0 10px ${teamColor}25`,
                    }}>

                    {/* 팀 번호 원 */}
                    <div className="mx-auto mb-2 rounded-2xl flex items-center justify-center font-black"
                      style={{
                        width: '52px',
                        height: '52px',
                        background: teamColor,
                        color: numTextColor,
                        fontSize: '15px',
                        letterSpacing: '-0.5px',
                        boxShadow: `0 4px 14px ${teamColor}66, inset 0 -2px 8px rgba(0,0,0,0.15)`,
                      }}>
                      {team.name}
                    </div>

                    {/* ⭐ NEW: 입장한 팀원 N명 (아이콘 + 숫자) */}
                    <p className="text-[13px] font-black text-white leading-tight">
                      <span style={{ marginRight: '3px' }}>👥</span>
                      {memberCount}명
                    </p>

                    {/* 상태 라벨 */}
                    <p className="text-[10px] font-mono mt-0.5"
                      style={{ color: teamColor, opacity: 0.8 }}>
                      {memberCount === 0 ? '아직 입장 안 함' : '입장 중'}
                    </p>

                    {/* 팀 코드 (작게) */}
                    <p className="text-[9px] font-mono mt-1.5 px-1 py-0.5 rounded"
                      style={{
                        color: '#666',
                        background: 'rgba(0,0,0,0.3)',
                      }}>
                      {team.join_code}
                    </p>

                    {/* 선택 시 체크 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: teamColor }}>
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <path d="M1.5 5l2.5 2.5 4.5-5" stroke={numTextColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* 안내 박스 */}
        <div className="rounded-xl p-3 mb-4"
          style={{
            background: `${S.cyan}06`,
            border: `1px solid ${S.cyan}22`,
          }}>
          <p className="text-[10.5px] leading-relaxed" style={{ color: '#aaa' }}>
            💡 본인 팀을 선택하면 팀 페이지로 이동해서 이름을 선택해 입장합니다.
          </p>
        </div>

        {/* 팀 코드 직접 입력 fallback */}
        <button onClick={() => router.push('/student/join')}
          className="w-full py-2.5 rounded-xl text-[12px] transition-all hover:scale-[1.01]"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#888',
          }}>
          또는 → 팀 코드 직접 입력하기
        </button>

        <p className="text-center text-gray-700 text-[10px] mt-6 font-mono">
          © 2026 SIGNAL — ConnectAI
        </p>
      </div>

      <style jsx>{`
        .team-card {
          animation: teamFloat 3s ease-in-out infinite;
        }
        .team-card:nth-child(2n) { animation-delay: 0.5s; }
        .team-card:nth-child(3n) { animation-delay: 1s; }
        .team-card:nth-child(4n) { animation-delay: 1.5s; }

        @keyframes teamFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .class-signal-1 { animation: classSigR 5s linear infinite; }
        .class-signal-2 { animation: classSigL 6s linear infinite 0.5s; }
        @keyframes classSigR {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        @keyframes classSigL {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        /* input placeholder 색상 */
        input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </div>
  );
}
