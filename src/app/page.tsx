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

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };
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

// ⭐ 인트로용 16장 카드 — 부채꼴 펼침 (160°)
const INTRO_CARDS = Array.from({ length: 16 }, (_, i) => {
  const id = String(i + 1).padStart(2, '0');
  const totalAngle = 160;
  const angle = -totalAngle / 2 + (totalAngle / 15) * i;
  // 분출 시 랜덤한 방향 (각 카드마다 다르게)
  const burstAngle = -180 + (360 / 15) * i + (Math.random() * 30 - 15);
  const burstDistance = 200 + Math.random() * 100;
  return {
    id,
    color: CARD_COLORS[id]?.bg || '#4FB0C6',
    angle,
    delay: 1.4 + i * 0.04, // 가방 열린 후 등장
    burstAngle,
    burstDistance,
    burstX: Math.cos((burstAngle * Math.PI) / 180) * burstDistance,
    burstY: Math.sin((burstAngle * Math.PI) / 180) * burstDistance,
    burstRotate: Math.random() * 720 - 360,
  };
});

// ⭐ 폭죽 입자 데이터 (24개)
const FIREWORK_PARTICLES = Array.from({ length: 24 }, (_, i) => {
  const angle = (360 / 24) * i;
  const distance = 200 + Math.random() * 100;
  const colors = [S.green, S.aqua, '#FFC72C', '#FF6F61', '#C1A8F0', '#4FB0C6', '#FF671F'];
  return {
    id: i,
    angle,
    distance,
    x: Math.cos((angle * Math.PI) / 180) * distance,
    y: Math.sin((angle * Math.PI) / 180) * distance,
    color: colors[i % colors.length],
    size: 4 + Math.random() * 4,
    delay: Math.random() * 0.1,
  };
});

export default function Home() {
  const router = useRouter();

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

  // 인트로 자동 종료 (5초로 늘림 — 가방 + 분출 + 폭죽 + 부채꼴 + 로고)
  useEffect(() => {
    if (screen !== 'intro') return;
    const timer = setTimeout(() => {
      setIntroDone(true);
      setTimeout(() => setScreen('landing'), 300);
    }, 5000);
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
    setSavedToast(true); setTimeout(() => setSavedToast(false), 2000);
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

  // ─── ⭐⭐⭐ INTRO (서류가방 + 카드 분출 + 폭죽) ⭐⭐⭐ ───
  if (screen === 'intro') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        opacity: introDone ? 0 : 1,
        transition: 'opacity 0.3s ease-out',
      }}>

      {/* 배경 플래시 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${S.green}10 0%, transparent 60%)`,
          animation: 'introFlash 5s ease-out forwards',
        }} />

      {/* 메인 인트로 영역 */}
      <div className="relative w-full max-w-3xl h-[500px] flex items-center justify-center">

        {/* 💼 서류 가방 (SVG) */}
        <div className="absolute"
          style={{
            animation: 'briefcaseEnter 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            transformOrigin: 'center',
          }}>
          <svg width="180" height="140" viewBox="0 0 180 140" className="briefcase-svg">
            {/* 가방 그림자 */}
            <ellipse cx="90" cy="135" rx="70" ry="6" fill="rgba(0,0,0,0.4)" />

            {/* 손잡이 */}
            <rect className="handle" x="75" y="10" width="30" height="20" rx="4" fill="none"
              stroke="#3a2418" strokeWidth="3" />
            <rect className="handle" x="78" y="13" width="24" height="14" rx="3" fill="none"
              stroke="#5C3A24" strokeWidth="2" />

            {/* 가방 본체 (아래 부분) */}
            <rect x="20" y="55" width="140" height="75" rx="6" fill="#5C3A24" />
            <rect x="20" y="55" width="140" height="75" rx="6" fill="url(#leatherGradient)" />

            {/* 가방 뚜껑 (열림 애니메이션 적용) */}
            <g className="briefcase-lid" style={{ transformOrigin: '90px 55px' }}>
              <rect x="20" y="30" width="140" height="30" rx="6" fill="#6B4226" />
              <rect x="20" y="30" width="140" height="30" rx="6" fill="url(#leatherGradient2)" />
              {/* 자물쇠 */}
              <rect x="80" y="48" width="20" height="12" rx="2" fill="#FFC72C" />
              <rect x="84" y="51" width="12" height="6" rx="1" fill="#B8860B" />
              <circle cx="90" cy="54" r="1.5" fill="#3a2418" />
            </g>

            {/* 가방 내부에서 빛이 새어나옴 */}
            <rect className="briefcase-glow" x="22" y="55" width="136" height="6" fill={S.green} opacity="0" />

            {/* 박음질 디테일 */}
            <line x1="22" y1="60" x2="158" y2="60" stroke="#3a2418" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.6" />
            <line x1="22" y1="125" x2="158" y2="125" stroke="#3a2418" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.6" />

            {/* 텍스트 라벨 */}
            <text x="90" y="100" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#FFC72C" fontWeight="bold" opacity="0.7">
              SIGNAL
            </text>

            {/* 그라디언트 정의 */}
            <defs>
              <linearGradient id="leatherGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7A4F2E" />
                <stop offset="50%" stopColor="#5C3A24" />
                <stop offset="100%" stopColor="#3a2418" />
              </linearGradient>
              <linearGradient id="leatherGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5A38" />
                <stop offset="100%" stopColor="#6B4226" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* 💥 폭죽 입자 (가방 열릴 때 터짐) */}
        <div className="absolute" style={{ animation: 'fireworkBurst 0s linear 1.4s forwards', opacity: 0 }}>
          {FIREWORK_PARTICLES.map(p => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                animation: `particleBurst 1.5s cubic-bezier(0.16, 1, 0.3, 1) ${1.4 + p.delay}s forwards`,
                opacity: 0,
                '--burst-x': `${p.x}px`,
                '--burst-y': `${p.y}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* 🎴 16장 카드 — 가방에서 분출 → 부채꼴 정렬 */}
        {INTRO_CARDS.map((card, i) => (
          <div
            key={card.id}
            className="absolute rounded-xl flex flex-col items-center justify-center text-white font-black"
            style={{
              width: '70px',
              height: '98px',
              background: card.color,
              boxShadow: `0 8px 24px ${card.color}66, 0 0 20px ${card.color}33`,
              animation: `cardBurstAndSettle 2.6s cubic-bezier(0.16, 1, 0.3, 1) ${card.delay}s forwards`,
              transformOrigin: 'bottom center',
              opacity: 0,
              '--burst-x': `${card.burstX}px`,
              '--burst-y': `${card.burstY}px`,
              '--burst-rotate': `${card.burstRotate}deg`,
              '--final-angle': `${card.angle}deg`,
              '--final-y': `${Math.abs(card.angle) * 0.4}px`,
            } as React.CSSProperties}
          >
            <span className="text-[10px] font-mono opacity-80">CARD</span>
            <span className="text-base font-mono">{card.id}</span>
          </div>
        ))}
      </div>

      {/* 로고 (인트로 후반부 등장) */}
      <div className="text-center mt-4"
        style={{
          opacity: 0,
          animation: 'introLogoFade 1s ease-out 4s forwards',
        }}>
        <p className="text-[11px] tracking-[6px] text-gray-600 uppercase mb-2 font-mono">ConnectAI</p>
        <h1 className="text-5xl font-black text-white tracking-tight mb-2">SIGNAL</h1>
        <p className="text-gray-400 text-sm font-bold">디지털 무역 전략카드</p>
      </div>

      <style jsx>{`
        /* 가방 등장 — 위에서 떨어지면서 살짝 바운스 */
        @keyframes briefcaseEnter {
          0% {
            opacity: 0;
            transform: translateY(-200px) scale(0.5) rotate(-10deg);
          }
          60% {
            opacity: 1;
            transform: translateY(20px) scale(1.05) rotate(2deg);
          }
          80% {
            transform: translateY(-5px) scale(0.98) rotate(-1deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        /* 가방 뚜껑 열림 (1.4초 시점에 시작) */
        .briefcase-svg .briefcase-lid {
          animation: lidOpen 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.3s forwards;
        }
        @keyframes lidOpen {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-160deg); }
        }

        /* 가방에서 빛 새어나옴 */
        .briefcase-svg .briefcase-glow {
          animation: glowPulse 0.8s ease-out 1.4s forwards;
        }
        @keyframes glowPulse {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* 카드 분출 → 부채꼴 정렬 */
        @keyframes cardBurstAndSettle {
          /* 0%: 가방 안에 숨겨짐 */
          0% {
            opacity: 0;
            transform: translate(0, 0) rotate(0deg) scale(0.3);
          }
          /* 10%: 가방에서 나옴 */
          10% {
            opacity: 1;
            transform: translate(0, -20px) rotate(0deg) scale(0.7);
          }
          /* 40%: 사방으로 튀어나감 (절정) */
          40% {
            opacity: 1;
            transform: translate(var(--burst-x, 0), var(--burst-y, 0)) rotate(var(--burst-rotate, 0deg)) scale(1);
          }
          /* 70~80%: 부채꼴 위치로 이동 시작 */
          80% {
            opacity: 1;
            transform: translate(0, calc(var(--final-y, 0px) - 30px)) rotate(calc(var(--final-angle, 0deg) - 5deg)) scale(1.05);
          }
          /* 100%: 최종 부채꼴 정렬 */
          100% {
            opacity: 1;
            transform: translate(0, var(--final-y, 0)) rotate(var(--final-angle, 0deg)) scale(1);
          }
        }

        /* 폭죽 입자 분출 */
        @keyframes particleBurst {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          20% {
            opacity: 1;
            transform: translate(calc(var(--burst-x, 0) * 0.3), calc(var(--burst-y, 0) * 0.3)) scale(1.5);
          }
          100% {
            opacity: 0;
            transform: translate(var(--burst-x, 0), var(--burst-y, 0)) scale(0.3);
          }
        }

        /* 배경 플래시 */
        @keyframes introFlash {
          0%, 100% { opacity: 0; }
          25% { opacity: 0; }
          30% { opacity: 0.8; }
          40% { opacity: 0.3; }
          70% { opacity: 0.4; }
          100% { opacity: 0.2; }
        }

        @keyframes introLogoFade {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );

  if (screen === 'landing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.5)' : 'scale(1)',
        transition: 'all 0.6s cubic-bezier(0.7, 0, 0.84, 0)',
        filter: exiting ? 'blur(8px)' : 'blur(0)',
      }}>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${S.green}08 0%, transparent 70%)` }} />

      <div className="relative z-10 text-center max-w-md w-full"
        style={{ animation: 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <p className="text-[11px] tracking-[6px] text-gray-600 uppercase mb-4 font-mono">ConnectAI</p>
        <h1 className="text-6xl font-black text-white mb-2 tracking-tight">SIGNAL</h1>
        <p className="text-gray-500 text-sm mb-2 font-mono">디지털 무역 전략카드</p>
        <p className="text-gray-600 text-[13px] mb-8 leading-relaxed">
          디지털 무역 전략을 직접 만들어보는<br />체험형 카드게임 학습 플랫폼
        </p>

        <div className="flex justify-center gap-3 mb-10">
          {['01','02','03','04','05'].map((id, i) => (
            <div key={id} className="w-12 h-16 rounded-xl flex items-center justify-center text-white text-[11px] font-black font-mono hover-lift"
              style={{ background: CARD_COLORS[id].bg, transform: `rotate(${(i-2)*6}deg)`, boxShadow: `0 4px 20px ${CARD_COLORS[id].bg}55` }}>{id}</div>
          ))}
        </div>

        <button onClick={() => handleStartClick('/student/join')}
          className="btn-orbit relative w-full py-4 font-black rounded-2xl text-base mb-3 transition-all hover:scale-[1.02] overflow-hidden group"
          style={{ background: S.green, color: S.navy, boxShadow: `0 10px 30px -5px ${S.green}66` }}>
          <span className="relative z-10">🎓 학생으로 입장 →</span>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)' }} />
        </button>

        <button onClick={() => handleStartClick('/teacher')}
          className="btn-orbit-aqua relative w-full py-3.5 font-bold rounded-2xl text-[14px] transition-all hover:scale-[1.01] mb-3 overflow-hidden"
          style={{ background: 'rgba(193,232,235,0.08)', border: `1px solid ${S.aqua}33`, color: S.aqua }}>
          <span className="relative z-10">💼 관리자 로그인</span>
        </button>

        <button onClick={() => setScreen('guide')}
          className="w-full py-3 rounded-2xl text-sm text-gray-500 transition hover:text-gray-300"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          📋 퍼실리테이터 가이드
        </button>

        <p className="text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>

      <style jsx>{`
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
            ${S.aqua}55 30deg,
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
    <div className="min-h-screen px-4 py-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setScreen('landing')} className="text-gray-600 text-sm mb-4">← 돌아가기</button>
        <div className="rounded-2xl p-6 mb-6" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
          <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: S.green }}>FACILITATOR GUIDE</p>
          <h2 className="text-xl font-black text-white mb-1">퍼실리테이터 운영 가이드</h2>
          <p className="text-[12px] text-gray-500">카드 01 기준 · 45~60분 · 팀별 4~6명</p>
        </div>
        {[
          { time: '0–5분',   step: '주제 탭 — 카드 개념 확인', icon: '🎯', color: '#534AB7', tip: '주제 탭을 프로젝터에 띄워 핵심 통찰 질문을 함께 읽으세요.' },
          { time: '5–25분',  step: 'Q1~Q3 탭 — 팀 토론 + 답변', icon: '💬', color: '#00B5AD', tip: '각 Q탭마다 10분씩. 중간 결론 빈칸을 꼭 채우게 하세요.' },
          { time: '25–40분', step: '결론 탭 — 한 문장 전략', icon: '✏️', color: '#78BE20', tip: '4필드 입력 → 자동 합성 → 팀과 함께 다듬기 순서로 진행하세요.' },
          { time: '40–50분', step: '카드 완료 → 다음 카드', icon: '✅', color: '#4FB0C6', tip: 'Q1~Q3 답변 + 한 문장 전략 작성 후 카드 완료.' },
          { time: '50–60분', step: '팀별 발표', icon: '📌', color: '#FF6F61', tip: '각 팀의 한 문장 전략을 발표하고 강사가 피드백합니다.' },
        ].map((f, i) => (
          <div key={i} className="flex gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: f.color + '22', border: `2px solid ${f.color}` }}>{f.icon}</div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-bold" style={{ color: f.color }}>{f.step}</span>
                <span className="text-[11px] text-gray-600 px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>{f.time}</span>
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
    <div className="min-h-screen flex flex-col items-center px-4 py-4 relative overflow-hidden">
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />

      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
            <h1 className="text-sm font-extrabold text-white">디지털 무역 전략카드</h1>
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
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono transition-all hover:scale-110"
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

      <div className="flex gap-3 items-center mt-4 relative z-10">
        <button onClick={() => goToCard(currentCardIdx - 1)} disabled={currentCardIdx === 0}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all disabled:opacity-20 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>‹</button>
        <div className="text-center min-w-[160px]">
          <div className="text-[13px] font-bold text-white">{topic.title}</div>
          <div className="text-[10px] text-gray-600 font-mono mt-0.5">카드 {currentCardIdx + 1}/16 · {'★'.repeat(topic.difficulty)}{'☆'.repeat(5-topic.difficulty)}</div>
        </div>
        <button onClick={() => goToCard(currentCardIdx + 1)} disabled={currentCardIdx === TOPICS.length - 1}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold transition-all disabled:opacity-20 hover:scale-110"
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

      <div className="mt-4 text-[10px] text-gray-700 text-center relative z-10 font-mono">
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
    </div>
  );
}
