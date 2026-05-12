'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentTeacher, getClass, getTeamsByClass, getTeamMembers, saveTeamMembers } from '@/lib/teacher';
import type { Teacher, Class, Team, TeamMember } from '@/lib/teacher';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
  gold: '#FFD700'
};

// ⭐ NEW: 난이도 매핑
const LEVELS: Record<string, { label: string; emoji: string; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', color: '#4ADE80' },
  standard: { label: '표준', emoji: '📘', color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', color: '#A78BFA' },
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
  // ⭐ NEW: 학급 코드 복사 상태
  const [copiedClassCode, setCopiedClassCode] = useState(false);
  // ⭐⭐⭐ NEW: 카드 진행 격자 펼침 상태
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

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

  // ⭐ NEW: 학급 코드 복사
  const copyClassCode = () => {
    if (!cls?.join_code) return;
    navigator.clipboard.writeText(cls.join_code);
    setCopiedClassCode(true);
    setTimeout(() => setCopiedClassCode(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <p className="font-mono text-sm" style={{ color: S.cyan }}>{`>`} 불러오는 중...</p>
    </div>
  );

  const lvlInfo = cls?.level ? LEVELS[cls.level] : null;
  const hasJoinCode = !!cls?.join_code;

  return (
    <div className="min-h-screen px-4 py-6 relative overflow-hidden" style={{ background: S.bg }}>

      {/* 오로라 배경 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, ${S.blue}14 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      {/* 빛 신호 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute detail-signal-1"
          style={{
            top: '20%', left: 0, width: '100px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
        <div className="absolute detail-signal-2"
          style={{
            top: '60%', right: 0, width: '120px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.purple}, transparent)`,
            boxShadow: `0 0 14px ${S.purple}, 0 0 28px ${S.purple}66`,
          }} />
      </div>

      {/* 떠다니는 입자 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const colors = [S.cyan, S.purple, S.blue];
          const left = (i * 13 + 7) % 100;
          const top = (i * 19 + 13) % 100;
          const size = 1.5 + (i % 3) * 0.5;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full detail-particle"
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

      <div className="max-w-lg mx-auto relative z-10">

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/teacher/dashboard')}
            className="hover:text-gray-400 transition text-sm font-mono"
            style={{ color: S.cyan }}>{`<`} 대시보드</button>
        </div>

        {/* 수업 정보 헤더 */}
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: `${S.cyan}08`,
            border: `1.5px solid ${S.cyan}40`,
            boxShadow: `0 0 24px ${S.cyan}22, inset 0 0 16px ${S.cyan}11`,
          }}>
          <p className="text-[10px] font-mono tracking-widest mb-1 font-bold"
            style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
            {`>`} 수업 상세
          </p>
          <h1 className="text-xl font-black text-white"
            style={{ textShadow: `0 0 12px ${S.cyan}55` }}>{cls?.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* ⭐ NEW: 난이도 뱃지 */}
            {lvlInfo && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: `${lvlInfo.color}20`,
                  color: lvlInfo.color,
                  border: `1px solid ${lvlInfo.color}50`,
                }}>
                {lvlInfo.emoji} {lvlInfo.label}
              </span>
            )}
            <p className="text-[12px]" style={{ color: '#888' }}>{cls?.school} {cls?.schedule && `· ${cls.schedule}`}</p>
          </div>
        </div>

        {/* ⭐⭐⭐ NEW: 학급 코드 + QR 박스 (학급 코드 있을 때만) */}
        {hasJoinCode && (
          <div className="rounded-2xl p-4 mb-4 relative overflow-hidden"
            style={{
              background: `${S.gold}08`,
              border: `1.5px solid ${S.gold}50`,
              boxShadow: `0 0 24px ${S.gold}25`,
            }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
              <p className="text-[10px] font-mono tracking-widest font-bold"
                style={{ color: S.gold, textShadow: `0 0 8px ${S.gold}AA` }}>
                ★ CLASS CODE
              </p>
              <p className="ml-auto text-[10px]" style={{ color: '#888' }}>
                학생 입장용
              </p>
            </div>

            {/* 학급 코드 (클릭 시 복사) */}
            <button onClick={copyClassCode}
              className="w-full mb-3 px-4 py-3 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01]"
              style={{
                background: copiedClassCode ? `${S.green}15` : 'rgba(0,0,0,0.3)',
                border: `2px solid ${copiedClassCode ? S.green : S.gold}66`,
                boxShadow: `0 0 16px ${copiedClassCode ? S.green : S.gold}33`,
              }}>
              <span className="text-2xl">🎫</span>
              <span className="text-[20px] font-black font-mono tracking-wider"
                style={{
                  color: copiedClassCode ? S.green : S.gold,
                  textShadow: `0 0 8px ${copiedClassCode ? S.green : S.gold}66`,
                }}>
                {cls!.join_code}
              </span>
              <span className="text-[9px] font-bold px-2 py-1 rounded-md"
                style={{
                  background: copiedClassCode ? `${S.green}25` : 'rgba(0,0,0,0.4)',
                  color: copiedClassCode ? S.green : '#888',
                }}>
                {copiedClassCode ? '✓ 복사됨' : '📋 복사'}
              </span>
            </button>

            {/* QR 보기 버튼 (강조) */}
            <button onClick={() => router.push(`/teacher/class-qr/${classId}`)}
              className="qr-btn w-full py-3 rounded-xl font-black text-[14px] transition-all hover:scale-[1.02] flex items-center justify-center gap-2 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${S.gold} 0%, #FFA500 100%)`,
                color: S.navy,
                boxShadow: `0 6px 20px ${S.gold}66`,
              }}>
              <span className="text-[18px]">📱</span>
              <span>학급 QR 코드 보기</span>
              <span className="text-[18px]">→</span>
            </button>

            <p className="text-[10.5px] mt-2.5 text-center leading-relaxed" style={{ color: '#aaa' }}>
              💡 학생들이 QR을 스캔하거나 코드를 입력하면 팀 선택 화면으로 이동합니다
            </p>
          </div>
        )}

        {/* 학생 접속 URL 안내 (학급 코드 없을 때만 기존 안내) */}
        {!hasJoinCode && (
          <div className="rounded-xl p-4 mb-6"
            style={{
              background: `${S.purple}08`,
              border: `1px solid ${S.purple}33`,
              boxShadow: `inset 0 0 12px ${S.purple}11`,
            }}>
            <p className="text-[11px] font-bold mb-1" style={{ color: S.purple }}>{`>`} 학생 접속 주소</p>
            <p className="text-[12px] font-mono break-all" style={{ color: S.cyan, textShadow: `0 0 6px ${S.cyan}66` }}>
              digital-trade-cards-production.up.railway.app/student/join
            </p>
            <p className="text-[11px] mt-1" style={{ color: '#666' }}>
              학생들에게 팀 코드와 함께 공유하세요
              <br />
              <span style={{ color: '#999' }}>※ 이 학급은 학급 코드/QR 시스템 도입 전 학급입니다</span>
            </p>
          </div>
        )}

        {/* ⭐⭐⭐ 강렬한 랭킹 보기 버튼 ⭐⭐⭐ */}
        <button onClick={() => router.push(`/teacher/class/${classId}/ranking`)}
          className="ranking-btn w-full rounded-2xl overflow-hidden mb-6 transition-all hover:scale-[1.02] relative group"
          style={{
            background: `linear-gradient(135deg, ${S.gold} 0%, #FFA500 50%, ${S.green} 100%)`,
            border: `2px solid ${S.gold}`,
            boxShadow: `0 12px 40px ${S.gold}66, inset 0 0 40px rgba(255,255,255,0.1)`,
            padding: '24px',
          }}>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)' }} />

          <span className="sparkle sparkle-1">✨</span>
          <span className="sparkle sparkle-2">✨</span>
          <span className="sparkle sparkle-3">⭐</span>
          <span className="sparkle sparkle-4">✨</span>

          <div className="relative z-10 flex items-center gap-4">
            <div className="trophy-bounce flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(0,0,0,0.2)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              }}>
              <span className="text-4xl">🏆</span>
            </div>

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

            <div className="flex-shrink-0 text-3xl font-black arrow-bounce"
              style={{ color: S.navy }}>
              →
            </div>
          </div>
        </button>

        {/* 팀 목록 (기존 — 명단 관리) */}
        <div className="mb-4">
          <p className="text-sm font-bold text-white">
            <span style={{ color: S.cyan }}>{`>`}</span> 팀 관리 ({teams.length}개)
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: '#666' }}>팀 코드 복사 · 학생 명단 등록</p>
        </div>

        <div className="space-y-4">
          {teams.map(team => {
            const members = teamMembers[team.id] || [];
            const isEditing = editingTeamId === team.id;

            return (
              <div key={team.id} className="rounded-2xl overflow-hidden cyber-team-card"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${S.cyan}33`,
                  boxShadow: `0 0 16px ${S.cyan}11`,
                }}>

                {/* 팀 헤더 */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{team.name}</h3>
                      <p className="text-[11px] mt-0.5" style={{ color: S.cyan }}>
                        완료 {team.completed_count || 0}/16장
                      </p>
                    </div>
                    {/* 팀 코드 */}
                    <button onClick={() => copyCode(team.join_code)}
                      className="flex flex-col items-end gap-1">
                      <p className="text-[9px] font-mono" style={{ color: S.cyan }}>팀 코드</p>
                      <div className="px-3 py-1.5 rounded-lg font-black font-mono text-sm transition"
                        style={{
                          background: copiedCode === team.join_code ? `${S.cyan}20` : 'rgba(0,0,0,0.4)',
                          color: copiedCode === team.join_code ? S.cyan : '#fff',
                          border: `1.5px solid ${copiedCode === team.join_code ? S.cyan : S.cyan + '44'}`,
                          boxShadow: copiedCode === team.join_code ? `0 0 12px ${S.cyan}66` : `0 0 8px ${S.cyan}22`,
                          textShadow: copiedCode === team.join_code ? `0 0 6px ${S.cyan}` : 'none',
                        }}>
                        {copiedCode === team.join_code ? '✓ 복사됨' : team.join_code}
                      </div>
                    </button>
                  </div>

                  {/* 학생 명단 */}
                  {!isEditing ? (
                    <div>
                      {members.length === 0 ? (
                        <p className="text-[12px] mb-3" style={{ color: '#666' }}>아직 학생 명단이 없어요</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {members.map(m => (
                            <span key={m.id}
                              className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                              style={{
                                background: m.is_leader ? `${S.cyan}20` : 'rgba(255,255,255,0.06)',
                                color: m.is_leader ? S.cyan : '#aaa',
                                border: `1px solid ${m.is_leader ? S.cyan + '66' : 'rgba(255,255,255,0.08)'}`,
                                boxShadow: m.is_leader ? `0 0 8px ${S.cyan}33` : 'none',
                              }}>
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
                        style={{
                          background: 'rgba(0,0,0,0.3)',
                          border: `1px solid ${S.cyan}33`,
                          color: S.cyan,
                        }}>
                        {members.length === 0 ? '+ 학생 명단 입력' : '✏️ 명단 수정'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] mb-2" style={{ color: S.cyan }}>
                        {`>`} 한 줄에 한 명씩 입력 · 첫 번째 학생이 자동으로 팀장이 됩니다
                      </p>
                      <textarea
                        value={memberInputs[team.id] || ''}
                        onChange={e => setMemberInputs(prev => ({ ...prev, [team.id]: e.target.value }))}
                        placeholder={"이서연\n김민준\n박서아\n정하율"}
                        rows={5}
                        className="w-full px-3 py-2.5 rounded-xl text-[13px] text-white leading-relaxed resize-none mb-3"
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: `1.5px solid ${S.cyan}55`,
                          outline: 'none',
                          fontFamily: 'monospace',
                          boxShadow: `inset 0 0 8px ${S.cyan}11`,
                        }}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingTeamId(null)}
                          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#666' }}>
                          취소
                        </button>
                        <button onClick={() => handleSaveMembers(team.id)} disabled={saving}
                          className="flex-[2] py-2.5 rounded-xl text-[13px] font-black transition disabled:opacity-50"
                          style={{
                            background: S.cyan,
                            color: S.navy,
                            boxShadow: `0 0 16px ${S.cyan}66`,
                          }}>
                          {saving ? '저장 중...' : `> 저장하기`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ⭐⭐⭐ NEW: 진행도 + 카드 격자 펼침 ⭐⭐⭐ */}
                <button
                  onClick={() => setExpandedTeamId(prev => prev === team.id ? null : team.id)}
                  className="w-full px-4 pb-3 text-left hover:bg-white/5 transition group">
                  {/* 진행도 바 */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {(team.completed_count || 0) > 0 && (
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${((team.completed_count || 0) / 16) * 100}%`,
                            background: `linear-gradient(90deg, ${S.cyan}, ${S.purple})`,
                            boxShadow: `0 0 12px ${S.cyan}88`,
                          }} />
                      )}
                    </div>
                    <span className="text-[10px] font-mono"
                      style={{
                        color: expandedTeamId === team.id ? S.cyan : '#666',
                        transform: expandedTeamId === team.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'all 0.3s',
                        display: 'inline-block',
                      }}>
                      ▼
                    </span>
                  </div>
                  <p className="text-[10px] font-mono"
                    style={{ color: expandedTeamId === team.id ? S.cyan : '#666' }}>
                    {expandedTeamId === team.id ? '▲ 카드 진행 격자 접기' : '▼ 카드 진행 격자 보기'}
                  </p>
                </button>

                {/* 카드 진행 격자 (펼침) */}
                {expandedTeamId === team.id && (
                  <div className="px-4 pb-4 pt-1">
                    <ClassTeamCardGrid team={team} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
        /* QR 버튼 살짝 펄스 */
        .qr-btn {
          animation: qrPulse 2.5s ease-in-out infinite;
        }
        @keyframes qrPulse {
          0%, 100% { box-shadow: 0 6px 20px rgba(255,215,0,0.4); }
          50% { box-shadow: 0 8px 28px rgba(255,215,0,0.7); }
        }

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
        .sparkle-1 { top: 15%; left: 10%; animation: sparkleAnim 2.5s ease-in-out 0s infinite; }
        .sparkle-2 { top: 60%; left: 75%; animation: sparkleAnim 2.5s ease-in-out 0.7s infinite; }
        .sparkle-3 { top: 25%; right: 15%; animation: sparkleAnim 2.5s ease-in-out 1.2s infinite; }
        .sparkle-4 { bottom: 20%; left: 30%; animation: sparkleAnim 2.5s ease-in-out 1.8s infinite; }

        /* 랭킹 버튼 글로우 펄스 */
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

        /* 빛 신호 */
        .detail-signal-1 { animation: detailSignalRight 5s linear infinite; }
        @keyframes detailSignalRight {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
        .detail-signal-2 { animation: detailSignalLeft 6s linear infinite 0.5s; }
        @keyframes detailSignalLeft {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        /* 떠다니는 입자 */
        .detail-particle {
          animation-name: detailParticleTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes detailParticleTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}

// ⭐⭐⭐ NEW: 학급 페이지용 카드 진행 격자 컴포넌트 ⭐⭐⭐
const CARD_NAMES_FULL: Record<string, string> = {
  '01': '시장 개요', '02': '시장 분석', '03': '세분화', '04': '경쟁 분석',
  '05': '시장 기회', '06': '규제', '07': '고객 여정', '08': '비즈니스 모델',
  '09': '가격 전략', '10': '제품 전략', '11': '유통 채널', '12': '마케팅',
  '13': 'GTM 실행', '14': '리스크', '15': '성장 전략', '16': 'TBT·인증',
};

function ClassTeamCardGrid({ team }: { team: Team }) {
  const completedIds = team.completed_card_ids || [];
  const completedSet = new Set(completedIds);

  // 진행 중 카드 = 완료한 카드 중 가장 마지막의 다음 번호
  let inProgressId: string | null = null;
  if (completedIds.length > 0 && completedIds.length < 16) {
    const lastCompletedNum = parseInt(completedIds[completedIds.length - 1], 10);
    const nextNum = lastCompletedNum + 1;
    if (nextNum <= 16) {
      inProgressId = String(nextNum).padStart(2, '0');
    }
  } else if (completedIds.length === 0) {
    inProgressId = '01';
  }

  return (
    <div>
      <p className="text-[10px] font-mono tracking-widest font-bold mb-2"
        style={{ color: S.cyan, textShadow: `0 0 6px ${S.cyan}66` }}>
        🃏 CARD PROGRESS
      </p>

      {/* 8x2 격자 (16개) */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        {Array.from({ length: 16 }, (_, i) => {
          const cardId = String(i + 1).padStart(2, '0');
          const isCompleted = completedSet.has(cardId);
          const isInProgress = cardId === inProgressId;

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
            className = 'class-card-in-progress-pulse';
          }

          return (
            <div key={cardId}
              className={`rounded ${className}`}
              style={{
                aspectRatio: '1',
                background: bg,
                color: color,
                border: border,
                boxShadow: boxShadow,
                fontSize: '10px',
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

      {/* 범례 */}
      <div className="flex items-center gap-2 text-[9px] font-mono mb-2" style={{ color: '#888' }}>
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

      {/* 현재 진행 카드 */}
      {inProgressId && CARD_NAMES_FULL[inProgressId] && (
        <div className="rounded-lg px-3 py-2"
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
        <div className="rounded-lg px-3 py-2 text-center"
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
        @keyframes classCardInProgressPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .class-card-in-progress-pulse {
          animation: classCardInProgressPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
