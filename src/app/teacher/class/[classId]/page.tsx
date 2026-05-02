'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentTeacher, getClass, getTeamsByClass, getTeamMembers, saveTeamMembers } from '@/lib/teacher';
import type { Teacher, Class, Team, TeamMember } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A', gold: '#FFD700' };

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

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      if (!t) { router.push('/teacher'); return; }
      setTeacher(t);

      const [clsData, teamsData] = await Promise.all([
        getClass(classId),
        getTeamsByClass(classId),
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

        {/* ⭐⭐⭐ 강렬한 랭킹 보기 버튼 ⭐⭐⭐ */}
        <button onClick={() => router.push(`/teacher/class/${classId}/ranking`)}
          className="ranking-btn w-full rounded-2xl overflow-hidden mb-6 transition-all hover:scale-[1.02] relative group"
          style={{
            background: `linear-gradient(135deg, ${S.gold} 0%, #FFA500 50%, ${S.green} 100%)`,
            border: `2px solid ${S.gold}`,
            boxShadow: `0 12px 40px ${S.gold}66, inset 0 0 40px rgba(255,255,255,0.1)`,
            padding: '24px',
          }}>
          {/* 빛 흐르는 효과 */}
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }} />

          {/* 빛 입자 (반짝임) */}
          <span className="sparkle sparkle-1">✨</span>
          <span className="sparkle sparkle-2">✨</span>
          <span className="sparkle sparkle-3">⭐</span>
          <span className="sparkle sparkle-4">✨</span>

          <div className="relative z-10 flex items-center gap-4">
            {/* 트로피 아이콘 */}
            <div className="trophy-bounce flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.2)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
              <span className="text-4xl">🏆</span>
            </div>

            {/* 텍스트 */}
            <div className="flex-1 text-left">
              <p className="text-[10px] font-mono tracking-widest mb-1 font-bold"
                style={{ color: 'rgba(0,0,0,0.7)' }}>
                REAL-TIME LEADERBOARD
              </p>
              <h2 className="text-2xl font-black mb-0.5"
                style={{ color: S.navy }}>
                실시간 팀 랭킹 보기
              </h2>
              <p className="text-[12px] font-bold"
                style={{ color: 'rgba(0,0,0,0.65)' }}>
                ▶ 화면 공유로 학생들에게 보여주세요
              </p>
            </div>

            {/* 화살표 */}
            <div className="flex-shrink-0 text-3xl font-black arrow-bounce"
              style={{ color: S.navy }}>
              →
            </div>
          </div>
        </button>

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

                {/* 진행도 바 */}
                {(team.completed_count || 0) > 0 && (
                  <div className="px-4 pb-3">
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${((team.completed_count || 0) / 16) * 100}%`, background: S.green }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
        /* 트로피 바운스 */
        @keyframes trophyBounce {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        .trophy-bounce {
          animation: trophyBounce 2s ease-in-out infinite;
        }

        /* 화살표 바운스 */
        @keyframes arrowBounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        .arrow-bounce {
          animation: arrowBounce 1.5s ease-in-out infinite;
        }

        /* 반짝이 입자 */
        .sparkle {
          position: absolute;
          font-size: 16px;
          opacity: 0;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes sparkleAnim {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }
        .sparkle-1 {
          top: 15%;
          left: 10%;
          animation: sparkleAnim 2.5s ease-in-out 0s infinite;
        }
        .sparkle-2 {
          top: 60%;
          left: 75%;
          animation: sparkleAnim 2.5s ease-in-out 0.7s infinite;
        }
        .sparkle-3 {
          top: 25%;
          right: 15%;
          animation: sparkleAnim 2.5s ease-in-out 1.2s infinite;
        }
        .sparkle-4 {
          bottom: 20%;
          left: 30%;
          animation: sparkleAnim 2.5s ease-in-out 1.8s infinite;
        }

        /* 버튼 자체 글로우 펄스 */
        @keyframes btnPulse {
          0%, 100% {
            box-shadow: 0 12px 40px rgba(255,215,0,0.4), inset 0 0 40px rgba(255,255,255,0.1);
          }
          50% {
            box-shadow: 0 12px 50px rgba(255,215,0,0.7), inset 0 0 50px rgba(255,255,255,0.2);
          }
        }
        .ranking-btn {
          animation: btnPulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
