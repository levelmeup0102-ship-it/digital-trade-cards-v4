'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentTeacher, getClasses, createClass, createTeams, signOut } from '@/lib/teacher';
import type { Teacher, Class } from '@/lib/teacher';

const S = {
  green: '#E7FE55',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // 수업 생성 폼
  const [form, setForm] = useState({ name: '', school: '', schedule: '', description: '', teamCount: 3 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    (async () => {
      const t = await getCurrentTeacher();
      if (!t) { router.push('/teacher'); return; }
      setTeacher(t);
      const c = await getClasses(t.id);
      setClasses(c);
      setLoading(false);
    })();
  }, [router]);

  const handleCreateClass = async () => {
    if (!form.name.trim()) { setCreateError('수업 이름을 입력해주세요.'); return; }
    setCreating(true); setCreateError('');
    try {
      const newClass = await createClass(teacher!.id, {
        name: form.name,
        school: form.school || teacher!.school,
        schedule: form.schedule,
        description: form.description,
      });
      await createTeams(newClass.id, form.teamCount);
      setClasses(prev => [newClass, ...prev]);
      setShowCreate(false);
      setForm({ name: '', school: '', schedule: '', description: '', teamCount: 3 });
      router.push(`/teacher/class/${newClass.id}`);
    } catch (e: any) {
      setCreateError(e.message || '오류가 발생했습니다.');
    } finally { setCreating(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/teacher');
  };

  const statusLabel = { draft: '준비중', active: '진행중', completed: '완료' };
  const statusColor = { draft: '#666', active: S.cyan, completed: S.purple };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <p className="font-mono text-sm" style={{ color: S.cyan }}>{`>`} 불러오는 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen px-3 md:px-4 py-4 md:py-6 relative overflow-hidden"
      style={{ background: S.bg }}>

      {/* ⭐⭐⭐ 오로라 배경 ⭐⭐⭐ */}

      {/* 메시 그라디언트 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, ${S.blue}14 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      {/* 빛 신호 4개 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute dash-signal-1"
          style={{
            top: '15%',
            left: 0,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
        <div className="absolute dash-signal-2"
          style={{
            top: '50%',
            right: 0,
            width: '120px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.purple}, transparent)`,
            boxShadow: `0 0 14px ${S.purple}, 0 0 28px ${S.purple}66`,
          }} />
        <div className="absolute dash-signal-3"
          style={{
            top: '85%',
            left: 0,
            width: '90px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.blue}, transparent)`,
            boxShadow: `0 0 14px ${S.blue}, 0 0 28px ${S.blue}66`,
          }} />
      </div>

      {/* 떠다니는 빛 입자 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 12 }).map((_, i) => {
          const colors = [S.cyan, S.purple, S.blue];
          const left = (i * 13 + 7) % 100;
          const top = (i * 19 + 13) % 100;
          const size = 1.5 + (i % 3) * 0.5;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full dash-particle"
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

      <div className="max-w-lg mx-auto relative z-10">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5 md:mb-6 gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] md:text-[11px] tracking-[3px] md:tracking-[4px] font-mono font-bold"
              style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}AA` }}>
              SIGNAL
            </p>
            <h1 className="text-lg md:text-xl font-black text-white"
              style={{ textShadow: `0 0 12px ${S.cyan}55` }}>
              관리자 대시보드
            </h1>
            <p className="text-[11px] md:text-[12px] truncate"
              style={{ color: S.cyan }}>
              {teacher?.name} · {teacher?.school}
            </p>
          </div>
          <button onClick={handleSignOut}
            className="text-[11px] md:text-[12px] hover:text-gray-400 transition flex-shrink-0 px-2 py-1 rounded-lg"
            style={{ color: '#666', border: `1px solid ${S.cyan}22` }}>
            로그아웃
          </button>
        </div>

        {/* 새 수업 만들기 버튼 */}
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="cyber-cta-btn relative w-full py-3.5 md:py-4 font-black rounded-2xl text-[13px] md:text-[14px] mb-5 md:mb-6 transition-all hover:scale-[1.02] overflow-hidden"
            style={{
              background: S.cyan,
              color: S.navy,
              boxShadow: `0 8px 24px -8px ${S.cyan}AA, 0 0 24px ${S.cyan}55`,
            }}>
            <span className="relative z-10">{`>`} 새 수업 만들기</span>
          </button>
        )}

        {/* 수업 생성 폼 */}
        {showCreate && (
          <div className="rounded-2xl p-4 md:p-5 mb-5 md:mb-6"
            style={{
              background: `${S.cyan}08`,
              border: `1.5px solid ${S.cyan}40`,
              boxShadow: `0 0 24px ${S.cyan}22, inset 0 0 16px ${S.cyan}11`,
            }}>
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-[15px] md:text-base font-black text-white">{`>`} 새 수업 만들기</h2>
              <button onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="text-gray-600 text-xs md:text-sm hover:text-gray-400 px-2 py-1">닫기</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>{`>`} 수업 이름 *</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예) 인천대 디지털무역 워크숍 1차"
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl text-white text-[13px] md:text-sm transition"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: form.name ? `1.5px solid ${S.cyan}` : `1px solid ${S.cyan}33`,
                    outline: 'none',
                    boxShadow: form.name ? `0 0 12px ${S.cyan}55, inset 0 0 8px ${S.cyan}22` : 'none',
                  }} />
              </div>
              <div>
                <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>{`>`} 소속 (학교 / 기관 / 회사)</p>
                <input value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
                  placeholder={teacher?.school || '소속'}
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl text-white text-[13px] md:text-sm transition"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${S.cyan}33`,
                    outline: 'none',
                  }} />
              </div>
              <div>
                <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>{`>`} 일정</p>
                <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  placeholder="예) 2026년 5월 3주차 토요일"
                  className="w-full px-3 py-2.5 md:py-3 rounded-xl text-white text-[13px] md:text-sm transition"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${S.cyan}33`,
                    outline: 'none',
                  }} />
              </div>
              <div>
                <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>
                  {`>`} 팀 수 <span style={{ color: '#666' }}>(자동으로 팀 코드 발급)</span>
                </p>
                <div className="grid grid-cols-6 gap-1.5 md:gap-2">
                  {[2, 3, 4, 5, 6, 8].map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, teamCount: n }))}
                      className="py-2 md:py-2.5 rounded-lg text-[12px] md:text-[13px] font-bold transition"
                      style={{
                        background: form.teamCount === n ? S.cyan : 'rgba(255,255,255,0.04)',
                        color: form.teamCount === n ? S.navy : '#888',
                        border: `1px solid ${form.teamCount === n ? S.cyan : S.cyan + '22'}`,
                        boxShadow: form.teamCount === n ? `0 0 12px ${S.cyan}66` : 'none',
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {createError && <p className="text-red-400 text-[11px] md:text-[12px]">⚠ {createError}</p>}
              <button onClick={handleCreateClass} disabled={creating || !form.name.trim()}
                className="cyber-cta-btn relative w-full py-3 font-black rounded-xl text-[13px] md:text-[14px] transition disabled:opacity-30 overflow-hidden"
                style={{
                  background: S.cyan,
                  color: S.navy,
                  boxShadow: `0 0 20px ${S.cyan}55`,
                }}>
                <span className="relative z-10">
                  {creating ? '생성 중...' : `> 수업 생성 + ${form.teamCount}개 팀 자동 생성 →`}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 수업 목록 */}
        <div className="mb-3 md:mb-4 flex items-center justify-between">
          <p className="text-[13px] md:text-sm font-bold text-white">
            <span style={{ color: S.cyan }}>{`>`}</span> 수업 목록 ({classes.length}개)
          </p>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <p className="text-[13px] md:text-[14px]" style={{ color: '#666' }}>아직 수업이 없어요</p>
            <p className="text-[11px] md:text-[12px] mt-1" style={{ color: '#555' }}>위에서 첫 수업을 만들어보세요!</p>
          </div>
        ) : (
          <div className="space-y-2.5 md:space-y-3">
            {classes.map(cls => (
              <button key={cls.id}
                onClick={() => router.push(`/teacher/class/${cls.id}`)}
                className="w-full text-left rounded-2xl p-3.5 md:p-4 transition hover:scale-[1.01] cyber-class-card"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${S.cyan}33`,
                  boxShadow: `0 0 16px ${S.cyan}11`,
                }}>
                <div className="flex items-start justify-between mb-1.5 md:mb-2 gap-2">
                  <h3 className="text-[15px] md:text-base font-bold text-white min-w-0 break-words">{cls.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono flex-shrink-0"
                    style={{
                      background: `${statusColor[cls.status]}20`,
                      color: statusColor[cls.status],
                      border: `1px solid ${statusColor[cls.status]}55`,
                      boxShadow: `0 0 8px ${statusColor[cls.status]}44`,
                    }}>
                    {statusLabel[cls.status]}
                  </span>
                </div>
                <p className="text-[11px] md:text-[12px]" style={{ color: '#888' }}>{cls.school}</p>
                {cls.schedule && <p className="text-[10px] md:text-[11px] mt-1" style={{ color: '#666' }}>📅 {cls.schedule}</p>}
                <p className="text-[10px] md:text-[11px] mt-2 font-mono" style={{ color: S.cyan }}>
                  {`>`} 팀 관리 & 학생 명단 보기 →
                </p>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-6 md:mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
        /* 빛 신호 흐름 */
        .dash-signal-1 {
          animation: dashSignalRight 5s linear infinite;
        }
        .dash-signal-3 {
          animation: dashSignalRight 7s linear infinite 1.5s;
        }
        @keyframes dashSignalRight {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        .dash-signal-2 {
          animation: dashSignalLeft 6s linear infinite 0.5s;
        }
        @keyframes dashSignalLeft {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        /* 떠다니는 입자 */
        .dash-particle {
          animation-name: dashParticleTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes dashParticleTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        /* CTA 버튼 펄스 */
        .cyber-cta-btn {
          animation: ctaPulse 2.5s ease-in-out infinite;
        }
        @keyframes ctaPulse {
          0%, 100% {
            box-shadow: 0 8px 24px -8px ${S.cyan}AA, 0 0 24px ${S.cyan}55;
          }
          50% {
            box-shadow: 0 8px 32px -8px ${S.cyan}FF, 0 0 40px ${S.cyan}88;
          }
        }

        /* 수업 카드 호버 */
        .cyber-class-card:hover {
          background: rgba(6, 182, 212, 0.08) !important;
          border-color: ${S.cyan}88 !important;
          box-shadow: 0 0 24px ${S.cyan}33 !important;
        }
      `}</style>
    </div>
  );
}
