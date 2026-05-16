'use client';
import { useEffect, useRef } from 'react';

/**
 * SIGNAL 인트로 화면 (시안 v5)
 * - 학급 QR 스캔 후 학급 페이지 진입 시 표시
 * - 첫 진입만 5초 강제, 그 다음부터 자동 스킵 (sessionStorage 'dtc_intro_seen_v1')
 *
 * 디자인:
 * - 별빛 40개 (cyan/purple/pink/lime)
 * - 빛 줄기 5가닥 무한 반복
 * - 입자 80개 (사방→중앙)
 * - 회로선 4가닥 + 노드 2개
 * - SIGNAL 로고 (정적, 펄스 없음)
 * - CONNECTAI / DIGITAL TRADE CARDS 부제
 */

interface SignalIntroProps {
  onComplete: () => void;
  durationMs?: number; // 기본 5000 (5초)
}

export default function SignalIntro({ onComplete, durationMs = 5000 }: SignalIntroProps) {
  const completedRef = useRef(false);
  const signalRunIdRef = useRef(0);

  // 5초 후 자동 완료
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, durationMs);
    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

  // 별빛, 빛 줄기, 입자 동적 생성
  useEffect(() => {
    const stars = document.getElementById('intro-stars');
    const signals = document.getElementById('intro-signals');
    const particles = document.getElementById('intro-particles');
    if (!stars || !signals || !particles) return;

    // 별빛 40개
    const starColors = ['#06B6D4', '#8B5CF6', '#FF6FB5', '#E7FE55'];
    stars.innerHTML = '';
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div');
      const size = Math.random() < 0.3 ? 2 : 1;
      const color = starColors[i % starColors.length];
      s.style.position = 'absolute';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.borderRadius = '50%';
      s.style.background = color;
      s.style.boxShadow = '0 0 ' + (size * 4) + 'px ' + color;
      s.style.animation = 'introStarTwinkle ' + (2 + Math.random() * 3) + 's ease-in-out ' + (Math.random() * 2) + 's infinite';
      stars.appendChild(s);
    }

    // 빛 줄기 무한 반복
    signalRunIdRef.current++;
    const myId = signalRunIdRef.current;
    signals.innerHTML = '';

    const lineColors = [
      { c: '#06B6D4', opacity: 0.7 },
      { c: '#8B5CF6', opacity: 0.6 },
      { c: '#FF6FB5', opacity: 0.5 },
      { c: '#E7FE55', opacity: 0.45 },
      { c: '#06B6D4', opacity: 0.4 },
    ];

    const spawnLine = (col: { c: string; opacity: number }, lineEl: HTMLDivElement) => {
      if (signalRunIdRef.current !== myId) return;
      const fromLeft = Math.random() < 0.5;
      const topPos = 10 + Math.random() * 80;
      const width = 80 + Math.random() * 60;
      const duration = 2.5 + Math.random() * 2;

      lineEl.style.transition = 'none';
      lineEl.style.top = topPos + '%';
      lineEl.style.left = fromLeft ? '-' + width + 'px' : 'calc(100% + 20px)';
      lineEl.style.width = width + 'px';
      lineEl.style.transform = 'translateX(0)';
      lineEl.style.opacity = '0';

      requestAnimationFrame(() => {
        lineEl.style.transition = 'transform ' + duration + 's linear, opacity 0.4s ease';
        lineEl.style.opacity = String(col.opacity);
        const targetX = fromLeft ? '420px' : '-500px';
        lineEl.style.transform = 'translateX(' + targetX + ')';
      });

      const gap = 0.3 + Math.random() * 1.2;
      setTimeout(() => {
        if (signalRunIdRef.current !== myId) return;
        spawnLine(col, lineEl);
      }, (duration + gap) * 1000);
    };

    lineColors.forEach((col, i) => {
      const line = document.createElement('div');
      line.style.position = 'absolute';
      line.style.height = '2px';
      line.style.background = 'linear-gradient(90deg, transparent, ' + col.c + ', transparent)';
      line.style.boxShadow = '0 0 12px ' + col.c + ', 0 0 24px ' + col.c + '66';
      line.style.opacity = '0';
      signals.appendChild(line);

      setTimeout(() => {
        spawnLine(col, line);
      }, i * 500);
    });

    // 입자 80개 (사방→중앙)
    particles.innerHTML = '';
    const particleColors = ['#06B6D4', '#8B5CF6', '#3B82F6', '#FF6FB5', '#E7FE55'];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 220;
      const startX = Math.cos(angle) * dist;
      const startY = Math.sin(angle) * dist;
      const size = 1.5 + Math.random() * 3;
      const color = particleColors[i % particleColors.length];
      const delay = Math.random() * 0.6;
      const duration = 1.8 + Math.random() * 0.8;

      p.style.position = 'absolute';
      p.style.top = '50%';
      p.style.left = '50%';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.borderRadius = '50%';
      p.style.background = color;
      p.style.boxShadow = '0 0 ' + (size * 4) + 'px ' + color + ', 0 0 ' + (size * 8) + 'px ' + color + '66';
      p.style.transform = 'translate(calc(-50% + ' + startX + 'px), calc(-50% + ' + startY + 'px))';
      p.style.opacity = '0';
      p.style.transition = 'transform ' + duration + 's cubic-bezier(0.4, 0, 0.2, 1) ' + delay + 's, opacity 0.5s ease ' + delay + 's';

      particles.appendChild(p);

      requestAnimationFrame(() => {
        p.style.opacity = '0.9';
        setTimeout(() => {
          p.style.transform = 'translate(-50%, -50%) scale(0.2)';
          p.style.opacity = '0';
        }, 100);
      });
    }

    // cleanup
    return () => {
      signalRunIdRef.current++; // 무한 루프 중단
    };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-[200]"
      style={{ background: '#000000' }}>

      {/* 별빛 */}
      <div id="intro-stars" className="absolute inset-0 pointer-events-none" />

      {/* 배경 글로우 */}
      <div id="intro-bg-glow"
        className="absolute inset-0 pointer-events-none intro-bg-glow"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0) 0%, transparent 70%)',
        }} />

      {/* 빛 줄기 */}
      <div id="intro-signals" className="absolute inset-0 pointer-events-none overflow-hidden" />

      {/* 입자 */}
      <div id="intro-particles" className="absolute inset-0 pointer-events-none" />

      {/* 회로선 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <svg
          className="intro-circuit"
          width="100%"
          height="100%"
          viewBox="0 0 1600 400"
          preserveAspectRatio="none"
          style={{ opacity: 0, transition: 'opacity 0.8s ease', maxHeight: '70vh' }}>
          <path className="intro-cp intro-cp1" d="M 0,200 Q 400,100 800,200 T 1600,200" stroke="#06B6D4" strokeWidth="1.8" fill="none" strokeDasharray="3300" strokeDashoffset="3300" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 8px #06B6D4)' }} />
          <path className="intro-cp intro-cp2" d="M 0,200 Q 400,300 800,200 T 1600,200" stroke="#8B5CF6" strokeWidth="1.8" fill="none" strokeDasharray="3300" strokeDashoffset="3300" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 8px #8B5CF6)' }} />
          <path className="intro-cp intro-cp3" d="M 0,120 Q 800,260 1600,120" stroke="#FF6FB5" strokeWidth="1.2" fill="none" strokeDasharray="3300" strokeDashoffset="3300" opacity="0.6" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 4px #FF6FB5)' }} />
          <path className="intro-cp intro-cp4" d="M 0,280 Q 800,140 1600,280" stroke="#E7FE55" strokeWidth="1.2" fill="none" strokeDasharray="3300" strokeDashoffset="3300" opacity="0.5" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 4px #E7FE55)' }} />
          <circle className="intro-node intro-node1" cx="0" cy="200" r="3" fill="#06B6D4" opacity="0" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 8px #06B6D4)' }} />
          <circle className="intro-node intro-node2" cx="1600" cy="200" r="3" fill="#8B5CF6" opacity="0" vectorEffect="non-scaling-stroke" style={{ filter: 'drop-shadow(0 0 8px #8B5CF6)' }} />
        </svg>
      </div>

      {/* 로고 + 부제 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center intro-logo-wrap" style={{ opacity: 0 }}>

        {/* ━ CONNECTAI ━ */}
        <div className="intro-top-line flex items-center gap-2 mb-2.5" style={{ opacity: 0 }}>
          <span className="block w-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, #06B6D4)', boxShadow: '0 0 4px #06B6D4' }} />
          <p className="text-[11px] font-mono font-medium m-0"
            style={{ letterSpacing: '6px', color: '#06B6D4', textShadow: '0 0 10px rgba(6,182,212,0.7)' }}>
            CONNECTAI
          </p>
          <span className="block w-6 h-px" style={{ background: 'linear-gradient(90deg, #06B6D4, transparent)', boxShadow: '0 0 4px #06B6D4' }} />
        </div>

        {/* SIGNAL 메인 타이틀 */}
        <div className="relative py-2 px-5">
          {/* 배경 글로우 (제거됨 — 로고 주변 퍼짐 없애기) */}

          {/* 블러 그림자 (등장 효과) */}
          <h1 className="intro-title-shadow absolute font-black m-0"
            style={{
              top: '8px',
              left: '20px',
              fontSize: 'clamp(56px, 14vw, 96px)',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-2px',
              filter: 'blur(16px)',
              opacity: 0,
              zIndex: 1,
            }}>
            SIGNAL
          </h1>

          {/* 메인 타이틀 (선명) */}
          <h1 className="intro-main-title font-black m-0 relative"
            style={{
              fontSize: 'clamp(56px, 14vw, 96px)',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #FFFFFF 0%, #C1E8EB 40%, #FFFFFF 60%, #06B6D4 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-2px',
              opacity: 0,
              transform: 'scale(0.95)',
              filter: 'blur(8px)',
              zIndex: 2,
            }}>
            SIGNAL
          </h1>

          {/* 하단 밑줄 */}
          <div className="intro-underline absolute h-[1.5px] left-[20%] right-[20%] bottom-[-2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #06B6D4, #8B5CF6, transparent)',
              boxShadow: '0 0 8px #06B6D4',
              transform: 'scaleX(0)',
              transformOrigin: 'center',
            }} />
        </div>

        {/* DIGITAL TRADE CARDS */}
        <p className="intro-sub-bottom text-[11px] font-mono m-0 mt-3"
          style={{
            color: '#C1E8EB',
            letterSpacing: '4px',
            opacity: 0,
            textShadow: '0 0 8px rgba(193,232,235,0.5)',
          }}>
          DIGITAL TRADE CARDS
        </p>

        {/* 점-선-점 데코 */}
        <div className="intro-bar-deco flex items-center gap-1.5 mt-5" style={{ opacity: 0 }}>
          <span className="w-1 h-1 rounded-full" style={{ background: '#06B6D4', boxShadow: '0 0 6px #06B6D4' }} />
          <span className="block w-4 h-px" style={{ background: '#06B6D4', boxShadow: '0 0 4px #06B6D4' }} />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8B5CF6', boxShadow: '0 0 8px #8B5CF6' }} />
          <span className="block w-4 h-px" style={{ background: '#8B5CF6', boxShadow: '0 0 4px #8B5CF6' }} />
          <span className="w-1 h-1 rounded-full" style={{ background: '#FF6FB5', boxShadow: '0 0 6px #FF6FB5' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes introStarTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }

        /* 회로 — 1.5초에 등장 */
        .intro-circuit {
          animation: introCircuitFade 1.2s ease 1.5s forwards;
        }
        @keyframes introCircuitFade {
          to { opacity: 0.35; }
        }
        .intro-cp1 { animation: introDashFade 1.4s ease 1.5s forwards; }
        .intro-cp2 { animation: introDashFade 1.4s ease 1.7s forwards; }
        .intro-cp3 { animation: introDashFade 1.6s ease 1.9s forwards; }
        .intro-cp4 { animation: introDashFade 1.6s ease 2.1s forwards; }
        @keyframes introDashFade {
          to { stroke-dashoffset: 0; }
        }
        .intro-node1 { animation: introNodeFade 0.6s ease 2.5s forwards; }
        .intro-node2 { animation: introNodeFade 0.6s ease 2.5s forwards; }
        @keyframes introNodeFade {
          to { opacity: 0.3; }
        }

        /* 배경 글로우 강해짐 */
        .intro-bg-glow {
          animation: introBgGlowFade 1.5s ease 3.2s forwards;
        }
        @keyframes introBgGlowFade {
          to { background: radial-gradient(circle at 50% 50%, rgba(6,182,212,0.35) 0%, rgba(139,92,246,0.15) 40%, transparent 70%); }
        }

        /* 로고 컨테이너 페이드인 */
        .intro-logo-wrap {
          animation: introFadeIn 1.5s ease 3.2s forwards;
        }
        @keyframes introFadeIn {
          to { opacity: 1; }
        }

        /* 메인 타이틀 — 흐릿→선명 */
        .intro-main-title {
          animation: introMainTitleEnter 1.5s ease 3.2s forwards;
        }
        @keyframes introMainTitleEnter {
          to {
            opacity: 1;
            transform: scale(1);
            filter: blur(0) drop-shadow(0 0 14px rgba(6,182,212,0.6)) drop-shadow(0 0 28px rgba(139,92,246,0.3));
          }
        }

        /* 블러 그림자 (백그라운드) */
        .intro-title-shadow {
          animation: introShadowFade 1.2s ease 3.7s forwards;
        }
        @keyframes introShadowFade {
          to { opacity: 0.7; }
        }

        /* CONNECTAI 위쪽 */
        .intro-top-line {
          animation: introFadeIn 1s ease 3.6s forwards;
        }

        /* 하단 밑줄 */
        .intro-underline {
          animation: introUnderlineExpand 1.2s ease 4s forwards;
        }
        @keyframes introUnderlineExpand {
          to { transform: scaleX(1); }
        }

        /* DIGITAL TRADE CARDS */
        .intro-sub-bottom {
          animation: introFadeIn 1s ease 4.2s forwards;
        }

        /* 점-선-점 데코 */
        .intro-bar-deco {
          animation: introFadeIn 1s ease 4.5s forwards;
        }
      `}</style>
    </div>
  );
}
