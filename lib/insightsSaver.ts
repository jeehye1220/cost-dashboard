/**
 * CSV 형식의 인사이트 파일을 저장하는 유틸리티
 */

interface SaveInsightsParams {
  season: string;
  updates: { [section: string]: string };
}

/**
 * 인사이트 데이터를 CSV 파일에 저장
 */
export async function saveInsightsToCSV({ season, updates }: SaveInsightsParams): Promise<boolean> {
  try {
    const response = await fetch('/api/save-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ season, updates }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to save insights:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving insights:', error);
    return false;
  }
}

/**
 * 인사이트 데이터를 구조화된 형태로 변환하여 저장
 */
export async function saveStructuredInsights(
  season: string,
  insights: {
    usd?: {
      title?: string;
      mainChange?: string;
      items?: Array<{ icon?: string; title?: string; change?: string; description?: string }>;
      summary?: string;
    };
    krw?: {
      title?: string;
      mainChange?: string;
      items?: Array<{ icon?: string; title?: string; change?: string; description?: string }>;
      summary?: string;
    };
    actions?: string[];
    risks?: string[];
    success?: string[];
    actionSummary?: string;
    riskSummary?: string;
    successSummary?: string;
    message?: string;
    metricsTitle?: string;
    metricsVolume?: string;
    metricsTag?: string;
    metricsFx?: string;
    metricsConclusion?: string;
  }
): Promise<boolean> {
  const updates: { [key: string]: string } = {};

  // USD 섹션
  if (insights.usd) {
    if (insights.usd.title) updates['usd_title'] = insights.usd.title;
    if (insights.usd.mainChange) updates['usd_main_change'] = insights.usd.mainChange;
    if (insights.usd.summary) updates['usd_summary'] = insights.usd.summary;
    
    if (insights.usd.items) {
      insights.usd.items.forEach((item, index) => {
        const idx = index + 1;
        if (item.icon) updates[`usd_item_${idx}_icon`] = item.icon;
        if (item.title) updates[`usd_item_${idx}_title`] = item.title;
        if (item.change) updates[`usd_item_${idx}_change`] = item.change;
        if (item.description) updates[`usd_item_${idx}_description`] = item.description;
      });
    }
  }

  // KRW 섹션
  if (insights.krw) {
    if (insights.krw.title) updates['krw_title'] = insights.krw.title;
    if (insights.krw.mainChange) updates['krw_main_change'] = insights.krw.mainChange;
    if (insights.krw.summary) updates['krw_summary'] = insights.krw.summary;
    
    if (insights.krw.items) {
      insights.krw.items.forEach((item, index) => {
        const idx = index + 1;
        if (item.icon) updates[`krw_item_${idx}_icon`] = item.icon;
        if (item.title) updates[`krw_item_${idx}_title`] = item.title;
        if (item.change) updates[`krw_item_${idx}_change`] = item.change;
        if (item.description) updates[`krw_item_${idx}_description`] = item.description;
      });
    }
  }

  // 액션, 리스크, 성공 포인트
  if (insights.actions) {
    insights.actions.forEach((action, index) => {
      updates[`action_${index + 1}`] = action;
    });
  }
  if (insights.risks) {
    insights.risks.forEach((risk, index) => {
      updates[`risk_${index + 1}`] = risk;
    });
  }
  if (insights.success) {
    insights.success.forEach((success, index) => {
      updates[`success_${index + 1}`] = success;
    });
  }

  // 요약 텍스트
  if (insights.actionSummary) updates['action summary'] = insights.actionSummary;
  if (insights.riskSummary) updates['risk summary'] = insights.riskSummary;
  if (insights.successSummary) updates['success summary'] = insights.successSummary;
  if (insights.message) updates['message'] = insights.message;

  // KeyMetricsTable 필드
  if (insights.metricsTitle) updates['metrics_title'] = insights.metricsTitle;
  if (insights.metricsVolume) updates['metrics_volume'] = insights.metricsVolume;
  if (insights.metricsTag) updates['metrics_tag'] = insights.metricsTag;
  if (insights.metricsFx) updates['metrics_fx'] = insights.metricsFx;
  if (insights.metricsConclusion) updates['metrics_conclusion'] = insights.metricsConclusion;

  return saveInsightsToCSV({ season, updates });
}



















