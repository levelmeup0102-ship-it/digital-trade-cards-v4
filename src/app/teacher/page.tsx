'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };

export default function TeacherAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      if (!name.trim() || !school.trim() || !password) {
        setError('이름, 소속, 비밀번호를 모두 입력해주세요.'); setLoading(false); return;
      }
      if (password.length < 6) {
        setError('비밀번호는 6자 이상이어야 합니다.'); setLoading(false); return;
      }
      if (mode === 'login') {
        await signIn(name, school, password);
      } else {
        await signUp(name, school, password);
      }
      router.push('/teacher/dashboard');
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6" style={{ background: S.bg }}>
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-6 md:mb-8">
          <p className="text-[10px] md:text-[11px] tracking-[5px] md:tracking-[6px] text-gray-600 font-mono mb-1.5 md:mb-2">ConnectAI</p>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-1">SIGNAL</h1>
          <p className="text-gray-500 text-xs md:text-sm">관리자 포털</p>
        </div>

        {/* 탭 */}
        <div className="flex rounded-xl overflow-hidden mb-5 md:mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2.5 md:py-3 text-[12px] md:text-[13px] font-bold transition-all"
              style={{ background: mode === m ? S.green : 'transparent', color: mode === m ? S.navy : '#666' }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 안내 */}
        <div className="rounded-xl p-3 mb-3 md:mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] md:text-[11px] text-gray-500 leading-relaxed">
            {mode === 'login'
              ? '💡 가입 시 입력한 이름·소속·비밀번호로 로그인하세요'
              : '💡 이메일 없이 이름과 비밀번호만으로 가입합니다'}
          </p>
        </div>

        {/* 폼 */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] md:text-[11px] text-gray-500 mb-1">이름</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="예) 홍길동"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-white text-[14px] md:text-sm transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: name ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
          </div>

          <div>
            <p className="text-[10px] md:text-[11px] text-gray-500 mb-1">소속 (학교 / 기관 / 회사)</p>
            <input value={school} onChange={e => setSchool(e.target.value)}
              placeholder="예) 인천대학교"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-white text-[14px] md:text-sm transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: school ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
          </div>

          <div>
            <p className="text-[10px] md:text-[11px] text-gray-500 mb-1">비밀번호</p>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="6자 이상"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-white text-[14px] md:text-sm transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: password ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
          </div>

          {error && <p className="text-red-400 text-[11px] md:text-[12px]">⚠ {error}</p>}

          <button onClick={handleSubmit} disabled={loading || !name || !school || !password}
            className="w-full py-3.5 md:py-4 font-black rounded-xl text-[14px] md:text-[15px] transition-all disabled:opacity-30 mt-2 hover:scale-[1.01]"
            style={{ background: S.green, color: S.navy, boxShadow: `0 8px 24px -8px ${S.green}66` }}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인 →' : '가입하기 →'}
          </button>
        </div>

        {/* 학생 링크 */}
        <div className="text-center mt-5 md:mt-6">
          <p className="text-gray-700 text-[11px] md:text-[12px]">학생이신가요?</p>
          <a href="/student/join" className="text-[11px] md:text-[12px] underline" style={{ color: S.aqua }}>
            학생 입장 화면으로 →
          </a>
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-6 md:mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>
    </div>
  );
}
