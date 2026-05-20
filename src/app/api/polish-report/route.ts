// src/app/api/polish-report/route.ts
// AI 보고서 다듬기 API - 학생 답변을 책 분량 자연스러운 글로 변환
// ⭐ v2: STRATEGY를 "AI 코치 피드백" 톤으로 변경 (강점/약점/제안)
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
        { error: '다듬을 데이터가 없습니다' },
        { status: 400 }
      );
    }

    // 2. Claude한테 다듬기 요청
    const polishedData = await polishReportWithClaude(reportData);

    // 3. DB에 저장 (JSON 문자열로 저장)
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
  const startTime = Date.now();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  console.log(`[AI 다듬기] Claude 응답 받음 (${Date.now() - startTime}ms)`);

  // 응답에서 텍스트 추출
  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude 응답에서 텍스트를 찾을 수 없습니다');
  }

  // JSON 추출
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

  return parsed;
}

// ═══════════════════════════════════════════════════════
// 다듬기 프롬프트 빌더 (⭐ v2: STRATEGY를 AI 코치 피드백으로)
// ═══════════════════════════════════════════════════════
function buildPolishPrompt(
  team: TeamReportData['team'],
  cards: TeamReportData['cards']
): string {
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

  return `당신은 디지털 무역 전략 컨설턴트이자 학습 코치입니다.
한 팀의 16개 전략 카드 답변을 받아서, 다음 두 가지를 동시에 만들어주세요:
1. 책 분량의 자연스럽고 전문적인 보고서 (narrative)
2. AI 코치 관점의 피드백 (strategy) - 강점/약점/개선 제안

# 팀 정보
- 팀명: ${team.teamName}
- 아이템: ${team.item}
- 레벨: ${team.level}
- 팀원: ${team.members.length}명

# 학생 답변 원본
${JSON.stringify(studentAnswers, null, 2)}

# 다듬기 가이드라인

## 1. 톤과 스타일
- narrative는 전문 컨설턴트 보고서 톤 (예: 매킨지 보고서)
- strategy는 AI 코치의 친절하면서도 솔직한 피드백 톤
- 학생이 짧게 쓴 답변을 풍부하게 확장 (narrative)
- "ㅇㅇㅇ" 같은 의미 없는 답변은 카드 주제에 맞춰 합리적으로 보완
- 한국어, ~다 종결형 (예: "~합니다" 아닌 "~한다")

## 2. 분량
- 각 카드 narrative: 약 400-600자
- 각 카드 strategy (AI 코치 피드백): 약 250-350자
- intro: 50자 정도
- bridge: 50자 정도

## 3. 구조
각 카드는 다음 4가지 요소로 구성:
- intro: 카드 도입 (1-2문장, 50자 정도)
- narrative: 본문 — Q1+Q2+Q3 통합 서술 (400-600자, 전문 보고서 톤)
- strategy: AI 코치 피드백 (250-350자) — 아래 구조 필수
- bridge: 다음 카드와의 연결 (1문장, 50자, 카드 16번은 마무리)

## 4. ⭐⭐⭐ strategy 필드 작성 규칙 (가장 중요!) ⭐⭐⭐
strategy는 ONE SENTENCE STRATEGY를 반복하지 말고, AI 코치 관점의 피드백으로 작성:

다음 3가지 요소를 반드시 포함하되, 자연스럽게 한 문단으로 연결:

【강점】 (1-2문장): 학생 답변에서 잘한 부분을 구체적으로 짚어주기
  - 예: "타깃 고객을 2030 직장인 여성으로 명확히 좁힌 점, 그리고 인플루언서 채널을 핵심 진출 경로로 잡은 점은 ${team.item} 시장의 특성을 잘 반영한 선택이다."

【약점/보완점】 (1-2문장): 부족하거나 더 깊이 파고들 부분
  - 예: "다만, 인플루언서 마케팅의 구체적 비용 구조와 ROI 추정치가 빠져있어 실행 단계에서 예산 산정이 어려울 수 있다."

【개선 제안】 (1-2문장): 다음 단계로 발전시킬 구체적 액션
  - 예: "다음 단계에서는 마이크로 인플루언서(1만~10만 팔로워) 평균 단가 데이터를 수집하고, 전환율 가정(2~5%)을 적용해 매출 시뮬레이션을 만들어보길 권한다."

⚠ 절대 ONE SENTENCE STRATEGY를 그대로 반복하거나 paraphrase하지 마세요!
⚠ "우리는 ~한다" 같은 학생 답변 톤이 아닌, "이 전략은 ~", "팀은 ~을 잘 다뤘다" 같은 평가/조언 톤으로 작성하세요.

## 5. 내용 (narrative)
- 학생 답변의 핵심 의도는 유지
- 부족한 부분은 카드 주제와 팀 아이템(${team.item})에 맞게 합리적으로 보완
- 전문 용어 사용 (예: HS코드, JTBD, PoC, TBT 등)
- 구체적 숫자/사례가 있으면 활용
- 비즈니스 관점의 통찰 추가

# 출력 형식 (반드시 이 JSON 구조로만 응답)
\`\`\`json
{
  "executiveSummary": "전체 보고서 요약 (300자 정도, 우리 팀의 진출 전략을 한 문단으로)",
  "cards": {
    "01": {
      "cardId": "01",
      "titleKo": "시장 개요 및 산업 정의",
      "intro": "우리 ${team.item}는 어떤 산업에 속하며, 그 분류가 갖는 전략적 의미는 무엇인가.",
      "narrative": "우리 제품은 화장품 산업의 기능성 스킨케어 카테고리에 속한다. 구체적으로는 HS코드 3304.99에 해당하며 한국화장품협회의 KFDA 분류 기준 기능성 화장품으로 등록 가능하다. (... 400-600자 분량 ...)",
      "strategy": "【강점】 이 팀은 산업 분류를 HS코드 단위까지 구체적으로 명시한 점이 인상적이다. 단순히 '화장품'이 아니라 기능성 스킨케어로 세분화한 것은 시장 진입 시 관세 및 규제 대응에 큰 도움이 된다. 【보완점】 다만 KFDA 등록 외에 진출 국가별 규제(예: 미국 FDA, 중국 NMPA)에 대한 검토가 빠져있어, 글로벌 진출 시 추가 인증 비용을 간과할 수 있다. 【제안】 다음 단계에서는 진출 대상 1~2개국의 규제 체계를 표로 비교해 인증 기간과 비용을 산정해보길 권한다.",
      "bridge": "이러한 산업 정의를 바탕으로, 다음 단계에서는 시장 규모와 성장성을 분석한다."
    },
    "02": { ... },
    ... (16개 카드 모두)
  },
  "conclusion": "최종 마무리 글 (200자 정도, 팀의 전략을 정리하고 다음 액션을 제시)"
}
\`\`\`

# 주의사항
1. 모든 16개 카드를 다듬어주세요 (cardId: "01" ~ "16").
2. JSON 외 다른 텍스트는 절대 포함하지 마세요.
3. 학생이 미작성한 카드는 카드 주제에 맞춰 합리적으로 보완하되, 너무 구체적인 가짜 정보는 만들지 마세요.
4. ${team.item} 아이템에 맞는 사례와 분석을 포함해주세요.
5. 16개 카드의 narrative가 자연스럽게 이어지도록 (앞 카드 → 뒤 카드 흐름).
6. ⭐ strategy 필드는 반드시 "강점/약점/제안" 코치 피드백 톤으로! ONE SENTENCE STRATEGY 반복 금지!`;
}
