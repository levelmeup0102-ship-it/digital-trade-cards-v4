// src/app/api/score-report/route.ts
// AI 채점 API - 서버에서 Claude API 호출하여 보고서를 채점합니다
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SIGNAL_GOVERNANCE_CARDS } from '@/data/signalGovernance';
import type { TeamReportData } from '@/types/report';

// Claude SDK 초기화 (서버 사이드)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Supabase 서버 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 300; // 5분 (Vercel/Railway 타임아웃)

// ─── POST /api/score-report ───
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

    const reportData: TeamReportData = report.raw_data;

    if (!reportData?.cards || reportData.cards.length === 0) {
      return NextResponse.json(
        { error: '채점할 데이터가 없습니다' },
        { status: 400 }
      );
    }

    // 2. Claude에게 채점 요청
    const scoringResult = await scoreReportWithClaude(reportData);

    // 3. DB에 저장
    const { error: updateError } = await supabase
      .from('team_reports')
      .update({
        total_score: scoringResult.totalScore,
        card_scores: scoringResult.cardScores,
        scored_at: new Date().toISOString(),
      })
      .eq('team_id', teamId);

    if (updateError) {
      console.error('DB 저장 실패:', updateError);
      return NextResponse.json(
        { error: 'DB 저장 실패: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ...scoringResult,
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
// Claude로 채점 실행
// ═══════════════════════════════════════════════════════
async function scoreReportWithClaude(reportData: TeamReportData) {
  const { team, cards } = reportData;

  // 채점 프롬프트 생성 (간결하게)
  const prompt = buildScoringPrompt(team, cards);

  console.log('[AI 채점] Claude 호출 시작...');
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  console.log(`[AI 채점] Claude 응답 받음 (${Date.now() - startTime}ms)`);

  // 응답에서 텍스트 추출
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude 응답에서 텍스트를 찾을 수 없습니다');
  }

  // JSON 추출 (마크다운 코드블록 제거)
  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    console.error('JSON 파싱 실패. 응답:', jsonText.slice(0, 500));
    throw new Error('Claude 응답을 JSON으로 파싱할 수 없습니다');
  }

  // 결과 검증 + 정규화
  const cardScores: Record<string, any> = parsed.cardScores || {};
  let totalScore = 0;

  // 점수 합산
  Object.values(cardScores).forEach((cs: any) => {
    if (cs?.score) totalScore += cs.score;
  });

  return {
    totalScore,
    maxScore: 480,
    percentage: Math.round((totalScore / 480) * 1000) / 10, // 소수 1자리
    cardScores,
    summary: parsed.summary || '',
  };
}

// ═══════════════════════════════════════════════════════
// 채점 프롬프트 빌더
// ═══════════════════════════════════════════════════════
function buildScoringPrompt(
  team: TeamReportData['team'],
  cards: TeamReportData['cards']
): string {
  // 채점 기준을 간결하게 직렬화
  const governanceJson = SIGNAL_GOVERNANCE_CARDS.map(card => ({
    id: card.id,
    titleKo: card.titleKo,
    questions: card.questions.map(q => ({
      id: q.id,
      titleKo: q.titleKo,
      visibleMission: q.visibleMission,
      checklistKeys: q.hiddenGovernanceKeys.map(k => ({
        key: k.key,
        labelKo: k.labelKo,
        intent: k.scoringIntent,
      })),
    })),
  }));

  // 학생 답변을 간결하게 직렬화
  const studentAnswers = cards.map(c => ({
    cardId: c.cardId,
    titleKo: c.titleKo,
    questions: c.questions.map(q => ({
      id: q.id,
      title: q.title,
      answer: q.answer || '(미작성)',
      interimSummary: q.interimBlanks?.filter(b => b).join(' / ') || '',
    })),
    oneSentenceStrategy: c.oneSentenceStrategy || '',
  }));

  return `당신은 디지털 무역 카드게임 SIGNAL의 평가관입니다.
한 팀의 16개 카드 답변(48문항)을 채점 기준에 따라 평가해주세요.

# 팀 정보
- 팀명: ${team.teamName}
- 아이템: ${team.item}
- 레벨: ${team.level}
- 팀원 수: ${team.members.length}명

# 채점 기준 (각 문항 10점 만점, 총 480점)
- checklistCoverage (5점): 4개 체크리스트 키를 얼마나 충족했는가
- logic (2점): 답변의 논리적 일관성과 깊이
- itemFit (2점): 팀의 아이템(${team.item})과의 적합성
- clarity (1점): 답변의 명료성 (이해 가능성)

# 채점 기준 (16카드 × 3문항 = 48문항)
${JSON.stringify(governanceJson, null, 2)}

# 팀의 답변
${JSON.stringify(studentAnswers, null, 2)}

# 출력 형식 (반드시 이 JSON 구조로만 응답)
\`\`\`json
{
  "cardScores": {
    "01": {
      "score": 24,
      "max": 30,
      "questions": [
        {
          "id": "01-1",
          "score": 8,
          "breakdown": { "checklist": 4, "logic": 2, "itemFit": 1, "clarity": 1 },
          "feedback": "산업 분류는 명확하나 HS코드 언급 부족"
        },
        { "id": "01-2", "score": 8, "breakdown": {...}, "feedback": "..." },
        { "id": "01-3", "score": 8, "breakdown": {...}, "feedback": "..." }
      ]
    },
    "02": { ... },
    ... (16개 카드 모두)
  },
  "summary": "전반적인 평가 총평 (3-4문장, 한국어)"
}
\`\`\`

# 주의사항
1. 모든 16개 카드의 모든 3개 문항을 채점하세요 (총 48문항).
2. 답변이 "(미작성)" 이거나 의미 없는 글자(ㅇㅇㅇㅇ, ㅋㅋ 등)면 0~2점 부여.
3. 짧지만 핵심을 담은 답변은 길이만 보고 감점하지 마세요.
4. 각 문항의 feedback은 한 문장(50자 내)으로 간결하게.
5. JSON 외 다른 텍스트는 절대 포함하지 마세요.
6. 숫자는 반드시 정수로 출력하세요.`;
}
