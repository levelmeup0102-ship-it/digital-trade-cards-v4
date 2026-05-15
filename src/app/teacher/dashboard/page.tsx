'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentTeacher, getClasses, createClass, createTeams, signOut, deleteClass, getReportCountForClass } from '@/lib/teacher';
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

// ⭐ 난이도 옵션 (student/join에 있는 것과 동일)
const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string; description: string }> = {
  basic:    { label: '초급', emoji: '🌱', timer: 1800, minChars: 20,  color: '#059669', description: '30분 · 20자 이상 답변' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50,  color: '#4FB0C6', description: '20분 · 50자 이상 답변' },
  advanced: { label: '심화', emoji: '🚀', timer: 900,  minChars: 100, color: '#582C83', description: '15분 · 100자 이상 답변' },
};

// ⭐ NEW: 팀 수 자주 쓰는 옵션 (3, 5, 8, 10, 15, 20)
const TEAM_QUICK_OPTIONS = [3, 5, 8, 10, 15, 20];
const MIN_TEAMS = 1;
const MAX_TEAMS = 20;

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // 클립보드 복사 피드백
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 수업 생성 폼
  const [form, setForm] = useState({
    name: '',
    school: '',
    schedule: '',
    description: '',
    teamCount: 3,
    level: 'standard',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // ⭐⭐⭐ NEW: 학급 삭제 ⭐⭐⭐
  const [deleteTargetClass, setDeleteTargetClass] = useState<Class | null>(null);
  const [deleteReportCount, setDeleteReportCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  // ⭐ NEW: 팀 수 증감 함수
  const incrementTeams = () => {
    setForm(f => ({ ...f, teamCount: Math.min(MAX_TEAMS, f.teamCount + 1) }));
  };
  const decrementTeams = () => {
    setForm(f => ({ ...f, teamCount: Math.max(MIN_TEAMS, f.teamCount - 1) }));
  };
  const setTeamsDirect = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setForm(f => ({ ...f, teamCount: MIN_TEAMS }));
      return;
    }
    const clamped = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, num));
    setForm(f => ({ ...f, teamCount: clamped }));
  };

  const handleCreateClass = async () => {
    if (!form.name.trim()) { setCreateError('수업 이름을 입력해주세요.'); return; }
    if (form.teamCount < MIN_TEAMS || form.teamCount > MAX_TEAMS) {
      setCreateError(`팀 수는 ${MIN_TEAMS}~${MAX_TEAMS} 사이여야 합니다.`);
      return;
    }
    setCreating(true); setCreateError('');
    try {
      const newClass = await createClass(teacher!.id, {
        name: form.name,
        school: form.school || teacher!.school,
        schedule: form.schedule,
        description: form.description,
        level: form.level,
      });
      await createTeams(newClass.id, form.teamCount);
      setClasses(prev => [newClass, ...prev]);
      setShowCreate(false);
      setForm({ name: '', school: '', schedule: '', description: '', teamCount: 3, level: 'standard' });
      router.push(`/teacher/class/${newClass.id}`);
    } catch (e: any) {
      setCreateError(e.message || '오류가 발생했습니다.');
    } finally { setCreating(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/teacher');
  };

  // 학급 코드 클립보드 복사
  const handleCopyJoinCode = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // ⭐⭐⭐ NEW: 학급 삭제 핸들러 ⭐⭐⭐
  const openDeleteClassModal = async (e: React.MouseEvent, cls: Class) => {
    e.stopPropagation();
    setDeleteTargetClass(cls);
    setDeleteError('');
    setDeleteReportCount(0);
    // 보고서 개수 비동기 로드
    const count = await getReportCountForClass(cls.id);
    setDeleteReportCount(count);
  };

  const closeDeleteClassModal = () => {
    if (deleting) return;
    setDeleteTargetClass(null);
    setDeleteError('');
    setDeleteReportCount(0);
  };

  const handleDeleteClass = async () => {
    if (!deleteTargetClass || deleting) return;
    setDeleteError('');
    setDeleting(true);

    try {
      const result = await deleteClass(deleteTargetClass.id);
      if (!result.success) {
        setDeleteError(result.error || '삭제에 실패했어요.');
        setDeleting(false);
        return;
      }
      // 로컬 state에서도 즉시 제거
      setClasses(prev => prev.filter(c => c.id !== deleteTargetClass.id));
      setDeleteTargetClass(null);
      setDeleteReportCount(0);
      setDeleting(false);
    } catch (e: any) {
      setDeleteError(e.message || '삭제 중 오류가 발생했어요.');
      setDeleting(false);
    }
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

      {/* 빛 신호 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute dash-signal-1"
          style={{
            top: '15%', left: 0, width: '100px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
        <div className="absolute dash-signal-2"
          style={{
            top: '50%', right: 0, width: '120px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.purple}, transparent)`,
            boxShadow: `0 0 14px ${S.purple}, 0 0 28px ${S.purple}66`,
          }} />
        <div className="absolute dash-signal-3"
          style={{
            top: '85%', left: 0, width: '90px', height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.blue}, transparent)`,
            boxShadow: `0 0 14px ${S.blue}, 0 0 28px ${S.blue}66`,
          }} />
      </div>

      {/* 떠다니는 입자 */}
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
            className="cyber-cta-btn relative w-full py-3.5 md:py-4 font-black rounded-2xl text-[13px] md:text-[14px] mb-3 transition-all hover:scale-[1.02] overflow-hidden"
            style={{
              background: S.cyan,
              color: S.navy,
              boxShadow: `0 8px 24px -8px ${S.cyan}AA, 0 0 24px ${S.cyan}55`,
            }}>
            <span className="relative z-10">{`>`} 새 수업 만들기</span>
          </button>
        )}

        {/* 체험판 QR 보기 버튼 */}
        {!showCreate && (
          <button onClick={() => router.push('/teacher/demo-qr')}
            className="relative w-full py-3 md:py-3.5 font-bold rounded-2xl text-[12px] md:text-[13px] mb-5 md:mb-6 transition-all hover:scale-[1.01] overflow-hidden group"
            style={{
              background: `${S.purple}15`,
              border: `1px solid ${S.purple}66`,
              color: S.purple,
              boxShadow: `0 0 16px ${S.purple}33`,
              textShadow: `0 0 8px ${S.purple}66`,
            }}>
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>⚡ 체험판 QR 보기</span>
              <span className="text-[10px] opacity-70">— 박람회 / 오리엔테이션 용</span>
            </span>
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

              {/* ⭐ 난이도 선택 */}
              <div>
                <p className="text-[10px] md:text-[11px] mb-1.5 font-mono" style={{ color: S.cyan }}>
                  {`>`} 수업 난이도 <span style={{ color: '#666' }}>(전체 팀에 적용)</span>
                </p>
                <div className="space-y-1.5">
                  {Object.entries(LEVELS).map(([k, v]) => (
                    <button key={k} onClick={() => setForm(f => ({ ...f, level: k }))}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition"
                      style={{
                        background: form.level === k ? `${v.color}25` : 'rgba(255,255,255,0.04)',
                        border: form.level === k ? `1.5px solid ${v.color}` : `1px solid ${S.cyan}22`,
                        boxShadow: form.level === k ? `0 0 14px ${v.color}44` : 'none',
                      }}>
                      <span className="text-xl">{v.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] md:text-[14px] font-bold text-white">{v.label}</p>
                        <p className="text-[10px] md:text-[11px]" style={{ color: form.level === k ? v.color : '#888' }}>
                          {v.description}
                        </p>
                      </div>
                      {form.level === k && (
                        <span className="text-[14px] flex-shrink-0" style={{ color: v.color }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* ⭐⭐⭐ NEW: 팀 수 (1-20, 자주 쓰는 옵션 + 직접 입력) */}
              <div>
                <p className="text-[10px] md:text-[11px] mb-1.5 font-mono" style={{ color: S.cyan }}>
                  {`>`} 팀 수 <span style={{ color: '#666' }}>(1~{MAX_TEAMS}, 자동으로 팀 코드 발급)</span>
                </p>

                {/* 자주 쓰는 옵션 (3, 5, 8, 10, 15, 20) */}
                <p className="text-[10px] mb-1.5" style={{ color: '#888' }}>자주 쓰는 옵션</p>
                <div className="grid grid-cols-6 gap-1.5 md:gap-2 mb-3">
                  {TEAM_QUICK_OPTIONS.map(n => (
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

                {/* 직접 입력 (-/+ 증감 버튼) */}
                <p className="text-[10px] mb-1.5" style={{ color: '#888' }}>또는 직접 입력</p>
                <div className="flex items-center gap-2 rounded-xl p-2"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: `1px solid ${S.cyan}33`,
                  }}>
                  <button
                    onClick={decrementTeams}
                    disabled={form.teamCount <= MIN_TEAMS}
                    className="w-10 h-10 rounded-lg font-black text-lg flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: `${S.cyan}15`,
                      color: S.cyan,
                      border: `1px solid ${S.cyan}44`,
                    }}>
                    −
                  </button>

                  <div className="flex-1 flex items-center justify-center gap-2">
                    <input
                      type="number"
                      min={MIN_TEAMS}
                      max={MAX_TEAMS}
                      value={form.teamCount}
                      onChange={e => setTeamsDirect(e.target.value)}
                      onBlur={e => setTeamsDirect(e.target.value)}
                      className="w-16 text-center bg-transparent text-white font-black text-xl outline-none"
                      style={{
                        fontFamily: 'monospace',
                        textShadow: `0 0 8px ${S.cyan}AA`,
                      }}
                    />
                    <span className="text-[14px] text-gray-400 font-bold">팀</span>
                  </div>

                  <button
                    onClick={incrementTeams}
                    disabled={form.teamCount >= MAX_TEAMS}
                    className="w-10 h-10 rounded-lg font-black text-lg flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: `${S.cyan}15`,
                      color: S.cyan,
                      border: `1px solid ${S.cyan}44`,
                    }}>
                    +
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 text-center" style={{ color: '#666' }}>
                  최소 {MIN_TEAMS}팀 · 최대 {MAX_TEAMS}팀
                </p>
              </div>

              {/* 학급 코드 자동 생성 안내 */}
              <div className="rounded-lg p-2.5 flex items-center gap-2"
                style={{
                  background: `${S.green}10`,
                  border: `1px solid ${S.green}33`,
                }}>
                <span className="text-[16px]">🎫</span>
                <p className="text-[10.5px] md:text-[11px] leading-relaxed" style={{ color: '#bbb' }}>
                  <span style={{ color: S.green, fontWeight: 700 }}>학급 코드 자동 생성</span> —
                  수업 생성 시 학급 코드(예: CL-AB-X7K2)가 자동으로 발급됩니다.
                </p>
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
            {classes.map(cls => {
              const lvlInfo = cls.level ? LEVELS[cls.level] : null;
              return (
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lvlInfo && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${lvlInfo.color}25`,
                            color: lvlInfo.color,
                            border: `1px solid ${lvlInfo.color}55`,
                          }}>
                          {lvlInfo.emoji} {lvlInfo.label}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full font-mono"
                        style={{
                          background: `${statusColor[cls.status]}20`,
                          color: statusColor[cls.status],
                          border: `1px solid ${statusColor[cls.status]}55`,
                          boxShadow: `0 0 8px ${statusColor[cls.status]}44`,
                        }}>
                        {statusLabel[cls.status]}
                      </span>
                      {/* ⭐⭐⭐ NEW: 학급 삭제 버튼 ⭐⭐⭐ */}
                      <button
                        onClick={(e) => openDeleteClassModal(e, cls)}
                        title="학급 삭제"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110"
                        style={{
                          background: 'rgba(239,68,68,0.12)',
                          border: '1px solid rgba(239,68,68,0.35)',
                          color: '#FCA5A5',
                          fontSize: '12px',
                          lineHeight: 1,
                          cursor: 'pointer',
                        }}>
                        🗑
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] md:text-[12px]" style={{ color: '#888' }}>{cls.school}</p>
                  {cls.schedule && <p className="text-[10px] md:text-[11px] mt-1" style={{ color: '#666' }}>📅 {cls.schedule}</p>}

                  {cls.join_code && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span
                        onClick={(e) => handleCopyJoinCode(e, cls.join_code!)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] md:text-[12px] font-mono font-bold cursor-pointer transition-all hover:scale-[1.03]"
                        style={{
                          background: copiedCode === cls.join_code ? `${S.green}25` : `${S.green}12`,
                          color: copiedCode === cls.join_code ? S.green : S.green,
                          border: `1px solid ${S.green}${copiedCode === cls.join_code ? '88' : '40'}`,
                          boxShadow: copiedCode === cls.join_code
                            ? `0 0 12px ${S.green}66`
                            : `0 0 6px ${S.green}22`,
                        }}>
                        <span>🎫</span>
                        <span>{cls.join_code}</span>
                        <span className="text-[10px] opacity-70">
                          {copiedCode === cls.join_code ? '✓ 복사됨' : '📋 복사'}
                        </span>
                      </span>
                    </div>
                  )}

                  <p className="text-[10px] md:text-[11px] mt-2 font-mono" style={{ color: S.cyan }}>
                    {`>`} 팀 관리 & 학생 명단 보기 →
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-gray-700 text-[10px] mt-6 md:mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      {/* ⭐⭐⭐ NEW: 학급 삭제 확인 모달 ⭐⭐⭐ */}
      {deleteTargetClass && (() => {
        const inProgress = deleteTargetClass.game_started_at != null;
        const hasReports = deleteReportCount > 0;
        return (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
            onClick={closeDeleteClassModal}>
            <div className="max-w-md w-full rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(20,15,15,0.98) 0%, rgba(40,15,15,0.95) 100%)',
                border: '1.5px solid rgba(239,68,68,0.5)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(239,68,68,0.3)',
              }}
              onClick={(e) => e.stopPropagation()}>
              <p className="text-[10px] font-mono tracking-widest mb-2 font-bold"
                style={{ color: '#FCA5A5' }}>
                {`>`} 학급 삭제
              </p>
              <h3 className="text-lg font-black text-white mb-3">
                🗑 {deleteTargetClass.name} 학급을 삭제할까요?
              </h3>

              {/* 게임 진행 중 경고 */}
              {inProgress && (
                <div className="rounded-xl p-3 mb-3"
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1.5px solid rgba(239,68,68,0.5)',
                  }}>
                  <p className="text-[13px] font-black text-white mb-1.5 flex items-center gap-1.5">
                    <span className="text-base">⚠️</span>
                    <span>게임 진행 중입니다!</span>
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#FCA5A5' }}>
                    학생들이 작성 중인 모든 내용이<br/>
                    삭제되며 복구할 수 없어요.
                  </p>
                </div>
              )}

              {/* 보고서 있음 경고 */}
              {hasReports && (
                <div className="rounded-xl p-3 mb-3"
                  style={{
                    background: 'rgba(255,215,0,0.10)',
                    border: '1.5px solid rgba(255,215,0,0.45)',
                  }}>
                  <p className="text-[13px] font-black text-white mb-1.5 flex items-center gap-1.5">
                    <span className="text-base">📚</span>
                    <span>이 학급에 보고서가 {deleteReportCount}개 있어요</span>
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: '#FFE082' }}>
                    삭제하면 보고서도 함께 사라져요.<br/>
                    <span className="font-bold">PDF로 미리 다운받으셨나요?</span>
                  </p>
                </div>
              )}

              <div className="rounded-xl p-3 mb-4"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-[12px] text-white mb-1.5" style={{ opacity: 0.85 }}>
                  📋 삭제될 항목:
                </p>
                <ul className="text-[11px] text-white ml-3 space-y-0.5" style={{ opacity: 0.7 }}>
                  <li>• 학급 (이름, 학급 코드)</li>
                  <li>• 모든 팀과 팀원 정보</li>
                  <li>• 모든 카드 응답·인사이트·점수</li>
                  <li>• 모든 보고서 ({deleteReportCount}개)</li>
                </ul>
              </div>

              <p className="text-[11px] text-center mb-4" style={{ color: '#FCA5A5' }}>
                ⚠️ 삭제 후에는 되돌릴 수 없어요
              </p>

              {deleteError && (
                <div className="rounded-xl px-3 py-2 mb-3 text-[12px] text-center"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)', color: '#FCA5A5' }}>
                  ⚠️ {deleteError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={closeDeleteClassModal}
                  disabled={deleting}
                  className="py-3 rounded-xl text-[13px] font-bold transition disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc' }}>
                  취소
                </button>
                <button onClick={handleDeleteClass}
                  disabled={deleting}
                  className="py-3 rounded-xl text-[13px] font-black transition disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                  }}>
                  {deleting ? '처리 중...' : '🗑 학급 삭제'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx>{`
        .dash-signal-1 { animation: dashSignalRight 5s linear infinite; }
        .dash-signal-3 { animation: dashSignalRight 7s linear infinite 1.5s; }
        @keyframes dashSignalRight {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        .dash-signal-2 { animation: dashSignalLeft 6s linear infinite 0.5s; }
        @keyframes dashSignalLeft {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        .dash-particle {
          animation-name: dashParticleTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes dashParticleTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        .cyber-cta-btn { animation: ctaPulse 2.5s ease-in-out infinite; }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 8px 24px -8px ${S.cyan}AA, 0 0 24px ${S.cyan}55; }
          50% { box-shadow: 0 8px 32px -8px ${S.cyan}FF, 0 0 40px ${S.cyan}88; }
        }

        .cyber-class-card:hover {
          background: rgba(6, 182, 212, 0.08) !important;
          border-color: ${S.cyan}88 !important;
          box-shadow: 0 0 24px ${S.cyan}33 !important;
        }

        /* number input 스피너 제거 */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
