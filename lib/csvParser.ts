import Papa from 'papaparse';
import { RawCostData, CostDataItem, CategoryInfo } from './types';

/**
 * 카테고리 정보 (표시 순서 고정)
 */
export const CATEGORIES: CategoryInfo[] = [
  { id: 'Outer', name: 'OUTER', color: '#3b82f6', order: 1 },
  { id: 'Inner', name: 'INNER', color: '#10b981', order: 2 },
  { id: 'Bottom', name: 'BOTTOM', color: '#f59e0b', order: 3 },
  { id: 'Acc_etc', name: 'ACC', color: '#ef4444', order: 4 },
  { id: 'Wear_etc', name: 'WEAR', color: '#f97316', order: 5 },
];

/**
 * CSV 파일을 파싱하여 RawCostData 배열로 변환
 */
function parseCsv(csvText: string, fileName?: string): RawCostData[] {
  const result = Papa.parse(csvText, {
    skipEmptyLines: true,
  });

  const data: RawCostData[] = [];
  
  // MLB NON 시즌인지 확인 (파일명에 "non"이 포함되어 있으면 통합하지 않음)
  const isNonSeason = fileName && fileName.toLowerCase().includes('non');
  
  // 첫 번째 행은 헤더이므로 스킵
  for (let i = 1; i < result.data.length; i++) {
    const values = result.data[i] as string[];
    
    if (values.length < 35) continue; // 최소 컬럼 수 체크 (USD 총금액 컬럼 포함)
    
    // 중분류 통합: SHOES, BAG, HEADWEAR, Acc_etc → Acc_etc
    // MLB NON 시즌은 통합하지 않음
    let category = (values[3] || '').trim();
    if (!isNonSeason) {
      const categoryUpper = category.toUpperCase();
      if (categoryUpper === 'SHOES' || categoryUpper === 'BAG' || categoryUpper === 'HEADWEAR' || 
          categoryUpper === 'ACC_ETC' || categoryUpper === 'ACC') {
        category = 'Acc_etc';
      }
    }
    
    data.push({
      brand: (values[0] || '').trim(),
      season: (values[1] || '').trim(),
      style: (values[2] || '').trim(),
      category: category,
      item_name: (values[4] || '').trim(),
      po: values[5] || '',
      tag: parseFloat(values[6]) || 0,
      qty: parseFloat((values[7] || '').toString().replace(/,/g, '')) || 0,
      tag_total: parseFloat(values[8]) || 0,
      tag_usd_amount: parseFloat(values[9]) || 0,
      estimate_no: values[10] || '',
      currency: values[11] || '',
      manufacturer: values[12] || '',
      submit_date: values[13] || '',
      
      // USD 단가 컬럼 (인덱스 14~21)
      usd_material: parseFloat(values[14]) || 0,      // 원자재
      usd_artwork: parseFloat(values[15]) || 0,       // 아트웍
      usd_submaterial: parseFloat(values[16]) || 0,   // 부자재
      usd_tag: parseFloat(values[17]) || 0,           // 택/라벨
      usd_labor: parseFloat(values[18]) || 0,         // 공임
      usd_hq_supply: parseFloat(values[19]) || 0,     // 본사공급자재
      usd_margin: parseFloat(values[20]) || 0,        // 마진
      usd_expense: parseFloat(values[21]) || 0,       // 경비
      
      // KRW 단가 컬럼 (인덱스 22~29)
      krw_material: parseFloat(values[22]) || 0,
      krw_artwork: parseFloat(values[23]) || 0,
      krw_submaterial: parseFloat(values[24]) || 0,
      krw_tag: parseFloat(values[25]) || 0,
      krw_labor: parseFloat(values[26]) || 0,
      krw_hq_supply: parseFloat(values[27]) || 0,
      krw_margin: parseFloat(values[28]) || 0,
      krw_expense: parseFloat(values[29]) || 0,
      
      // USD 총금액 컬럼 (인덱스 30~34)
      usd_material_total: parseFloat(values[30]) || 0,  // USD_재료계(원/부/택/본공)_총금액(단가×수량)
      usd_artwork_total: parseFloat(values[31]) || 0,   // USD_아트웍_총금액(단가×수량)
      usd_labor_total: parseFloat(values[32]) || 0,     // USD_공임_총금액(단가×수량)
      usd_margin_total: parseFloat(values[33]) || 0,     // USD_정상마진_총금액(단가×수량)
      usd_expense_total: parseFloat(values[34]) || 0,    // USD_경비_총금액(단가×수량)
    });
  }
  
  return data;
}

/**
 * 아이템별로 데이터를 집계 (히트맵용)
 * 
 * 핵심 로직:
 * - 평균TAG는 KRW 단위로 계산: (TAG × 수량 합) / 총 수량
 * - 원가율 계산 시에만 환율로 USD 변환
 * - 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
 * - 아트웍은 별도 항목
 * - 수량 가중 평균 사용
 * - 원가율 = (평균원가 ÷ (평균TAG USD / 1.1)) × 100
 */
async function aggregateByItem(
  rawData: RawCostData[], 
  fxFileName: string = 'FX 251111.csv',
  brandId?: string,
  currentSeason?: string,
  prevSeason?: string
): Promise<CostDataItem[]> {
  // 브랜드 코드 추출
  const brandCode = brandId ? extractBrandCode(brandId) : 'M';
  const prevSeasonCode = prevSeason ? convertSeasonCode(prevSeason) : '25S';
  const currentSeasonCode = currentSeason ? convertSeasonCode(currentSeason) : '26S';
  
  // 시즌 필터링을 위한 헬퍼 함수
  const isPrevSeason = (season: string): boolean => {
    if (season === '전년') return true;
    if (!prevSeason) return false;
    // prevSeason이 '24SS'면 '24SS', '24S' 모두 포함
    const prevUpper = prevSeason.toUpperCase();
    if (prevUpper === '24SS' || prevUpper === '24S') {
      return season === '24SS' || season === '24S';
    }
    if (prevUpper === '25SS' || prevUpper === '25S') {
      return season === '25SS' || season === '25S';
    }
    if (prevUpper === '25FW' || prevUpper === '25F') {
      return season === '25FW' || season === '25F';
    }
    if (prevUpper === '24FW' || prevUpper === '24F') {
      return season === '24FW' || season === '24F';
    }
    return season === prevSeason || season === prevUpper;
  };
  
  const isCurrSeason = (season: string): boolean => {
    if (season === '당년') return true;
    if (!currentSeason) return false;
    // currentSeason이 '25SS'면 '25SS', '25S' 모두 포함
    const currUpper = currentSeason.toUpperCase();
    if (currUpper === '25SS' || currUpper === '25S') {
      return season === '25SS' || season === '25S';
    }
    if (currUpper === '26SS' || currUpper === '26S') {
      return season === '26SS' || season === '26S';
    }
    if (currUpper === '26FW' || currUpper === '26F') {
      return season === '26FW' || season === '26F';
    }
    if (currUpper === '25FW' || currUpper === '25F') {
      return season === '25FW' || season === '25F';
    }
    return season === currentSeason || season === currUpper;
  };
  
  const itemMap = new Map<string, {
    category: string;
    item_name: string;
    dataPrev: RawCostData[];
    dataCurr: RawCostData[];
  }>();
  
  // 아이템별로 그룹핑
  rawData.forEach(row => {
    const normalizedItemName = (row.item_name || '').trim();
    const normalizedCategory = (row.category || '').trim();
    const key = `${normalizedCategory}_${normalizedItemName}`;
    
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        category: normalizedCategory,
        item_name: normalizedItemName,
        dataPrev: [],
        dataCurr: [],
      });
    }
    
    const group = itemMap.get(key)!;
    // 동적 시즌 필터링
    if (isPrevSeason(row.season)) {
      group.dataPrev.push(row);
    } else if (isCurrSeason(row.season)) {
      group.dataCurr.push(row);
    }
  });
  
  // 각 아이템별 집계 계산
  const items: CostDataItem[] = [];
  
  for (const group of itemMap.values()) {
    const qty24F = group.dataPrev.reduce((sum, row) => sum + row.qty, 0);
    const qty25F = group.dataCurr.reduce((sum, row) => sum + row.qty, 0);
    
    // 전년 평균 KRW TAG 계산: (TAG × 수량 합) / 총 수량
    const tag24FTotalKRW = group.dataPrev.reduce((sum, row) => sum + row.tag * row.qty, 0);
    const avgTag24F = qty24F > 0 ? tag24FTotalKRW / qty24F : 0;
    
    // 원가 항목 계산 (USD 총금액 컬럼 직접 사용)
    const material24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + (row.usd_material_total || 0), 0) / qty24F
      : 0;
    
    const artwork24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + (row.usd_artwork_total || 0), 0) / qty24F
      : 0;
    
    const labor24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + (row.usd_labor_total || 0), 0) / qty24F
      : 0;
    
    const margin24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + (row.usd_margin_total || 0), 0) / qty24F
      : 0;
    
    const expense24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + (row.usd_expense_total || 0), 0) / qty24F
      : 0;
    
    const avgCost24F = material24F + artwork24F + labor24F + margin24F + expense24F;
    
    // 원가율 계산: 평균 KRW TAG를 환율로 나눠서 USD로 변환 후 계산
    // 각 행의 카테고리에 맞는 환율 사용 (전년 시즌 환율)
    let tag24FTotalUSD = 0;
    for (const row of group.dataPrev) {
      const fxRate = await getExchangeRateFromFx(brandCode, prevSeasonCode, row.category);
      tag24FTotalUSD += (row.tag / fxRate) * row.qty;
    }
    const avgTag24F_usd = qty24F > 0 ? tag24FTotalUSD / qty24F : 0;
    
    const costRate24F = avgTag24F_usd > 0
      ? (avgCost24F / (avgTag24F_usd / 1.1)) * 100
      : 0;
    
    // 당년 평균 KRW TAG 계산: (TAG × 수량 합) / 총 수량
    const tag25FTotalKRW = group.dataCurr.reduce((sum, row) => sum + row.tag * row.qty, 0);
    const avgTag25F = qty25F > 0 ? tag25FTotalKRW / qty25F : 0;
    
    // 원가 항목 계산 (USD 총금액 컬럼 직접 사용)
    const material25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + (row.usd_material_total || 0), 0) / qty25F
      : 0;
    
    const artwork25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + (row.usd_artwork_total || 0), 0) / qty25F
      : 0;
    
    const labor25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + (row.usd_labor_total || 0), 0) / qty25F
      : 0;
    
    const margin25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + (row.usd_margin_total || 0), 0) / qty25F
      : 0;
    
    const expense25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + (row.usd_expense_total || 0), 0) / qty25F
      : 0;
    
    const avgCost25F = material25F + artwork25F + labor25F + margin25F + expense25F;
    
    // 원가율 계산: 평균 KRW TAG를 전시즌 환율로 나눠서 USD로 변환 후 계산
    // 각 행의 카테고리에 맞는 환율 사용 (전시즌 환율, 26SS 당년은 25SS 환율)
    let tag25FTotalUSD = 0;
    for (const row of group.dataCurr) {
      const fxRate = await getExchangeRateFromFx(brandCode, prevSeasonCode, row.category);
      tag25FTotalUSD += (row.tag / fxRate) * row.qty;
    }
    const avgTag25F_usd = qty25F > 0 ? tag25FTotalUSD / qty25F : 0;
    
    const costRate25F = avgTag25F_usd > 0
      ? (avgCost25F / (avgTag25F_usd / 1.1)) * 100
      : 0;
    
    // 변동 계산
    const qtyChange = qty25F - qty24F;
    const tagYoY = avgTag24F > 0 ? (avgTag25F / avgTag24F) * 100 : 0;
    const costYoY = avgCost24F > 0 ? (avgCost25F / avgCost24F) * 100 : 0;
    const costRateChange = costRate25F - costRate24F;
    
    items.push({
      category: group.category,
      item_name: group.item_name,
      qty24F,
      avgTag24F,  // KRW 단위
      material24F,
      artwork24F,
      labor24F,
      margin24F,
      expense24F,
      avgCost24F,
      costRate24F,
      qty25F,
      avgTag25F,  // KRW 단위
      material25F,
      artwork25F,
      labor25F,
      margin25F,
      expense25F,
      avgCost25F,
      costRate25F,
      qtyChange,
      tagYoY,
      costYoY,
      costRateChange,
    });
  }
  
  // 카테고리 순서대로 정렬
  items.sort((a, b) => {
    const orderA = CATEGORIES.find(c => c.id === a.category)?.order || 999;
    const orderB = CATEGORIES.find(c => c.id === b.category)?.order || 999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    return a.item_name.localeCompare(b.item_name, 'ko');
  });
  
  return items;
}

/**
 * 카테고리를 FX 카테고리로 매핑 (의류/슈즈/용품)
 */
function mapCategoryToFxCategory(category: string): string {
  const categoryUpper = (category || '').trim().toUpperCase();
  
  // 의류: Outer, Inner, Bottom, Wear_etc
  if (['OUTER', 'INNER', 'BOTTOM', 'WEAR_ETC'].includes(categoryUpper)) {
    return '의류';
  }
  
  // 슈즈: Shoes
  if (categoryUpper === 'SHOES') {
    return '슈즈';
  }
  
  // 용품: Bag, Headwear, Acc_etc
  if (['BAG', 'HEADWEAR', 'ACC_ETC'].includes(categoryUpper)) {
    return '용품';
  }
  
  // 기본값: 의류
  return '의류';
}

/**
 * FX.csv에서 브랜드-시즌-카테고리 조합으로 환율 조회
 */
export async function getExchangeRateFromFx(
  brandCode: string,
  seasonCode: string,
  category?: string
): Promise<number> {
  try {
    const response = await fetch('/COST RAW/FX.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    // 브랜드 코드 매핑
    const brandMap: Record<string, string> = {
      'M': 'M',
      'I': 'I',
      'X': 'X',
      'V': 'V',
      'ST': 'ST',
    };
    const brandName = brandMap[brandCode] || brandCode;
    
    // 카테고리 매핑
    const fxCategory = category ? mapCategoryToFxCategory(category) : '의류';
    
    // CSV 파싱 (헤더 스킵)
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= 7) {
        const rowBrand = values[1]?.trim();
        const rowSeason = values[2]?.trim();
        const rowCategory = values[5]?.trim();
        const rate = parseFloat(values[6]?.trim() || '0');
        
        if (
          rowBrand === brandName &&
          rowSeason === seasonCode &&
          rowCategory === fxCategory &&
          rate > 0
        ) {
          return rate;
        }
      }
    }
    
    // 기본값: 의류 환율 사용
    if (fxCategory !== '의류') {
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= 7) {
          const rowBrand = values[1]?.trim();
          const rowSeason = values[2]?.trim();
          const rowCategory = values[5]?.trim();
          const rate = parseFloat(values[6]?.trim() || '0');
          
          if (
            rowBrand === brandName &&
            rowSeason === seasonCode &&
            rowCategory === '의류' &&
            rate > 0
          ) {
            return rate;
          }
        }
      }
    }
    
    // 최종 기본값
    console.warn(`환율을 찾을 수 없습니다. 브랜드=${brandName}, 시즌=${seasonCode}, 카테고리=${fxCategory}. 기본값 1300.0 사용`);
    return 1300.0;
  } catch (error) {
    console.error('FX.csv 로드 실패:', error);
    return 1300.0;
  }
}

/**
 * 시즌 코드 변환 (26SS → 26S, 26FW → 26F)
 */
function convertSeasonCode(season: string): string {
  if (season.endsWith('SS')) return season.replace('SS', 'S');
  if (season.endsWith('FW')) return season.replace('FW', 'F');
  return season;
}

/**
 * 브랜드 코드 추출 (26SS-M → M)
 */
function extractBrandCode(brandId: string): string {
  const parts = brandId.split('-');
  return parts[parts.length - 1];
}

/**
 * 새로운 시즌 형식인지 확인 (26SS-*, 26FW-* 등)
 */
function isNewSeasonFormat(brandId: string): boolean {
  return /^\d{2}(SS|FW|S|F)-/.test(brandId);
}

/**
 * FX 환율 데이터 로드
 * - 기존 브랜드(25FW, NON, KIDS, DISCOVERY): 기존 방식 유지
 * - 새로운 시즌 브랜드(26SS-*, 26FW-* 등): FX.csv에서 브랜드-시즌-카테고리 조합으로 조회
 */
export async function loadExchangeRates(
  fxFileName: string = 'FX 251111.csv',
  brandId?: string,
  currentSeason?: string,
  prevSeason?: string
): Promise<{ prev: number; curr: number }> {
  // currentSeason과 prevSeason이 있으면 FX.csv에서 조회 (brandId 형식 무관)
  if (currentSeason && prevSeason) {
    try {
      const response = await fetch(`/${fxFileName}`);
      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      // 브랜드 코드 추출
      let brandCode: string;
      if (brandId) {
        if (isNewSeasonFormat(brandId)) {
          // 26SS-M, 25FW-M 같은 형식
          brandCode = extractBrandCode(brandId);
        } else if (brandId.includes('-')) {
          // KIDS-I, DISCOVERY-X 같은 형식
          brandCode = extractBrandCode(brandId);
        } else {
          // KIDS, DISCOVERY, ST, V 같은 단일 브랜드 ID
          const brandMap: Record<string, string> = {
            'KIDS': 'I',
            'DISCOVERY': 'X',
            '25FW': 'M',
          };
          brandCode = brandMap[brandId] || brandId;
        }
      } else {
        brandCode = 'M';
      }
      
      // 시즌 코드 변환
      const prevSeasonCode = convertSeasonCode(prevSeason); // 25SS → 25S
      const currSeasonCode = convertSeasonCode(currentSeason); // 26SS → 26S
      
      // 카테고리는 "의류"로 고정 (시즌이 S/F로 끝나는 경우)
      const category = '의류';
      
      let prevRate = 1300.0;
      let currRate = 1300.0;
      
      // CSV 파싱 (헤더 스킵) - Papa.parse 사용
      const parseResult = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });
      
      console.log(`[FX] 조회 시작: 브랜드=${brandCode}, 전년=${prevSeasonCode}, 당년=${currSeasonCode}, 카테고리=${category}`);
      
      for (const row of parseResult.data as any[]) {
        const rowBrand = (row['브랜드'] || '').trim();
        const rowSeason = (row['시즌'] || '').trim();
        const rowCategory = (row['카테고리'] || '').trim();
        const rateStr = (row['환율'] || '0').toString().trim();
        const rate = parseFloat(rateStr) || 0;
        
        // 전년 시즌 환율 조회
        if (rowBrand === brandCode && rowSeason === prevSeasonCode && rowCategory === category && rate > 0) {
          prevRate = rate;
          console.log(`[FX] 전년 환율 찾음: ${rowBrand}, ${rowSeason}, ${rowCategory}, ${rate}`);
        }
        
        // 당년 시즌 환율 조회
        if (rowBrand === brandCode && rowSeason === currSeasonCode && rowCategory === category && rate > 0) {
          currRate = rate;
          console.log(`[FX] 당년 환율 찾음: ${rowBrand}, ${rowSeason}, ${rowCategory}, ${rate}`);
        }
      }
      
      console.log(`[FX] 최종 결과: 브랜드=${brandCode}, 전년=${prevSeasonCode}(${prevRate}), 당년=${currSeasonCode}(${currRate})`);
      
      return {
        prev: prevRate,
        curr: currRate
      };
    } catch (error) {
      console.error(`FX.csv 로드 실패 (${fxFileName}):`, error);
      return { prev: 1300.0, curr: 1300.0 };
    }
  }
  
  // 기존 방식 (간단한 FX 파일용)
  try {
    const response = await fetch(`/${fxFileName}`);
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const values = lines[1].split(','); // 두 번째 줄 (데이터)
    return {
      prev: parseFloat(values[0]) || 1296.77,  // 전년
      curr: parseFloat(values[1]) || 1415.00   // 당년
    };
  } catch (error) {
    console.error(`FX 파일 로드 실패 (${fxFileName}):`, error);
    // 기본값 반환
    return { prev: 1296.77, curr: 1415.00 };
  }
}

/**
 * CSV 파일을 로드하고 아이템별 데이터로 집계
 */
export async function loadCostData(
  fileName: string = 'MLB non  251111.csv', 
  fxFileName: string = 'FX 251111.csv',
  brandId?: string,
  currentSeason?: string,
  prevSeason?: string
): Promise<CostDataItem[]> {
  try {
    const response = await fetch(`/${fileName}`);
    const csvText = await response.text();
    
    const rawData = parseCsv(csvText, fileName); // fileName 전달하여 MLB NON 시즌 판별
    const items = await aggregateByItem(rawData, fxFileName, brandId, currentSeason, prevSeason);
    
    return items;
  } catch (error) {
    console.error(`CSV 파일 로드 실패 (${fileName}):`, error);
    return [];
  }
}

/**
 * Summary JSON 파일 로드
 */
export async function loadSummaryData(fileName: string = 'summary.json') {
  try {
    const response = await fetch(`/${fileName}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`${fileName} 로드 실패:`, error);
    return null;
  }
}

/**
 * 카테고리 정보 조회
 */
export function getCategoryInfo(categoryId: string): CategoryInfo | undefined {
  return CATEGORIES.find(c => c.id === categoryId);
}

/**
 * 카테고리별로 데이터 그룹핑
 */
export function groupByCategory(items: CostDataItem[]): Map<string, CostDataItem[]> {
  const categoryMap = new Map<string, CostDataItem[]>();
  
  items.forEach(item => {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category)!.push(item);
  });
  
  return categoryMap;
}

