'use client';
import { useState, useEffect } from 'react';
import { RoleInfo } from '@/data/roleData';

interface RoleCardProps {
  role: RoleInfo;
  memberName: string;
  isMobile?: boolean;
  isCompact?: boolean;
}

export default function RoleCard({ role, memberName, isMobile, isCompact }: RoleCardProps) {
  const cardW = isCompact ? (isMobile ? 140 : 180) : (isMobile ? 280 : 340);
  const imgSize = isCompact ? (isMobile ? 60 : 80) : (isMobile ? 140 : 180);

  // ⭐ 이미지 로딩 상태
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showImage, setShowImage] = useState(false);

  // 이미지 로드 + 최소 0.6초 표시 (자연스러운 연출)
  useEffect(() => {
    const img = new window.Image();
    img.src = role.image;

    const minLoadTime = 600; // 최소 0.6초는 로딩 효과 보여주기
    const startTime = Date.now();

    img.onload = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadTime - elapsed);
      setTimeout(() => {
        setImgLoaded(true);
        // 살짝 후 이미지 표시 (글리치 → 이미지 전환)
        setTimeout(() => setShowImage(true), 150);
      }, remaining);
    };

    img.onerror = () => {
      // 에러여도 일단 보여줌
      setTimeout(() => {
        setImgLoaded(true);
        setShowImage(true);
      }, minLoadTime);
    };
  }, [role.image]);

  return (
    <div className="cyber-role-card relative rounded-2xl overflow-hidden"
      style={{
        width: `${cardW}px`,
        background: `linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(20,20,40,0.9) 100%)`,
        border: `2px solid ${role.color}66`,
        boxShadow: `0 0 24px ${role.color}33, inset 0 0 20px ${role.color}11`,
      }}>

      {/* 헤더 */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: `${role.color}1A`,
          borderBottom: `1px solid ${role.color}44`,
        }}>
        <span className="text-[8px] md:text-[9px] font-mono font-bold tracking-wider"
          style={{ color: role.color, textShadow: `0 0 6px ${role.color}` }}>
          SIGNAL.TRADE.CO
        </span>
        <span className="text-[8px] font-mono"
          style={{ color: role.color }}>
          ID·{role.idCode}
        </span>
      </div>

      {/* 이미지 영역 */}
      <div className="flex justify-center pt-3 pb-2 relative">
        {/* 이미지 뒤 글로우 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: `${imgSize * 1.3}px`,
            height: `${imgSize * 1.3}px`,
            background: `radial-gradient(circle, ${role.color}44 0%, transparent 70%)`,
            filter: 'blur(15px)',
          }} />

        <div className="relative rounded-xl overflow-hidden"
          style={{
            width: `${imgSize}px`,
            height: `${imgSize}px`,
            border: `2px solid ${role.color}`,
            boxShadow: `0 0 20px ${role.color}88`,
            background: `linear-gradient(135deg, ${role.color}33, ${role.color}11)`,
          }}>

            {/* ⭐ 로딩 효과 (이미지 로드 전) */}
            {!showImage && (
              <div className="absolute inset-0">
                {/* 격자 패턴 */}
                <div className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: `
                      linear-gradient(${role.color}66 1px, transparent 1px),
                      linear-gradient(90deg, ${role.color}66 1px, transparent 1px)
                    `,
                    backgroundSize: '12px 12px',
                  }} />

                {/* 데이터 비트 (0과 1) */}
                <div className="absolute inset-0 flex flex-col justify-center items-center font-mono text-[8px] data-bits"
                  style={{ color: `${role.color}AA` }}>
                  <div className="absolute top-2 left-2 opacity-60">01010111</div>
                  <div className="absolute top-2 right-2 opacity-60">10110001</div>
                  <div className="absolute bottom-2 left-2 opacity-60">11001010</div>
                  <div className="absolute bottom-2 right-2 opacity-60">00101101</div>
                </div>

                {/* 스캔라인 (위→아래) */}
                <div className="absolute left-0 right-0 h-1 cyber-scan-line"
                  style={{
                    background: `linear-gradient(180deg, transparent, ${role.color}, ${role.color}, transparent)`,
                    boxShadow: `0 0 12px ${role.color}, 0 0 24px ${role.color}`,
                  }} />

                {/* 중앙 LOADING 텍스트 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="font-mono font-bold loading-text"
                      style={{
                        fontSize: imgSize > 100 ? '11px' : '8px',
                        color: role.color,
                        textShadow: `0 0 8px ${role.color}`,
                        letterSpacing: '2px',
                      }}>
                      SCAN
                    </p>
                    <p className="font-mono loading-dots mt-0.5"
                      style={{
                        fontSize: imgSize > 100 ? '14px' : '10px',
                        color: role.color,
                        textShadow: `0 0 6px ${role.color}`,
                        fontWeight: 'bold',
                      }}>
                      ▰▰▰
                    </p>
                  </div>
                </div>

                {/* 글리치 효과 */}
                <div className="absolute inset-0 cyber-glitch-overlay pointer-events-none"
                  style={{
                    background: `linear-gradient(90deg, transparent 49%, ${role.color}33 50%, transparent 51%)`,
                  }} />
              </div>
            )}

            {/* 실제 이미지 */}
            <img src={role.image} alt={role.nameKr}
              className="w-full h-full object-cover absolute inset-0 role-card-img"
              style={{
                filter: 'saturate(1.1) contrast(1.05)',
                opacity: showImage ? 1 : 0,
                transition: 'opacity 0.5s ease-out',
              }}
              loading="eager"
              onLoad={() => {
                if (imgLoaded) setShowImage(true);
              }} />

            {/* 스캔라인 오버레이 (이미지 보일 때) */}
            {showImage && (
              <div className="absolute inset-0 pointer-events-none cyber-scanline-overlay"
                style={{
                  background: `linear-gradient(180deg, transparent 0%, ${role.color}15 50%, transparent 100%)`,
                  backgroundSize: '100% 4px',
                }} />
            )}
        </div>
      </div>

      {/* 이름 + 직무 */}
      <div className="px-3 pb-2 text-center">
        <p className={`${isCompact ? 'text-[13px] md:text-sm' : 'text-base md:text-lg'} font-black text-white`}>
          {memberName}
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="text-[9px]">{role.icon}</span>
          <p className="text-[10px] md:text-[11px] font-bold font-mono tracking-wide"
            style={{ color: role.color, textShadow: `0 0 6px ${role.color}88` }}>
            {role.nameKr}{role.isLeader ? ' · 팀장' : ''}
          </p>
        </div>
      </div>

      {/* 사이버 게이지 */}
      {!isCompact && (
        <div className="px-4 pb-3 space-y-1.5"
          style={{ borderTop: `1px solid ${role.color}22`, paddingTop: '10px' }}>
          {role.skills.map((skill, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono w-20 truncate"
                style={{ color: role.color }}>
                {skill.name}
              </span>
              <div className="flex-1 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex-1 h-1.5 rounded-sm transition-all"
                    style={{
                      background: j < skill.level ? role.color : `${role.color}22`,
                      boxShadow: j < skill.level ? `0 0 4px ${role.color}` : 'none',
                    }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 명대사 */}
      {!isCompact && (
        <div className="px-4 pb-3">
          <div className="rounded-lg px-3 py-2"
            style={{
              background: `${role.color}0D`,
              border: `1px solid ${role.color}33`,
            }}>
            <p className="text-[11px] md:text-[12px] italic text-center leading-relaxed"
              style={{ color: '#E0E0E0' }}>
              "{role.catchphrase}"
            </p>
          </div>
        </div>
      )}

      {/* 하단 PASS */}
      <div className="px-3 py-1.5 flex items-center justify-between"
        style={{
          background: `${role.color}1A`,
          borderTop: `1px solid ${role.color}44`,
        }}>
        <span className="text-[8px] md:text-[9px] font-mono"
          style={{ color: '#888' }}>
          AUTH·{showImage ? 'OK' : '...'}
        </span>
        <span className="text-[8px] md:text-[9px] font-mono font-bold"
          style={{ color: role.color, textShadow: `0 0 6px ${role.color}` }}>
          {showImage ? '✓ PASS' : '⏳ SCAN'}
        </span>
      </div>

      <style jsx>{`
        .cyber-role-card {
          animation: cyberCardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes cyberCardEnter {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* ⭐ 스캔라인 위→아래 흐름 (로딩 중) */
        .cyber-scan-line {
          animation: scanLineFlow 1.2s ease-in-out infinite;
          top: 0;
        }
        @keyframes scanLineFlow {
          0% { top: 0; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        /* ⭐ 데이터 비트 깜빡임 */
        .data-bits > div {
          animation: dataBitsBlink 0.8s ease-in-out infinite;
        }
        .data-bits > div:nth-child(1) { animation-delay: 0s; }
        .data-bits > div:nth-child(2) { animation-delay: 0.2s; }
        .data-bits > div:nth-child(3) { animation-delay: 0.4s; }
        .data-bits > div:nth-child(4) { animation-delay: 0.6s; }
        @keyframes dataBitsBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }

        /* ⭐ LOADING 텍스트 펄스 */
        .loading-text {
          animation: loadingTextPulse 1s ease-in-out infinite;
        }
        @keyframes loadingTextPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        /* ⭐ 점 3개 흐름 */
        .loading-dots {
          animation: dotsFlow 0.8s ease-in-out infinite;
        }
        @keyframes dotsFlow {
          0%, 100% { letter-spacing: 2px; opacity: 0.5; }
          50% { letter-spacing: 4px; opacity: 1; }
        }

        /* ⭐ 글리치 오버레이 (가끔 한 번씩) */
        .cyber-glitch-overlay {
          animation: glitchEffect 2s ease-in-out infinite;
          opacity: 0;
        }
        @keyframes glitchEffect {
          0%, 95% { opacity: 0; transform: translateX(0); }
          96% { opacity: 1; transform: translateX(-2px); }
          97% { opacity: 1; transform: translateX(2px); }
          98% { opacity: 1; transform: translateX(-1px); }
          100% { opacity: 0; transform: translateX(0); }
        }

        /* 이미지 보일 때 스캔라인 */
        .cyber-scanline-overlay {
          animation: scanlineFlow 3s linear infinite;
        }
        @keyframes scanlineFlow {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }

        .cyber-role-card:hover {
          transform: translateY(-2px);
          transition: transform 0.2s;
        }
      `}</style>
    </div>
  );
}
