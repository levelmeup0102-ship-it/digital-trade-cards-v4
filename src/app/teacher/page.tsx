'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/teacher';

const S = {
  green: '#E7FE55',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
};

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden"
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
        <div className="absolute admin-signal-1"
          style={{
            top: '15%',
            left: 0,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
        <div className="absolute admin-signal-2"
          style={{
            top: '45%',
            right: 0,
            width: '120px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.purple}, transparent)`,
            boxShadow: `0 0 14px ${S.purple}, 0 0 28px ${S.purple}66`,
          }} />
        <div className="absolute admin-signal-3"
          style={{
            top: '78%',
            left: 0,
            width: '90px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.blue}, transparent)`,
            boxShadow: `0 0 14px ${S.blue}, 0 0 28px ${S.blue}66`,
          }} />
        <div className="absolute admin-signal-vertical"
          style={{
            left: '15%',
            top: 0,
            width: '2px',
            height: '80px',
            background: `linear-gradient(180deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
      </div>

      {/* 떠다니는 빛 입자 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 15 }).map((_, i) => {
          const colors = [S.cyan, S.purple, S.blue];
          const left = (i * 11 + 7) % 100;
          const top = (i * 17 + 13) % 100;
          const size = 1.5 + (i % 3) * 0.5;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full admin-particle"
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

      <div className="w-full max-w-sm relative z-10">

        {/* 로고 */}
        <div className="text-center mb-6 md:mb-8 relative">
          {/* 로고 뒤 글로우 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-32 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse, ${S.cyan}25 0%, transparent 70%)`,
              filter: 'blur(20px)',
            }} />

          <p className="text-[10px] md:text-[11px] tracking-[5px] md:tracking-[6px] font-mono font-bold mb-1.5 md:mb-2 relative"
            style={{ color: S.cyan, textShadow: `0 0 10px ${S.cyan}AA` }}>
            ConnectAI
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-1 relative"
            style={{ textShadow: `0 0 20px ${S.cyan}66, 0 0 40px ${S.purple}33` }}>
            SIGNAL
          </h1>
          <div className="flex items-center justify-center gap-2 relative">
            <div className="h-[1px] w-6"
              style={{ background: `linear-gradient(to right, transparent, ${S.cyan})` }} />
            <p className="text-[11px] md:text-[12px] font-mono font-bold tracking-[2px]"
              style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}66` }}>
              관리자 포털
            </p>
            <div className="h-[1px] w-6"
              style={{ background: `linear-gradient(to left, transparent, ${S.purple})` }} />
          </div>
        </div>

        {/* 탭 */}
        <div className="flex rounded-xl overflow-hidden mb-5 md:mb-6"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${S.cyan}33` }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2.5 md:py-3 text-[12px] md:text-[13px] font-bold transition-all"
              style={{
                background: mode === m ? S.cyan : 'transparent',
                color: mode === m ? S.navy : '#666',
                boxShadow: mode === m ? `0 0 20px ${S.cyan}66` : 'none',
              }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 안내 */}
        <div className="rounded-xl p-3 mb-3 md:mb-4"
          style={{
            background: `${S.cyan}08`,
            border: `1px solid ${S.cyan}22`,
            boxShadow: `inset 0 0 12px ${S.cyan}11`,
          }}>
          <p className="text-[10px] md:text-[11px] leading-relaxed"
            style={{ color: S.cyan }}>
            {mode === 'login'
              ? '💡 가입 시 입력한 이름·소속·비밀번호로 로그인하세요'
              : '💡 이메일 없이 이름과 비밀번호만으로 가입합니다'}
          </p>
        </div>

        {/* 폼 */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>{`>`} 이름</p>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="예) 홍길동"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-white text-[14px] md:text-sm transition"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: name ? `1.5px solid ${S.cyan}` : `1px solid ${S.cyan}33`,
                outline: 'none',
                boxShadow: name ? `0 0 16px ${S.cyan}55, inset 0 0 8px ${S.cyan}22` : 'none',
              }} />
          </div>

          <div>
            <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>{`>`} 소속</p>
            <input value={school} onChange={e => setSchool(e.target.value)}
              placeholder="예) 인천대학교"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-white text-[14px] md:text-sm transition"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: school ? `1.5px solid ${S.cyan}` : `1px solid ${S.cyan}33`,
                outline: 'none',
                boxShadow: school ? `0 0 16px ${S.cyan}55, inset 0 0 8px ${S.cyan}22` : 'none',
              }} />
          </div>

          <div>
            <p className="text-[10px] md:text-[11px] mb-1 font-mono" style={{ color: S.cyan }}>{`>`} 비밀번호</p>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="6자 이상"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full px-3 md:px-4 py-3 md:py-3.5 rounded-xl text-white text-[14px] md:text-sm transition"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: password ? `1.5px solid ${S.cyan}` : `1px solid ${S.cyan}33`,
                outline: 'none',
                boxShadow: password ? `0 0 16px ${S.cyan}55, inset 0 0 8px ${S.cyan}22` : 'none',
              }} />
          </div>

          {error && <p className="text-red-400 text-[11px] md:text-[12px]">⚠ {error}</p>}

          <button onClick={handleSubmit} disabled={loading || !name || !school || !password}
            className="cyber-cta-btn relative w-full py-3.5 md:py-4 font-black rounded-xl text-[14px] md:text-[15px] transition-all disabled:opacity-30 mt-2 hover:scale-[1.01] overflow-hidden"
            style={{
              background: S.cyan,
              color: S.navy,
              boxShadow: `0 8px 24px -8px ${S.cyan}AA, 0 0 24px ${S.cyan}55`,
            }}>
            <span className="relative z-10">
              {loading ? '처리 중...' : mode === 'login' ? `> 로그인 →` : `> 가입하기 →`}
            </span>
          </button>
        </div>

        {/* 학생 링크 */}
        <div className="text-center mt-5 md:mt-6">
          <p className="text-gray-600 text-[11px] md:text-[12px]">학생이신가요?</p>
          <a href="/student/join" className="text-[11px] md:text-[12px] underline font-bold"
            style={{ color: S.purple, textShadow: `0 0 8px ${S.purple}66` }}>
            학생 입장 화면으로 →
          </a>
        </div>

        <p className="text-center text-gray-700 text-[10px] mt-6 md:mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
        /* 빛 신호 흐름 */
        .admin-signal-1 {
          animation: adminSignalRight 5s linear infinite;
        }
        .admin-signal-3 {
          animation: adminSignalRight 7s linear infinite 1.5s;
        }
        @keyframes adminSignalRight {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        .admin-signal-2 {
          animation: adminSignalLeft 6s linear infinite 0.5s;
        }
        @keyframes adminSignalLeft {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        .admin-signal-vertical {
          animation: adminSignalDown 6s linear infinite;
        }
        @keyframes adminSignalDown {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        /* 떠다니는 입자 */
        .admin-particle {
          animation-name: adminParticleTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes adminParticleTwinkle {
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
      `}</style>
    </div>
  );
}
