'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CARD_COLORS } from '@/data/cardData';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  navy: '#111111',
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function getIntroCards(isMobile: boolean) {
  const distance = isMobile ? 130 : 240;
  return Array.from({ length: 16 }, (_, i) => {
    const id = String(i + 1).padStart(2, '0');
    const angle = (360 / 16) * i - 90;
    const finalRotate = angle + 90;
    return {
      id,
      color: CARD_COLORS[id]?.bg || '#4FB0C6',
      angle,
      distance,
      x: Math.cos((angle * Math.PI) / 180) * distance,
      y: Math.sin((angle * Math.PI) / 180) * distance,
      finalRotate,
      delay: 1.4 + i * 0.03,
    };
  });
}

function getFireworkParticles(isMobile: boolean) {
  const baseDistance = isMobile ? 150 : 250;
  return Array.from({ length: isMobile ? 18 : 24 }, (_, i) => {
    const angle = (360 / (isMobile ? 18 : 24)) * i + Math.random() * 10;
    const distance = baseDistance + Math.random() * (isMobile ? 60 : 150);
    const colors = [S.green, S.aqua, '#FFC72C', '#FF6F61', '#C1A8F0', '#4FB0C6', '#FF671F', '#FFFFFF'];
    return {
      id: i,
      angle,
      distance,
      x: Math.cos((angle * Math.PI) / 180) * distance,
      y: Math.sin((angle * Math.PI) / 180) * distance,
      color: colors[i % colors.length],
      size: (isMobile ? 3 : 4) + Math.random() * 4,
      delay: Math.random() * 0.15,
    };
  });
}

export default function DemoIntroPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [introDone, setIntroDone] = useState(false);

  // 9초 후 자동으로 게임 페이지로
  useEffect(() => {
    const t = setTimeout(() => {
      setIntroDone(true);
      setTimeout(() => router.push('/demo/play'), 300);
    }, 9000);
    return () => clearTimeout(t);
  }, [router]);

  const introCards = getIntroCards(isMobile);
  const fireworkParticles = getFireworkParticles(isMobile);

  const cardOneW = isMobile ? 70 : 110;
  const cardOneH = isMobile ? 100 : 155;
  const cardW = isMobile ? 42 : 60;
  const cardH = isMobile ? 60 : 84;
  const containerH = isMobile ? 400 : 600;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden"
      style={{
        opacity: introDone ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}>

      {/* 체험판 표시 (우측 상단) */}
      <div className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full font-mono text-[10px] font-bold tracking-widest"
        style={{
          background: `${S.cyan}15`,
          border: `1px solid ${S.cyan}66`,
          color: S.cyan,
          textShadow: `0 0 6px ${S.cyan}66`,
        }}>
        ⚡ 체험판 DEMO
      </div>

      <div className="relative w-full flex items-center justify-center"
        style={{ height: `${containerH}px`, maxWidth: '100%' }}>

        {[0, 1, 2, 3].map(i => (
          <div key={`pulse-${i}`} className="absolute signal-pulse-ring pointer-events-none"
            style={{
              width: `${isMobile ? 140 : 280}px`,
              height: `${isMobile ? 140 : 280}px`,
              top: '50%',
              left: '50%',
              borderRadius: '50%',
              border: `2px solid ${i % 2 === 0 ? S.cyan : S.purple}`,
              boxShadow: `0 0 20px ${i % 2 === 0 ? S.cyan : S.purple}AA, inset 0 0 20px ${i % 2 === 0 ? S.cyan : S.purple}44`,
              zIndex: 5,
              animationDelay: `${1.4 + i * 0.6}s, 0s`,
            }} />
        ))}

        <div className="absolute card-aurora-glow pointer-events-none"
          style={{
            width: `${cardOneW * 3}px`,
            height: `${cardOneW * 3}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${S.cyan}33 0%, ${S.purple}22 35%, ${S.blue}11 60%, transparent 80%)`,
            filter: 'blur(20px)',
            zIndex: 4,
          }} />

        <div className="absolute cube-inner-card pointer-events-none"
          style={{
            width: `${cardOneW}px`,
            height: `${cardOneH}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${S.cyan}EE, ${S.purple}EE)`,
            border: `2px solid #FFFFFF`,
            boxShadow: `0 0 30px ${S.cyan}, 0 0 60px ${S.cyan}88, inset 0 0 20px rgba(255,255,255,0.3)`,
            opacity: 0,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            fontFamily: 'monospace',
            color: '#FFFFFF',
            textShadow: '0 0 8px rgba(255,255,255,0.8)',
          }}>
          <span style={{ fontSize: isMobile ? '9px' : '12px', opacity: 0.9, letterSpacing: '2px' }}>SIGNAL</span>
          <span style={{ fontSize: isMobile ? '24px' : '36px', fontWeight: 900, marginTop: '4px' }}>?</span>
        </div>

        {fireworkParticles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              top: '50%',
              left: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              animation: `particleBurst 1.8s cubic-bezier(0.16, 1, 0.3, 1) ${3.8 + p.delay}s forwards`,
              opacity: 0,
              '--burst-x': `${p.x}px`,
              '--burst-y': `${p.y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
            } as React.CSSProperties}
          />
        ))}

        {introCards.map((card) => (
          <div
            key={card.id}
            className="absolute rounded-xl flex flex-col items-center justify-center text-white font-black"
            style={{
              top: '50%',
              left: '50%',
              width: `${cardW}px`,
              height: `${cardH}px`,
              background: card.color,
              boxShadow: `0 8px 24px ${card.color}66, 0 0 30px ${card.color}55`,
              animation: `cardElegantSpread 2.5s cubic-bezier(0.16, 1, 0.3, 1) ${3.8 + card.delay}s forwards, cardDimAndBrighten 3s ease-in-out 6.5s forwards`,
              transformOrigin: 'center center',
              transform: 'translate(-50%, -50%) scale(0)',
              opacity: 0,
              '--final-x': `${card.x}px`,
              '--final-y': `${card.y}px`,
              '--final-rotate': `${card.finalRotate}deg`,
              zIndex: 15,
            } as React.CSSProperties}
          >
            <span style={{ fontSize: isMobile ? '7px' : '9px', fontFamily: 'monospace', opacity: 0.8 }}>CARD</span>
            <span style={{ fontSize: isMobile ? '11px' : '14px', fontFamily: 'monospace' }}>{card.id}</span>
          </div>
        ))}
      </div>

      <div className="absolute pointer-events-none light-burst"
        style={{
          top: '50%',
          left: '50%',
          width: isMobile ? '300px' : '450px',
          height: isMobile ? '300px' : '450px',
          background: 'radial-gradient(circle, #FFFFFF 0%, #06B6D4 40%, #8B5CF6 70%, transparent 100%)',
          borderRadius: '50%',
          opacity: 0,
          zIndex: 25,
          filter: 'blur(6px)',
        }} />

      <div className="absolute pointer-events-none aurora-halo"
        style={{
          top: '50%',
          left: '50%',
          width: isMobile ? '700px' : '1100px',
          height: isMobile ? '700px' : '1100px',
          background: 'radial-gradient(circle, #06B6D455 0%, #8B5CF633 30%, #3B82F622 60%, transparent 85%)',
          borderRadius: '50%',
          opacity: 0,
          zIndex: 27,
          filter: 'blur(40px)',
        }} />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: 0,
          animation: 'introLogoFade 1.2s ease-out 7.0s forwards',
          zIndex: 30,
        }}>
        <div className="text-center relative">
          <p className="text-[10px] md:text-[12px] tracking-[5px] md:tracking-[7px] uppercase mb-2 md:mb-3 font-mono font-bold relative"
            style={{ color: '#06B6D4', textShadow: '0 0 12px #06B6D4AA' }}>
            ConnectAI
          </p>
          <h1 className="font-black text-white tracking-tight mb-2 md:mb-3 relative logo-glow-text"
            style={{
              fontSize: isMobile ? '4rem' : '7rem',
              lineHeight: 1,
              textShadow: `0 0 20px #FFFFFFAA, 0 0 40px #06B6D488, 0 0 80px #8B5CF666, 0 0 120px #3B82F644`,
            }}>
            SIGNAL
          </h1>
          <div className="flex items-center justify-center gap-2 md:gap-3 relative">
            <div className="h-[1px] w-8 md:w-12" style={{ background: `linear-gradient(to right, transparent, #06B6D4)` }} />
            <p className="text-[12px] md:text-base font-bold tracking-[2px] md:tracking-[3px] font-mono"
              style={{ color: '#C1E8EB', textShadow: '0 0 12px #06B6D466' }}>
              DIGITAL TRADE CARDS
            </p>
            <div className="h-[1px] w-8 md:w-12" style={{ background: `linear-gradient(to left, transparent, #8B5CF6)` }} />
          </div>
          <p className="mt-3 md:mt-4 text-[10px] md:text-[11px] font-mono tracking-widest"
            style={{ color: S.cyan, opacity: 0.7 }}>
            ⚡ DEMO VERSION ⚡
          </p>
        </div>
      </div>

      <style jsx>{`
        .signal-pulse-ring {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0);
          animation: signalPulseExpand 2.5s ease-out infinite, signalPulseFinalHide 0.3s ease-out 3.6s forwards;
        }
        @keyframes signalPulseExpand {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          15% { opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        @keyframes signalPulseFinalHide {
          0% { opacity: 0; }
          100% { opacity: 0; visibility: hidden; }
        }
        .card-aurora-glow {
          opacity: 0;
          animation: auroraGlowEnter 1.2s ease-out 1.2s forwards, auroraGlowPulse 2.5s ease-in-out 2.4s 1, auroraGlowFinalHide 0.6s ease-in 3.6s forwards;
        }
        @keyframes auroraGlowEnter {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes auroraGlowPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes auroraGlowFinalHide {
          0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); filter: brightness(2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); filter: brightness(3); visibility: hidden; }
        }
        .cube-inner-card {
          animation: cubeInnerCardEnter 1s ease-out 1.4s forwards, cubeInnerCardPulse 1.4s ease-in-out 2.4s infinite, cubeInnerCardExplode 0.6s ease-in 3.6s forwards;
        }
        @keyframes cubeInnerCardEnter {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(-180deg); }
          60% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(10deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
        }
        @keyframes cubeInnerCardPulse {
          0%, 100% { box-shadow: 0 0 30px ${S.cyan}, 0 0 60px ${S.cyan}88, inset 0 0 20px rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 50px #FFFFFF, 0 0 90px ${S.cyan}, inset 0 0 30px rgba(255,255,255,0.6); }
        }
        @keyframes cubeInnerCardExplode {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2.5); filter: brightness(8); }
        }
        @keyframes cardElegantSpread {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(0deg); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1) rotate(0deg); }
          60% {
            opacity: 1;
            transform: translate(calc(-50% + var(--final-x) * 0.85), calc(-50% + var(--final-y) * 0.85)) scale(1.05) rotate(calc(var(--final-rotate) * 0.85));
          }
          100% {
            opacity: 1;
            transform: translate(calc(-50% + var(--final-x)), calc(-50% + var(--final-y))) scale(1) rotate(var(--final-rotate));
          }
        }
        @keyframes cardDimAndBrighten {
          0% { filter: brightness(1); }
          30% { filter: brightness(0.4); }
          60% { filter: brightness(0.4); }
          100% { filter: brightness(1.1); }
        }
        @keyframes particleBurst {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          20% { opacity: 1; transform: translate(calc(-50% + var(--burst-x) * 0.3), calc(-50% + var(--burst-y) * 0.3)) scale(1.5); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--burst-x)), calc(-50% + var(--burst-y))) scale(0.3); }
        }
        @keyframes introLogoFade {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        .logo-glow-text { animation: logoGlowPulse 3s ease-in-out 8s infinite; }
        @keyframes logoGlowPulse {
          0%, 100% { text-shadow: 0 0 20px #FFFFFFAA, 0 0 40px #06B6D488, 0 0 80px #8B5CF666; }
          50% { text-shadow: 0 0 30px #FFFFFFFF, 0 0 60px #06B6D4DD, 0 0 100px #8B5CF688; }
        }
        .light-burst {
          transform: translate(-50%, -50%) scale(0.05);
          animation: lightBurstScale 0.8s ease-out 6.5s forwards;
        }
        @keyframes lightBurstScale {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.05); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(0.7); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        .aurora-halo {
          transform: translate(-50%, -50%) scale(0.05);
          animation: auroraHaloScale 2.2s ease-out 6.7s forwards;
        }
        @keyframes auroraHaloScale {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.05); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(0.75); }
          100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
