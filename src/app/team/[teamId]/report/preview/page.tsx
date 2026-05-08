'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CARD_COLORS, TOPICS } from '@/data/cardData';
import { generateTeamReport, getStoredReport } from '@/lib/reportGenerator';
import type { TeamReportData, ReportCard } from '@/types/report';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  gold: '#FFD700',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  pink: '#FF6FB5',
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

interface PolishedCard {
  cardId: string;
  titleKo: string;
  intro: string;
  narrative: string;
  strategy: string;
  bridge: string;
}

interface PolishedData {
  executiveSummary: string;
  cards: Record<string, PolishedCard>;
  conclusion: string;
}

export default function TeamReportPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TeamReportData | null>(null);
  const [polished, setPolished] = useState<PolishedData | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  // ⭐ v2: PDF 다운로드 상태
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        let stored = await getStoredReport(teamId);
        if (!stored) {
          stored = await generateTeamReport(teamId);
        }
        setReport(stored);

        const { data: dbReport } = await supabase
          .from('team_reports')
          .select('ai_polished')
          .eq('team_id', teamId)
          .single();

        if (dbReport?.ai_polished) {
          try {
            const parsed = JSON.parse(dbReport.ai_polished);
            if (parsed && typeof parsed === 'object' && parsed.cards) {
              setPolished(parsed);
            }
          } catch (e) {
            console.warn('다듬은 데이터 파싱 실패 - 학생 답변으로 표시', e);
          }
        }

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setTransitioning(false), 50);
    }, 200);
  }, [pageIndex]);

  // ⭐ v2: PDF 다운로드 함수
  async function handlePdfDownload() {
    if (isPdfGenerating || !report) return;
    
    const ok = confirm(
      '📄 PDF 다운로드를 시작합니다.\n\n' +
      '• 18페이지 책을 PDF로 변환합니다\n' +
      '• 약 30초~1분 소요됩니다\n' +
      '• 진행 중 화면이 자동으로 넘어갑니다\n\n' +
      '계속하시겠어요?'
    );
    if (!ok) return;

    setIsPdfGenerating(true);
    setPdfProgress(0);

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // 폰트 완전 로딩 대기
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }

      // A4 가로 (책 펼침면 형식)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();   // 297mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 210mm

      for (let i = 0; i < TOTAL_PAGES; i++) {
        // 페이지 이동
        setPageIndex(i);
        setTransitioning(false); // PDF 모드에서는 transitioning 끄기

        // React 렌더링 + 이미지 로딩 대기
        await new Promise(r => setTimeout(r, 600));

        const element = document.getElementById('book-page-content');
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 2, // 고해상도
          backgroundColor: '#050505',
          useCORS: true,
          logging: false,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');

        // 이미지를 PDF 페이지에 fit (비율 유지)
        const canvasRatio = canvas.width / canvas.height;
        const pdfRatio = pdfWidth / pdfHeight;

        let renderWidth, renderHeight;
        if (canvasRatio > pdfRatio) {
          // 가로가 더 넓음 → 가로 기준
          renderWidth = pdfWidth - 10;
          renderHeight = renderWidth / canvasRatio;
        } else {
          // 세로가 더 김 → 세로 기준
          renderHeight = pdfHeight - 10;
          renderWidth = renderHeight * canvasRatio;
        }

        const x = (pdfWidth - renderWidth) / 2;
        const y = (pdfHeight - renderHeight) / 2;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');

        setPdfProgress(Math.round(((i + 1) / TOTAL_PAGES) * 100));
      }

      const teamName = report.team.teamName || 'team';
      const date = new Date().toISOString().slice(0, 10);
      const safeName = teamName.replace(/[^\w가-힣]/g, '_');
      pdf.save(`SIGNAL_${safeName}_${date}.pdf`);
    } catch (err: any) {
      console.error('PDF 생성 실패:', err);
      alert('❌ PDF 생성 실패\n' + (err?.message || '알 수 없는 오류'));
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress(0);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isPdfGenerating) return; // PDF 생성 중에는 키보드 무시
      if (e.key === 'ArrowRight') goToPage(pageIndex + 1);
      else if (e.key === 'ArrowLeft') goToPage(pageIndex - 1);
      else if (e.key === 'Escape') router.push(`/team/${teamId}/report`);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pageIndex, goToPage, router, teamId, isPdfGenerating]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (isPdfGenerating) return;
    setTouchStart(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (isPdfGenerating || touchStart === null) return;
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

      {/* ⭐ v2: PDF 생성 진행 모달 */}
      {isPdfGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.92)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-6 max-w-sm w-full text-center"
            style={{
              background: `linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(10, 10, 20, 0.98))`,
              border: `0.5px solid ${S.gold}50`,
              boxShadow: `0 0 60px rgba(255, 215, 0, 0.2)`,
            }}>
            <div className="inline-block w-10 h-10 rounded-full mb-4 pdf-spinner"
              style={{ border: `2.5px solid ${S.gold}33`, borderTop: `2.5px solid ${S.gold}` }} />
            <p className="text-[14px] font-bold text-white mb-2">📄 PDF 생성 중</p>
            <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
              {pageIndex + 1} / {TOTAL_PAGES} 페이지 처리 중<br />
              잠시만 기다려주세요...
            </p>
            <div className="h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pdfProgress}%`,
                  background: `linear-gradient(to right, ${S.gold}, ${S.green})`,
                  boxShadow: `0 0 8px ${S.gold}80`,
                }} />
            </div>
            <p className="text-[10px] font-mono text-gray-500 mt-3 tracking-wider">
              {pdfProgress}%
            </p>
          </div>
          <style jsx>{`
            .pdf-spinner { animation: spin 0.8s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto w-full flex-1 flex flex-col">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3 md:mb-5 px-1 md:px-0 gap-2">
          <button onClick={() => router.push(`/team/${teamId}/report`)}
            className="text-[11px] md:text-[12px] text-gray-500 hover:text-gray-300 transition flex-shrink-0">
            ← 보고서로
          </button>

          <div className="flex items-center gap-1.5 md:gap-2 flex-1 justify-center min-w-0">
            <span className="font-mono font-bold tracking-[1.5px] md:tracking-[3px] truncate"
              style={{ fontSize: '9px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
              ★ PREVIEW ★
            </span>
            {polished && (
              <span className="font-mono font-bold tracking-[1.5px] px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  fontSize: '8px',
                  background: `${S.pink}20`,
                  color: S.pink,
                  border: `0.5px solid ${S.pink}50`,
                  boxShadow: `0 0 6px ${S.pink}44`,
                }}>
                📝 POLISHED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* ⭐ v2: PDF 다운로드 버튼 */}
            <button
              onClick={handlePdfDownload}
              disabled={isPdfGenerating}
              className="rounded-lg flex items-center gap-1 transition-all hover:scale-105 disabled:opacity-50"
              style={{
                fontSize: '10px',
                padding: '5px 10px',
                background: `linear-gradient(135deg, ${S.gold}, ${S.green})`,
                color: S.navy,
                fontWeight: 700,
                boxShadow: `0 0 12px ${S.gold}40`,
              }}>
              ⬇ PDF
            </button>

            <span className="font-mono tracking-wider text-gray-500 hidden md:inline"
              style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
              {String(pageIndex + 1).padStart(2, '0')} / {TOTAL_PAGES}
            </span>
          </div>
        </div>

        {/* 책 콘텐츠 */}
        <div className="flex-1 flex items-center justify-center mb-3 md:mb-4">
          <div id="book-page-content" className="w-full rounded-xl md:rounded-2xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))`,
              border: `0.5px solid rgba(255, 215, 0, 0.2)`,
              boxShadow: `0 0 60px rgba(255, 215, 0, 0.08), 0 8px 32px rgba(0,0,0,0.5)`,
              opacity: (transitioning && !isPdfGenerating) ? 0 : 1,
              transition: 'opacity 0.2s ease-out',
            }}>
            <PageContent pageIndex={pageIndex} report={report} polished={polished} />
          </div>
        </div>

        {/* 컨트롤 */}
        <div className="flex items-center justify-center gap-3 mb-2 md:mb-3">
          <button onClick={() => goToPage(pageIndex - 1)}
            disabled={pageIndex === 0 || isPdfGenerating}
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
            disabled={pageIndex === TOTAL_PAGES - 1 || isPdfGenerating}
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

        <div className="flex gap-[3px] md:gap-1 justify-center flex-wrap max-w-[280px] md:max-w-md mx-auto mb-2 md:mb-3">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
            const isCurrent = i === pageIndex;
            const isCover = i === 0;
            const isOutro = i === TOTAL_PAGES - 1;
            return (
              <button key={i}
                onClick={() => goToPage(i)}
                disabled={isPdfGenerating}
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
                  cursor: isPdfGenerating ? 'not-allowed' : 'pointer',
                  border: 'none',
                  padding: 0,
                }} />
            );
          })}
        </div>

        <p className="text-[8px] md:text-[9px] font-mono text-gray-700 text-center tracking-widest">
          ← → 키 또는 좌우 스와이프 · ESC 닫기 · ⬇ PDF 다운로드
        </p>
      </div>
    </div>
  );
}

function PageContent({
  pageIndex, report, polished,
}: {
  pageIndex: number;
  report: TeamReportData;
  polished: PolishedData | null;
}) {
  if (pageIndex === 0) return <CoverPage report={report} polished={polished} />;
  if (pageIndex === TOTAL_PAGES - 1) return <ConclusionPage report={report} polished={polished} />;
  const card = report.cards[pageIndex - 1];
  if (!card) return null;
  const polishedCard = polished?.cards?.[card.cardId] || null;
  return <CardSpread card={card} pageIndex={pageIndex} polishedCard={polishedCard} />;
}

// ═══════════════════════════════════════════════════════
// 표지
// ═══════════════════════════════════════════════════════
function CoverPage({
  report, polished,
}: {
  report: TeamReportData;
  polished: PolishedData | null;
}) {
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

        {polished?.executiveSummary && (
          <div className="rounded-lg p-3 mb-3"
            style={{
              background: `${S.pink}08`,
              border: `0.5px solid ${S.pink}30`,
            }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ fontSize: '10px' }}>📝</span>
              <p className="font-mono font-bold tracking-widest"
                style={{ fontSize: '8px', color: S.pink, letterSpacing: '1.5px' }}>
                EXECUTIVE SUMMARY
              </p>
            </div>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              {polished.executiveSummary}
            </p>
          </div>
        )}

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
function CardSpread({
  card, pageIndex, polishedCard,
}: {
  card: ReportCard;
  pageIndex: number;
  polishedCard: PolishedCard | null;
}) {
  if (polishedCard) {
    return <PolishedCardSpread card={card} pageIndex={pageIndex} polishedCard={polishedCard} />;
  }
  return <RawCardSpread card={card} pageIndex={pageIndex} />;
}

function PolishedCardSpread({
  card, pageIndex, polishedCard,
}: {
  card: ReportCard;
  pageIndex: number;
  polishedCard: PolishedCard;
}) {
  const cardColor = CARD_COLORS[card.cardId]?.bg || S.cyan;
  const topic = TOPICS.find(t => t.id === card.cardId);
  const categoryInfo = topic ? CATEGORY_STYLES[topic.category] : null;
  const difficulty = topic?.difficulty || 0;

  const participants = Array.from(
    new Set(card.memberInsights?.map(mi => mi.memberName) || [])
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={`${cardColor}99`} />
      <CornerDecoration position="tr" color={`${cardColor}99`} />
      <CornerDecoration position="bl" color={`${cardColor}99`} />
      <CornerDecoration position="br" color={`${cardColor}99`} />

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
            {polishedCard.titleKo || card.titleKo}
          </h2>
          <p className="text-[11px] italic" style={{ color: 'rgba(193, 232, 235, 0.6)' }}>
            {card.titleEn}
          </p>
        </div>

        {polishedCard.intro && (
          <div className="mb-4 rounded-lg p-3"
            style={{
              background: `${cardColor}10`,
              border: `0.5px solid ${cardColor}30`,
              borderLeft: `2.5px solid ${cardColor}`,
            }}>
            <p className="font-mono font-bold tracking-widest mb-1.5"
              style={{ fontSize: '8px', color: cardColor, letterSpacing: '2px' }}>
              ◆ INTRO
            </p>
            <p className="leading-relaxed"
              style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.92)' }}>
              {polishedCard.intro}
            </p>
          </div>
        )}

        {polishedCard.narrative && (
          <div>
            <p className="font-mono font-bold tracking-widest mb-2"
              style={{ fontSize: '8px', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '2px' }}>
              ◆ NARRATIVE
            </p>
            <div className="leading-relaxed whitespace-pre-wrap"
              style={{
                fontSize: '12.5px',
                color: 'rgba(255, 255, 255, 0.85)',
                lineHeight: 1.75,
              }}>
              {polishedCard.narrative}
            </div>
          </div>
        )}

        <div className="absolute bottom-3 left-7 font-mono hidden md:block"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')} · LEFT
        </div>
      </div>

      <MobileSeparator color={cardColor} label="STRATEGY ↓" />

      <div className="p-5 md:p-7 relative">
        <div className="absolute top-4 right-7 font-mono text-gray-600 hidden md:block"
          style={{ fontSize: '9px', letterSpacing: '1.5px' }}>
          CONTINUED →
        </div>

        {polishedCard.strategy && (
          <div className="mb-5 md:mt-6"
            style={{
              background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}05)`,
              border: `0.5px solid ${cardColor}50`,
              borderRadius: '12px',
              padding: '14px',
            }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span style={{ fontSize: '11px' }}>⚡</span>
              <p className="font-mono font-bold tracking-widest"
                style={{ fontSize: '8px', color: cardColor, letterSpacing: '2px' }}>
                STRATEGY
              </p>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap"
              style={{
                fontSize: '12.5px',
                color: 'rgba(255, 255, 255, 0.92)',
                lineHeight: 1.7,
              }}>
              {polishedCard.strategy}
            </p>
          </div>
        )}

        <div className="mb-4 flex items-center gap-2">
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
          <div className="rounded-xl p-4 mb-4 relative overflow-hidden"
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

        {polishedCard.bridge && (
          <div className="rounded-lg p-3"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: `0.5px dashed ${cardColor}50`,
            }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ fontSize: '10px', color: cardColor }}>→</span>
              <p className="font-mono font-bold tracking-widest"
                style={{ fontSize: '8px', color: cardColor, letterSpacing: '2px' }}>
                BRIDGE TO NEXT
              </p>
            </div>
            <p className="leading-relaxed italic"
              style={{
                fontSize: '11.5px',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
              {polishedCard.bridge}
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

        <div className="mt-4 md:mt-0 md:absolute md:bottom-3 md:right-7 font-mono text-center md:text-left"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')}
          <span className="hidden md:inline"> · RIGHT</span>
        </div>
      </div>
    </div>
  );
}

function RawCardSpread({ card, pageIndex }: { card: ReportCard; pageIndex: number }) {
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

        <div className="absolute bottom-3 left-7 font-mono hidden md:block"
          style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px' }}>
          PAGE {String(pageIndex + 1).padStart(2, '0')} · LEFT
        </div>
      </div>

      <MobileSeparator color={cardColor} label="CONTINUED ↓" />

      <div className="p-5 md:p-7 relative">
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
// 마무리 페이지
// ═══════════════════════════════════════════════════════
function ConclusionPage({
  report, polished,
}: {
  report: TeamReportData;
  polished: PolishedData | null;
}) {
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

        <div className="space-y-3 mb-5">
          <SummaryStat label="완성된 카드" value={`${filledStrategies} / 16`} color={S.green} />
          <SummaryStat label="작성한 답변" value={`${totalAnswers}개`} color={S.aqua} />
          <SummaryStat label="참여 팀원" value={`${team.members.length}명`} color={S.gold} />
        </div>

        {polished?.conclusion && (
          <div className="rounded-lg p-3"
            style={{
              background: `${S.pink}08`,
              border: `0.5px solid ${S.pink}30`,
              borderLeft: `2.5px solid ${S.pink}`,
            }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ fontSize: '10px' }}>📝</span>
              <p className="font-mono font-bold tracking-widest"
                style={{ fontSize: '8px', color: S.pink, letterSpacing: '1.5px' }}>
                CONCLUSION
              </p>
            </div>
            <p className="text-[11.5px] text-gray-300 leading-relaxed">
              {polished.conclusion}
            </p>
          </div>
        )}
      </div>

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
  position, color = '#FFD70060',
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
