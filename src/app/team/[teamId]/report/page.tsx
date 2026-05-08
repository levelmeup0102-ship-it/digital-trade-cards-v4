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
  pink: '#FF6FB5',
  navy: '#050505',
  red: '#FF6B6B',
};

// ─── 등급 색상 ───
function getGradeColor(grade: string): string {
  switch (grade) {
    case 'S': return S.gold;
    case 'A': return S.green;
    case 'B': return S.cyan;
    case 'C': return S.aqua;
    case 'D': return '#888';
    default: return '#888';
  }
}

function getGrade(score: number): string {
  if (score >= 900) return 'S';
  if (score >= 800) return 'A';
  if (score >= 700) return 'B';
  if (score >= 600) return 'C';
  return 'D';
}

// ─── 타입 ───
interface AreaBreakdown {
  A: { questions: any; strategies: any; total: number; max: number };
  B: { details: any; total: number; max: number };
  C: {
    timeScore: number;
    rankScore: number;
    timeDays: number;
    rank: number;
    totalTeams: number;
    total: number;
    max: number;
    gateApplied: boolean;
  };
  E: { details: any; total: number; max: number };
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
}

interface TeamScoring {
  team_score_920: number;
  a_score: number;
  b_score: number;
  c_score: number;
  e_score: number;
  cardScores: Record<string, any>;
  areaBreakdown: AreaBreakdown;
  scoredAt: string | null;
}

interface PersonalScore {
  memberId: string;
  name: string;
  role: string;
  ai_role_output_40: number;
  behavior_analysis_40: number;
  personal_score_80: number;
  final_score_1000: number;
  grade: string;
  review_flags: any[];
  ai_analysis?: { breakdown: any; feedback: string };
  behavior_analysis?: any;
}

interface PolishedData {
  executiveSummary: string;
  cards: Record<string, {
    cardId: string;
    titleKo: string;
    intro: string;
    narrative: string;
    strategy: string;
    bridge: string;
  }>;
  conclusion: string;
}

// ═══════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════
export default function TeamReportPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params.teamId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TeamReportData | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const [teamScoring, setTeamScoring] = useState<TeamScoring | null>(null);
  const [personalScores, setPersonalScores] = useState<PersonalScore[]>([]);
  const [isLeader, setIsLeader] = useState(false);

  // ⭐ v2: sessionStorage 비어있을 때 멤버 선택 모달
  const [showMemberSelect, setShowMemberSelect] = useState(false);

  const [aiScoringInProgress, setAiScoringInProgress] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [polished, setPolished] = useState<PolishedData | null>(null);
  const [polishedAt, setPolishedAt] = useState<string | null>(null);
  const [polishingInProgress, setPolishingInProgress] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      try {
        let stored = await getStoredReport(teamId);
        if (!stored) {
          stored = await generateTeamReport(teamId);
        }
        setReport(stored);
        await loadAllData(stored);
        setLoading(false);
      } catch (e: any) {
        console.error('보고서 로드 실패', e);
        setError(e?.message || '보고서를 불러올 수 없어요');
        setLoading(false);
      }
    })();
  }, [teamId]);

  async function loadAllData(reportData: TeamReportData) {
    try {
      // 팀 점수 로드
      const { data: dbReport } = await supabase
        .from('team_reports')
        .select('team_score_920, a_score, b_score, c_score, e_score, card_scores, area_breakdown, scored_at, ai_polished, ai_polished_at')
        .eq('team_id', teamId)
        .single();

      if (dbReport && dbReport.team_score_920 !== null) {
        setTeamScoring({
          team_score_920: dbReport.team_score_920,
          a_score: dbReport.a_score || 0,
          b_score: dbReport.b_score || 0,
          c_score: dbReport.c_score || 0,
          e_score: dbReport.e_score || 0,
          cardScores: dbReport.card_scores || {},
          areaBreakdown: dbReport.area_breakdown,
          scoredAt: dbReport.scored_at,
        });
      }

      // 다듬기 결과
      if (dbReport?.ai_polished) {
        try {
          const parsed = JSON.parse(dbReport.ai_polished);
          setPolished(parsed);
          setPolishedAt(dbReport.ai_polished_at);
        } catch (e) {
          console.error('다듬기 데이터 파싱 실패', e);
        }
      }

      // 개인 점수 로드
      const { data: personals } = await supabase
        .from('personal_scores')
        .select(`
          *,
          team_members!inner(name, role_code)
        `)
        .eq('team_id', teamId);

      if (personals && personals.length > 0) {
        setPersonalScores(personals.map((p: any) => ({
          memberId: p.member_id,
          name: p.team_members?.name || '?',
          role: p.team_members?.role_code || 'unknown',
          ai_role_output_40: p.ai_role_output_40 || 0,
          behavior_analysis_40: p.behavior_analysis_40 || 0,
          personal_score_80: p.personal_score_80 || 0,
          final_score_1000: p.final_score_1000 || 0,
          grade: p.grade || 'D',
          review_flags: p.review_flags || [],
          ai_analysis: p.ai_analysis,
          behavior_analysis: p.behavior_analysis,
        })));
      }

      // ⭐ v2: 팀장 여부 결정 — sessionStorage 비어있으면 멤버 선택 모달 표시
      const myMemberId = typeof window !== 'undefined' ? sessionStorage.getItem('memberId') : null;
      if (myMemberId && reportData.team.members) {
        const me = reportData.team.members.find((m: any) => m.id === myMemberId);
        if (me?.isLeader) setIsLeader(true);
      } else if (!myMemberId && reportData.team.members && reportData.team.members.length > 0) {
        setShowMemberSelect(true);
      }

      const url = new URL(window.location.href);
      if (url.searchParams.get('leader') === '1') {
        setIsLeader(true);
        setShowMemberSelect(false);
      }
    } catch (e) {
      console.error('데이터 로드 실패', e);
    }
  }

  // ⭐ v2: 멤버 선택 모달에서 자기 자신 선택 시
  const handleMemberSelect = (memberId: string, leader: boolean) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('memberId', memberId);
    }
    if (leader) setIsLeader(true);
    setShowMemberSelect(false);
  };

  // ⭐ AI 채점 — 팀 920 + 개인 80 자동 연쇄
  async function handleAiScoring() {
    if (!isLeader) {
      alert('팀장만 채점할 수 있어요!');
      return;
    }

    if (teamScoring) {
      alert('이미 채점이 완료된 보고서예요.\n채점은 한 번만 가능합니다.');
      return;
    }

    const ok = confirm(
      '🎯 AI 채점을 시작합니다.\n\n' +
      '• 1,000점 만점 채점 (팀 920 + 개인 80)\n' +
      '• 약 3~5분 소요됩니다\n' +
      '• 한 번만 실행할 수 있어요\n' +
      '• 신중히 진행해주세요\n\n' +
      '계속하시겠어요?'
    );
    if (!ok) return;

    setAiScoringInProgress(true);
    setAiError(null);

    try {
      console.log('[채점] 팀 점수 채점 시작...');
      const teamRes = await fetch('/api/score-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!teamRes.ok) {
        const data = await teamRes.json();
        throw new Error(data.error || '팀 채점에 실패했습니다');
      }

      console.log('[채점] 팀 점수 완료. 개인 점수 시작...');

      const personalRes = await fetch('/api/score-personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!personalRes.ok) {
        const data = await personalRes.json();
        console.warn('개인 점수 채점 실패:', data.error);
      }

      console.log('[채점] 모든 채점 완료. 데이터 다시 로드...');

      if (report) await loadAllData(report);

      alert('🎉 채점 완료! 결과를 확인하세요.');
    } catch (e: any) {
      console.error('AI 채점 에러:', e);
      setAiError(e?.message || '채점 중 오류가 발생했습니다');
      alert('❌ 채점 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setAiScoringInProgress(false);
    }
  }

  // ⭐ AI 다듬기
  async function handlePolishing() {
    if (!isLeader) {
      alert('팀장만 다듬기를 실행할 수 있어요!');
      return;
    }

    if (polished) {
      alert('이미 다듬기가 완료된 보고서예요.');
      return;
    }

    const ok = confirm(
      '📝 AI 보고서 다듬기를 시작합니다.\n\n' +
      '• 약 2~3분 소요됩니다\n' +
      '• 학생 답변을 책 분량으로 변환합니다\n' +
      '• 한 번만 실행 가능해요\n\n' +
      '계속하시겠어요?'
    );
    if (!ok) return;

    setPolishingInProgress(true);
    setPolishError(null);

    try {
      const res = await fetch('/api/polish-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '다듬기 실패');
      }

      const result = await res.json();
      setPolished(result.polished);
      setPolishedAt(new Date().toISOString());

      alert('🎉 다듬기 완료!\n미리보기에서 책 분량의 보고서를 확인하세요.');
    } catch (e: any) {
      console.error('AI 다듬기 에러:', e);
      setPolishError(e?.message || '다듬기 중 오류');
      alert('❌ 다듬기 실패: ' + (e?.message || '알 수 없는 오류'));
    } finally {
      setPolishingInProgress(false);
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

      {/* ⭐ v2: 멤버 선택 모달 */}
      {showMemberSelect && (
        <MemberSelectModal
          members={team.members as any}
          onSelect={handleMemberSelect}
        />
      )}

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

        <ScoringSection
          teamScoring={teamScoring}
          personalScores={personalScores}
          isLeader={isLeader}
          inProgress={aiScoringInProgress}
          aiError={aiError}
          onScoring={handleAiScoring}
        />

        {teamScoring && <AreaScoresSection teamScoring={teamScoring} />}
        {personalScores.length > 0 && <PersonalScoresSection personalScores={personalScores} />}
        {teamScoring?.areaBreakdown && <FeedbackSection breakdown={teamScoring.areaBreakdown} />}

        <PolishingSection
          polished={polished}
          polishedAt={polishedAt}
          isLeader={isLeader}
          inProgress={polishingInProgress}
          polishError={polishError}
          onPolishing={handlePolishing}
        />

        {/* ⭐ v2: 미리보기 버튼 라벨 — 다듬기 전/후 동적 변경 */}
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
            {polished ? '📚 다듬은 보고서 미리보기' : '📖 우리 팀 답안 종합본 보기'}
          </button>
          {polished ? (
            <button
              onClick={() => router.push(`/team/${teamId}/report/preview?autoPdf=1`)}
              className="py-3 font-bold rounded-xl transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${S.purple} 0%, ${S.cyan} 100%)`,
                color: '#fff',
                fontSize: '13px',
                boxShadow: `0 0 24px rgba(139, 92, 246, 0.3)`,
              }}>
              ⬇ PDF 다운로드
            </button>
          ) : (
            <button
              disabled
              title="AI 다듬기를 먼저 완료해주세요"
              className="py-3 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '0.5px solid rgba(255, 255, 255, 0.1)',
                color: '#666',
                fontSize: '13px',
              }}>
              🔒 PDF (다듬기 후 가능)
            </button>
          )}
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
            {cards.map((card) => {
              const isExpanded = expandedCards.has(card.cardId);
              const cardColor = CARD_COLORS[card.cardId]?.bg || S.cyan;
              const isCompleted = card.questions.some(q => q.answer.length > 0);
              const cardScore = teamScoring?.cardScores?.[card.cardId];

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
                        style={{ background: `${S.gold}15`, color: S.gold, border: `0.5px solid ${S.gold}40` }}>
                        {cardScore.score}/{cardScore.max || 40}
                      </span>
                    )}

                    {isCompleted && !cardScore && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: `${S.green}15`, color: S.green, border: `0.5px solid ${S.green}40` }}>
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
                        const qScore = cardScore?.questions?.find((qs: any) => qs.id === q.id);
                        return (
                          <div key={q.id} className="rounded-lg p-2.5"
                            style={{ background: 'rgba(0, 0, 0, 0.3)', border: '0.5px solid rgba(255, 255, 255, 0.05)' }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ fontSize: '9px', background: `${cardColor}22`, color: cardColor }}>
                                Q{qIdx + 1}
                              </span>
                              <span className="text-[10px] text-gray-500 flex-1">{q.title}</span>
                              {qScore && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${S.gold}15`, color: S.gold }}>
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
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="font-mono font-bold tracking-widest"
                              style={{ fontSize: '9px', color: cardColor }}>
                              ★ ONE SENTENCE STRATEGY
                            </p>
                            {cardScore?.strategy && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: `${S.gold}15`, color: S.gold }}>
                                {cardScore.strategy.score}/10
                              </span>
                            )}
                          </div>
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
// ⭐ v2: 멤버 선택 모달 — sessionStorage 비어있을 때
// ═══════════════════════════════════════════════════════
function MemberSelectModal({
  members,
  onSelect,
}: {
  members: { id: string; name: string; roleCode: string; isLeader: boolean }[];
  onSelect: (memberId: string, isLeader: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
      }}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden"
        style={{
          background: `linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(10, 10, 20, 0.98))`,
          border: `0.5px solid ${S.gold}40`,
          boxShadow: `0 0 60px rgba(255, 215, 0, 0.15), 0 16px 48px rgba(0,0,0,0.6)`,
        }}>
        <div className="p-5 text-center"
          style={{ borderBottom: `0.5px solid rgba(255, 215, 0, 0.15)` }}>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
            <span className="font-mono font-bold tracking-[3px]"
              style={{ fontSize: '9px', color: S.gold }}>
              IDENTIFY YOURSELF
            </span>
            <div className="w-1 h-1 rounded-full" style={{ background: S.gold, boxShadow: `0 0 6px ${S.gold}` }} />
          </div>
          <h2 className="text-[16px] font-bold text-white mb-1">
            누구신가요?
          </h2>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            본인을 선택하면 보고서 권한이 활성화돼요
          </p>
        </div>

        <div className="p-3 space-y-2">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id, m.isLeader)}
              className="w-full p-3 rounded-xl flex items-center gap-3 transition-all hover:scale-[1.02]"
              style={{
                background: m.isLeader
                  ? `linear-gradient(135deg, ${S.gold}15, ${S.green}08)`
                  : 'rgba(255, 255, 255, 0.04)',
                border: `0.5px solid ${m.isLeader ? S.gold + '50' : 'rgba(255, 255, 255, 0.1)'}`,
              }}>
              <div className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: m.isLeader ? `${S.gold}20` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${m.isLeader ? S.gold : 'rgba(255,255,255,0.15)'}`,
                  fontSize: '16px',
                }}>
                {m.isLeader ? '👑' : '👤'}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-bold text-white truncate">
                  {m.name}
                </p>
                <p className="text-[10px] text-gray-500 truncate font-mono">
                  {m.isLeader ? '팀장' : '팀원'} · {m.roleCode}
                </p>
              </div>
              <span className="text-gray-500 text-[12px]">→</span>
            </button>
          ))}
        </div>

        <div className="p-3 text-center"
          style={{ borderTop: `0.5px solid rgba(255, 255, 255, 0.05)` }}>
          <p className="text-[10px] text-gray-600 font-mono tracking-wider">
            ⚠ 본인이 아닌 사람을 선택하면 권한 오류가 날 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AI 채점 섹션 (1,000점)
// ═══════════════════════════════════════════════════════
function ScoringSection({
  teamScoring, personalScores, isLeader, inProgress, aiError, onScoring,
}: {
  teamScoring: TeamScoring | null;
  personalScores: PersonalScore[];
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
          1,000점 만점 채점 진행 중<br />
          (팀 점수 920 + 개인 점수 80)<br />
          약 3~5분 소요됩니다.
        </p>
        <style jsx>{`
          .scoring-spinner { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (teamScoring) {
    const hasPersonals = personalScores.length > 0;
    const avgFinal = hasPersonals
      ? Math.round(personalScores.reduce((sum, p) => sum + p.final_score_1000, 0) / personalScores.length)
      : teamScoring.team_score_920;
    const grade = getGrade(avgFinal);
    const gradeColor = getGradeColor(grade);

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
              width: '70px', height: '70px', borderRadius: '50%',
              background: `${gradeColor}15`, border: `1.5px solid ${gradeColor}`,
              boxShadow: `0 0 16px ${gradeColor}40`,
            }}>
            <p className="font-black"
              style={{
                fontSize: '32px', color: gradeColor, lineHeight: 1,
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
                {hasPersonals ? avgFinal : teamScoring.team_score_920}
              </span>
              <span className="text-gray-500 text-[14px]">/ 1,000</span>
            </div>
            <p className="text-[11px] text-gray-400">
              팀 {teamScoring.team_score_920}/920
              {hasPersonals && ` · 개인 평균 ${Math.round(personalScores.reduce((s, p) => s + p.personal_score_80, 0) / personalScores.length)}/80`}
            </p>
            {teamScoring.scoredAt && (
              <p className="text-[9px] font-mono text-gray-600 mt-1.5">
                채점일: {new Date(teamScoring.scoredAt).toLocaleDateString('ko-KR')}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-center gap-1.5"
          style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
          <span style={{ fontSize: '10px', color: S.green }}>✓</span>
          <p className="text-[10px] font-mono text-gray-500 tracking-widest">
            SCORING COMPLETED
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
              AI SCORING 1,000pt
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              AI가 1,000점 만점 자동 채점합니다.<br />
              <span style={{ fontSize: '10px', color: '#aaa' }}>
                팀 920 (질문카드+전략 정합성+속도+발표) + 개인 80 (역할 산출물+행동 분석)
              </span><br />
              <span style={{ color: '#FFA500' }}>⚠ 한 번만 채점 가능 · 재채점 불가</span>
            </p>
          </div>
        </div>
        <button
          onClick={onScoring}
          className="w-full py-3 font-bold rounded-xl transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${S.purple} 0%, ${S.green} 100%)`,
            color: S.navy, fontSize: '13px',
            boxShadow: `0 0 16px ${S.purple}40`,
          }}>
          🎯 AI 채점 시작하기 (1,000점)
        </button>
        {aiError && <p className="mt-2 text-[10px] text-red-400 text-center">⚠ {aiError}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '0.5px solid rgba(255, 255, 255, 0.05)',
      }}>
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#888' }} />
      <div>
        <p className="text-[10px] font-mono font-bold tracking-widest mb-1 text-gray-500">
          AI SCORING
        </p>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          AI 채점이 아직 시작되지 않았어요.<br />
          팀장이 채점을 시작하면 결과가 표시됩니다.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 영역별 점수 (A/B/C/E)
// ═══════════════════════════════════════════════════════
function AreaScoresSection({ teamScoring }: { teamScoring: TeamScoring }) {
  const areas = [
    { key: 'A', label: '질문카드+전략', score: teamScoring.a_score, max: 640, color: S.purple },
    { key: 'B', label: '전략 정합성', score: teamScoring.b_score, max: 160, color: S.cyan },
    { key: 'C', label: '속도 보너스', score: teamScoring.c_score, max: 80, color: S.green },
    { key: 'E', label: '발표 품질 (임시)', score: teamScoring.e_score, max: 40, color: S.gold },
  ];

  return (
    <div className="rounded-xl p-4 mb-4"
      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '0.5px solid rgba(255, 255, 255, 0.05)' }}>
      <p className="text-[10px] font-mono font-bold tracking-widest mb-3 text-gray-400">
        ★ TEAM SCORE BREAKDOWN (920pt)
      </p>
      <div className="space-y-2.5">
        {areas.map(area => {
          const pct = Math.round((area.score / area.max) * 100);
          return (
            <div key={area.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded"
                    style={{ background: `${area.color}20`, color: area.color }}>
                    {area.key}
                  </span>
                  <span className="text-[12px] text-gray-300">{area.label}</span>
                </div>
                <span className="text-[11px] font-mono font-bold" style={{ color: area.color }}>
                  {area.score}/{area.max}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(to right, ${area.color}80, ${area.color})`,
                    boxShadow: `0 0 8px ${area.color}80`,
                  }} />
              </div>
            </div>
          );
        })}

        {teamScoring.areaBreakdown?.C?.gateApplied && (
          <div className="mt-2 p-2 rounded-lg flex items-start gap-1.5"
            style={{ background: 'rgba(255, 165, 0, 0.08)', border: '0.5px solid rgba(255, 165, 0, 0.2)' }}>
            <span style={{ color: '#FFA500', fontSize: '10px', marginTop: '1px' }}>⚠</span>
            <p className="text-[10.5px] text-gray-400 leading-relaxed">
              A+B 합계가 600점 미만이라 속도 보너스 0점 처리됨
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 학생별 개인 점수
// ═══════════════════════════════════════════════════════
function PersonalScoresSection({ personalScores }: { personalScores: PersonalScore[] }) {
  const sorted = [...personalScores].sort((a, b) => b.personal_score_80 - a.personal_score_80);

  return (
    <div className="rounded-xl p-4 mb-4"
      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '0.5px solid rgba(255, 255, 255, 0.05)' }}>
      <p className="text-[10px] font-mono font-bold tracking-widest mb-3 text-gray-400">
        ★ PERSONAL SCORES (80pt × 팀원)
      </p>

      <div className="space-y-2">
        {sorted.map(p => {
          const gradeColor = getGradeColor(p.grade);
          const hasFlags = p.review_flags && p.review_flags.length > 0;

          return (
            <div key={p.memberId} className="rounded-lg p-3"
              style={{ background: 'rgba(0, 0, 0, 0.2)', border: `0.5px solid ${gradeColor}30` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-white truncate">{p.name}</span>
                  <span className="text-[9px] font-mono text-gray-500 truncate">{p.role}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${gradeColor}20`, color: gradeColor }}>
                    {p.grade}
                  </span>
                  <span className="text-[12px] font-bold text-white">
                    {p.final_score_1000}<span className="text-gray-500 text-[10px]">/1000</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">AI 역할 산출물</span>
                  <span className="text-gray-300 font-mono">{p.ai_role_output_40}/40</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">행동 분석</span>
                  <span className="text-gray-300 font-mono">{p.behavior_analysis_40}/40</span>
                </div>
              </div>

              {hasFlags && (
                <div className="mt-2 pt-2 border-t flex flex-wrap gap-1"
                  style={{ borderColor: 'rgba(255, 165, 0, 0.2)' }}>
                  {p.review_flags.map((flag: any, idx: number) => (
                    <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(255, 165, 0, 0.1)', color: '#FFA500',
                        border: '0.5px solid rgba(255, 165, 0, 0.3)',
                      }}>
                      🚩 {flag.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 강점/보완점/액션
// ═══════════════════════════════════════════════════════
function FeedbackSection({ breakdown }: { breakdown: AreaBreakdown }) {
  const hasContent = breakdown.summary || breakdown.strengths?.length || breakdown.improvements?.length || breakdown.nextActions?.length;
  if (!hasContent) return null;

  return (
    <div className="rounded-xl p-4 mb-4"
      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '0.5px solid rgba(255, 255, 255, 0.05)' }}>
      <p className="text-[10px] font-mono font-bold tracking-widest mb-3 text-gray-400">
        ★ AI FEEDBACK
      </p>

      {breakdown.summary && (
        <div className="rounded-lg p-3 mb-3"
          style={{ background: 'rgba(255, 215, 0, 0.06)', border: '0.5px solid rgba(255, 215, 0, 0.2)' }}>
          <p className="text-[10px] font-mono font-bold tracking-widest mb-1.5" style={{ color: S.gold }}>
            SUMMARY
          </p>
          <p className="text-[12px] text-gray-300 leading-relaxed">{breakdown.summary}</p>
        </div>
      )}

      {breakdown.strengths?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono font-bold tracking-widest mb-1.5" style={{ color: S.green }}>
            ✓ 강점
          </p>
          <ul className="space-y-1">
            {breakdown.strengths.map((s, i) => (
              <li key={i} className="text-[12px] text-gray-300 leading-relaxed flex gap-2">
                <span style={{ color: S.green, fontSize: '11px', marginTop: '1px' }}>•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {breakdown.improvements?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-mono font-bold tracking-widest mb-1.5" style={{ color: '#FFA500' }}>
            △ 보완점
          </p>
          <ul className="space-y-1">
            {breakdown.improvements.map((s, i) => (
              <li key={i} className="text-[12px] text-gray-300 leading-relaxed flex gap-2">
                <span style={{ color: '#FFA500', fontSize: '11px', marginTop: '1px' }}>•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {breakdown.nextActions?.length > 0 && (
        <div>
          <p className="text-[10px] font-mono font-bold tracking-widest mb-1.5" style={{ color: S.cyan }}>
            → 다음 액션
          </p>
          <ol className="space-y-1">
            {breakdown.nextActions.map((s, i) => (
              <li key={i} className="text-[12px] text-gray-300 leading-relaxed flex gap-2">
                <span className="font-mono" style={{ color: S.cyan, fontSize: '11px', marginTop: '1px' }}>{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// AI 다듬기 섹션
// ═══════════════════════════════════════════════════════
function PolishingSection({
  polished, polishedAt, isLeader, inProgress, polishError, onPolishing,
}: {
  polished: PolishedData | null;
  polishedAt: string | null;
  isLeader: boolean;
  inProgress: boolean;
  polishError: string | null;
  onPolishing: () => void;
}) {
  if (inProgress) {
    return (
      <div className="rounded-xl p-5 mb-4 text-center"
        style={{
          background: `linear-gradient(135deg, rgba(255, 111, 181, 0.08), rgba(255, 215, 0, 0.04))`,
          border: `0.5px solid ${S.pink}40`,
        }}>
        <div className="inline-block w-8 h-8 rounded-full mb-3 polish-spinner"
          style={{ border: `2px solid ${S.pink}33`, borderTop: `2px solid ${S.pink}` }} />
        <p className="text-[13px] font-bold text-white mb-1">📝 AI가 보고서를 다듬고 있어요</p>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          16개 카드를 책 분량으로 변환 중<br />
          약 2~3분 소요됩니다.
        </p>
        <style jsx>{`
          .polish-spinner { animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (polished) {
    return (
      <div className="rounded-xl p-4 mb-4"
        style={{
          background: `linear-gradient(135deg, ${S.pink}10, rgba(255, 215, 0, 0.04))`,
          border: `0.5px solid ${S.pink}50`,
        }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center flex-shrink-0"
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: `${S.pink}20`, border: `1px solid ${S.pink}`,
            }}>
            <span style={{ fontSize: '18px' }}>📝</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-mono font-bold tracking-widest" style={{ color: S.pink }}>
              POLISHED REPORT
            </p>
            <p className="text-[12px] font-bold text-white">책 분량 보고서 완성</p>
          </div>
        </div>

        {polished.executiveSummary && (
          <div className="rounded-lg p-3 mb-2"
            style={{ background: 'rgba(0, 0, 0, 0.2)', border: '0.5px solid rgba(255, 255, 255, 0.05)' }}>
            <p className="text-[10px] font-mono font-bold tracking-widest mb-1.5" style={{ color: S.pink }}>
              SUMMARY
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">{polished.executiveSummary}</p>
          </div>
        )}

        <p className="text-[10px] text-center" style={{ color: S.pink }}>
          👁 미리보기에서 책 형식으로 확인하세요
        </p>
      </div>
    );
  }

  if (isLeader) {
    return (
      <div className="rounded-xl p-4 mb-4"
        style={{
          background: `linear-gradient(135deg, rgba(255, 111, 181, 0.08), rgba(255, 215, 0, 0.04))`,
          border: `0.5px solid ${S.pink}40`,
        }}>
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: S.pink, boxShadow: `0 0 6px ${S.pink}` }} />
          <div>
            <p className="text-[10px] font-mono font-bold tracking-widest mb-1" style={{ color: S.pink }}>
              AI POLISHING
            </p>
            <p className="text-[12px] text-gray-300 leading-relaxed">
              학생 답변을 책 분량 보고서로 변환합니다.<br />
              <span style={{ color: '#FFA500' }}>⚠ 한 번만 가능 · 약 2~3분</span>
            </p>
          </div>
        </div>
        <button onClick={onPolishing}
          className="w-full py-3 font-bold rounded-xl transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${S.pink} 0%, ${S.gold} 100%)`,
            color: S.navy, fontSize: '13px',
            boxShadow: `0 0 16px ${S.pink}40`,
          }}>
          📝 AI 보고서 다듬기 시작
        </button>
        {polishError && <p className="mt-2 text-[10px] text-red-400 text-center">⚠ {polishError}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl p-3 mb-4 flex items-start gap-2.5"
      style={{ background: 'rgba(255, 255, 255, 0.02)', border: '0.5px solid rgba(255, 255, 255, 0.05)' }}>
      <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#888' }} />
      <div>
        <p className="text-[10px] font-mono font-bold tracking-widest mb-1 text-gray-500">
          AI POLISHING
        </p>
        <p className="text-[12px] text-gray-500 leading-relaxed">
          AI 보고서 다듬기가 아직 시작되지 않았어요.
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
          fontSize: '24px', color: color, letterSpacing: '-0.5px', lineHeight: 1,
          textShadow: `0 0 12px ${color}80`,
        }}>
        {value}
      </div>
      <div className="font-mono"
        style={{ fontSize: '9px', color: `${color}B3`, letterSpacing: '1.5px' }}>
        {label}
      </div>
    </div>
  );
}
