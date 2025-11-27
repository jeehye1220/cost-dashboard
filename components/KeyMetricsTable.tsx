'use client';

import React from 'react';
import { loadInsightsFromCSV, detectSeasonType, isSummaryDataValid } from '@/lib/insightsLoader';
import { saveInsightsToCSV } from '@/lib/insightsSaver';

interface KeyMetricsTableProps {
  summary: any;
  brandId?: string;
}

const KeyMetricsTable: React.FC<KeyMetricsTableProps> = ({ summary, brandId }) => {
  const [showTable, setShowTable] = React.useState(false);

  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total, fx } = summary;
  
  // 브랜드명 매핑
  const getBrandName = (brandCode: string): string => {
    const brandMap: Record<string, string> = {
      'M': 'MLB',
      'I': 'MLB KIDS',
      'X': 'DISCOVERY',
      'ST': 'SERGIO TACCHINI',
      'V': 'DUVETICA',
    };
    return brandMap[brandCode] || 'MLB';
  };
  
  // 시즌 코드를 표시 형식으로 변환 (26SS → 26SS, 25FW → 25FW)
  const formatSeason = (season: string): string => {
    return season; // 그대로 사용
  };
  
  // 탭 이름 동적 생성 (brandId 기반)
  const getTabName = () => {
    if (!brandId) {
      // brandId가 없으면 qty24F 기준으로 판별 (기존 로직)
      if (total.qty24F > 3000000 && total.qty24F < 4000000) return 'MLB 25FW';
      if (total.qty24F > 600000 && total.qty24F < 700000) return 'MLB KIDS';
      if (total.qty24F > 1200000 && total.qty24F < 1400000) return 'DISCOVERY';
      return 'MLB NON';
    }
    
    // DISCOVERY-KIDS 처리 (모든 시즌 동일하게)
    if (brandId.includes('DISCOVERY-KIDS')) {
      const parts = brandId.split('-');
      let season = '';
      
      // brandId가 'DISCOVERY-KIDS' (25FW 기간)인 경우
      if (brandId === 'DISCOVERY-KIDS') {
        season = '25FW';
      } else if (parts.length >= 3 && parts[1] === 'DISCOVERY' && parts[2] === 'KIDS') {
        // 26SS-DISCOVERY-KIDS, 26FW-DISCOVERY-KIDS 등
        season = parts[0] || '';
      }
      
      // 모든 시즌 동일하게 "DISCOVERY KIDS [시즌]" 형식으로 반환
      return `DISCOVERY KIDS ${season}`;
    }
    
    // brandId에서 브랜드 코드와 시즌 추출
    let brandCode = '';
    let season = '';
    
    if (brandId.startsWith('26SS-') || brandId.startsWith('26FW-') || brandId.startsWith('25SS-') || brandId.startsWith('25FW-')) {
      const parts = brandId.split('-');
      season = parts[0] || '';
      brandCode = parts[1] || '';
    } else if (brandId === '25FW' || brandId === 'NON' || brandId === 'KIDS' || brandId === 'DISCOVERY' || brandId === 'ST' || brandId === 'V') {
      // 기존 브랜드 ID (25FW 기간)
      season = '25FW';
      if (brandId === '25FW') brandCode = 'M';
      else if (brandId === 'KIDS') brandCode = 'I';
      else if (brandId === 'DISCOVERY') brandCode = 'X';
      else brandCode = brandId;
    } else {
      // 알 수 없는 경우 기본값
      if (total.qty24F > 3000000 && total.qty24F < 4000000) return 'MLB 25FW';
      if (total.qty24F > 600000 && total.qty24F < 700000) return 'MLB KIDS';
      if (total.qty24F > 1200000 && total.qty24F < 1400000) return 'DISCOVERY';
      return 'MLB NON';
    }
    
    const brandName = getBrandName(brandCode);
    const seasonFormatted = formatSeason(season);
    
    return `${brandName} ${seasonFormatted}`;
  };
  
  const tabName = getTabName();
  
  // 편집 상태 관리
  const [editMode, setEditMode] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<{[key: string]: string}>({});
  const [loadingAI, setLoadingAI] = React.useState<{[key: string]: boolean}>({});

  // 환율 정보 (FX CSV 파일에서 로드)
  const fxPrev = fx?.prev || 1297.0; // 전년 환율
  const fxCurr = fx?.curr || 1415.0; // 당년 환율
  const fxYoY = (fxCurr / fxPrev) * 100; // 비율 (예: 110.2%)

  // 원가 MU 계산 (1 / 원가율)
  const mu24F = total.costRate24F_usd > 0 ? (1 / (total.costRate24F_usd / 100)) : 0;
  const mu25F = total.costRate25F_usd > 0 ? (1 / (total.costRate25F_usd / 100)) : 0;
  const muYoY = mu24F > 0 ? ((mu25F / mu24F - 1) * 100) : 0;

  // 총판매가 계산 (TAG 금액)
  const totalTagPrev_KRW = total.avgTag24F_usd * total.qty24F * fxPrev;
  const totalTagCurr_KRW = total.avgTag25F_usd * total.qty25F * fxPrev; // 당년도 전년 환율 사용
  const tagAmountYoY = totalTagPrev_KRW > 0 ? ((totalTagCurr_KRW / totalTagPrev_KRW) * 100) : 0; // 비율 (예: 108.7%)

  // 총생산액 계산 (원가 총액)
  const totalCost24F_USD = total.avgCost24F_usd * total.qty24F;
  const totalCost25F_USD = total.avgCost25F_usd * total.qty25F;
  const costAmountYoY = totalCost24F_USD > 0 ? ((totalCost25F_USD / totalCost24F_USD) * 100) : 0; // 비율 (예: 103.5%)
  
  // 탭별 초기 분석 멘트
  const getDefaultInsights = () => {
    if (tabName === 'MLB KIDS') {
      return {
        title: `핵심 성과: 생산수량 ${total.qtyYoY?.toFixed(1)}% 감소, TAG +${(total.tagYoY_usd-100).toFixed(1)}% 상승으로 생산단가 +${(total.costYoY_usd-100).toFixed(1)}% 증가에도 USD 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선`,
        volume: `생산수량 ${(total.qty24F/10000).toFixed(1)}만개 → ${(total.qty25F/10000).toFixed(1)}만개 (${total.qtyYoY?.toFixed(1)}%) 감소. 시장 축소 또는 전략적 물량 조정으로 추정됨.`,
        tag: `평균TAG $${(total.avgTag25F_usd - total.avgTag24F_usd).toFixed(2)} 상승(+${(total.tagYoY_usd-100).toFixed(1)}%)으로 원가율 방어. TAG 상승 전략이 원가 인상 압력을 상쇄하여 USD 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선 달성. 원가M/U ${mu24F.toFixed(2)}→${mu25F.toFixed(2)} (+${(mu25F-mu24F).toFixed(2)})로 수익성 개선됨.`,
        fx: `환율 +${fxYoY.toFixed(1)}% 상승(${fxPrev.toFixed(2)}→${fxCurr.toFixed(2)}원)으로 KRW 기준 생산단가 +${(total.costYoY_krw-100).toFixed(1)}% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +${total.costRateChange_krw.toFixed(1)}%p 악화.`,
        conclusion: `KIDS는 물량 감소(-${(100-total.qtyYoY).toFixed(1)}%)에도 TAG 인상 전략(+${(total.tagYoY_usd-100).toFixed(1)}%)으로 USD 기준 원가율을 개선했으나, 환율 급등(+${fxYoY.toFixed(1)}%)으로 KRW 실손익은 압박받는 구조. 물량 회복이 핵심 과제.`
      };
    } else if (tabName === 'DISCOVERY') {
      return {
        title: `원자재 가격 상승과 환율 악재가 동시에 작용하며 원가 경쟁력 악화. 소재 조달 전략 및 공임비 강화 시급.`,
        volume: `원부자재 단가 상승: 고가 소재(다운, 기능성 원단 등) 사용 비중 확대로 글로벌 원자재 시세 상승이 맞물려 단가 상승. 소재비 비중 14.42% → 15.20%로 확대. 단, Outer(다운류) 공임비 효율화로 일부 기여도 감소.`,
        tag: `공임비 절감: 협동 아이템(박터, 트리밍)에서 공임비 6.90 → 6.83 USD/PCS로 감소. 단, Outer(다운류) 공임비 효율화(14.42→15.20%)로 기여도 감소.`,
        fx: `환율 효과: 환율 ${fxPrev.toFixed(2)} → ${fxCurr.toFixed(2)}(+${fxYoY.toFixed(1)}%) 상승으로 KRW 환가율 추가 상승. 원물인조로 환가율 +${(total.costRateChange_krw - total.costRateChange_usd).toFixed(1)}%p 악화. - 기준환율 관리 필요.`,
        conclusion: `환율의 추가 부담: USD 기준 ${total.costRate25F_usd.toFixed(1)}% 원가율에 환율 상승(+${fxYoY.toFixed(1)}%)이 물리며 KRW 기준 ${total.costRate25F_krw.toFixed(1)}%로 상승인조로 환가율 +${(total.costRateChange_krw - total.costRateChange_usd).toFixed(1)}%p 추가 악화. Outer 카테고리 환율 영향 집중(${(58).toFixed(0)}% 비중). 다운원면 등 Outer가 전체 생산의 ${(17).toFixed(0)} USD 원물 변동에 가장 민감. 추가 환율 악화 구간에서 충수지 감소 방어 계획 필수.`
      };
    } else {
      // 기존 25FW, NON 시즌
      return {
        title: `핵심 성과: 생산수량 ${total.qtyYoY?.toFixed(1)}% 증가, TAG +${tagAmountYoY.toFixed(1)}% 상승으로 생산단가 +${(total.costYoY_usd-100).toFixed(1)}% 증가에도 USD 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선`,
        volume: `생산수량 ${(total.qty24F/10000).toFixed(1)}만개 → ${(total.qty25F/10000).toFixed(1)}만개 (+${total.qtyYoY?.toFixed(1)}%) 증가로 스케일 메리트 확보. 총판매가는 ${tagAmountYoY.toFixed(1)}% 증가하여 고가 제품 믹스 확대 전략 확인됨.`,
        tag: `평균TAG $${(total.avgTag25F_usd - total.avgTag24F_usd).toFixed(2)} 상승(+${(total.tagYoY_usd-100).toFixed(1)}%)으로 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선 달성. 원가M/U ${mu24F.toFixed(2)}→${mu25F.toFixed(2)} (+${(mu25F-mu24F).toFixed(2)})로 수익성 개선됨.`,
        fx: `환율 +${fxYoY.toFixed(1)}% 상승(${fxPrev.toFixed(2)}→${fxCurr.toFixed(2)}원)으로 KRW 기준 생산단가 +${(total.costYoY_krw-100).toFixed(1)}% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +${total.costRateChange_krw.toFixed(1)}%p 악화.`,
        conclusion: `${tabName}은 대량생산(+${total.qtyYoY?.toFixed(1)}%)과 고가 믹스 전략으로 USD 기준 원가율을 방어했으나, 생산단가 인상(+${(total.costYoY_usd-100).toFixed(1)}%)과 환율 급등(+${fxYoY.toFixed(1)}%)으로 KRW 실손익은 압박받는 구조. 향후 생산단가 절감이 핵심 과제.`
      };
    }
  };
  
  // CSV에서 인사이트 로드 (데이터가 유효할 때만)
  React.useEffect(() => {
    // 데이터 유효성 검사
    if (!isSummaryDataValid(summary)) {
      return; // 데이터가 없으면 인사이트를 로드하지 않음
    }
    
    // brandId에서 기간 추출 (26SS, 25SS 등)
    let seasonType = detectSeasonType(total.qty24F);
    if (brandId?.startsWith('25SS-') || brandId?.startsWith('26SS-') || brandId?.startsWith('26FW-')) {
      seasonType = brandId.startsWith('25SS-') ? '25SS' : 
                   brandId.startsWith('26SS-') ? '26SS' : '26FW';
    }
    
    loadInsightsFromCSV(seasonType, brandId).then(data => {
      if (data && (data.metricsTitle || data.metricsVolume || data.metricsTag || data.metricsFx || data.metricsConclusion)) {
        // CSV에 metrics 필드가 있으면 사용
        setInsights({
          title: data.metricsTitle || '',
          volume: data.metricsVolume || '',
          tag: data.metricsTag || '',
          fx: data.metricsFx || '',
          conclusion: data.metricsConclusion || '',
        });
      } else {
        // CSV에 없으면 기본값 사용 (하드코딩된 값)
        const defaultInsights = getDefaultInsights();
        setInsights(defaultInsights);
      }
    });
  }, [tabName, total.qty24F, brandId, summary]);
  
  // 편집 가능한 텍스트 컴포넌트
  const EditableText = ({ id, value, className, onSave, showAIButton = false }: any) => {
    const isEditing = editMode === id;
    const fieldName = id; // title, volume, tag, fx, conclusion
    
    return isEditing ? (
      <div className="flex flex-col gap-1">
        <textarea
          value={value || ''}
          onChange={(e) => onSave(e.target.value)}
          className="w-full p-2 border border-blue-300 rounded text-sm"
          rows={3}
          autoFocus
        />
        <button
          onClick={async () => {
            await saveToCSV();
            setEditMode(null);
          }}
          className="self-end text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          저장
        </button>
      </div>
    ) : (
      <div className="group relative">
        <span className={className}>{value}</span>
        {process.env.NODE_ENV !== 'production' && (
          <div className="inline-flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditMode(id)}
              className="text-xs text-blue-500 hover:text-blue-700"
              title="편집"
            >
              ✏️
            </button>
            {showAIButton && (
              <button
                onClick={() => generateAIComment(fieldName)}
                disabled={loadingAI[fieldName]}
                className="text-xs text-purple-500 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI 생성"
              >
                {loadingAI[fieldName] ? '⏳' : '🤖'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };
  
  const handleInsightEdit = (key: string, value: string) => {
    setInsights({ ...insights, [key]: value });
  };

  // AI 코멘트 생성 함수
  const generateAIComment = async (field: string) => {
    setLoadingAI({ ...loadingAI, [field]: true });
    try {
      const data = {
        qty24F: total.qty24F,
        qty25F: total.qty25F,
        qtyYoY: total.qtyYoY,
        costRate24F_usd: total.costRate24F_usd,
        costRate25F_usd: total.costRate25F_usd,
        costRateChange_usd: total.costRateChange_usd,
        avgTag24F_usd: total.avgTag24F_usd,
        avgTag25F_usd: total.avgTag25F_usd,
        tagYoY_usd: total.tagYoY_usd,
        avgCost24F_usd: total.avgCost24F_usd,
        avgCost25F_usd: total.avgCost25F_usd,
        costYoY_usd: total.costYoY_usd,
        avgTag24F_krw: total.avgTag24F_krw,
        avgTag25F_krw: total.avgTag25F_krw,
        tagYoY_krw: total.tagYoY_krw,
        totalTag24F_KRW: totalTagPrev_KRW,
        totalTag25F_KRW: totalTagCurr_KRW,
        tagAmountYoY: tagAmountYoY,
        totalCost24F_USD: totalCost24F_USD,
        totalCost25F_USD: totalCost25F_USD,
        costAmountYoY: costAmountYoY,
        fxPrev: fxPrev,
        fxCurr: fxCurr,
        fxYoY: fxYoY,
        costRate24F_krw: total.costRate24F_krw,
        costRate25F_krw: total.costRate25F_krw,
        costRateChange_krw: total.costRateChange_krw,
      };

      const response = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: `metrics_${field}`,
          data: data,
          brandId: brandId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        handleInsightEdit(field, result.comment);
      } else {
        alert('AI 코멘트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 코멘트 생성 오류:', error);
      alert('AI 코멘트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoadingAI({ ...loadingAI, [field]: false });
    }
  };

  // CSV 파일에 저장하는 함수
  const saveToCSV = async () => {
    const seasonType = detectSeasonType(total.qty24F);
    const updates: { [key: string]: string } = {};
    
    if (insights.title) updates['metrics_title'] = insights.title;
    if (insights.volume) updates['metrics_volume'] = insights.volume;
    if (insights.tag) updates['metrics_tag'] = insights.tag;
    if (insights.fx) updates['metrics_fx'] = insights.fx;
    if (insights.conclusion) updates['metrics_conclusion'] = insights.conclusion;
    
    const success = await saveInsightsToCSV({ season: seasonType, updates });
    if (success) {
      // 저장 성공 (알림은 선택사항)
    } else {
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };
  
  // 섹션 제목 및 아이콘 설정
  const getSectionTitles = () => {
    if (tabName === 'DISCOVERY') {
      return {
        volume: { icon: '📦', title: '원부자재 단가 상승' },
        tag: { icon: '🏷️', title: '공임비 절감' },
        fx: { icon: '💱', title: '환율 효과' },
        conclusion: { icon: '🔥', title: 'Outer 카테고리 환율 영향 집중' }
      };
    }
    return {
      volume: { icon: '🔼', title: '생산 규모' },
      tag: { icon: '💰', title: 'TAG 효과' },
      fx: { icon: '⚠️', title: '환율 리스크' },
      conclusion: { icon: '💡', title: '시사점' }
    };
  };
  
  const sectionTitles = getSectionTitles();

  const metrics = [
    {
      label: '총생산수량',
      value24F: total.qty24F?.toLocaleString() || '0',
      value25F: total.qty25F?.toLocaleString() || '0',
      yoy: total.qtyYoY || 0,
      unit: '',
      displayType: 'percent' // 백분율 표시
    },
    {
      label: '총판매가(백만원)',
      value24F: (totalTagPrev_KRW / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      value25F: (totalTagCurr_KRW / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      yoy: tagAmountYoY,
      unit: '',
      displayType: 'percent' // 백분율 표시
    },
    {
      label: '총생산액(USD)',
      value24F: `$${(totalCost24F_USD / 1000000).toFixed(1)}M`,
      value25F: `$${(totalCost25F_USD / 1000000).toFixed(1)}M`,
      yoy: costAmountYoY,
      unit: '',
      displayType: 'percent' // 백분율 표시
    },
    {
      label: '생산단가(USD)',
      value24F: `$${total.avgCost24F_usd?.toFixed(2) || '0'}`,
      value25F: `$${total.avgCost25F_usd?.toFixed(2) || '0'}`,
      yoy: total.costYoY_usd || 0, // 이미 백분율 (예: 108.7%)
      unit: '',
      displayType: 'percent', // 백분율 표시
      highlight: true
    },
    {
      label: '원가율(USD기준)',
      value24F: `${total.costRate24F_usd?.toFixed(2) || '0'}%`,
      value25F: `${total.costRate25F_usd?.toFixed(2) || '0'}%`,
      yoy: total.costRate25F_usd - total.costRate24F_usd,
      unit: '%p',
      displayType: 'costRate', // 원가율 형식 (당년-전년, 감소=초록, 증가=빨강)
      highlight: true
    },
    {
      label: '원가M/U',
      value24F: mu24F.toFixed(2),
      value25F: mu25F.toFixed(2),
      yoy: mu25F - mu24F, // 당년 - 전년 (차이값)
      unit: '',
      displayType: 'mu', // 원가M/U 형식 (당년-전년, 감소=빨강, 증가=초록)
    },
    {
      label: '환율',
      value24F: fxPrev.toFixed(2),
      value25F: fxCurr.toFixed(2),
      yoy: fxYoY,
      unit: '',
      displayType: 'percent' // 백분율 표시
    }
  ];

  // YOY 표시 형식 함수
  const formatYoY = (metric: any) => {
    const { yoy, displayType, label } = metric;
    
    // 생산단가(USD): 올라가면 빨간색, 떨어지면 파란색
    if (label === '생산단가(USD)') {
      if (yoy > 100) {
        return { text: `${yoy.toFixed(1)}%`, color: 'text-red-600' };
      } else if (yoy < 100) {
        return { text: `${yoy.toFixed(1)}%`, color: 'text-blue-600' };
      } else {
        return { text: `${yoy.toFixed(1)}%`, color: 'text-gray-900' };
      }
    }
    
    // 원가M/U: 올라가면 파란색, 떨어지면 빨간색
    if (label === '원가M/U') {
      if (yoy > 0) {
        return { text: `+${yoy.toFixed(2)}`, color: 'text-blue-600' };
      } else if (yoy < 0) {
        return { text: `△${Math.abs(yoy).toFixed(2)}`, color: 'text-red-600' };
      } else {
        return { text: `0.00`, color: 'text-gray-900' };
      }
    }
    
    if (displayType === 'costRate') {
      // 원가율(USD기준): 당년 - 전년, 감소=파랑(-), 증가=빨강(+)
      if (yoy < 0) {
        return { text: `${yoy.toFixed(2)}%p`, color: 'text-blue-600' };
      } else if (yoy > 0) {
        return { text: `+${yoy.toFixed(2)}%p`, color: 'text-red-600' };
      } else {
        return { text: `0.00%p`, color: 'text-gray-900' };
      }
    } else {
      // 나머지: 모두 검정색
      return { text: `${yoy.toFixed(1)}%`, color: 'text-gray-900' };
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/50 via-white to-pink-50/50 rounded-xl shadow-md border border-blue-100 p-5">
      <button
        onClick={() => setShowTable(!showTable)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-all border border-blue-200 shadow-sm mb-0"
      >
        <div className="flex items-center gap-2">
          <span className="text-base text-blue-600 font-bold">
            {showTable ? '▼' : '▶'}
          </span>
          <h3 className="text-sm font-bold text-gray-800 whitespace-nowrap">
            {tabName}(글로벌기준) 주요 지표 비교
          </h3>
        </div>
      </button>

      {showTable && (
        <>
      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <th className="border-r border-gray-200 px-4 py-3 text-left font-semibold text-gray-800">구분</th>
              <th className="border-r border-gray-200 px-4 py-3 text-center font-semibold text-gray-800">전년</th>
              <th className="border-r border-gray-200 px-4 py-3 text-center font-semibold text-gray-800">당년</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-800">YOY</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, idx) => {
              const yoyDisplay = formatYoY(metric);
              
              return (
                <tr 
                  key={idx}
                  className={`${metric.highlight ? 'bg-blue-50/70 font-semibold' : 'hover:bg-gray-50/50'} border-b border-gray-200 transition-colors`}
                >
                  <td className="border-r border-gray-200 px-4 py-2.5 text-gray-700">
                    {metric.label}
                  </td>
                  <td className="border-r border-gray-200 px-4 py-2.5 text-right text-gray-700">
                    {metric.value24F}
                  </td>
                  <td className="border-r border-gray-200 px-4 py-2.5 text-right font-semibold text-gray-900">
                    {metric.value25F}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold whitespace-nowrap ${yoyDisplay.color}`}>
                    {yoyDisplay.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 핵심 성과 요약 */}
      <div className="mt-6 p-5 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/80 rounded-xl border border-blue-200 shadow-sm">
        <div className="text-sm text-gray-700 space-y-4">
          {/* 헤더 */}
          <div className="font-bold text-blue-700 text-base flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <EditableText 
                id="title" 
                value={insights.title} 
                className="flex-1"
                onSave={(val: string) => handleInsightEdit('title', val)}
                showAIButton={true}
              />
            </div>
          </div>

          {/* 제목 */}
          <div className="font-bold text-gray-800 flex items-center gap-2 text-base">
            <span className="text-lg">📊</span>
            <span>전년대비 주요 지표 변화 분석</span>
          </div>

          {/* 생산 규모 / 원부자재 단가 상승 */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <span className="text-base">{sectionTitles.volume.icon}</span>
              <span>{sectionTitles.volume.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-7">
              <EditableText 
                id="volume" 
                value={insights.volume} 
                className=""
                onSave={(val: string) => handleInsightEdit('volume', val)}
                showAIButton={true}
              />
            </div>
          </div>

          {/* TAG 효과 / 공임비 절감 */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
              <span className="text-base">{sectionTitles.tag.icon}</span>
              <span>{sectionTitles.tag.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-7">
              <EditableText 
                id="tag" 
                value={insights.tag} 
                className=""
                onSave={(val: string) => handleInsightEdit('tag', val)}
                showAIButton={true}
              />
            </div>
          </div>

          {/* 환율 리스크 */}
          <div className="bg-white rounded-lg p-3 border border-orange-200">
            <div className="font-semibold text-orange-700 flex items-center gap-2 mb-2">
              <span className="text-base">{sectionTitles.fx.icon}</span>
              <span>{sectionTitles.fx.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-7">
              <EditableText 
                id="fx" 
                value={insights.fx} 
                className=""
                onSave={(val: string) => handleInsightEdit('fx', val)}
                showAIButton={true}
              />
            </div>
          </div>

          {/* 시사점 / 리스크 요약 */}
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className={`font-semibold flex items-center gap-2 mb-2 ${tabName === 'DISCOVERY' ? 'text-orange-700' : 'text-blue-700'}`}>
              <span className="text-base">{sectionTitles.conclusion.icon}</span>
              <span>{sectionTitles.conclusion.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-7">
              <EditableText 
                id="conclusion" 
                value={insights.conclusion} 
                className=""
                onSave={(val: string) => handleInsightEdit('conclusion', val)}
                showAIButton={true}
              />
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default KeyMetricsTable;

