// src/app/api/score-personal/route.ts
// SIGNAL 1,000점 채점 시스템 - 개인 점수 80점 (GAME_AUTO 모드)
// AI 역할 산출물 40 + 행동 분석 40

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  calculateBehaviorScore40,
  detectPersonalFlags,
  getGrade,
  type BehaviorMetrics,
  type ReviewFlag,
} from '@/lib/signalScoringModes';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 300;

// ═══════════════════════════════════════════════════════
// POST /api/score-personal
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

    // 1. 팀 점수 조회 (반드시 920점 채점이 끝나있어야 함)
    const { data: report, error: reportError } = await supabase
      .from('team_reports')
      .select('team_score_920, raw_data, scoring_mode')
      .eq('team_id', teamId)
      .single();

    if (reportError || !report) {
      return NextResponse.json({ error: '보고서를 찾을 수 없습니다' }, { status: 404 });
    }

    if (report.team_score_920 === null) {
      return NextResponse.json(
        { error: '먼저 팀 점수 채점을 완료해주세요' },
        { status: 400 }
      );
    }

    const team_score_920 = report.team_score_920;
    const reportData = report.raw_data;
    const teamItem = reportData?.team?.item || '제품';

    // 2. 팀원 + 인사이트 로드
    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId);

    if (!members || members.length === 0) {
      return NextResponse.json({ error: '팀원 정보가 없습니다' }, { status: 404 });
    }

    const { data: insights } = await supabase
      .from('member_insights')
      .select('*')
      .eq('team_id', teamId);

    const allInsights = insights || [];

    // 팀원만 평가 (팀장은 별도 처리)
    const nonLeaders = members.filter((m: any) => !m.is_leader);

    if (nonLeaders.length === 0) {
      return NextResponse.json(
        { error: '평가할 팀원이 없습니다 (팀장만 있음)' },
        { status: 400 }
      );
    }

    // 3. 각 팀원별 행동 메트릭 계산
    const metricsByMember: Array<{
      memberId: string;
      name: string;
      role: string;
      metrics: BehaviorMetrics;
      memberInsights: any[];
    }> = nonLeaders.map((m: any) => {
      const myInsights = allInsights.filter((i: any) => i.member_id === m.id);
      return {
        memberId: m.id,
        name: m.name,
        role: m.role_code || 'unknown',
        metrics: computeMemberMetrics(myInsights),
        memberInsights: myInsights,
      };
    });

    // 4. Claude 호출 - AI 역할 산출물 평가 (모든 팀원 동시)
    console.log('[개인점수] Claude 호출 시작 (AI 역할 산출물)...');
    const startTime = Date.now();

    const aiScores = await evaluateMembersWithClaude(metricsByMember, teamItem);

    console.log(`[개인점수] Claude 응답 (${Date.now() - startTime}ms)`);

    // 5. 점수 통합 + 플래그 검출 + DB 저장
    const personalResults: any[] = [];

    for (const memberData of metricsByMember) {
      const aiScore = aiScores[memberData.memberId] || {
        score: 0,
        breakdown: { roleAlignment: 0, outputQuality: 0, strategyImpact: 0, distinctiveContribution: 0 },
        feedback: '데이터 부족으로 AI 평가 불가',
      };

      const behavior = calculateBehaviorScore40(memberData.metrics);

      const personalScore80 = aiScore.score + behavior.score;
      const finalScore1000 = team_score_920 + personalScore80;
      const grade = getGrade(finalScore1000);

      // 플래그 검출
      const flags = detectPersonalFlags({
        studentId: memberData.memberId,
        teamId,
        metrics: memberData.metrics,
        aiRoleOutputScore: aiScore.score,
        aiRoleOutputMax: 40,
        behaviorScore: behavior.score,
        behaviorScoreMax: 40,
      });

      personalResults.push({
        memberId: memberData.memberId,
        name: memberData.name,
        role: memberData.role,
        ai_role_output_40: aiScore.score,
        behavior_analysis_40: behavior.score,
        personal_score_80: personalScore80,
        team_score_920,
        final_score_1000: finalScore1000,
        grade,
        review_flags: flags,
        ai_analysis: {
          breakdown: aiScore.breakdown,
          feedback: aiScore.feedback,
        },
        behavior_analysis: {
          score: behavior.score,
          breakdown: behavior.breakdown,
          metrics: memberData.metrics,
        },
      });

      // DB upsert
      await supabase
        .from('personal_scores')
        .upsert({
          team_id: teamId,
          member_id: memberData.memberId,
          mode: 'GAME_AUTO',
          ai_role_output_40: aiScore.score,
          behavior_analysis_40: behavior.score,
          personal_score_80: personalScore80,
          team_score_920,
          final_score_1000: finalScore1000,
          grade,
          review_flags: flags,
          ai_analysis: {
            breakdown: aiScore.breakdown,
            feedback: aiScore.feedback,
          },
          behavior_analysis: {
            score: behavior.score,
            breakdown: behavior.breakdown,
            metrics: memberData.metrics,
          },
          scored_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'team_id,member_id',
        });
    }

    // 6. 응답
    return NextResponse.json({
      success: true,
      teamId,
      teamScore920: team_score_920,
      mode: 'GAME_AUTO',
      students: personalResults,
    });

  } catch (error: any) {
    console.error('개인점수 채점 에러:', error);
    return NextResponse.json(
      {
        error: error?.message || '개인 점수 채점 중 오류',
        details: error?.stack,
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════
// 행동 메트릭 계산 (팀원용)
// ═══════════════════════════════════════════════════════
function computeMemberMetrics(insights: any[]): BehaviorMetrics {
  const totalInsights = insights.length;
  const completedInsights = insights.filter(i => i.is_completed).length;

  let totalCharCount = 0;
  let hasNumbers = 0;
  let hasProperNouns = 0;
  let hasExamples = 0;

  // sub_card_id를 카드 번호로 변환 (01-1 → 01)
  const cardsParticipated = new Set(
    insights.map(i => (i.sub_card_id || '').split('-')[0]).filter(Boolean)
  ).size;

  for (const insight of insights) {
    const content = insight.content || '';
    totalCharCount += content.length;

    // 숫자 사용 (10%, 100만원, 25-35세 등)
    if (/\d+/.test(content)) hasNumbers++;

    // 고유명사 사용 (영어 대문자 시작 또는 회사명·국가명)
    if (
      /[A-Z][a-zA-Z]{2,}/.test(content) ||
      /(주식회사|기업|회사|코퍼레이션|Inc|Corp|Ltd)/.test(content) ||
      /(미국|일본|중국|베트남|한국|독일|프랑스|영국|인도|싱가포르)/.test(content)
    ) hasProperNouns++;

    // 사례·예시 언급
    if (/(예를\s*들어|사례|예시|예:|예컨대|구체적으로|실제로)/.test(content)) hasExamples++;
  }

  const avgCharCount = totalInsights > 0 ? totalCharCount / totalInsights : 0;

  // 일관성: 16카드 중 참여 비율 (정규화 100점)
  const consistencyScore = Math.min((cardsParticipated / 16) * 100, 100);

  return {
    totalInsights,
    completedInsights,
    totalCharCount,
    avgCharCount,
    cardsParticipated,
    hasNumbers,
    hasProperNouns,
    hasExamples,
    consistencyScore,
  };
}

// ═══════════════════════════════════════════════════════
// Claude 호출 - 모든 팀원 AI 역할 산출물 평가
// ═══════════════════════════════════════════════════════
async function evaluateMembersWithClaude(
  members: Array<{
    memberId: string;
    name: string;
    role: string;
    metrics: BehaviorMetrics;
    memberInsights: any[];
  }>,
  teamItem: string
): Promise<Record<string, {
  score: number;
  breakdown: {
    roleAlignment: number;       // 역할 적합성 10
    outputQuality: number;       // 산출물 품질 15
    strategyImpact: number;      // 팀 전략 반영 10
    distinctiveContribution: number; // 차별적 기여 5
  };
  feedback: string;
}>> {
  // 데이터 직렬화 (간결하게)
  const memberData = members.map(m => ({
    memberId: m.memberId,
    name: m.name,
    role: m.role,
    insightCount: m.metrics.totalInsights,
    avgChars: Math.round(m.metrics.avgCharCount),
    cardsParticipated: m.metrics.cardsParticipated,
    insights: m.memberInsights.slice(0, 16).map(i => ({
      cardId: i.sub_card_id,
      content: (i.content || '').slice(0, 200),
      completed: i.is_completed,
    })),
  }));

  const prompt = `당신은 SIGNAL 디지털무역 카드게임의 평가자입니다.
한 팀의 팀원들이 16카드 동안 작성한 인사이트를 받아서 각 팀원의 AI 역할 산출물 점수(40점)를 채점하세요.

# 팀 아이템
${teamItem}

# 팀원 데이터
${JSON.stringify(memberData, null, 2)}

# 채점 기준 (각 팀원 40점)
- 역할 적합성 (10점): 본인 역할(시장분석가/고객인사이트/규제TBT 등)과 관련된 카드에 적절히 기여했는가
- 산출물 품질 (15점): 인사이트의 구체성·논리성·근거성
- 팀 전략 반영 (10점): 본인 인사이트가 팀 전략 또는 카드별 결론에 반영될 만한가
- 차별적 기여 (5점): 다른 팀원과 구분되는 고유 기여가 있는가

## 역할별 가이드
- ceo: 전체 전략 방향 제시, 팀 결정 주도
- market_analyst: 시장 규모·성장성·세분화 데이터 제시
- competitive_strategist: 경쟁사 분석, 차별화 전략, SWOT
- customer_insight: 고객 페르소나, JTBD, 페인포인트
- regulatory_tbt: 인증·규제·TBT 분석
- poc_localization: PoC 설계, 현지화 전략
- global_sales_marketing: 채널 전략, 바이어, 가격 전략

# 출력 형식 (JSON만)
\`\`\`json
{
  "members": [
    {
      "memberId": "uuid-here",
      "score": 35,
      "breakdown": {
        "roleAlignment": 9,
        "outputQuality": 13,
        "strategyImpact": 9,
        "distinctiveContribution": 4
      },
      "feedback": "시장분석가 역할에 충실하며 구체적 수치를 잘 활용함. 카드 02·03에서 핵심 기여."
    },
    ...
  ]
}
\`\`\`

# 주의사항
1. 모든 팀원을 평가 (memberId 정확히 입력)
2. JSON만 반환, 다른 텍스트 없이
3. score는 정수
4. feedback은 1~2문장
5. 인사이트 0개인 팀원은 score 0, feedback "데이터 없음" 처리
6. 인사이트가 적어도 짧고 구체적이면 점수 부여`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
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
    console.error('JSON 파싱 실패:', jsonText.slice(0, 500));
    throw new Error('Claude 응답을 JSON으로 파싱할 수 없습니다');
  }

  // 응답 형식 변환: { members: [...] } → { memberId: {score, breakdown, feedback} }
  const result: Record<string, any> = {};
  for (const m of parsed.members || []) {
    result[m.memberId] = {
      score: m.score || 0,
      breakdown: m.breakdown || {
        roleAlignment: 0,
        outputQuality: 0,
        strategyImpact: 0,
        distinctiveContribution: 0,
      },
      feedback: m.feedback || '',
    };
  }

  return result;
}
