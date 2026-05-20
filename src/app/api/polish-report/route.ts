// src/app/api/polish-report/route.ts
// AI 보고서 다듬기 API - 학생 답변을 책 분량 자연스러운 글로 변환
// ⭐ v5: 분량 적당히 조절 (가독성 + 안정성 균형)
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import type { TeamReportData } from '@/types/report';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 300; // 5분

// ─── POST /api/polish-report ───
export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();

    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 });
    }

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
        { error: '다듬을 데이터가 없습니다' },
        { status: 400 }
      );
    }

    const polishedData = await polishReportWithClaude(reportData);

    const { error: updateError } = await supabase
      .from('team_reports')
      .update({
        ai_polished: JSON.stringify(polishedData),
        ai_polished_at: new Date().toISOString(),
        status: 'ai_polished',
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
      polished: polishedData,
    });

  } catch (error: any) {
    console.error('다듬기 에러:', error);
    return NextResponse.json(
      {
        error: error?.message || '다듬기 중 오류가 발생했습니다',
        details: error?.stack,
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════
// Claude로 다듬기 실행
// ═══════════════════════════════════════════════════════
async function polishReportWithClaude(reportData: TeamReportData) {
  const { team, cards } = reportData;

  const prompt = buildPolishPrompt(team, cards);

  console.log('[AI 다듬기] Claude 호출 시작...');
  console.log('[AI 다듬기] 프롬프트 길이:', prompt.length, '자');
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 32000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  console.log(`[AI 다듬기] Claude 응답 받음 (${Date.now() - startTime}ms)`);
  console.log(`[AI 다듬기] stop_reason: ${response.stop_reason}`);
  console.log(`[AI 다듬기] usage:`, response.usage);

  if (response.stop_reason === 'max_tokens') {
    console.error('[AI 다듬기] 응답이 max_tokens 한도에 걸려 잘렸습니다!');
    throw new Error('Claude 응답이 토큰 한도를 초과해 잘렸습니다. 다시 시도해주세요.');
  }

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude 응답에서 텍스트를 찾을 수 없습니다');
  }

  let jsonText = textBlock.text.trim();
  jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');

  const lastChar = jsonText.trim().slice(-1);
  if (lastChar !== '}') {
    console.error('[AI 다듬기] JSON이 } 로 안 끝남. 마지막 200자:', jsonText.slice(-200));
    throw new Error('Claude 응답이 완성되지 않았습니다 (JSON이 끝나기 전에 끊김). 다시 시도해주세요.');
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e: any) {
    console.error('[AI 다듬기] JSON 파싱 실패');
    console.error('응답 시작 500자:', jsonText.slice(0, 500));
    console.error('응답 끝 500자:', jsonText.slice(-500));
    console.error('파싱 에러:', e.message);
    throw new Error(`Claude 응답을 JSON으로 파싱할 수 없습니다: ${e.message}`);
  }

  const cardCount = parsed?.cards ? Object.keys(parsed.cards).length : 0;
  if (cardCount < 16) {
    console.warn(`[AI 다듬기] 카드 ${cardCount}/16 만 생성됨`);
  }

  return parsed;
}

// ═══════════════════════════════════════════════════════
// 다듬기 프롬프트 빌더 (⭐ v5: 적당한 분량)
// ═══════════════════════════════════════════════════════
function buildPolishPrompt(
  team: TeamReportData['team'],
  cards: TeamReportData['cards']
): string {
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

  return `당신은 디지털 무역 전략 컨설턴트이자 학습 코치입니다.
한 팀의 16개 전략 카드 답변을 받아서, 보고서와 코치 피드백을 만들어주세요.

# 팀 정보
- 팀명: ${team.teamName}
- 아이템: ${team.item}
- 레벨: ${team.level}
- 팀원: ${team.members.length}명

# 학생 답변 원본
${JSON.stringify(studentAnswers, null, 2)}

# 분량 가이드 (⚠ 이 범위를 정확히 지키세요)
- intro: 40~60자 (1문장)
- narrative: 280~350자 (4~5문장)
- strategy: 200~250자 (3~4문장)
- bridge: 40~60자 (1문장)

# 톤
- narrative: 전문 컨설턴트 보고서 톤, ~다 종결형 ("~한다", "~된다")
- strategy: AI 코치의 평가/조언 톤 ("이 팀은 ~", "다만 ~", "다음에는 ~")
- 학생이 짧게 쓴 답변을 의미 있게 확장하되, 가짜 숫자는 만들지 않기
- 미작성 답변은 카드 주제와 ${team.item}에 맞춰 합리적으로 보완

# ⭐ strategy 필드 작성법 (가장 중요!) ⭐
strategy는 ONE SENTENCE STRATEGY를 반복하지 말고, 3요소를 자연스럽게 한 문단으로:

【강점】 (1~2문장, 60~80자): 학생 답변에서 잘한 부분을 구체적으로 짚기
【보완점】 (1~2문장, 60~80자): 부족하거나 더 파고들 부분
【제안】 (1~2문장, 60~80자): 다음 단계의 구체적 액션

⚠ "우리는 ~한다" 같은 학생 톤 금지!
✅ "이 팀은 ~을 잘 짚었다", "다만 ~이 빠져있다", "다음에는 ~을 권한다"

# 출력 형식 (JSON만, 다른 텍스트 절대 금지)
\`\`\`json
{
  "executiveSummary": "200자 정도, 팀 진출 전략 요약",
  "cards": {
    "01": {
      "cardId": "01",
      "titleKo": "시장 개요 및 산업 정의",
      "intro": "${team.item}는 어떤 산업에 속하며 그 분류의 전략적 의미는 무엇인가.",
      "narrative": "280~350자 분량의 전문 보고서 톤 본문. 학생 답변을 토대로 카드 주제를 명확히 풀어쓴다. 핵심 개념과 구체적 사례를 포함하되 너무 길지 않게 한다.",
      "strategy": "【강점】 이 팀은 HS코드 단위까지 산업 분류를 구체화한 점이 인상적이다. 시장 진입 시 관세 및 규제 대응에 도움이 된다. 【보완점】 다만 진출국별 규제(FDA, NMPA 등) 비교가 빠져있어 글로벌 확장 시 인증 비용을 간과할 위험이 있다. 【제안】 다음에는 진출 대상 2개국의 규제 체계를 표로 정리해 인증 기간과 비용을 산정해보길 권한다.",
      "bridge": "이 산업 정의를 바탕으로 다음에는 시장 규모와 성장성을 분석한다."
    }
  },
  "conclusion": "150자 정도, 팀 전략 정리와 다음 액션"
}
\`\`\`

# 절대 규칙
1. 16개 카드 모두 만들기 (cardId: "01" ~ "16")
2. JSON 외 텍스트 절대 금지 (설명, 주석, 인사말 모두 금지)
3. 분량을 정확히 지키기 (특히 narrative 350자 이하, strategy 250자 이하)
4. strategy는 반드시 【강점】【보완점】【제안】 3요소 포함
5. ${team.item} 맥락 유지
6. 응답을 } 로 깔끔하게 끝내기`;
}
