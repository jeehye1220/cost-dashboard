import { NextRequest, NextResponse } from 'next/server';
import { generatePrompt } from '@/lib/prompts';
import { parseBrandId } from '@/lib/brandUtils';

/**
 * AI 코멘트 생성 API
 * 
 * OpenAI API를 사용하여 데이터 분석 코멘트를 생성합니다.
 * 환경 변수 OPENAI_API_KEY가 필요합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { section, data, brandId } = await request.json();

    // OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { comment: 'OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY를 추가해주세요.' },
        { status: 200 }
      );
    }

    // brandId에서 시즌 정보 추출
    let currentSeason: string | undefined;
    let prevSeason: string | undefined;
    
    if (brandId) {
      const brandInfo = parseBrandId(brandId);
      currentSeason = brandInfo.currentSeason;
      prevSeason = brandInfo.prevSeason;
    }

    // 섹션별 프롬프트 생성
    const prompt = generatePrompt(section, data, currentSeason, prevSeason);

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

