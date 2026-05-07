// src/app/api/score-report/route.ts
// SIGNAL 1,000점 채점 시스템 v2 - 팀 점수 920점 (A+B+C+E)
// 모드: GAME_AUTO (현재 단계)

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { TeamReportData } from '@/types/report';
import {
  calculateSpeedBonusWithGate,
  detectTeamFlags,
  type ReviewFlag,
} from '@/lib/signalScoringModes';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 300; // 5분

// ═══════════════════════════════════════════════════════
// POST /api/score-report
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // 1. 보고서 데이터 가져오기
    const { data: report, error: fetchError } = await supabase
      .from('team_reports')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { error: '보고서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (report.total_score !== null && report.team_score_920 !== null) {
      return NextResponse.json(
        { error: '이미 채점이 완료된 보고서입니다' },
        { status: 400 }
      );
    }

    const reportData: TeamReportData = report.raw_data;

    if (!reportData?.cards || reportData.cards.length === 0) {
      return NextResponse.json(
        { error: '채점할 데이터가 없습니다' },
        { status: 400 }
      );
    }

    // 2. 팀 정보 가져오기 (시간 계산용)
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, class_id, game_started_at, item, level')
      .eq('id', teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: '팀 정보를 찾을 수 없습니다' }, { status: 404 });
    }

    // 3. C 영역 자동 계산 (Claude 호출 전)
    const cAreaResult = await calculateCArea({
      teamId,
      classId: team.class_id,
      gameStartedAt: team.game_started_at ? new Date(team.game_started_at) : null,
      generatedAt: new Date(report.generated_at || new Date()),
    });

    console.log('[채점] C 영역 자동 계산 완료:', cAreaResult);

    // 4. Claude 호출 (A + B + E)
    console.log('[채점] Claude 호출 시작...');
    const startTime = Date.now();

    const aiResult = await scoreWithClaude(reportData, team.item, team.level);

    console.log(`[채점] Claude 응답 (${Date.now() - startTime}ms)`);

    // 5. 점수 통합 + 게이트 적용
    const a_score = aiResult.a_score;
    const b_score = aiResult.b_score;
    const e_score = aiResult.e_score;

    // A+B 게이트
    let c_score = cAreaResult.timeScore + cAreaResult.rankScore;
    const teamFlags: ReviewFlag[] = [];

    const speedBonusResult = calculateSpeedBonusWithGate({
      A_questionCardQuality: a_score,
      B_strategicCoherence: b_score,
      timeScore: cAreaResult.timeScore,
      rankScore: cAreaResult.rankScore,
      teamId,
    });
    c_score = speedBonusResult.score;
    if (speedBonusResult.flag) {
      teamFlags.push(speedBonusResult.flag);
    }

    const team_score_920 = a_score + b_score + c_score + e_score;

    // 6. DB 저장
    const { error: updateError } = await supabase
      .from('team_reports')
      .update({
        // 영역별 점수
        a_score,
        b_score,
        c_score,
        e_score,
        team_score_920,
        // 기존 호환성 (total_score는 이제 920 기준)
        total_score: team_score_920,
        card_scores: aiResult.cardScores,  // 카드별 점수
        // 세부 정보
        area_breakdown: {
          A: {
            questions: aiResult.areaA_questions,
            strategies: aiResult.areaA_strategies,
            total: a_score,
            max: 640,
          },
          B: {
            details: aiResult.areaB_coherence,
            total: b_score,
            max: 160,
          },
          C: {
            timeScore: cAreaResult.timeScore,
            rankScore: cAreaResult.rankScore,
            timeDays: cAreaResult.timeDays,
            rank: cAreaResult.rank,
            totalTeams: cAreaResult.totalTeams,
            total: c_score,
            max: 80,
            gateApplied: speedBonusResult.flag !== undefined,
          },
          E: {
            details: aiResult.areaE_presentation,
            total: e_score,
            max: 40,
          },
          summary: aiResult.summary,
          strengths: aiResult.strengths,
          improvements: aiResult.improvements,
          nextActions: aiResult.nextActions,
        },
        team_review_flags: teamFlags,
        scoring_mode: 'GAME_AUTO',
        scored_at: new Date().toISOString(),
        status: 'final',
      })
      .eq('team_id', teamId);

    if (updateError) {
      console.error('DB 저장 실패:', updateError);
      return NextResponse.json(
        { error: 'DB 저장 실패: ' + updateError.message },
        { status: 500 }
      );
    }

    // 7. 응답
    return NextResponse.json({
      success: true,
      teamId,
      a_score,
      b_score,
      c_score,
      e_score,
      team_score_920,
      maxScore: 920,
      percentage: Math.round((team_score_920 / 920) * 1000) / 10,
      cardScores: aiResult.cardScores,
      areaBreakdown: {
        A: { total: a_score, max: 640 },
        B: { total: b_score, max: 160 },
        C: { total: c_score, max: 80, gateApplied: speedBonusResult.flag !== undefined },
        E: { total: e_score, max: 40 },
      },
      summary: aiResult.summary,
      strengths: aiResult.strengths,
      improvements: aiResult.improvements,
      nextActions: aiResult.nextActions,
      teamFlags,
    });

  } catch (error: any) {
    console.error('채점 에러:', error);
    return NextResponse.json(
      {
        error: error?.message || '채점 중 오류가 발생했습니다',
        details: error?.stack,
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════
// C 영역 자동 계산 (시간 + 순위)
// ═══════════════════════════════════════════════════════
async function calculateCArea(params: {
  teamId: string;
  classId: string | null;
  gameStartedAt: Date | null;
  generatedAt: Date;
}): Promise<{
  timeScore: number;
  rankScore: number;
  timeDays: number;
  rank: number;
  totalTeams: number;
}> {
  const { teamId, classId, gameStartedAt, generatedAt } = params;

  // 1. 시간 점수 (40점)
  let timeScore = 40;
  let timeDays = 0;

  if (gameStartedAt) {
    timeDays = (generatedAt.getTime() - gameStartedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (timeDays <= 7) timeScore = 40;
    else if (timeDays <= 14) timeScore = 30;
    else if (timeDays <= 21) timeScore = 20;
    else timeScore = 10;
  }

  // 2. 순위 점수 (40점) — 같은 클래스 내 다른 팀들과 비교
  let rankScore = 40;
  let rank = 1;
  let totalTeams = 1;

  if (classId) {
    const { data: classTeams } = await supabase
      .from('team_reports')
      .select('team_id, generated_at, teams!inner(class_id)')
      .eq('teams.class_id', classId)
      .not('generated_at', 'is', null);

    if (classTeams && classTeams.length > 1) {
      const sorted = classTeams
        .filter((t: any) => t.generated_at)
        .sort((a: any, b: any) =>
          new Date(a.generated_at).getTime() - new Date(b.generated_at).getTime()
        );

      const myIndex = sorted.findIndex((t: any) => t.team_id === teamId);
      totalTeams = sorted.length;

      if (myIndex >= 0) {
        rank = myIndex + 1;
        const percentile = myIndex / totalTeams;

        if (myIndex === 0) rankScore = 40;        // 1등
        else if (percentile < 0.3) rankScore = 30; // 상위 30%
        else if (percentile < 0.6) rankScore = 20; // 상위 60%
        else rankScore = 10;
      }
    }
  }

  return { timeScore, rankScore, timeDays, rank, totalTeams };
}

// ═══════════════════════════════════════════════════════
// Claude 호출 - A + B + E 영역 채점
// ═══════════════════════════════════════════════════════
async function scoreWithClaude(
  reportData: TeamReportData,
  item: string,
  level: string
): Promise<{
  a_score: number;
  b_score: number;
  e_score: number;
  areaA_questions: any;
  areaA_strategies: any;
  areaB_coherence: any;
  areaE_presentation: any;
  cardScores: Record<string, any>;  // 카드별 점수
  summary: string;
  strengths: string[];
  improvements: string[];
  nextActions: string[];
}> {
  const prompt = buildScoringPrompt(reportData, item, level);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude 응답에서 텍스트를 찾을 수 없습니다');
  }

  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('JSON 파싱 실패. 응답:', jsonText.slice(0, 1000));
    throw new Error('Claude 응답을 JSON으로 파싱할 수 없습니다');
  }

  // 영역별 점수 합산
  let a_questions_total = 0;
  let a_strategies_total = 0;
  const cardScores: Record<string, any> = {};

  for (const cardId of Object.keys(parsed.areaA_questions || {})) {
    const card = parsed.areaA_questions[cardId];
    const cardQuestionScore =
      (card.Q1?.score || 0) + (card.Q2?.score || 0) + (card.Q3?.score || 0);
    a_questions_total += cardQuestionScore;

    const strategyScore = parsed.areaA_strategies?.[cardId]?.score || 0;
    a_strategies_total += strategyScore;

    cardScores[cardId] = {
      score: cardQuestionScore + strategyScore,
      max: 40,
      questions: [
        { id: `${cardId}-1`, score: card.Q1?.score || 0, breakdown: card.Q1?.breakdown, feedback: card.Q1?.feedback },
        { id: `${cardId}-2`, score: card.Q2?.score || 0, breakdown: card.Q2?.breakdown, feedback: card.Q2?.feedback },
        { id: `${cardId}-3`, score: card.Q3?.score || 0, breakdown: card.Q3?.breakdown, feedback: card.Q3?.feedback },
      ],
      strategy: parsed.areaA_strategies?.[cardId],
    };
  }

  const a_score = a_questions_total + a_strategies_total;

  let b_score = 0;
  for (const key of Object.keys(parsed.areaB_coherence || {})) {
    b_score += parsed.areaB_coherence[key]?.score || 0;
  }

  const e_score = (parsed.areaE_presentation?.clarity || 0) +
                  (parsed.areaE_presentation?.evidence || 0) +
                  (parsed.areaE_presentation?.feasibility || 0) +
                  (parsed.areaE_presentation?.qaResponse || 0);

  return {
    a_score,
    b_score,
    e_score,
    areaA_questions: parsed.areaA_questions || {},
    areaA_strategies: parsed.areaA_strategies || {},
    areaB_coherence: parsed.areaB_coherence || {},
    areaE_presentation: parsed.areaE_presentation || {},
    cardScores,
    summary: parsed.summary || '',
    strengths: parsed.strengths || [],
    improvements: parsed.improvements || [],
    nextActions: parsed.nextActions || [],
  };
}

// ═══════════════════════════════════════════════════════
// 채점 프롬프트 빌더
// ═══════════════════════════════════════════════════════
function buildScoringPrompt(
  reportData: TeamReportData,
  item: string,
  level: string
): string {
  const { team, cards } = reportData;

  // 답변 직렬화
  const cardsForPrompt = cards.map(c => ({
    cardId: c.cardId,
    titleKo: c.titleKo,
    questions: c.questions.map(q => ({
      id: q.id,
      title: q.title,
      answer: q.answer || '(미작성)',
      interimSummary: q.interimBlanks?.filter(b => b).join(' / ') || '',
    })),
    oneSentenceStrategy: c.oneSentenceStrategy || '(미작성)',
  }));

  return `당신은 SIGNAL 디지털무역 전략 카드게임의 평가자입니다.
한 팀의 16개 카드 답변을 받아서 1,000점 만점 중 920점(팀 점수)을 채점하세요.
나머지 80점(개인 점수)은 별도로 처리됩니다.

# 평가 목적
- 정답 여부가 아니라 디지털무역 전략의 근거성, 논리성, 실행 가능성, 카드 간 정합성을 평가
- AI는 평가 보조자이며, 평가 근거를 함께 제시

# 팀 정보
- 팀명: ${team.teamName}
- 아이템: ${item}
- 레벨: ${level}
- 팀원: ${team.members.length}명

# 16카드 답변
${JSON.stringify(cardsForPrompt, null, 2)}

# 채점 기준 (총 840점 = A 640 + B 160 + E 40)

## A 영역. 질문카드 및 주제카드 품질 (640점)

### A-1. 질문카드 (480점)
48개 질문카드 × 10점

각 질문카드 10점 기준:
- hiddenGovernanceKeys 충족도: 5점 (숨은 평가키 핵심 요소가 답변에 포함)
- 논리성: 2점 (원인·근거·판단·결론이 연결)
- 아이템 맞춤성: 2점 (${item}에 맞게 적용)
- 표현 명확성: 1점 (읽고 이해하기 쉬움)

### A-2. 한 문장 전략 (160점)
16개 카드 × 10점

각 한 문장 전략 10점 기준:
- 카드 주제 반영: 5점
- 구체성·실행가능성: 3점
- 명확한 표현: 2점

## B 영역. 전략 정합성 (160점)
- B-1. 산업-고객 정합성 (25점): 카드 01 산업 정의 ↔ 카드 07 고객 인사이트
- B-2. 시장-타깃 정합성 (25점): 카드 02·03 시장 분석 ↔ 카드 09 우선시장 결정
- B-3. 경쟁-차별화 정합성 (25점): 카드 04 경쟁환경 ↔ 카드 08 SWOT
- B-4. 규제-TBT 정합성 (25점): 카드 06 규제 ↔ 카드 16 TBT
- B-5. PoC-진출국 정합성 (30점): 카드 10 PoC ↔ 카드 11 진출국
- B-6. 바이어-제안 정합성 (30점): 카드 14 타깃 ↔ 카드 09·11 전략

## E 영역. 발표 품질 (40점) — 답변 기반 임시 채점
※ 발표 데이터가 없으므로 답변 내용 기반으로 임시 채점 (운영자 발표 후 확정)
- 핵심 전략 명확성 (10점): 한 문장으로 전략 설명 가능?
- 근거 활용 (10점): 시장·고객·경쟁·규제·PoC 근거 활용?
- 실행 가능성 설명 (10점): 다음 액션이 구체적?
- 질문 대응 (10점): 답변이 논리적?

# 출력 형식 (JSON만, 다른 텍스트 절대 포함 금지)
\`\`\`json
{
  "areaA_questions": {
    "01": {
      "Q1": {
        "score": 8,
        "breakdown": {
          "hiddenGovernanceKeys": 4,
          "logic": 2,
          "itemFit": 1,
          "clarity": 1
        },
        "feedback": "근거가 명확하지만 ${item}에 맞춰 더 구체화 필요"
      },
      "Q2": { "score": ..., "breakdown": {...}, "feedback": "..." },
      "Q3": { "score": ..., "breakdown": {...}, "feedback": "..." }
    },
    "02": { ... },
    ... (16개 카드 모두)
  },
  "areaA_strategies": {
    "01": { "score": 9, "feedback": "한 문장 전략이 명확함" },
    "02": { "score": ..., "feedback": "..." },
    ... (16개 카드 모두)
  },
  "areaB_coherence": {
    "B1_industryCustomer": { "score": 22, "feedback": "산업 정의와 고객 인사이트가 잘 연결됨" },
    "B2_marketTarget": { "score": 23, "feedback": "..." },
    "B3_competitiveDifferentiation": { "score": 21, "feedback": "..." },
    "B4_regulationTBT": { "score": 20, "feedback": "..." },
    "B5_pocCountry": { "score": 25, "feedback": "..." },
    "B6_buyerProposal": { "score": 25, "feedback": "..." }
  },
  "areaE_presentation": {
    "clarity": 8,
    "evidence": 7,
    "feasibility": 8,
    "qaResponse": 7,
    "feedback": "발표 데이터 없음. 답변 기반 임시 채점. 발표 후 확정 필요."
  },
  "summary": "전체 평가 요약 (200자 정도, 팀의 강점과 보완점을 균형있게)",
  "strengths": [
    "강점 1 (구체적, 근거 포함)",
    "강점 2",
    "강점 3"
  ],
  "improvements": [
    "보완점 1 (구체적, 어떤 부분 어떻게)",
    "보완점 2",
    "보완점 3"
  ],
  "nextActions": [
    "다음 액션 1 (실제 수출 전략으로 발전시키기 위한)",
    "다음 액션 2",
    "다음 액션 3",
    "다음 액션 4",
    "다음 액션 5"
  ]
}
\`\`\`

# 주의사항
1. 16개 카드 모두 평가 (cardId: "01" ~ "16")
2. JSON 외 다른 텍스트 절대 포함 금지
3. score는 정수 (소수점 없음)
4. feedback은 1~2문장의 구체적 평가
5. ${item} 아이템 맞춤성을 적극 반영
6. 미작성 답변은 0점 처리`;
}
