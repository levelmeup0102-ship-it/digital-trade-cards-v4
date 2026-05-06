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
  factStage: '#06B6D4',     // Q1 Fact
  insightStage: '#FFA500',  // Q2 Insight
  decisionStage: '#78BE20', // Q3 Decision
};

// 카테고리별 색상
const CATEGORY_STYLES: Record<string, { color: string; label: string }> = {
  '시장 이해': { color: '#06B6D4', label: '시장 이해' },
  '전략 설계': { color: '#8B5CF6', label: '전략 설계' },
  '고객 인사이트': { color: '#FF6FB5', label: '고객 인사이트' },
  '실행 설계': { color: '#78BE20', label: '실행 설계' },
};

// Stage별 정보
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
    <div className="min-h-screen p-3 md:p-6 relative overflow-hidden flex flex-col"
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

        <div className="flex items-center justify-between mb-5">
          <button onClick={() => router.push(`/team/${teamId}/report`)}
            className="text-[12px] text-gray-500 hover:text-gray-300 transition">
            ← 보고서로
          </button>
          <span className="font-mono font-bold tracking-[3px]"
            style={{ fontSize: '10px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
            ★ PREVIEW MODE ★
          </span>
          <span className="font-mono tracking-wider text-gray-500"
            style={{ fontSize: '11px', letterSpacing: '2px' }}>
            {String(pageIndex + 1).padStart(2, '0')} / {TOTAL_PAGES}
          </span>
        </div>

        {/* 책 펼침면 */}
        <div className="flex-1 flex items-center justify-center min-h-[480px] md:min-h-[560px] mb-4">
          <div className="w-full rounded-2xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))`,
              border: `0.5px solid rgba(255, 215, 0, 0.2)`,
              boxShadow: `0 0 60px rgba(255, 215, 0, 0.08), 0 8px 32px rgba(0,0,0,0.5)`,
              minHeight: '480px',
              opacity: transitioning ? 0 : 1,
              transition: 'opacity 0.2s ease-out',
            }}>
            <PageContent pageIndex={pageIndex} report={report} />
          </div>
        </div>

        {/* 컨트롤 */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0}
            className="rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-110"
            style={{
              width: '44px', height: '44px',
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
              width: '44px', height: '44px',
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

        {/* 점 인디케이터 */}
        <div className="flex gap-1 justify-center flex-wrap max-w-md mx-auto mb-3">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
            const isCurrent = i === pageIndex;
            const isCover = i === 0;
            const isOutro = i === TOTAL_PAGES - 1;
            return (
              <button key={i}
                onClick={() => goToPage(i)}
                aria-label={`페이지 ${i + 1}`}
                className="rounded-full transition-all hover:scale-150"
                style={{
                  width: '6px',
                  height: '6px',
                  background: isCurrent
                    ? S.gold
                    : isCover || isOutro
                      ? 'rgba(255, 215, 0, 0.3)'
                      : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isCurrent ? `0 0 6px ${S.gold}` : 'none',
                  transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
                  cursor: 'pointer',
                  border: 'none',
                }} />
            );
          })}
        </div>

        <p className="text-[9px] font-mono text-gray-700 text-center tracking-widest">
          ← → 키 또는 좌우 스와이프 · ESC 닫기
        </p>
      </div>
    </div>
  );
}

// ─── 페이지 콘텐츠 라우터 ───
function PageContent({ pageIndex, report }: { pageIndex: number; report: TeamReportData }) {
  if (pageIndex === 0) return <CoverPage report={report} />;
  if (pageIndex === TOTAL_PAGES - 1) return <ConclusionPage report={report} />;
  const card = report.cards[pageIndex - 1];
  if (!card) return null;
  return <CardSpread card={card} pageIndex={pageIndex} />;
}

// ═══════════════════════════════════════════════════════
// 표지 (페이지 1)
// ═══════════════════════════════════════════════════════
function CoverPage({ report }: { report: TeamReportData }) {
  const { team } = report;
  const leader = team.members.find(m => m.isLeader);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[480px] relative">
      <CornerDecoration position="tl" color={S.gold} />
      <CornerDecoration position="tr" color={S.gold} />
      <CornerDecoration position="bl" color={S.gold} />
      <CornerDecoration position="br" color={S.gold} />

      <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center md:border-r"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
          <span className="font-mono font-bold tracking-[6px]"
            style={{ fontSize: '10px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
            CONNECTAI
          </span>
          <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
        </div>

        <h1 className="font-black text-white mb-2 tracking-tight"
          style={{
            fontSize: '64px',
            lineHeight: 1,
            textShadow: `0 0 24px ${S.gold}55, 0 0 48px ${S.green}33`,
            letterSpacing: '-2px',
          }}>
          SIGNAL
        </h1>

        <div className="flex items-center gap-2 mb-3">
          <div className="h-[1px] w-8" style={{ background: `linear-gradient(to right, transparent, ${S.gold})` }} />
          <p className="font-mono font-bold tracking-[2px]"
            style={{ fontSize: '11px', color: S.aqua, textShadow: `0 0 6px ${S.aqua}66` }}>
            DIGITAL TRADE CARDS
          </p>
          <div className="h-[1px] w-8" style={{ background: `linear-gradient(to left, transparent, ${S.gold})` }} />
        </div>

        <p className="text-[11px] text-gray-500 font-mono tracking-wider">
          TEAM REPORT · 2026
        </p>
      </div>

      <div className="p-8 md:p-12 flex flex-col justify-center">
        <p className="font-mono font-bold tracking-[3px] mb-3"
          style={{ fontSize: '10px', color: S.gold }}>
          ★ TEAM PROFILE ★
        </p>

        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
          {team.teamName}
        </h2>

        <p className="text-[14px] mb-6" style={{ color: S.aqua }}>
          {team.item}
        </p>

        <div className="space-y-2 mb-6">
          <Row label="LEVEL" value={team.level} color={S.green} />
          <Row label="LEADER" value={leader?.name || '미지정'} color={S.gold} />
          <Row label="MEMBERS" value={`${team.members.length}명`} color={S.aqua} />
        </div>

        <div className="pt-4 border-t" style={{ borderColor: 'rgba(255, 215, 0, 0.1)' }}>
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
// 카드 펼침면 (페이지 2~17) ⭐ 디테일 9가지 추가
// ═══════════════════════════════════════════════════════
function CardSpread({ card, pageIndex }: { card: ReportCard; pageIndex: number }) {
  const cardColor = CARD_COLORS[card.cardId]?.bg || S.cyan;
  const isLight = cardColor === '#FFC72C' || cardColor === S.green;

  // ⭐ TOPICS에서 카테고리 + 난이도 정보 lookup
  const topic = TOPICS.find(t => t.id === card.cardId);
  const categoryInfo = topic ? CATEGORY_STYLES[topic.category] : null;
  const difficulty = topic?.difficulty || 0;

  // ⭐ 참여한 팀원 (memberInsights에서 unique 추출)
  const participants = Array.from(
    new Set(card.memberInsights?.map(mi => mi.memberName) || [])
  );

  const leftQuestions = card.questions.slice(0, 2);
  const rightQuestion = card.questions[2];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[480px] relative">
      {/* ⭐ 8. 페이지 모서리 ㄱ자 장식 4개 */}
      <CornerDecoration position="tl" color={`${cardColor}99`} />
      <CornerDecoration position="tr" color={`${cardColor}99`} />
      <CornerDecoration position="bl" color={`${cardColor}99`} />
      <CornerDecoration position="br" color={`${cardColor}99`} />

      {/* 좌측 페이지 */}
      <div className="p-6 md:p-7 relative md:border-r"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>

        {/* ⭐ 헤더: 카드번호 + 카테고리 배지 + 난이도 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {/* ⭐ 3. 미니 그리드 시그니처 (4x4 패턴) */}
            <MiniGrid cardId={card.cardId} color={cardColor} />

            <div>
              <span className="font-mono text-gray-500 tracking-wider"
                style={{ fontSize: '9px', letterSpacing: '1.5px' }}>
                CARD {card.cardId}
              </span>
              {/* ⭐ 1. 카테고리 라벨 */}
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

          {/* ⭐ 2. 난이도 별 표시 */}
          <DifficultyStars level={difficulty} color={S.gold} />
        </div>

        {/* 카드 제목 */}
        <div className="mb-5">
          <h2 className="font-bold text-white mb-1"
            style={{ fontSize: '20px', lineHeight: 1.2 }}>
            {card.titleKo}
          </h2>
          <p className="text-[11px] italic" style={{ color: 'rgba(193, 232, 235, 0.6)' }}>
            {card.titleEn}
          </p>
        </div>

        {/* Q1, Q2 */}
        <div className="space-y-3">
          {leftQuestions.map((q, idx) => (
            <div key={q.id}>
              <QuestionBlock qNum={idx + 1} q={q} cardColor={cardColor} />
              {/* ⭐ 4. Q 사이 우아한 구분선 */}
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

        {/* 페이지 번호 */}
        <div className="absolute bottom-3 left-7 font-mono"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')} · LEFT
        </div>
      </div>

      {/* 우측 페이지 */}
      <div className="p-6 md:p-7 relative">
        <div className="absolute top-4 right-7 font-mono text-gray-600"
          style={{ fontSize: '9px', letterSpacing: '1.5px' }}>
          CONTINUED →
        </div>

        {/* Q3 */}
        <div className="mb-5 mt-9">
          {rightQuestion && (
            <QuestionBlock qNum={3} q={rightQuestion} cardColor={cardColor} />
          )}
        </div>

        {/* ⭐ 4. 우아한 구분선 */}
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

        {/* 한 문장 전략 */}
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

        {/* ⭐ 7. 참여한 팀원 표시 */}
        {participants.length > 0 && (
          <div className="mt-5 pt-3"
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

        <div className="absolute bottom-3 right-7 font-mono"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')} · RIGHT
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 마무리 (페이지 18)
// ═══════════════════════════════════════════════════════
function ConclusionPage({ report }: { report: TeamReportData }) {
  const { team, cards, totalAnswers } = report;
  const filledStrategies = cards.filter(c => c.oneSentenceStrategy).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[480px] relative">
      <CornerDecoration position="tl" color={S.gold} />
      <CornerDecoration position="tr" color={S.gold} />
      <CornerDecoration position="bl" color={S.gold} />
      <CornerDecoration position="br" color={S.gold} />

      <div className="p-8 md:p-10 md:border-r"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <p className="font-mono font-bold tracking-[3px] mb-3"
          style={{ fontSize: '10px', color: S.gold }}>
          ★ FINAL SUMMARY ★
        </p>

        <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
          전략 완성
        </h2>
        <p className="text-[12px] text-gray-500 mb-6">
          16개 카드를 통해 디지털 무역 전략을 완성했습니다.
        </p>

        <div className="space-y-3">
          <SummaryStat label="완성된 카드" value={`${filledStrategies} / 16`} color={S.green} />
          <SummaryStat label="작성한 답변" value={`${totalAnswers}개`} color={S.aqua} />
          <SummaryStat label="참여 팀원" value={`${team.members.length}명`} color={S.gold} />
        </div>
      </div>

      <div className="p-8 md:p-10 flex flex-col items-center justify-center text-center">
        <div className="mb-6">
          <div className="inline-block relative">
            <div className="absolute pointer-events-none"
              style={{
                inset: '-16px',
                background: `radial-gradient(circle, rgba(255, 215, 0, 0.3), transparent 70%)`,
                borderRadius: '50%',
                filter: 'blur(8px)',
              }} />
            <svg width="56" height="56" viewBox="0 0 24 24" fill={S.gold} stroke={S.gold} strokeWidth="0.5"
              style={{ filter: `drop-shadow(0 0 8px rgba(255, 215, 0, 0.6))`, position: 'relative' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
        </div>

        <p className="text-[14px] text-white mb-2 font-medium leading-relaxed">
          {team.teamName} 모두 수고하셨습니다.
        </p>
        <p className="text-[12px] text-gray-500 mb-8 leading-relaxed">
          이 전략을 실제 비즈니스에<br />
          어떻게 적용할지 토론해보세요.
        </p>

        <div className="pt-4 border-t w-full"
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

        <p className="text-[10px] font-mono text-gray-700 mt-6 tracking-widest">
          © 2026 SIGNAL · ConnectAI
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 서브 컴포넌트들
// ═══════════════════════════════════════════════════════

// ⭐ 8. 페이지 모서리 ㄱ자 장식
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
    <div className="absolute pointer-events-none"
      style={{
        [isTop ? 'top' : 'bottom']: '10px',
        [isLeft ? 'left' : 'right']: '10px',
        width: '14px',
        height: '14px',
      }}>
      <div style={horizontalStyle} />
      <div style={verticalStyle} />
    </div>
  );
}

// ⭐ 3. 미니 4x4 그리드 시그니처 (PDF 카드와 동일한 디자인)
function MiniGrid({ cardId, color }: { cardId: string; color: string }) {
  const isLight = color === '#FFC72C' || color === '#E7FE55';
  return (
    <div className="grid grid-cols-4"
      style={{ width: '40px', height: '40px', gap: '2px' }}>
      <div className="rounded-full flex items-center justify-center font-black"
        style={{
          background: color,
          color: isLight ? '#111' : '#fff',
          fontSize: '7px',
          fontFamily: 'monospace',
          boxShadow: `0 0 6px ${color}88`,
        }}>
        {cardId}
      </div>
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} style={{
          background: color,
          opacity: 0.7,
          borderRadius: '1px',
        }} />
      ))}
    </div>
  );
}

// ⭐ 2. 난이도 별 표시
function DifficultyStars({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{
          fontSize: '11px',
          color: i <= level ? color : 'rgba(255,255,255,0.15)',
          textShadow: i <= level ? `0 0 4px ${color}66` : 'none',
        }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ⭐ 6. Stage 아이콘 (Fact/Insight/Decision)
function StageIcon({ stage, color }: { stage: number; color: string }) {
  // Q1: 돋보기, Q2: 전구, Q3: 체크
  const icons = [
    // Fact (돋보기)
    <g key="fact">
      <circle cx="11" cy="11" r="6" stroke={color} strokeWidth="1.8" fill="none" />
      <path d="M20 20l-4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </g>,
    // Insight (전구)
    <g key="insight">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1V16a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z"
        stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    </g>,
    // Decision (체크)
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

// 질문 블록 (Stage별 색깔 그라디언트 적용)
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
      {/* ⭐ 5. STAGE 라벨 + ⭐ 6. Stage 아이콘 */}
      <div className="flex items-center gap-2 mb-2">
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

      {/* ⭐ 9. Stage별 색깔 그라디언트 (중간 결론) */}
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
