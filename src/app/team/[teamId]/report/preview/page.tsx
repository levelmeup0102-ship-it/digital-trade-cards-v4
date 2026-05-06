'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CARD_COLORS, TOPICS } from '@/data/cardData';
import { generateTeamReport, getStoredReport } from '@/lib/reportGenerator';
import type { TeamReportData, ReportCard } from '@/types/report';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  gold: '#FFD700',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  navy: '#050505',
  factStage: '#06B6D4',
  insightStage: '#FFA500',
  decisionStage: '#78BE20',
};

const CATEGORY_STYLES: Record<string, { color: string; label: string }> = {
  '시장 이해': { color: '#06B6D4', label: '시장 이해' },
  '전략 설계': { color: '#8B5CF6', label: '전략 설계' },
  '고객 인사이트': { color: '#FF6FB5', label: '고객 인사이트' },
  '실행 설계': { color: '#78BE20', label: '실행 설계' },
};

const STAGES = [
  { name: 'Fact', label: 'Fact 수집', color: S.factStage },
  { name: 'Insight', label: 'Insight 해석', color: S.insightStage },
  { name: 'Decision', label: 'Decision 결정', color: S.decisionStage },
];

const TOTAL_PAGES = 18;

export default function TeamReportPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TeamReportData | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        let stored = await getStoredReport(teamId);
        if (!stored) {
          stored = await generateTeamReport(teamId);
        }
        setReport(stored);
        setLoading(false);
      } catch (e: any) {
        console.error('미리보기 로드 실패', e);
        setError(e?.message || '보고서를 불러올 수 없어요');
        setLoading(false);
      }
    })();
  }, [teamId]);

  const goToPage = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= TOTAL_PAGES) return;
    if (newIndex === pageIndex) return;
    setTransitioning(true);
    setTimeout(() => {
      setPageIndex(newIndex);
      // 모바일에서 페이지 변경 시 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setTransitioning(false), 50);
    }, 200);
  }, [pageIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToPage(pageIndex + 1);
      else if (e.key === 'ArrowLeft') goToPage(pageIndex - 1);
      else if (e.key === 'Escape') router.push(`/team/${teamId}/report`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pageIndex, goToPage, router, teamId]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) goToPage(pageIndex + 1);
      else goToPage(pageIndex - 1);
    }
    setTouchStart(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 rounded-full mb-4 preview-spinner"
            style={{ border: `2px solid ${S.gold}33`, borderTop: `2px solid ${S.gold}` }} />
          <p className="text-[12px] text-gray-500 font-mono tracking-widest">PREPARING BOOK...</p>
        </div>
        <style jsx>{`
          .preview-spinner { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: '#FF6F61' }}>ERROR</p>
          <h1 className="text-xl font-bold text-white mb-2">미리보기를 열 수 없어요</h1>
          <p className="text-[13px] text-gray-500 mb-6">{error || '데이터가 없습니다'}</p>
          <button onClick={() => router.push(`/team/${teamId}/report`)}
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold transition hover:scale-[1.02]"
            style={{ background: S.green, color: S.navy }}>
            보고서로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 md:p-6 relative overflow-hidden flex flex-col"
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.06) 0%, transparent 60%),
            radial-gradient(circle at 20% 30%, ${S.cyan}14 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${S.purple}14 0%, transparent 50%)
          `,
          zIndex: 0,
        }} />

      <div className="relative z-10 max-w-5xl mx-auto w-full flex-1 flex flex-col">

        {/* ⭐ 모바일 최적화: 헤더 패딩 조정 */}
        <div className="flex items-center justify-between mb-3 md:mb-5 px-1 md:px-0">
          <button onClick={() => router.push(`/team/${teamId}/report`)}
            className="text-[11px] md:text-[12px] text-gray-500 hover:text-gray-300 transition">
            ← 보고서로
          </button>
          <span className="font-mono font-bold tracking-[2px] md:tracking-[3px]"
            style={{ fontSize: '9px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
            ★ PREVIEW MODE ★
          </span>
          <span className="font-mono tracking-wider text-gray-500"
            style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
            {String(pageIndex + 1).padStart(2, '0')} / {TOTAL_PAGES}
          </span>
        </div>

        {/* ⭐ 모바일 최적화: min-h 줄임 (콘텐츠가 자연스럽게 늘어나게) */}
        <div className="flex-1 flex items-center justify-center mb-3 md:mb-4">
          <div className="w-full rounded-xl md:rounded-2xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))`,
              border: `0.5px solid rgba(255, 215, 0, 0.2)`,
              boxShadow: `0 0 60px rgba(255, 215, 0, 0.08), 0 8px 32px rgba(0,0,0,0.5)`,
              opacity: transitioning ? 0 : 1,
              transition: 'opacity 0.2s ease-out',
            }}>
            <PageContent pageIndex={pageIndex} report={report} />
          </div>
        </div>

        {/* 컨트롤 */}
        <div className="flex items-center justify-center gap-3 mb-2 md:mb-3">
          <button onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-110"
            style={{
              width: '40px', height: '40px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '18px',
            }}>
            ‹
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold"
              style={{ fontSize: '11px', color: S.gold, letterSpacing: '1.5px' }}>
              {String(pageIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-gray-700">/</span>
            <span className="font-mono text-gray-500"
              style={{ fontSize: '11px', letterSpacing: '1.5px' }}>
              {TOTAL_PAGES}
            </span>
          </div>

          <button onClick={() => goToPage(pageIndex + 1)}
            disabled={pageIndex === TOTAL_PAGES - 1}
            className="rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-110"
            style={{
              width: '40px', height: '40px',
              background: pageIndex === TOTAL_PAGES - 1
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${S.gold} 0%, ${S.green} 100%)`,
              border: pageIndex === TOTAL_PAGES - 1 ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
              color: pageIndex === TOTAL_PAGES - 1 ? 'rgba(255,255,255,0.6)' : S.navy,
              fontSize: '18px',
              fontWeight: 700,
              boxShadow: pageIndex === TOTAL_PAGES - 1 ? 'none' : `0 0 16px rgba(255, 215, 0, 0.4)`,
            }}>
            ›
          </button>
        </div>

        {/* ⭐ 모바일 최적화: 점 인디케이터 작게 */}
        <div className="flex gap-[3px] md:gap-1 justify-center flex-wrap max-w-[280px] md:max-w-md mx-auto mb-2 md:mb-3">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
            const isCurrent = i === pageIndex;
            const isCover = i === 0;
            const isOutro = i === TOTAL_PAGES - 1;
            return (
              <button key={i}
                onClick={() => goToPage(i)}
                aria-label={`페이지 ${i + 1}`}
                className="rounded-full transition-all hover:scale-150 w-[5px] h-[5px] md:w-[6px] md:h-[6px]"
                style={{
                  background: isCurrent
                    ? S.gold
                    : isCover || isOutro
                      ? 'rgba(255, 215, 0, 0.3)'
                      : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isCurrent ? `0 0 6px ${S.gold}` : 'none',
                  transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                }} />
            );
          })}
        </div>

        <p className="text-[8px] md:text-[9px] font-mono text-gray-700 text-center tracking-widest">
          ← → 키 또는 좌우 스와이프 · ESC 닫기
        </p>
      </div>
    </div>
  );
}

function PageContent({ pageIndex, report }: { pageIndex: number; report: TeamReportData }) {
  if (pageIndex === 0) return <CoverPage report={report} />;
  if (pageIndex === TOTAL_PAGES - 1) return <ConclusionPage report={report} />;
  const card = report.cards[pageIndex - 1];
  if (!card) return null;
  return <CardSpread card={card} pageIndex={pageIndex} />;
}

// ═══════════════════════════════════════════════════════
// 표지
// ═══════════════════════════════════════════════════════
function CoverPage({ report }: { report: TeamReportData }) {
  const { team } = report;
  const leader = team.members.find(m => m.isLeader);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={S.gold} />
      <CornerDecoration position="tr" color={S.gold} />
      <CornerDecoration position="bl" color={S.gold} />
      <CornerDecoration position="br" color={S.gold} />

      <div className="p-6 md:p-12 flex flex-col items-center justify-center text-center md:border-r"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <div className="inline-flex items-center gap-2 mb-3 md:mb-4">
          <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
          <span className="font-mono font-bold tracking-[5px] md:tracking-[6px]"
            style={{ fontSize: '9px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
            CONNECTAI
          </span>
          <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
        </div>

        <h1 className="font-black text-white mb-2 tracking-tight"
          style={{
            fontSize: 'clamp(48px, 12vw, 64px)',
            lineHeight: 1,
            textShadow: `0 0 24px ${S.gold}55, 0 0 48px ${S.green}33`,
            letterSpacing: '-2px',
          }}>
          SIGNAL
        </h1>

        <div className="flex items-center gap-2 mb-3">
          <div className="h-[1px] w-6 md:w-8" style={{ background: `linear-gradient(to right, transparent, ${S.gold})` }} />
          <p className="font-mono font-bold tracking-[2px]"
            style={{ fontSize: '10px', color: S.aqua, textShadow: `0 0 6px ${S.aqua}66` }}>
            DIGITAL TRADE CARDS
          </p>
          <div className="h-[1px] w-6 md:w-8" style={{ background: `linear-gradient(to left, transparent, ${S.gold})` }} />
        </div>

        <p className="text-[10px] md:text-[11px] text-gray-500 font-mono tracking-wider">
          TEAM REPORT · 2026
        </p>
      </div>

      {/* ⭐ 모바일 좌우 구분선 */}
      <MobileSeparator color={S.gold} />

      <div className="p-6 md:p-12 flex flex-col justify-center">
        <p className="font-mono font-bold tracking-[3px] mb-2 md:mb-3"
          style={{ fontSize: '10px', color: S.gold }}>
          ★ TEAM PROFILE ★
        </p>

        <h2 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">
          {team.teamName}
        </h2>

        <p className="text-[13px] md:text-[14px] mb-4 md:mb-6" style={{ color: S.aqua }}>
          {team.item}
        </p>

        <div className="space-y-2 mb-4 md:mb-6">
          <Row label="LEVEL" value={team.level} color={S.green} />
          <Row label="LEADER" value={leader?.name || '미지정'} color={S.gold} />
          <Row label="MEMBERS" value={`${team.members.length}명`} color={S.aqua} />
        </div>

        <div className="pt-3 md:pt-4 border-t" style={{ borderColor: 'rgba(255, 215, 0, 0.1)' }}>
          <p className="font-mono text-gray-600 mb-2"
            style={{ fontSize: '9px', letterSpacing: '2px' }}>
            TEAM ROSTER
          </p>
          <div className="space-y-1">
            {team.members.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                <span style={{ color: m.isLeader ? S.gold : 'rgba(255,255,255,0.6)' }}>
                  {m.isLeader ? '👑' : '·'}
                </span>
                <span className="text-white">{m.name}</span>
                <span className="text-gray-500 text-[10px]">{m.roleCode}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 카드 펼침면
// ═══════════════════════════════════════════════════════
function CardSpread({ card, pageIndex }: { card: ReportCard; pageIndex: number }) {
  const cardColor = CARD_COLORS[card.cardId]?.bg || S.cyan;
  const topic = TOPICS.find(t => t.id === card.cardId);
  const categoryInfo = topic ? CATEGORY_STYLES[topic.category] : null;
  const difficulty = topic?.difficulty || 0;

  const participants = Array.from(
    new Set(card.memberInsights?.map(mi => mi.memberName) || [])
  );

  const leftQuestions = card.questions.slice(0, 2);
  const rightQuestion = card.questions[2];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={`${cardColor}99`} />
      <CornerDecoration position="tr" color={`${cardColor}99`} />
      <CornerDecoration position="bl" color={`${cardColor}99`} />
      <CornerDecoration position="br" color={`${cardColor}99`} />

      {/* 좌측 페이지 */}
      <div className="p-5 md:p-7 relative md:border-r"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>

        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <CardSignature cardId={card.cardId} color={cardColor} />
            <div className="min-w-0">
              <span className="font-mono text-gray-500 tracking-wider"
                style={{ fontSize: '9px', letterSpacing: '1.5px' }}>
                CARD {card.cardId}
              </span>
              {categoryInfo && (
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full font-bold"
                    style={{
                      fontSize: '9px',
                      background: `${categoryInfo.color}15`,
                      color: categoryInfo.color,
                      border: `0.5px solid ${categoryInfo.color}40`,
                    }}>
                    {categoryInfo.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DifficultyStars level={difficulty} color={S.gold} />
        </div>

        <div className="mb-4 md:mb-5">
          <h2 className="font-bold text-white mb-1"
            style={{ fontSize: '18px', lineHeight: 1.25 }}>
            {card.titleKo}
          </h2>
          <p className="text-[11px] italic" style={{ color: 'rgba(193, 232, 235, 0.6)' }}>
            {card.titleEn}
          </p>
        </div>

        <div className="space-y-3">
          {leftQuestions.map((q, idx) => (
            <div key={q.id}>
              <QuestionBlock qNum={idx + 1} q={q} cardColor={cardColor} />
              {idx < leftQuestions.length - 1 && (
                <div className="my-3 flex items-center gap-2">
                  <div className="flex-1 h-[1px]"
                    style={{ background: `linear-gradient(to right, transparent, ${cardColor}33, transparent)` }} />
                  <div className="w-1 h-1 rounded-full"
                    style={{ background: `${cardColor}66` }} />
                  <div className="flex-1 h-[1px]"
                    style={{ background: `linear-gradient(to left, transparent, ${cardColor}33, transparent)` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 좌측 페이지 번호 (PC만) */}
        <div className="absolute bottom-3 left-7 font-mono hidden md:block"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')} · LEFT
        </div>
      </div>

      {/* ⭐ 모바일 좌/우 구분선 */}
      <MobileSeparator color={cardColor} label="CONTINUED ↓" />

      {/* 우측 페이지 */}
      <div className="p-5 md:p-7 relative">
        {/* CONTINUED 라벨 (PC만) */}
        <div className="absolute top-4 right-7 font-mono text-gray-600 hidden md:block"
          style={{ fontSize: '9px', letterSpacing: '1.5px' }}>
          CONTINUED →
        </div>

        <div className="mb-5 md:mt-9">
          {rightQuestion && (
            <QuestionBlock qNum={3} q={rightQuestion} cardColor={cardColor} />
          )}
        </div>

        <div className="mb-5 flex items-center gap-2">
          <div className="flex-1 h-[1px]"
            style={{ background: `linear-gradient(to right, transparent, ${S.gold}40, transparent)` }} />
          <span className="font-mono font-bold"
            style={{ fontSize: '8px', color: S.gold, letterSpacing: '2px' }}>
            ★
          </span>
          <div className="flex-1 h-[1px]"
            style={{ background: `linear-gradient(to left, transparent, ${S.gold}40, transparent)` }} />
        </div>

        {card.oneSentenceStrategy && (
          <div className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, rgba(255, 215, 0, 0.06), rgba(231, 254, 85, 0.04))`,
              border: `0.5px solid rgba(255, 215, 0, 0.3)`,
            }}>
            <div className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: `linear-gradient(to right, transparent, ${S.gold}99, transparent)` }} />

            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '12px' }}>★</span>
              <span className="font-mono font-bold"
                style={{ fontSize: '9px', letterSpacing: '2px', color: S.gold }}>
                ONE SENTENCE STRATEGY
              </span>
            </div>
            <p className="text-white leading-relaxed font-medium"
              style={{ fontSize: '13px' }}>
              {card.oneSentenceStrategy}
            </p>
          </div>
        )}

        {participants.length > 0 && (
          <div className="mt-4 md:mt-5 pt-3"
            style={{ borderTop: `0.5px dashed rgba(255, 255, 255, 0.08)` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1 h-1 rounded-full"
                style={{ background: S.aqua, boxShadow: `0 0 4px ${S.aqua}` }} />
              <span className="font-mono"
                style={{
                  fontSize: '8px',
                  color: 'rgba(193, 232, 235, 0.7)',
                  letterSpacing: '2px',
                }}>
                CONTRIBUTORS
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {participants.map((name, i) => (
                <span key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    fontSize: '10px',
                    background: 'rgba(193, 232, 235, 0.06)',
                    border: '0.5px solid rgba(193, 232, 235, 0.2)',
                    color: 'rgba(255, 255, 255, 0.85)',
                  }}>
                  · {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 페이지 번호 */}
        <div className="mt-4 md:mt-0 md:absolute md:bottom-3 md:right-7 font-mono text-center md:text-left"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')}
          <span className="hidden md:inline"> · RIGHT</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 마무리
// ═══════════════════════════════════════════════════════
function ConclusionPage({ report }: { report: TeamReportData }) {
  const { team, cards, totalAnswers } = report;
  const filledStrategies = cards.filter(c => c.oneSentenceStrategy).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={S.gold} />
      <CornerDecoration position="tr" color={S.gold} />
      <CornerDecoration position="bl" color={S.gold} />
      <CornerDecoration position="br" color={S.gold} />

      <div className="p-6 md:p-10 md:border-r"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <p className="font-mono font-bold tracking-[3px] mb-3"
          style={{ fontSize: '10px', color: S.gold }}>
          ★ FINAL SUMMARY ★
        </p>

        <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">
          전략 완성
        </h2>
        <p className="text-[12px] text-gray-500 mb-5 md:mb-6">
          16개 카드를 통해 디지털 무역 전략을 완성했습니다.
        </p>

        <div className="space-y-3">
          <SummaryStat label="완성된 카드" value={`${filledStrategies} / 16`} color={S.green} />
          <SummaryStat label="작성한 답변" value={`${totalAnswers}개`} color={S.aqua} />
          <SummaryStat label="참여 팀원" value={`${team.members.length}명`} color={S.gold} />
        </div>
      </div>

      {/* ⭐ 모바일 구분선 */}
      <MobileSeparator color={S.gold} />

      <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center">
        <div className="mb-4 md:mb-6">
          <div className="inline-block relative">
            <div className="absolute pointer-events-none"
              style={{
                inset: '-16px',
                background: `radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent 70%)`,
                borderRadius: '50%',
                filter: 'blur(8px)',
              }} />
            <svg width="48" height="48" viewBox="0 0 24 24" fill={S.gold} stroke={S.gold} strokeWidth="0.5"
              style={{ filter: `drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))`, position: 'relative' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        <p className="text-[14px] text-white mb-2 font-medium leading-relaxed">
          {team.teamName} 모두 수고하셨습니다.
        </p>
        <p className="text-[12px] text-gray-500 mb-6 md:mb-8 leading-relaxed">
          이 전략을 실제 비즈니스에<br />
          어떻게 적용할지 토론해보세요.
        </p>

        <div className="pt-3 md:pt-4 border-t w-full"
          style={{ borderColor: 'rgba(255, 215, 0, 0.1)' }}>
          <p className="font-mono text-gray-600"
            style={{ fontSize: '9px', letterSpacing: '2px', marginBottom: '2px' }}>
            REPORT GENERATED
          </p>
          <p className="font-mono text-gray-700"
            style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
            {new Date(report.generatedAt).toLocaleDateString('ko-KR')}
          </p>
        </div>

        <p className="text-[10px] font-mono text-gray-700 mt-4 md:mt-6 tracking-widest">
          © 2026 SIGNAL · ConnectAI
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 서브 컴포넌트들
// ═══════════════════════════════════════════════════════

// ⭐ 모바일 전용 좌/우 구분선
function MobileSeparator({ color, label = '' }: { color: string; label?: string }) {
  return (
    <div className="md:hidden flex items-center gap-2 px-5 py-2.5"
      style={{
        borderTop: `0.5px solid ${color}25`,
        borderBottom: `0.5px solid ${color}25`,
        background: `${color}06`,
      }}>
      <div className="flex-1 h-[1px]"
        style={{ background: `linear-gradient(to right, transparent, ${color}30, transparent)` }} />
      {label && (
        <span className="font-mono font-bold"
          style={{ fontSize: '8px', color: `${color}AA`, letterSpacing: '2px' }}>
          {label}
        </span>
      )}
      <div className="flex-1 h-[1px]"
        style={{ background: `linear-gradient(to left, transparent, ${color}30, transparent)` }} />
    </div>
  );
}

function CornerDecoration({
  position,
  color = '#FFD70060',
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
  color?: string;
}) {
  const isTop = position.startsWith('t');
  const isLeft = position.endsWith('l');
  const horizontalStyle: React.CSSProperties = {
    position: 'absolute',
    [isTop ? 'top' : 'bottom']: 0,
    [isLeft ? 'left' : 'right']: 0,
    width: '10px',
    height: '1.5px',
    background: color,
    boxShadow: `0 0 4px ${color}`,
  };
  const verticalStyle: React.CSSProperties = {
    position: 'absolute',
    [isTop ? 'top' : 'bottom']: 0,
    [isLeft ? 'left' : 'right']: 0,
    width: '1.5px',
    height: '10px',
    background: color,
    boxShadow: `0 0 4px ${color}`,
  };
  return (
    <div className="absolute pointer-events-none z-10"
      style={{
        [isTop ? 'top' : 'bottom']: '8px',
        [isLeft ? 'left' : 'right']: '8px',
        width: '14px',
        height: '14px',
      }}>
      <div style={horizontalStyle} />
      <div style={verticalStyle} />
    </div>
  );
}

function CardSignature({ cardId, color }: { cardId: string; color: string }) {
  const isLight = color === '#FFC72C' || color === '#E7FE55';
  return (
    <div className="rounded-lg flex items-center justify-center font-black flex-shrink-0"
      style={{
        width: '38px',
        height: '38px',
        background: color,
        color: isLight ? '#111' : '#fff',
        fontSize: '13px',
        fontFamily: 'monospace',
        boxShadow: `0 0 12px ${color}55, 0 4px 12px rgba(0,0,0,0.3)`,
      }}>
      {cardId}
    </div>
  );
}

function DifficultyStars({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          fontSize: '10px',
          color: i <= level ? color : 'rgba(255,255,255,0.15)',
          textShadow: i <= level ? `0 0 4px ${color}66` : 'none',
        }}>
          ★
        </span>
      ))}
    </div>
  );
}

function StageIcon({ stage, color }: { stage: number; color: string }) {
  const icons = [
    <g key="fact">
      <circle cx="11" cy="11" r="6" stroke={color} strokeWidth="1.8" fill="none" />
      <path d="M20 20l-4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </g>,
    <g key="insight">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1V16a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z"
        stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </g>,
    <g key="decision">
      <path d="M5 13l4 4L19 7" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>,
  ];

  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
      style={{ filter: `drop-shadow(0 0 3px ${color}66)` }}>
      {icons[stage - 1]}
    </svg>
  );
}

function QuestionBlock({
  qNum, q, cardColor
}: {
  qNum: number;
  q: { id: string; title: string; answer: string; interimBlanks: string[] };
  cardColor: string;
}) {
  const stage = STAGES[qNum - 1];
  const interimText = q.interimBlanks?.filter(b => b).join(' · ') || '';

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-mono font-bold rounded inline-flex items-center gap-1"
          style={{
            fontSize: '9px',
            padding: '2px 6px',
            background: `${stage.color}22`,
            color: stage.color,
            letterSpacing: '1px',
            border: `0.5px solid ${stage.color}40`,
          }}>
          <StageIcon stage={qNum} color={stage.color} />
          STAGE {qNum}
        </span>
        <span className="font-mono"
          style={{
            fontSize: '9px',
            color: stage.color,
            opacity: 0.7,
            letterSpacing: '1px',
          }}>
          {stage.label}
        </span>
      </div>

      {q.answer ? (
        <p className="leading-relaxed mb-2"
          style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
          {q.answer.length > 100 ? q.answer.slice(0, 100) + '...' : q.answer}
        </p>
      ) : (
        <p className="text-gray-700 italic"
          style={{ fontSize: '11px' }}>
          미작성
        </p>
      )}

      {interimText && (
        <p className="rounded-r-md"
          style={{
            fontSize: '11px',
            color: stage.color,
            opacity: 0.95,
            padding: '6px 10px',
            background: `linear-gradient(to right, ${stage.color}1A, ${stage.color}05)`,
            borderLeft: `2px solid ${stage.color}`,
            margin: 0,
          }}>
          → {interimText}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="font-mono font-bold"
        style={{
          fontSize: '9px',
          letterSpacing: '2px',
          color: color,
          width: '70px',
          flexShrink: 0,
        }}>
        {label}
      </span>
      <span className="text-[13px] text-white">{value}</span>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between"
      style={{
        background: `${color}08`,
        border: `0.5px solid ${color}30`,
      }}>
      <div>
        <p className="font-mono font-bold tracking-widest mb-0.5"
          style={{ fontSize: '9px', color: color, letterSpacing: '1.5px' }}>
          {label.split('').join(' ').toUpperCase()}
        </p>
        <p className="text-[11px] text-gray-300">{label}</p>
      </div>
      <p className="font-bold"
        style={{
          fontSize: '20px',
          color: color,
          textShadow: `0 0 12px ${color}80`,
        }}>
        {value}
      </p>
    </div>
  );
}
