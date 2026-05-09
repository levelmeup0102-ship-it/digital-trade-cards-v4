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

// 체험판은 카드 1~5번만 사용
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

  // 답변: { [subCardId]: string }  예: '01-1' → "..."
  const [responses, setResponses] = useState<Record<string, string>>({});

  // 중간 결론 빈칸: { [subCardId]: string[] }
  const [interimConclusions, setInterimConclusions] = useState<Record<string, string[]>>({});

  // 한 문장 전략 빈칸: { [topicId]: string[] }
  const [finalStrategies, setFinalStrategies] = useState<Record<string, string[]>>({});

  // 스와이프
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const topic = DEMO_TOPICS[currentCardIdx];
  const color = CARD_COLORS[topic.id].bg;
  const isCardCompleted = completedCards.has(topic.id);

  const goToCard = useCallback((idx: number) => {
    if (idx >= 0 && idx < TOTAL_CARDS) {
      setCurrentCardIdx(idx);
      setCurrentTab('주제');
      setSwipeOffset(0);
    }
  }, []);

  const handleSaveResponse = (subCardId: string, text: string) => {
    setResponses(prev => ({ ...prev, [subCardId]: text }));
  };

  const handleSaveInterim = (subCardId: string, values: string[]) => {
    setInterimConclusions(prev => ({ ...prev, [subCardId]: values }));
  };

  const handleSaveFinalStrategy = (topicId: string, values: string[]) => {
    setFinalStrategies(prev => ({ ...prev, [topicId]: values }));
  };

  const handleComplete = () => {
    setCompletedCards(prev => new Set([...prev, topic.id]));

    if (currentCardIdx < TOTAL_CARDS - 1) {
      // 다음 카드로
      setTimeout(() => goToCard(currentCardIdx + 1), 600);
    } else {
      // 마지막 카드 완료 → 메인 페이지로
      setTimeout(() => router.push('/'), 1500);
    }
  };

  // 스와이프
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart !== null) setSwipeOffset(e.touches[0].clientX - touchStart);
  };
  const onTouchEnd = () => {
    if (Math.abs(swipeOffset) > 80) {
      if (swipeOffset < 0 && currentCardIdx < TOTAL_CARDS - 1) goToCard(currentCardIdx + 1);
      if (swipeOffset > 0 && currentCardIdx > 0) goToCard(currentCardIdx - 1);
    }
    setSwipeOffset(0);
    setTouchStart(null);
  };

  // 키보드 화살표
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToCard(currentCardIdx + 1);
      if (e.key === 'ArrowLeft') goToCard(currentCardIdx - 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentCardIdx, goToCard]);

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
          <span className="text-[11px] text-gray-600 font-mono min-w-[50px]">
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

        {/* 카드 번호 도트 */}
        <div className="flex gap-1 justify-center">
          {DEMO_TOPICS.map((t, i) => (
            <button key={t.id} onClick={() => goToCard(i)}
              className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-[11px] font-bold font-mono transition-all hover:scale-110"
              style={{
                background: currentCardIdx === i
                  ? CARD_COLORS[t.id].bg
                  : completedCards.has(t.id)
                    ? CARD_COLORS[t.id].bg + '44'
                    : 'rgba(255,255,255,0.06)',
                border: currentCardIdx === i
                  ? `2px solid ${CARD_COLORS[t.id].bg}`
                  : '1px solid rgba(255,255,255,0.08)',
                color: currentCardIdx === i ? '#fff' : completedCards.has(t.id) ? CARD_COLORS[t.id].bg : '#555',
                boxShadow: currentCardIdx === i ? `0 4px 12px ${CARD_COLORS[t.id].bg}66` : 'none',
              }}>
              {completedCards.has(t.id) && currentCardIdx !== i ? '✓' : t.id}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 */}
      <div key={topic.id} className="w-full max-w-[420px] md:max-w-4xl relative z-10"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <DemoCard
          topic={topic}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
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

      {/* 네비게이션 */}
      <div className="flex gap-3 items-center mt-3 md:mt-4 relative z-10">
        <button onClick={() => goToCard(currentCardIdx - 1)} disabled={currentCardIdx === 0}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg transition-all disabled:opacity-20 hover:scale-110"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ‹
        </button>
        <div className="text-center min-w-[140px] md:min-w-[160px]">
          <div className="text-[12px] md:text-[13px] font-bold text-white">{topic.title}</div>
          <div className="text-[10px] text-gray-600 font-mono mt-0.5">
            카드 {currentCardIdx + 1}/{TOTAL_CARDS} · {'★'.repeat(topic.difficulty)}{'☆'.repeat(5 - topic.difficulty)}
          </div>
        </div>
        <button onClick={() => goToCard(currentCardIdx + 1)} disabled={currentCardIdx === TOTAL_CARDS - 1}
          className="w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-base md:text-lg font-bold transition-all disabled:opacity-20 hover:scale-110"
          style={{
            background: currentCardIdx === TOTAL_CARDS - 1 ? 'rgba(255,255,255,0.06)' : color,
            color: '#fff',
            boxShadow: currentCardIdx === TOTAL_CARDS - 1 ? 'none' : `0 6px 20px -5px ${color}88`,
          }}>
          ›
        </button>
      </div>

      <div className="mt-3 md:mt-4 text-[10px] text-gray-700 text-center relative z-10 font-mono">
        © 2026 SIGNAL — ConnectAI · DEMO
        <button onClick={() => router.push('/')} className="ml-3 text-gray-700 underline hover:text-gray-500">
          나가기
        </button>
      </div>
    </div>
  );
}
