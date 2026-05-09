'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TOPICS, CARD_COLORS, parseTemplate } from '@/data/cardData';
import DemoCard from '@/components/demo/DemoCard';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  blue: '#3B82F6',
  navy: '#111111',
};

const TABS = ['주제', 'Q1', 'Q2', 'Q3', '결론'] as const;
type TabType = typeof TABS[number];

const DEMO_TOPICS = TOPICS.slice(0, 5);
const TOTAL_CARDS = DEMO_TOPICS.length;

function isFillInBlankComplete(template: string, values: string[]): boolean {
  const parts = parseTemplate(template);
  const blankCount = parts.length - 1;
  if (blankCount === 0) return true;
  for (let i = 0; i < blankCount; i++) {
    if (!values[i]?.trim()) return false;
  }
  return true;
}

export default function DemoPlayPage() {
  const router = useRouter();
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [currentTab, setCurrentTab] = useState<TabType>('주제');
  const [completedCards, setCompletedCards] = useState<Set<string>>(new Set());

  // ⭐ NEW: 완료된 Q (subCardId 기준, 예: '01-1', '01-2', '01-3')
  const [completedSubCards, setCompletedSubCards] = useState<Set<string>>(new Set());

  // 답변
  const [responses, setResponses] = useState<Record<string, string>>({});
  // 중간 결론 빈칸
  const [interimConclusions, setInterimConclusions] = useState<Record<string, string[]>>({});
  // 한 문장 전략 빈칸
  const [finalStrategies, setFinalStrategies] = useState<Record<string, string[]>>({});

  // 스와이프
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const topic = DEMO_TOPICS[currentCardIdx];
  const color = CARD_COLORS[topic.id].bg;
  const isCardCompleted = completedCards.has(topic.id);

  // 카드 잠금: 이전 카드까지 다 완료해야 진입 가능
  const canAccessCard = (idx: number): boolean => {
    if (idx === 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!completedCards.has(DEMO_TOPICS[i].id)) return false;
    }
    return true;
  };

  const goToCard = useCallback((idx: number) => {
    if (idx >= 0 && idx < TOTAL_CARDS) {
      if (idx > currentCardIdx && !canAccessCard(idx)) return;
      setCurrentCardIdx(idx);
      setCurrentTab('주제');
      setSwipeOffset(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIdx, completedCards]);

  const handleSaveResponse = (subCardId: string, text: string) => {
    setResponses(prev => ({ ...prev, [subCardId]: text }));
  };

  const handleSaveInterim = (subCardId: string, values: string[]) => {
    setInterimConclusions(prev => ({ ...prev, [subCardId]: values }));
  };

  const handleSaveFinalStrategy = (topicId: string, values: string[]) => {
    setFinalStrategies(prev => ({ ...prev, [topicId]: values }));
  };

  // ⭐ NEW: Q 완료 처리 → 자동으로 다음 Q 탭으로
  const handleCompleteSub = (subCardId: string) => {
    setCompletedSubCards(prev => new Set([...prev, subCardId]));

    // 다음 Q 탭으로 자동 이동
    const qNum = parseInt(subCardId.split('-')[1], 10);
    if (qNum === 1) {
      setTimeout(() => setCurrentTab('Q2'), 500);
    } else if (qNum === 2) {
      setTimeout(() => setCurrentTab('Q3'), 500);
    } else if (qNum === 3) {
      setTimeout(() => setCurrentTab('결론'), 500);
    }
  };

  // 카드 완료 → 다음 카드로 이동
  const handleComplete = () => {
    setCompletedCards(prev => new Set([...prev, topic.id]));

    if (currentCardIdx < TOTAL_CARDS - 1) {
      setTimeout(() => {
        setCurrentCardIdx(currentCardIdx + 1);
        setCurrentTab('주제');
      }, 600);
    } else {
      setTimeout(() => router.push('/'), 1500);
    }
  };

  // ⭐ NEW: 탭 잠금 체크
  const isTabLocked = (tab: TabType): boolean => {
    if (tab === '주제') return false;
    if (tab === 'Q1') return false; // Q1은 항상 가능

    if (tab === 'Q2') {
      return !completedSubCards.has(`${topic.id}-1`);
    }
    if (tab === 'Q3') {
      return !completedSubCards.has(`${topic.id}-2`);
    }
    if (tab === '결론') {
      return !completedSubCards.has(`${topic.id}-3`);
    }
    return false;
  };

  // 탭 변경 (잠긴 탭은 못 감)
  const handleTabChange = (tab: TabType) => {
    if (isTabLocked(tab)) return;
    setCurrentTab(tab);
  };

  // 이전 탭으로 이동
  const goPrevTab = () => {
    const idx = TABS.indexOf(currentTab);
    if (idx > 0) setCurrentTab(TABS[idx - 1]);
  };

  // 스와이프 (이전 탭만 가능)
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) setSwipeOffset(e.touches[0].clientX - touchStart);
  };
  const onTouchEnd = () => {
    if (Math.abs(swipeOffset) > 80) {
      if (swipeOffset > 0) {
        // 오른쪽 스와이프 = 이전 탭
        goPrevTab();
      }
      // 왼쪽 스와이프(다음 탭)는 잠금 시스템 때문에 비활성
    }
    setSwipeOffset(0);
    setTouchStart(null);
  };

  // 키보드 (이전 탭만)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrevTab();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  const currentTabIdx = TABS.indexOf(currentTab);
  const isFirstTab = currentTabIdx === 0;

  return (
    <div className="min-h-screen flex flex-col items-center px-3 md:px-4 py-3 md:py-4 relative overflow-hidden">

      {/* 배경 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%),
            radial-gradient(circle at 50% 95%, ${S.blue}14 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 md:w-96 md:h-96 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`, zIndex: 1 }} />

      {/* 체험판 배지 */}
      <div className="fixed top-3 right-3 z-50 px-2.5 py-1 rounded-full font-mono text-[9px] font-bold tracking-widest"
        style={{
          background: `${S.cyan}15`,
          border: `1px solid ${S.cyan}66`,
          color: S.cyan,
        }}>
        ⚡ DEMO
      </div>

      {/* 헤더 */}
      <div className="w-full max-w-md mb-3 relative z-10">
        <div className="flex items-start justify-between mb-2.5 gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] md:text-[10px] tracking-[3px] md:tracking-[4px] text-gray-600 font-mono mb-0.5">
              SIGNAL · DEMO
            </p>
            <h1 className="text-xs md:text-sm font-extrabold text-white">디지털 무역 전략카드 체험</h1>
          </div>
        </div>

        {/* 진행률 */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-white font-mono min-w-[50px]">
            {currentCardIdx + 1} / {TOTAL_CARDS}
          </span>
          <div className="flex-1 h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${((currentCardIdx + 1) / TOTAL_CARDS) * 100}%`,
                background: color,
                boxShadow: `0 0 12px ${color}88`,
              }} />
          </div>
        </div>

        {/* 카드 도트 */}
        <div className="flex gap-1 justify-center">
          {DEMO_TOPICS.map((t, i) => {
            const isAccessible = canAccessCard(i);
            const isDone = completedCards.has(t.id);
            const isCurrent = currentCardIdx === i;

            return (
              <button key={t.id} onClick={() => goToCard(i)}
                disabled={!isAccessible}
                className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-[11px] font-bold font-mono transition-all"
                style={{
                  background: isCurrent
                    ? CARD_COLORS[t.id].bg
                    : isDone
                      ? CARD_COLORS[t.id].bg + '44'
                      : 'rgba(255,255,255,0.06)',
                  border: isCurrent
                    ? `2px solid ${CARD_COLORS[t.id].bg}`
                    : '1px solid rgba(255,255,255,0.08)',
                  color: isCurrent ? '#fff' : isDone ? CARD_COLORS[t.id].bg : '#fff',
                  boxShadow: isCurrent ? `0 4px 12px ${CARD_COLORS[t.id].bg}66` : 'none',
                  opacity: !isAccessible ? 0.3 : 1,
                  cursor: !isAccessible ? 'not-allowed' : 'pointer',
                }}>
                {!isAccessible ? '🔒' : isDone && !isCurrent ? '✓' : t.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* 카드 */}
      <div key={topic.id} className="w-full max-w-[420px] md:max-w-4xl relative z-10"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <DemoCard
          topic={topic}
          currentTab={currentTab}
          onTabChange={handleTabChange}
          isTabLocked={isTabLocked}
          completedSubCards={completedSubCards}
          onCompleteSub={handleCompleteSub}
          responses={responses}
          onSaveResponse={handleSaveResponse}
          interimConclusions={interimConclusions}
          onSaveInterim={handleSaveInterim}
          finalStrategyValues={finalStrategies[topic.id] || []}
          onSaveFinalStrategy={(values) => handleSaveFinalStrategy(topic.id, values)}
          isCardCompleted={isCardCompleted}
          onComplete={handleComplete}
        />
      </div>

      {/* 네비게이션 - 이전 탭만 (이전 탭 ‹ 버튼만, 다음 탭은 "완료" 버튼으로 이동) */}
      <div className="flex gap-3 items-center mt-3 md:mt-4 relative z-10">
        <button
          onClick={goPrevTab}
          disabled={isFirstTab}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg transition-all disabled:opacity-20 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ‹
        </button>
        <div className="text-center min-w-[140px] md:min-w-[160px]">
          <div className="text-[12px] md:text-[13px] font-bold text-white">
            {topic.title}
          </div>
          <div className="text-[10px] text-white font-mono mt-0.5" style={{ opacity: 0.7 }}>
            {currentTab} · 카드 {currentCardIdx + 1}/{TOTAL_CARDS}
          </div>
        </div>
        {/* 빈 자리 (이전 버튼이랑 균형 맞추기) */}
        <div className="w-10 h-10 md:w-11 md:h-11" />
      </div>

      <div className="mt-3 md:mt-4 text-[10px] text-white text-center relative z-10 font-mono" style={{ opacity: 0.5 }}>
        © 2026 SIGNAL — ConnectAI · DEMO
        <button onClick={() => router.push('/')} className="ml-3 underline hover:opacity-80">
          나가기
        </button>
      </div>
    </div>
  );
}
