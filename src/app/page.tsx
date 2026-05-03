'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CARDS, CARD_COLORS, TOPICS } from '@/data/cardData';
import SignalCard, { type LeaderConclusionState } from '@/components/SignalCard';
import type { SubCard } from '@/types';
import {
  getOrCreateSession, restoreSession,
  saveCardResponse, loadCardResponses, saveCardProgress, loadCardProgress,
} from '@/lib/session';
import type { Session } from '@/lib/supabase';
import { getRole, type RoleCode } from '@/data/roleData';

const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', timer: 1800, minChars: 20,  color: '#059669' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50,  color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', timer: 900,  minChars: 100, color: '#582C83' },
};

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  pink: '#FF6FB5',
  navy: '#111111',
  bg: '#0A0A0A',
};
const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

const SHOW_PDF_BUTTON = false;

function fmt(s: number) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

const defaultLeaderConclusion = (): LeaderConclusionState => ({
  fields: ['', '', '', ''],
  oneSentence: '',
  isEditing: false,
  judgments: [false, false, false, false],
});

// ⭐ 화면 크기 감지 훅
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

// ⭐ 인트로용 16장 카드 — 완벽한 원형 정렬
function getIntroCards(isMobile: boolean) {
  const distance = isMobile ? 130 : 240; // 모바일: 130px / PC: 240px
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

// ⭐ 폭죽 입자
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

// ⭐ 빛 줄기
function getLightRays(isMobile: boolean) {
  return Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: -90 + (i - 3.5) * 12,
    width: (isMobile ? 5 : 8) + Math.random() * (isMobile ? 6 : 10),
    delay: Math.random() * 0.1,
  }));
}

// ⭐ 16개 무지개 입자 (카드 위치에서 → 정중앙으로 모임)
function getRainbowParticles(isMobile: boolean) {
  const distance = isMobile ? 130 : 240; // getIntroCards와 동일
  // 카드 색깔 순서 그대로 사용 (CARD_COLORS의 bg)
  return Array.from({ length: 16 }, (_, i) => {
    const id = String(i + 1).padStart(2, '0');
    const angle = (360 / 16) * i - 90;

    return {
      id: i,
      color: CARD_COLORS[id]?.bg || '#4FB0C6', // 해당 카드 색
      // 시작 위치: 펼쳐진 카드 위치 (getIntroCards와 동일)
      startX: Math.cos((angle * Math.PI) / 180) * distance,
      startY: Math.sin((angle * Math.PI) / 180) * distance,
      size: isMobile ? 10 : 14,
    };
  });
}

// ⭐ 16개 신호 라인 (카드 → 정중앙) - 네트워크 효과
function getSignalLines(isMobile: boolean) {
  const distance = isMobile ? 130 : 240;
  return Array.from({ length: 16 }, (_, i) => {
    const id = String(i + 1).padStart(2, '0');
    const angle = (360 / 16) * i - 90;

    return {
      id: i,
      color: CARD_COLORS[id]?.bg || '#4FB0C6',
      // 라인이 그려질 각도 (카드에서 가운데로)
      angle: angle + 180, // 라인을 카드에서 안쪽으로 향하게 (180도 반대)
      length: distance,
    };
  });
}

export default function Home() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [screen, setScreen] = useState<'intro'|'landing'|'guide'|'game'>('intro');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const [exiting, setExiting] = useState(false);

  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [role, setRole] = useState<'leader'|'member'>('leader');
  const [playerName, setPlayerName] = useState('');
  const [level, setLevel] = useState('standard');
  const [roleCode, setRoleCode] = useState<RoleCode | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [currentTab, setCurrentTab] = useState<TabType>('주제');

  const [showList, setShowList] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [showPdfToast, setShowPdfToast] = useState(false);
  const [checkStates, setCheckStates] = useState<Record<string, Record<number, boolean>>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [interimConclusions, setInterimConclusions] = useState<Record<string, string>>({});
  const [leaderConclusions, setLeaderConclusions] = useState<Record<string, LeaderConclusionState>>({});
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const [timer, setTimer] = useState(1200);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const topic = TOPICS[currentCardIdx];
  const color = CARD_COLORS[topic.id].bg;
  const lv = LEVELS[level];
  const isLeader = role === 'leader';
  const displayItem = item === '✏️ 직접 입력' ? customItem : item;
  const currentLeaderConclusion = leaderConclusions[topic.id] || defaultLeaderConclusion();
  const isCardCompleted = completedCards.has(topic.id);

  const myRole = roleCode ? getRole(roleCode) : null;

  // 인트로 데이터 (화면 크기에 따라)
  const introCards = getIntroCards(isMobile);
  const fireworkParticles = getFireworkParticles(isMobile);
  const lightRays = getLightRays(isMobile);

  useEffect(() => {
    if (screen !== 'intro') return;
    const timer = setTimeout(() => {
      setIntroDone(true);
      setTimeout(() => setScreen('landing'), 300);
    }, 9000);
    return () => clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await restoreSession();
        if (saved) {
          setSession(saved); setTeamId(saved.team_id);
          setPlayerName(saved.player_name); setRole(saved.role);
          setLevel(saved.level); setItem(saved.item || '');
          const [resps, prog] = await Promise.all([loadCardResponses(saved.team_id), loadCardProgress(saved.team_id)]);
          setResponses(resps); setCheckStates(prog.checkStates); setCompletedCards(prog.completedCards);
          setTimer(LEVELS[saved.level]?.timer || 1200);
          setScreen('game');
          setSessionLoading(false);
          return;
        }

        const v2Raw = typeof window !== 'undefined' ? localStorage.getItem('dtc_session_token_v2') : null;
        if (v2Raw) {
          const v2 = JSON.parse(v2Raw);
          const v2Role: 'leader' | 'member' = v2.isLeader ? 'leader' : 'member';
          const v2Level = v2.level || 'standard';
          const sess = await getOrCreateSession({
            playerName: v2.memberName,
            teamId: v2.teamId,
            role: v2Role,
            level: v2Level,
            item: v2.item || '',
          });
          if (sess) {
            setSession(sess); setTeamId(v2.teamId);
            setPlayerName(v2.memberName); setRole(v2Role);
            setLevel(v2Level); setItem(v2.item || '');
            if (v2.roleCode) setRoleCode(v2.roleCode as RoleCode);
            const [resps, prog] = await Promise.all([loadCardResponses(v2.teamId), loadCardProgress(v2.teamId)]);
            setResponses(resps); setCheckStates(prog.checkStates); setCompletedCards(prog.completedCards);
            setTimer(LEVELS[v2Level]?.timer || 1200);
            setScreen('game');
            setSessionLoading(false);
            return;
          }
        }

        setSessionLoading(false);
      } catch (e) {
        setSessionLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setInterval(() => setTimer(t => t - 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timer <= 0 && timerRef.current) clearInterval(timerRef.current);
  }, [timerActive, timer]);

  const goToCard = useCallback((idx: number) => {
    if (idx >= 0 && idx < TOPICS.length) {
      setCurrentCardIdx(idx);
      setCurrentTab('주제');
      setSwipeOffset(0);
    }
  }, []);

  const handleCheck = async (cardId: string, i: number) => {
    const newChecks = { ...(checkStates[cardId] || {}), [i]: !(checkStates[cardId]?.[i]) };
    setCheckStates(prev => ({ ...prev, [cardId]: newChecks }));
    if (session && teamId) {
      await saveCardProgress({ teamId, sessionId: session.id, cardId, checklistStatus: newChecks, completed: completedCards.has(cardId) });
    }
  };

  const handleSaveResponse = async (cardId: string, text: string) => {
    setResponses(prev => ({ ...prev, [cardId]: { texts: { '0': text }, images: {} } }));
    // toast 제거 — 글자 칠 때마다 뜨면 집중 방해됨. 저장은 계속 됨.
    if (session && teamId) {
      await saveCardResponse({ teamId, sessionId: session.id, cardId, texts: { '0': text } });
    }
  };

  const handleSaveInterim = (cardId: string, text: string) => {
    setInterimConclusions(prev => ({ ...prev, [cardId]: text }));
  };

  const handleLeaderConclusionChange = (key: keyof LeaderConclusionState, value: any) => {
    setLeaderConclusions(prev => ({
      ...prev,
      [topic.id]: { ...(prev[topic.id] || defaultLeaderConclusion()), [key]: value },
    }));
  };

  const handleComplete = async () => {
    setCompletedCards(prev => new Set([...prev, topic.id]));
    setSavedToast(true); setTimeout(() => setSavedToast(false), 2000);
    if (session && teamId) {
      await saveCardProgress({ teamId, sessionId: session.id, cardId: topic.id, checklistStatus: {}, completed: true });
    }
    if (currentCardIdx < TOPICS.length - 1) {
      setTimeout(() => goToCard(currentCardIdx + 1), 1000);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => { if (touchStart !== null) setSwipeOffset(e.touches[0].clientX - touchStart); };
  const onTouchEnd = () => {
    if (Math.abs(swipeOffset) > 80) {
      if (swipeOffset < 0 && currentCardIdx < TOPICS.length - 1) goToCard(currentCardIdx + 1);
      if (swipeOffset > 0 && currentCardIdx > 0) goToCard(currentCardIdx - 1);
    }
    setSwipeOffset(0); setTouchStart(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (screen !== 'game') return;
      if (e.key === 'ArrowRight') goToCard(currentCardIdx + 1);
      if (e.key === 'ArrowLeft') goToCard(currentCardIdx - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentCardIdx, goToCard, screen]);

  const exitGame = () => {
    localStorage.removeItem('dtc_session_token');
    localStorage.removeItem('dtc_session_token_v2');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    router.push('/student/join');
  };

  const handleStartClick = (path: string) => {
    setExiting(true);
    setTimeout(() => router.push(path), 600);
  };

  if (sessionLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500 font-mono text-sm">불러오는 중...</p>
    </div>
  );

  // ─── ⭐ INTRO ⭐ ───
  if (screen === 'intro') {
    // 사이즈 (모바일/PC)
    const briefcaseW = isMobile ? 130 : 180;
    const briefcaseH = isMobile ? 100 : 140;
    const cubeSize = isMobile ? 90 : 160;
    const cardOneW = isMobile ? 70 : 110;
    const cardOneH = isMobile ? 100 : 155;
    const cardFrameW = isMobile ? 110 : 170;
    const cardFrameH = isMobile ? 140 : 215;
    const cardW = isMobile ? 42 : 60;
    const cardH = isMobile ? 60 : 84;
    const rayHeight = isMobile ? 280 : 500;
    const containerH = isMobile ? 400 : 600;
    const logoSize = isMobile ? 'text-3xl' : 'text-5xl';

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden"
        style={{
          opacity: introDone ? 0 : 1,
          transition: 'opacity 0.3s ease-out',
        }}>

        {/* 메인 인트로 영역 */}
        <div className="relative w-full flex items-center justify-center"
          style={{ height: `${containerH}px`, maxWidth: '100%' }}>

          {/* ⭐ 신호 발산 동심원 (카드 뒤 - 사방으로 퍼짐) */}
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

          {/* ⭐ 카드 뒤 큰 오로라 후광 */}
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

          {/* ⭐ 카드 한 장 (중앙) */}
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

          {/* 폭죽 입자 */}
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

          {/* 16장 카드 — 가방에서 우아하게 사방으로 흩어짐 */}
          {introCards.map((card, i) => (
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

        {/* ⭐ 작은 빛 폭발 (5.0초 - 가운데 한 점에서 짧게) */}
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

        {/* ⭐ 거대한 오로라 후광 (5.2초~ 천천히 펴짐) */}
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

        {/* ⭐ 오로라 배경 (6.5초에 페이드 인) */}
        <div className="fixed inset-0 pointer-events-none"
          style={{
            opacity: 0,
            animation: 'auroraBackgroundFadeIn 1.5s ease-out 6.5s forwards',
            zIndex: 1,
            background: `
              radial-gradient(circle at 20% 30%, #06B6D420 0%, transparent 50%),
              radial-gradient(circle at 80% 60%, #8B5CF620 0%, transparent 50%),
              radial-gradient(circle at 50% 90%, #3B82F620 0%, transparent 60%)
            `,
          }} />

        {/* 로고 — 화면 정중앙에서 부드럽게 등장 (7.0초) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            opacity: 0,
            animation: 'introLogoFade 1.2s ease-out 7.0s forwards',
            zIndex: 30,
          }}>
          <div className="text-center relative">
            <p className="text-[10px] md:text-[12px] tracking-[5px] md:tracking-[7px] uppercase mb-2 md:mb-3 font-mono font-bold relative"
              style={{
                color: '#06B6D4',
                textShadow: '0 0 12px #06B6D4AA, 0 0 24px #06B6D466',
              }}>
              ConnectAI
            </p>
            <h1 className="font-black text-white tracking-tight mb-2 md:mb-3 relative logo-glow-text"
              style={{
                fontSize: isMobile ? '4rem' : '7rem',
                lineHeight: 1,
                textShadow: `
                  0 0 20px #FFFFFFAA,
                  0 0 40px #06B6D488,
                  0 0 80px #8B5CF666,
                  0 0 120px #3B82F644
                `,
              }}>
              SIGNAL
            </h1>
            <div className="flex items-center justify-center gap-2 md:gap-3 relative">
              <div className="h-[1px] w-8 md:w-12"
                style={{ background: `linear-gradient(to right, transparent, #06B6D4)` }} />
              <p className="text-[12px] md:text-base font-bold tracking-[2px] md:tracking-[3px] font-mono"
                style={{ color: '#C1E8EB', textShadow: '0 0 12px #06B6D466' }}>
                DIGITAL TRADE CARDS
              </p>
              <div className="h-[1px] w-8 md:w-12"
                style={{ background: `linear-gradient(to left, transparent, #8B5CF6)` }} />
            </div>
          </div>
        </div>

        <style jsx>{`
          /* ⭐⭐⭐ 신호 발산 + 카드 애니메이션 ⭐⭐⭐ */

          /* 신호 발산 동심원 - 시작 시 안 보이고, 애니메이션으로 펄스 → 3.6초에 완전 사라짐 */
          .signal-pulse-ring {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
            animation:
              signalPulseExpand 2.5s ease-out infinite,
              signalPulseFinalHide 0.3s ease-out 3.6s forwards;
          }
          @keyframes signalPulseExpand {
            0% {
              transform: translate(-50%, -50%) scale(0.3);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            100% {
              transform: translate(-50%, -50%) scale(2.5);
              opacity: 0;
            }
          }
          /* 폭발 시 - 무한 애니메이션 무시하고 완전 숨김 */
          @keyframes signalPulseFinalHide {
            0% { opacity: 0; }
            100% {
              opacity: 0;
              display: none;
              visibility: hidden;
            }
          }

          /* 카드 뒤 오로라 후광 - 등장 → 펄스 → 폭발 시 완전 사라짐 */
          .card-aurora-glow {
            opacity: 0;
            animation:
              auroraGlowEnter 1.2s ease-out 1.2s forwards,
              auroraGlowPulse 2.5s ease-in-out 2.4s 1,
              auroraGlowFinalHide 0.6s ease-in 3.6s forwards;
          }
          @keyframes auroraGlowEnter {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
          }
          @keyframes auroraGlowPulse {
            0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
          }
          /* 폭발 시 - 완전히 사라짐 */
          @keyframes auroraGlowFinalHide {
            0% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
            40% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.6);
              filter: brightness(2);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(2.2);
              filter: brightness(3);
              visibility: hidden;
            }
          }

          /* ⭐ 카드 한 장 (1.4초 등장 → 3.6초 폭발) */
          .cube-inner-card {
            animation:
              cubeInnerCardEnter 1s ease-out 1.4s forwards,
              cubeInnerCardPulse 1.4s ease-in-out 2.4s infinite,
              cubeInnerCardExplode 0.6s ease-in 3.6s forwards;
          }
          @keyframes cubeInnerCardEnter {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0) rotate(-180deg);
            }
            60% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.15) rotate(10deg);
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1) rotate(0deg);
            }
          }
          @keyframes cubeInnerCardPulse {
            0%, 100% {
              box-shadow: 0 0 30px ${S.cyan}, 0 0 60px ${S.cyan}88, inset 0 0 20px rgba(255,255,255,0.3);
            }
            50% {
              box-shadow: 0 0 50px #FFFFFF, 0 0 90px ${S.cyan}, inset 0 0 30px rgba(255,255,255,0.6);
            }
          }
          @keyframes cubeInnerCardExplode {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
              filter: brightness(1);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(2.5);
              filter: brightness(8);
            }
          }

          @keyframes centralBlast {
            0% { opacity: 0; width: 20px; height: 20px; }
            30% { opacity: 1; width: ${isMobile ? '400px' : '600px'}; height: ${isMobile ? '400px' : '600px'}; }
            100% { opacity: 0; width: ${isMobile ? '500px' : '800px'}; height: ${isMobile ? '500px' : '800px'}; }
          }

          @keyframes cardElegantSpread {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
            }
            15% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.1) rotate(0deg);
            }
            60% {
              opacity: 1;
              transform: 
                translate(calc(-50% + var(--final-x) * 0.85), calc(-50% + var(--final-y) * 0.85))
                scale(1.05)
                rotate(calc(var(--final-rotate) * 0.85));
            }
            100% {
              opacity: 1;
              transform: 
                translate(calc(-50% + var(--final-x)), calc(-50% + var(--final-y)))
                scale(1)
                rotate(var(--final-rotate));
            }
          }

          /* ⭐ C: 카드들 어두워졌다 다시 밝아짐 (4~7초) */
          @keyframes cardDimAndBrighten {
            0% { filter: brightness(1); }
            30% { filter: brightness(0.4); }
            60% { filter: brightness(0.4); }
            100% { filter: brightness(1.1); }
          }

          @keyframes particleBurst {
            0% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
            20% {
              opacity: 1;
              transform: translate(
                calc(-50% + var(--burst-x) * 0.3),
                calc(-50% + var(--burst-y) * 0.3)
              ) scale(1.5);
            }
            100% {
              opacity: 0;
              transform: translate(
                calc(-50% + var(--burst-x)),
                calc(-50% + var(--burst-y))
              ) scale(0.3);
            }
          }

          @keyframes introLogoFade {
            0% {
              opacity: 0;
              transform: scale(0.92);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          /* ⭐⭐⭐ SIGNAL 로고 글로우 펄스 (등장 후 천천히) ⭐⭐⭐ */
          .logo-glow-text {
            animation: logoGlowPulse 3s ease-in-out 8s infinite;
          }
          @keyframes logoGlowPulse {
            0%, 100% {
              text-shadow:
                0 0 20px #FFFFFFAA,
                0 0 40px #06B6D488,
                0 0 80px #8B5CF666,
                0 0 120px #3B82F644;
            }
            50% {
              text-shadow:
                0 0 30px #FFFFFFFF,
                0 0 60px #06B6D4DD,
                0 0 100px #8B5CF688,
                0 0 160px #3B82F666;
            }
          }

          /* ⭐⭐⭐ 새 시퀀스: 큐브→로고 변환 ⭐⭐⭐ */

          /* ⭐ 작은 빛 폭발 (scale 방식 - GPU 가속) */
          .light-burst {
            transform: translate(-50%, -50%) scale(0.05);
            animation: lightBurstScale 0.8s ease-out 6.5s forwards;
          }
          @keyframes lightBurstScale {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.05);
            }
            40% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(0.7);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          /* ⭐ 거대한 오로라 후광 (scale 방식 - GPU 가속, 부드러움) */
          .aurora-halo {
            transform: translate(-50%, -50%) scale(0.05);
            animation: auroraHaloScale 2.2s ease-out 6.7s forwards;
          }
          @keyframes auroraHaloScale {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.05);
            }
            25% {
              opacity: 0.5;
              transform: translate(-50%, -50%) scale(0.4);
            }
            50% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(0.75);
            }
            75% {
              opacity: 0.9;
              transform: translate(-50%, -50%) scale(0.92);
            }
            100% {
              opacity: 0.7;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          /* 오로라 배경 페이드 인 */
          @keyframes auroraBackgroundFadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (screen === 'landing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.5)' : 'scale(1)',
        transition: 'all 0.6s cubic-bezier(0.7, 0, 0.84, 0)',
        filter: exiting ? 'blur(8px)' : 'blur(0)',
      }}>

      {/* ⭐⭐⭐ 오로라 배경 ⭐⭐⭐ */}

      {/* 메시 그라디언트 (오로라) */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, #06B6D420 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, #8B5CF620 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, #3B82F61A 0%, transparent 60%)
          `,
        }} />

      {/* 빛 신호 4개 (오로라 색) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute landing-signal-1"
          style={{
            top: '15%',
            left: 0,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, #06B6D4, transparent)`,
            boxShadow: `0 0 14px #06B6D4, 0 0 28px #06B6D466`,
          }} />
        <div className="absolute landing-signal-2"
          style={{
            top: '45%',
            right: 0,
            width: '120px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, #8B5CF6, transparent)`,
            boxShadow: `0 0 14px #8B5CF6, 0 0 28px #8B5CF666`,
          }} />
        <div className="absolute landing-signal-3"
          style={{
            top: '78%',
            left: 0,
            width: '90px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, #3B82F6, transparent)`,
            boxShadow: `0 0 14px #3B82F6, 0 0 28px #3B82F666`,
          }} />
        <div className="absolute landing-signal-vertical"
          style={{
            left: '15%',
            top: 0,
            width: '2px',
            height: '80px',
            background: `linear-gradient(180deg, transparent, #06B6D4, transparent)`,
            boxShadow: `0 0 14px #06B6D4, 0 0 28px #06B6D466`,
          }} />
      </div>

      {/* 떠다니는 빛 입자 (오로라 색) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 18 }).map((_, i) => {
          const colors = ['#06B6D4', '#8B5CF6', '#3B82F6', '#C1E8EB'];
          const left = (i * 11 + 7) % 100;
          const top = (i * 17 + 13) % 100;
          const size = 1.5 + (i % 3) * 0.8;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full landing-particle"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                background: colors[i % 4],
                boxShadow: `0 0 ${size * 4}px ${colors[i % 4]}`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }} />
          );
        })}
      </div>

      {/* 로고 뒤 거대한 오로라 글로우 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[700px] h-[400px] md:h-[700px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, #06B6D415 0%, #8B5CF60D 40%, transparent 70%)`,
          filter: 'blur(40px)',
        }} />

      <div className="relative z-10 text-center max-w-md w-full"
        style={{ animation: 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <p className="text-[10px] md:text-[11px] tracking-[4px] md:tracking-[6px] uppercase mb-3 md:mb-4 font-mono font-bold"
          style={{ color: '#06B6D4', textShadow: '0 0 10px #06B6D4AA' }}>
          ConnectAI
        </p>
        <h1 className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight"
          style={{ textShadow: '0 0 20px #FFFFFF66, 0 0 40px #06B6D466, 0 0 80px #8B5CF633' }}>
          SIGNAL
        </h1>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-[1px] w-8" style={{ background: `linear-gradient(to right, transparent, #06B6D4)` }} />
          <p className="text-[12px] md:text-[13px] font-mono font-bold tracking-[2px]"
            style={{ color: '#C1E8EB', textShadow: '0 0 8px #06B6D466' }}>
            DIGITAL TRADE CARDS
          </p>
          <div className="h-[1px] w-8" style={{ background: `linear-gradient(to left, transparent, #8B5CF6)` }} />
        </div>
        <p className="text-gray-400 text-[12px] md:text-[13px] mb-6 md:mb-8 leading-relaxed px-2">
          디지털 무역 전략을 직접 만들어보는<br />체험형 카드게임 학습 플랫폼
        </p>

        <div className="flex justify-center gap-2 md:gap-3 mb-8 md:mb-10">
          {['01','02','03','04','05'].map((id, i) => (
            <div key={id} className="relative rounded-xl overflow-hidden cyber-card-mini hover-lift"
              style={{
                width: isMobile ? '40px' : '48px',
                height: isMobile ? '56px' : '64px',
                background: CARD_COLORS[id].bg,
                transform: `rotate(${(i-2)*6}deg)`,
                boxShadow: `0 4px 20px ${CARD_COLORS[id].bg}66, 0 0 24px ${CARD_COLORS[id].bg}44`,
                animationDelay: `${i * 0.3}s`,
              }}>
              {/* 사이버 회로 패턴 (홀로그램) */}
              <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: `
                    linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px),
                    linear-gradient(0deg, rgba(255,255,255,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '8px 8px',
                }} />

              {/* 사선 회로 라인 */}
              <div className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  backgroundImage: `
                    linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)
                  `,
                }} />

              {/* 4모서리 사이버 코너 */}
              <span className="absolute top-1 left-1 w-2 h-[1.5px] bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute top-1 left-1 w-[1.5px] h-2 bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute top-1 right-1 w-2 h-[1.5px] bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute top-1 right-1 w-[1.5px] h-2 bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute bottom-1 left-1 w-2 h-[1.5px] bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute bottom-1 left-1 w-[1.5px] h-2 bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute bottom-1 right-1 w-2 h-[1.5px] bg-white/80" style={{ boxShadow: '0 0 4px white' }} />
              <span className="absolute bottom-1 right-1 w-[1.5px] h-2 bg-white/80" style={{ boxShadow: '0 0 4px white' }} />

              {/* 스캔라인 효과 (위→아래 가로 빛) */}
              <div className="absolute left-0 right-0 pointer-events-none cyber-card-scanline"
                style={{
                  height: '6px',
                  background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.6), transparent)',
                  boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                  animationDelay: `${i * 0.6}s`,
                }} />

              {/* 카드 번호 */}
              <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] md:text-[11px] font-black font-mono z-10"
                style={{ textShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.4)' }}>
                {id}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => handleStartClick('/student/join')}
          className="cyber-btn-primary btn-orbit relative w-full py-3.5 md:py-4 font-black rounded-2xl text-[15px] md:text-base mb-3 transition-all hover:scale-[1.02] overflow-hidden group"
          style={{
            background: S.green,
            color: S.navy,
            boxShadow: `0 10px 30px -5px ${S.green}66, 0 0 30px ${S.green}55`,
          }}>
          <span className="relative z-10 tracking-wider">{`>`} 학생으로 입장 →</span>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
        </button>

        <button onClick={() => handleStartClick('/teacher')}
          className="cyber-btn-secondary btn-orbit-aqua relative w-full py-3 md:py-3.5 font-bold rounded-2xl text-[13px] md:text-[14px] transition-all hover:scale-[1.01] mb-3 overflow-hidden"
          style={{
            background: 'rgba(6, 182, 212, 0.08)',
            border: `1px solid #06B6D466`,
            color: '#06B6D4',
            textShadow: '0 0 8px #06B6D466',
            boxShadow: `0 0 20px #06B6D422, inset 0 0 12px #06B6D411`,
          }}>
          <span className="relative z-10 tracking-wide">{`>`} 관리자 로그인</span>
        </button>

        <button onClick={() => setScreen('guide')}
          className="cyber-btn-tertiary relative w-full py-3 md:py-3.5 rounded-2xl text-[13px] md:text-[14px] font-bold transition-all hover:scale-[1.01] overflow-hidden"
          style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: `1px solid #8B5CF666`,
            color: '#8B5CF6',
            textShadow: '0 0 8px #8B5CF666',
            boxShadow: `0 0 20px #8B5CF622, inset 0 0 12px #8B5CF611`,
          }}>
          <span className="relative z-10 tracking-wide">{`>`} 퍼실리테이터 가이드</span>
        </button>

        <p className="text-gray-700 text-[10px] mt-6 md:mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
        /* ⭐ 빛 신호 흐름 */
        .landing-signal-1 {
          animation: landingSignalRight 5s linear infinite;
        }
        .landing-signal-3 {
          animation: landingSignalRight 7s linear infinite 1.5s;
        }
        @keyframes landingSignalRight {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        .landing-signal-2 {
          animation: landingSignalLeft 6s linear infinite 0.5s;
        }
        @keyframes landingSignalLeft {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        .landing-signal-vertical {
          animation: landingSignalDown 6s linear infinite;
        }
        @keyframes landingSignalDown {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        /* 떠다니는 입자 */
        .landing-particle {
          animation-name: landingParticleTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes landingParticleTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        /* ⭐ 사이버 미니 카드 (5장) - 스캔라인 흐름 */
        .cyber-card-scanline {
          animation: cardScanlineFlow 3s ease-in-out infinite;
          top: 0;
          opacity: 0;
        }
        @keyframes cardScanlineFlow {
          0% {
            top: -10%;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            top: 110%;
            opacity: 0;
          }
        }

        /* ⭐ 메인 버튼 - 자체 펄스 글로우 */
        .cyber-btn-primary {
          animation: cyberPrimaryPulse 2.5s ease-in-out infinite;
        }
        @keyframes cyberPrimaryPulse {
          0%, 100% {
            box-shadow: 0 10px 30px -5px ${S.green}66, 0 0 30px ${S.green}55;
          }
          50% {
            box-shadow: 0 10px 40px -5px ${S.green}88, 0 0 50px ${S.green}88;
          }
        }

        /* ⭐ 보조 버튼 - 사이안 펄스 */
        .cyber-btn-secondary {
          animation: cyberSecondaryPulse 3s ease-in-out infinite;
        }
        @keyframes cyberSecondaryPulse {
          0%, 100% {
            box-shadow: 0 0 20px #06B6D422, inset 0 0 12px #06B6D411;
          }
          50% {
            box-shadow: 0 0 30px #06B6D466, inset 0 0 16px #06B6D422;
          }
        }

        /* ⭐ 가이드 버튼 - 보라 펄스 */
        .cyber-btn-tertiary {
          animation: cyberTertiaryPulse 3.5s ease-in-out infinite;
        }
        @keyframes cyberTertiaryPulse {
          0%, 100% {
            box-shadow: 0 0 20px #8B5CF622, inset 0 0 12px #8B5CF611;
          }
          50% {
            box-shadow: 0 0 30px #8B5CF666, inset 0 0 16px #8B5CF622;
          }
        }

        .btn-orbit::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border-radius: 16px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(255, 255, 255, 0.6) 30deg,
            transparent 60deg,
            transparent 360deg
          );
          animation: btnOrbit 3s linear infinite;
          z-index: 0;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .btn-orbit:hover::before {
          opacity: 1;
        }
        .btn-orbit::after {
          content: '';
          position: absolute;
          inset: 2px;
          border-radius: 14px;
          background: ${S.green};
          z-index: 1;
        }
        .btn-orbit > * {
          position: relative;
          z-index: 2;
        }

        .btn-orbit-aqua::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            #06B6D488 30deg,
            transparent 60deg,
            transparent 360deg
          );
          animation: btnOrbit 4s linear infinite;
          opacity: 0;
          transition: opacity 0.3s;
          z-index: 0;
        }
        .btn-orbit-aqua:hover::before {
          opacity: 1;
        }

        @keyframes btnOrbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (screen === 'guide') return (
    <div className="min-h-screen px-3 md:px-4 py-4 md:py-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setScreen('landing')} className="text-gray-600 text-sm mb-3 md:mb-4">← 돌아가기</button>
        <div className="rounded-2xl p-4 md:p-6 mb-4 md:mb-6" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
          <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: S.green }}>FACILITATOR GUIDE</p>
          <h2 className="text-lg md:text-xl font-black text-white mb-1">퍼실리테이터 운영 가이드</h2>
          <p className="text-[11px] md:text-[12px] text-gray-500">카드 01 기준 · 45~60분 · 팀별 4~6명</p>
        </div>
        {[
          { time: '0–5분',   step: '주제 탭 — 카드 개념 확인', icon: '🎯', color: '#534AB7', tip: '주제 탭을 프로젝터에 띄워 핵심 통찰 질문을 함께 읽으세요.' },
          { time: '5–25분',  step: 'Q1~Q3 탭 — 팀 토론 + 답변', icon: '💬', color: '#00B5AD', tip: '각 Q탭마다 10분씩. 중간 결론 빈칸을 꼭 채우게 하세요.' },
          { time: '25–40분', step: '결론 탭 — 한 문장 전략', icon: '✏️', color: '#78BE20', tip: '4필드 입력 → 자동 합성 → 팀과 함께 다듬기 순서로 진행하세요.' },
          { time: '40–50분', step: '카드 완료 → 다음 카드', icon: '✅', color: '#4FB0C6', tip: 'Q1~Q3 답변 + 한 문장 전략 작성 후 카드 완료.' },
          { time: '50–60분', step: '팀별 발표', icon: '📌', color: '#FF6F61', tip: '각 팀의 한 문장 전략을 발표하고 강사가 피드백합니다.' },
        ].map((f, i) => (
          <div key={i} className="flex gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-base md:text-lg flex-shrink-0"
              style={{ background: f.color + '22', border: `2px solid ${f.color}` }}>{f.icon}</div>
            <div className="flex-1 pt-0.5 md:pt-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[12px] md:text-[13px] font-bold" style={{ color: f.color }}>{f.step}</span>
                <span className="text-[10px] md:text-[11px] text-gray-600 px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>{f.time}</span>
              </div>
              <div className="text-[11px] px-3 py-1.5 rounded-lg" style={{ color: f.color, background: f.color + '10' }}>💡 {f.tip}</div>
            </div>
          </div>
        ))}
        <button onClick={() => setScreen('landing')} className="w-full py-3 rounded-xl text-sm mt-4 mb-8 text-gray-500 border border-white/10">← 돌아가기</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center px-3 md:px-4 py-3 md:py-4 relative overflow-hidden">

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
        <div className="absolute game-signal-1"
          style={{
            top: '12%',
            left: 0,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
        <div className="absolute game-signal-2"
          style={{
            top: '50%',
            right: 0,
            width: '120px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.purple}, transparent)`,
            boxShadow: `0 0 14px ${S.purple}, 0 0 28px ${S.purple}66`,
          }} />
        <div className="absolute game-signal-3"
          style={{
            top: '85%',
            left: 0,
            width: '90px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${S.blue}, transparent)`,
            boxShadow: `0 0 14px ${S.blue}, 0 0 28px ${S.blue}66`,
          }} />
        <div className="absolute game-signal-vertical"
          style={{
            right: '8%',
            top: 0,
            width: '2px',
            height: '80px',
            background: `linear-gradient(180deg, transparent, ${S.cyan}, transparent)`,
            boxShadow: `0 0 14px ${S.cyan}, 0 0 28px ${S.cyan}66`,
          }} />
      </div>

      {/* 떠다니는 빛 입자 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const colors = [S.cyan, S.purple, S.blue];
          const left = (i * 13 + 7) % 100;
          const top = (i * 17 + 13) % 100;
          const size = 1.5 + (i % 3) * 0.5;
          const duration = 4 + (i % 4);
          const delay = (i % 5) * 0.7;
          return (
            <div key={i} className="absolute rounded-full game-particle"
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

      {/* 카드 색깔 글로우 (현재 카드 컬러 따라감) */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-96 md:h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`, zIndex: 1 }} />

      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] md:text-[11px] tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
            <h1 className="text-xs md:text-sm font-extrabold text-white">디지털 무역 전략카드</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-1 rounded-md font-bold" style={{ background: lv.color + '22', color: lv.color }}>{lv.emoji} {lv.label}</span>
            <button onClick={() => setShowList(!showList)}
              className="rounded-lg px-2.5 py-1 text-[11px] text-gray-400 transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {showList ? '닫기' : '목록'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {myRole ? (
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1"
              style={{ background: `${myRole.color}18`, border: `1px solid ${myRole.color}40` }}>
              <span className="text-[14px]">{myRole.icon}</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-bold text-white">{playerName}</span>
                <span className="text-[9px] font-mono" style={{ color: myRole.color }}>{myRole.nameKr}</span>
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-gray-400 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {isLeader ? '👑' : '💬'} {playerName}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-md truncate flex-1"
            style={{ color: S.green, background: `${S.green}10` }}>{displayItem}</span>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className={`text-[12px] font-mono font-bold ${timer <= 60 ? 'text-red-400' : 'text-white'}`}>{fmt(timer)}</span>
            <button onClick={() => setTimerActive(!timerActive)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${timerActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {timerActive ? '⏸' : '▶'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-gray-600 font-mono min-w-[50px]">{currentCardIdx + 1} / {TOPICS.length}</span>
          <div className="flex-1 h-[4px] rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all relative overflow-hidden"
              style={{
                width: `${((currentCardIdx+1)/TOPICS.length)*100}%`,
                background: color,
                boxShadow: `0 0 12px ${color}88`
              }}>
              <div className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                  animation: 'shimmer 2.5s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-0.5 flex-wrap">
          {TOPICS.map((t, i) => (
            <button key={t.id} onClick={() => goToCard(i)}
              className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-bold font-mono transition-all hover:scale-110"
              style={{
                background: currentCardIdx === i ? CARD_COLORS[t.id].bg : completedCards.has(t.id) ? CARD_COLORS[t.id].bg + '44' : 'rgba(255,255,255,0.06)',
                border: currentCardIdx === i ? `2px solid ${CARD_COLORS[t.id].bg}` : '1px solid rgba(255,255,255,0.08)',
                color: currentCardIdx === i ? '#fff' : completedCards.has(t.id) ? CARD_COLORS[t.id].bg : '#555',
                boxShadow: currentCardIdx === i ? `0 4px 12px ${CARD_COLORS[t.id].bg}66` : 'none',
              }}>
              {completedCards.has(t.id) && currentCardIdx !== i ? '✓' : t.id}
            </button>
          ))}
        </div>
      </div>

      {myRole && myRole.primaryCards.includes(topic.id) && (
        <div className="w-full max-w-md mb-3 relative z-10">
          <div className="rounded-xl px-3 py-2 flex items-center gap-2 backdrop-blur-sm"
            style={{
              background: `${myRole.color}15`,
              border: `1px solid ${myRole.color}40`,
              boxShadow: `0 4px 20px ${myRole.color}22`,
            }}>
            <span className="text-base">{myRole.icon}</span>
            <div className="flex-1">
              <p className="text-[10px] font-mono tracking-widest" style={{ color: myRole.color }}>YOUR MISSION</p>
              <p className="text-[12px] font-bold text-white">이 카드는 {myRole.nameKr}님이 주도해주세요!</p>
            </div>
          </div>
        </div>
      )}

      {showList && (
        <div className="fixed inset-0 backdrop-blur-xl z-[100] overflow-y-auto p-4 pt-14" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <button onClick={() => setShowList(false)} className="fixed top-4 right-4 rounded-lg px-4 py-2 text-white text-sm z-10" style={{ background: 'rgba(255,255,255,0.1)' }}>닫기</button>
          <h2 className="text-lg font-extrabold text-white mb-4">전체 카드 목록</h2>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((t, i) => {
              const done = completedCards.has(t.id);
              const myCard = myRole && myRole.primaryCards.includes(t.id);
              return (
                <button key={t.id} onClick={() => { goToCard(i); setShowList(false); }}
                  className="text-left rounded-xl p-3 transition relative"
                  style={{ background: done ? `${CARD_COLORS[t.id].bg}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? CARD_COLORS[t.id].bg + '55' : 'rgba(255,255,255,0.08)'}` }}>
                  {myCard && (
                    <div className="absolute top-2 right-2 text-[12px]" title={`${myRole?.nameKr} 담당 카드`}>
                      {myRole?.icon}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black font-mono flex-shrink-0" style={{ background: CARD_COLORS[t.id].bg }}>{t.id}</span>
                    {done && <span className="text-[10px]" style={{ color: CARD_COLORS[t.id].bg }}>✓ 완료</span>}
                  </div>
                  <div className="text-[12px] font-bold text-white">{t.title}</div>
                  <div className="text-[10px] text-gray-600">{t.titleEn}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div key={topic.id} className="w-full max-w-[420px] relative z-10 card-enter"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <SignalCard
          topic={topic}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          checkStates={checkStates}
          onCheck={handleCheck}
          responses={responses}
          onSaveResponse={handleSaveResponse}
          interimConclusions={interimConclusions}
          onSaveInterim={handleSaveInterim}
          leaderConclusion={currentLeaderConclusion}
          onLeaderConclusionChange={handleLeaderConclusionChange}
          completedCards={completedCards}
          onComplete={handleComplete}
          isCardCompleted={isCardCompleted}
          isLeader={isLeader}
          displayItem={displayItem}
          level={level}
          minChars={lv.minChars}
        />
      </div>

      <div className="flex gap-3 items-center mt-3 md:mt-4 relative z-10">
        <button onClick={() => goToCard(currentCardIdx - 1)} disabled={currentCardIdx === 0}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg transition-all disabled:opacity-20 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>‹</button>
        <div className="text-center min-w-[140px] md:min-w-[160px]">
          <div className="text-[12px] md:text-[13px] font-bold text-white">{topic.title}</div>
          <div className="text-[10px] text-gray-600 font-mono mt-0.5">카드 {currentCardIdx + 1}/16 · {'★'.repeat(topic.difficulty)}{'☆'.repeat(5-topic.difficulty)}</div>
        </div>
        <button onClick={() => goToCard(currentCardIdx + 1)} disabled={currentCardIdx === TOPICS.length - 1}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg font-bold transition-all disabled:opacity-20 hover:scale-110"
          style={{
            background: currentCardIdx === TOPICS.length - 1 ? 'rgba(255,255,255,0.06)' : color,
            color: '#fff',
            boxShadow: currentCardIdx === TOPICS.length - 1 ? 'none' : `0 6px 20px -5px ${color}88`,
          }}>›</button>
      </div>

      {SHOW_PDF_BUTTON && currentCardIdx === 15 && isLeader && (
        <div className="mt-3 w-full max-w-[420px] relative z-10">
          <button onClick={() => { setShowPdfToast(true); setTimeout(() => setShowPdfToast(false), 3000); }}
            className="w-full py-2.5 font-bold rounded-xl text-[13px] transition"
            style={completedCards.size === 16
              ? { background: '#512D38', color: '#fff', border: '1px solid #6d3d4d' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#555' }}>
            📄 PDF 전략 리포트 생성 {completedCards.size === 16 ? '' : `(${completedCards.size}/16 완료)`}
          </button>
        </div>
      )}

      <div className="mt-3 md:mt-4 text-[10px] text-gray-700 text-center relative z-10 font-mono">
        © 2026 SIGNAL — ConnectAI
        <button onClick={exitGame}
          className="ml-3 text-gray-700 underline hover:text-gray-500">나가기</button>
      </div>

      {savedToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 z-[300] flex items-center gap-2 backdrop-blur-sm"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={S.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          <span className="text-[13px] text-white font-semibold">저장 완료!</span>
        </div>
      )}
      {showPdfToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 z-[300] flex items-center gap-3 backdrop-blur-sm max-w-[320px]"
          style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,103,97,0.3)', animation: 'fadeIn 0.3s ease-out' }}>
          <span className="text-xl">{completedCards.size === 16 ? '📄' : '🔒'}</span>
          <div>
            {completedCards.size === 16
              ? <><div className="text-[13px] text-white font-semibold">PDF 리포트 준비 중</div><div className="text-[11px] text-amber-400">AI 전략 내러티브 완성 후 활성화됩니다</div></>
              : <><div className="text-[13px] text-white font-semibold">아직 완료되지 않은 카드가 있어요</div><div className="text-[11px] text-amber-400">16개 카드 전부 완료 후 생성 가능 ({completedCards.size}/16)</div></>
            }
          </div>
        </div>
      )}

      <style jsx>{`
        /* ⭐ 빛 신호 흐름 */
        .game-signal-1 {
          animation: gameSignalRight 5s linear infinite;
        }
        .game-signal-3 {
          animation: gameSignalRight 7s linear infinite 1.5s;
        }
        @keyframes gameSignalRight {
          0% { transform: translateX(-100px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }

        .game-signal-2 {
          animation: gameSignalLeft 6s linear infinite 0.5s;
        }
        @keyframes gameSignalLeft {
          0% { transform: translateX(120px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-100vw); opacity: 0; }
        }

        .game-signal-vertical {
          animation: gameSignalDown 6s linear infinite;
        }
        @keyframes gameSignalDown {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        /* 떠다니는 입자 */
        .game-particle {
          animation-name: gameParticleTwinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes gameParticleTwinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
