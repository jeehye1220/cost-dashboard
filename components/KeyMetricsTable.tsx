'use client';

import React from 'react';

interface KeyMetricsTableProps {
  summary: any;
}

const KeyMetricsTable: React.FC<KeyMetricsTableProps> = ({ summary }) => {
  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total, fx } = summary;
  
  // 탭 이름 판별 (qty24F 기준)
  const getTabName = () => {
    if (total.qty24F > 3000000 && total.qty24F < 4000000) return 'MLB 25FW';
    if (total.qty24F > 600000 && total.qty24F < 700000) return 'MLB KIDS';
    if (total.qty24F > 1200000 && total.qty24F < 1400000) return 'DISCOVERY';
    return 'MLB NON'; // 기본값
  };
  
  const tabName = getTabName();
  
  // 편집 상태 관리
  const [editMode, setEditMode] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<{[key: string]: string}>({});

  // 환율 정보 (FX CSV 파일에서 로드)
  const fxPrev = fx?.prev || 1297.0; // 전년 환율
  const fxCurr = fx?.curr || 1415.0; // 당년 환율
  const fxYoY = ((fxCurr / fxPrev - 1) * 100);

  // 원가 MU 계산 (1 / 원가율)
  const mu24F = total.costRate24F_usd > 0 ? (1 / (total.costRate24F_usd / 100)) : 0;
  const mu25F = total.costRate25F_usd > 0 ? (1 / (total.costRate25F_usd / 100)) : 0;
  const muYoY = mu24F > 0 ? ((mu25F / mu24F - 1) * 100) : 0;

  // 총판매가 계산 (TAG 금액)
  const totalTagPrev_KRW = total.avgTag24F_usd * total.qty24F * fxPrev;
  const totalTagCurr_KRW = total.avgTag25F_usd * total.qty25F * fxPrev; // 당년도 전년 환율 사용
  const tagAmountYoY = totalTagPrev_KRW > 0 ? ((totalTagCurr_KRW / totalTagPrev_KRW - 1) * 100) : 0;

  // 총생산액 계산 (원가 총액)
  const totalCost24F_USD = total.avgCost24F_usd * total.qty24F;
  const totalCost25F_USD = total.avgCost25F_usd * total.qty25F;
  const costAmountYoY = totalCost24F_USD > 0 ? ((totalCost25F_USD / totalCost24F_USD - 1) * 100) : 0;
  
  // 탭별 초기 분석 멘트
  const getDefaultInsights = () => {
    if (tabName === 'MLB KIDS') {
      return {
        title: `핵심 성과: 생산수량 ${total.qtyYoY?.toFixed(1)}% 감소, TAG +${(total.tagYoY_usd-100).toFixed(1)}% 상승으로 생산단가 +${(total.costYoY_usd-100).toFixed(1)}% 증가에도 USD 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선`,
        volume: `생산수량 ${(total.qty24F/10000).toFixed(1)}만개 → ${(total.qty25F/10000).toFixed(1)}만개 (${total.qtyYoY?.toFixed(1)}%) 감소. 시장 축소 또는 전략적 물량 조정으로 추정됨.`,
        tag: `평균TAG $${(total.avgTag25F_usd - total.avgTag24F_usd).toFixed(2)} 상승(+${(total.tagYoY_usd-100).toFixed(1)}%)으로 원가율 방어. TAG 상승 전략이 원가 인상 압력을 상쇄하여 USD 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선 달성. 원가M/U ${mu24F.toFixed(2)}→${mu25F.toFixed(2)} (+${(mu25F-mu24F).toFixed(2)})로 수익성 개선됨.`,
        fx: `환율 +${fxYoY.toFixed(1)}% 상승(${fxPrev.toFixed(2)}→${fxCurr.toFixed(2)}원)으로 KRW 기준 생산단가 +${(total.costYoY_krw-100).toFixed(1)}% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +${total.costRateChange_krw.toFixed(1)}%p 악화.`,
        conclusion: `KIDS는 물량 감소(-${(100-total.qtyYoY).toFixed(1)}%)에도 TAG 인상 전략(+${(total.tagYoY_usd-100).toFixed(1)}%)으로 USD 기준 원가율을 개선했으나, 환율 급등(+${fxYoY.toFixed(1)}%)으로 KRW 실손익은 압박받는 구조. 물량 회복과 환헤지 전략이 핵심 과제.`
      };
    } else if (tabName === 'DISCOVERY') {
      return {
        title: `원자재 가격 상승과 환율 악재가 동시에 작용하며 원가 경쟁력 악화. 소재 조달 전략 및 공임비 강화 시급.`,
        volume: `원부자재 단가 상승: 고가 소재(다운, 기능성 원단 등) 사용 비중 확대로 글로벌 원자재 시세 상승이 맞물려 단가 상승. 소재비 비중 14.42% → 15.20%로 확대. 단, Outer(다운류) 공임비 효율화로 일부 기여도 감소.`,
        tag: `공임비 절감: 협동 아이템(박터, 트리밍)에서 공임비 6.90 → 6.83 USD/PCS로 감소. 단, Outer(다운류) 공임비 효율화(14.42→15.20%)로 기여도 감소.`,
        fx: `환율 효과: 환율 ${fxPrev.toFixed(2)} → ${fxCurr.toFixed(2)}(+${fxYoY.toFixed(1)}%) 상승으로 KRW 환가율 추가 상승. 원물인조로 환가율 +${(total.costRateChange_krw - total.costRateChange_usd).toFixed(1)}%p 악화. - 환헤지 커버 비율 확대, 기준환율 관리 필요.`,
        conclusion: `환율의 추가 부담: USD 기준 ${total.costRate25F_usd.toFixed(1)}% 원가율에 환율 상승(+${fxYoY.toFixed(1)}%)이 물리며 KRW 기준 ${total.costRate25F_krw.toFixed(1)}%로 상승인조로 환가율 +${(total.costRateChange_krw - total.costRateChange_usd).toFixed(1)}%p 추가 악화. Outer 카테고리 환율 영향 집중(${(58).toFixed(0)}% 비중). 다운원면 등 Outer가 전체 생산의 ${(17).toFixed(0)} USD 원물 변동에 가장 민감. 추가 환율 악화 구간에서 충수지 감소 방어 계획 필수.`
      };
    } else {
      // 기존 25FW, NON 시즌
      return {
        title: `핵심 성과: 생산수량 ${total.qtyYoY?.toFixed(1)}% 증가, TAG +${tagAmountYoY.toFixed(1)}% 상승으로 생산단가 +${(total.costYoY_usd-100).toFixed(1)}% 증가에도 USD 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선`,
        volume: `생산수량 ${(total.qty24F/10000).toFixed(1)}만개 → ${(total.qty25F/10000).toFixed(1)}만개 (+${total.qtyYoY?.toFixed(1)}%) 증가로 스케일 메리트 확보. 총판매가는 ${tagAmountYoY.toFixed(1)}% 증가하여 고가 제품 믹스 확대 전략 확인됨.`,
        tag: `평균TAG $${(total.avgTag25F_usd - total.avgTag24F_usd).toFixed(2)} 상승(+${(total.tagYoY_usd-100).toFixed(1)}%)으로 원가율 ${Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선 달성. 원가M/U ${mu24F.toFixed(2)}→${mu25F.toFixed(2)} (+${(mu25F-mu24F).toFixed(2)})로 수익성 개선됨.`,
        fx: `환율 +${fxYoY.toFixed(1)}% 상승(${fxPrev.toFixed(2)}→${fxCurr.toFixed(2)}원)으로 KRW 기준 생산단가 +${(total.costYoY_krw-100).toFixed(1)}% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +${total.costRateChange_krw.toFixed(1)}%p 악화.`,
        conclusion: `${tabName}은 대량생산(+${total.qtyYoY?.toFixed(1)}%)과 고가 믹스 전략으로 USD 기준 원가율을 방어했으나, 생산단가 인상(+${(total.costYoY_usd-100).toFixed(1)}%)과 환율 급등(+${fxYoY.toFixed(1)}%)으로 KRW 실손익은 압박받는 구조. 향후 생산단가 절감과 환헤지 전략이 핵심 과제.`
      };
    }
  };
  
  // 초기 멘트 설정
  React.useEffect(() => {
    const defaultInsights = getDefaultInsights();
    setInsights(defaultInsights);
  }, [tabName]);
  
  // 편집 가능한 텍스트 컴포넌트
  const EditableText = ({ id, value, className, onSave }: any) => {
    const isEditing = editMode === id;
    
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
          onClick={() => setEditMode(null)}
          className="self-end text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          저장
        </button>
      </div>
    ) : (
      <div className="group relative">
        <span className={className}>{value}</span>
        <button
          onClick={() => setEditMode(id)}
          className="ml-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✏️
        </button>
      </div>
    );
  };
  
  const handleInsightEdit = (key: string, value: string) => {
    setInsights({ ...insights, [key]: value });
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
      isPercentYoY: true
    },
    {
      label: '총판매가(백만원)',
      value24F: (totalTagPrev_KRW / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      value25F: (totalTagCurr_KRW / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      yoy: tagAmountYoY,
      unit: '',
      isPercentYoY: true
    },
    {
      label: '총생산액(USD)',
      value24F: `$${(totalCost24F_USD / 1000000).toFixed(1)}M`,
      value25F: `$${(totalCost25F_USD / 1000000).toFixed(1)}M`,
      yoy: costAmountYoY,
      unit: '',
      isPercentYoY: true
    },
    {
      label: '생산단가(USD)',
      value24F: `$${total.avgCost24F_usd?.toFixed(2) || '0'}`,
      value25F: `$${total.avgCost25F_usd?.toFixed(2) || '0'}`,
      yoy: total.costYoY_usd - 100,
      unit: '',
      isPercentYoY: true,
      highlight: true
    },
    {
      label: '원가율(USD기준)',
      value24F: `${total.costRate24F_usd?.toFixed(2) || '0'}%`,
      value25F: `${total.costRate25F_usd?.toFixed(2) || '0'}%`,
      yoy: total.costRate25F_usd - total.costRate24F_usd,
      unit: '%p',
      isPercentYoY: false,
      highlight: true
    },
    {
      label: '원가M/U',
      value24F: mu24F.toFixed(2),
      value25F: mu25F.toFixed(2),
      yoy: muYoY,
      unit: '',
      isPercentYoY: true
    },
    {
      label: '환율',
      value24F: fxPrev.toFixed(2),
      value25F: fxCurr.toFixed(2),
      yoy: fxYoY,
      unit: '',
      isPercentYoY: true
    }
  ];

  const getYoYColor = (yoy: number, isPositiveGood: boolean = true) => {
    if (yoy > 0) {
      return isPositiveGood ? 'text-green-600' : 'text-red-600';
    } else if (yoy < 0) {
      return isPositiveGood ? 'text-red-600' : 'text-green-600';
    }
    return 'text-gray-600';
  };

  const getYoYIcon = (yoy: number) => {
    if (yoy > 0) return '▲';
    if (yoy < 0) return '▼';
    return '─';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h3 className="text-lg font-bold text-gray-700 mb-3 bg-slate-700 text-white px-3 py-2 rounded-t-lg">
        {tabName}(글로벌기준) 주요 지표 비교
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-600 text-white">
              <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold">
                구분
              </th>
              <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                전년
              </th>
              <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                당년
              </th>
              <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold">
                YOY
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, idx) => {
              const isPositiveGood = metric.label !== '원가율(USD기준)';
              const yoyColor = getYoYColor(metric.yoy, isPositiveGood);
              const yoyIcon = getYoYIcon(metric.yoy);
              
              return (
                <tr 
                  key={idx}
                  className={`${metric.highlight ? 'bg-blue-50/70 font-semibold' : 'hover:bg-gray-50'}`}
                >
                  <td className="border border-gray-300 px-2 py-1.5 font-medium text-gray-700">
                    {metric.label}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-700">
                    {metric.value24F}
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-gray-800">
                    {metric.value25F}
                  </td>
                  <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold whitespace-nowrap ${yoyColor}`}>
                    {yoyIcon} {Math.abs(metric.yoy).toFixed(metric.isPercentYoY ? 1 : 2)}
                    {metric.isPercentYoY ? '%' : metric.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 핵심 성과 요약 */}
      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-lg border-l-4 border-blue-500 shadow-sm">
        <div className="text-xs text-gray-700 space-y-3">
          {/* 헤더 */}
          <div className="font-bold text-blue-700 text-sm flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span>✅</span>
              <EditableText 
                id="title" 
                value={insights.title} 
                className="flex-1"
                onSave={(val: string) => handleInsightEdit('title', val)}
              />
            </div>
          </div>

          {/* 제목 */}
          <div className="font-bold text-gray-800 flex items-center gap-2">
            <span>📊</span>
            <span>전년대비 주요 지표 변화 분석</span>
          </div>

          {/* 생산 규모 / 원부자재 단가 상승 */}
          <div>
            <div className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
              <span>{sectionTitles.volume.icon}</span>
              <span>{sectionTitles.volume.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-5">
              <EditableText 
                id="volume" 
                value={insights.volume} 
                className=""
                onSave={(val: string) => handleInsightEdit('volume', val)}
              />
            </div>
          </div>

          {/* TAG 효과 / 공임비 절감 */}
          <div>
            <div className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
              <span>{sectionTitles.tag.icon}</span>
              <span>{sectionTitles.tag.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-5">
              <EditableText 
                id="tag" 
                value={insights.tag} 
                className=""
                onSave={(val: string) => handleInsightEdit('tag', val)}
              />
            </div>
          </div>

          {/* 환율 리스크 */}
          <div>
            <div className="font-semibold text-orange-700 flex items-center gap-1 mb-1">
              <span>{sectionTitles.fx.icon}</span>
              <span>{sectionTitles.fx.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-5">
              <EditableText 
                id="fx" 
                value={insights.fx} 
                className=""
                onSave={(val: string) => handleInsightEdit('fx', val)}
              />
            </div>
          </div>

          {/* 시사점 / 리스크 요약 */}
          <div>
            <div className={`font-semibold flex items-center gap-1 mb-1 ${tabName === 'DISCOVERY' ? 'text-orange-700' : 'text-blue-700'}`}>
              <span>{sectionTitles.conclusion.icon}</span>
              <span>{sectionTitles.conclusion.title}</span>
            </div>
            <div className="leading-relaxed text-gray-600 pl-5">
              <EditableText 
                id="conclusion" 
                value={insights.conclusion} 
                className=""
                onSave={(val: string) => handleInsightEdit('conclusion', val)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyMetricsTable;

