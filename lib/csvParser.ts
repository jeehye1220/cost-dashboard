import Papa from 'papaparse';
import { RawCostData, CostDataItem, CategoryInfo } from './types';

/**
 * 카테고리 정보 (표시 순서 고정)
 */
export const CATEGORIES: CategoryInfo[] = [
  { id: 'Outer', name: 'OUTER', color: '#3b82f6', order: 1 },
  { id: 'Inner', name: 'INNER', color: '#10b981', order: 2 },
  { id: 'Bottom', name: 'BOTTOM', color: '#f59e0b', order: 3 },
  { id: 'Shoes', name: 'SHOES', color: '#8b5cf6', order: 4 },
  { id: 'Bag', name: 'BAG', color: '#ec4899', order: 5 },
  { id: 'Headwear', name: 'HEADWEAR', color: '#06b6d4', order: 6 },
  { id: 'Acc_etc', name: 'ACC', color: '#ef4444', order: 7 },
];

/**
 * CSV 파일을 파싱하여 RawCostData 배열로 변환
 */
function parseCsv(csvText: string): RawCostData[] {
  const result = Papa.parse(csvText, {
    skipEmptyLines: true,
  });

  const data: RawCostData[] = [];
  
  // 첫 번째 행은 헤더이므로 스킵
  for (let i = 1; i < result.data.length; i++) {
    const values = result.data[i] as string[];
    
    if (values.length < 30) continue; // 최소 컬럼 수 체크
    
    data.push({
      brand: values[0] || '',
      season: values[1] || '',
      style: values[2] || '',
      category: values[3] || '',
      item_name: values[4] || '',
      po: values[5] || '',
      tag: parseFloat(values[6]) || 0,
      qty: parseFloat(values[7]) || 0,
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
    });
  }
  
  return data;
}

/**
 * 아이템별로 데이터를 집계 (히트맵용)
 * 
 * 핵심 로직:
 * - 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
 * - 아트웍은 별도 항목
 * - 수량 가중 평균 사용
 * - 원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100
 */
async function aggregateByItem(rawData: RawCostData[]): Promise<CostDataItem[]> {
  // 환율 데이터 로드
  const fxRates = await loadExchangeRates();
  
  const itemMap = new Map<string, {
    category: string;
    item_name: string;
    dataPrev: RawCostData[];
    dataCurr: RawCostData[];
  }>();
  
  // 아이템별로 그룹핑
  rawData.forEach(row => {
    const key = `${row.category}_${row.item_name}`;
    
    if (!itemMap.has(key)) {
      itemMap.set(key, {
        category: row.category,
        item_name: row.item_name,
        dataPrev: [],
        dataCurr: [],
      });
    }
    
    const group = itemMap.get(key)!;
    if (row.season === '전년') {
      group.dataPrev.push(row);
    } else if (row.season === '당년') {
      group.dataCurr.push(row);
    }
  });
  
  // 각 아이템별 집계 계산
  const items: CostDataItem[] = [];
  
  itemMap.forEach(group => {
    const qty24F = group.dataPrev.reduce((sum, row) => sum + row.qty, 0);
    const qty25F = group.dataCurr.reduce((sum, row) => sum + row.qty, 0);
    
    // 전년 수량 가중 평균 계산
    // TAG (KRW)를 전년 환율로 나눠서 USD로 변환
    const avgTag24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + (row.tag / fxRates.prev) * row.qty, 0) / qty24F
      : 0;
    
    // 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
    const material24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => 
          sum + (row.usd_material + row.usd_submaterial + row.usd_hq_supply + row.usd_tag) * row.qty,
        0) / qty24F
      : 0;
    
    const artwork24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + row.usd_artwork * row.qty, 0) / qty24F
      : 0;
    
    const labor24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + row.usd_labor * row.qty, 0) / qty24F
      : 0;
    
    const margin24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + row.usd_margin * row.qty, 0) / qty24F
      : 0;
    
    const expense24F = qty24F > 0
      ? group.dataPrev.reduce((sum, row) => sum + row.usd_expense * row.qty, 0) / qty24F
      : 0;
    
    const avgCost24F = material24F + artwork24F + labor24F + margin24F + expense24F;
    
    const costRate24F = avgTag24F > 0
      ? (avgCost24F / (avgTag24F / 1.1)) * 100
      : 0;
    
    // 당년 수량 가중 평균 계산
    // TAG (KRW)를 전년 환율로 나눠서 USD로 변환 (당시즌은 전시즌 환율 사용)
    const avgTag25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + (row.tag / fxRates.prev) * row.qty, 0) / qty25F
      : 0;
    
    const material25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => 
          sum + (row.usd_material + row.usd_submaterial + row.usd_hq_supply + row.usd_tag) * row.qty,
        0) / qty25F
      : 0;
    
    const artwork25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + row.usd_artwork * row.qty, 0) / qty25F
      : 0;
    
    const labor25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + row.usd_labor * row.qty, 0) / qty25F
      : 0;
    
    const margin25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + row.usd_margin * row.qty, 0) / qty25F
      : 0;
    
    const expense25F = qty25F > 0
      ? group.dataCurr.reduce((sum, row) => sum + row.usd_expense * row.qty, 0) / qty25F
      : 0;
    
    const avgCost25F = material25F + artwork25F + labor25F + margin25F + expense25F;
    
    const costRate25F = avgTag25F > 0
      ? (avgCost25F / (avgTag25F / 1.1)) * 100
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
      avgTag24F,
      material24F,
      artwork24F,
      labor24F,
      margin24F,
      expense24F,
      avgCost24F,
      costRate24F,
      qty25F,
      avgTag25F,
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
  });
  
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
 * FX 환율 데이터 로드
 */
async function loadExchangeRates(): Promise<{ prev: number; curr: number }> {
  try {
    const response = await fetch('/FX 251111.csv');
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const values = lines[1].split(','); // 두 번째 줄 (데이터)
    return {
      prev: parseFloat(values[0]) || 1296.77,  // 전년
      curr: parseFloat(values[1]) || 1415.00   // 당년
    };
  } catch (error) {
    console.error('FX 파일 로드 실패:', error);
    // 기본값 반환
    return { prev: 1296.77, curr: 1415.00 };
  }
}

/**
 * CSV 파일을 로드하고 아이템별 데이터로 집계
 */
export async function loadCostData(): Promise<CostDataItem[]> {
  try {
    const response = await fetch('/MLB non  251111.csv');
    const csvText = await response.text();
    
    const rawData = parseCsv(csvText);
    const items = await aggregateByItem(rawData);
    
    return items;
  } catch (error) {
    console.error('CSV 파일 로드 실패:', error);
    return [];
  }
}

/**
 * Summary JSON 파일 로드
 */
export async function loadSummaryData() {
  try {
    const response = await fetch('/summary.json');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('summary.json 로드 실패:', error);
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

