'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_CARDS, CARD_COLORS, TOPICS } from '@/data/cardData';
import CardFront from '@/components/CardFront';
import CardBack from '@/components/CardBack';
import ActivitySheet from '@/components/ActivitySheet';
import type { SubCard } from '@/types';

const ITEMS = ['💄 K-뷰티 (스킨케어)','🍜 K-푸드 (라면·스낵)','🧬 바이오/디지털 헬스케어','🎮 디지털 콘텐츠 (웹툰·게임)','📱 스마트 기기 (IoT)','✏️ 직접 입력'];
const LEVELS: Record<string, { label: string; emoji: string; timer: number; minChars: number; color: string }> = {
  basic: { label: '초급', emoji: '🌱', timer: 1800, minChars: 20, color: '#059669' },
  standard: { label: '표준', emoji: '📘', timer: 1200, minChars: 50, color: '#00B4D8' },
  advanced: { label: '심화', emoji: '🚀', timer: 900, minChars: 100, color: '#7F77DD' },
};

function fmt(s: number) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }

type AIFeedback = { score: number; highlight: string; improve: string; next: string };

export default function Home() {
  const [screen, setScreen] = useState<'landing' | 'onboarding' | 'game' | 'guide'>('landing');
  const [item, setItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [role, setRole] = useState<'leader' | 'member'>('leader');
  const [playerName, setPlayerName] = useState('');
  const [level, setLevel] = useState('standard');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showList, setShowList] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [checkStates, setCheckStates] = useState<Record<string, Record<number, boolean>>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Timer
  const [timer, setTimer] = useState(1200);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // AI states
  const [aiFeedbacks, setAiFeedbacks] = useState<Record<string, AIFeedback>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState<string | null>(null);
  const [aiDrafts, setAiDrafts] = useState<Record<string, string>>({});
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

  const completeCard = (cardId: string) => {
    setCompletedCards(prev => new Set([...prev, cardId]));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
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

  const canRequestFeedback = (cardId: string) => {
    return hasResponse(cardId) && isChecklistDone(cardId) && getResponseLength(cardId) >= lv.minChars;
  };

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < ALL_CARDS.length) { setCurrentIndex(idx); setIsFlipped(false); setSwipeOffset(0); setShowFeedback(null); }
  }, []);

  const handleCheck = (i: number) => {
    const key = card.data.id;
    setCheckStates(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [i]: !(prev[key]?.[i]) } }));
  };

  const handleSaveResponse = (data: any) => {
    setResponses(prev => ({ ...prev, [card.data.id]: data }));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // AI Feedback
  const requestFeedback = async (cardId: string) => {
    const topic = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    const sub = topic?.subs.find(s => s.id === cardId) as SubCard;
    if (!sub) return;
    const r = responses[cardId];
    const responseText = Object.values(r?.texts || {}).filter((t: any) => t?.trim()).join('\n');

    setAiLoading(true);
    setShowFeedback(cardId);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', cardId: sub.id, question: sub.question, checklist: sub.checklist, response: responseText, item: displayItem, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiFeedbacks(prev => ({ ...prev, [cardId]: data }));
    } catch (e) {
      setAiFeedbacks(prev => ({ ...prev, [cardId]: { score: 3, highlight: '네트워크 오류가 발생했습니다.', improve: '연결을 확인하고 다시 시도해주세요.', next: '직접 완료 버튼을 사용하세요.' } }));
    } finally { setAiLoading(false); }
  };

  // AI Draft
  const requestDraft = async (cardId: string) => {
    const topic = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    const sub = topic?.subs.find(s => s.id === cardId) as SubCard;
    if (!sub) return;

    setAiDraftLoading(cardId);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'draft', cardId: sub.id, question: sub.question, checklist: sub.checklist, item: displayItem, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiDrafts(prev => ({ ...prev, [cardId]: data.draft }));
      setDraftText(data.draft);
      setShowDraftEditor(cardId);
    } catch (e) {
      setAiDrafts(prev => ({ ...prev, [cardId]: 'AI 연결에 실패했습니다. 직접 작성해주세요.' }));
    } finally { setAiDraftLoading(null); }
  };

  const confirmDraft = (cardId: string) => {
    setResponses(prev => ({ ...prev, [cardId]: { texts: { 0: draftText }, images: {} } }));
    setAiUsed(prev => new Set([...prev, cardId]));
    setShowDraftEditor(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
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

  const startGame = () => { setTimer(LEVELS[level].timer); setTimerActive(false); setScreen('game'); };

  // ─── LANDING ───
  if (screen === 'landing') return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 text-center max-w-md">
        <p className="text-[10px] tracking-[4px] text-gray-500 uppercase mb-2">Connect AI</p>
        <h1 className="text-3xl font-black text-white mb-3 leading-tight">디지털무역<br />전략카드</h1>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">카드게임으로 쉽게 진출전략을 만들어 보세요.<br />16개 주제, 64장의 전략 카드가 준비되어 있습니다.</p>
        <div className="flex justify-center gap-3 mb-10">
          {['01','02','03','04','05'].map((id, i) => (
            <div key={id} className="w-12 h-16 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-lg"
              style={{ background: CARD_COLORS[id].bg, transform: `rotate(${(i-2)*6}deg)`, boxShadow: `0 4px 16px ${CARD_COLORS[id].bg}44` }}>{id}</div>
          ))}
        </div>
        <button onClick={() => setScreen('onboarding')} className="w-full py-4 bg-cyan-500 text-white font-bold rounded-2xl text-base shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-600 mb-3">시작하기</button>
        <button onClick={() => setScreen('guide')} className="w-full py-3 bg-gray-800 text-gray-400 rounded-2xl text-sm border border-gray-700 transition hover:bg-gray-700">📋 퍼실리테이터 가이드</button>
        <p className="text-gray-600 text-[10px] mt-8">© 2025 CONNECT AI · 동구고등학교</p>
      </div>
    </div>
  );

  // ─── ONBOARDING ───
  if (screen === 'onboarding') {
    const canStart = item && (item !== '✏️ 직접 입력' || customItem.trim()) && playerName.trim();
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center px-4 py-6 overflow-auto">
        <div className="w-full max-w-md">
          <button onClick={() => setScreen('landing')} className="text-gray-500 text-sm mb-4">← 돌아가기</button>
          <div className="bg-gradient-to-br from-[#0B1E3D] to-[#1A3A6B] rounded-2xl p-5 mb-6">
            <p className="text-[10px] text-cyan-400 font-bold tracking-widest mb-1">CARD GAME</p>
            <h2 className="text-xl font-black text-white leading-tight mb-1">나의 첫 <span className="text-cyan-400">디지털 무역 프로젝트</span></h2>
            <p className="text-[11px] text-gray-400">팀의 제품을 선택하고 글로벌 수출 전략을 설계하세요.</p>
          </div>
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">① 팀 아이템 선택</p>
            <p className="text-[11px] text-gray-500 mb-3">수출할 제품·서비스를 먼저 정하세요</p>
            <div className="grid grid-cols-2 gap-2">
              {ITEMS.map(it => (
                <button key={it} onClick={() => setItem(it)}
                  className={`px-3 py-3 rounded-xl text-left text-[12px] border transition ${item === it ? 'bg-[#0B1E3D] text-white border-cyan-500 font-bold' : 'bg-gray-900 text-gray-300 border-gray-700'}`}>{it}</button>
              ))}
            </div>
            {item === '✏️ 직접 입력' && (
              <input value={customItem} onChange={e => setCustomItem(e.target.value)} placeholder="예) 제주 감귤 주스"
                className="w-full mt-2 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:border-cyan-400 transition" />
            )}
          </div>
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">② 역할 · 이름</p>
            <div className="flex gap-2 mb-3">
              {([['leader', '👑 팀장', '결론 작성 · AI 요청'], ['member', '💬 팀원', '토론 참여 · 카드 열람']] as const).map(([k, l, d]) => (
                <button key={k} onClick={() => setRole(k)}
                  className={`flex-1 px-3 py-3 rounded-xl text-left border transition ${role === k ? 'bg-[#0B1E3D] text-white border-cyan-500' : 'bg-gray-900 text-gray-300 border-gray-700'}`}>
                  <div className="text-[13px] font-bold mb-0.5">{l}</div>
                  <div className={`text-[10px] ${role === k ? 'text-gray-400' : 'text-gray-500'}`}>{d}</div>
                </button>
              ))}
            </div>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="이름 (예: 이서연)"
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white text-sm focus:border-cyan-400 transition" />
          </div>
          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">③ 수업 수준</p>
            {Object.entries(LEVELS).map(([k, v]) => (
              <button key={k} onClick={() => setLevel(k)}
                className={`w-full mb-2 px-4 py-3 rounded-xl flex items-center gap-3 border transition ${level === k ? 'border-2 text-white' : 'bg-gray-900 text-gray-300 border-gray-700'}`}
                style={level === k ? { background: v.color, borderColor: v.color } : {}}>
                <span className="text-xl">{v.emoji}</span>
                <div className="flex-1 text-left"><div className="text-[13px] font-bold">{v.label}</div></div>
                <span className={`text-[11px] ${level === k ? 'text-white/80' : 'text-gray-500'}`}>{Math.floor(v.timer/60)}분 · 최소 {v.minChars}자</span>
              </button>
            ))}
          </div>
          <button onClick={startGame} disabled={!canStart}
            className="w-full py-4 bg-cyan-500 text-white font-bold rounded-2xl transition hover:bg-cyan-600 disabled:opacity-40 mb-3">시작하기 →</button>
        </div>
      </div>
    );
  }

  // ─── GUIDE ───
  if (screen === 'guide') return (
    <div className="min-h-screen bg-gray-950 px-4 py-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setScreen('landing')} className="text-gray-500 text-sm mb-4">← 돌아가기</button>
        <div className="bg-gradient-to-br from-[#0B1E3D] to-[#1A3A6B] rounded-2xl p-6 mb-6">
          <p className="text-[10px] text-cyan-400 font-bold tracking-widest mb-2">FACILITATOR GUIDE</p>
          <h2 className="text-xl font-black text-white mb-1">퍼실리테이터 운영 가이드</h2>
          <p className="text-[12px] text-gray-400">카드 01 기준 · 50~80분 · 팀별 4~6명</p>
        </div>
        <h3 className="text-base font-bold text-white mb-4">수업 진행 플로우</h3>
        {[
          { time: '0–5분', step: '카드 개념 확인', icon: '🎯', color: '#6366F1', tip: '카드를 프로젝터에 띄워 전체가 함께 확인하세요.' },
          { time: '5–20분', step: '팀 토론', icon: '💬', color: '#D97706', tip: '"외국 친구에게 설명한다면?" 으로 유도하세요.' },
          { time: '20–40분', step: '체크리스트 + 팀장 결론', icon: '✏️', color: '#059669', tip: 'AI 피드백은 체크리스트 + 최소 글자수 충족 시 활성화.' },
          { time: '40–50분', step: 'AI 피드백 → 완료', icon: '🤖', color: '#0E7490', tip: '시간 부족 팀은 AI 자동 작성을 허용하되 수정 필수.' },
          { time: '50–60분', step: '팀별 발표', icon: '📌', color: '#DC2626', tip: '결과물은 PDF 저장 가능합니다.' },
        ].map((f, i) => (
          <div key={i} className="flex gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: f.color + '22', border: `2px solid ${f.color}` }}>{f.icon}</div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-bold" style={{ color: f.color }}>{f.step}</span>
                <span className="text-[11px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{f.time}</span>
              </div>
              <div className="text-[11px] px-3 py-1.5 rounded-lg" style={{ color: f.color, background: f.color + '10' }}>💡 {f.tip}</div>
            </div>
          </div>
        ))}
        <div className="mb-8 mt-6">
          <h3 className="text-base font-bold text-white mb-3">오답 패턴</h3>
          {[
            { err: '산업을 너무 좁게 정의', fix: "'K-뷰티' → '화장품·퍼스널케어 산업'으로 넓히기" },
            { err: '고객을 "모든 사람"으로 설정', fix: '"가장 먼저 살 사람 한 명을 먼저 생각해보세요"' },
            { err: 'AI 답변만 복붙', fix: '최소 글자수 + 체크리스트 조건으로 시스템이 방지' },
          ].map((p, i) => (
            <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mb-2">
              <div className="text-[12px] font-bold text-orange-400">⚠ {p.err}</div>
              <div className="text-[11px] text-orange-200/80">→ {p.fix}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setScreen('landing')} className="w-full py-3 bg-[#0B1E3D] text-white font-bold rounded-xl text-sm mb-8">← 돌아가기</button>
      </div>
    </div>
  );

  // ─── GAME ───
  const isCardLocked = card.type === 'question' && !isUnlocked(card.data.id);
  const isCardCompleted = completedCards.has(card.data.id);
  const cardFeedback = aiFeedbacks[card.data.id];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-[#1a1a2e] to-[#16213e] flex flex-col items-center px-4 py-5 relative overflow-hidden">
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none transition-all duration-500"
        style={{ background: `radial-gradient(circle, ${color}22 0%, transparent 70%)` }} />

      {/* Header */}
      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <p className="text-[10px] tracking-[3px] text-gray-500 uppercase">Connect AI</p>
            <h1 className="text-sm font-extrabold text-white">디지털무역 전략카드</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-1 rounded-md font-bold" style={{ background: lv.color + '22', color: lv.color }}>{lv.emoji} {lv.label}</span>
            <span className="text-[9px] text-gray-500 bg-gray-800/50 px-2 py-1 rounded-md">{isLeader ? '👑' : '💬'} {playerName}</span>
            <button onClick={() => setShowList(!showList)} className="bg-white/10 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] text-gray-300 hover:bg-white/15 transition">{showList ? '닫기' : '목록'}</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md truncate max-w-[140px]">{displayItem}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 bg-gray-800/60 rounded-lg px-2 py-1">
            <span className={`text-[12px] font-mono font-bold ${timer <= 60 ? 'text-red-400' : 'text-white'}`}>{fmt(timer)}</span>
            <button onClick={() => setTimerActive(!timerActive)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${timerActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {timerActive ? '⏸' : '▶'}</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 min-w-[50px]">{currentIndex + 1} / {ALL_CARDS.length}</span>
          <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((currentIndex+1)/ALL_CARDS.length)*100}%`, background: color }} />
          </div>
        </div>
        {/* ▼▼▼ 수정된 부분: 16개 챕터 동그라미 모두 표시 ▼▼▼ */}
        <div className="flex gap-0.5 mt-2 flex-wrap pb-1">
          {TOPICS.map((t, i) => (
            <button key={t.id} onClick={() => goTo(ALL_CARDS.findIndex(c => c.data.id === t.id))}
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all"
              style={{ background: currentTopicIdx === i ? CARD_COLORS[t.id].bg : 'rgba(255,255,255,0.08)', border: currentTopicIdx === i ? `2px solid ${CARD_COLORS[t.id].bg}` : '1px solid rgba(255,255,255,0.1)', color: currentTopicIdx === i ? '#fff' : '#888' }}>{t.id}</button>
          ))}
        </div>
        {/* ▲▲▲ 수정 끝 ▲▲▲ */}
      </div>

      {/* Time warning + AI auto banner */}
      {timer <= 30 && timer > 0 && isLeader && (
        <div className="w-full max-w-md mb-3 relative z-10 bg-orange-500/15 border border-orange-500/30 rounded-xl px-4 py-3">
          <div className="text-[13px] font-bold text-orange-400 mb-1">⏰ 시간이 얼마 남지 않았어요!</div>
          <div className="text-[11px] text-orange-300/80 mb-2">팀장 전용: AI가 미완료 카드의 결론 초안을 자동 작성합니다.</div>
          <button onClick={() => {
            const topic = TOPICS[currentTopicIdx];
            if (topic) topic.subs.forEach(sub => { if (!completedCards.has(sub.id) && !aiDraftLoading) requestDraft(sub.id); });
          }} className="w-full py-2 bg-orange-500 text-white font-bold rounded-lg text-[12px]">⚡ 미완료 카드 AI 자동 작성</button>
        </div>
      )}

      {/* Card List Overlay */}
      {showList && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[100] overflow-y-auto p-4 pt-16">
          <button onClick={() => setShowList(false)} className="fixed top-4 right-4 bg-white/15 rounded-lg px-4 py-2 text-white text-sm z-10">닫기</button>
          <h2 className="text-lg font-extrabold text-white mb-4">전체 카드 목록</h2>
          {TOPICS.map((topic) => (
            <div key={topic.id} className="mb-4">
              <button onClick={() => { goTo(ALL_CARDS.findIndex(c => c.data.id === topic.id)); setShowList(false); }}
                className="w-full text-left rounded-xl p-3 mb-1.5 transition hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${CARD_COLORS[topic.id].bg}44` }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-extrabold" style={{ background: CARD_COLORS[topic.id].bg }}>{topic.id}</span>
                  <div><div className="text-sm font-extrabold text-white">{topic.title}</div><div className="text-[11px] text-gray-500">{topic.titleEn}</div></div>
                </div>
              </button>
              <div className="flex gap-1.5 pl-10">
                {topic.subs.map((sub) => {
                  const locked = !isUnlocked(sub.id); const done = completedCards.has(sub.id);
                  return (
                    <button key={sub.id} onClick={() => { if (!locked) { goTo(ALL_CARDS.findIndex(c => c.data.id === sub.id)); setShowList(false); } }}
                      className={`rounded-md px-2.5 py-1 text-[11px] flex items-center gap-1 transition ${locked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10'}`}
                      style={{ background: done ? `${CARD_COLORS[topic.id].bg}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? CARD_COLORS[topic.id].bg + '55' : 'rgba(255,255,255,0.08)'}`, color: done ? CARD_COLORS[topic.id].bg : '#aaa' }}>
                      {locked ? '🔒' : done ? '✓' : ''} {sub.id}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-[340px] relative z-10"
        style={{ aspectRatio: '70/95', perspective: 1200 }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        {[2,1].map(offset => (
          <div key={offset} className="absolute rounded-2xl border border-white/5"
            style={{ top: offset*4, left: offset*3, right: -offset*3, bottom: -offset*4, background: 'rgba(255,255,255,0.03)', transform: `rotate(${offset*1.5}deg)` }} />
        ))}
        {isCardLocked && (
          <div className="absolute inset-0 z-20 rounded-2xl flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
            <div className="text-4xl mb-3">🔒</div>
            <div className="text-sm font-bold text-white mb-1">잠겨 있습니다</div>
            <div className="text-[11px] text-gray-400">이전 카드를 먼저 완료하세요</div>
          </div>
        )}
        {isCardCompleted && !isCardLocked && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
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
            <button onClick={() => setIsFlipped(false)} className="absolute bottom-2 right-2 bg-gray-800/80 text-white text-[10px] px-3 py-1.5 rounded-lg z-10 hover:bg-gray-700 transition">↩ 앞면 보기</button>
          </div>
        </div>
      </div>

      {/* Action buttons area */}
      <div className="flex flex-col items-center gap-2 mt-2.5 relative z-10 w-full max-w-[340px]">
        <p className="text-[11px] text-gray-600 text-center">
          {isCardLocked ? '🔒 이전 카드를 완료하세요' : isFlipped ? '체크리스트 확인 · 앞면 보기 버튼으로 돌아가기' : '카드를 탭하여 뒤집기'} · 스와이프 이동
        </p>

        {/* AI Feedback button */}
        {isLeader && card.type === 'question' && !isCardLocked && canRequestFeedback(card.data.id) && !isCardCompleted && (
          <button onClick={() => requestFeedback(card.data.id)} disabled={aiLoading}
            className="w-full py-2.5 bg-[#0E7490] text-white font-bold rounded-xl text-[13px] transition hover:bg-[#0C6580] disabled:opacity-50">
            {aiLoading && showFeedback === card.data.id ? '🤖 AI 분석 중...' : '🤖 AI 피드백 받기'}
          </button>
        )}

        {/* AI Draft button */}
        {isLeader && card.type === 'question' && !isCardLocked && !hasResponse(card.data.id) && !isCardCompleted && (
          <button onClick={() => requestDraft(card.data.id)} disabled={!!aiDraftLoading}
            className="w-full py-2 bg-amber-600/80 text-white font-bold rounded-xl text-[12px] transition hover:bg-amber-600 disabled:opacity-50">
            {aiDraftLoading === card.data.id ? '⚡ AI 초안 생성 중...' : '⚡ AI 자동 초안 생성 (팀장 전용)'}
          </button>
        )}

        {/* Complete button */}
        {isLeader && card.type === 'question' && !isCardLocked && !isCardCompleted && hasResponse(card.data.id) && (
          <button onClick={() => completeCard(card.data.id)}
            className="w-full py-2.5 bg-green-500 text-white font-bold rounded-xl text-[13px] shadow-lg shadow-green-500/25 transition hover:bg-green-600">
            ✅ 이 카드 완료하기
          </button>
        )}

        {/* Member notice */}
        {!isLeader && card.type === 'question' && !isCardLocked && (
          <div className="w-full px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-[11px] text-cyan-400 text-center">
            💬 팀원 모드 · 체크리스트 확인 가능 · 결론은 팀장만
          </div>
        )}
      </div>

      {/* AI Feedback Display */}
      {showFeedback === card.data.id && cardFeedback && (
        <div className="w-full max-w-md mt-3 relative z-10 bg-[#0B1E3D] border border-cyan-500/30 rounded-2xl p-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-cyan-400 font-bold">🤖 AI 피드백</span>
            <button onClick={() => setShowFeedback(null)} className="text-gray-500 text-sm">✕</button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-black text-cyan-400">{cardFeedback.score}</span>
            <span className="text-[11px] text-gray-400">/5점</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden ml-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${cardFeedback.score * 20}%`, background: cardFeedback.score >= 4 ? '#4CAF50' : cardFeedback.score >= 3 ? '#00B4D8' : '#F59E0B' }} />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="bg-green-500/10 rounded-lg p-3">
              <div className="text-[10px] text-green-400 font-bold mb-1">✅ 잘된 점</div>
              <div className="text-[12px] text-gray-300 leading-relaxed">{cardFeedback.highlight}</div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3">
              <div className="text-[10px] text-amber-400 font-bold mb-1">💡 보완할 점</div>
              <div className="text-[12px] text-gray-300 leading-relaxed">{cardFeedback.improve}</div>
            </div>
            <div className="bg-cyan-500/10 rounded-lg p-3">
              <div className="text-[10px] text-cyan-400 font-bold mb-1">➡️ 다음 단계</div>
              <div className="text-[12px] text-gray-300 leading-relaxed">{cardFeedback.next}</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 items-center mt-3 relative z-10">
        <button onClick={() => goTo(currentIndex-1)} disabled={currentIndex === 0}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg border border-white/10 transition disabled:opacity-30"
          style={{ background: currentIndex === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)' }}>‹</button>
        <div className="text-center min-w-[160px]">
          <div className="text-[13px] font-bold text-white">{card.data.title}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{card.type === 'topic' ? '주제카드' : '질문카드'} · {'●'.repeat(card.data.difficulty)}{'○'.repeat(5-card.data.difficulty)}</div>
        </div>
        <button onClick={() => goTo(currentIndex+1)} disabled={currentIndex === ALL_CARDS.length-1}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition disabled:opacity-30"
          style={{ background: currentIndex === ALL_CARDS.length-1 ? 'rgba(255,255,255,0.05)' : color, boxShadow: currentIndex < ALL_CARDS.length-1 ? `0 4px 16px ${color}44` : 'none' }}>›</button>
      </div>

      {/* Sub nav */}
      <div className="flex items-center gap-1.5 mt-3 relative z-10">
        {TOPICS[currentTopicIdx] && (<>
          <button onClick={() => goTo(ALL_CARDS.findIndex(c => c.data.id === TOPICS[currentTopicIdx].id))}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white transition"
            style={{ background: card.data.id === TOPICS[currentTopicIdx].id ? color : 'rgba(255,255,255,0.06)', border: `1px solid ${card.data.id === TOPICS[currentTopicIdx].id ? color : 'rgba(255,255,255,0.1)'}` }}>주제</button>
          {TOPICS[currentTopicIdx].subs.map((sub, i) => {
            const locked = !isUnlocked(sub.id); const done = completedCards.has(sub.id);
            return (
              <button key={sub.id} onClick={() => !locked && goTo(ALL_CARDS.findIndex(c => c.data.id === sub.id))}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ background: card.data.id === sub.id ? color : done ? color + '33' : 'rgba(255,255,255,0.06)', border: `1px solid ${card.data.id === sub.id ? color : 'rgba(255,255,255,0.1)'}`, color: done ? color : locked ? '#666' : '#fff' }}>
                {locked ? '🔒' : done ? '✓' : i+1}</button>
            );
          })}
        </>)}
      </div>

      <div className="mt-4 text-[10px] text-gray-700 text-center relative z-10">
        © 2025 CONNECT AI
        <button onClick={() => { setScreen('landing'); if(timerRef.current) clearInterval(timerRef.current); setTimerActive(false); }} className="ml-3 text-gray-600 underline hover:text-gray-400 transition">나가기</button>
      </div>

      {/* Activity Sheet */}
      {showActivity && card.type === 'question' && isLeader && (
        <ActivitySheet card={card} responses={responses[card.data.id]}
          checkStates={currentChecks} onCheck={handleCheck}
          onSave={handleSaveResponse} onClose={() => setShowActivity(false)} />
      )}

      {/* AI Draft Editor */}
      {showDraftEditor && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex justify-center items-end" onClick={e => { if (e.target === e.currentTarget) setShowDraftEditor(null); }}>
          <div className="w-full max-w-lg max-h-[80vh] bg-white rounded-t-2xl flex flex-col" style={{ animation: 'slideUp 0.35s ease-out' }}>
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold text-gray-900">🤖 AI 자동 초안</div>
                <div className="text-[11px] text-amber-600">수정 후 컨펌해야 최종 저장됩니다</div>
              </div>
              <button onClick={() => setShowDraftEditor(null)} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-500">닫기</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea value={draftText} onChange={e => setDraftText(e.target.value)}
                className="w-full min-h-[200px] px-4 py-3 border-2 border-amber-300 rounded-xl text-[13px] text-gray-800 leading-relaxed resize-y bg-amber-50 focus:border-amber-500 focus:outline-none"
                placeholder="AI가 생성한 초안이 여기에 표시됩니다..." />
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/15 rounded-xl px-5 py-2.5 z-[300] flex items-center gap-2 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          <span className="text-[13px] text-white font-semibold">저장 완료!</span>
        </div>
      )}
    </div>
  );
}
