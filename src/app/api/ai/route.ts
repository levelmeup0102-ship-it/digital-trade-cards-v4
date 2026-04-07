import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, cardId, question, checklist, response, item, level, notes } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const levelLabel = level === 'basic' ? '초급' : level === 'advanced' ? '심화' : '표준';

    let systemPrompt = '';
    let userMessage = '';

    if (type === 'feedback') {
      systemPrompt = `당신은 디지털무역 전략 전문 AI입니다. 학생 팀이 "${item}" 제품의 수출 전략을 설계하고 있습니다. 수준: ${levelLabel}. 팀장의 최종 결론을 평가하고 반드시 아래 JSON 형식만 반환하세요. 다른 텍스트는 절대 포함하지 마세요.
{"score":3,"highlight":"잘된 점을 구체적으로","improve":"보완할 점을 구체적으로","next":"다음에 할 일을 구체적으로"}
score는 1~5점, 나머지는 한국어 2~3문장.`;

      userMessage = `카드: ${cardId}
질문: ${question}
체크리스트: ${(checklist || []).join(' / ')}
팀장 결론:
${response}`;

    } else if (type === 'draft') {
      systemPrompt = `당신은 디지털무역 전략 전문가입니다. 팀 토론 내용과 카드 질문을 바탕으로 "${item}" 제품의 수출 전략 결론 초안을 ${levelLabel} 수준에 맞게 한국어로 작성하세요. 결론 텍스트만 반환하세요. 마크다운이나 JSON 형식 없이 순수 텍스트만.`;

      userMessage = `카드: ${cardId}
질문: ${question}
체크리스트: ${(checklist || []).join(' / ')}
${notes ? `참고 메모: ${notes}` : ''}
위 내용을 바탕으로 ${levelLabel} 수준에 맞는 결론을 작성해주세요.`;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Claude API error:', errText);
      return NextResponse.json({ error: 'AI API call failed' }, { status: 502 });
    }

    const data = await apiResponse.json();
    const text = data.content?.[0]?.text || '';

    if (type === 'feedback') {
      try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({
          score: 3,
          highlight: '팀 토론과 결론을 잘 연결했어요.',
          improve: '더 구체적인 수출 관점을 추가해보세요.',
          next: '다음 카드로 이동해보세요.'
        });
      }
    } else {
      return NextResponse.json({ draft: text.trim() });
    }

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
