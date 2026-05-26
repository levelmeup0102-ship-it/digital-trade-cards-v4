'use client';

import { useState, useEffect, useRef } from 'react';
import { ROLES, ROLES_LIST, type Role } from '@/data/roleData';

// ⭐ SIGNAL 영상 - 7개 직무 소개 (60초)
// URL: /roles-video

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  gold: '#FFD700',
  orange: '#FF671F',
  yellow: '#FFC72C',
  red: '#EF4444',
  navy: '#0A0F1F',
  bg: '#050810',
};

// 직무별 표시 순서 + 타이밍
type RoleDisplay = {
  code: keyof typeof ROLES;
  shortName: string;
  hudType: string;
  hudAccessLabel: string;
  hudAccessValue: string;
  hudFocusLabel: string;
  hudFocusValue: string;
  codeName: string;
  description: string;
  keywords: [string, string, string];
};

const ROLE_DISPLAYS: RoleDisplay[] = [
  {
    code: 'ceo',
    shortName: 'CEO',
    hudType: 'EXECUTIVE',
    hudAccessLabel: 'ACCESS_LEVEL',
    hudAccessValue: 'MAXIMUM',
    hudFocusLabel: 'AUTHORITY',
    hudFocusValue: 'UNLIMITED',
    codeName: 'CLASSIFIED',
    description: '전략을 결정하고 팀을 이끕니다',
    keywords: ['LEADERSHIP', 'STRATEGY', 'VISION'],
  },
  {
    code: 'market_analyst',
    shortName: 'ANALYST',
    hudType: 'ANALYTICAL',
    hudAccessLabel: 'DATA_ACCESS',
    hudAccessValue: 'REAL-TIME',
    hudFocusLabel: 'FOCUS',
    hudFocusValue: 'MARKET_TRENDS',
    codeName: 'DATA-DRIVEN',
    description: '데이터로 시장 트렌드를 읽어냅니다',
    keywords: ['DATA', 'RESEARCH', 'INSIGHT'],
  },
  {
    code: 'brand_strategist',
    shortName: 'BRAND',
    hudType: 'CREATIVE',
    hudAccessLabel: 'CHANNEL',
    hudAccessValue: 'BRAND_ID',
    hudFocusLabel: 'OUTPUT',
    hudFocusValue: 'DIFFER',
    codeName: 'CREATIVE-CORE',
    description: '브랜드 정체성과 차별화를 설계합니다',
    keywords: ['IDENTITY', 'DESIGN', 'DIFFER'],
  },
  {
    code: 'customer_insight',
    shortName: 'CUSTOMER',
    hudType: 'RESEARCH',
    hudAccessLabel: 'TARGET',
    hudAccessValue: 'PERSONAS',
    hudFocusLabel: 'DEPTH',
    hudFocusValue: 'PSYCHOGRAPHIC',
    codeName: 'USER-CENTRIC',
    description: '고객의 진짜 욕구를 발견합니다',
    keywords: ['EMPATHY', 'PERSONA', 'NEEDS'],
  },
  {
    code: 'global_sales',
    shortName: 'GLOBAL',
    hudType: 'COMMERCIAL',
    hudAccessLabel: 'REGION',
    hudAccessValue: 'GLOBAL',
    hudFocusLabel: 'MISSION',
    hudFocusValue: 'EXPORT',
    codeName: 'WORLDWIDE',
    description: '바이어를 만나고 글로벌 진출을 이끕니다',
    keywords: ['EXPORT', 'BUYER', 'GLOBAL'],
  },
  {
    code: 'digital_marketer',
    shortName: 'MARKETER',
    hudType: 'DIGITAL',
    hudAccessLabel: 'CHANNELS',
    hudAccessValue: 'MULTI',
    hudFocusLabel: 'REACH',
    hudFocusValue: 'GLOBAL',
    codeName: 'ALWAYS-ON',
    description: 'SNS·콘텐츠로 브랜드를 알립니다',
    keywords: ['CONTENT', 'VIRAL', 'REACH'],
  },
  {
    code: 'compliance_officer',
    shortName: 'COMPLY',
    hudType: 'LEGAL',
    hudAccessLabel: 'SCOPE',
    hudAccessValue: 'REGULATORY',
    hudFocusLabel: 'STATUS',
    hudFocusValue: 'COMPLIANT',
    codeName: 'VERIFIED',
    description: '인증·관세 등 법적 요건을 해결합니다',
    keywords: ['RULES', 'CERTIFY', 'CUSTOMS'],
  },
];

// 각 직무 7초씩, 인트로 5초, 클로징 6초 = 60초
const INTRO_DURATION = 5;
const ROLE_DURATION = 7;
const CLOSING_DURATION = 6;
const TOTAL_DURATION = INTRO_DURATION + (ROLE_DURATION * 7) + CLOSING_DURATION; // 60

type Phase = 'intro' | 'role' | 'closing';

export default function RolesVideoPage() {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentRoleIdx, setCurrentRoleIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 디바이스 감지
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIPhone(/iPhone|iPod/.test(ua));
    setIsMobile(window.innerWidth < 768);
    
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 영상 시작
  const startVideo = () => {
    if (isIPhone) return;
    setStarted(true);
    
    // BGM 시작
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // 자동 재생 실패 시 음소거로 재시도
        if (audioRef.current) {
          audioRef.current.muted = true;
          audioRef.current.play().catch(() => {});
          setMuted(true);
        }
      });
    }
    
    // 풀스크린
    setTimeout(() => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      }
    }, 100);
    
    // 타임라인 스케줄링
    scheduleTimeline();
  };

  // 타임라인 스케줄
  const scheduleTimeline = () => {
    // 인트로 (0~5초)
    setPhase('intro');
    
    // 5초 후 첫 직무
    const t1 = setTimeout(() => {
      setPhase('role');
      setCurrentRoleIdx(0);
    }, INTRO_DURATION * 1000);
    timersRef.current.push(t1);
    
    // 각 직무 (7초씩)
    for (let i = 1; i < 7; i++) {
      const t = setTimeout(() => {
        setCurrentRoleIdx(i);
      }, (INTRO_DURATION + (ROLE_DURATION * i)) * 1000);
      timersRef.current.push(t);
    }
    
    // 클로징 (54초~)
    const tClose = setTimeout(() => {
      setPhase('closing');
    }, (INTRO_DURATION + (ROLE_DURATION * 7)) * 1000);
    timersRef.current.push(tClose);
    
    // 끝나면 리셋 (60초)
    const tEnd = setTimeout(() => {
      resetVideo();
    }, TOTAL_DURATION * 1000);
    timersRef.current.push(tEnd);
  };

  // 영상 리셋
  const resetVideo = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    
    setStarted(false);
    setPhase('intro');
    setCurrentRoleIdx(0);
  };

  // 음소거 토글
  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !audioRef.current.muted;
      audioRef.current.muted = newMuted;
      setMuted(newMuted);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resetVideo();
      else if (e.key === 'm' || e.key === 'M') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // ⭐ 시작 화면
  if (!started) {
    return (
      <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={startVideo}>
        
        {/* 그리드 배경 */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(${S.cyan}14 1px, transparent 1px),
              linear-gradient(90deg, ${S.cyan}14 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          }} />
        
        <div className="relative z-10 text-center px-6">
          <p className="font-mono font-bold mb-6"
            style={{
              fontSize: 'clamp(11px, 1.5vw, 14px)',
              letterSpacing: '8px',
              color: S.cyan,
              textShadow: `0 0 10px ${S.cyan}cc`,
            }}>
            ▎ CONNECTAI PRESENTS ▎
          </p>
          
          <h1 className="font-black mb-4 text-white"
            style={{
              fontSize: 'clamp(64px, 12vw, 140px)',
              letterSpacing: '-6px',
              lineHeight: 1,
              textShadow: `0 0 20px ${S.cyan}99, 0 0 40px ${S.cyan}55`,
            }}>
            SIGNAL
          </h1>
          
          <p className="font-mono font-bold mb-3"
            style={{
              fontSize: 'clamp(11px, 1.3vw, 14px)',
              letterSpacing: '6px',
              color: S.green,
              textShadow: `0 0 8px ${S.green}b3`,
            }}>
            MEET YOUR TEAM
          </p>
          
          <p className="font-semibold mb-12"
            style={{
              fontSize: 'clamp(14px, 1.6vw, 18px)',
              color: 'rgba(255,255,255,0.6)',
            }}>
            7개 직무 소개 영상
          </p>
          
          {!isIPhone && (
            <>
              <button className="relative inline-flex items-center gap-4 px-12 py-5 font-mono font-black cursor-pointer transition-transform hover:scale-105"
                style={{
                  fontSize: 'clamp(14px, 1.6vw, 18px)',
                  letterSpacing: '4px',
                  border: `2px solid ${S.green}`,
                  background: `${S.green}14`,
                  color: S.green,
                  borderRadius: '4px',
                  boxShadow: `0 0 30px ${S.green}66, inset 0 0 20px ${S.green}0d`,
                  textShadow: `0 0 12px ${S.green}`,
                  animation: 'startBtnPulse 2s ease-in-out infinite',
                }}>
                <span>▶</span>
                <span>시작 (소리 켜짐)</span>
              </button>
              
              <p className="font-mono mt-8"
                style={{
                  fontSize: 'clamp(10px, 1.1vw, 12px)',
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '3px',
                }}>
                <span style={{ color: S.cyan }}>●</span>{' '}클릭하면 풀스크린으로 재생됩니다
              </p>
            </>
          )}
          
          {/* iPhone 안내 */}
          {isIPhone && (
            <div className="max-w-md mx-auto mt-6 p-6 rounded relative"
              style={{
                border: `2px solid ${S.red}`,
                background: `${S.red}14`,
                boxShadow: `0 0 32px ${S.red}66`,
              }}>
              <p className="font-mono font-black mb-3 text-center"
                style={{
                  fontSize: '11px',
                  letterSpacing: '5px',
                  color: '#FCA5A5',
                }}>
                DEVICE NOT SUPPORTED
              </p>
              <h3 className="text-xl font-black text-white text-center mb-3">
                iPhone에서는 재생되지 않습니다
              </h3>
              <p className="text-sm text-center mb-4 leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.8)' }}>
                본 영상은 고급 시각 효과로 인해<br/>
                <strong style={{ color: '#FCA5A5' }}>iPhone Safari에서 지원되지 않습니다.</strong><br/>
                아래 환경에서 시청해주세요.
              </p>
              <div className="flex items-center justify-center gap-3 p-3 rounded"
                style={{
                  background: `${S.cyan}1f`,
                  border: `1.5px solid ${S.cyan}80`,
                }}>
                <span className="text-2xl">💻</span>
                <div className="text-left">
                  <p className="text-sm font-bold" style={{ color: S.cyan }}>지원 환경</p>
                  <p className="text-xs font-mono font-bold text-white tracking-widest">
                    PC · GALAXY · iPAD
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <style jsx>{`
          @keyframes startBtnPulse {
            0%, 100% { 
              box-shadow: 0 0 30px ${S.green}66, inset 0 0 20px ${S.green}0d;
            }
            50% { 
              box-shadow: 0 0 50px ${S.green}b3, inset 0 0 30px ${S.green}1a;
            }
          }
        `}</style>
      </div>
    );
  }

  // ⭐ 영상 본편
  const currentRole = ROLES[ROLE_DISPLAYS[currentRoleIdx].code];
  const currentDisplay = ROLE_DISPLAYS[currentRoleIdx];

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden"
      style={{ background: S.bg }}>
      
      {/* BGM */}
      <audio ref={audioRef} loop preload="auto" playsInline>
        <source src="/promo-bgm.mp3" type="audio/mpeg" />
      </audio>
      
      {/* 음소거 토글 */}
      <button onClick={toggleMute}
        className="fixed top-6 right-6 z-[1000] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: `1.5px solid ${S.cyan}`,
          color: S.cyan,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 0 16px ${S.cyan}4d`,
          fontSize: '20px',
        }}>
        {muted ? '🔇' : '🔊'}
      </button>
      
      {/* 글로벌 그리드 배경 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(${S.cyan}0a 1px, transparent 1px),
            linear-gradient(90deg, ${S.cyan}0a 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 80%)',
        }} />
      
      {/* 스캔라인 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)`,
          zIndex: 200,
          mixBlendMode: 'overlay',
        }} />
      
      {/* 비네팅 */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          zIndex: 150,
        }} />
      
      {/* 인트로 */}
      {phase === 'intro' && <IntroScene />}
      
      {/* 직무 씬 */}
      {phase === 'role' && (
        <RoleScene 
          key={currentRoleIdx}
          role={currentRole}
          display={currentDisplay}
          index={currentRoleIdx}
        />
      )}
      
      {/* 클로징 */}
      {phase === 'closing' && <ClosingScene />}
    </div>
  );
}

// ============================================
// 인트로 씬
// ============================================
function IntroScene() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center"
      style={{ animation: 'sceneFade 5s linear forwards' }}>
      
      <div className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 50% 50%, ${S.cyan}26, transparent 60%),
            radial-gradient(circle at 20% 80%, ${S.purple}1a, transparent 50%),
            radial-gradient(circle at 80% 20%, ${S.green}14, transparent 50%)
          `,
        }} />
      
      {/* 시스템 라인 */}
      <div className="absolute top-20 left-20 font-mono font-medium text-base z-20"
        style={{
          color: S.green,
          textShadow: `0 0 8px ${S.green}`,
          letterSpacing: '2px',
          opacity: 0,
          animation: 'introBootText 0.4s ease-out 0.2s forwards',
        }}>
        {`>`} SYSTEM_INIT: TEAM_INTRODUCTION.exe
      </div>
      
      {/* 코너 마커 */}
      <CornerMarker pos="tl" color={S.cyan} delay={1.5} />
      <CornerMarker pos="tr" color={S.cyan} delay={1.5} />
      <CornerMarker pos="bl" color={S.cyan} delay={1.5} />
      <CornerMarker pos="br" color={S.cyan} delay={1.5} />
      
      {/* 메인 콘텐츠 */}
      <div className="relative z-10">
        <p className="font-mono font-bold mb-8"
          style={{
            fontSize: '24px',
            letterSpacing: '18px',
            color: S.cyan,
            textShadow: `0 0 20px ${S.cyan}`,
            opacity: 0,
            animation: 'introTextFade 1s ease-out 0.5s forwards',
          }}>
          ▎ MEET YOUR TEAM ▎
        </p>
        
        <h1 className="font-black mb-8 text-white"
          style={{
            fontSize: 'clamp(120px, 18vw, 280px)',
            letterSpacing: '-16px',
            lineHeight: 1,
            textShadow: `0 0 40px ${S.cyan}99, 0 0 80px ${S.cyan}4d`,
            opacity: 0,
            animation: 'introLogoEnter 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.8s forwards',
          }}>
          SIGNAL
        </h1>
        
        <p className="font-mono font-extrabold mb-4"
          style={{
            fontSize: '36px',
            letterSpacing: '14px',
            color: S.green,
            textShadow: `0 0 16px ${S.green}`,
            opacity: 0,
            animation: 'introTextFade 1s ease-out 2s forwards',
          }}>
          7 ROLES · 1 TEAM
        </p>
        
        <p style={{
          fontSize: '22px',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 400,
          letterSpacing: '4px',
          opacity: 0,
          animation: 'introTextFade 1s ease-out 2.5s forwards',
        }}>
          당신의 직무를 만나세요
        </p>
      </div>
      
      <style jsx>{`
        @keyframes sceneFade {
          0% { opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes introBootText {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes introTextFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes introLogoEnter {
          0% { opacity: 0; transform: scale(1.2); filter: blur(20px); letter-spacing: -8px; }
          100% { opacity: 1; transform: scale(1); filter: blur(0); letter-spacing: -16px; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 코너 마커
// ============================================
function CornerMarker({ pos, color, delay }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string; delay: number }) {
  const styles: Record<string, React.CSSProperties> = {
    tl: { top: 60, left: 60, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    tr: { top: 60, right: 60, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` },
    bl: { bottom: 60, left: 60, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` },
    br: { bottom: 60, right: 60, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` },
  };
  
  return (
    <div className="absolute w-20 h-20 pointer-events-none"
      style={{
        ...styles[pos],
        boxShadow: `0 0 8px ${color}`,
        opacity: 0,
        animation: `cornerAppear 0.6s ease-out ${delay}s forwards`,
      }}>
      <style jsx>{`
        @keyframes cornerAppear {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 직무 씬 (카드 뒤집기)
// ============================================
function RoleScene({ role, display, index }: { role: Role; display: RoleDisplay; index: number }) {
  return (
    <div className="absolute inset-0 z-10"
      style={{ animation: 'sceneFade 7s linear forwards' }}>
      
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${role.color}14, transparent 60%)`,
        }} />
      
      {/* HUD 헤더 좌상단 */}
      <div className="absolute top-16 left-20 font-mono text-base z-50"
        style={{
          opacity: 0,
          animation: 'hudFade 0.5s ease-out 3s forwards',
        }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '3px', marginBottom: '4px' }}>
          ROLE
        </div>
        <div style={{ 
          color: role.color, 
          fontWeight: 700, 
          letterSpacing: '4px',
          textShadow: `0 0 8px ${role.color}`,
        }}>
          {`0${index + 1} / 07`}
        </div>
      </div>
      
      {/* HUD 진행도 우상단 */}
      <div className="absolute top-16 right-20 flex items-center gap-4 font-mono z-50"
        style={{
          opacity: 0,
          animation: 'hudFade 0.5s ease-out 3s forwards',
        }}>
        <div className="flex gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i}
              style={{
                width: 30,
                height: 4,
                background: i === index ? role.color : 'rgba(255,255,255,0.15)',
                borderRadius: 2,
                boxShadow: i === index ? `0 0 8px ${role.color}` : 'none',
              }} />
          ))}
        </div>
        <div style={{
          color: role.color,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '2px',
          textShadow: `0 0 6px ${role.color}`,
        }}>
          {`SIGNAL_0${index + 1}`}
        </div>
      </div>
      
      {/* HUD 시스템 정보 좌하단 */}
      <div className="absolute bottom-16 left-20 font-mono text-xs z-50"
        style={{
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '2px',
          opacity: 0,
          animation: 'hudFade 0.5s ease-out 3s forwards',
        }}>
        <div style={{ marginBottom: 2 }}>{`>`} ROLE_TYPE: {display.hudType}</div>
        <div style={{ marginBottom: 2 }}>
          {`>`} {display.hudAccessLabel}:{' '}
          <span style={{ color: role.color, textShadow: `0 0 6px ${role.color}` }}>
            {display.hudAccessValue}
          </span>
        </div>
        <div>
          {`>`} {display.hudFocusLabel}:{' '}
          <span style={{ color: role.color, textShadow: `0 0 6px ${role.color}` }}>
            {display.hudFocusValue}
          </span>
        </div>
      </div>
      
      {/* HUD 코드 우하단 */}
      <div className="absolute bottom-16 right-20 font-mono text-xs text-right z-50"
        style={{
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '2px',
          opacity: 0,
          animation: 'hudFade 0.5s ease-out 3s forwards',
        }}>
        [{display.codeName}]<br/>
        ID: {role.idCode}
      </div>
      
      {/* ⭐ 카드 컨테이너 (3D 뒤집기) */}
      <div className="absolute"
        style={{
          top: '50%',
          left: '50%',
          width: 540,
          height: 760,
          marginTop: -380,
          marginLeft: -270,
          perspective: 2000,
          WebkitPerspective: 2000,
          zIndex: 30,
        }}>
        
        <div style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          willChange: 'transform, opacity',
          animation: 'cardEnterAndFlip 7s ease-in-out forwards',
        }}>
          
          {/* 뒷면 - 직무명 */}
          <CardBack role={role} display={display} index={index} />
          
          {/* 앞면 - 사원증 */}
          <CardFront role={role} display={display} />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes sceneFade {
          0% { opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes hudFade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes cardEnterAndFlip {
          0%   { transform: scale(0.3) rotateY(0deg) translateZ(-200px); opacity: 0; }
          7%   { transform: scale(1) rotateY(0deg) translateZ(0); opacity: 1; }
          28%  { transform: scale(1) rotateY(0deg) translateZ(0); opacity: 1; }
          36%  { transform: scale(1.05) rotateY(90deg) translateZ(0); opacity: 1; }
          44%  { transform: scale(1) rotateY(180deg) translateZ(0); opacity: 1; }
          95%  { transform: scale(1) rotateY(180deg) translateZ(0); opacity: 1; }
          100% { transform: scale(1.1) rotateY(180deg) translateZ(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 카드 뒷면
// ============================================
function CardBack({ role, display, index }: { role: Role; display: RoleDisplay; index: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-16"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
        transform: 'rotateY(0deg) translateZ(1px)',
        WebkitTransform: 'rotateY(0deg) translateZ(1px)',
        willChange: 'transform',
        borderRadius: 24,
        overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(10,10,20,0.95), rgba(20,20,35,0.95))`,
        border: `2px solid ${role.color}`,
        boxShadow: `0 0 60px ${role.color}66, 0 20px 60px rgba(0,0,0,0.6), inset 0 0 80px rgba(255,255,255,0.02)`,
        color: role.color,
      }}>
      
      {/* 격자 패턴 */}
      <div className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(currentColor 1px, transparent 1px),
            linear-gradient(90deg, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.025,
        }} />
      
      {/* 코너 마커 */}
      <div className="absolute" style={{ top: 24, left: 24, width: 40, height: 40, borderTop: '2px solid', borderLeft: '2px solid', boxShadow: `0 0 12px ${role.color}` }} />
      <div className="absolute" style={{ top: 24, right: 24, width: 40, height: 40, borderTop: '2px solid', borderRight: '2px solid', boxShadow: `0 0 12px ${role.color}` }} />
      <div className="absolute" style={{ bottom: 24, left: 24, width: 40, height: 40, borderBottom: '2px solid', borderLeft: '2px solid', boxShadow: `0 0 12px ${role.color}` }} />
      <div className="absolute" style={{ bottom: 24, right: 24, width: 40, height: 40, borderBottom: '2px solid', borderRight: '2px solid', boxShadow: `0 0 12px ${role.color}` }} />
      
      <div className="font-mono mb-6 relative z-10"
        style={{
          fontSize: 16,
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '6px',
        }}>
        DIGITAL TRADE CARD
      </div>
      
      <div className="font-mono mb-10 relative z-10"
        style={{
          fontSize: 18,
          color: role.color,
          textShadow: `0 0 8px ${role.color}`,
          letterSpacing: '4px',
        }}>
          SERIES · 00{index + 1}
      </div>
      
      <div className="font-mono mb-6 relative z-10"
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: role.color,
          letterSpacing: '2px',
          lineHeight: 1,
          textShadow: `0 0 20px ${role.color}`,
          whiteSpace: 'nowrap',
        }}>
        {display.shortName}
      </div>
      
      <div className="mb-16 relative z-10"
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: 'white',
          whiteSpace: 'nowrap',
        }}>
        {role.nameKr}
      </div>
      
      <div className="relative z-10 mb-8"
        style={{
          width: 200,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${role.color}, transparent)`,
          boxShadow: `0 0 8px ${role.color}`,
        }} />
      
      <div className="font-mono relative z-10"
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '4px',
        }}>
        {display.hudType}
      </div>
      
      <div className="absolute font-mono z-10"
        style={{
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 18,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '8px',
          fontWeight: 700,
        }}>
        SIGNAL
      </div>
    </div>
  );
}

// ============================================
// 카드 앞면 (사원증)
// ============================================
function CardFront({ role, display }: { role: Role; display: RoleDisplay }) {
  return (
    <div className="absolute inset-0 flex flex-col"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
        transform: 'rotateY(180deg) translateZ(1px)',
        WebkitTransform: 'rotateY(180deg) translateZ(1px)',
        willChange: 'transform',
        borderRadius: 24,
        overflow: 'hidden',
        background: `linear-gradient(135deg, rgba(15,15,25,0.98), rgba(25,25,40,0.98))`,
        border: `2px solid ${role.color}`,
        boxShadow: `0 0 60px ${role.color}66, 0 20px 60px rgba(0,0,0,0.6), inset 0 0 40px rgba(0,0,0,0.5)`,
        color: role.color,
      }}>
      
      {/* 헤더 */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(0,0,0,0.4)',
          borderBottom: `1px solid ${role.color}`,
        }}>
        <div className="flex items-center gap-3 font-mono font-bold"
          style={{
            fontSize: 11,
            color: role.color,
            letterSpacing: '3px',
            textShadow: `0 0 6px ${role.color}`,
          }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: role.color,
            boxShadow: `0 0 8px ${role.color}`,
            animation: 'dotBlink 1.5s ease-in-out infinite',
          }} />
          <span>SIGNAL · OFFICIAL ID</span>
        </div>
        <div className="font-mono"
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '2px',
          }}>
          {role.idCode}
        </div>
      </div>
      
      {/* 캐릭터 이미지 영역 */}
      <div className="relative"
        style={{
          width: '100%',
          height: 380,
          background: 'rgba(0,0,0,0.3)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
        
        {/* ⭐ 실제 게임에서 작동하는 방식 그대로 사용 */}
        <img 
          src={role.image} 
          alt={role.nameKr}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
        
        {/* 사진 오버레이 (어두운 그라데이션) */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.7) 100%),
              radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.3) 100%)
            `,
          }} />
        
        {/* 코너 마커 */}
        <div className="absolute" style={{ top: 12, left: 12, width: 24, height: 24, borderTop: '2px solid', borderLeft: '2px solid', boxShadow: `0 0 8px ${role.color}`, zIndex: 5 }} />
        <div className="absolute" style={{ top: 12, right: 12, width: 24, height: 24, borderTop: '2px solid', borderRight: '2px solid', boxShadow: `0 0 8px ${role.color}`, zIndex: 5 }} />
        <div className="absolute" style={{ bottom: 12, left: 12, width: 24, height: 24, borderBottom: '2px solid', borderLeft: '2px solid', boxShadow: `0 0 8px ${role.color}`, zIndex: 5 }} />
        <div className="absolute" style={{ bottom: 12, right: 12, width: 24, height: 24, borderBottom: '2px solid', borderRight: '2px solid', boxShadow: `0 0 8px ${role.color}`, zIndex: 5 }} />
        
        {/* 직무 코드 (상단) */}
        <div className="absolute font-mono font-bold"
          style={{
            top: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            padding: '6px 14px',
            border: `1px solid ${role.color}`,
            borderRadius: 20,
            fontSize: 10,
            color: role.color,
            letterSpacing: '3px',
            textShadow: `0 0 6px ${role.color}`,
            backdropFilter: 'blur(8px)',
            zIndex: 5,
          }}>
          {display.hudType}
        </div>
      </div>
      
      {/* 정보 영역 */}
      <div className="px-7 py-6 flex-1"
        style={{ background: 'rgba(0,0,0,0.2)' }}>
        
        <div className="font-mono mb-1.5"
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: role.color,
            textShadow: `0 0 20px ${role.color}`,
            letterSpacing: '3px',
            lineHeight: 1,
          }}>
          {display.shortName}
        </div>
        
        <div className="mb-4"
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '1px',
          }}>
          {role.nameKr}
        </div>
        
        <div className="mb-4"
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${role.color}, transparent)`,
            boxShadow: `0 0 4px ${role.color}`,
          }} />
        
        <div className="mb-5"
          style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.5,
            fontWeight: 600,
          }}>
          {display.description}
        </div>
        
        <div className="font-mono italic font-medium"
          style={{
            fontSize: 13,
            color: role.color,
            textShadow: `0 0 6px ${role.color}`,
            lineHeight: 1.5,
            padding: '12px 16px',
            borderLeft: `3px solid ${role.color}`,
            background: 'rgba(255,255,255,0.03)',
          }}>
          "{role.catchphrase}"
        </div>
      </div>
      
      {/* 풋터 */}
      <div className="flex items-center justify-between px-6 py-3 font-mono"
        style={{
          background: 'rgba(0,0,0,0.4)',
          borderTop: `1px solid ${role.color}`,
          fontSize: 10,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '2px',
        }}>
        <span>VALID · 2026</span>
        <span style={{ 
          color: role.color, 
          textShadow: `0 0 6px ${role.color}`,
          fontWeight: 700,
        }}>
          ● AUTHORIZED
        </span>
      </div>
      
      <style jsx>{`
        @keyframes dotBlink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 클로징 씬
// ============================================
function ClosingScene() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center"
      style={{ animation: 'closingFade 6s linear forwards' }}>
      
      <div className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${S.cyan}1a, transparent 60%)`,
        }} />
      
      <div className="relative z-10">
        <p className="font-mono font-bold mb-14"
          style={{
            fontSize: 24,
            letterSpacing: '16px',
            color: S.cyan,
            textShadow: `0 0 16px ${S.cyan}`,
            opacity: 0,
            animation: 'introTextFade 1s ease-out 0.3s forwards',
          }}>
          ▎ 7 ROLES · 1 TEAM ▎
        </p>
        
        {/* 7개 직무 원형 배치 */}
        <div className="relative mx-auto mb-15"
          style={{ width: 750, height: 750 }}>
          
          {ROLE_DISPLAYS.map((display, i) => {
            const role = ROLES[display.code];
            // 원형 배치 좌표
            const positions: { top?: number | string; left?: number | string; right?: number | string; bottom?: number | string; transform?: string }[] = [
              { top: 0, left: '50%', transform: 'translateX(-50%)' },         // CEO - 12시
              { top: '12%', right: '8%' },                                     // Analyst - 1시 30분
              { bottom: '25%', right: 0 },                                     // Brand - 4시 30분
              { bottom: 0, right: '28%' },                                     // Customer - 5시
              { bottom: 0, left: '28%' },                                      // Global - 7시
              { bottom: '25%', left: 0 },                                      // Marketer - 7시 30분
              { top: '12%', left: '8%' },                                      // Compliance - 10시 30분
            ];
            
            const isCenter = i === 0 || i === 3; // 위쪽/아래쪽 중앙은 translateX 유지
            
            return (
              <div key={display.code}
                className="absolute flex flex-col items-center justify-center gap-2"
                style={{
                  ...positions[i],
                  width: 130,
                  height: 130,
                  background: 'rgba(255,255,255,0.03)',
                  border: `2px solid ${role.color}`,
                  borderRadius: 8,
                  boxShadow: `0 0 24px ${role.color}, inset 0 0 12px rgba(255,255,255,0.02)`,
                  backdropFilter: 'blur(8px)',
                  opacity: 0,
                  animation: `roleCardAppear${isCenter ? 'Center' : ''} 0.5s ease-out ${0.5 + i * 0.2}s forwards`,
                }}>
                <span className="font-mono font-extrabold"
                  style={{
                    fontSize: 14,
                    color: role.color,
                    textShadow: `0 0 8px ${role.color}`,
                    letterSpacing: '1px',
                  }}>
                  {display.shortName}
                </span>
                <span style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                }}>
                  {role.nameKr.replace(' 리드', '').replace(' 매니저', '').replace(' 전문가', '')}
                </span>
              </div>
            );
          })}
          
          {/* 중앙 SIGNAL 로고 */}
          <div className="absolute font-black"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 64,
              letterSpacing: '-2px',
              color: 'white',
              textShadow: `0 0 24px ${S.cyan}cc, 0 0 48px ${S.cyan}66`,
              opacity: 0,
              animation: 'closingLogoEnter 1s ease-out 2s forwards',
            }}>
            SIGNAL
          </div>
        </div>
        
        <h2 className="font-black mt-16"
          style={{
            fontSize: 80,
            color: 'white',
            marginBottom: 24,
            letterSpacing: '-2px',
            textShadow: `0 0 30px ${S.green}, 0 4px 20px rgba(0,0,0,0.8)`,
            opacity: 0,
            animation: 'introTextFade 1s ease-out 2.5s forwards',
          }}>
          당신의 직무는?
        </h2>
        
        <p className="font-mono font-bold"
          style={{
            fontSize: 28,
            color: S.green,
            textShadow: `0 0 16px ${S.green}`,
            letterSpacing: '12px',
            marginBottom: 32,
            opacity: 0,
            animation: 'introTextFade 1s ease-out 3s forwards',
          }}>
          FIND YOUR ROLE
        </p>
        
        <p className="font-mono"
          style={{
            fontSize: 20,
            color: S.aqua,
            letterSpacing: '4px',
            opacity: 0,
            animation: 'introTextFade 1s ease-out 3.5s forwards',
          }}>
          connectai.academy
        </p>
      </div>
      
      <style jsx>{`
        @keyframes closingFade {
          0% { opacity: 0; }
          8% { opacity: 1; }
          92% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes introTextFade {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes roleCardAppear {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes roleCardAppearCenter {
          0% { opacity: 0; transform: translateX(-50%) scale(0.5); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes closingLogoEnter {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
