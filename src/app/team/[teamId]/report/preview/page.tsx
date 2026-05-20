'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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

// ⭐⭐⭐ v13: 텍스트 PDF (5초 컷) ⭐⭐⭐
// 한글 폰트 캐시 (한 번 로드하면 재사용)
let cachedFontBase64: string | null = null;

async function loadKoreanFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;
  // Noto Sans KR Regular (구글 폰트 CDN)
  const res = await fetch('https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.0.woff2');
  if (!res.ok) throw new Error('한글 폰트 다운로드 실패');
  const buf = await res.arrayBuffer();
  // ArrayBuffer → base64
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

export default function TeamReportPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TeamReportData | null>(null);
  const [polished, setPolished] = useState<PolishedData | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfForceDesktop, setPdfForceDesktop] = useState(false);
  const autoPdfTriggeredRef = useRef(false);

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
            console.warn('다듬은 데이터 파싱 실패', e);
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

  useEffect(() => {
    if (loading || !report) return;
    if (autoPdfTriggeredRef.current) return;
    if (searchParams?.get('autoPdf') !== '1') return;
    autoPdfTriggeredRef.current = true;
    const timer = setTimeout(() => { handlePdfDownload(true); }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, report, searchParams]);

  // ⭐⭐⭐ v13: 텍스트 PDF (캡처 없음, 5초 컷) ⭐⭐⭐
  async function handlePdfDownload(skipConfirm = false) {
    if (isPdfGenerating || !report) return;
    if (!skipConfirm) {
      const ok = confirm('📄 PDF 다운로드를 시작합니다.\n\n• 출판물 스타일 텍스트 PDF\n• 약 5~10초 소요됩니다\n• 한글 폰트 자동 적용\n\n계속하시겠어요?');
      if (!ok) return;
    }
    setIsPdfGenerating(true);
    setPdfProgress(0);

    try {
      const { jsPDF } = await import('jspdf');

      // 한글 폰트 로드 (캐시되므로 첫 호출만 느림)
      setPdfProgress(5);
      let fontBase64: string;
      try {
        fontBase64 = await loadKoreanFont();
      } catch (e) {
        console.warn('한글 폰트 로드 실패, 기본 폰트로 진행:', e);
        fontBase64 = '';
      }
      setPdfProgress(15);

      // ─── PDF 설정 ───
      // A4 가로 (랜드스케이프) 297 x 210 mm
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();   // 297
      const H = pdf.internal.pageSize.getHeight();  // 210

      // 한글 폰트 등록
      if (fontBase64) {
        try {
          pdf.addFileToVFS('NotoSansKR.ttf', fontBase64);
          pdf.addFont('NotoSansKR.ttf', 'NotoSansKR', 'normal');
          pdf.setFont('NotoSansKR');
        } catch (e) {
          console.warn('폰트 등록 실패:', e);
        }
      }

      // ─── 색상 (RGB) ───
      const C = {
        bg: [10, 10, 18] as [number, number, number],
        gold: [255, 215, 0] as [number, number, number],
        green: [231, 254, 85] as [number, number, number],
        aqua: [193, 232, 235] as [number, number, number],
        cyan: [6, 182, 212] as [number, number, number],
        purple: [139, 92, 246] as [number, number, number],
        pink: [255, 111, 181] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        gray: [160, 160, 170] as [number, number, number],
        grayDim: [110, 110, 120] as [number, number, number],
        line: [60, 60, 75] as [number, number, number],
      };

      // ─── 배경 채우기 ───
      const drawBg = () => {
        pdf.setFillColor(...C.bg);
        pdf.rect(0, 0, W, H, 'F');
      };

      // ─── 코너 장식 ───
      const drawCorners = (color: [number, number, number]) => {
        pdf.setDrawColor(...color);
        pdf.setLineWidth(0.4);
        // 좌상
        pdf.line(8, 12, 8 + 5, 12); pdf.line(8, 12, 8, 12 + 5);
        // 우상
        pdf.line(W - 8 - 5, 12, W - 8, 12); pdf.line(W - 8, 12, W - 8, 12 + 5);
        // 좌하
        pdf.line(8, H - 12, 8 + 5, H - 12); pdf.line(8, H - 12, 8, H - 12 - 5);
        // 우하
        pdf.line(W - 8 - 5, H - 12, W - 8, H - 12); pdf.line(W - 8, H - 12, W - 8, H - 12 - 5);
      };

      // ─── 텍스트 줄 단위로 그리기 (자동 줄바꿈) ───
      const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number, color: [number, number, number], lineSpacing = 1.4): number => {
        if (!text) return y;
        pdf.setFontSize(fontSize);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, maxWidth);
        const lineHeight = (fontSize * 0.3528) * lineSpacing; // pt → mm 환산
        lines.forEach((line: string, i: number) => {
          pdf.text(line, x, y + i * lineHeight);
        });
        return y + lines.length * lineHeight;
      };

      // ─── 라벨 (작은 영문) ───
      const drawLabel = (text: string, x: number, y: number, color: [number, number, number]) => {
        pdf.setFontSize(8);
        pdf.setTextColor(...color);
        pdf.text(text, x, y);
      };

      // ─── 구분선 ───
      const drawDivider = (x1: number, y: number, x2: number, color: [number, number, number] = C.line) => {
        pdf.setDrawColor(...color);
        pdf.setLineWidth(0.2);
        pdf.line(x1, y, x2, y);
      };

      // ─── 박스 (배경 + 보더) ───
      const drawBox = (x: number, y: number, w: number, h: number, fillColor: [number, number, number] | null, borderColor: [number, number, number] | null) => {
        if (fillColor) {
          pdf.setFillColor(...fillColor);
          pdf.roundedRect(x, y, w, h, 2, 2, 'F');
        }
        if (borderColor) {
          pdf.setDrawColor(...borderColor);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(x, y, w, h, 2, 2, 'S');
        }
      };

      // ═══════════════════════════════════════════════
      // PAGE 1: COVER
      // ═══════════════════════════════════════════════
      const drawCoverPage = () => {
        drawBg();
        drawCorners(C.gold);

        const leftCx = W / 4;
        const rightX = W / 2 + 20;

        // 왼쪽: 로고
        drawLabel('· CONNECTAI ·', leftCx, 60, C.gold);
        pdf.setFontSize(48);
        pdf.setTextColor(...C.white);
        const sigW = pdf.getTextWidth('SIGNAL');
        pdf.text('SIGNAL', leftCx - sigW / 2, 95);

        drawLabel('— DIGITAL TRADE CARDS —', leftCx - 25, 110, C.aqua);
        drawLabel('TEAM REPORT · 2026', leftCx - 15, 130, C.grayDim);

        // 가운데 구분선
        pdf.setDrawColor(...C.line);
        pdf.setLineWidth(0.3);
        pdf.line(W / 2, 25, W / 2, H - 25);

        // 오른쪽: 팀 정보
        drawLabel('★ TEAM PROFILE ★', rightX, 40, C.gold);
        pdf.setFontSize(20);
        pdf.setTextColor(...C.white);
        pdf.text(report!.team.teamName, rightX, 52);

        pdf.setFontSize(11);
        pdf.setTextColor(...C.aqua);
        pdf.text(report!.team.item, rightX, 60);

        let y = 75;
        const leader = report!.team.members.find(m => m.isLeader);
        const rows = [
          ['LEVEL', report!.team.level, C.green],
          ['LEADER', leader?.name || '미지정', C.gold],
          ['MEMBERS', `${report!.team.members.length}명`, C.aqua],
        ];
        rows.forEach(([label, value, color]) => {
          drawLabel(label as string, rightX, y, color as [number, number, number]);
          pdf.setFontSize(11);
          pdf.setTextColor(...C.white);
          pdf.text(value as string, rightX + 30, y);
          y += 8;
        });

        // 팀 로스터
        y += 5;
        drawLabel('— TEAM ROSTER —', rightX, y, C.grayDim);
        y += 6;
        report!.team.members.forEach((m: any) => {
          pdf.setFontSize(10);
          pdf.setTextColor(...(m.isLeader ? C.gold : C.gray));
          pdf.text(`${m.isLeader ? '★' : '·'} ${m.name}`, rightX, y);
          pdf.setTextColor(...C.grayDim);
          pdf.text(`(${m.roleCode})`, rightX + 40, y);
          y += 6;
        });

        // Executive Summary
        if (polished?.executiveSummary) {
          y += 4;
          drawDivider(rightX, y, W - 25, C.gold);
          y += 4;
          drawLabel('EXECUTIVE SUMMARY', rightX, y, C.pink);
          y += 5;
          drawWrappedText(polished.executiveSummary, rightX, y, W - rightX - 20, 9, C.gray, 1.5);
        }
      };

      // ═══════════════════════════════════════════════
      // CARD PAGE
      // ═══════════════════════════════════════════════
      const drawCardPage = (cardIndex: number) => {
        drawBg();
        const card = report!.cards[cardIndex];
        if (!card) return;

        const cardColorHex = CARD_COLORS[card.cardId]?.bg || '#06B6D4';
        const cardColor: [number, number, number] = [
          parseInt(cardColorHex.slice(1, 3), 16),
          parseInt(cardColorHex.slice(3, 5), 16),
          parseInt(cardColorHex.slice(5, 7), 16),
        ];
        drawCorners(cardColor);

        const polishedCard = polished?.cards?.[card.cardId];
        const topic = TOPICS.find(t => t.id === card.cardId);
        const categoryLabel = topic ? topic.category : '';

        // 가운데 구분선
        pdf.setDrawColor(...C.line);
        pdf.setLineWidth(0.3);
        pdf.line(W / 2, 25, W / 2, H - 25);

        // ─── 왼쪽: 카드 헤더 + INTRO + NARRATIVE ───
        const lx = 20;
        const lw = W / 2 - 30;

        // 카드 ID 박스
        pdf.setFillColor(...cardColor);
        pdf.roundedRect(lx, 22, 12, 12, 1.5, 1.5, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor(...C.white);
        pdf.text(card.cardId, lx + 4, 30);

        // CARD XX
        drawLabel(`CARD ${card.cardId}`, lx + 16, 27, C.grayDim);
        // 카테고리
        if (categoryLabel) {
          drawLabel(categoryLabel, lx + 16, 32, cardColor);
        }

        // 제목
        pdf.setFontSize(14);
        pdf.setTextColor(...C.white);
        pdf.text(polishedCard?.titleKo || card.titleKo, lx, 47);
        pdf.setFontSize(9);
        pdf.setTextColor(...C.grayDim);
        pdf.text(card.titleEn, lx, 52);

        let y = 62;

        // INTRO
        if (polishedCard?.intro) {
          drawBox(lx, y - 4, lw, 18, [cardColor[0] / 8, cardColor[1] / 8, cardColor[2] / 8], cardColor);
          drawLabel('◆ INTRO', lx + 3, y, cardColor);
          y += 4;
          y = drawWrappedText(polishedCard.intro, lx + 3, y + 2, lw - 6, 9, C.white, 1.5);
          y += 6;
        }

        // NARRATIVE
        if (polishedCard?.narrative) {
          drawLabel('◆ NARRATIVE', lx, y, C.gray);
          y += 5;
          y = drawWrappedText(polishedCard.narrative, lx, y, lw, 9, C.gray, 1.6);
        } else {
          // 학생 답변 그대로
          card.questions.slice(0, 2).forEach((q, idx) => {
            const stage = STAGES[idx];
            drawLabel(`STAGE ${idx + 1} · ${stage.label}`, lx, y, [
              parseInt(stage.color.slice(1, 3), 16),
              parseInt(stage.color.slice(3, 5), 16),
              parseInt(stage.color.slice(5, 7), 16),
            ]);
            y += 5;
            const text = q.answer || '미작성';
            y = drawWrappedText(text.length > 200 ? text.slice(0, 200) + '...' : text, lx, y, lw, 9, C.gray, 1.5);
            y += 5;
          });
        }

        // PAGE NUMBER (왼쪽)
        drawLabel(`PAGE ${String(cardIndex + 2).padStart(2, '0')} · LEFT`, lx, H - 16, C.grayDim);

        // ─── 오른쪽: AI COACH FEEDBACK + ONE SENTENCE STRATEGY + BRIDGE ───
        const rx = W / 2 + 10;
        const rw = W / 2 - 30;
        y = 30;

        drawLabel('CONTINUED →', W - 40, y, C.grayDim);
        y = 40;

        // AI COACH FEEDBACK
        if (polishedCard?.strategy) {
          drawLabel('🎯 AI COACH FEEDBACK', rx, y, cardColor);
          y += 5;
          y = drawWrappedText(polishedCard.strategy, rx, y, rw, 9, C.white, 1.6);
          y += 8;
        }

        // 구분선
        drawDivider(rx, y, rx + rw, C.gold);
        y += 6;

        // ONE SENTENCE STRATEGY
        if (card.oneSentenceStrategy) {
          drawBox(rx, y - 3, rw, 25, [40, 35, 0], C.gold);
          drawLabel('★ ONE SENTENCE STRATEGY', rx + 3, y + 2, C.gold);
          y += 7;
          y = drawWrappedText(card.oneSentenceStrategy, rx + 3, y, rw - 6, 10, C.white, 1.5);
          y += 6;
        }

        // BRIDGE TO NEXT
        if (polishedCard?.bridge) {
          drawLabel('→ BRIDGE TO NEXT', rx, y, cardColor);
          y += 5;
          y = drawWrappedText(polishedCard.bridge, rx, y, rw, 9, C.gray, 1.5);
        }

        // PAGE NUMBER (오른쪽)
        drawLabel(`PAGE ${String(cardIndex + 2).padStart(2, '0')} · RIGHT`, W - 50, H - 16, C.grayDim);
      };

      // ═══════════════════════════════════════════════
      // CONCLUSION PAGE
      // ═══════════════════════════════════════════════
      const drawConclusionPage = () => {
        drawBg();
        drawCorners(C.gold);

        // 가운데 구분선
        pdf.setDrawColor(...C.line);
        pdf.setLineWidth(0.3);
        pdf.line(W / 2, 25, W / 2, H - 25);

        // 왼쪽: Summary
        const lx = 20;
        drawLabel('★ FINAL SUMMARY ★', lx, 35, C.gold);
        pdf.setFontSize(18);
        pdf.setTextColor(...C.white);
        pdf.text('전략 완성', lx, 50);

        pdf.setFontSize(10);
        pdf.setTextColor(...C.gray);
        pdf.text('16개 카드를 통해 디지털 무역 전략을 완성했습니다.', lx, 60);

        // Stats
        const filledStrategies = report!.cards.filter(c => c.oneSentenceStrategy).length;
        const stats = [
          ['완성된 카드', `${filledStrategies} / 16`, C.green],
          ['작성한 답변', `${report!.totalAnswers}개`, C.aqua],
          ['참여 팀원', `${report!.team.members.length}명`, C.gold],
        ];
        let y = 75;
        stats.forEach(([label, value, color]) => {
          drawBox(lx, y, 100, 14, null, color as [number, number, number]);
          pdf.setFontSize(9);
          pdf.setTextColor(...(color as [number, number, number]));
          pdf.text(label as string, lx + 4, y + 6);
          pdf.setFontSize(13);
          pdf.setTextColor(...C.white);
          pdf.text(value as string, lx + 4, y + 11);
          y += 18;
        });

        // Conclusion
        if (polished?.conclusion) {
          y += 4;
          drawLabel('— CONCLUSION —', lx, y, C.pink);
          y += 6;
          drawWrappedText(polished.conclusion, lx, y, 110, 9, C.gray, 1.5);
        }

        // 오른쪽: 마무리
        const rx = W / 2 + 30;
        pdf.setFontSize(32);
        pdf.setTextColor(...C.gold);
        const starX = rx + 40;
        pdf.text('★', starX, 70);

        pdf.setFontSize(13);
        pdf.setTextColor(...C.white);
        const msg = `${report!.team.teamName} 모두 수고하셨습니다.`;
        const msgW = pdf.getTextWidth(msg);
        pdf.text(msg, rx + 50 - msgW / 2, 90);

        pdf.setFontSize(9);
        pdf.setTextColor(...C.gray);
        const sub1 = '이 전략을 실제 비즈니스에';
        const sub2 = '어떻게 적용할지 토론해보세요.';
        const s1W = pdf.getTextWidth(sub1);
        const s2W = pdf.getTextWidth(sub2);
        pdf.text(sub1, rx + 50 - s1W / 2, 105);
        pdf.text(sub2, rx + 50 - s2W / 2, 112);

        // Generated date
        pdf.setFontSize(8);
        pdf.setTextColor(...C.grayDim);
        const dateStr = `REPORT GENERATED · ${new Date(report!.generatedAt).toLocaleDateString('ko-KR')}`;
        const dW = pdf.getTextWidth(dateStr);
        pdf.text(dateStr, rx + 50 - dW / 2, 145);
        const copy = '© 2026 SIGNAL · ConnectAI';
        const cW = pdf.getTextWidth(copy);
        pdf.text(copy, rx + 50 - cW / 2, 152);
      };

      // ─── 페이지 생성 ───
      drawCoverPage();
      setPdfProgress(25);

      for (let i = 0; i < report.cards.length; i++) {
        pdf.addPage();
        drawCardPage(i);
        setPdfProgress(25 + Math.round((i + 1) / report.cards.length * 65));
      }

      pdf.addPage();
      drawConclusionPage();
      setPdfProgress(95);

      // 저장
      const teamName = report.team.teamName || 'team';
      const date = new Date().toISOString().slice(0, 10);
      const safeName = teamName.replace(/[^\w가-힣]/g, '_');
      pdf.save(`SIGNAL_${safeName}_${date}.pdf`);
      setPdfProgress(100);
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
      if (isPdfGenerating) return;
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
          background: `radial-gradient(ellipse at 50% 50%, rgba(255, 215, 0, 0.06) 0%, transparent 60%), radial-gradient(circle at 20% 30%, ${S.cyan}14 0%, transparent 50%), radial-gradient(circle at 80% 70%, ${S.purple}14 0%, transparent 50%)`,
          zIndex: 0,
        }} />

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
              텍스트 PDF 생성 중<br />
              잠시만 기다려주세요...
            </p>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pdfProgress}%`,
                  background: `linear-gradient(to right, ${S.gold}, ${S.green})`,
                  boxShadow: `0 0 8px ${S.gold}80`,
                }} />
            </div>
            <p className="text-[10px] font-mono text-gray-500 mt-3 tracking-wider">{pdfProgress}%</p>
          </div>
          <style jsx>{`
            .pdf-spinner { animation: spin 0.8s linear infinite; }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto w-full flex-1 flex flex-col">
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
            <button onClick={() => handlePdfDownload()} disabled={isPdfGenerating}
              className="rounded-lg flex items-center gap-1 transition-all hover:scale-105 disabled:opacity-50"
              style={{
                fontSize: '10px', padding: '5px 10px',
                background: `linear-gradient(135deg, ${S.gold}, ${S.green})`,
                color: S.navy, fontWeight: 700,
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

        <div className="flex-1 flex items-center justify-center mb-3 md:mb-4">
          <div id="book-page-content" className="w-full rounded-xl md:rounded-2xl overflow-hidden relative"
            style={{
              background: `linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))`,
              border: `0.5px solid rgba(255, 215, 0, 0.2)`,
              boxShadow: `0 0 60px rgba(255, 215, 0, 0.08), 0 8px 32px rgba(0,0,0,0.5)`,
              opacity: (transitioning && !isPdfGenerating) ? 0 : 1,
              transition: isPdfGenerating ? 'none' : 'opacity 0.2s ease-out',
            }}>
            <PageContent pageIndex={pageIndex} report={report} polished={polished} forceDesktop={pdfForceDesktop} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-2 md:mb-3">
          <button onClick={() => goToPage(pageIndex - 1)} disabled={pageIndex === 0 || isPdfGenerating}
            className="rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-110"
            style={{
              width: '40px', height: '40px',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontSize: '18px',
            }}>‹</button>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold"
              style={{ fontSize: '11px', color: S.gold, letterSpacing: '1.5px' }}>
              {String(pageIndex + 1).padStart(2, '0')}
            </span>
            <span className="text-gray-700">/</span>
            <span className="font-mono text-gray-500" style={{ fontSize: '11px', letterSpacing: '1.5px' }}>
              {TOTAL_PAGES}
            </span>
          </div>
          <button onClick={() => goToPage(pageIndex + 1)} disabled={pageIndex === TOTAL_PAGES - 1 || isPdfGenerating}
            className="rounded-full flex items-center justify-center transition-all disabled:opacity-20 hover:scale-110"
            style={{
              width: '40px', height: '40px',
              background: pageIndex === TOTAL_PAGES - 1
                ? 'rgba(255,255,255,0.04)'
                : `linear-gradient(135deg, ${S.gold} 0%, ${S.green} 100%)`,
              border: pageIndex === TOTAL_PAGES - 1 ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
              color: pageIndex === TOTAL_PAGES - 1 ? 'rgba(255,255,255,0.6)' : S.navy,
              fontSize: '18px', fontWeight: 700,
              boxShadow: pageIndex === TOTAL_PAGES - 1 ? 'none' : `0 0 16px rgba(255, 215, 0, 0.4)`,
            }}>›</button>
        </div>

        <div className="flex gap-[3px] md:gap-1 justify-center flex-wrap max-w-[280px] md:max-w-md mx-auto mb-2 md:mb-3">
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
            const isCurrent = i === pageIndex;
            const isCover = i === 0;
            const isOutro = i === TOTAL_PAGES - 1;
            return (
              <button key={i} onClick={() => goToPage(i)} disabled={isPdfGenerating}
                aria-label={`페이지 ${i + 1}`}
                className="rounded-full transition-all hover:scale-150 w-[5px] h-[5px] md:w-[6px] md:h-[6px]"
                style={{
                  background: isCurrent ? S.gold : isCover || isOutro ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  boxShadow: isCurrent ? `0 0 6px ${S.gold}` : 'none',
                  transform: isCurrent ? 'scale(1.3)' : 'scale(1)',
                  cursor: isPdfGenerating ? 'not-allowed' : 'pointer',
                  border: 'none', padding: 0,
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

function PageContent({ pageIndex, report, polished, forceDesktop = false }: {
  pageIndex: number; report: TeamReportData; polished: PolishedData | null; forceDesktop?: boolean;
}) {
  if (pageIndex === 0) return <CoverPage report={report} polished={polished} />;
  if (pageIndex === TOTAL_PAGES - 1) return <ConclusionPage report={report} polished={polished} />;
  const card = report.cards[pageIndex - 1];
  if (!card) return null;
  const polishedCard = polished?.cards?.[card.cardId] || null;
  return <CardSpread card={card} pageIndex={pageIndex} polishedCard={polishedCard} />;
}

function CoverPage({ report, polished }: { report: TeamReportData; polished: PolishedData | null; }) {
  const { team } = report;
  const leader = team.members.find(m => m.isLeader);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={S.gold} />
      <CornerDecoration position="tr" color={S.gold} />
      <CornerDecoration position="bl" color={S.gold} />
      <CornerDecoration position="br" color={S.gold} />
      <div className="p-6 md:p-12 flex flex-col items-center justify-center text-center md:border-r" style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <div className="inline-flex items-center gap-2 mb-3 md:mb-4">
          <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
          <span className="font-mono font-bold tracking-[5px] md:tracking-[6px]"
            style={{ fontSize: '9px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
            CONNECTAI
          </span>
          <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
        </div>
        <h1 className="font-black text-white mb-4 tracking-tight"
          style={{
            fontSize: 'clamp(40px, 8vw, 56px)',
            lineHeight: 1.15,
            textShadow: `0 0 24px ${S.gold}55, 0 0 48px ${S.green}33`,
            letterSpacing: '-1px',
          }}>SIGNAL</h1>
        <div className="flex items-center gap-2 mb-4">
          <p className="font-mono font-bold tracking-[2px]"
            style={{ fontSize: '10px', color: S.aqua, textShadow: `0 0 6px ${S.aqua}66` }}>
            — DIGITAL TRADE CARDS —
          </p>
        </div>
        <p className="text-[10px] md:text-[11px] text-gray-500 font-mono tracking-wider">
          TEAM REPORT · 2026
        </p>
      </div>
      <MobileSeparator color={S.gold} />
      <div className="p-6 md:p-12 flex flex-col justify-center">
        <p className="font-mono font-bold tracking-[3px] mb-2 md:mb-3" style={{ fontSize: '10px', color: S.gold }}>
          ★ TEAM PROFILE ★
        </p>
        <h2 className="text-xl md:text-3xl font-bold text-white mb-2 leading-tight">{team.teamName}</h2>
        <p className="text-[13px] md:text-[14px] mb-4 md:mb-6" style={{ color: S.aqua }}>{team.item}</p>
        <div className="space-y-2 mb-4 md:mb-6">
          <Row label="LEVEL" value={team.level} color={S.green} />
          <Row label="LEADER" value={leader?.name || '미지정'} color={S.gold} />
          <Row label="MEMBERS" value={`${team.members.length}명`} color={S.aqua} />
        </div>
        {polished?.executiveSummary && (
          <div className="rounded-lg p-3 mb-3" style={{ background: `${S.pink}08`, border: `0.5px solid ${S.pink}30` }}>
            <p className="font-mono font-bold tracking-widest mb-1.5" style={{ fontSize: '8px', color: S.pink, letterSpacing: '1.5px' }}>
              EXECUTIVE SUMMARY
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">{polished.executiveSummary}</p>
          </div>
        )}
        <div className="pt-3 md:pt-4 border-t" style={{ borderColor: 'rgba(255, 215, 0, 0.1)' }}>
          <p className="font-mono text-gray-600 mb-2" style={{ fontSize: '9px', letterSpacing: '2px' }}>
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

function CardSpread({ card, pageIndex, polishedCard }: { card: ReportCard; pageIndex: number; polishedCard: PolishedCard | null; }) {
  const cardColor = CARD_COLORS[card.cardId]?.bg || S.cyan;
  const topic = TOPICS.find(t => t.id === card.cardId);
  const categoryInfo = topic ? CATEGORY_STYLES[topic.category] : null;
  const difficulty = topic?.difficulty || 0;
  const leftQuestions = card.questions.slice(0, 2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={`${cardColor}99`} />
      <CornerDecoration position="tr" color={`${cardColor}99`} />
      <CornerDecoration position="bl" color={`${cardColor}99`} />
      <CornerDecoration position="br" color={`${cardColor}99`} />
      <div className="p-5 md:p-7 relative md:border-r" style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
            <div className="rounded-lg flex items-center justify-center font-black flex-shrink-0"
              style={{ width: '38px', height: '38px', background: cardColor, color: cardColor === '#FFC72C' || cardColor === '#E7FE55' ? '#111' : '#fff', fontSize: '13px', fontFamily: 'monospace' }}>
              {card.cardId}
            </div>
            <div className="min-w-0">
              <span className="font-mono tracking-wider" style={{ fontSize: '9px', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)' }}>
                CARD {card.cardId}
              </span>
              {categoryInfo && (
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full font-bold"
                    style={{ fontSize: '9px', background: `${categoryInfo.color}22`, color: categoryInfo.color, border: `0.5px solid ${categoryInfo.color}60` }}>
                    {categoryInfo.label}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[1, 2, 3, 4, 5].map(i => (
              <span key={i} style={{ fontSize: '10px', color: i <= difficulty ? S.gold : 'rgba(255,255,255,0.15)' }}>★</span>
            ))}
          </div>
        </div>
        <div className="mb-4 md:mb-5">
          <h2 className="font-bold text-white mb-1" style={{ fontSize: '18px', lineHeight: 1.25 }}>
            {polishedCard?.titleKo || card.titleKo}
          </h2>
          <p className="text-[11px] italic" style={{ color: 'rgba(193, 232, 235, 0.6)' }}>{card.titleEn}</p>
        </div>
        {polishedCard?.intro && (
          <div className="mb-4 rounded-lg p-3" style={{ background: `${cardColor}10`, border: `0.5px solid ${cardColor}30`, borderLeft: `2.5px solid ${cardColor}` }}>
            <p className="font-mono font-bold tracking-widest mb-1.5" style={{ fontSize: '8px', color: cardColor, letterSpacing: '2px' }}>◆ INTRO</p>
            <p className="leading-relaxed" style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.92)', wordBreak: 'keep-all' }}>{polishedCard.intro}</p>
          </div>
        )}
        {polishedCard?.narrative ? (
          <div>
            <p className="font-mono font-bold tracking-widest mb-2" style={{ fontSize: '8px', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '2px' }}>◆ NARRATIVE</p>
            <div className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.75, wordBreak: 'keep-all' }}>
              {polishedCard.narrative}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {leftQuestions.map((q, idx) => (
              <div key={q.id}>
                <p className="text-[11px] mb-1" style={{ color: STAGES[idx].color }}>STAGE {idx + 1} · {STAGES[idx].label}</p>
                <p className="text-[12px]" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>{q.answer || '미작성'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <MobileSeparator color={cardColor} label="FEEDBACK ↓" />
      <div className="p-5 md:p-7 relative">
        {polishedCard?.strategy && (
          <div className="mb-5" style={{ background: `linear-gradient(135deg, ${cardColor}15, ${cardColor}05)`, border: `0.5px solid ${cardColor}50`, borderRadius: '12px', padding: '16px' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span style={{ fontSize: '11px' }}>🎯</span>
              <p className="font-mono font-bold tracking-widest" style={{ fontSize: '8px', color: cardColor, letterSpacing: '2px' }}>AI COACH FEEDBACK</p>
            </div>
            <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.92)', lineHeight: 1.7, wordBreak: 'keep-all' }}>
              {polishedCard.strategy}
            </p>
          </div>
        )}
        {card.oneSentenceStrategy && (
          <div className="rounded-xl mb-4 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, rgba(255, 215, 0, 0.06), rgba(231, 254, 85, 0.04))`, border: `0.5px solid rgba(255, 215, 0, 0.3)`, padding: '16px' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '12px' }}>★</span>
              <span className="font-mono font-bold" style={{ fontSize: '9px', letterSpacing: '2px', color: S.gold }}>ONE SENTENCE STRATEGY</span>
            </div>
            <p className="leading-relaxed font-medium" style={{ fontSize: '13px', color: '#ffffff', wordBreak: 'keep-all' }}>
              {card.oneSentenceStrategy}
            </p>
          </div>
        )}
        {polishedCard?.bridge && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: `0.5px dashed ${cardColor}50` }}>
            <p className="font-mono font-bold tracking-widest mb-1" style={{ fontSize: '8px', color: cardColor, letterSpacing: '2px' }}>→ BRIDGE TO NEXT</p>
            <p className="leading-relaxed italic" style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.7)', wordBreak: 'keep-all' }}>{polishedCard.bridge}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConclusionPage({ report, polished }: { report: TeamReportData; polished: PolishedData | null; }) {
  const { team, cards, totalAnswers } = report;
  const filledStrategies = cards.filter(c => c.oneSentenceStrategy).length;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 relative">
      <CornerDecoration position="tl" color={S.gold} />
      <CornerDecoration position="tr" color={S.gold} />
      <CornerDecoration position="bl" color={S.gold} />
      <CornerDecoration position="br" color={S.gold} />
      <div className="p-6 md:p-10 md:border-r" style={{ borderColor: 'rgba(255, 215, 0, 0.15)' }}>
        <p className="font-mono font-bold tracking-[3px] mb-3" style={{ fontSize: '10px', color: S.gold }}>★ FINAL SUMMARY ★</p>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">전략 완성</h2>
        <p className="text-[12px] text-gray-500 mb-5 md:mb-6">16개 카드를 통해 디지털 무역 전략을 완성했습니다.</p>
        <div className="space-y-3 mb-5">
          <SummaryStat label="완성된 카드" value={`${filledStrategies} / 16`} color={S.green} />
          <SummaryStat label="작성한 답변" value={`${totalAnswers}개`} color={S.aqua} />
          <SummaryStat label="참여 팀원" value={`${team.members.length}명`} color={S.gold} />
        </div>
        {polished?.conclusion && (
          <div className="rounded-lg p-3" style={{ background: `${S.pink}08`, border: `0.5px solid ${S.pink}30`, borderLeft: `2.5px solid ${S.pink}` }}>
            <p className="font-mono font-bold tracking-widest mb-1.5" style={{ fontSize: '8px', color: S.pink, letterSpacing: '1.5px' }}>CONCLUSION</p>
            <p className="text-[11.5px] text-gray-300 leading-relaxed">{polished.conclusion}</p>
          </div>
        )}
      </div>
      <MobileSeparator color={S.gold} />
      <div className="p-6 md:p-10 flex flex-col items-center justify-center text-center">
        <p className="text-[14px] text-white mb-2 font-medium leading-relaxed">{team.teamName} 모두 수고하셨습니다.</p>
        <p className="text-[12px] text-gray-500 mb-6 md:mb-8 leading-relaxed">
          이 전략을 실제 비즈니스에<br />어떻게 적용할지 토론해보세요.
        </p>
        <p className="font-mono text-gray-600" style={{ fontSize: '9px', letterSpacing: '2px' }}>
          REPORT GENERATED · {new Date(report.generatedAt).toLocaleDateString('ko-KR')}
        </p>
        <p className="text-[10px] font-mono text-gray-700 mt-4 tracking-widest">© 2026 SIGNAL · ConnectAI</p>
      </div>
    </div>
  );
}

function MobileSeparator({ color, label = '' }: { color: string; label?: string }) {
  return (
    <div className="md:hidden flex items-center gap-2 px-5 py-2.5"
      style={{ borderTop: `0.5px solid ${color}25`, borderBottom: `0.5px solid ${color}25`, background: `${color}06` }}>
      {label && <span className="font-mono font-bold" style={{ fontSize: '8px', color: `${color}AA`, letterSpacing: '2px' }}>{label}</span>}
    </div>
  );
}

function CornerDecoration({ position, color = '#FFD70060' }: { position: 'tl' | 'tr' | 'bl' | 'br'; color?: string; }) {
  const isTop = position.startsWith('t');
  const isLeft = position.endsWith('l');
  return (
    <div className="absolute pointer-events-none z-10"
      style={{ [isTop ? 'top' : 'bottom']: '8px', [isLeft ? 'left' : 'right']: '8px', width: '14px', height: '14px' }}>
      <div style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0, width: '10px', height: '1.5px', background: color }} />
      <div style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, [isLeft ? 'left' : 'right']: 0, width: '1.5px', height: '10px', background: color }} />
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="font-mono font-bold" style={{ fontSize: '9px', letterSpacing: '2px', color, width: '70px', flexShrink: 0 }}>{label}</span>
      <span className="text-[13px] text-white">{value}</span>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: `${color}08`, border: `0.5px solid ${color}30` }}>
      <p className="text-[11px] text-gray-300">{label}</p>
      <p className="font-bold" style={{ fontSize: '20px', color, textShadow: `0 0 12px ${color}80` }}>{value}</p>
    </div>
  );
}
