import { CostDataItem } from './types';

/**
 * 카테고리별 평균 계산 함수 (items 기반)
 */
export function calculateCategoryAverage(categoryItems: CostDataItem[]) {
  if (categoryItems.length === 0) return null;

  // 수량 합계
  const totalQty24F = categoryItems.reduce((sum, item) => sum + (item.qty24F || 0), 0);
  const totalQty25F = categoryItems.reduce((sum, item) => sum + (item.qty25F || 0), 0);

  // 수량 가중평균 계산
  // 평균 KRW TAG (당년)
  const avgTag25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.avgTag25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgTag24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.avgTag24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  // 평균 원가 (USD)
  const avgCost25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.avgCost25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgCost24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.avgCost24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  // 평균 원가율
  const avgCostRate25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.costRate25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgCostRate24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.costRate24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  // 원가 항목별 평균 (USD)
  const avgMaterial25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.material25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgMaterial24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.material24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  const avgArtwork25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.artwork25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgArtwork24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.artwork24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  const avgLabor25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.labor25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgLabor24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.labor24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  const avgMargin25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.margin25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgMargin24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.margin24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  const avgExpense25F = totalQty25F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.expense25F || 0) * (item.qty25F || 0), 0) / totalQty25F
    : 0;
  const avgExpense24F = totalQty24F > 0
    ? categoryItems.reduce((sum, item) => sum + (item.expense24F || 0) * (item.qty24F || 0), 0) / totalQty24F
    : 0;

  // 차이 계산
  const materialChange = avgMaterial25F - avgMaterial24F;
  const artworkChange = avgArtwork25F - avgArtwork24F;
  const laborChange = avgLabor25F - avgLabor24F;
  const marginChange = avgMargin25F - avgMargin24F;
  const expenseChange = avgExpense25F - avgExpense24F;
  const totalCostChange = materialChange + artworkChange + laborChange + marginChange + expenseChange;

  // YOY 계산
  const tagYoY = avgTag24F > 0 ? (avgTag25F / avgTag24F) * 100 : 0;
  const costYoY = avgCost24F > 0 ? (avgCost25F / avgCost24F) * 100 : 0;
  const costRateChange = avgCostRate25F - avgCostRate24F;

  // 수량 전년비
  const qtyYoY = totalQty24F > 0 ? (totalQty25F / totalQty24F) * 100 : 0;

  return {
    avgTag25F,
    avgTag24F,
    tagYoY,
    costYoY,
    costRateChange,
    totalCostChange,
    materialChange,
    artworkChange,
    laborChange,
    marginChange,
    expenseChange,
    totalQty25F,
    totalQty24F,
    qtyYoY,
    avgCost25F,
    avgCost24F,
    avgCostRate25F,
    avgCostRate24F,
    avgMaterial25F,
    avgMaterial24F,
    avgArtwork25F,
    avgArtwork24F,
    avgLabor25F,
    avgLabor24F,
    avgMargin25F,
    avgMargin24F,
    avgExpense25F,
    avgExpense24F,
  };
}

/**
 * 전체 통계 계산 함수
 * summary.total이 있으면 우선 사용, 없으면 items 기반으로 계산
 */
export function calculateTotalStats(items: CostDataItem[], summary?: any) {
  // summary.total이 있으면 그것을 사용 (정확한 전체 통계)
  if (summary?.total) {
    const total = summary.total;
    return {
      avgTag25F: total.avgTag25F_krw || 0,
      avgTag24F: total.avgTag24F_krw || 0,
      tagYoY: total.tagYoY_krw || 0,
      costYoY: total.costYoY_usd || 0,
      costRateChange: total.costRateChange_usd || 0,
      totalCostChange: (total.material25F_usd || 0) - (total.material24F_usd || 0) +
                      (total.artwork25F_usd || 0) - (total.artwork24F_usd || 0) +
                      (total.labor25F_usd || 0) - (total.labor24F_usd || 0) +
                      (total.margin25F_usd || 0) - (total.margin24F_usd || 0) +
                      (total.expense25F_usd || 0) - (total.expense24F_usd || 0),
      materialChange: (total.material25F_usd || 0) - (total.material24F_usd || 0),
      artworkChange: (total.artwork25F_usd || 0) - (total.artwork24F_usd || 0),
      laborChange: (total.labor25F_usd || 0) - (total.labor24F_usd || 0),
      marginChange: (total.margin25F_usd || 0) - (total.margin24F_usd || 0),
      expenseChange: (total.expense25F_usd || 0) - (total.expense24F_usd || 0),
      totalQty25F: total.qty25F || 0,
      totalQty24F: total.qty24F || 0,
      qtyYoY: total.qtyYoY || 0,
      avgCost25F: total.avgCost25F_usd || 0,
      avgCost24F: total.avgCost24F_usd || 0,
      avgCostRate25F: total.costRate25F_usd || 0,
      avgCostRate24F: total.costRate24F_usd || 0,
      avgMaterial25F: total.material25F_usd || 0,
      avgMaterial24F: total.material24F_usd || 0,
      avgArtwork25F: total.artwork25F_usd || 0,
      avgArtwork24F: total.artwork24F_usd || 0,
      avgLabor25F: total.labor25F_usd || 0,
      avgLabor24F: total.labor24F_usd || 0,
      avgMargin25F: total.margin25F_usd || 0,
      avgMargin24F: total.margin24F_usd || 0,
      avgExpense25F: total.expense25F_usd || 0,
      avgExpense24F: total.expense24F_usd || 0,
      // summary.total에서 추가로 필요한 필드들
      costRate24F_usd: total.costRate24F_usd || 0,
      costRate25F_usd: total.costRate25F_usd || 0,
      costRate24F_krw: total.costRate24F_krw || 0,
      costRate25F_krw: total.costRate25F_krw || 0,
      avgTag24F_usd: total.avgTag24F_usd || 0,
      avgTag25F_usd: total.avgTag25F_usd || 0,
      tagYoY_usd: total.tagYoY_usd || 0,
      avgCost24F_krw: total.avgCost24F_krw || 0,
      avgCost25F_krw: total.avgCost25F_krw || 0,
      costYoY_krw: total.costYoY_krw || 0,
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
      // 추가 필드 (ExecutiveSummary 등에서 사용)
      costRateChange_usd: total.costRateChange_usd || 0,
      costRateChange_krw: total.costRateChange_krw || 0,
      material24F_usd: total.material24F_usd || 0,
      material25F_usd: total.material25F_usd || 0,
      labor24F_usd: total.labor24F_usd || 0,
      labor25F_usd: total.labor25F_usd || 0,
      costYoY_usd: total.costYoY_usd || 0,
      avgCost24F_usd: total.avgCost24F_usd || 0,
      avgCost25F_usd: total.avgCost25F_usd || 0,
      avgTag24F_krw: total.avgTag24F_krw || 0,
      avgTag25F_krw: total.avgTag25F_krw || 0,
      tagYoY_krw: total.tagYoY_krw || 0,
    };
  }
  
  // summary가 없으면 items 기반으로 계산
  const calculated = calculateCategoryAverage(items);
  if (!calculated) {
    return null;
  }
  
  // items 기반 계산 결과를 summary.total 형식으로 변환
  return {
    ...calculated,
    // 추가 필드들 (기본값)
    costRate24F_usd: calculated.avgCostRate24F,
    costRate25F_usd: calculated.avgCostRate25F,
    costRate24F_krw: calculated.avgCostRate24F,
    costRate25F_krw: calculated.avgCostRate25F,
    avgTag24F_usd: 0, // items에는 USD TAG 정보가 없을 수 있음
    avgTag25F_usd: 0,
    tagYoY_usd: calculated.tagYoY,
    avgCost24F_krw: 0,
    avgCost25F_krw: 0,
    costYoY_krw: calculated.costYoY,
    materialRate24F_usd: 0,
    materialRate25F_usd: 0,
    artworkRate24F_usd: 0,
    artworkRate25F_usd: 0,
    laborRate24F_usd: 0,
    laborRate25F_usd: 0,
    marginRate24F_usd: 0,
    marginRate25F_usd: 0,
    expenseRate24F_usd: 0,
    expenseRate25F_usd: 0,
  };
}

