import { NextRequest, NextResponse } from 'next/server';

/**
 * AI 코멘트 생성 API
 * 
 * OpenAI API를 사용하여 데이터 분석 코멘트를 생성합니다.
 * 환경 변수 OPENAI_API_KEY가 필요합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { section, data } = await request.json();

    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { comment: 'OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY를 추가해주세요.' },
        { status: 200 }
      );
    }

    // 섹션별 프롬프트 생성
    const prompt = generatePrompt(section, data);

    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              '당신은 F&F 경영관리팀의 원가 분석 전문가입니다. 데이터를 분석하고 인사이트를 제공합니다. 한국어로 명확하고 간결하게 답변합니다.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API 오류:', await response.text());
      return NextResponse.json(
        { comment: 'AI 코멘트 생성에 실패했습니다.' },
        { status: 200 }
      );
    }

    const result = await response.json();
    const comment = result.choices[0]?.message?.content || 'AI 코멘트를 생성할 수 없습니다.';

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('AI 코멘트 생성 오류:', error);
    return NextResponse.json(
      { comment: 'AI 코멘트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 섹션별 프롬프트 생성
 */
function generatePrompt(section: string, data: any): string {
  switch (section) {
    case 'usd':
      return `
다음은 25F 시즌의 USD 기준 원가율 데이터입니다:
- 24F 원가율: ${data.costRate24F.toFixed(1)}%
- 25F 원가율: ${data.costRate25F.toFixed(1)}%
- 원가율 변동: ${data.avgCostRateChange.toFixed(1)}%p

이 데이터를 분석하여 다음 관점에서 3-4문장으로 인사이트를 제공해주세요:
1. 원가율 변동의 의미와 영향
2. 소재 믹스 또는 공정 개선 가능성
3. 향후 개선 방향 제안
`;

    case 'krw':
      return `
다음은 25F 시즌의 KRW 기준 원가율 데이터입니다:
- 24F 원가율: ${data.costRate24F.toFixed(1)}%
- 25F 원가율: ${data.costRate25F.toFixed(1)}%
- 원가율 변동: ${data.avgCostRateChange.toFixed(1)}%p

이 데이터를 분석하여 다음 관점에서 3-4문장으로 인사이트를 제공해주세요:
1. USD 기준과의 차이 (환율 영향)
2. 실손익 관점의 분석
3. 환율 헤지 전략 제안
`;

    case 'waterfall':
      return `
다음은 24F에서 25F로의 원가율 변동 분석입니다:
- 24F USD 원가율: ${data.costRate24F_usd.toFixed(1)}%
- 25F USD 원가율: ${data.costRate25F_usd.toFixed(1)}%
- 25F KRW 원가율: ${data.costRate25F_krw.toFixed(1)}%
- 원부자재+아트웍 변동: ${data.materialArtworkChange.toFixed(1)}%p
- 공임 변동: ${data.laborChange.toFixed(1)}%p
- 마진 변동: ${data.marginChange.toFixed(1)}%p
- 경비 변동: ${data.expenseChange.toFixed(1)}%p
- 환율 효과: ${data.exchangeRateEffect.toFixed(1)}%p

다음 4개 섹션에 대한 인사이트를 JSON 형식으로 생성해주세요:

1. "action" (즉시 액션): 즉시 실행 가능한 구체적인 액션 아이템 4개 (각 1-2문장)
   - 원가 절감을 위한 실행 방안
   - 공정 개선 및 효율화
   - 소재 믹스 최적화
   - KPI 설정 및 관리 방안

2. "risk" (리스크 관리): 주의해야 할 리스크 요인 3개 (각 1-2문장)
   - 원가 상승 리스크
   - 환율 변동 영향
   - 공급망 리스크

3. "success" (성공 포인트): 긍정적인 성과와 개선사항 4개 (각 1-2문장)
   - 원가율 개선 성과
   - 효율화 성공 사례
   - 품질 개선 효과
   - 구조적 개선 결과

4. "message" (경영진 핵심 메시지): 경영진을 위한 종합 요약 1개 (3-4문장)
   - 시즌 핵심 성과
   - 주요 도전과제
   - 향후 전략 방향

JSON 형식:
{
  "action": ["항목1", "항목2", "항목3", "항목4"],
  "risk": ["항목1", "항목2", "항목3"],
  "success": ["항목1", "항목2", "항목3", "항목4"],
  "message": "경영진 메시지"
}
`;

    case 'category':
      return `
다음은 카테고리별 25F 원가율 데이터입니다:
${data.categories.map((cat: any) => `- ${cat.category}: ${cat.costRate25F.toFixed(1)}% (${cat.costRateChange > 0 ? '+' : ''}${cat.costRateChange.toFixed(1)}%p)`).join('\n')}

카테고리별 원가 구성의 특징과 차이를 분석하고, 개선이 필요한 카테고리와 구체적인 액션 아이템을 3-4문장으로 제안해주세요.
`;

    case 'executive':
      return `
다음은 25F 시즌의 전체 원가 분석 결과입니다:
- 전체 원가율: ${data.total.costRate25F_usd.toFixed(1)}% (${data.total.costRateChange_usd > 0 ? '+' : ''}${data.total.costRateChange_usd.toFixed(1)}%p)
- 평균 TAG: $${data.total.avgTag25F_usd.toFixed(2)} (YOY: ${data.total.tagYoY_usd.toFixed(1)}%)
- 평균 원가: $${data.total.avgCost25F_usd.toFixed(2)} (YOY: ${data.total.costYoY_usd.toFixed(1)}%)

카테고리별 원가율:
${data.categories.map((cat: any) => `- ${cat.category}: ${cat.costRate25F_usd.toFixed(1)}%`).join('\n')}

경영진을 위한 종합 분석 리포트를 작성해주세요:
1. 핵심 성과 요약 (2-3문장)
2. 주요 리스크 및 기회 요인 (2-3문장)
3. 전략적 제언 (2-3문장)

총 6-9문장으로 간결하고 임팩트 있게 작성해주세요.
`;

    default:
      return '데이터를 분석하고 인사이트를 제공해주세요.';
  }
}

