/**
 * AI 프롬프트 관리 파일
 * 
 * 모든 AI 코멘트 생성 프롬프트를 여기서 관리합니다.
 * 자연어로 작성되어 있어 쉽게 수정할 수 있습니다.
 */

import { formatSeasonForPrompt } from './brandUtils';

/**
 * data 객체에서 필드값 가져오기
 * 주의: 실제 JSON 파일의 필드명은 항상 24F, 25F 형식으로 고정되어 있음
 * 따라서 필드 접근은 기존 방식(24F, 25F)을 사용하고, 프롬프트 텍스트만 동적으로 변경
 */
function getDataField(data: any, fieldPrefix: string, isPrev: boolean): any {
  // 실제 JSON 필드명은 항상 24F(전년), 25F(당년) 형식
  const seasonCode = isPrev ? '24F' : '25F';
  const fieldName = `${fieldPrefix}${seasonCode}`;
  return data[fieldName];
}

/**
 * Excel 파일 경로 생성
 */
function getExcelFilePath(currentSeason?: string): string {
  const period = currentSeason || '25F';
  const periodUpper = period.toUpperCase();
  let seasonFolder = periodUpper;
  if (periodUpper === '25SS' || periodUpper === '25S') {
    seasonFolder = '25S';
  } else if (periodUpper === '26SS' || periodUpper === '26S') {
    seasonFolder = '26SS';
  } else if (periodUpper === '25FW' || periodUpper === '25F') {
    seasonFolder = '25FW';
  } else if (periodUpper === '24SS' || periodUpper === '24S') {
    seasonFolder = '24S';
  } else if (periodUpper === '24FW' || periodUpper === '24F') {
    seasonFolder = '24FW';
  }
  return `public/COST RAW/${seasonFolder}/item_cost_rate_${periodUpper}.xlsx`;
}

export function generatePrompt(
  section: string, 
  data: any, 
  currentSeason?: string, 
  prevSeason?: string
): string {
  // 기본값 설정 (하위 호환성)
  const currSeason = currentSeason || '25F';
  const prevSeas = prevSeason || '24F';
  const currSeasonDisplay = formatSeasonForPrompt(currSeason);
  const prevSeasonDisplay = formatSeasonForPrompt(prevSeas);
  
  // 동적 필드 접근 헬퍼 (실제 JSON 필드명은 항상 24F, 25F 형식)
  const getPrev = (prefix: string) => getDataField(data, prefix, true) || 0;
  const getCurr = (prefix: string) => getDataField(data, prefix, false) || 0;
  switch (section) {
    case 'usd':
      const usdPrev = getPrev('costRate') || data.costRate24F_usd || data.costRate24F || 0;
      const usdCurr = getCurr('costRate') || data.costRate25F_usd || data.costRate25F || 0;
      const usdChange = data.costRateChange_usd || data.avgCostRateChange || (usdCurr - usdPrev);
      const usdTagPrev = data.avgTag24F_usd || 0;
      const usdTagCurr = data.avgTag25F_usd || 0;
      const usdTagYoY = data.tagYoY_usd || 0;
      const usdCostPrev = data.avgCost24F_usd || 0;
      const usdCostCurr = data.avgCost25F_usd || 0;
      const usdCostYoY = data.costYoY_usd || 0;
      
      // 세부 항목별 원가율 변동
      const usdMatRatePrev = data.materialRate24F_usd || 0;
      const usdMatRateCurr = data.materialRate25F_usd || 0;
      const usdMatRateChange = usdMatRateCurr - usdMatRatePrev;
      const usdArtRatePrev = data.artworkRate24F_usd || 0;
      const usdArtRateCurr = data.artworkRate25F_usd || 0;
      const usdArtRateChange = usdArtRateCurr - usdArtRatePrev;
      const usdLabRatePrev = data.laborRate24F_usd || 0;
      const usdLabRateCurr = data.laborRate25F_usd || 0;
      const usdLabRateChange = usdLabRateCurr - usdLabRatePrev;
      const usdMarRatePrev = data.marginRate24F_usd || 0;
      const usdMarRateCurr = data.marginRate25F_usd || 0;
      const usdMarRateChange = usdMarRateCurr - usdMarRatePrev;
      const usdExpRatePrev = data.expenseRate24F_usd || 0;
      const usdExpRateCurr = data.expenseRate25F_usd || 0;
      const usdExpRateChange = usdExpRateCurr - usdExpRatePrev;
      
      // 세부 항목별 평균단가 변동
      const usdMatPrev = data.material24F_usd || 0;
      const usdMatCurr = data.material25F_usd || 0;
      const usdMatChange = usdMatCurr - usdMatPrev;
      const usdArtPrev = data.artwork24F_usd || 0;
      const usdArtCurr = data.artwork25F_usd || 0;
      const usdArtChange = usdArtCurr - usdArtPrev;
      const usdLabPrev = data.labor24F_usd || 0;
      const usdLabCurr = data.labor25F_usd || 0;
      const usdLabChange = usdLabCurr - usdLabPrev;
      const usdMarPrev = data.margin24F_usd || 0;
      const usdMarCurr = data.margin25F_usd || 0;
      const usdMarChange = usdMarCurr - usdMarPrev;
      const usdExpPrev = data.expense24F_usd || 0;
      const usdExpCurr = data.expense25F_usd || 0;
      const usdExpChange = usdExpCurr - usdExpPrev;
      
      // 전체 원가율 변동 방향
      const usdImproved = usdChange < 0; // 음수면 개선, 양수면 악화
      
      return `
다음은 ${currSeasonDisplay} 시즌의 USD 기준 원가율 데이터입니다:

**중요: 아이템별 상세 원가율 Excel 파일 분석 필수**
- Excel 파일 경로: ${getExcelFilePath(currSeason)}
- 이 Excel 파일에는 아이템별로 재료계, 아트웍, 공임, 마진, 경비의 원가율과 평균단가가 포함되어 있습니다.
- Excel 파일의 "USD 원가율" 시트와 "USD 평균단가" 시트를 분석하여 실제 원가율 변동의 원인을 파악하세요.
- 특히 변동이 큰 아이템과 항목(재료계/아트웍/공임/마진/경비)을 중심으로 분석하세요.

전체 원가율:
- ${prevSeasonDisplay} 원가율: ${usdPrev.toFixed(1)}%
- ${currSeasonDisplay} 원가율: ${usdCurr.toFixed(1)}%
- 원가율 변동: ${usdChange > 0 ? '+' : ''}${usdChange.toFixed(1)}%p ${usdImproved ? '(개선)' : '(악화)'}

세부 항목별 원가율 변동:
- 재료계 원가율: ${usdMatRatePrev.toFixed(1)}% → ${usdMatRateCurr.toFixed(1)}% (${usdMatRateChange > 0 ? '+' : ''}${usdMatRateChange.toFixed(1)}%p) ${usdMatRateChange < 0 ? '(개선)' : '(악화)'}
- 아트웍 원가율: ${usdArtRatePrev.toFixed(1)}% → ${usdArtRateCurr.toFixed(1)}% (${usdArtRateChange > 0 ? '+' : ''}${usdArtRateChange.toFixed(1)}%p) ${usdArtRateChange < 0 ? '(개선)' : '(악화)'}
- 공임 원가율: ${usdLabRatePrev.toFixed(1)}% → ${usdLabRateCurr.toFixed(1)}% (${usdLabRateChange > 0 ? '+' : ''}${usdLabRateChange.toFixed(1)}%p) ${usdLabRateChange < 0 ? '(개선)' : '(악화)'}
- 마진 원가율: ${usdMarRatePrev.toFixed(1)}% → ${usdMarRateCurr.toFixed(1)}% (${usdMarRateChange > 0 ? '+' : ''}${usdMarRateChange.toFixed(1)}%p) ${usdMarRateChange < 0 ? '(개선)' : '(악화)'}
- 경비 원가율: ${usdExpRatePrev.toFixed(1)}% → ${usdExpRateCurr.toFixed(1)}% (${usdExpRateChange > 0 ? '+' : ''}${usdExpRateChange.toFixed(1)}%p) ${usdExpRateChange < 0 ? '(개선)' : '(악화)'}

세부 항목별 평균단가 변동 (USD):
- 재료계 평균단가: $${usdMatPrev.toFixed(2)} → $${usdMatCurr.toFixed(2)} (${usdMatChange > 0 ? '+' : ''}${usdMatChange.toFixed(2)})
- 아트웍 평균단가: $${usdArtPrev.toFixed(2)} → $${usdArtCurr.toFixed(2)} (${usdArtChange > 0 ? '+' : ''}${usdArtChange.toFixed(2)})
- 공임 평균단가: $${usdLabPrev.toFixed(2)} → $${usdLabCurr.toFixed(2)} (${usdLabChange > 0 ? '+' : ''}${usdLabChange.toFixed(2)})
- 마진 평균단가: $${usdMarPrev.toFixed(2)} → $${usdMarCurr.toFixed(2)} (${usdMarChange > 0 ? '+' : ''}${usdMarChange.toFixed(2)})
- 경비 평균단가: $${usdExpPrev.toFixed(2)} → $${usdExpCurr.toFixed(2)} (${usdExpChange > 0 ? '+' : ''}${usdExpChange.toFixed(2)})

기타:
- 평균 TAG: $${usdTagPrev.toFixed(2)} → $${usdTagCurr.toFixed(2)} (YOY: ${usdTagYoY > 0 ? '+' : ''}${(usdTagYoY - 100).toFixed(1)}%)
- 평균 원가: $${usdCostPrev.toFixed(2)} → $${usdCostCurr.toFixed(2)} (YOY: ${usdCostYoY > 0 ? '+' : ''}${(usdCostYoY - 100).toFixed(1)}%)

중요: 전체 USD 원가율이 ${usdImproved ? '개선' : '악화'}되었습니다. 세부 항목별 원가율 변동 데이터를 분석하여 실제 원인을 파악하세요.

이 데이터를 분석하여 1-2줄로 핵심만 간략하게 인사이트를 제공해주세요. 다음을 반드시 포함해주세요:

1. 전체 원가율 변동 방향과 주요 원인 항목 명시 (예: "공임단가 +13.4% 상승(4.71→5.34 USD)으로 원가율 +0.5%p 악화")
2. 가장 큰 변동을 일으킨 항목을 중심으로 설명
3. 실질적인 원가 절감인지, TAG 상승이나 믹스 효과에 의한 비율상 개선인지 간단히 구분
4. 전문 용어 사용 (공정 슬리밍, 소재 믹스 최적화, 벤더 마진 등)

반드시 실제 데이터의 변동 방향에 맞게 작성하세요. 원가율이 상승했으면 "비용 상승", 하락했으면 "효율화" 등으로 표현하세요.

1-2줄로만 작성해주세요. 핵심만 간략하게!
`;

    case 'krw':
      const krwPrev = getPrev('costRate') || data.costRate24F_krw || data.costRate24F || 0;
      const krwCurr = getCurr('costRate') || data.costRate25F_krw || data.costRate25F || 0;
      const krwChange = data.costRateChange_krw || data.avgCostRateChange || (krwCurr - krwPrev);
      const krwUsd = data.costRate25F_usd || 0;
      const krwFxEffect = (krwCurr || 0) - (krwUsd || 0);
      const krwCostPrev = data.avgCost24F_krw || 0;
      const krwCostCurr = data.avgCost25F_krw || 0;
      const krwCostYoY = data.costYoY_krw || 0;
      
      // 세부 항목별 원가율 변동 (KRW)
      const krwMatRatePrev = data.materialRate24F_krw || 0;
      const krwMatRateCurr = data.materialRate25F_krw || 0;
      const krwMatRateChange = krwMatRateCurr - krwMatRatePrev;
      const krwArtRatePrev = data.artworkRate24F_krw || 0;
      const krwArtRateCurr = data.artworkRate25F_krw || 0;
      const krwArtRateChange = krwArtRateCurr - krwArtRatePrev;
      const krwLabRatePrev = data.laborRate24F_krw || 0;
      const krwLabRateCurr = data.laborRate25F_krw || 0;
      const krwLabRateChange = krwLabRateCurr - krwLabRatePrev;
      const krwMarRatePrev = data.marginRate24F_krw || 0;
      const krwMarRateCurr = data.marginRate25F_krw || 0;
      const krwMarRateChange = krwMarRateCurr - krwMarRatePrev;
      const krwExpRatePrev = data.expenseRate24F_krw || 0;
      const krwExpRateCurr = data.expenseRate25F_krw || 0;
      const krwExpRateChange = krwExpRateCurr - krwExpRatePrev;
      
      // 세부 항목별 평균단가 변동 (USD - KRW 분석 시 참고)
      const krwMatPrev = data.material24F_usd || 0;
      const krwMatCurr = data.material25F_usd || 0;
      const krwMatChange = krwMatCurr - krwMatPrev;
      const krwArtPrev = data.artwork24F_usd || 0;
      const krwArtCurr = data.artwork25F_usd || 0;
      const krwArtChange = krwArtCurr - krwArtPrev;
      const krwLabPrev = data.labor24F_usd || 0;
      const krwLabCurr = data.labor25F_usd || 0;
      const krwLabChange = krwLabCurr - krwLabPrev;
      const krwMarPrev = data.margin24F_usd || 0;
      const krwMarCurr = data.margin25F_usd || 0;
      const krwMarChange = krwMarCurr - krwMarPrev;
      const krwExpPrev = data.expense24F_usd || 0;
      const krwExpCurr = data.expense25F_usd || 0;
      const krwExpChange = krwExpCurr - krwExpPrev;
      
      // 환율 정보
      const fxPrev = data.fxPrev || data.fx?.prev || 0;
      const fxCurr = data.fxCurr || data.fx?.curr || 0;
      const fxYoY = fxPrev > 0 ? ((fxCurr / fxPrev) * 100) : 0;
      
      // 전체 원가율 변동 방향
      const krwImproved = krwChange < 0; // 음수면 개선, 양수면 악화
      
      return `
다음은 ${currSeasonDisplay} 시즌의 KRW 기준 원가율 데이터입니다:

**중요: 아이템별 상세 원가율 Excel 파일 분석 필수**
- Excel 파일 경로: ${getExcelFilePath(currSeason)}
- 이 Excel 파일에는 아이템별로 재료계, 아트웍, 공임, 마진, 경비의 원가율과 평균단가가 포함되어 있습니다.
- Excel 파일의 "KRW 원가율" 시트와 "USD 평균단가" 시트를 분석하여 실제 원가율 변동의 원인을 파악하세요.
- 특히 변동이 큰 아이템과 항목(재료계/아트웍/공임/마진/경비)을 중심으로 분석하세요.
- 환율 효과도 함께 고려하여 분석하세요.

전체 원가율:
- ${prevSeasonDisplay} 원가율: ${krwPrev.toFixed(1)}%
- ${currSeasonDisplay} 원가율: ${krwCurr.toFixed(1)}%
- ${currSeasonDisplay} USD 원가율: ${krwUsd.toFixed(1)}%
- 원가율 변동: ${krwChange > 0 ? '+' : ''}${krwChange.toFixed(1)}%p ${krwImproved ? '(개선)' : '(악화)'}
- 환율 효과: ${krwFxEffect.toFixed(1)}%p

환율 정보 (FX 파일 기준):
- 전년 환율: ${fxPrev.toFixed(2)}원
- 당년 환율: ${fxCurr.toFixed(2)}원
- 환율 변동: ${fxYoY > 0 ? '+' : ''}${(fxYoY - 100).toFixed(1)}% (${fxPrev.toFixed(2)}원 → ${fxCurr.toFixed(2)}원)

세부 항목별 원가율 변동 (KRW):
- 재료계 원가율: ${krwMatRatePrev.toFixed(1)}% → ${krwMatRateCurr.toFixed(1)}% (${krwMatRateChange > 0 ? '+' : ''}${krwMatRateChange.toFixed(1)}%p) ${krwMatRateChange < 0 ? '(개선)' : '(악화)'}
- 아트웍 원가율: ${krwArtRatePrev.toFixed(1)}% → ${krwArtRateCurr.toFixed(1)}% (${krwArtRateChange > 0 ? '+' : ''}${krwArtRateChange.toFixed(1)}%p) ${krwArtRateChange < 0 ? '(개선)' : '(악화)'}
- 공임 원가율: ${krwLabRatePrev.toFixed(1)}% → ${krwLabRateCurr.toFixed(1)}% (${krwLabRateChange > 0 ? '+' : ''}${krwLabRateChange.toFixed(1)}%p) ${krwLabRateChange < 0 ? '(개선)' : '(악화)'}
- 마진 원가율: ${krwMarRatePrev.toFixed(1)}% → ${krwMarRateCurr.toFixed(1)}% (${krwMarRateChange > 0 ? '+' : ''}${krwMarRateChange.toFixed(1)}%p) ${krwMarRateChange < 0 ? '(개선)' : '(악화)'}
- 경비 원가율: ${krwExpRatePrev.toFixed(1)}% → ${krwExpRateCurr.toFixed(1)}% (${krwExpRateChange > 0 ? '+' : ''}${krwExpRateChange.toFixed(1)}%p) ${krwExpRateChange < 0 ? '(개선)' : '(악화)'}

세부 항목별 평균단가 변동 (USD - 참고용):
- 재료계 평균단가: $${krwMatPrev.toFixed(2)} → $${krwMatCurr.toFixed(2)} (${krwMatChange > 0 ? '+' : ''}${krwMatChange.toFixed(2)})
- 아트웍 평균단가: $${krwArtPrev.toFixed(2)} → $${krwArtCurr.toFixed(2)} (${krwArtChange > 0 ? '+' : ''}${krwArtChange.toFixed(2)})
- 공임 평균단가: $${krwLabPrev.toFixed(2)} → $${krwLabCurr.toFixed(2)} (${krwLabChange > 0 ? '+' : ''}${krwLabChange.toFixed(2)})
- 마진 평균단가: $${krwMarPrev.toFixed(2)} → $${krwMarCurr.toFixed(2)} (${krwMarChange > 0 ? '+' : ''}${krwMarChange.toFixed(2)})
- 경비 평균단가: $${krwExpPrev.toFixed(2)} → $${krwExpCurr.toFixed(2)} (${krwExpChange > 0 ? '+' : ''}${krwExpChange.toFixed(2)})

기타:
- 평균 원가: ₩${krwCostPrev.toLocaleString() || '0'} → ₩${krwCostCurr.toLocaleString() || '0'} (YOY: ${krwCostYoY > 0 ? '+' : ''}${(krwCostYoY - 100).toFixed(1)}%)

중요: 전체 KRW 원가율이 ${krwImproved ? '개선' : '악화'}되었습니다. 세부 항목별 원가율 변동과 환율 효과를 분석하여 실제 원인을 파악하세요.

이 데이터를 분석하여 1-2줄로 핵심만 간략하게 인사이트를 제공해주세요. 다음을 반드시 포함해주세요:

1. 전체 원가율 변동 방향과 주요 원인 항목 명시 (예: "환율 +9.4% 상승(1,288→1,420원)으로 USD 개선 효과 상쇄, KRW 원가율 +1.6%p 악화")
2. 환율 효과와 USD 기준 개선 효과 상쇄 여부 명확히 설명
3. 가장 큰 변동을 일으킨 항목을 중심으로 설명
4. 실손익 관점에서의 평가
5. 전문 용어 사용 (환율 효과, 실손익 등)

반드시 실제 데이터의 변동 방향에 맞게 작성하세요. 원가율이 상승했으면 "비용 상승", 하락했으면 "효율화" 등으로 표현하세요.

1-2줄로만 작성해주세요. 핵심만 간략하게!
`;

    case 'waterfall':
      const wfPrevUsd = getPrev('costRate') || data.costRate24F_usd || 0;
      const wfCurrUsd = getCurr('costRate') || data.costRate25F_usd || 0;
      const wfCurrKrw = data.costRate25F_krw || 0;
      return `
다음은 ${prevSeasonDisplay}에서 ${currSeasonDisplay}로의 원가율 변동 분석입니다:
- ${prevSeasonDisplay} USD 원가율: ${wfPrevUsd.toFixed(1)}%
- ${currSeasonDisplay} USD 원가율: ${wfCurrUsd.toFixed(1)}%
- ${currSeasonDisplay} KRW 원가율: ${wfCurrKrw.toFixed(1)}%
- 원부자재+아트웍 변동: ${data.materialArtworkChange?.toFixed(1) || '0'}%p
- 공임 변동: ${data.laborChange?.toFixed(1) || '0'}%p
- 마진 변동: ${data.marginChange?.toFixed(1) || '0'}%p
- 경비 변동: ${data.expenseChange?.toFixed(1) || '0'}%p
- 환율 효과: ${data.exchangeRateEffect?.toFixed(1) || '0'}%p

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

    case 'waterfall_action':
      const wfaPrevUsd = getPrev('costRate') || data.costRate24F_usd || 0;
      const wfaCurrUsd = getCurr('costRate') || data.costRate25F_usd || 0;
      const wfaCurrKrw = data.costRate25F_krw || 0;
      return `
다음은 ${prevSeasonDisplay}에서 ${currSeasonDisplay}로의 원가율 변동 분석입니다:
- ${prevSeasonDisplay} USD 원가율: ${wfaPrevUsd.toFixed(1)}%
- ${currSeasonDisplay} USD 원가율: ${wfaCurrUsd.toFixed(1)}%
- ${currSeasonDisplay} KRW 원가율: ${wfaCurrKrw.toFixed(1)}%
- 원부자재+아트웍 변동: ${data.materialArtworkChange?.toFixed(1) || '0'}%p
- 공임 변동: ${data.laborChange?.toFixed(1) || '0'}%p
- 마진 변동: ${data.marginChange?.toFixed(1) || '0'}%p
- 경비 변동: ${data.expenseChange?.toFixed(1) || '0'}%p
- 환율 효과: ${data.exchangeRateEffect?.toFixed(1) || '0'}%p

이 데이터를 분석하여 즉시 실행 가능한 구체적인 액션 아이템 4개를 생성해주세요. 각 항목은 1-2문장으로 작성하고, 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "공임 –0.43 USD 절감 (2.83 → 2.40 USD)", "공임단가 상승분(5.34 USD/pcs)을 최소화")
2. 실행 가능한 구체적 방법 제시 (예: "Inner 공정개선 모델을 Outer·Bottom으로 확대 적용", "봉제공정 단순화, 효율 공장 물량 축소")
3. 전문 용어 사용 (공정 슬리밍, 소재 믹스 최적화, 벤더 마진 회수 등)
4. 명확한 목표 수치나 효과 제시 (예: "공임 0.5~1.0%p 절감 목표", "원가율 0.6~1.0%p 악화 가능 → 공정 슬리밍 필요")

25FW MLB 예시 스타일:
- Inner 공정개선 모델을 Outer·Bottom으로 확대 적용 (Inner 공임 2.83 → 2.40 USD, △0.43 USD 감소)
- 팬츠·우븐류 봉제 난이도 단순화 및 스티칭 축소 → 원부자재 단가 하락에도 공임비 상승으로 평균원가 개선 폭이 제한된 만큼, 공임 0.5~1.0%p 절감 목표로 설계 단순화 추진

JSON 형식:
{
  "action": ["항목1", "항목2", "항목3", "항목4"]
}
`;

    case 'waterfall_risk':
      const wfrPrevUsd = getPrev('costRate') || data.costRate24F_usd || 0;
      const wfrCurrUsd = getCurr('costRate') || data.costRate25F_usd || 0;
      const wfrCurrKrw = data.costRate25F_krw || 0;
      return `
다음은 ${prevSeasonDisplay}에서 ${currSeasonDisplay}로의 원가율 변동 분석입니다:
- ${prevSeasonDisplay} USD 원가율: ${wfrPrevUsd.toFixed(1)}%
- ${currSeasonDisplay} USD 원가율: ${wfrCurrUsd.toFixed(1)}%
- ${currSeasonDisplay} KRW 원가율: ${wfrCurrKrw.toFixed(1)}%
- 원부자재+아트웍 변동: ${data.materialArtworkChange?.toFixed(1) || '0'}%p
- 공임 변동: ${data.laborChange?.toFixed(1) || '0'}%p
- 마진 변동: ${data.marginChange?.toFixed(1) || '0'}%p
- 경비 변동: ${data.expenseChange?.toFixed(1) || '0'}%p
- 환율 효과: ${data.exchangeRateEffect?.toFixed(1) || '0'}%p

이 데이터를 분석하여 주의해야 할 리스크 요인 3개를 생성해주세요. 각 항목은 1-2문장으로 작성하고, 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "환율(1,288→1,420원) 상승 영향으로 KRW 기준 원가율 +0.1%p 담금", "공임 비중 상승 → 원가율 0.6~1.0%p 악화 가능")
2. 리스크의 구체적 원인과 영향 설명 (예: "TAG 의존 구조의 취약성", "카테고리별 가격 전가력 차이")
3. 전문 용어 사용 (환율 리스크, 원자재 리스크, 마진 리스크, 공급망 리스크 등)
4. 명확한 인과관계와 대응 방안 제시 (예: "→ 기준환율 관리 필요", "→ 세밀한 원가관리 필요")

25FW MLB/KIDS 예시 스타일:
- 환율(1,288→1,420원) 상승 영향으로 KRW 기준 원가율 +0.1%p 담금. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +0.9%p 악화
- TAG 의존 구조의 취약성 → 원가율 개선이 TAG 인상 효과에 의존하고 있어, 환율 상승·할인율 확대 시 즉각적인 원가율 악화 리스크 존재

JSON 형식:
{
  "risk": ["항목1", "항목2", "항목3"]
}
`;

    case 'waterfall_success':
      const wfsPrevUsd = getPrev('costRate') || data.costRate24F_usd || 0;
      const wfsCurrUsd = getCurr('costRate') || data.costRate25F_usd || 0;
      const wfsCurrKrw = data.costRate25F_krw || 0;
      return `
다음은 ${prevSeasonDisplay}에서 ${currSeasonDisplay}로의 원가율 변동 분석입니다:
- ${prevSeasonDisplay} USD 원가율: ${wfsPrevUsd.toFixed(1)}%
- ${currSeasonDisplay} USD 원가율: ${wfsCurrUsd.toFixed(1)}%
- ${currSeasonDisplay} KRW 원가율: ${wfsCurrKrw.toFixed(1)}%
- 원부자재+아트웍 변동: ${data.materialArtworkChange?.toFixed(1) || '0'}%p
- 공임 변동: ${data.laborChange?.toFixed(1) || '0'}%p
- 마진 변동: ${data.marginChange?.toFixed(1) || '0'}%p
- 경비 변동: ${data.expenseChange?.toFixed(1) || '0'}%p
- 환율 효과: ${data.exchangeRateEffect?.toFixed(1) || '0'}%p

이 데이터를 분석하여 긍정적인 성과와 개선사항 4개를 생성해주세요. 각 항목은 1-2문장으로 작성하고, 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "정상마진 –0.2%p 하락 (2.0% → 1.8%)", "충전재 믹스 최적화로 소재단가 평균 –4.88 USD 절감 (12.91 → 11.03 USD)")
2. 실질적인 개선인지, 비율상 개선인지 명확히 구분 (예: "실질적인 원가 절감은 제한적", "비율상 개선효과")
3. 전문 용어 사용 (규조적 단가 절감, 협상 통계력, 벤더 마진 회수, 소재 믹스 최적화 등)
4. 명확한 인과관계 설명 (예: "협상이 아닌 소재 전략 개선이 주된 요인", "TAG 인상(+7.3%)과 고TAG 제품 믹스 확대로 인한 비율상 개선효과")

25FW MLB/KIDS 예시 스타일:
- 정상마진 –0.2%p 하락 (2.0% → 1.8%) → 벤더 마진 회수 성공, 협상력 개선을 통한 구매단가 절감 효과 확인
- 원가율 개선 배경 (USD 기준): 평균단가 상승(19.90 → 20.91, +5.1%)에도 불구하고 원가율 23.9% → 23.4%(–0.5%p) 개선. 이는 TAG 인상(91.8 → 98.5, +7.3%)과 고TAG 제품 믹스 확대로 인한 비율상 개선효과이며, 실질적인 원가 절감은 제한적임.

JSON 형식:
{
  "success": ["항목1", "항목2", "항목3", "항목4"]
}
`;

    case 'waterfall_message':
      const wfmPrevUsd = getPrev('costRate') || data.costRate24F_usd || 0;
      const wfmCurrUsd = getCurr('costRate') || data.costRate25F_usd || 0;
      const wfmCurrKrw = data.costRate25F_krw || 0;
      return `
다음은 ${prevSeasonDisplay}에서 ${currSeasonDisplay}로의 원가율 변동 분석입니다:
- ${prevSeasonDisplay} USD 원가율: ${wfmPrevUsd.toFixed(1)}%
- ${currSeasonDisplay} USD 원가율: ${wfmCurrUsd.toFixed(1)}%
- ${currSeasonDisplay} KRW 원가율: ${wfmCurrKrw.toFixed(1)}%
- 원부자재+아트웍 변동: ${data.materialArtworkChange?.toFixed(1) || '0'}%p
- 공임 변동: ${data.laborChange?.toFixed(1) || '0'}%p
- 마진 변동: ${data.marginChange?.toFixed(1) || '0'}%p
- 경비 변동: ${data.expenseChange?.toFixed(1) || '0'}%p
- 환율 효과: ${data.exchangeRateEffect?.toFixed(1) || '0'}%p

이 데이터를 종합하여 경영진을 위한 핵심 메시지를 3-4문장으로 작성해주세요. 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "25F 시즌은 TAG 상승(+7.3%)과 Outer 비중 28%→29%를 통해 원가율을 개선한 시즌입니다")
2. 실질 개선 vs 비율상 개선 구분 (예: "실질 제조원가는 +5.1% 상승했으며, 특히 공임단가 (4.71→5.34, +13.4%)")
3. 전문 용어 사용 (구조적 원가 방어, 공정 슬리밍, 소싱 다변화 등)
4. 명확한 인과관계와 향후 전략 방향 제시 (예: "다음 시즌은 가격 효과 의존도를 줄이고, 공임·아트웍 등 실질 제조원가 절감에 집중")

25FW MLB/KIDS 예시 스타일:
25F 시즌은 TAG 상승(+7.3%)과 Outer 비중 28%→29%(고가제품)을 통해 원가율을 개선한 시즌입니다. 그러나 실질 제조원가는 +5.1% 상승했으며, 특히 공임단가 (4.71→5.34, +13.4%), 아트웍(1.04→1.37, +31.7%)이 급등했습니다. USD 기준 23.9% → 23.4%로 개선되었으나, 환율 상승으로 KRW 기준은 25.5%로 상승했습니다. 다음 시즌은 가격 효과 의존도를 줄이고, 공임·아트웍 등 실질 제조원가 절감에 집중하여 지속 가능한 수익성을 확보해야 합니다.

텍스트 형식으로만 답변해주세요 (JSON 없이).
`;

    case 'category':
      return `
다음은 카테고리별 ${currSeasonDisplay} 원가율 데이터입니다:
${data.categories?.map((cat: any) => {
  const currRate = cat.costRate25F_usd || cat.costRate25F || 0;
  const change = cat.costRateChange || 0;
  return `- ${cat.category}: ${currRate.toFixed(1)}% (${change > 0 ? '+' : ''}${change.toFixed(1)}%p)`;
}).join('\n') || '데이터 없음'}

카테고리별 원가 구성의 특징과 차이를 분석하고, 개선이 필요한 카테고리와 구체적인 액션 아이템을 3-4문장으로 제안해주세요.
`;

    case 'executive':
      const execTotal = data.total || {};
      const execCurrUsd = execTotal.costRate25F_usd || 0;
      const execChange = execTotal.costRateChange_usd || 0;
      const execTag = execTotal.avgTag25F_usd || 0;
      const execTagYoY = execTotal.tagYoY_usd || 0;
      const execCost = execTotal.avgCost25F_usd || 0;
      const execCostYoY = execTotal.costYoY_usd || 0;
      return `
다음은 ${currSeasonDisplay} 시즌의 전체 원가 분석 결과입니다:
- 전체 원가율: ${execCurrUsd.toFixed(1)}% (${execChange > 0 ? '+' : ''}${execChange.toFixed(1)}%p)
- 평균 TAG: $${execTag.toFixed(2)} (YOY: ${execTagYoY.toFixed(1)}%)
- 평균 원가: $${execCost.toFixed(2)} (YOY: ${execCostYoY.toFixed(1)}%)

카테고리별 원가율:
${data.categories?.map((cat: any) => {
  const catRate = cat.costRate25F_usd || 0;
  return `- ${cat.category}: ${catRate.toFixed(1)}%`;
}).join('\n') || '데이터 없음'}

경영진을 위한 종합 분석 리포트를 작성해주세요:
1. 핵심 성과 요약 (2-3문장)
2. 주요 리스크 및 기회 요인 (2-3문장)
3. 전략적 제언 (2-3문장)

총 6-9문장으로 간결하고 임팩트 있게 작성해주세요.
`;

    case 'metrics_title':
      const mtQtyPrev = data.qty24F || 0;
      const mtQtyCurr = data.qty25F || 0;
      const mtQtyYoY = data.qtyYoY || 0;
      const mtCostPrev = data.costRate24F_usd || 0;
      const mtCostCurr = data.costRate25F_usd || 0;
      const mtCostChange = data.costRateChange_usd || (mtCostCurr - mtCostPrev);
      return `
주요 지표를 보면 총생산수량이 ${mtQtyPrev?.toLocaleString() || '0'}개에서 ${mtQtyCurr?.toLocaleString() || '0'}개로 ${mtQtyYoY > 100 ? '증가' : '감소'}했고, 
원가율은 USD 기준으로 ${mtCostPrev?.toFixed(1) || '0'}%에서 ${mtCostCurr?.toFixed(1) || '0'}%로 ${mtCostChange > 0 ? '상승' : '하락'}했습니다.

이런 변화를 한 문장으로 요약하는 제목을 만들어줘. 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "생산수량 114.2% 증가, TAG +8.7% 상승으로 생산단가 +9.4% 증가에도 USD 원가율 0.8%p 개선")
2. 핵심 인사이트 강조 (예: "TAG 가격 상승으로 원가율 개선", "환율에 상쇄")
3. 간결하고 임팩트 있게 작성

25FW MLB/KIDS 예시 스타일:
- 핵심 성과: 생산수량 114.2% 증가, TAG +8.7% 상승으로 생산단가 +9.4% 증가에도 USD 원가율 0.8%p 개선
- 핵심 성과: 생산수량 87.9% 감소, TAG +7.3% 상승으로 생산단가 +5.1% 증가에도 USD 원가율 0.5%p 개선
`;

    case 'metrics_volume':
      const mvQtyPrev = data.qty24F || 0;
      const mvQtyCurr = data.qty25F || 0;
      const mvQtyYoY = data.qtyYoY || 0;
      const mvTagPrev = data.totalTag24F_KRW || 0;
      const mvTagCurr = data.totalTag25F_KRW || 0;
      const mvCostPrev = data.totalCost24F_USD || 0;
      const mvCostCurr = data.totalCost25F_USD || 0;
      return `
생산 규모를 보면 총생산수량이 ${mvQtyPrev?.toLocaleString() || '0'}개에서 ${mvQtyCurr?.toLocaleString() || '0'}개로 ${mvQtyYoY > 100 ? '증가' : '감소'}했고 (YOY: ${mvQtyYoY?.toFixed(1) || '0'}%), 
총판매가는 ${mvTagPrev ? (mvTagPrev / 1000000).toFixed(1) : '0'}M원에서 ${mvTagCurr ? (mvTagCurr / 1000000).toFixed(1) : '0'}M원으로 변화했으며,
총생산액은 $${mvCostPrev ? (mvCostPrev / 1000000).toFixed(1) : '0'}M에서 $${mvCostCurr ? (mvCostCurr / 1000000).toFixed(1) : '0'}M로 변화했습니다.

생산 규모 변화가 원가율에 미친 영향을 분석해서 2-3문장으로 설명해줘. 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "생산수량 391.1만개 → 446.8만개 (+114.2%) 증가로 스케일 메리트 확보")
2. 규모의 경제 효과나 부작용 명확히 설명
3. 전문 용어 사용 (스케일 메리트, 전략적 물량 조정 등)

25FW MLB/KIDS 예시 스타일:
- 생산수량 391.1만개 → 446.8만개 (+114.2%) 증가로 스케일 메리트 확보. 총판매가는 8.7% 증가하여 고가 제품 믹스 확대 전략 확인됨
- 생산수량 66.6만개 → 58.5만개 (87.9%) 감소. 시장 축소 또는 전략적 물량 조정으로 추정됨
`;

    case 'metrics_tag':
      const mtagPrev = data.avgTag24F_usd || 0;
      const mtagCurr = data.avgTag25F_usd || 0;
      const mtagYoY = data.tagYoY_usd || 0;
      const mtagCostPrev = data.costRate24F_usd || 0;
      const mtagCostCurr = data.costRate25F_usd || 0;
      const mtagCostChange = data.costRateChange_usd || (mtagCostCurr - mtagCostPrev);
      return `
TAG를 보면 평균 TAG가 USD 기준으로 $${mtagPrev?.toFixed(2) || '0'}에서 $${mtagCurr?.toFixed(2) || '0'}로 ${mtagYoY > 100 ? '상승' : '하락'}했고 (YOY: ${mtagYoY?.toFixed(1) || '0'}%), 
원가율은 ${mtagCostPrev?.toFixed(1) || '0'}%에서 ${mtagCostCurr?.toFixed(1) || '0'}%로 ${mtagCostChange > 0 ? '상승' : '하락'}했습니다.

TAG 변화가 원가율에 미친 영향을 분석해서 2-3문장으로 설명해줘. 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "평균TAG $6.74 상승(+7.3%)", "원가M/U 4.18→4.27 (+0.09)")
2. TAG 상승이 원가율 개선에 도움이 됐는지, 아니면 원가 상승이 TAG 상승을 상쇄했는지 명확히 구분
3. Price Effect vs 실질 절감 구분 (예: "TAG 상승 전략이 원가 인상 압력을 상쇄하여 USD 원가율 0.5%p 개선 달성")
4. 전문 용어 사용 (원가M/U, TAG 상승 전략 등)

25FW MLB/KIDS 예시 스타일:
- 평균TAG $6.74 상승(+7.3%)으로 원가율 방어. TAG 상승 전략이 원가 인상 압력을 상쇄하여 USD 원가율 0.5%p 개선 달성. 원가M/U 4.18→4.27 (+0.09)로 수익성 개선됨
`;

    case 'metrics_fx':
      const mfxPrev = data.fxPrev || 0;
      const mfxCurr = data.fxCurr || 0;
      const mfxYoY = data.fxYoY || 0;
      const mfxCostPrevUsd = data.costRate24F_usd || 0;
      const mfxCostCurrUsd = data.costRate25F_usd || 0;
      const mfxCostPrevKrw = data.costRate24F_krw || 0;
      const mfxCostCurrKrw = data.costRate25F_krw || 0;
      const mfxEffect = (mfxCostCurrKrw || 0) - (mfxCostCurrUsd || 0);
      return `
환율을 보면 ${mfxPrev?.toFixed(2) || '0'}원에서 ${mfxCurr?.toFixed(2) || '0'}원으로 ${mfxYoY > 100 ? '상승' : '하락'}했고 (YOY: ${mfxYoY?.toFixed(1) || '0'}%), 
원가율은 USD 기준 ${mfxCostPrevUsd?.toFixed(1) || '0'}%에서 ${mfxCostCurrUsd?.toFixed(1) || '0'}%로, 
KRW 기준 ${mfxCostPrevKrw?.toFixed(1) || '0'}%에서 ${mfxCostCurrKrw?.toFixed(1) || '0'}%로 변화했습니다.
환율 효과는 ${mfxEffect.toFixed(1)}%p입니다.

환율 변동이 원가율과 실손익에 미친 영향을 분석해서 2-3문장으로 설명해줘. 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "환율 +9.4% 상승(1321.46→1445.55원)", "KRW 기준 생산단가 +14.9% 급증")
2. USD 기준 개선 효과가 환율 악화로 상쇄되었는지 명확히 설명
3. 실손익 관점에서의 평가 (예: "USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +1.6%p 악화")
4. 전문 용어 사용 (환율 효과, 실손익 등)

25FW MLB/KIDS 예시 스타일:
- 환율 +9.4% 상승(1321.46→1445.55원)으로 KRW 기준 생산단가 +14.9% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +1.6%p 악화
`;

    case 'metrics_conclusion':
      const mcQtyPrev = data.qty24F || 0;
      const mcQtyCurr = data.qty25F || 0;
      const mcQtyYoY = data.qtyYoY || 0;
      const mcCostPrev = data.costRate24F_usd || 0;
      const mcCostCurr = data.costRate25F_usd || 0;
      const mcCostChange = data.costRateChange_usd || (mcCostCurr - mcCostPrev);
      const mcTagPrev = data.avgTag24F_usd || 0;
      const mcTagCurr = data.avgTag25F_usd || 0;
      const mcTagYoY = data.tagYoY_usd || 0;
      const mcCostAmtPrev = data.avgCost24F_usd || 0;
      const mcCostAmtCurr = data.avgCost25F_usd || 0;
      const mcCostAmtYoY = data.costYoY_usd || 0;
      const mcFxPrev = data.fxPrev || 0;
      const mcFxCurr = data.fxCurr || 0;
      const mcFxYoY = data.fxYoY || 0;
      return `
전체 주요 지표를 종합하면:
- 총생산수량: ${mcQtyPrev?.toLocaleString() || '0'}개 → ${mcQtyCurr?.toLocaleString() || '0'}개 (YOY: ${mcQtyYoY?.toFixed(1) || '0'}%)
- 원가율(USD): ${mcCostPrev?.toFixed(1) || '0'}% → ${mcCostCurr?.toFixed(1) || '0'}% (${mcCostChange > 0 ? '+' : ''}${mcCostChange?.toFixed(1) || '0'}%p)
- 평균 TAG(USD): $${mcTagPrev?.toFixed(2) || '0'} → $${mcTagCurr?.toFixed(2) || '0'} (YOY: ${mcTagYoY?.toFixed(1) || '0'}%)
- 평균 원가(USD): $${mcCostAmtPrev?.toFixed(2) || '0'} → $${mcCostAmtCurr?.toFixed(2) || '0'} (YOY: ${mcCostAmtYoY?.toFixed(1) || '0'}%)
- 환율: ${mcFxPrev?.toFixed(2) || '0'}원 → ${mcFxCurr?.toFixed(2) || '0'}원 (YOY: ${mcFxYoY?.toFixed(1) || '0'}%)

이 모든 데이터를 종합해서 경영진을 위한 핵심 시사점을 3-4문장으로 요약해줘. 다음을 반드시 포함해주세요:

1. 구체적인 수치와 변화율 명시 (예: "물량 감소(-12.1%)에도 TAG 인상 전략(+7.3%)으로 USD 기준 원가율을 개선했으나")
2. 핵심 인사이트와 리스크 요약 (예: "환율 급등(+9.4%)으로 KRW 실손익은 압박받는 구조")
3. 향후 전략 방향 제시 (예: "물량 회복이 핵심 과제", "생산단가 절감이 핵심 과제")
4. 전문 용어 사용 (TAG 인상 전략, 실손익, 원가율 방어 등)

25FW MLB/KIDS 예시 스타일:
- KIDS는 물량 감소(-12.1%)에도 TAG 인상 전략(+7.3%)으로 USD 기준 원가율을 개선했으나, 환율 급등(+9.4%)으로 KRW 실손익은 압박받는 구조. 물량 회복이 핵심 과제
- MLB 25FW은 대량생산(+114.2%)과 고가 믹스 전략으로 USD 기준 원가율을 방어했으나, 생산단가 인상(+9.4%)과 환율 급등(+10.2%)으로 KRW 실손익은 압박받는 구조. 향후 생산단가 절감이 핵심 과제
`;

    case 'executive_usd_item':
      const eusdCostPrev = data.costRate24F_usd || 0;
      const eusdCostCurr = data.costRate25F_usd || 0;
      const eusdCostChange = data.costRateChange_usd || (eusdCostCurr - eusdCostPrev);
      const eusdTagPrev = data.avgTag24F_usd || 0;
      const eusdTagCurr = data.avgTag25F_usd || 0;
      const eusdTagYoY = data.tagYoY_usd || 0;
      const eusdCostAmtPrev = data.avgCost24F_usd || 0;
      const eusdCostAmtCurr = data.avgCost25F_usd || 0;
      const eusdCostAmtYoY = data.costYoY_usd || 0;
      
      // 각 항목별 원가율 변동 계산
      const eusdMatRatePrev = data.materialRate24F_usd || 0;
      const eusdMatRateCurr = data.materialRate25F_usd || 0;
      const eusdMatRateChange = eusdMatRateCurr - eusdMatRatePrev;
      const eusdArtRatePrev = data.artworkRate24F_usd || 0;
      const eusdArtRateCurr = data.artworkRate25F_usd || 0;
      const eusdArtRateChange = eusdArtRateCurr - eusdArtRatePrev;
      const eusdLabRatePrev = data.laborRate24F_usd || 0;
      const eusdLabRateCurr = data.laborRate25F_usd || 0;
      const eusdLabRateChange = eusdLabRateCurr - eusdLabRatePrev;
      const eusdMarRatePrev = data.marginRate24F_usd || 0;
      const eusdMarRateCurr = data.marginRate25F_usd || 0;
      const eusdMarRateChange = eusdMarRateCurr - eusdMarRatePrev;
      const eusdExpRatePrev = data.expenseRate24F_usd || 0;
      const eusdExpRateCurr = data.expenseRate25F_usd || 0;
      const eusdExpRateChange = eusdExpRateCurr - eusdExpRatePrev;
      
      // 요청된 항목에 따른 변동 방향 확인
      const itemTitle = (data.itemTitle || '').toLowerCase();
      let itemRateChange = 0;
      let itemName = '';
      
      if (itemTitle.includes('원부자재') || itemTitle.includes('원자재') || itemTitle.includes('material')) {
        itemRateChange = eusdMatRateChange;
        itemName = '원부자재';
      } else if (itemTitle.includes('아트웍') || itemTitle.includes('artwork')) {
        itemRateChange = eusdArtRateChange;
        itemName = '아트웍';
      } else if (itemTitle.includes('공임') || itemTitle.includes('labor')) {
        itemRateChange = eusdLabRateChange;
        itemName = '공임';
      } else if (itemTitle.includes('마진') || itemTitle.includes('margin')) {
        itemRateChange = eusdMarRateChange;
        itemName = '마진';
      } else if (itemTitle.includes('경비') || itemTitle.includes('expense')) {
        itemRateChange = eusdExpRateChange;
        itemName = '경비';
      }
      
      const itemImproved = itemRateChange < 0; // 음수면 개선, 양수면 악화
      
      // 제목 생성 로직
      let suggestedTitle = '';
      if (itemName) {
        if (itemImproved) {
          if (itemName === '원부자재') suggestedTitle = '원부자재 효율화';
          else if (itemName === '아트웍') suggestedTitle = '아트웍 효율화';
          else if (itemName === '공임') suggestedTitle = '공임 효율화';
          else if (itemName === '마진') suggestedTitle = '마진율 최적화';
          else if (itemName === '경비') suggestedTitle = '경비율 절감';
        } else {
          if (itemName === '원부자재') suggestedTitle = '원부자재 비용 상승';
          else if (itemName === '아트웍') suggestedTitle = '아트웍 비용 상승';
          else if (itemName === '공임') suggestedTitle = '공임 비용 상승';
          else if (itemName === '마진') suggestedTitle = '마진율 악화';
          else if (itemName === '경비') suggestedTitle = '경비율 상승';
        }
      }
      
      return `
USD 기준 원가 분석 데이터를 보면:
- 원가율: ${eusdCostPrev?.toFixed(1) || '0'}% → ${eusdCostCurr?.toFixed(1) || '0'}% (${eusdCostChange > 0 ? '+' : ''}${eusdCostChange?.toFixed(1) || '0'}%p)
- 평균 TAG: $${eusdTagPrev?.toFixed(2) || '0'} → $${eusdTagCurr?.toFixed(2) || '0'} (YOY: ${eusdTagYoY?.toFixed(1) || '0'}%)
- 평균 원가: $${eusdCostAmtPrev?.toFixed(2) || '0'} → $${eusdCostAmtCurr?.toFixed(2) || '0'} (YOY: ${eusdCostAmtYoY?.toFixed(1) || '0'}%)

세부 원가율 변동:
- 원부자재 원가율: ${eusdMatRatePrev?.toFixed(1) || '0'}% → ${eusdMatRateCurr?.toFixed(1) || '0'}% (${eusdMatRateChange > 0 ? '+' : ''}${eusdMatRateChange?.toFixed(1) || '0'}%p) ${eusdMatRateChange < 0 ? '(개선)' : '(악화)'}
- 아트웍 원가율: ${eusdArtRatePrev?.toFixed(1) || '0'}% → ${eusdArtRateCurr?.toFixed(1) || '0'}% (${eusdArtRateChange > 0 ? '+' : ''}${eusdArtRateChange?.toFixed(1) || '0'}%p) ${eusdArtRateChange < 0 ? '(개선)' : '(악화)'}
- 공임 원가율: ${eusdLabRatePrev?.toFixed(1) || '0'}% → ${eusdLabRateCurr?.toFixed(1) || '0'}% (${eusdLabRateChange > 0 ? '+' : ''}${eusdLabRateChange?.toFixed(1) || '0'}%p) ${eusdLabRateChange < 0 ? '(개선)' : '(악화)'}
- 마진 원가율: ${eusdMarRatePrev?.toFixed(1) || '0'}% → ${eusdMarRateCurr?.toFixed(1) || '0'}% (${eusdMarRateChange > 0 ? '+' : ''}${eusdMarRateChange?.toFixed(1) || '0'}%p) ${eusdMarRateChange < 0 ? '(개선)' : '(악화)'}
- 경비 원가율: ${eusdExpRatePrev?.toFixed(1) || '0'}% → ${eusdExpRateCurr?.toFixed(1) || '0'}% (${eusdExpRateChange > 0 ? '+' : ''}${eusdExpRateChange?.toFixed(1) || '0'}%p) ${eusdExpRateChange < 0 ? '(개선)' : '(악화)'}

요청된 항목: "${data.itemTitle || '항목'}"

중요: 요청된 항목의 실제 원가율 변동을 확인하세요:
${itemName ? `- ${itemName} 원가율 변동: ${itemRateChange > 0 ? '+' : ''}${itemRateChange.toFixed(1)}%p ${itemImproved ? '(개선)' : '(악화)'}` : '- 요청된 항목을 확인하여 해당 원가율 변동을 찾으세요'}

이 항목에 대해 다음 JSON 형식으로 생성해주세요:
{
  "title": "${suggestedTitle || '항목 제목'} (실제 변동 방향에 맞게 작성: ${itemImproved ? '개선되었으면' : '악화되었으면'} "${itemImproved ? '효율화/최적화/절감' : '비용 상승/악화/리스크'}", 악화되었으면 "${itemImproved ? '' : '비용 상승/악화/리스크'}")",
  "change": "${itemRateChange !== 0 ? (itemImproved ? `▼ ${Math.abs(itemRateChange).toFixed(1)}%p 개선` : `▲ ${Math.abs(itemRateChange).toFixed(1)}%p 악화`) : '변동 없음'}",
  "description": "상세 설명 2-3문장 (실제 변동 방향과 수치를 명확히 설명: ${itemImproved ? '개선된 이유와 효과' : '악화된 이유와 영향'})"
}

제목(title) 작성 규칙:
- 원부자재 원가율이 하락(개선) → "원부자재 효율화"
- 원부자재 원가율이 상승(악화) → "원부자재 비용 상승" 또는 "원부자재 비용 악화"
- 마진 원가율이 하락(개선) → "마진율 최적화"
- 마진 원가율이 상승(악화) → "마진율 악화" 또는 "마진율 상승"
- 경비 원가율이 하락(개선) → "경비율 절감"
- 경비 원가율이 상승(악화) → "경비율 상승" 또는 "경비율 악화"
- 공임 원가율이 하락(개선) → "공임 효율화"
- 공임 원가율이 상승(악화) → "공임 비용 상승" 또는 "공임 비용 악화"
- 아트웍 원가율이 하락(개선) → "아트웍 효율화"
- 아트웍 원가율이 상승(악화) → "아트웍 비용 상승" 또는 "아트웍 비용 악화"

반드시 실제 데이터의 변동 방향에 맞게 제목을 작성하세요. 개선되었는데 "비용 상승"이라고 쓰거나, 악화되었는데 "효율화"라고 쓰지 마세요.
`;

    case 'executive_krw_item':
      const ekrwCostPrev = data.costRate24F_krw || 0;
      const ekrwCostCurr = data.costRate25F_krw || 0;
      const ekrwCostChange = data.costRateChange_krw || (ekrwCostCurr - ekrwCostPrev);
      const ekrwTagPrev = data.avgTag24F_krw || 0;
      const ekrwTagCurr = data.avgTag25F_krw || 0;
      const ekrwTagYoY = data.tagYoY_krw || 0;
      const ekrwCostAmtPrev = data.avgCost24F_krw || 0;
      const ekrwCostAmtCurr = data.avgCost25F_krw || 0;
      const ekrwCostAmtYoY = data.costYoY_krw || 0;
      const ekrwCostUsd = data.costRate25F_usd || 0;
      const ekrwFxEffect = (ekrwCostCurr || 0) - (ekrwCostUsd || 0);
      const ekrwImproved = ekrwCostChange < 0; // 음수면 개선, 양수면 악화
      
      // 요청된 항목 확인
      const ekrwItemTitle = (data.itemTitle || '').toLowerCase();
      let ekrwSuggestedTitle = '';
      
      if (ekrwItemTitle.includes('환율') || ekrwItemTitle.includes('fx') || ekrwItemTitle.includes('exchange')) {
        ekrwSuggestedTitle = ekrwImproved ? '환율 하락 효과' : '환율 상승 영향';
      } else if (ekrwItemTitle.includes('usd') || ekrwItemTitle.includes('달러')) {
        ekrwSuggestedTitle = ekrwImproved ? 'USD 개선 효과 반영' : 'USD 개선 효과 상쇄';
      } else {
        ekrwSuggestedTitle = ekrwImproved ? 'KRW 기준 원가율 개선' : 'KRW 기준 원가율 악화';
      }
      
      return `
KRW 기준 원가 분석 데이터를 보면:
- 원가율: ${ekrwCostPrev?.toFixed(1) || '0'}% → ${ekrwCostCurr?.toFixed(1) || '0'}% (${ekrwCostChange > 0 ? '+' : ''}${ekrwCostChange?.toFixed(1) || '0'}%p) ${ekrwImproved ? '(개선)' : '(악화)'}
- 평균 TAG: ₩${ekrwTagPrev?.toLocaleString() || '0'} → ₩${ekrwTagCurr?.toLocaleString() || '0'} (YOY: ${ekrwTagYoY?.toFixed(1) || '0'}%)
- 평균 원가: ₩${ekrwCostAmtPrev?.toLocaleString() || '0'} → ₩${ekrwCostAmtCurr?.toLocaleString() || '0'} (YOY: ${ekrwCostAmtYoY?.toFixed(1) || '0'}%)
- USD 기준 원가율: ${ekrwCostUsd?.toFixed(1) || '0'}%
- 환율 효과: ${ekrwFxEffect.toFixed(1)}%p

요청된 항목: "${data.itemTitle || '항목'}"

중요: KRW 기준 원가율이 ${ekrwCostChange > 0 ? '악화' : '개선'}되었습니다. USD 기준 개선 효과가 환율 ${ekrwFxEffect > 0 ? '상승' : '하락'}으로 ${ekrwImproved ? '실손익에 반영' : '상쇄'}되었는지 분석하세요.

이 항목에 대해 다음 JSON 형식으로 생성해주세요:
{
  "title": "${ekrwSuggestedTitle} (KRW 기준 원가율 변동 방향에 맞게 작성: ${ekrwImproved ? '개선되었으면' : '악화되었으면'} "${ekrwImproved ? '효율화/최적화/절감/효과 반영' : '상승/악화/리스크/효과 상쇄'}", 환율 효과를 고려하여 실손익 관점에서 작성)",
  "change": "${ekrwCostChange !== 0 ? (ekrwImproved ? `▼ ${Math.abs(ekrwCostChange).toFixed(1)}%p 개선` : `▲ ${Math.abs(ekrwCostChange).toFixed(1)}%p 악화`) : '변동 없음'}",
  "description": "상세 설명 2-3문장 (환율 효과를 포함하여 실손익 관점에서 분석, USD 기준 개선 효과가 환율로 ${ekrwImproved ? '실손익에 반영' : '상쇄'}되었는지 명확히 설명)"
}

제목 작성 시:
- KRW 기준 원가율이 개선되었으면 → "환율 하락 효과", "USD 개선 효과 반영" 등 긍정적 표현
- KRW 기준 원가율이 악화되었으면 → "환율 상승 영향", "USD 개선 효과 상쇄" 등 부정적 표현

반드시 실제 KRW 기준 원가율 변동 방향에 맞게 제목을 작성하세요.
`;

    default:
      return '데이터를 분석하고 인사이트를 제공해주세요.';
  }
}

