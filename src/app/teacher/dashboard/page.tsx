'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentTeacher, getClasses, createClass, createTeams, signOut } from '@/lib/teacher';
import type { Teacher, Class } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };

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
      // 팀 자동 생성
      await createTeams(newClass.id, form.teamCount);
      setClasses(prev => [newClass, ...prev]);
      setShowCreate(false);
      setForm({ name: '', school: '', schedule: '', description: '', teamCount: 3 });
      // 수업 상세로 이동
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
  const statusColor = { draft: '#666', active: S.green, completed: S.aqua };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <p className="text-gray-500 font-mono text-sm">불러오는 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-6" style={{ background: S.bg }}>
      <div className="max-w-lg mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
            <h1 className="text-xl font-black text-white">관리자 대시보드</h1>
            <p className="text-[12px] text-gray-500">{teacher?.name} · {teacher?.school}</p>
          </div>
          <button onClick={handleSignOut}
            className="text-[12px] text-gray-600 hover:text-gray-400 transition">
            로그아웃
          </button>
        </div>

        {/* 새 수업 만들기 버튼 */}
        {!showCreate && (
          <button onClick={() => setShowCreate(true)}
            className="w-full py-4 font-black rounded-2xl text-[14px] mb-6 transition-all hover:scale-[1.02]"
            style={{ background: S.green, color: S.navy }}>
            + 새 수업 만들기
          </button>
        )}

        {/* 수업 생성 폼 */}
        {showCreate && (
          <div className="rounded-2xl p-5 mb-6"
            style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white">새 수업 만들기</h2>
              <button onClick={() => { setShowCreate(false); setCreateError(''); }}
                className="text-gray-600 text-sm hover:text-gray-400">닫기</button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-gray-500 mb-1">수업 이름 *</p>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예) 인천대 디지털무역 워크숍 1차"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: form.name ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">소속 (학교 / 기관 / 회사)</p>
                <input value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
                  placeholder={teacher?.school || '소속'}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">일정</p>
                <input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  placeholder="예) 2026년 5월 3주차 토요일"
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">팀 수 <span className="text-gray-600">(자동으로 팀 코드 발급)</span></p>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6, 8].map(n => (
                    <button key={n} onClick={() => setForm(f => ({ ...f, teamCount: n }))}
                      className="flex-1 py-2 rounded-lg text-[13px] font-bold transition"
                      style={{ background: form.teamCount === n ? S.green : 'rgba(255,255,255,0.06)', color: form.teamCount === n ? S.navy : '#666', border: `1px solid ${form.teamCount === n ? S.green : 'rgba(255,255,255,0.1)'}` }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {createError && <p className="text-red-400 text-[12px]">⚠ {createError}</p>}
              <button onClick={handleCreateClass} disabled={creating || !form.name.trim()}
                className="w-full py-3 font-black rounded-xl text-[14px] transition disabled:opacity-30"
                style={{ background: S.green, color: S.navy }}>
                {creating ? '생성 중...' : `수업 생성 + ${form.teamCount}개 팀 자동 생성 →`}
              </button>
            </div>
          </div>
        )}

        {/* 수업 목록 */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-white">수업 목록 ({classes.length}개)</p>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 text-[14px]">아직 수업이 없어요</p>
            <p className="text-gray-700 text-[12px] mt-1">위에서 첫 수업을 만들어보세요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map(cls => (
              <button key={cls.id}
                onClick={() => router.push(`/teacher/class/${cls.id}`)}
                className="w-full text-left rounded-2xl p-4 transition hover:scale-[1.01]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-white">{cls.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono"
                    style={{ background: `${statusColor[cls.status]}20`, color: statusColor[cls.status] }}>
                    {statusLabel[cls.status]}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500">{cls.school}</p>
                {cls.schedule && <p className="text-[11px] text-gray-600 mt-1">📅 {cls.schedule}</p>}
                <p className="text-[11px] mt-2" style={{ color: S.aqua }}>팀 관리 & 학생 명단 보기 →</p>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>
    </div>
  );
}
