'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_CARDS, CARD_COLORS, TOPICS } from '@/data/cardData';
import CardFront from '@/components/CardFront';
import CardBack from '@/components/CardBack';
import ActivitySheet from '@/components/ActivitySheet';
import type { SubCard } from '@/types';
import {
  findTeamByCode, getOrCreateSession, restoreSession,
  saveCardResponse, loadCardResponses, saveCardProgress, loadCardProgress,
} from '@/lib/session';
import type { Session } from '@/lib/supabase';

const ITEMS = ['💄 K-뷰티 (스킨케어)','🍜 K-푸드 (라면·스낵)','🧬 바이오/디지털 헬스케어','🎮 디지털 콘텐츠 (웹툰·게임)','📱 스마트 기기 (IoT)','✏️ 직접 입력'];
const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string }> = {
  basic:    { label: '초급', emoji: '🌱', timer: 1800, minChars: 20,  color: '#059669' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50,  color: '#4FB0C6' },
  advanced: { label: '심화', emoji: '🚀', timer: 900,  minChars: 100, color: '#582C83' },
};

// SIGNAL 브랜드 컬러
const SIGNAL = {
  green: '#E7FE55',
  aqua:  '#C1E8EB',
  navy:  '#111111',
  bg:    '#0A0A0A',
};

function fmt(s: number) { return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }

type AIFeedback = { score: number; highlight: string; improve: string; next: string };

export default function Home() {
  const [screen, setScreen] = useState<'landing'|'onboarding'|'game'|'guide'>('landing');
  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [role, setRole] = useState<'leader'|'member'>('leader');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [level, setLevel] = useState('standard');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [showPdfToast, setShowPdfToast] = useState(false);
  const [checkStates, setCheckStates] = useState<Record<string, Record<number, boolean>>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const [timer, setTimer] = useState(1200);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [aiFeedbacks, setAiFeedbacks] = useState<Record<string, AIFeedback>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState<string | null>(null);
  const [showDraftEditor, setShowDraftEditor] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [aiUsed, setAiUsed] = useState<Set<string>>(new Set());

  const card = ALL_CARDS[currentIndex];
  const color = CARD_COLORS[card.parentId].bg;
  const currentTopicIdx = TOPICS.findIndex(t => t.id === card.parentId);
  const currentChecks = checkStates[card.data.id] || {};
  const lv = LEVELS[level];
  const isLeader = role === 'leader';
  const displayItem = item === '✏️ 직접 입력' ? customItem : item;

  // 앱 시작 시 세션 복원
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
        }
      } catch (e) { /* 세션 없으면 무시 */ }
    })();
  }, []);

  useEffect(() => {
    if (timerActive && timer > 0) {
      timerRef.current = setInterval(() => setTimer(t => t - 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    if (timer <= 0 && timerRef.current) clearInterval(timerRef.current);
  }, [timerActive, timer]);

  const isUnlocked = useCallback((cardId: string) => {
    const topic = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    if (!topic) return true;
    const idx = topic.subs.findIndex(s => s.id === cardId);
    if (idx === 0) return true;
    return completedCards.has(topic.subs[idx - 1].id);
  }, [completedCards]);

  const completeCard = async (cardId: string) => {
    setCompletedCards(prev => new Set([...prev, cardId]));
    setSavedToast(true); setTimeout(() => setSavedToast(false), 2000);
    if (session && teamId) await saveCardProgress({ teamId, sessionId: session.id, cardId, checklistStatus: checkStates[cardId] || {}, completed: true });
  };

  const hasResponse = (cardId: string) => {
    const r = responses[cardId];
    return r && Object.values(r.texts || {}).some((t: any) => t?.trim());
  };
  const getResponseLength = (cardId: string) => {
    const r = responses[cardId];
    if (!r) return 0;
    return Object.values(r.texts || {}).reduce((sum: number, t: any) => sum + (t?.trim()?.length || 0), 0);
  };
  const isChecklistDone = (cardId: string) => {
    const checks = checkStates[cardId];
    if (!checks) return false;
    const topic = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    if (!topic) return false;
    const sub = topic.subs.find(s => s.id === cardId);
    if (!sub) return false;
    return sub.checklist.every((_, i) => checks[i]);
  };
  const canRequestFeedback = (cardId: string) => hasResponse(cardId) && isChecklistDone(cardId) && getResponseLength(cardId) >= lv.minChars;

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < ALL_CARDS.length) { setCurrentIndex(idx); setIsFlipped(false); setSwipeOffset(0); setShowFeedback(null); }
  }, []);

  const handleCheck = async (i: number) => {
    const key = card.data.id;
    const newChecks = { ...(checkStates[key] || {}), [i]: !(checkStates[key]?.[i]) };
    setCheckStates(prev => ({ ...prev, [key]: newChecks }));
    if (session && teamId) await saveCardProgress({ teamId, sessionId: session.id, cardId: key, checklistStatus: newChecks, completed: completedCards.has(key) });
  };

  const handleSaveResponse = async (data: any) => {
    setResponses(prev => ({ ...prev, [card.data.id]: data }));
    setSavedToast(true); setTimeout(() => setSavedToast(false), 2000);
    if (session && teamId) await saveCardResponse({ teamId, sessionId: session.id, cardId: card.data.id, texts: data.texts || {} });
  };

  const requestFeedback = async (cardId: string) => {
    const topic = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    const sub = topic?.subs.find(s => s.id === cardId) as SubCard;
    if (!sub) return;
    const r = responses[cardId];
    const responseText = Object.values(r?.texts || {}).filter((t: any) => t?.trim()).join('\n');
    setAiLoading(true); setShowFeedback(cardId);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', cardId: sub.id, question: sub.question, checklist: sub.checklist, response: responseText, item: displayItem, level }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiFeedbacks(prev => ({ ...prev, [cardId]: data }));
    } catch (e) {
      setAiFeedbacks(prev => ({ ...prev, [cardId]: { score: 3, highlight: '네트워크 오류가 발생했습니다.', improve: '연결을 확인하고 다시 시도해주세요.', next: '직접 완료 버튼을 사용하세요.' } }));
    } finally { setAiLoading(false); }
  };

  const requestDraft = async (cardId: string) => {
    const topic = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    const sub = topic?.subs.find(s => s.id === cardId) as SubCard;
    if (!sub) return;
    setAiDraftLoading(cardId);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'draft', cardId: sub.id, question: sub.question, checklist: sub.checklist, item: displayItem, level }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftText(data.draft); setShowDraftEditor(cardId);
    } catch (e) { } finally { setAiDraftLoading(null); }
  };

  const confirmDraft = async (cardId: string) => {
    const data = { texts: { 0: draftText }, images: {} };
    setResponses(prev => ({ ...prev, [cardId]: data }));
    setAiUsed(prev => new Set([...prev, cardId]));
    setShowDraftEditor(null);
    setSavedToast(true); setTimeout(() => setSavedToast(false), 2000);
    if (session && teamId) await saveCardResponse({ teamId, sessionId: session.id, cardId, texts: { '0': draftText } });
  };

  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => { if (touchStart !== null) setSwipeOffset(e.touches[0].clientX - touchStart); };
  const onTouchEnd = () => {
    if (Math.abs(swipeOffset) > 60) { swipeOffset < 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1); }
    setSwipeOffset(0); setTouchStart(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showActivity || showDraftEditor || screen !== 'game') return;
      if (e.key === 'ArrowRight') goTo(currentIndex + 1);
      if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped(f => !f); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, goTo, showActivity, showDraftEditor, screen]);

  const startGame = async () => {
    setJoinError(''); setJoining(true);
    try {
      const team = await findTeamByCode(joinCode);
      if (!team) { setJoinError('수업 코드를 찾을 수 없어요. 선생님께 확인하세요.'); setJoining(false); return; }
      const finalItem = item === '✏️ 직접 입력' ? customItem : item;
      const sess = await getOrCreateSession({ playerName, teamId: team.id, role, level, item: finalItem });
      if (!sess) { setJoinError('접속 중 오류가 발생했어요. 다시 시도해주세요.'); setJoining(false); return; }
      setSession(sess); setTeamId(team.id);
      const [resps, prog] = await Promise.all([loadCardResponses(team.id), loadCardProgress(team.id)]);
      setResponses(resps); setCheckStates(prog.checkStates); setCompletedCards(prog.completedCards);
      setTimer(LEVELS[level].timer); setTimerActive(false); setScreen('game');
    } catch (e) { setJoinError('오류가 발생했어요. 다시 시도해주세요.'); } finally { setJoining(false); }
  };

  const resetSession = () => {
    localStorage.removeItem('dtc_session_token');
    setSession(null); setTeamId(null); setResponses({}); setCheckStates({});
    setCompletedCards(new Set()); setJoinCode(''); setPlayerName(''); setItem('');
    setCurrentIndex(0); setIsFlipped(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false); setScreen('onboarding');
  };

  // ─── LANDING ───
  if (screen === 'landing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: SIGNAL.bg }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${SIGNAL.green}08 0%, transparent 70%)` }} />
      <div className="relative z-10 text-center max-w-md">
        <p className="text-[11px] tracking-[6px] text-gray-600 uppercase mb-4 font-mono">ConnectAI</p>
        <h1 className="text-6xl font-black text-white mb-2 tracking-tight">SIGNAL</h1>
        <p className="text-gray-500 text-sm mb-2 font-mono">디지털 무역 전략카드</p>
        <p className="text-gray-600 text-[13px] mb-10 leading-relaxed">
          디지털 무역 전략을 직접 만들어보는<br />체험형 카드게임 학습 플랫폼
        </p>
        <div className="flex justify-center gap-3 mb-10">
          {['01','02','03','04','05'].map((id, i) => (
            <div key={id} className="w-12 h-16 rounded-xl flex items-center justify-center text-white text-[11px] font-black shadow-lg font-mono"
              style={{ background: CARD_COLORS[id].bg, transform: `rotate(${(i-2)*6}deg)`, boxShadow: `0 4px 20px ${CARD_COLORS[id].bg}55` }}>{id}</div>
          ))}
        </div>
        <button onClick={() => setScreen('onboarding')}
          className="w-full py-4 font-black rounded-2xl text-base mb-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: SIGNAL.green, color: SIGNAL.navy }}>
          시작하기 →
        </button>
        <button onClick={() => setScreen('guide')}
          className="w-full py-3 rounded-2xl text-sm border text-gray-500 transition hover:text-gray-300 hover:border-gray-600"
          style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
          📋 퍼실리테이터 가이드
        </button>
        <p className="text-gray-700 text-[10px] mt-8 font-mono">© 2026 SIGNAL — ConnectAI</p>
      </div>
    </div>
  );

  // ─── ONBOARDING ───
  if (screen === 'onboarding') {
    const canStart = item && (item !== '✏️ 직접 입력' || customItem.trim()) && playerName.trim() && joinCode.trim().length >= 4 && !joining;
    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-6 overflow-auto" style={{ background: SIGNAL.bg }}>
        <div className="w-full max-w-md">
          <button onClick={() => setScreen('landing')} className="text-gray-600 text-sm mb-4 hover:text-gray-400 transition">← 돌아가기</button>
          <div className="rounded-2xl p-5 mb-6 border" style={{ background: 'rgba(231,254,85,0.05)', borderColor: 'rgba(231,254,85,0.15)' }}>
            <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: SIGNAL.green }}>SIGNAL · CARD GAME</p>
            <h2 className="text-xl font-black text-white leading-tight mb-1">나의 첫 <span style={{ color: SIGNAL.green }}>디지털 무역 전략</span></h2>
            <p className="text-[11px] text-gray-500">팀의 제품을 선택하고 글로벌 수출 전략을 설계하세요.</p>
          </div>

          {/* ① 수업 코드 */}
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">① 수업 코드 입력</p>
            <p className="text-[11px] text-gray-600 mb-2">선생님이 알려준 코드를 입력하세요</p>
            <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              placeholder="예) TEAM01" maxLength={10}
              className="w-full px-4 py-3 rounded-xl text-white text-base font-bold tracking-widest uppercase transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: joinCode ? `1px solid ${SIGNAL.green}` : '1px solid rgba(255,255,255,0.1)' }} />
            {joinError && <p className="text-red-400 text-[11px] mt-1">⚠ {joinError}</p>}
          </div>

          {/* ② 팀 아이템 */}
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">② 팀 아이템 선택</p>
            <p className="text-[11px] text-gray-600 mb-3">수출할 제품·서비스를 먼저 정하세요</p>
            <div className="grid grid-cols-2 gap-2">
              {ITEMS.map(it => (
                <button key={it} onClick={() => setItem(it)}
                  className="px-3 py-3 rounded-xl text-left text-[12px] transition"
                  style={{ background: item === it ? `${SIGNAL.green}15` : 'rgba(255,255,255,0.04)', border: item === it ? `1px solid ${SIGNAL.green}` : '1px solid rgba(255,255,255,0.08)', color: item === it ? SIGNAL.green : '#9ca3af', fontWeight: item === it ? 700 : 400 }}>
                  {it}
                </button>
              ))}
            </div>
            {item === '✏️ 직접 입력' && (
              <input value={customItem} onChange={e => setCustomItem(e.target.value)} placeholder="예) 제주 감귤 주스"
                className="w-full mt-2 px-3 py-2.5 rounded-xl text-white text-sm transition"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
            )}
          </div>

          {/* ③ 역할·이름 */}
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">③ 역할 · 이름</p>
            <div className="flex gap-2 mb-3">
              {([['leader','👑 팀장','결론 작성 · AI 요청'],['member','💬 팀원','토론 참여 · 카드 열람']] as const).map(([k,l,d]) => (
                <button key={k} onClick={() => setRole(k)} className="flex-1 px-3 py-3 rounded-xl text-left transition"
                  style={{ background: role === k ? `${SIGNAL.green}10` : 'rgba(255,255,255,0.04)', border: role === k ? `1px solid ${SIGNAL.green}` : '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-[13px] font-bold mb-0.5" style={{ color: role === k ? SIGNAL.green : '#fff' }}>{l}</div>
                  <div className="text-[10px] text-gray-600">{d}</div>
                </button>
              ))}
            </div>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="이름 (예: 이서연)"
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: playerName ? `1px solid ${SIGNAL.green}` : '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {/* ④ 수업 수준 */}
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">④ 수업 수준</p>
            {Object.entries(LEVELS).map(([k, v]) => (
              <button key={k} onClick={() => setLevel(k)}
                className="w-full mb-2 px-4 py-3 rounded-xl flex items-center gap-3 transition"
                style={{ background: level === k ? v.color + '22' : 'rgba(255,255,255,0.04)', border: level === k ? `1px solid ${v.color}` : '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl">{v.emoji}</span>
                <div className="flex-1 text-left"><div className="text-[13px] font-bold text-white">{v.label}</div></div>
                <span className="text-[11px] text-gray-500">{Math.floor(v.timer/60)}분 · 최소 {v.minChars}자</span>
              </button>
            ))}
          </div>

          <button onClick={startGame} disabled={!canStart}
            className="w-full py-4 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 mb-3"
            style={{ background: canStart ? SIGNAL.green : 'rgba(255,255,255,0.1)', color: canStart ? SIGNAL.navy : '#666' }}>
            {joining ? '⏳ 접속 중...' : '시작하기 →'}
          </button>
        </div>
      </div>
    );
  }

  // ─── GUIDE ───
  if (screen === 'guide') return (
    <div className="min-h-screen px-4 py-6 overflow-auto" style={{ background: SIGNAL.bg }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setScreen('landing')} className="text-gray-600 text-sm mb-4 hover:text-gray-400 transition">← 돌아가기</button>
        <div className="rounded-2xl p-6 mb-6 border" style={{ background: 'rgba(231,254,85,0.05)', borderColor: 'rgba(231,254,85,0.15)' }}>
          <p className="text-[10px] font-mono tracking-widest mb-2" style={{ color: SIGNAL.green }}>FACILITATOR GUIDE</p>
          <h2 className="text-xl font-black text-white mb-1">퍼실리테이터 운영 가이드</h2>
          <p className="text-[12px] text-gray-500">카드 01 기준 · 50~80분 · 팀별 4~6명</p>
        </div>
        {[
          { time: '0–5분',   step: '카드 개념 확인',       icon: '🎯', color: '#534AB7', tip: '카드를 프로젝터에 띄워 전체가 함께 확인하세요.' },
          { time: '5–20분',  step: '팀 토론',             icon: '💬', color: '#00B5AD', tip: '"외국 친구에게 설명한다면?" 으로 유도하세요.' },
          { time: '20–40분', step: '체크리스트 + 팀장 결론', icon: '✏️', color: '#78BE20', tip: 'AI 피드백은 체크리스트 + 최소 글자수 충족 시 활성화.' },
          { time: '40–50분', step: 'AI 피드백 → 완료',     icon: '🤖', color: '#4FB0C6', tip: '시간 부족 팀은 AI 자동 작성을 허용하되 수정 필수.' },
          { time: '50–60분', step: '팀별 발표',            icon: '📌', color: '#FF6F61', tip: '결과물은 PDF 저장 가능합니다.' },
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
        <button onClick={() => setScreen('landing')} className="w-full py-3 rounded-xl text-sm mt-4 mb-8 text-gray-500 border border-white/10 hover:border-white/20 transition">← 돌아가기</button>
      </div>
    </div>
  );

  // ─── GAME ───
  const isCardLocked = card.type === 'question' && !isUnlocked(card.data.id);
  const isCardCompleted = completedCards.has(card.data.id);
  const cardFeedback = aiFeedbacks[card.data.id];

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-5 relative overflow-hidden" style={{ background: SIGNAL.bg }}>
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none transition-all duration-500"
        style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)` }} />

      {/* Header */}
      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <p className="text-[11px] tracking-[4px] text-gray-600 uppercase font-mono">SIGNAL</p>
            <h1 className="text-sm font-extrabold text-white">디지털 무역 전략카드</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-1 rounded-md font-bold" style={{ background: lv.color + '22', color: lv.color }}>{lv.emoji} {lv.label}</span>
            <span className="text-[9px] text-gray-600 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>{isLeader ? '👑' : '💬'} {playerName}</span>
            <button onClick={() => setShowList(!showList)}
              className="rounded-lg px-2.5 py-1 text-[11px] text-gray-400 transition hover:text-gray-200"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {showList ? '닫기' : '목록'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md truncate max-w-[140px]"
            style={{ color: SIGNAL.green, background: `${SIGNAL.green}10` }}>{displayItem}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className={`text-[12px] font-mono font-bold ${timer <= 60 ? 'text-red-400' : 'text-white'}`}>{fmt(timer)}</span>
            <button onClick={() => setTimerActive(!timerActive)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${timerActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {timerActive ? '⏸' : '▶'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-600 min-w-[50px] font-mono">{currentIndex + 1} / {ALL_CARDS.length}</span>
          <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex+1)/ALL_CARDS.length)*100}%`, background: color }} />
          </div>
        </div>
        {/* 챕터 동그라미 */}
        <div className="flex gap-0.5 mt-2 flex-wrap pb-1">
          {TOPICS.map((t, i) => (
            <button key={t.id} onClick={() => goTo(ALL_CARDS.findIndex(c => c.data.id === t.id))}
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono transition-all"
              style={{ background: currentTopicIdx === i ? CARD_COLORS[t.id].bg : 'rgba(255,255,255,0.06)', border: currentTopicIdx === i ? `2px solid ${CARD_COLORS[t.id].bg}` : '1px solid rgba(255,255,255,0.08)', color: currentTopicIdx === i ? '#fff' : '#666' }}>{t.id}</button>
          ))}
        </div>
      </div>

      {/* 시간 경고 */}
      {timer <= 30 && timer > 0 && isLeader && (
        <div className="w-full max-w-md mb-3 relative z-10 rounded-xl px-4 py-3" style={{ background: 'rgba(255,103,97,0.1)', border: '1px solid rgba(255,103,97,0.3)' }}>
          <div className="text-[13px] font-bold text-red-400 mb-1">⏰ 시간이 얼마 남지 않았어요!</div>
          <div className="text-[11px] text-red-300/70 mb-2">팀장 전용: AI가 미완료 카드의 결론 초안을 자동 작성합니다.</div>
          <button onClick={() => { const topic = TOPICS[currentTopicIdx]; if (topic) topic.subs.forEach(sub => { if (!completedCards.has(sub.id) && !aiDraftLoading) requestDraft(sub.id); }); }}
            className="w-full py-2 text-white font-bold rounded-lg text-[12px]" style={{ background: '#FF6F61' }}>⚡ 미완료 카드 AI 자동 작성</button>
        </div>
      )}

      {/* 카드 목록 오버레이 */}
      {showList && (
        <div className="fixed inset-0 backdrop-blur-xl z-[100] overflow-y-auto p-4 pt-16" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <button onClick={() => setShowList(false)} className="fixed top-4 right-4 rounded-lg px-4 py-2 text-white text-sm z-10" style={{ background: 'rgba(255,255,255,0.1)' }}>닫기</button>
          <h2 className="text-lg font-extrabold text-white mb-4">전체 카드 목록</h2>
          {TOPICS.map((topic) => (
            <div key={topic.id} className="mb-4">
              <button onClick={() => { goTo(ALL_CARDS.findIndex(c => c.data.id === topic.id)); setShowList(false); }}
                className="w-full text-left rounded-xl p-3 mb-1.5 transition hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${CARD_COLORS[topic.id].bg}33` }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold font-mono" style={{ background: CARD_COLORS[topic.id].bg }}>{topic.id}</span>
                  <div><div className="text-sm font-extrabold text-white">{topic.title}</div><div className="text-[11px] text-gray-600">{topic.titleEn}</div></div>
                </div>
              </button>
              <div className="flex gap-1.5 pl-10">
                {topic.subs.map((sub) => {
                  const locked = !isUnlocked(sub.id); const done = completedCards.has(sub.id);
                  return (
                    <button key={sub.id} onClick={() => { if (!locked) { goTo(ALL_CARDS.findIndex(c => c.data.id === sub.id)); setShowList(false); } }}
                      className={`rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 transition ${locked ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5'}`}
                      style={{ background: done ? `${CARD_COLORS[topic.id].bg}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${done ? CARD_COLORS[topic.id].bg + '55' : 'rgba(255,255,255,0.06)'}`, color: done ? CARD_COLORS[topic.id].bg : '#888' }}>
                      {locked ? '🔒' : done ? '✓' : ''} {sub.id}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 카드 */}
      <div className="w-full max-w-[340px] relative z-10" style={{ aspectRatio: '70/95', perspective: 1200 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {[2,1].map(offset => (
          <div key={offset} className="absolute rounded-2xl"
            style={{ top: offset*4, left: offset*3, right: -offset*3, bottom: -offset*4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', transform: `rotate(${offset*1.5}deg)` }} />
        ))}
        {isCardLocked && (
          <div className="absolute inset-0 z-20 rounded-2xl flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-sm font-bold text-white mb-1">잠겨 있습니다</div>
            <div className="text-[11px] text-gray-500">이전 카드를 먼저 완료하세요</div>
          </div>
        )}
        {isCardCompleted && !isCardLocked && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 text-black text-[10px] font-bold px-3 py-1 rounded-full shadow-lg"
            style={{ background: SIGNAL.green }}>
            {aiUsed.has(card.data.id) && <span>🤖</span>} ✓ 완료
          </div>
        )}
        <div className="w-full h-full relative card-flip"
          style={{ transform: `rotateY(${isFlipped ? 180 : 0}deg) translateX(${swipeOffset*0.3}px)`, transition: touchStart ? 'none' : undefined }}>
          <div className="card-face cursor-pointer" style={{ pointerEvents: isFlipped ? 'none' : 'auto', opacity: isFlipped ? 0 : 1, transition: 'opacity 0.3s' }} onClick={() => !isCardLocked && setIsFlipped(true)}><CardFront card={card} /></div>
          <div className="card-face card-face-back" style={{ pointerEvents: isFlipped ? 'auto' : 'none', opacity: isFlipped ? 1 : 0, transition: 'opacity 0.3s' }}>
            <CardBack card={card} checkStates={currentChecks} onCheck={handleCheck}
              onOpenActivity={isLeader && !isCardLocked ? () => setShowActivity(true) : undefined}
              hasResponse={hasResponse(card.data.id)} />
            <button onClick={() => setIsFlipped(false)} className="absolute bottom-2 right-2 text-white text-[10px] px-3 py-1.5 rounded-lg z-10 transition"
              style={{ background: 'rgba(255,255,255,0.08)' }}>↩ 앞면 보기</button>
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col items-center gap-2 mt-2.5 relative z-10 w-full max-w-[340px]">
        <p className="text-[11px] text-gray-700 text-center">
          {isCardLocked ? '🔒 이전 카드를 완료하세요' : isFlipped ? '체크리스트 확인 · 앞면 보기로 돌아가기' : '카드를 탭하여 뒤집기'} · 스와이프 이동
        </p>
        {isLeader && card.type === 'question' && !isCardLocked && canRequestFeedback(card.data.id) && !isCardCompleted && (
          <button onClick={() => requestFeedback(card.data.id)} disabled={aiLoading}
            className="w-full py-2.5 text-white font-bold rounded-xl text-[13px] transition disabled:opacity-50"
            style={{ background: '#007681' }}>
            {aiLoading && showFeedback === card.data.id ? '🤖 AI 분석 중...' : '🤖 AI 피드백 받기'}
          </button>
        )}
        {isLeader && card.type === 'question' && !isCardLocked && !hasResponse(card.data.id) && !isCardCompleted && (
          <button onClick={() => requestDraft(card.data.id)} disabled={!!aiDraftLoading}
            className="w-full py-2 text-white font-bold rounded-xl text-[12px] transition disabled:opacity-50"
            style={{ background: 'rgba(255,199,44,0.2)', border: '1px solid rgba(255,199,44,0.3)', color: '#FFC72C' }}>
            {aiDraftLoading === card.data.id ? '⚡ AI 초안 생성 중...' : '⚡ AI 자동 초안 생성 (팀장 전용)'}
          </button>
        )}
        {isLeader && card.type === 'question' && !isCardLocked && !isCardCompleted && hasResponse(card.data.id) && (
          <button onClick={() => completeCard(card.data.id)}
            className="w-full py-2.5 font-bold rounded-xl text-[13px] transition"
            style={{ background: SIGNAL.green, color: SIGNAL.navy }}>
            ✅ 이 카드 완료하기
          </button>
        )}
        {/* PDF 버튼 (16-3 카드에서만) */}
        {isLeader && card.data.id === '16-3' && (
          <button onClick={() => { setShowPdfToast(true); setTimeout(() => setShowPdfToast(false), 3000); }}
            className="w-full py-2.5 font-bold rounded-xl text-[13px] transition"
            style={completedCards.size === 48
              ? { background: '#512D38', color: '#fff', border: '1px solid #6d3d4d' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#666' }}>
            📄 PDF 전략 리포트 생성 {completedCards.size === 48 ? '' : `(${completedCards.size}/48 완료)`}
          </button>
        )}
        {!isLeader && card.type === 'question' && !isCardLocked && (
          <div className="w-full px-4 py-2 rounded-xl text-[11px] text-center"
            style={{ background: `${SIGNAL.aqua}10`, border: `1px solid ${SIGNAL.aqua}20`, color: SIGNAL.aqua }}>
            💬 팀원 모드 · 체크리스트 확인 가능 · 결론은 팀장만
          </div>
        )}
      </div>

      {/* AI 피드백 */}
      {showFeedback === card.data.id && cardFeedback && (
        <div className="w-full max-w-md mt-3 relative z-10 rounded-2xl p-4" style={{ background: 'rgba(0,118,129,0.15)', border: '1px solid rgba(79,176,198,0.3)', animation: 'fadeIn 0.3s ease-out' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold" style={{ color: SIGNAL.aqua }}>🤖 AI 피드백</span>
            <button onClick={() => setShowFeedback(null)} className="text-gray-600 text-sm">✕</button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-black" style={{ color: SIGNAL.aqua }}>{cardFeedback.score}</span>
            <span className="text-[11px] text-gray-600">/5점</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden ml-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${cardFeedback.score * 20}%`, background: cardFeedback.score >= 4 ? SIGNAL.green : cardFeedback.score >= 3 ? SIGNAL.aqua : '#FFC72C' }} />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="rounded-lg p-3" style={{ background: 'rgba(120,190,32,0.1)' }}><div className="text-[10px] font-bold mb-1" style={{ color: '#78BE20' }}>✅ 잘된 점</div><div className="text-[12px] text-gray-300 leading-relaxed">{cardFeedback.highlight}</div></div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,199,44,0.1)' }}><div className="text-[10px] font-bold mb-1" style={{ color: '#FFC72C' }}>💡 보완할 점</div><div className="text-[12px] text-gray-300 leading-relaxed">{cardFeedback.improve}</div></div>
            <div className="rounded-lg p-3" style={{ background: `${SIGNAL.aqua}10` }}><div className="text-[10px] font-bold mb-1" style={{ color: SIGNAL.aqua }}>➡️ 다음 단계</div><div className="text-[12px] text-gray-300 leading-relaxed">{cardFeedback.next}</div></div>
          </div>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex gap-3 items-center mt-3 relative z-10">
        <button onClick={() => goTo(currentIndex-1)} disabled={currentIndex === 0}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition disabled:opacity-20"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>‹</button>
        <div className="text-center min-w-[160px]">
          <div className="text-[13px] font-bold text-white">{card.data.title}</div>
          <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{card.type === 'topic' ? '주제카드' : '질문카드'} · {'●'.repeat(card.data.difficulty)}{'○'.repeat(5-card.data.difficulty)}</div>
        </div>
        <button onClick={() => goTo(currentIndex+1)} disabled={currentIndex === ALL_CARDS.length-1}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition disabled:opacity-20 text-black font-bold"
          style={{ background: currentIndex === ALL_CARDS.length-1 ? 'rgba(255,255,255,0.06)' : color, boxShadow: currentIndex < ALL_CARDS.length-1 ? `0 4px 16px ${color}44` : 'none', color: currentIndex === ALL_CARDS.length-1 ? '#666' : '#fff' }}>›</button>
      </div>

      {/* Sub nav */}
      <div className="flex items-center gap-1.5 mt-3 relative z-10">
        {TOPICS[currentTopicIdx] && (<>
          <button onClick={() => goTo(ALL_CARDS.findIndex(c => c.data.id === TOPICS[currentTopicIdx].id))}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white transition"
            style={{ background: card.data.id === TOPICS[currentTopicIdx].id ? color : 'rgba(255,255,255,0.05)', border: `1px solid ${card.data.id === TOPICS[currentTopicIdx].id ? color : 'rgba(255,255,255,0.08)'}` }}>주제</button>
          {TOPICS[currentTopicIdx].subs.map((sub, i) => {
            const locked = !isUnlocked(sub.id); const done = completedCards.has(sub.id);
            return (
              <button key={sub.id} onClick={() => !locked && goTo(ALL_CARDS.findIndex(c => c.data.id === sub.id))}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${locked ? 'opacity-30 cursor-not-allowed' : ''}`}
                style={{ background: card.data.id === sub.id ? color : done ? color + '33' : 'rgba(255,255,255,0.05)', border: `1px solid ${card.data.id === sub.id ? color : 'rgba(255,255,255,0.08)'}`, color: done ? color : locked ? '#444' : '#fff' }}>
                {locked ? '🔒' : done ? '✓' : i+1}
              </button>
            );
          })}
        </>)}
      </div>

      <div className="mt-4 text-[10px] text-gray-700 text-center relative z-10 font-mono">
        © 2026 SIGNAL — ConnectAI
        <button onClick={() => { setScreen('landing'); if(timerRef.current) clearInterval(timerRef.current); setTimerActive(false); }}
          className="ml-3 text-gray-700 underline hover:text-gray-500 transition">나가기</button>
        <button onClick={resetSession}
          className="ml-3 text-gray-700 underline hover:text-red-400 transition">다시 설정</button>
      </div>

      {/* Activity Sheet */}
      {showActivity && card.type === 'question' && isLeader && (
        <ActivitySheet card={card} responses={responses[card.data.id]} checkStates={currentChecks} onCheck={handleCheck}
          onSave={handleSaveResponse} onClose={() => setShowActivity(false)} />
      )}

      {/* AI Draft Editor */}
      {showDraftEditor && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-center items-end" onClick={e => { if (e.target === e.currentTarget) setShowDraftEditor(null); }}>
          <div className="w-full max-w-lg max-h-[80vh] bg-white rounded-t-2xl flex flex-col" style={{ animation: 'slideUp 0.35s ease-out' }}>
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div><div className="text-sm font-extrabold text-gray-900">🤖 AI 자동 초안</div><div className="text-[11px] text-amber-600">수정 후 컨펌해야 최종 저장됩니다</div></div>
              <button onClick={() => setShowDraftEditor(null)} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-500">닫기</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea value={draftText} onChange={e => setDraftText(e.target.value)}
                className="w-full min-h-[200px] px-4 py-3 border-2 border-amber-300 rounded-xl text-[13px] text-gray-800 leading-relaxed resize-y bg-amber-50 focus:border-amber-500 focus:outline-none" />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowDraftEditor(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm">취소</button>
              <button onClick={() => confirmDraft(showDraftEditor)} className="flex-[2] py-3 bg-amber-500 text-white font-bold rounded-xl text-sm">🤖 수정 완료 · 컨펌</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {savedToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 z-[300] flex items-center gap-2 backdrop-blur-sm" style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SIGNAL.green} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          <span className="text-[13px] text-white font-semibold">저장 완료!</span>
        </div>
      )}
      {showPdfToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-xl px-5 py-3 z-[300] flex items-center gap-3 backdrop-blur-sm max-w-[320px]" style={{ background: 'rgba(10,10,10,0.95)', border: '1px solid rgba(255,103,97,0.3)', animation: 'fadeIn 0.3s ease-out' }}>
          <span className="text-xl">{completedCards.size === 48 ? '📄' : '🔒'}</span>
          <div>
            {completedCards.size === 48
              ? <><div className="text-[13px] text-white font-semibold">PDF 리포트 준비 중</div><div className="text-[11px] text-amber-400">AI 전략 내러티브 완성 후 활성화됩니다</div></>
              : <><div className="text-[13px] text-white font-semibold">아직 완료되지 않은 카드가 있어요</div><div className="text-[11px] text-amber-400">16개 주제 전부 완료해야 생성 가능 ({completedCards.size}/48)</div></>
            }
          </div>
        </div>
      )}
    </div>
  );
}
