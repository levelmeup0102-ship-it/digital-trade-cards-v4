// src/app/api/polish-report/route.ts
// AI 보고서 다듬기 API - 학생 답변을 책 분량 자연스러운 글로 변환
// ⭐ v7: actionPlan을 박스 4개 → 한 편의 보고서 글(narrative)로 통합
//        WHAT/WHERE/WHO/HOW 4가지 정보가 자연스럽게 녹아든 컨설팅 보고서 본문 + roadmap
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

  // ─── 검증 ───
  const cardCount = parsed?.cards ? Object.keys(parsed.cards).length : 0;
  if (cardCount < 16) {
    console.warn(`[AI 다듬기] 카드 ${cardCount}/16 만 생성됨`);
  }

  // ⭐ v7: actionPlan 검증 (narrative + roadmap 구조)
  if (!parsed?.actionPlan) {
    console.warn('[AI 다듬기] actionPlan 누락!');
  } else {
    const ap = parsed.actionPlan;
    if (!ap.narrative) {
      console.warn('[AI 다듬기] actionPlan.narrative 누락!');
    } else if (ap.narrative.length < 300) {
      console.warn(`[AI 다듬기] narrative가 너무 짧음 (${ap.narrative.length}자, 권장 450~600자)`);
    }
    if (!ap.roadmap?.phase1 || !ap.roadmap?.phase2 || !ap.roadmap?.phase3) {
      console.warn('[AI 다듬기] roadmap 3단계 중 누락된 phase 있음');
    }
  }

  return parsed;
}

// ═══════════════════════════════════════════════════════
// 다듬기 프롬프트 빌더 (⭐ v7: actionPlan을 한 편의 보고서 글로 통합)
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
한 팀의 16개 전략 카드 답변을 받아서, 보고서와 코치 피드백, 그리고 최종 실전 액션 플랜을 만들어주세요.

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
- actionPlan.narrative: 500~700자 (3~4 문단, 본문 보고서 톤)
- actionPlan.roadmap 각 task: 30~50자

# 톤
- narrative: 전문 컨설턴트 보고서 톤, ~다 종결형 ("~한다", "~된다")
- strategy: AI 코치의 평가/조언 톤 ("이 팀은 ~", "다만 ~", "다음에는 ~")
- actionPlan.narrative: 컨설팅 보고서 본문 톤 + 약간의 스토리텔링 (학생이 읽고 가슴 뛰게)
- actionPlan.roadmap tasks: 실전 행동 지시 톤 (학생이 내일부터 따라할 수 있는 구체적 행동)
- 학생이 짧게 쓴 답변을 의미 있게 확장하되, 가짜 숫자는 만들지 않기
- 미작성 답변은 카드 주제와 ${team.item}에 맞춰 합리적으로 보완

# ⭐ strategy 필드 작성법 ⭐
strategy는 ONE SENTENCE STRATEGY를 반복하지 말고, 3요소를 자연스럽게 한 문단으로:

【강점】 (1~2문장, 60~80자): 학생 답변에서 잘한 부분을 구체적으로 짚기
【보완점】 (1~2문장, 60~80자): 부족하거나 더 파고들 부분
【제안】 (1~2문장, 60~80자): 다음 단계의 구체적 액션

⚠ "우리는 ~한다" 같은 학생 톤 금지!
✅ "이 팀은 ~을 잘 짚었다", "다만 ~이 빠져있다", "다음에는 ~을 권한다"

# ⭐⭐⭐ actionPlan 작성법 (보고서의 핵심 — 학생의 길잡이!) ⭐⭐⭐
actionPlan은 보고서의 가장 마지막 장이다.
학생이 보고서를 덮자마자 "내일부터 뭘 해야 할지" 알 수 있게 해주는 실전 액션 플랜이다.

actionPlan은 두 부분으로 구성된다:
1. narrative (보고서 본문): 한 편의 통합된 글
2. roadmap (90일 로드맵): 3단계 단계별 액션 (시간축)

【가장 중요한 원칙】
1. 16개 카드 답변을 모두 종합 판단해서 작성한다 (단순 요약·복붙 금지).
2. "수출하세요", "잘 팔아보세요" 같은 막연한 조언은 절대 금지.
3. "○○ 바이어에게 이메일 보내세요", "△△ 박람회 참가 신청하세요" 수준의 구체성.
4. ${team.item}의 실제 시장·바이어·인증 환경에 맞춰 작성한다.
5. 학생이 고등학생임을 감안해 너무 추상적이지 않게, 그러나 진짜 비즈니스처럼 작성.

【narrative 작성법 — 한 편의 보고서 글】
- 분량: 500~700자 (3~4 문단)
- 톤: 컨설팅 보고서 본문 + 약간의 스토리텔링
- 종결형: ~다, ~한다 (전문 보고서 톤)
- 4가지 핵심 정보가 글 안에 자연스럽게 녹아 있어야 함:
  ① 무엇을 (제품·서비스 정의)
  ② 어디에 (1차 진출 시장/도시 + 선택 이유)
  ③ 누구에게 (1차/2차 바이어 또는 채널 — 구체적 이름)
  ④ 어떻게 (실행 방법 — 박람회·플랫폼·협업 등 구체)
- 박스로 쪼개지 말고, 한 편의 글로 자연스럽게 흐르게.
- 4문단 구성 권장:
  1) 도입 — 제품과 시장의 만남이 왜 의미 있는지 (약간의 스토리텔링)
  2) 1차 진입 채널 — 누구를 두드릴 것이며 왜
  3) 실행 방법 — 박람회·인플루언서·플랫폼 등 구체적 액션
  4) 다짐 — 90일 안에 달성할 목표 + 다음 페이지(로드맵) 연결
- 단락 사이는 빈 줄 하나(\\n\\n)로 구분

【narrative 예시 (분량·톤 참고용 — ${team.item}이 다른 경우 그에 맞게)】
"K-뷰티 시트마스크가 베트남 호치민의 한 매장 진열대에 오르는 길은 생각보다 가깝다. 한류 영향으로 현지 K-뷰티 수요는 매년 두 자릿수로 성장 중이며, MZ세대 소비자는 한국산 보습·미백 제품에 강한 신뢰를 보이고 있다. 이 흐름을 정확히 읽어내는 것이 진출 전략의 출발점이다.

가장 먼저 두드려야 할 문은 베트남 최대 H&B 체인 Watsons의 베트남 바이어다. Watsons는 K-뷰티 카테고리를 전략적으로 확대 중이라 신규 브랜드의 진입 장벽이 비교적 낮은 편이다. 만약 1차 접촉이 늦어진다면, Tiki나 Shopee 같은 온라인 마켓플레이스 셀러를 통한 우회 진입을 병행해야 한다.

실행 측면에서는 베트남에서 매년 6월 열리는 Vietbeauty 박람회 참가가 가장 효율적이다. 박람회를 전후로 호치민의 마이크로 인플루언서 5명과 협업해 인지도를 쌓고, Shopee 공식 스토어를 오픈해 즉각적인 구매 전환을 만들어야 한다.

목표는 90일 안에 첫 PO를 확보하는 것이다. 그 길은 옆 페이지의 로드맵에 단계별로 정리되어 있다."

【roadmap 작성법 — 90일 단계별 액션】
3단계로 끊기:
- phase1 (1~30일 · 준비기): { title, tasks: 3~4개 }
- phase2 (31~60일 · 실행기): { title, tasks: 3~4개 }
- phase3 (61~90일 · 성과기): { title, tasks: 3~4개 }
- 각 task는 30~50자, 동사로 시작하는 구체적 행동
- 학생/고등학생이 실제로 수행 가능한 수준으로
- title 예시: "1~30일 · 준비기 (Foundation)", "31~60일 · 실행기 (Outreach)", "61~90일 · 성과기 (Closing)"

# 출력 형식 (JSON만, 다른 텍스트 절대 금지)
\`\`\`json
{
  "executiveSummary": "200자 정도, 팀 진출 전략 요약",
  "cards": {
    "01": {
      "cardId": "01",
      "titleKo": "시장 개요 및 산업 정의",
      "intro": "${team.item}는 어떤 산업에 속하며 그 분류의 전략적 의미는 무엇인가.",
      "narrative": "280~350자 분량의 전문 보고서 톤 본문. 학생 답변을 토대로 카드 주제를 명확히 풀어쓴다.",
      "strategy": "【강점】 ~ 【보완점】 ~ 【제안】 ~",
      "bridge": "이 산업 정의를 바탕으로 다음에는 시장 규모와 성장성을 분석한다."
    }
  },
  "conclusion": "150자 정도, 팀 전략 정리와 다음 액션",
  "actionPlan": {
    "narrative": "500~700자의 통합 보고서 글. 4문단 구성 권장. 단락 사이는 빈 줄 하나로 구분. 4가지 핵심 정보(무엇/어디/누구/어떻게)가 자연스럽게 녹아 있어야 함. 위 예시의 톤과 분량 참고.",
    "roadmap": {
      "phase1": {
        "title": "1~30일 · 준비기 (Foundation)",
        "tasks": [
          "HS코드 확정 및 베트남 관세율·통관 절차 조사",
          "CFS·CPNP 등 필요 인증 요건 정리",
          "타겟 바이어 10곳 리스트업 및 연락처 확보",
          "영문 제품 소개서 및 가격표 작성"
        ]
      },
      "phase2": {
        "title": "31~60일 · 실행기 (Outreach)",
        "tasks": [
          "콜드 이메일 10건 발송 및 회신 추적",
          "관심 보인 바이어 5곳에 샘플 발송",
          "화상 미팅 2~3건 진행 및 피드백 수집"
        ]
      },
      "phase3": {
        "title": "61~90일 · 성과기 (Closing)",
        "tasks": [
          "MOQ 협상 및 가격 조건 확정",
          "첫 PO(주문서) 1건 확보 목표",
          "다음 진출 시장 후보 검토 (태국·인도네시아 등)"
        ]
      }
    }
  }
}
\`\`\`

# 절대 규칙
1. 16개 카드 모두 만들기 (cardId: "01" ~ "16")
2. JSON 외 텍스트 절대 금지 (설명, 주석, 인사말 모두 금지)
3. 분량을 정확히 지키기 (특히 narrative 350자 이하, strategy 250자 이하)
4. strategy는 반드시 【강점】【보완점】【제안】 3요소 포함
5. ⭐ actionPlan은 반드시 포함하고 narrative + roadmap 두 부분 모두 채우기
6. ⭐ actionPlan.narrative는 박스로 쪼개지 말고 한 편의 글로 (4문단 권장, 500~700자)
7. ⭐ actionPlan.narrative에 4가지 핵심(무엇/어디/누구/어떻게)이 자연스럽게 녹아 있어야 함
8. ⭐ actionPlan은 16카드를 종합 판단한 결과여야 함 (단순 복붙 금지)
9. ⭐ ${team.item} 맥락에 맞는 구체적 바이어·박람회·인증명을 사용 (막연한 표현 금지)
10. ${team.item} 맥락 유지
11. 응답을 } 로 깔끔하게 끝내기`;
}
