/**
 * 브랜드 ID 파싱 및 시즌 정보 추출 유틸리티
 */

export interface BrandInfo {
  period: string;
  brandCode: string;
  currentSeason: string;
  prevSeason: string;
}

/**
 * 전년 시즌 계산
 * 예: 26SS → 25SS, 25FW → 24FW, 26FW → 25FW
 */
function getPreviousSeason(season: string): string {
  const seasonUpper = season.toUpperCase();
  
  if (seasonUpper.endsWith('SS')) {
    const year = parseInt(seasonUpper.slice(0, 2));
    return `${year - 1}SS`;
  } else if (seasonUpper.endsWith('FW')) {
    const year = parseInt(seasonUpper.slice(0, 2));
    return `${year - 1}FW`;
  } else if (seasonUpper.endsWith('S')) {
    const year = parseInt(seasonUpper.slice(0, 2));
    return `${year - 1}S`;
  } else if (seasonUpper.endsWith('F')) {
    const year = parseInt(seasonUpper.slice(0, 2));
    return `${year - 1}F`;
  }
  
  return '';
}

/**
 * 브랜드 ID에서 기간 추출
 * 예: 26SS-M → 26SS, 25FW → 25FW
 */
function extractPeriod(brandId: string): string {
  if (brandId.startsWith('26SS-')) return '26SS';
  if (brandId.startsWith('26FW-')) return '26FW';
  if (brandId.startsWith('25SS-')) return '25SS';
  if (brandId.startsWith('25FW-')) return '25FW';
  if (brandId.startsWith('24SS-')) return '24SS';
  if (brandId.startsWith('24FW-')) return '24FW';
  
  // 기존 브랜드 ID들 (25FW 기간)
  if (['25FW', 'NON', 'KIDS', 'DISCOVERY', 'ST', 'V'].includes(brandId)) {
    return '25FW';
  }
  
  return '25FW'; // 기본값
}

/**
 * 브랜드 ID에서 브랜드 코드 추출
 * 예: 26SS-M → M, 25FW → 25FW, KIDS → KIDS
 */
function extractBrandCode(brandId: string): string {
  if (brandId.includes('-')) {
    return brandId.split('-')[1];
  }
  return brandId;
}

/**
 * 브랜드 ID를 파싱하여 기간, 브랜드 코드, 현재 시즌, 전년 시즌 정보 반환
 */
export function parseBrandId(brandId: string): BrandInfo {
  const period = extractPeriod(brandId);
  const brandCode = extractBrandCode(brandId);
  const currentSeason = period;
  const prevSeason = getPreviousSeason(period);
  
  return {
    period,
    brandCode,
    currentSeason,
    prevSeason,
  };
}

/**
 * 시즌 코드를 프롬프트용 표시 형식으로 변환
 * 예: 26SS → 26SS, 25FW → 25F, 24SS → 24SS
 */
export function formatSeasonForPrompt(season: string): string {
  // SS는 그대로, FW는 F로 축약
  if (season.toUpperCase().endsWith('FW')) {
    return season.slice(0, -1); // 25FW → 25F
  }
  return season;
}






