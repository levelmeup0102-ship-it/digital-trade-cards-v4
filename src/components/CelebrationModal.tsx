'use client';
import { useEffect, useState } from 'react';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  gold: '#FFD700',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  navy: '#050505',
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
      const t = setTimeout(() => setShow(true), 50);
      return () => clearTimeout(t);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 반짝이는 별 입자 6개 위치
  const stars = [
    { top: '10%', left: '15%', size: 4, color: S.green, duration: 2, delay: 0 },
    { top: '25%', right: '20%', size: 3, color: S.aqua, duration: 2.5, delay: 0.3 },
    { top: '70%', left: '10%', size: 2, color: S.gold, duration: 1.8, delay: 0.7 },
    { top: '85%', right: '15%', size: 3, color: S.green, duration: 2.2, delay: 0.5 },
    { top: '40%', left: '5%', size: 2, color: S.aqua, duration: 2, delay: 1 },
    { top: '55%', right: '8%', size: 3, color: S.gold, duration: 2.4, delay: 0.2 },
  ];

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      style={{
        background: 'rgba(5, 5, 5, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      {/* 배경 그라디언트 글로우 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at center, rgba(231, 254, 85, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 30% 30%, rgba(193, 232, 235, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 40%)
          `,
        }}
      />

      {/* 반짝이는 별 입자들 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full celeb-star"
            style={{
              top: star.top,
              left: star.left,
              right: star.right,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: star.color,
              boxShadow: `0 0 ${star.size * 3}px ${star.color}`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 메인 컨텐츠 */}
      <div
        className="relative w-full max-w-[420px] text-center"
        style={{
          transform: show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: show ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ⭐ 별 아이콘 (정적 그라디언트 테두리) */}
        <div className="relative inline-block mb-5">
          {/* 후광 */}
          <div
            className="absolute pointer-events-none celeb-halo"
            style={{
              inset: '-20px',
              background: `radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent 70%)`,
              borderRadius: '50%',
              filter: 'blur(10px)',
            }}
          />

          <div
            className="relative mx-auto flex items-center justify-center"
            style={{ width: '100px', height: '100px' }}
          >
            {/* 정적 골드 그라디언트 테두리 */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(135deg, rgba(255, 215, 0, 0.6), rgba(231, 254, 85, 0.4))`,
                padding: '1.5px',
              }}
            >
              <div
                className="rounded-full w-full h-full flex items-center justify-center"
                style={{ background: S.navy }}
              >
                {/* 별 아이콘 */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill={S.gold}
                  stroke={S.gold}
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                  style={{
                    filter: `drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))`,
                  }}
                  className="celeb-star-icon"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* MISSION COMPLETE */}
        <div className="mb-2">
          <span
            className="font-mono font-bold"
            style={{
              fontSize: '12px',
              letterSpacing: '6px',
              color: S.gold,
              textShadow: `0 0 12px rgba(255, 215, 0, 0.6)`,
            }}
          >
            ★ MISSION COMPLETE ★
          </span>
        </div>

        {/* 메인 타이틀 */}
        <h2
          className="text-white"
          style={{
            fontSize: '36px',
            margin: '0 0 4px',
            fontWeight: 500,
            letterSpacing: '-1px',
            lineHeight: 1,
            textShadow: `0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(231, 254, 85, 0.3)`,
          }}
        >
          ALL CARDS CLEARED
        </h2>

        {/* 팀 정보 */}
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(193, 232, 235, 0.8)',
            margin: '8px 0 4px',
            letterSpacing: '1px',
          }}
        >
          {item}
        </p>
        <p
          className="font-mono"
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.4)',
            margin: '0 0 28px',
            letterSpacing: '2px',
          }}
        >
          [ {teamName} · DIGITAL TRADE STRATEGY ]
        </p>

        {/* FINAL STATS 구분선 */}
        <div className="flex items-center gap-2 mb-5">
          <div
            className="flex-1"
            style={{
              height: '1px',
              background: `linear-gradient(to right, transparent, rgba(255, 215, 0, 0.4))`,
            }}
          />
          <span
            className="font-mono"
            style={{
              fontSize: '9px',
              color: 'rgba(255, 215, 0, 0.6)',
              letterSpacing: '2px',
            }}
          >
            FINAL STATS
          </span>
          <div
            className="flex-1"
            style={{
              height: '1px',
              background: `linear-gradient(to left, transparent, rgba(255, 215, 0, 0.4))`,
            }}
          />
        </div>

        {/* 통계 3개 */}
        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <StatCard value="16" label="CARDS" color={S.green} />
          <StatCard value={String(totalAnswers)} label="ANSWERS" color={S.aqua} />
          <StatCard value={String(memberCount)} label="MEMBERS" color={S.gold} />
        </div>

        {/* 보상 안내 */}
        <div
          className="rounded-xl mb-6 text-left"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: `0.5px solid rgba(255, 215, 0, 0.15)`,
            padding: '14px 18px',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div
              className="rounded-full"
              style={{
                width: '8px',
                height: '8px',
                background: S.gold,
                boxShadow: `0 0 8px ${S.gold}`,
              }}
            />
            <span
              className="font-mono font-bold"
              style={{
                fontSize: '10px',
                letterSpacing: '2px',
                color: S.gold,
              }}
            >
              REWARD UNLOCKED
            </span>
          </div>
          <p
            style={{
              fontSize: '12.5px',
              color: 'rgba(255, 255, 255, 0.75)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            팀 디지털 무역 전략 보고서 획득. 팀장은 PDF 다운로드 가능.
          </p>
        </div>

        {/* 메인 버튼 */}
        <button
          onClick={onViewReport}
          className="w-full transition-all hover:scale-[1.02] celeb-cta-btn"
          style={{
            padding: '14px',
            background: `linear-gradient(135deg, ${S.gold} 0%, ${S.green} 100%)`,
            color: S.navy,
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            boxShadow: `0 0 32px rgba(255, 215, 0, 0.5), 0 8px 24px rgba(231, 254, 85, 0.3)`,
          }}
        >
          ▶ 보고서 보러 가기
        </button>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full transition-all"
          style={{
            padding: '11px',
            background: 'transparent',
            color: 'rgba(255, 255, 255, 0.4)',
            border: '0.5px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          나중에 보기
        </button>
      </div>

      {/* 애니메이션 CSS */}
      <style jsx>{`
        .celeb-star {
          animation-name: celebStarPulse;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes celebStarPulse {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
        .celeb-halo {
          animation: celebHaloPulse 3s ease-in-out infinite;
        }
        @keyframes celebHaloPulse {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
        .celeb-star-icon {
          animation: celebStarIconEnter 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
        }
        @keyframes celebStarIconEnter {
          0% {
            opacity: 0;
            transform: scale(0.3) rotate(-180deg);
          }
          70% {
            opacity: 1;
            transform: scale(1.1) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        .celeb-cta-btn {
          animation: celebBtnGlow 2.5s ease-in-out infinite;
        }
        @keyframes celebBtnGlow {
          0%,
          100% {
            box-shadow: 0 0 32px rgba(255, 215, 0, 0.5),
              0 8px 24px rgba(231, 254, 85, 0.3);
          }
          50% {
            box-shadow: 0 0 48px rgba(255, 215, 0, 0.7),
              0 8px 28px rgba(231, 254, 85, 0.5);
          }
        }
      `}</style>
    </div>
  );
}

// 통계 카드 서브 컴포넌트
function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl relative overflow-hidden"
      style={{
        background: `${color}0A`,
        border: `0.5px solid ${color}33`,
        padding: '14px 8px',
      }}
    >
      {/* 상단 라인 */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: '1px',
          background: `linear-gradient(to right, transparent, ${color}80, transparent)`,
        }}
      />
      <div
        style={{
          fontSize: '26px',
          color: color,
          fontWeight: 500,
          letterSpacing: '-0.5px',
          lineHeight: 1,
          textShadow: `0 0 12px ${color}80`,
        }}
      >
        {value}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: '9px',
          color: `${color}B3`,
          letterSpacing: '1.5px',
          marginTop: '6px',
        }}
      >
        {label}
      </div>
    </div>
  );
}
