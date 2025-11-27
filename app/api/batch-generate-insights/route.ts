import { NextRequest, NextResponse } from 'next/server';
import { generatePrompt } from '@/lib/prompts';
import { parseBrandId } from '@/lib/brandUtils';
import fs from 'fs';
import path from 'path';

/**
 * 배치 AI 인사이트 생성 API
 * 
 * 특정 기간의 모든 브랜드에 대해 AI 인사이트를 일괄 생성하고 CSV 파일로 저장합니다.
 */

// GitHub API를 사용하여 CSV 파일 업데이트
async function updateFileOnGitHub(
  fileName: string,
  newContent: string,
  githubToken: string,
  repoOwner: string,
  repoName: string,
  branch: string = 'main'
) {
  try {
    // 1. 기존 파일 정보 가져오기 (sha 필요)
    const getFileUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/public/${fileName}?ref=${branch}`;
    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let sha: string | undefined;
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      sha = fileData.sha;
    }

    // 2. Base64 인코딩
    const content = Buffer.from(newContent, 'utf-8').toString('base64');

    // 3. 파일 업데이트
    const updateUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/public/${fileName}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Batch AI insights generation for ${fileName}`,
        content: content,
        branch: branch,
        sha: sha,
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`GitHub API error: ${JSON.stringify(error)}`);
    }

    return await updateResponse.json();
  } catch (error: any) {
    console.error('GitHub API error:', error);
    throw error;
  }
}

// OpenAI API 호출 (재시도 로직 포함)
async function callOpenAI(prompt: string, apiKey: string, retries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
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
        // 502, 503, 504 같은 서버 에러는 재시도
        if ((response.status === 502 || response.status === 503 || response.status === 504) && attempt < retries) {
          const waitTime = attempt * 2000; // 2초, 4초, 6초...
          console.log(`OpenAI API ${response.status} 에러, ${waitTime}ms 후 재시도 (${attempt}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${errorText}`);
      }

      const result = await response.json();
      return result.choices[0]?.message?.content || '';
    } catch (error: any) {
      // 네트워크 에러나 타임아웃도 재시도
      if (attempt < retries && (error.message.includes('fetch') || error.message.includes('timeout'))) {
        const waitTime = attempt * 2000;
        console.log(`OpenAI API 네트워크 에러, ${waitTime}ms 후 재시도 (${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('OpenAI API 호출 실패: 최대 재시도 횟수 초과');
}

// Summary JSON 파일 경로 생성 (서버 사이드)
function getSummaryFilePath(period: string, brandCode: string): string {
  // 기간별 폴더 매핑
  const periodFolderMap: Record<string, string> = {
    '25FW': '25FW',
    '25SS': '25S',
    '26SS': '26SS',
    '26FW': '26FW',
  };

  const folder = periodFolderMap[period] || period;
  
  // 파일명에 사용할 periodCode 결정 (실제 파일명과 일치하도록)
  let periodCode: string;
  if (period === '25SS') {
    periodCode = '25s'; // 실제 파일명은 summary_25s_m.json
  } else if (period === '25FW') {
    periodCode = '25fw';
  } else {
    periodCode = period.toLowerCase();
  }
  
  // 25FW의 경우 특별 처리
  if (period === '25FW') {
    const brandMap: Record<string, string> = {
      'M': 'm',
      'I': 'i',
      'X': 'x',
      'ST': 'st',
      'V': 'v',
    };
    return path.join(process.cwd(), 'public', 'COST RAW', folder, `summary_${periodCode}_${brandMap[brandCode] || brandCode.toLowerCase()}.json`);
  }
  
  return path.join(process.cwd(), 'public', 'COST RAW', folder, `summary_${periodCode}_${brandCode.toLowerCase()}.json`);
}

// FX 파일 경로 (서버 사이드)
function getFxFilePath(): string {
  return path.join(process.cwd(), 'public', 'COST RAW', 'FX.csv');
}

// CSV 파일 경로 생성 (GitHub 저장용)
function getInsightFilePath(period: string, brandCode: string): string {
  // 기간별 폴더 매핑 (실제 폴더명과 일치)
  const periodFolderMap: Record<string, string> = {
    '25FW': '25FW',
    '25SS': '25S',  // 실제 폴더는 25S
    '26SS': '26SS',
    '26FW': '26FW',
  };
  
  const folder = periodFolderMap[period] || period;
  const periodCode = period.toLowerCase();
  return `COST RAW/${folder}/${brandCode}_insight_${periodCode}.csv`;
}

// Summary JSON 파일 로드 (서버 사이드)
function loadSummaryDataFromFile(filePath: string): any {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Summary 파일 로드 실패 (${filePath}):`, error);
    return null;
  }
}

// FX CSV 파일에서 환율 조회 (서버 사이드)
function getExchangeRatesFromFile(
  fxFilePath: string,
  brandCode: string,
  currentSeason: string,
  prevSeason: string
): { prev: number; curr: number } {
  try {
    const csvContent = fs.readFileSync(fxFilePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // 시즌 코드 변환
    const convertSeasonCode = (season: string): string => {
      if (season.endsWith('SS')) return season.replace('SS', 'S');
      if (season.endsWith('FW')) return season.replace('FW', 'F');
      return season;
    };
    
    const prevSeasonCode = convertSeasonCode(prevSeason);
    const currSeasonCode = convertSeasonCode(currentSeason);
    const category = '의류';
    
    let prevRate = 1300.0;
    let currRate = 1300.0;
    
    // 헤더 스킵하고 파싱
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 7) {
        const rowBrand = (values[1] || '').trim();
        const rowSeason = (values[2] || '').trim();
        const rowCategory = (values[5] || '').trim();
        const rate = parseFloat((values[6] || '0').trim()) || 0;
        
        if (rowBrand === brandCode && rowSeason === prevSeasonCode && rowCategory === category && rate > 0) {
          prevRate = rate;
        }
        
        if (rowBrand === brandCode && rowSeason === currSeasonCode && rowCategory === category && rate > 0) {
          currRate = rate;
        }
      }
    }
    
    return { prev: prevRate, curr: currRate };
  } catch (error) {
    console.error('FX 파일 로드 실패:', error);
    return { prev: 1300.0, curr: 1300.0 };
  }
}

// 브랜드별 AI 인사이트 생성
async function generateBrandInsights(
  brandId: string,
  brandCode: string,
  period: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<Record<string, string>> {
  const brandInfo = parseBrandId(brandId);
  const insights: Record<string, string> = {};

  try {
    // Summary JSON 로드 (서버 사이드)
    onProgress?.(`${brandCode} 브랜드 데이터 로드 중...`);
    const summaryPath = getSummaryFilePath(period, brandCode);
    const summary = loadSummaryDataFromFile(summaryPath);
    
    if (!summary || !summary.total) {
      throw new Error(`Summary 데이터를 불러올 수 없습니다: ${summaryPath}`);
    }

    // 환율 정보 로드 (서버 사이드)
    const fxPath = getFxFilePath();
    let fxRates;
    if (brandId.startsWith('26SS-') || brandId.startsWith('26FW-') || brandId.startsWith('25SS-')) {
      fxRates = getExchangeRatesFromFile(fxPath, brandInfo.brandCode, brandInfo.currentSeason, brandInfo.prevSeason);
    } else if (period === '25FW') {
      // 25FW 기간 브랜드 매핑
      const brandCodeForFx = brandId === '25FW' ? 'M' : brandId === 'KIDS' ? 'I' : brandId === 'DISCOVERY' ? 'X' : brandCode;
      fxRates = getExchangeRatesFromFile(fxPath, brandCodeForFx, '25FW', '24FW');
    } else {
      // 기본값
      fxRates = { prev: 1300.0, curr: 1300.0 };
    }

    const { total } = summary;

    // 데이터 준비
    const totalTagPrev_KRW = (total.avgTag24F_krw || 0) * (total.qty24F || 0);
    const totalTagCurr_KRW = (total.avgTag25F_krw || 0) * (total.qty25F || 0);
    const totalCost24F_USD = (total.avgCost24F_usd || 0) * (total.qty24F || 0);
    const totalCost25F_USD = (total.avgCost25F_usd || 0) * (total.qty25F || 0);
    const tagAmountYoY = totalTagPrev_KRW > 0 ? ((totalTagCurr_KRW / totalTagPrev_KRW) * 100) : 0;
    const costAmountYoY = totalCost24F_USD > 0 ? ((totalCost25F_USD / totalCost24F_USD) * 100) : 0;
    const fxYoY = fxRates.prev > 0 ? ((fxRates.curr / fxRates.prev) * 100) : 0;

    const materialArtworkChange = (total.materialRate25F_usd || 0) - (total.materialRate24F_usd || 0) + 
      (total.artworkRate25F_usd || 0) - (total.artworkRate24F_usd || 0);
    const laborChange = (total.laborRate25F_usd || 0) - (total.laborRate24F_usd || 0);
    const marginChange = (total.marginRate25F_usd || 0) - (total.marginRate24F_usd || 0);
    const expenseChange = (total.expenseRate25F_usd || 0) - (total.expenseRate24F_usd || 0);
    const exchangeRateEffect = (total.costRate25F_krw || 0) - (total.costRate25F_usd || 0);

    // 1. USD 섹션
    onProgress?.(`${brandCode} 브랜드 USD 분석 생성 중...`);
    const usdData = {
      costRate24F_usd: total.costRate24F_usd || 0,
      costRate25F_usd: total.costRate25F_usd || 0,
      costRateChange_usd: total.costRateChange_usd || 0,
      avgTag24F_usd: total.avgTag24F_usd || 0,
      avgTag25F_usd: total.avgTag25F_usd || 0,
      tagYoY_usd: total.tagYoY_usd || 0,
      avgCost24F_usd: total.avgCost24F_usd || 0,
      avgCost25F_usd: total.avgCost25F_usd || 0,
      costYoY_usd: total.costYoY_usd || 0,
      // 세부 항목별 원가율 (USD)
      materialRate24F_usd: total.materialRate24F_usd || 0,
      materialRate25F_usd: total.materialRate25F_usd || 0,
      artworkRate24F_usd: total.artworkRate24F_usd || 0,
      artworkRate25F_usd: total.artworkRate25F_usd || 0,
      laborRate24F_usd: total.laborRate24F_usd || 0,
      laborRate25F_usd: total.laborRate25F_usd || 0,
      marginRate24F_usd: total.marginRate24F_usd || 0,
      marginRate25F_usd: total.marginRate25F_usd || 0,
      expenseRate24F_usd: total.expenseRate24F_usd || 0,
      expenseRate25F_usd: total.expenseRate25F_usd || 0,
      // 세부 항목별 평균단가 (USD)
      material24F_usd: total.material24F_usd || 0,
      material25F_usd: total.material25F_usd || 0,
      artwork24F_usd: total.artwork24F_usd || 0,
      artwork25F_usd: total.artwork25F_usd || 0,
      labor24F_usd: total.labor24F_usd || 0,
      labor25F_usd: total.labor25F_usd || 0,
      margin24F_usd: total.margin24F_usd || 0,
      margin25F_usd: total.margin25F_usd || 0,
      expense24F_usd: total.expense24F_usd || 0,
      expense25F_usd: total.expense25F_usd || 0,
    };
    const usdPrompt = generatePrompt('usd', usdData, brandInfo.currentSeason, brandInfo.prevSeason);
    insights['usd_summary'] = await callOpenAI(usdPrompt, apiKey);

    // 2. KRW 섹션
    onProgress?.(`${brandCode} 브랜드 KRW 분석 생성 중...`);
    const krwData = {
      costRate24F_krw: total.costRate24F_krw || 0,
      costRate25F_krw: total.costRate25F_krw || 0,
      costRateChange_krw: total.costRateChange_krw || 0,
      costRate25F_usd: total.costRate25F_usd || 0,
      avgTag24F_krw: total.avgTag24F_krw || 0,
      avgTag25F_krw: total.avgTag25F_krw || 0,
      tagYoY_krw: total.tagYoY_krw || 0,
      avgCost24F_krw: total.avgCost24F_krw || 0,
      avgCost25F_krw: total.avgCost25F_krw || 0,
      costYoY_krw: total.costYoY_krw || 0,
      // 세부 항목별 원가율 (KRW)
      materialRate24F_krw: total.materialRate24F_krw || 0,
      materialRate25F_krw: total.materialRate25F_krw || 0,
      artworkRate24F_krw: total.artworkRate24F_krw || 0,
      artworkRate25F_krw: total.artworkRate25F_krw || 0,
      laborRate24F_krw: total.laborRate24F_krw || 0,
      laborRate25F_krw: total.laborRate25F_krw || 0,
      marginRate24F_krw: total.marginRate24F_krw || 0,
      marginRate25F_krw: total.marginRate25F_krw || 0,
      expenseRate24F_krw: total.expenseRate24F_krw || 0,
      expenseRate25F_krw: total.expenseRate25F_krw || 0,
      // 세부 항목별 평균단가 (USD - 참고용)
      material24F_usd: total.material24F_usd || 0,
      material25F_usd: total.material25F_usd || 0,
      artwork24F_usd: total.artwork24F_usd || 0,
      artwork25F_usd: total.artwork25F_usd || 0,
      labor24F_usd: total.labor24F_usd || 0,
      labor25F_usd: total.labor25F_usd || 0,
      margin24F_usd: total.margin24F_usd || 0,
      margin25F_usd: total.margin25F_usd || 0,
      expense24F_usd: total.expense24F_usd || 0,
      expense25F_usd: total.expense25F_usd || 0,
      // 환율 정보
      fxPrev: fxRates.prev,
      fxCurr: fxRates.curr,
    };
    const krwPrompt = generatePrompt('krw', krwData, brandInfo.currentSeason, brandInfo.prevSeason);
    insights['krw_summary'] = await callOpenAI(krwPrompt, apiKey);

    // 3. Waterfall 섹션들
    const waterfallData = {
      costRate24F_usd: total.costRate24F_usd || 0,
      costRate25F_usd: total.costRate25F_usd || 0,
      costRate25F_krw: total.costRate25F_krw || 0,
      materialArtworkChange,
      laborChange,
      marginChange,
      expenseChange,
      exchangeRateEffect,
    };

    onProgress?.(`${brandCode} 브랜드 Waterfall 분석 생성 중...`);
    const waterfallActionPrompt = generatePrompt('waterfall_action', waterfallData, brandInfo.currentSeason, brandInfo.prevSeason);
    const waterfallActionResult = await callOpenAI(waterfallActionPrompt, apiKey);
    try {
      const actionData = JSON.parse(waterfallActionResult);
      if (actionData.action && Array.isArray(actionData.action)) {
        actionData.action.forEach((action: string, index: number) => {
          insights[`action_${index + 1}`] = action;
        });
      }
    } catch (e) {
      console.error('Waterfall action 파싱 오류:', e);
    }

    const waterfallRiskPrompt = generatePrompt('waterfall_risk', waterfallData, brandInfo.currentSeason, brandInfo.prevSeason);
    const waterfallRiskResult = await callOpenAI(waterfallRiskPrompt, apiKey);
    try {
      const riskData = JSON.parse(waterfallRiskResult);
      if (riskData.risk && Array.isArray(riskData.risk)) {
        riskData.risk.forEach((risk: string, index: number) => {
          insights[`risk_${index + 1}`] = risk;
        });
      }
    } catch (e) {
      console.error('Waterfall risk 파싱 오류:', e);
    }

    const waterfallSuccessPrompt = generatePrompt('waterfall_success', waterfallData, brandInfo.currentSeason, brandInfo.prevSeason);
    const waterfallSuccessResult = await callOpenAI(waterfallSuccessPrompt, apiKey);
    try {
      const successData = JSON.parse(waterfallSuccessResult);
      if (successData.success && Array.isArray(successData.success)) {
        successData.success.forEach((success: string, index: number) => {
          insights[`success_${index + 1}`] = success;
        });
      }
    } catch (e) {
      console.error('Waterfall success 파싱 오류:', e);
    }

    const waterfallMessagePrompt = generatePrompt('waterfall_message', waterfallData, brandInfo.currentSeason, brandInfo.prevSeason);
    insights['message'] = await callOpenAI(waterfallMessagePrompt, apiKey);

    // 4. Metrics 섹션들
    const metricsData = {
      qty24F: total.qty24F || 0,
      qty25F: total.qty25F || 0,
      qtyYoY: total.qtyYoY || 0,
      costRate24F_usd: total.costRate24F_usd || 0,
      costRate25F_usd: total.costRate25F_usd || 0,
      costRateChange_usd: total.costRateChange_usd || 0,
      avgTag24F_usd: total.avgTag24F_usd || 0,
      avgTag25F_usd: total.avgTag25F_usd || 0,
      tagYoY_usd: total.tagYoY_usd || 0,
      avgCost24F_usd: total.avgCost24F_usd || 0,
      avgCost25F_usd: total.avgCost25F_usd || 0,
      costYoY_usd: total.costYoY_usd || 0,
      totalTag24F_KRW: totalTagPrev_KRW,
      totalTag25F_KRW: totalTagCurr_KRW,
      totalCost24F_USD: totalCost24F_USD,
      totalCost25F_USD: totalCost25F_USD,
      fxPrev: fxRates.prev,
      fxCurr: fxRates.curr,
      fxYoY,
      costRate24F_krw: total.costRate24F_krw || 0,
      costRate25F_krw: total.costRate25F_krw || 0,
      costRateChange_krw: total.costRateChange_krw || 0,
      avgTag24F_krw: total.avgTag24F_krw || 0,
      avgTag25F_krw: total.avgTag25F_krw || 0,
      tagYoY_krw: total.tagYoY_krw || 0,
      avgCost24F_krw: total.avgCost24F_krw || 0,
      avgCost25F_krw: total.avgCost25F_krw || 0,
      costYoY_krw: total.costYoY_krw || 0,
    };

    onProgress?.(`${brandCode} 브랜드 Metrics 분석 생성 중...`);
    insights['metrics_title'] = await callOpenAI(generatePrompt('metrics_title', metricsData, brandInfo.currentSeason, brandInfo.prevSeason), apiKey);
    insights['metrics_volume'] = await callOpenAI(generatePrompt('metrics_volume', metricsData, brandInfo.currentSeason, brandInfo.prevSeason), apiKey);
    insights['metrics_tag'] = await callOpenAI(generatePrompt('metrics_tag', metricsData, brandInfo.currentSeason, brandInfo.prevSeason), apiKey);
    insights['metrics_fx'] = await callOpenAI(generatePrompt('metrics_fx', metricsData, brandInfo.currentSeason, brandInfo.prevSeason), apiKey);
    insights['metrics_conclusion'] = await callOpenAI(generatePrompt('metrics_conclusion', metricsData, brandInfo.currentSeason, brandInfo.prevSeason), apiKey);

    // 5. Executive Summary 섹션 (USD/KRW 요약)
    onProgress?.(`${brandCode} 브랜드 Executive Summary 생성 중...`);
    const executiveData = {
      total: {
        costRate24F_usd: total.costRate24F_usd || 0,
        costRate25F_usd: total.costRate25F_usd || 0,
        costRateChange_usd: total.costRateChange_usd || 0,
        avgTag24F_usd: total.avgTag24F_usd || 0,
        avgTag25F_usd: total.avgTag25F_usd || 0,
        tagYoY_usd: total.tagYoY_usd || 0,
        avgCost24F_usd: total.avgCost24F_usd || 0,
        avgCost25F_usd: total.avgCost25F_usd || 0,
        costYoY_usd: total.costYoY_usd || 0,
      },
      categories: summary.categories || [],
    };
    
    // USD/KRW 요약은 기본적으로 생성하지 않음 (사용자가 필요시 개별 생성)
    // 대신 전체 요약만 생성
    const executivePrompt = generatePrompt('executive', executiveData, brandInfo.currentSeason, brandInfo.prevSeason);
    insights['executive_summary'] = await callOpenAI(executivePrompt, apiKey);

  } catch (error: any) {
    console.error(`브랜드 ${brandCode} 인사이트 생성 오류:`, error);
    throw error;
  }

  return insights;
}

// CSV 파일 생성 및 저장
function createCSVContent(insights: Record<string, string>): string {
  let csvContent = '\ufeffsection,key,value\n';
  
  Object.entries(insights).forEach(([section, value]) => {
    // 값에 쉼표나 따옴표가 있으면 따옴표로 감싸기
    let escapedValue = value;
    if (escapedValue.includes(',') || escapedValue.includes('"') || escapedValue.includes('\n')) {
      escapedValue = '"' + escapedValue.replace(/"/g, '""') + '"';
    }
    csvContent += `${section},,${escapedValue}\n`;
  });
  
  return csvContent;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period, brands } = body;

    if (!period || !brands || !Array.isArray(brands) || brands.length === 0) {
      return NextResponse.json(
        { error: 'period와 brands 배열이 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경 변수 확인
    const apiKey = process.env.OPENAI_API_KEY;
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    if (!githubToken || !repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'GitHub 설정이 완료되지 않았습니다. GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME을 설정해주세요.' },
        { status: 500 }
      );
    }

    const results: Array<{ brandCode: string; success: boolean; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // 각 브랜드별로 처리
    for (let i = 0; i < brands.length; i++) {
      const brand = brands[i];
      const { brandId, brandCode } = brand;

      try {
        // AI 인사이트 생성
        const insights = await generateBrandInsights(
          brandId,
          brandCode,
          period,
          apiKey,
          (message) => {
            console.log(`[${brandCode}] ${message}`);
          }
        );

        // CSV 파일 생성
        const csvContent = createCSVContent(insights);
        const fileName = getInsightFilePath(period, brandCode);

        // 로컬 파일 시스템에도 저장
        const localFilePath = path.join(process.cwd(), 'public', fileName);
        const localDir = path.dirname(localFilePath);
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        fs.writeFileSync(localFilePath, csvContent, 'utf-8');
        console.log(`[${brandCode}] 로컬 파일 저장 완료: ${localFilePath}`);

        // GitHub에 저장
        await updateFileOnGitHub(
          fileName,
          csvContent,
          githubToken,
          repoOwner,
          repoName
        );

        results.push({ brandCode, success: true });
        successCount++;
      } catch (error: any) {
        console.error(`브랜드 ${brandCode} 처리 실패:`, error);
        results.push({ brandCode, success: false, error: error.message });
        failedCount++;
        // 에러가 발생해도 다음 브랜드 계속 처리
      }
    }

    return NextResponse.json({
      success: true,
      period,
      total: brands.length,
      success: successCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error('배치 AI 분석 오류:', error);
    return NextResponse.json(
      { error: error.message || '배치 AI 분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

