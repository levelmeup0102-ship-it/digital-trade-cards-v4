'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TOPICS, CARD_COLORS } from '@/data/cardData';
import { generateTeamReport, getStoredReport } from '@/lib/reportGenerator';
import type { TeamReportData } from '@/types/report';

const S = {
  green: '#E7FE55',
  aqua: '#C1E8EB',
  gold: '#FFD700',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  navy: '#050505',
};

export default function TeamReportPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TeamReportData | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        // ① 저장된 보고서 먼저 확인
        let stored = await getStoredReport(teamId);

        // ② 없으면 새로 생성
        if (!stored) {
          stored = await generateTeamReport(teamId);
        }

        setReport(stored);
        setLoading(false);
      } catch (e: any) {
        console.error('보고서 로드 실패', e);
        setError(e?.message || '보고서를 불러올 수 없어요');
        setLoading(false);
      }
    })();
  }, [teamId]);

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 rounded-full mb-4 report-spinner"
            style={{ border: `2px solid ${S.gold}33`, borderTop: `2px solid ${S.gold}` }} />
          <p className="text-[12px] text-gray-500 font-mono tracking-widest">LOADING REPORT...</p>
        </div>
        <style jsx>{`
          .report-spinner { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // 에러 화면
  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-[10px] font-mono tracking-widest mb-3" style={{ color: '#FF6F61' }}>ERROR</p>
          <h1 className="text-xl font-bold text-white mb-2">보고서를 불러올 수 없어요</h1>
          <p className="text-[13px] text-gray-500 mb-6">{error || '데이터가 없습니다'}</p>
          <button onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold transition hover:scale-[1.02]"
            style={{ background: S.green, color: S.navy }}>
            홈으로
          </button>
        </div>
      </div>
    );
  }

  const { team, cards, totalAnswers, completedCardCount } = report;
  const memberCount = team.members.length;
  const leader = team.members.find(m => m.isLeader);

  return (
    <div className="min-h-screen p-3 md:p-6 relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, ${S.cyan}1A 0%, transparent 45%),
            radial-gradient(circle at 80% 60%, ${S.purple}1A 0%, transparent 50%),
            radial-gradient(ellipse at 50% 95%, ${S.gold}10 0%, transparent 60%)
          `,
          zIndex: 0,
        }} />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')}
            className="text-[12px] text-gray-500 hover:text-gray-300 transition flex items-center gap-1.5">
            ← 돌아가기
          </button>
          <p className="text-[10px] tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
        </div>

        {/* 타이틀 섹션 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
            <span className="font-mono font-bold tracking-[3px]"
              style={{ fontSize: '10px', color: S.gold, textShadow: `0 0 8px ${S.gold}66` }}>
              TEAM REPORT
            </span>
            <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2"
            style={{ textShadow: `0 0 20px rgba(255, 215, 0, 0.3)` }}>
            우리 팀 디지털 무역 전략
          </h1>
          <p className="text-[13px] mb-1" style={{ color: 'rgba(193, 232, 235, 0.8)' }}>
            {team.item}
          </p>
          <p className="text-[11px] font-mono text-gray-500 tracking-wider">
            {team.teamName} · {team.level} {leader && `· 팀장 ${leader.name}`}
          </p>
        </div>

        {/* 통계 3개 */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
          <StatCard label="CARDS" value={`${completedCardCount}/16`} color={S.green} />
          <StatCard label="ANSWERS" value={String(totalAnswers)} color={S.aqua} />
          <StatCard label="MEMBERS" value={String(memberCount)} color={S.gold} />
        </div>

        {/* PDF 다운로드 안내 */}
        <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
          style={{
            background: 'rgba(255, 215, 0, 0.04)',
            border: `0.5px solid rgba(255, 215, 0, 0.2)`,
          }}>
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
          <div>
            <p className="text-[10px] font-mono font-bold tracking-widest mb-1" style={{ color: S.gold }}>
              NOTICE
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              PDF 다운로드는 곧 지원됩니다. 지금은 미리보기로 확인해주세요.
            </p>
          </div>
        </div>

        {/* 액션 버튼 2개 */}
        <div className="grid grid-cols-2 gap-2.5 mb-8">
          <button
            onClick={() => router.push(`/team/${teamId}/report/preview`)}
            className="py-3 font-bold rounded-xl transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${S.gold} 0%, ${S.green} 100%)`,
              color: S.navy,
              fontSize: '13px',
              boxShadow: `0 0 24px rgba(255, 215, 0, 0.3)`,
            }}>
            👁 미리보기
          </button>
          <button
            disabled
            className="py-3 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '0.5px solid rgba(255, 255, 255, 0.1)',
              color: '#666',
              fontSize: '13px',
            }}>
            ⬇ PDF 다운로드
          </button>
        </div>

        {/* 카드별 작성 내용 (Accordion) */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-[1px]"
              style={{ background: `linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1))` }} />
            <span className="font-mono text-gray-500 tracking-widest"
              style={{ fontSize: '10px', letterSpacing: '2px' }}>
              16 CARDS
            </span>
            <div className="flex-1 h-[1px]"
              style={{ background: `linear-gradient(to left, transparent, rgba(255, 255, 255, 0.1))` }} />
          </div>

          <div className="space-y-2">
            {cards.map((card, idx) => {
              const isExpanded = expandedCards.has(card.id);
              const cardColor = CARD_COLORS[card.id]?.bg || S.cyan;
              const isCompleted = card.questions.some(q => q.answer.length > 0);

              return (
                <div key={card.id} className="rounded-xl overflow-hidden transition-all"
                  style={{
                    background: isExpanded ? `${cardColor}08` : 'rgba(255, 255, 255, 0.02)',
                    border: `0.5px solid ${isExpanded ? cardColor + '40' : 'rgba(255, 255, 255, 0.06)'}`,
                  }}>
                  {/* 카드 헤더 (클릭 가능) */}
                  <button onClick={() => toggleCard(card.id)}
                    className="w-full p-3 flex items-center gap-3 transition hover:bg-white/[0.02]">
                    {/* 카드 번호 */}
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-[12px] flex-shrink-0"
                      style={{
                        background: cardColor,
                        color: cardColor === '#FFC72C' || cardColor === S.green ? S.navy : '#fff',
                      }}>
                      {card.id}
                    </div>

                    {/* 제목 */}
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{card.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{card.titleEn}</p>
                    </div>

                    {/* 완료 상태 */}
                    {isCompleted && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: `${S.green}15`,
                          color: S.green,
                          border: `0.5px solid ${S.green}40`,
                        }}>
                        ✓
                      </span>
                    )}

                    {/* 화살표 */}
                    <span className="text-gray-500 transition-transform"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>

                  {/* 펼친 내용 */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 space-y-3">
                      {/* Q1, Q2, Q3 */}
                      {card.questions.map((q, qIdx) => (
                        <div key={q.id} className="rounded-lg p-2.5"
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '0.5px solid rgba(255, 255, 255, 0.05)',
                          }}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded"
                              style={{
                                fontSize: '9px',
                                background: `${cardColor}22`,
                                color: cardColor,
                              }}>
                              Q{qIdx + 1}
                            </span>
                            <span className="text-[10px] text-gray-500">{q.title}</span>
                          </div>
                          {q.answer ? (
                            <p className="text-[12px] text-gray-300 leading-relaxed">{q.answer}</p>
                          ) : (
                            <p className="text-[11px] text-gray-700 italic">미작성</p>
                          )}
                          {q.interimBlanks && q.interimBlanks.length > 0 && q.interimBlanks.some(b => b) && (
                            <p className="text-[11px] mt-1.5 pt-1.5 border-t border-white/5"
                              style={{ color: cardColor }}>
                              → {q.interimBlanks.filter(b => b).join(' · ')}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* 한 문장 전략 */}
                      {card.oneSentenceStrategy && (
                        <div className="rounded-lg p-3"
                          style={{
                            background: `${cardColor}10`,
                            border: `0.5px solid ${cardColor}40`,
                            boxShadow: `0 0 12px ${cardColor}15`,
                          }}>
                          <p className="font-mono font-bold tracking-widest mb-1.5"
                            style={{ fontSize: '9px', color: cardColor }}>
                            ★ ONE SENTENCE STRATEGY
                          </p>
                          <p className="text-[12.5px] text-white leading-relaxed font-medium">
                            {card.oneSentenceStrategy}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="text-center pt-4 pb-8 border-t border-white/[0.05]">
          <p className="text-[10px] font-mono text-gray-700 tracking-widest mb-1">
            REPORT GENERATED · {new Date(report.generatedAt).toLocaleDateString('ko-KR')}
          </p>
          <p className="text-[10px] text-gray-700">
            © 2026 SIGNAL — ConnectAI
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 통계 카드 ───
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl relative overflow-hidden text-center"
      style={{
        background: `${color}0A`,
        border: `0.5px solid ${color}33`,
        padding: '16px 8px',
      }}>
      <div className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: `linear-gradient(to right, transparent, ${color}80, transparent)` }} />
      <div className="font-bold mb-1"
        style={{
          fontSize: '24px',
          color: color,
          letterSpacing: '-0.5px',
          lineHeight: 1,
          textShadow: `0 0 12px ${color}80`,
        }}>
        {value}
      </div>
      <div className="font-mono"
        style={{
          fontSize: '9px',
          color: `${color}B3`,
          letterSpacing: '1.5px',
        }}>
        {label}
      </div>
    </div>
  );
}
