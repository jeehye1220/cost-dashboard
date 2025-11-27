/**
 * CSV 형식의 인사이트 파일을 로드하고 파싱하는 유틸리티
 */

interface InsightItem {
  icon: string;
  title: string;
  change: string;
  description: string;
}

interface InsightsData {
  prevUsdCostRate?: number; // 전년 USD 원가율 (CSV에서 로드)
  prevKrwCostRate?: number; // 전년 KRW 원가율 (CSV에서 로드)
  usd: {
    title: string;
    mainChange: string;
    items: InsightItem[];
    summary: string;
  };
  krw: {
    title: string;
    mainChange: string;
    items: InsightItem[];
    summary: string;
  };
  actions: string[];
  risks: string[];
  success: string[];
  actionSummary?: string;
  riskSummary?: string;
  successSummary?: string;
  message: string;
  // KeyMetricsTable용 필드
  metricsTitle?: string;
  metricsVolume?: string;
  metricsTag?: string;
  metricsFx?: string;
  metricsConclusion?: string;
}

/**
 * 브랜드 ID에서 브랜드 코드와 기간 추출
 */
function parseBrandId(brandId?: string): { brandCode: string; period: string } | null {
  if (!brandId) return null;
  
  // 25SS-M, 26SS-M 형식
  if (brandId.startsWith('25SS-') || brandId.startsWith('26SS-') || brandId.startsWith('26FW-')) {
    const parts = brandId.split('-');
    return {
      brandCode: parts[1] || '',
      period: parts[0] || '',
    };
  }
  
  // 25FW, KIDS, DISCOVERY 등 기존 형식
  return null;
}

/**
 * 브랜드별 인사이트 파일 경로 생성
 */
function getBrandInsightFilePath(brandId?: string, season?: string): string | null {
  if (!brandId) return null;
  
  const brandInfo = parseBrandId(brandId);
  
  // 브랜드별 인사이트 파일이 있는 경우 (25SS-*, 26SS-*, 26FW-*)
  if (brandInfo) {
    const { brandCode, period } = brandInfo;
    
    // 기간별 폴더 매핑
    const periodFolderMap: Record<string, string> = {
      '25SS': '25S',
      '26SS': '26SS',
      '26FW': '26FW',
    };
    
    const folder = periodFolderMap[period] || period;
    const periodCode = period.toLowerCase();
    return `/COST RAW/${folder}/${brandCode}_insight_${periodCode}.csv`;
  }
  
  // 25FW 기간 브랜드별 인사이트 파일 (ST, V 포함)
  if (brandId === 'ST' || brandId === 'V') {
    return `/COST RAW/25FW/${brandId}_insight_25fw.csv`;
  }
  
  // 기존 통합 CSV 파일 (25FW, KIDS, DISCOVERY 등)
  const fileMap: { [key: string]: string } = {
    '25FW': '/insights_25fw.csv',
    '25F': '/insights_25fw.csv',
    'NON': '/insights_non.csv',
    'KIDS': '/insights_kids.csv',
    'DISCOVERY': '/insights_discovery.csv',
  };
  
  return fileMap[brandId] || null;
}

/**
 * CSV 파일을 파싱하여 인사이트 데이터로 변환
 */
export async function loadInsightsFromCSV(season: string, brandId?: string): Promise<InsightsData | null> {
  try {
    // 브랜드별 인사이트 파일 경로 생성
    let filePath = getBrandInsightFilePath(brandId, season);
    
    // 브랜드별 파일이 없으면 기존 방식으로 시즌 기반 파일 찾기
    if (!filePath) {
      const fileMap: { [key: string]: string } = {
        '25FW': '/insights_25fw.csv',
        '25F': '/insights_25fw.csv',      // F = FW
        '25SS': '/insights_25s.csv',      // SS = S (fallback)
        '25S': '/insights_25s.csv',       // S = SS (fallback)
        '26SS': '/insights_26s.csv',      // 향후용
        '26S': '/insights_26s.csv',        // 향후용
        'NON': '/insights_non.csv',
        'KIDS': '/insights_kids.csv',
        'DISCOVERY': '/insights_discovery.csv',
      };
      
      filePath = fileMap[season];
    }
    
    if (!filePath) {
      console.warn(`Unknown season: ${season}, brandId: ${brandId}`);
      return null;
    }

    // 캐시 무효화를 위해 timestamp 추가
    const cacheBuster = `?t=${Date.now()}`;
    const response = await fetch(filePath + cacheBuster, {
      cache: 'no-store',
    });
    if (!response.ok) {
      console.warn(`Failed to load insights CSV: ${filePath}`);
      return null;
    }

    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    // 헤더 제거
    lines.shift();

    // 데이터 파싱
    const data: { [key: string]: string } = {};
    lines.forEach(line => {
      // CSV 파싱: section,key,value 형식
      const firstComma = line.indexOf(',');
      const secondComma = line.indexOf(',', firstComma + 1);
      
      if (firstComma === -1 || secondComma === -1) return;
      
      const section = line.substring(0, firstComma).trim();
      const key = line.substring(firstComma + 1, secondComma).trim();
      let value = line.substring(secondComma + 1).trim();
      
      // 따옴표 제거 (CSV에서 따옴표로 감싸진 값 처리)
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      
      data[section] = value;
    });

    // USD 항목 구성
    const usdItems: InsightItem[] = [];
    let itemIndex = 1;
    while (data[`usd_item_${itemIndex}_icon`]) {
      usdItems.push({
        icon: data[`usd_item_${itemIndex}_icon`] || '',
        title: data[`usd_item_${itemIndex}_title`] || '',
        change: data[`usd_item_${itemIndex}_change`] || '',
        description: data[`usd_item_${itemIndex}_description`] || '',
      });
      itemIndex++;
    }

    // KRW 항목 구성
    const krwItems: InsightItem[] = [];
    itemIndex = 1;
    while (data[`krw_item_${itemIndex}_icon`]) {
      krwItems.push({
        icon: data[`krw_item_${itemIndex}_icon`] || '',
        title: data[`krw_item_${itemIndex}_title`] || '',
        change: data[`krw_item_${itemIndex}_change`] || '',
        description: data[`krw_item_${itemIndex}_description`] || '',
      });
      itemIndex++;
    }

    // 액션, 리스크, 성공 포인트 수집
    const actions: string[] = [];
    const risks: string[] = [];
    const success: string[] = [];

    itemIndex = 1;
    while (data[`action_${itemIndex}`]) {
      actions.push(data[`action_${itemIndex}`]);
      itemIndex++;
    }

    itemIndex = 1;
    while (data[`risk_${itemIndex}`]) {
      risks.push(data[`risk_${itemIndex}`]);
      itemIndex++;
    }

    itemIndex = 1;
    while (data[`success_${itemIndex}`]) {
      success.push(data[`success_${itemIndex}`]);
      itemIndex++;
    }

    return {
      prevUsdCostRate: data['prev_usd_cost_rate'] ? parseFloat(data['prev_usd_cost_rate']) : undefined,
      prevKrwCostRate: data['prev_krw_cost_rate'] ? parseFloat(data['prev_krw_cost_rate']) : undefined,
      usd: {
        title: data['usd_title'] || '',
        mainChange: data['usd_main_change'] || '',
        items: usdItems,
        summary: data['usd_summary'] || '',
      },
      krw: {
        title: data['krw_title'] || '',
        mainChange: '', // 동적으로 계산되므로 CSV에서 로드하지 않음
        items: krwItems,
        summary: data['krw_summary'] || '',
      },
      actions,
      risks,
      success,
      actionSummary: data['action summary'] || data['action_summary'] || undefined,
      riskSummary: data['risk summary'] || data['risk_summary'] || undefined,
      successSummary: data['success summary'] || data['success_summary'] || data['success sumamry'] || undefined,
      message: data['message'] || '',
      // KeyMetricsTable용 필드
      metricsTitle: data['metrics_title'] || undefined,
      metricsVolume: data['metrics_volume'] || undefined,
      metricsTag: data['metrics_tag'] || undefined,
      metricsFx: data['metrics_fx'] || undefined,
      metricsConclusion: data['metrics_conclusion'] || undefined,
    };
  } catch (error) {
    console.error('Error loading insights CSV:', error);
    return null;
  }
}

/**
 * 시즌 타입을 감지하여 반환
 */
export function detectSeasonType(qty24F: number): string {
  if (qty24F > 3000000 && qty24F < 4000000) return '25FW';
  if (qty24F > 600000 && qty24F < 700000) return 'KIDS';
  if (qty24F > 1200000 && qty24F < 1400000) return 'DISCOVERY';
  return 'NON';
}

