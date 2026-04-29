'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ALL_CARDS, CARD_COLORS, TOPICS } from '@/data/cardData';
import SignalCard, { type LeaderConclusionState } from '@/components/SignalCard';
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

const S = { green: '#E7FE55', aqua: '#C1E8EB', navy: '#111111', bg: '#0A0A0A' };
const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

function fmt(s: number) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
type AIFeedback = { score: number; highlight: string; improve: string; next: string };

const defaultLeaderConclusion = (): LeaderConclusionState => ({
  fields: ['', '', '', ''],
  oneSentence: '',
  isEditing: false,
  judgments: [false, false, false, false],
});

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

  // 현재 카드 세트 (0~15) + 탭
  const [currentCardIdx, setCurrentCardIdx] = useState(0); // TOPICS 인덱스
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

  const [aiFeedbacks, setAiFeedbacks] = useState<Record<string, AIFeedback>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraftLoading, setAiDraftLoading] = useState<string | null>(null);
  const [showDraftEditor, setShowDraftEditor] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const [aiUsed, setAiUsed] = useState<Set<string>>(new Set());

  const topic = TOPICS[currentCardIdx];
  const color = CARD_COLORS[topic.id].bg;
  const lv = LEVELS[level];
  const isLeader = role === 'leader';
  const displayItem = item === '✏️ 직접 입력' ? customItem : item;
  const currentLeaderConclusion = leaderConclusions[topic.id] || defaultLeaderConclusion();
  const isCardCompleted = completedCards.has(topic.id);

  // 세션 복원 (v1: 옛날 흐름 / v2: /student/join 흐름 둘 다 지원)
  useEffect(() => {
    (async () => {
      try {
        // 1) 옛날 v1 세션 (수업 코드 + 이름 직접 입력 흐름)
        const saved = await restoreSession();
        if (saved) {
          setSession(saved); setTeamId(saved.team_id);
          setPlayerName(saved.player_name); setRole(saved.role);
          setLevel(saved.level); setItem(saved.item || '');
          const [resps, prog] = await Promise.all([loadCardResponses(saved.team_id), loadCardProgress(saved.team_id)]);
          setResponses(resps); setCheckStates(prog.checkStates); setCompletedCards(prog.completedCards);
          setTimer(LEVELS[saved.level]?.timer || 1200);
          setScreen('game');
          return;
        }

        // 2) 새 v2 세션 (/student/join 흐름) — 선생님이 만든 팀에 학생이 명단으로 입장한 경우
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
            setJoinCode(v2.joinCode || '');
            const [resps, prog] = await Promise.all([loadCardResponses(v2.teamId), loadCardProgress(v2.teamId)]);
            setResponses(resps); setCheckStates(prog.checkStates); setCompletedCards(prog.completedCards);
            setTimer(LEVELS[v2Level]?.timer || 1200);
            setScreen('game');
          }
        }
      } catch (e) {}
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
    // 다음 카드로 자동 이동
    if (currentCardIdx < TOPICS.length - 1) {
      setTimeout(() => goToCard(currentCardIdx + 1), 1000);
    }
  };

  const requestFeedback = async (cardId: string) => {
    const topicData = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    const sub = topicData?.subs.find(s => s.id === cardId) as SubCard;
    if (!sub) return;
    const r = responses[cardId];
    const responseText = Object.values(r?.texts || {}).filter((t: any) => t?.trim()).join('\n');
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', cardId: sub.id, question: sub.question, checklist: sub.checklist, response: responseText, item: displayItem, level }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiFeedbacks(prev => ({ ...prev, [cardId]: data }));
    } catch (e) {
      setAiFeedbacks(prev => ({ ...prev, [cardId]: { score: 3, highlight: '네트워크 오류가 발생했습니다.', improve: '연결을 확인해주세요.', next: '직접 완료를 사용하세요.' } }));
    } finally { setAiLoading(false); }
  };

  const requestDraft = async (cardId: string) => {
    const topicData = TOPICS.find(t => t.subs.some(s => s.id === cardId));
    const sub = topicData?.subs.find(s => s.id === cardId) as SubCard;
    if (!sub) return;
    setAiDraftLoading(cardId);
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'draft', cardId: sub.id, question: sub.question, checklist: sub.checklist, item: displayItem, level }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftText(data.draft); setShowDraftEditor(cardId);
    } catch (e) {} finally { setAiDraftLoading(null); }
  };

  const confirmDraft = async (cardId: string) => {
    await handleSaveResponse(cardId, draftText);
    setAiUsed(prev => new Set([...prev, cardId]));
    setShowDraftEditor(null);
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
      if (showDraftEditor || screen !== 'game') return;
      if (e.key === 'ArrowRight') goToCard(currentCardIdx + 1);
      if (e.key === 'ArrowLeft') goToCard(currentCardIdx - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentCardIdx, goToCard, showDraftEditor, screen]);

  const startGame = async () => {
    setJoinError(''); setJoining(true);
    try {
      const team = await findTeamByCode(joinCode);
      if (!team) { setJoinError('수업 코드를 찾을 수 없어요.'); setJoining(false); return; }
      const finalItem = item === '✏️ 직접 입력' ? customItem : item;
      const sess = await getOrCreateSession({ playerName, teamId: team.id, role, level, item: finalItem });
      if (!sess) { setJoinError('접속 오류. 다시 시도해주세요.'); setJoining(false); return; }
      setSession(sess); setTeamId(team.id);
      const [resps, prog] = await Promise.all([loadCardResponses(team.id), loadCardProgress(team.id)]);
      setResponses(resps); setCheckStates(prog.checkStates); setCompletedCards(prog.completedCards);
      setTimer(LEVELS[level].timer); setTimerActive(false); setScreen('game');
    } catch (e) { setJoinError('오류가 발생했어요.'); } finally { setJoining(false); }
  };

  const resetSession = () => {
    localStorage.removeItem('dtc_session_token');
    localStorage.removeItem('dtc_session_token_v2');
    setSession(null); setTeamId(null); setResponses({}); setCheckStates({});
    setCompletedCards(new Set()); setJoinCode(''); setPlayerName(''); setItem('');
    setCurrentCardIdx(0); setCurrentTab('주제');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false); setScreen('landing');
  };

  // ─── LANDING ───
  if (screen === 'landing') return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ background: S.bg }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${S.green}08 0%, transparent 70%)` }} />
      <div className="relative z-10 text-center max-w-md">
        <p className="text-[11px] tracking-[6px] text-gray-600 uppercase mb-4 font-mono">ConnectAI</p>
        <h1 className="text-6xl font-black text-white mb-2 tracking-tight">SIGNAL</h1>
        <p className="text-gray-500 text-sm mb-2 font-mono">디지털 무역 전략카드</p>
        <p className="text-gray-600 text-[13px] mb-10 leading-relaxed">
          디지털 무역 전략을 직접 만들어보는<br />체험형 카드게임 학습 플랫폼
        </p>
        <div className="flex justify-center gap-3 mb-10">
          {['01','02','03','04','05'].map((id, i) => (
            <div key={id} className="w-12 h-16 rounded-xl flex items-center justify-center text-white text-[11px] font-black font-mono"
              style={{ background: CARD_COLORS[id].bg, transform: `rotate(${(i-2)*6}deg)`, boxShadow: `0 4px 20px ${CARD_COLORS[id].bg}55` }}>{id}</div>
          ))}
        </div>
        <button onClick={() => setScreen('onboarding')}
          className="w-full py-4 font-black rounded-2xl text-base mb-3 transition-all hover:scale-[1.02]"
          style={{ background: S.green, color: S.navy }}>시작하기 →</button>
        <button onClick={() => setScreen('guide')}
          className="w-full py-3 rounded-2xl text-sm text-gray-500 transition hover:text-gray-300"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
      <div className="min-h-screen flex flex-col items-center px-4 py-6 overflow-auto" style={{ background: S.bg }}>
        <div className="w-full max-w-md">
          <button onClick={() => setScreen('landing')} className="text-gray-600 text-sm mb-4 hover:text-gray-400 transition">← 돌아가기</button>
          <div className="rounded-2xl p-5 mb-6" style={{ background: `${S.green}08`, border: `1px solid ${S.green}20` }}>
            <p className="text-[10px] font-mono tracking-widest mb-1" style={{ color: S.green }}>SIGNAL · CARD GAME</p>
            <h2 className="text-xl font-black text-white mb-1">나의 첫 <span style={{ color: S.green }}>디지털 무역 전략</span></h2>
            <p className="text-[11px] text-gray-500">팀의 제품을 선택하고 글로벌 수출 전략을 설계하세요.</p>
          </div>

          <div className="mb-5">
            <p className="text-sm font-bold text-white mb-1">① 수업 코드</p>
            <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              placeholder="예) TEAM01" maxLength={10}
              className="w-full px-4 py-3 rounded-xl text-white text-base font-bold tracking-widest uppercase transition"
              style={{ background: 'rgba(255,255,255,0.05)', border: joinCode ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
            {joinError && <p className="text-red-400 text-[11px] mt-1">⚠ {joinError}</p>}
          </div>

          <div className="mb-5">
            <p className="text-sm font-bold text-white mb-1">② 팀 아이템</p>
            <div className="grid grid-cols-2 gap-2">
              {ITEMS.map(it => (
                <button key={it} onClick={() => setItem(it)}
                  className="px-3 py-2.5 rounded-xl text-left text-[12px] transition"
                  style={{ background: item === it ? `${S.green}15` : 'rgba(255,255,255,0.04)', border: item === it ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.08)', color: item === it ? S.green : '#9ca3af', fontWeight: item === it ? 700 : 400 }}>
                  {it}
                </button>
              ))}
            </div>
            {item === '✏️ 직접 입력' && (
              <input value={customItem} onChange={e => setCustomItem(e.target.value)} placeholder="예) 제주 감귤 주스"
                className="w-full mt-2 px-3 py-2.5 rounded-xl text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
            )}
          </div>

          <div className="mb-5">
            <p className="text-sm font-bold text-white mb-1">③ 역할 · 이름</p>
            <div className="flex gap-2 mb-2">
              {([['leader','👑 팀장','결론 작성 · AI'],['member','💬 팀원','토론 · 카드 열람']] as const).map(([k,l,d]) => (
                <button key={k} onClick={() => setRole(k)} className="flex-1 px-3 py-2.5 rounded-xl text-left transition"
                  style={{ background: role === k ? `${S.green}10` : 'rgba(255,255,255,0.04)', border: role === k ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-[13px] font-bold" style={{ color: role === k ? S.green : '#fff' }}>{l}</div>
                  <div className="text-[10px] text-gray-600">{d}</div>
                </button>
              ))}
            </div>
            <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="이름 (예: 이서연)"
              className="w-full px-3 py-2.5 rounded-xl text-white text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: playerName ? `1px solid ${S.green}` : '1px solid rgba(255,255,255,0.1)', outline: 'none' }} />
          </div>

          <div className="mb-6">
            <p className="text-sm font-bold text-white mb-1">④ 수업 수준</p>
            {Object.entries(LEVELS).map(([k, v]) => (
              <button key={k} onClick={() => setLevel(k)}
                className="w-full mb-2 px-4 py-3 rounded-xl flex items-center gap-3 transition"
                style={{ background: level === k ? v.color + '22' : 'rgba(255,255,255,0.04)', border: level === k ? `1px solid ${v.color}` : '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-xl">{v.emoji}</span>
                <div className="flex-1 text-left text-[13px] font-bold text-white">{v.label}</div>
                <span className="text-[11px] text-gray-500">{Math.floor(v.timer/60)}분 · {v.minChars}자</span>
              </button>
            ))}
          </div>

          <button onClick={startGame} disabled={!canStart}
            className="w-full py-4 font-black rounded-2xl transition-all disabled:opacity-30"
            style={{ background: canStart ? S.green : 'rgba(255,255,255,0.1)', color: canStart ? S.navy : '#666' }}>
            {joining ? '⏳ 접속 중...' : '시작하기 →'}
          </button>
        </div>
      </div>
    );
  }

  // ─── GUIDE ───
  if (screen === 'guide') return (
    <div className="min-h-screen px-4 py-6 overflow-auto" style={{ background: S.bg }}>
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
          { time: '40–50분', step: 'AI 피드백 → 카드 완료', icon: '🤖', color: '#4FB0C6', tip: 'Q탭에서 체크리스트 + 최소 글자수 충족 시 AI 피드백 활성화.' },
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

  // ─── GAME ───
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-4 relative overflow-hidden" style={{ background: S.bg }}>
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />

      {/* Header */}
      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
            <h1 className="text-sm font-extrabold text-white">디지털 무역 전략카드</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-2 py-1 rounded-md font-bold" style={{ background: lv.color + '22', color: lv.color }}>{lv.emoji} {lv.label}</span>
            <span className="text-[9px] text-gray-600 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>{isLeader ? '👑' : '💬'} {playerName}</span>
            <button onClick={() => setShowList(!showList)}
              className="rounded-lg px-2.5 py-1 text-[11px] text-gray-400 transition"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {showList ? '닫기' : '목록'}
            </button>
          </div>
        </div>

        {/* 타이머 + 아이템 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-md truncate max-w-[130px]"
            style={{ color: S.green, background: `${S.green}10` }}>{displayItem}</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className={`text-[12px] font-mono font-bold ${timer <= 60 ? 'text-red-400' : 'text-white'}`}>{fmt(timer)}</span>
            <button onClick={() => setTimerActive(!timerActive)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${timerActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {timerActive ? '⏸' : '▶'}
            </button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-gray-600 font-mono min-w-[50px]">{currentCardIdx + 1} / {TOPICS.length}</span>
          <div className="flex-1 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${((currentCardIdx+1)/TOPICS.length)*100}%`, background: color }} />
          </div>
        </div>

        {/* 챕터 동그라미 */}
        <div className="flex gap-0.5 flex-wrap">
          {TOPICS.map((t, i) => (
            <button key={t.id} onClick={() => goToCard(i)}
              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono transition-all"
              style={{ background: currentCardIdx === i ? CARD_COLORS[t.id].bg : completedCards.has(t.id) ? CARD_COLORS[t.id].bg + '44' : 'rgba(255,255,255,0.06)', border: currentCardIdx === i ? `2px solid ${CARD_COLORS[t.id].bg}` : '1px solid rgba(255,255,255,0.08)', color: currentCardIdx === i ? '#fff' : completedCards.has(t.id) ? CARD_COLORS[t.id].bg : '#555' }}>
              {completedCards.has(t.id) && currentCardIdx !== i ? '✓' : t.id}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 목록 오버레이 */}
      {showList && (
        <div className="fixed inset-0 backdrop-blur-xl z-[100] overflow-y-auto p-4 pt-14" style={{ background: 'rgba(0,0,0,0.92)' }}>
          <button onClick={() => setShowList(false)} className="fixed top-4 right-4 rounded-lg px-4 py-2 text-white text-sm z-10" style={{ background: 'rgba(255,255,255,0.1)' }}>닫기</button>
          <h2 className="text-lg font-extrabold text-white mb-4">전체 카드 목록</h2>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((t, i) => {
              const done = completedCards.has(t.id);
              return (
                <button key={t.id} onClick={() => { goToCard(i); setShowList(false); }}
                  className="text-left rounded-xl p-3 transition"
                  style={{ background: done ? `${CARD_COLORS[t.id].bg}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${done ? CARD_COLORS[t.id].bg + '55' : 'rgba(255,255,255,0.08)'}` }}>
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

      {/* 5탭 카드 플레이어 */}
      <div className="w-full max-w-[420px] relative z-10"
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
          aiLoading={aiLoading}
          aiDraftLoading={aiDraftLoading}
          onRequestFeedback={requestFeedback}
          onRequestDraft={requestDraft}
          aiFeedbacks={aiFeedbacks}
          aiUsed={aiUsed}
          displayItem={displayItem}
          level={level}
          minChars={lv.minChars}
        />
      </div>

      {/* 카드 네비게이션 */}
      <div className="flex gap-3 items-center mt-4 relative z-10">
        <button onClick={() => goToCard(currentCardIdx - 1)} disabled={currentCardIdx === 0}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg transition disabled:opacity-20"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>‹</button>
        <div className="text-center min-w-[160px]">
          <div className="text-[13px] font-bold text-white">{topic.title}</div>
          <div className="text-[10px] text-gray-600 font-mono mt-0.5">카드 {currentCardIdx + 1}/16 · {'★'.repeat(topic.difficulty)}{'☆'.repeat(5-topic.difficulty)}</div>
        </div>
        <button onClick={() => goToCard(currentCardIdx + 1)} disabled={currentCardIdx === TOPICS.length - 1}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold transition disabled:opacity-20"
          style={{ background: currentCardIdx === TOPICS.length - 1 ? 'rgba(255,255,255,0.06)' : color, color: '#fff' }}>›</button>
      </div>

      {/* PDF 버튼 (16번 카드에서만) */}
      {currentCardIdx === 15 && isLeader && (
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

      {/* 하단 */}
      <div className="mt-4 text-[10px] text-gray-700 text-center relative z-10 font-mono">
        © 2026 SIGNAL — ConnectAI
        <button onClick={() => { setScreen('landing'); if(timerRef.current) clearInterval(timerRef.current); setTimerActive(false); }}
          className="ml-3 text-gray-700 underline hover:text-gray-500">나가기</button>
        <button onClick={resetSession} className="ml-3 text-gray-700 underline hover:text-red-400">다시 설정</button>
      </div>

      {/* AI Draft Editor */}
      {showDraftEditor && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-center items-end" onClick={e => { if (e.target === e.currentTarget) setShowDraftEditor(null); }}>
          <div className="w-full max-w-lg max-h-[80vh] bg-white rounded-t-2xl flex flex-col" style={{ animation: 'slideUp 0.35s ease-out' }}>
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div><div className="text-sm font-extrabold text-gray-900">🤖 AI 자동 초안</div><div className="text-[11px] text-amber-600">수정 후 컨펌해야 저장됩니다</div></div>
              <button onClick={() => setShowDraftEditor(null)} className="bg-gray-100 px-3 py-1.5 rounded-lg text-xs text-gray-500">닫기</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <textarea value={draftText} onChange={e => setDraftText(e.target.value)}
                className="w-full min-h-[200px] px-4 py-3 border-2 border-amber-300 rounded-xl text-[13px] text-gray-800 leading-relaxed resize-y bg-amber-50 focus:border-amber-500 focus:outline-none" rows={6} />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowDraftEditor(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-sm">취소</button>
              <button onClick={() => confirmDraft(showDraftEditor!)} className="flex-[2] py-3 bg-amber-500 text-white font-bold rounded-xl text-sm">🤖 수정 완료 · 컨펌</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
