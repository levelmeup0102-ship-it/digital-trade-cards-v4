'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/teacher';

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };

export default function TeacherAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        router.push('/teacher/dashboard');
      } else {
        if (!name.trim() || !school.trim()) {
          setError('이름과 학교를 입력해주세요.'); setLoading(false); return;
        }
        await signUp(email, password, name, school);
        setSuccess('가입 완료! 이메일 인증 후 로그인해주세요.');
        setMode('login');
      }
    } catch (e: any) {
      if (e.message?.includes('Invalid login')) setError('이메일 또는 비밀번호가 틀렸습니다.');
      else if (e.message?.includes('already registered')) setError('이미 가입된 이메일입니다.');
      else setError(e.message || '오류가 발생했습니다.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: S.bg }}>
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <p className="text-[11px] tracking-[6px] text-gray-600 font-mono mb-2">ConnectAI</p>
          <h1 className="text-4xl font-black text-white mb-1">SIGNAL</h1>
          <p className="text-gray-500 text-sm">선생님 포털</p>
        </div>

        {/* 탭 */}
        <div className="flex rounded-xl overflow-hidden mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
              className="flex-1 py-2.5 text-[13px] font-bold transition-all"
              style={{ background: mode === m ? S.green : 'transparent', color: mode === m ? S.navy : '#666' }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <div className="space-y-3">
          {mode === 'signup' && (
            <>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">이름</p>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm transition"
                  style={{ background: 'rgba(255,255,255,0.06)', border: name ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-1">학교</p>
                <input value={school} onChange={e => setSchool(e.target.value)}
                  placeholder="인천대학교"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm transition"
                  style={{ background: 'rgba(255,255,255,0.06)', border: school ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
              </div>
            </>
          )}
          <div>
            <p className="text-[11px] text-gray-500 mb-1">이메일</p>
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="teacher@school.ac.kr"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 rounded-xl text-white text-sm transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: email ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
          </div>
          <div>
            <p className="text-[11px] text-gray-500 mb-1">비밀번호</p>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="6자 이상"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-4 py-3 rounded-xl text-white text-sm transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: password ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
          </div>

          {error && <p className="text-red-400 text-[12px]">⚠ {error}</p>}
          {success && <p className="text-[12px]" style={{ color: S.green }}>✓ {success}</p>}

          <button onClick={handleSubmit} disabled={loading || !email || !password}
            className="w-full py-3.5 font-black rounded-xl text-[14px] transition-all disabled:opacity-30 mt-2"
            style={{ background: S.green, color: S.navy }}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인 →' : '가입하기 →'}
          </button>
        </div>

        {/* 학생 링크 */}
        <div className="text-center mt-6">
          <p className="text-gray-700 text-[12px]">학생이신가요?</p>
          <a href="/" className="text-[12px] underline" style={{ color: S.aqua }}>학생 입장 화면으로 →</a>
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>
    </div>
  );
}
