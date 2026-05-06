'use client';
import { useEffect, useState } from 'react';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  navy: '#111111',
};

interface CelebrationModalProps {
  isOpen: boolean;
  teamName: string;
  item: string;
  totalAnswers: number;
  memberCount: number;
  onViewReport: () => void;
  onClose: () => void;
}

export default function CelebrationModal({
  isOpen,
  teamName,
  item,
  totalAnswers,
  memberCount,
  onViewReport,
  onClose,
}: CelebrationModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 살짝 딜레이 후 등장 (페이드인 효과)
      const t = setTimeout(() => setShow(true), 50);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      {/* 4코너 HUD 장식 */}
      <div className="absolute top-4 left-4 w-12 h-12 pointer-events-none">
        <div className="absolute top-0 left-0 w-6 h-[2px]"
          style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        <div className="absolute top-0 left-0 w-[2px] h-6"
          style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
      </div>
      <div className="absolute top-4 right-4 w-12 h-12 pointer-events-none">
        <div className="absolute top-0 right-0 w-6 h-[2px]"
          style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        <div className="absolute top-0 right-0 w-[2px] h-6"
          style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
      </div>
      <div className="absolute bottom-4 left-4 w-12 h-12 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-6 h-[2px]"
          style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
        <div className="absolute bottom-0 left-0 w-[2px] h-6"
          style={{ background: S.aqua, boxShadow: `0 0 8px ${S.aqua}` }} />
      </div>
      <div className="absolute bottom-4 right-4 w-12 h-12 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-6 h-[2px]"
          style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
        <div className="absolute bottom-0 right-0 w-[2px] h-6"
          style={{ background: S.green, boxShadow: `0 0 8px ${S.green}` }} />
      </div>

      {/* 네온 파티클 (12개) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => {
          const colors = [S.green, S.aqua, S.purple];
          const left = (i * 11 + 7) % 100;
          const top = (i * 13 + 5) % 100;
          const duration = 3 + (i % 3);
          const delay = (i % 4) * 0.5;
          return (
            <div
              key={i}
              className="absolute rounded-full celeb-particle"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: '3px',
                height: '3px',
                background: colors[i % 3],
                boxShadow: `0 0 12px ${colors[i % 3]}`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* 메인 카드 */}
      <div
        className="relative w-full max-w-[380px] rounded-2xl p-7 md:p-8 text-center"
        style={{
          background: `${S.green}08`,
          border: `1.5px solid ${S.green}50`,
          boxShadow: `0 0 40px ${S.green}25, inset 0 0 24px ${S.green}05`,
          transform: show ? 'scale(1)' : 'scale(0.92)',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* MISSION COMPLETE 라벨 */}
        <div
          className="font-mono font-bold mb-2 celeb-glitch"
          style={{
            fontSize: '11px',
            letterSpacing: '4px',
            color: S.green,
            textShadow: `0 0 8px ${S.green}AA`,
          }}
        >
          MISSION COMPLETE
        </div>

        {/* 이모지 */}
        <div className="text-5xl md:text-6xl mb-3 celeb-emoji-pop" style={{ lineHeight: 1 }}>
          🎉
        </div>

        {/* 메인 타이틀 */}
        <h2
          className="text-xl md:text-2xl font-black text-white mb-2"
          style={{ textShadow: `0 0 14px ${S.green}55` }}
        >
          16 카드 완료!
        </h2>

        {/* 팀 정보 */}
        <p className="text-[13px] mb-1" style={{ color: S.aqua }}>
          {item}
        </p>
        <p
          className="text-[11px] mb-5 font-mono"
          style={{ color: '#888', letterSpacing: '1.5px' }}
        >
          {teamName} · DIGITAL TRADE STRATEGY
        </p>

        {/* 보고서 안내 박스 */}
        <div
          className="rounded-xl p-4 mb-5"
          style={{
            background: `${S.aqua}05`,
            border: `1px solid ${S.aqua}25`,
          }}
        >
          <div
            className="font-mono font-bold mb-1.5"
            style={{
              fontSize: '10px',
              letterSpacing: '2px',
              color: S.aqua,
            }}
          >
            REPORT GENERATED
          </div>
          <p className="text-[12px] text-gray-300 leading-relaxed">
            팀의 디지털 무역 전략 보고서가 만들어졌어요.
            <br />
            팀장은 PDF로 받을 수 있고, 팀원도 미리보기로 확인할 수 있어요.
          </p>
        </div>

        {/* 통계 3개 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div
            className="rounded-lg p-2.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="text-lg font-bold"
              style={{ color: S.green, textShadow: `0 0 8px ${S.green}66` }}
            >
              16
            </div>
            <div
              className="font-mono text-gray-500"
              style={{ fontSize: '9px', letterSpacing: '1px' }}
            >
              CARDS
            </div>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="text-lg font-bold"
              style={{ color: S.cyan, textShadow: `0 0 8px ${S.cyan}66` }}
            >
              {totalAnswers}
            </div>
            <div
              className="font-mono text-gray-500"
              style={{ fontSize: '9px', letterSpacing: '1px' }}
            >
              ANSWERS
            </div>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="text-lg font-bold"
              style={{ color: S.purple, textShadow: `0 0 8px ${S.purple}66` }}
            >
              {memberCount}
            </div>
            <div
              className="font-mono text-gray-500"
              style={{ fontSize: '9px', letterSpacing: '1px' }}
            >
              MEMBERS
            </div>
          </div>
        </div>

        {/* 메인 버튼 */}
        <button
          onClick={onViewReport}
          className="w-full py-3 md:py-3.5 font-black rounded-xl text-[14px] mb-2 transition-all hover:scale-[1.02] celeb-cta-btn"
          style={{
            background: S.green,
            color: S.navy,
            boxShadow: `0 0 24px ${S.green}55, 0 8px 24px -5px ${S.green}66`,
            letterSpacing: '1px',
          }}
        >
          {`>`} 보고서 보러 가기
        </button>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-[12px] transition-all font-mono"
          style={{
            background: 'transparent',
            color: '#888',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          나중에 보기
        </button>
      </div>

      {/* 사이버틱 효과 CSS */}
      <style jsx>{`
        .celeb-particle {
          animation-name: celebTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes celebTwinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.6);
          }
        }
        .celeb-glitch {
          animation: celebGlitchPulse 3s ease-in-out infinite;
        }
        @keyframes celebGlitchPulse {
          0%,
          100% {
            text-shadow: 0 0 8px ${S.green}AA;
          }
          50% {
            text-shadow: -1px 0 0 ${S.aqua}AA, 1px 0 0 ${S.green}AA,
              0 0 14px ${S.green};
          }
        }
        .celeb-emoji-pop {
          animation: celebEmojiPop 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s
            both;
        }
        @keyframes celebEmojiPop {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-30deg);
          }
          60% {
            opacity: 1;
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .celeb-cta-btn {
          animation: celebBtnPulse 2.5s ease-in-out infinite;
        }
        @keyframes celebBtnPulse {
          0%,
          100% {
            box-shadow: 0 0 24px ${S.green}55, 0 8px 24px -5px ${S.green}66;
          }
          50% {
            box-shadow: 0 0 36px ${S.green}88, 0 8px 28px -5px ${S.green}99;
          }
        }
      `}</style>
    </div>
  );
}
