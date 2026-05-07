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

interface ScoringResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  cardScores: Record<string, {
    score: number;
    max: number;
    questions?: Array<{
      id: string;
      score: number;
      breakdown?: any;
      feedback?: string;
    }>;
  }>;
  summary: string;
  scoredAt: string | null;
}

export default function TeamReportPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TeamReportData | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [aiScoringInProgress, setAiScoringInProgress] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        let stored = await getStoredReport(teamId);
        if (!stored) {
          stored = await generateTeamReport(teamId);
        }
        setReport(stored);
        await loadScoringAndLeaderStatus(stored);
        setLoading(false);
      } catch (e: any) {
        console.error('보고서 로드 실패', e);
        setError(e?.message || '보고서를 불러올 수 없어요');
        setLoading(false);
      }
    })();
  }, [teamId]);

  async function loadScoringAndLeaderStatus(reportData: TeamReportData) {
    try {
      const { data: dbReport } = await supabase
        .from('team_reports')
        .select('total_score, card_scores, scored_at')
        .eq('team_id', teamId)
        .single();

      if (dbReport && dbReport.total_score !== null) {
        setScoring({
          totalScore: dbReport.total_score,
          maxScore: 480,
          percentage: Math.round((dbReport.total_score / 480) * 1000) / 10,
          cardScores: dbReport.card_scores || {},
          summary: '',
          scoredAt: dbReport.scored_at,
        });
      }

      const myMemberId = typeof window !== 'undefined' ? sessionStorage.getItem('memberId') : null;
      if (myMemberId && reportData.team.members) {
        const me = reportData.team.members.find((m: any) => m.id === myMemberId);
        if (me?.isLeader) setIsLeader(true);
      }

      const url = new URL(window.location.href);
      if (url.searchParams.get('leader') === '1') {
        setIsLeader(true);
      }
    } catch (e) {
      console.error('채점 정보 로드 실패', e);
    }
  }

  // ⭐ AI 채점 실행 (1회성 — 재채점 불가)
  async function handleAiScoring() {
    if (!isLeader) {
      alert('팀장만 채점할 수 있어요!');
      return;
    }

    // ⭐ 이미 채점된 경우 차단
    if (scoring) {
      alert('이미 채점이 완료된 보고서예요.\n채점은 한 번만 가능합니다.');
      return;
    }

    const ok = confirm(
      '🎯 AI 채점을 시작합니다.\n\n' +
      '• 약 1~2분 소요됩니다\n' +
      '• 한 번만 실행할 수 있어요 (재채점 불가)\n' +
      '• 신중히 진행해주세요\n\n' +
      '계속하시겠어요?'
    );
    if (!ok) return;

    setAiScoringInProgress(true);
    setAiError(null);

    try {
      const res = await fetch('/api/score-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '채점에 실패했습니다');
      }

      const result = await res.json();

      setScoring({
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        percentage: result.percentage,
        cardScores: result.cardScores,
        summary: result.summary || '',
        scoredAt: new Date().toISOString(),
      });

      alert(`🎉 채점 완료!\n총점: ${result.totalScore} / ${result.maxScore} (${result.percentage}%)`);
    } catch (e: any) {
      console.error('AI 채점 에러:', e);
      setAiError(e?.message || '채점 중 오류가 발생했습니다');
      alert('❌ 채점 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setAiScoringInProgress(false);
    }
  }

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

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
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')}
            className="text-[12px] text-gray-500 hover:text-gray-300 transition flex items-center gap-1.5">
            ← 돌아가기
          </button>
          <p className="text-[10px] tracking-[4px] text-gray-600 font-mono">SIGNAL</p>
        </div>

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

        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
          <StatCard label="CARDS" value={`${completedCardCount}/16`} color={S.green} />
          <StatCard label="ANSWERS" value={String(totalAnswers)} color={S.aqua} />
          <StatCard label="MEMBERS" value={String(memberCount)} color={S.gold} />
        </div>

        {/* ⭐ AI 채점 섹션 */}
        <ScoringSection
          scoring={scoring}
          isLeader={isLeader}
          inProgress={aiScoringInProgress}
          aiError={aiError}
          onScoring={handleAiScoring}
        />

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
              const isExpanded = expandedCards.has(card.cardId);
              const cardColor = CARD_COLORS[card.cardId]?.bg || S.cyan;
              const isCompleted = card.questions.some(q => q.answer.length > 0);
              const cardScore = scoring?.cardScores?.[card.cardId];

              return (
                <div key={card.cardId} className="rounded-xl overflow-hidden transition-all"
                  style={{
                    background: isExpanded ? `${cardColor}08` : 'rgba(255, 255, 255, 0.02)',
                    border: `0.5px solid ${isExpanded ? cardColor + '40' : 'rgba(255, 255, 255, 0.06)'}`,
                  }}>
                  <button onClick={() => toggleCard(card.cardId)}
                    className="w-full p-3 flex items-center gap-3 transition hover:bg-white/[0.02]">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-[12px] flex-shrink-0"
                      style={{
                        background: cardColor,
                        color: cardColor === '#FFC72C' || cardColor === S.green ? S.navy : '#fff',
                      }}>
                      {card.cardId}
                    </div>

                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{card.titleKo}</p>
                      <p className="text-[10px] text-gray-500 truncate">{card.titleEn}</p>
                    </div>

                    {cardScore && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: `${S.gold}15`,
                          color: S.gold,
                          border: `0.5px solid ${S.gold}40`,
                        }}>
                        {cardScore.score}/{cardScore.max || 30}
                      </span>
                    )}

                    {isCompleted && !cardScore && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: `${S.green}15`,
                          color: S.green,
                          border: `0.5px solid ${S.green}40`,
                        }}>
                        ✓
                      </span>
                    )}

                    <span className="text-gray-500 transition-transform"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 space-y-3">
                      {card.questions.map((q, qIdx) => {
                        const qScore = cardScore?.questions?.find(qs => qs.id === q.id);
                        return (
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
                              <span className="text-[10px] text-gray-500 flex-1">{q.title}</span>
                              {qScore && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                                  style={{
                                    background: `${S.gold}15`,
                                    color: S.gold,
                                  }}>
                                  {qScore.score}/10
                                </span>
                              )}
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
                            {qScore?.feedback && (
                              <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-1.5">
                                <span style={{ fontSize: '10px', color: S.gold, marginTop: '1px' }}>💬</span>
                                <p className="text-[10.5px] text-gray-400 italic leading-relaxed">
                                  {qScore.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}

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

// ═══════════════════════════════════════════════════════
// AI 채점 섹션 (1회성 — 재채점 버튼 없음)
// ═══════════════════════════════════════════════════════
function ScoringSection({
  scoring,
  isLeader,
  inProgress,
  aiError,
  onScoring,
}: {
  scoring: ScoringResult | null;
  isLeader: boolean;
  inProgress: boolean;
  aiError: string | null;
  onScoring: () => void;
}) {
  if (inProgress) {
    return (
      <div className="rounded-xl p-5 mb-4 text-center"
        style={{
          background: `linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(255, 215, 0, 0.04))`,
          border: `0.5px solid ${S.purple}40`,
        }}>
        <div className="inline-block w-8 h-8 rounded-full mb-3 scoring-spinner"
          style={{ border: `2px solid ${S.purple}33`, borderTop: `2px solid ${S.purple}` }} />
        <p className="text-[13px] font-bold text-white mb-1">🤖 AI가 채점 중이에요</p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          48문항을 분석하고 있어요. 약 1~2분 소요됩니다.<br />
          페이지를 닫지 말아주세요.
        </p>
        <style jsx>{`
          .scoring-spinner { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // ⭐ 채점 완료 — 재채점 버튼 없음 (1회성)
  if (scoring) {
    const grade = scoring.percentage >= 90 ? 'S'
      : scoring.percentage >= 80 ? 'A'
      : scoring.percentage >= 70 ? 'B'
      : scoring.percentage >= 60 ? 'C'
      : 'D';

    const gradeColor = grade === 'S' ? S.gold
      : grade === 'A' ? S.green
      : grade === 'B' ? S.cyan
      : grade === 'C' ? S.aqua
      : '#888';

    return (
      <div className="rounded-xl p-5 mb-4 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradeColor}10, rgba(255, 215, 0, 0.04))`,
          border: `0.5px solid ${gradeColor}50`,
          boxShadow: `0 0 24px ${gradeColor}20`,
        }}>
        <div className="absolute top-0 left-0 right-0 h-[1px]"
          style={{ background: `linear-gradient(to right, transparent, ${gradeColor}, transparent)` }} />

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center flex-shrink-0"
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: `${gradeColor}15`,
              border: `1.5px solid ${gradeColor}`,
              boxShadow: `0 0 16px ${gradeColor}40`,
            }}>
            <p className="font-black"
              style={{
                fontSize: '32px',
                color: gradeColor,
                lineHeight: 1,
                textShadow: `0 0 8px ${gradeColor}`,
              }}>
              {grade}
            </p>
            <p className="text-[8px] font-mono tracking-wider mt-0.5" style={{ color: gradeColor }}>
              GRADE
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono font-bold tracking-widest mb-1" style={{ color: S.gold }}>
              ★ AI SCORING RESULT
            </p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="font-bold text-white" style={{ fontSize: '24px', lineHeight: 1 }}>
                {scoring.totalScore}
              </span>
              <span className="text-gray-500 text-[14px]">/ {scoring.maxScore}</span>
            </div>
            <p className="text-[12px]" style={{ color: gradeColor }}>
              {scoring.percentage}% 달성
            </p>
            {scoring.scoredAt && (
              <p className="text-[9px] font-mono text-gray-600 mt-1.5">
                채점일: {new Date(scoring.scoredAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>

        {scoring.summary && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: `${gradeColor}30` }}>
            <p className="text-[10px] font-mono font-bold tracking-widest mb-1.5" style={{ color: gradeColor }}>
              SUMMARY
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              {scoring.summary}
            </p>
          </div>
        )}

        {/* ⭐ 재채점 버튼 제거됨 — 채점 완료 표시만 */}
        <div className="mt-4 pt-3 border-t flex items-center justify-center gap-1.5"
          style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          <span style={{ fontSize: '10px', color: S.green }}>✓</span>
          <p className="text-[10px] font-mono text-gray-500 tracking-widest">
            SCORING COMPLETED · 1회성 채점이 완료되었습니다
          </p>
        </div>
      </div>
    );
  }

  if (isLeader) {
    return (
      <div className="rounded-xl p-4 mb-4"
        style={{
          background: `linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(231, 254, 85, 0.04))`,
          border: `0.5px solid ${S.purple}40`,
        }}>
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: S.purple, boxShadow: `0 0 6px ${S.purple}` }} />
          <div>
            <p className="text-[10px] font-mono font-bold tracking-widest mb-1" style={{ color: S.purple }}>
              AI SCORING
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              AI가 48문항을 자동 채점합니다 (480점 만점).<br />
              <span style={{ color: '#FFA500' }}>⚠ 한 번만 채점 가능 · 재채점 불가</span>
            </p>
          </div>
        </div>
        <button
          onClick={onScoring}
          className="w-full py-3 font-bold rounded-xl transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${S.purple} 0%, ${S.green} 100%)`,
            color: S.navy,
            fontSize: '13px',
            boxShadow: `0 0 16px ${S.purple}40`,
          }}>
          🎯 AI 채점 시작하기
        </button>

        {aiError && (
          <p className="mt-2 text-[10px] text-red-400 text-center">
            ⚠ {aiError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '0.5px solid rgba(255, 255, 255, 0.05)',
      }}>
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
        style={{ background: '#888' }} />
      <div>
        <p className="text-[10px] font-mono font-bold tracking-widest mb-1 text-gray-500">
          AI SCORING
        </p>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          AI 채점이 아직 시작되지 않았어요.<br />
          팀장이 채점을 시작하면 결과가 여기에 표시됩니다.
        </p>
      </div>
    </div>
  );
}

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
