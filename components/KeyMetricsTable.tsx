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
      value24F: fxPrev.toLocaleString(),
      value25F: fxCurr.toLocaleString(),
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
        MLB(글로벌기준) 주요 지표 비교
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
            <span>✅</span>
            <span>핵심 성과: 생산수량 {total.qtyYoY?.toFixed(1)}% 증가, TAG {tagAmountYoY.toFixed(1)}% 상승으로 생산단가 {(total.costYoY_usd - 100).toFixed(1)}% 증가에도 USD 원가율 {Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선</span>
          </div>

          {/* 제목 */}
          <div className="font-bold text-gray-800 flex items-center gap-2">
            <span>📊</span>
            <span>전년대비 주요 지표 변화 분석</span>
          </div>

          {/* 생산 규모 확대 */}
          <div>
            <div className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
              <span>🔼</span>
              <span>생산 규모 확대</span>
            </div>
            <p className="leading-relaxed text-gray-600 pl-5">
              생산수량 {((total.qty25F - total.qty24F) / 10000).toFixed(1)}만개 증가(+{total.qtyYoY?.toFixed(1)}%)로 대량생산 체제 전환. 
              총판매가는 {tagAmountYoY.toFixed(1)}% 증가하여 고가 제품 믹스 확대 전략 확인됨.
            </p>
          </div>

          {/* TAG 상승 효과 */}
          <div>
            <div className="font-semibold text-gray-800 flex items-center gap-1 mb-1">
              <span>💰</span>
              <span>TAG 상승 효과로 원가율 방어</span>
            </div>
            <p className="leading-relaxed text-gray-600 pl-5">
              생산단가 ${Math.abs(total.avgCost25F_usd - total.avgCost24F_usd).toFixed(2)} 상승(+{(total.costYoY_usd - 100).toFixed(1)}%)했으나, 
              평균TAG ${(total.avgTag25F_usd - total.avgTag24F_usd).toFixed(2)} 상승(+{(total.tagYoY_usd - 100).toFixed(1)}%)으로 
              원가율 {Math.abs(total.costRateChange_usd).toFixed(1)}%p 개선 달성. 
              원가M/U {mu24F.toFixed(2)}→{mu25F.toFixed(2)} (+{(mu25F - mu24F).toFixed(2)})로 수익성 개선됨.
            </p>
          </div>

          {/* 환율 리스크 */}
          <div>
            <div className="font-semibold text-orange-700 flex items-center gap-1 mb-1">
              <span>⚠️</span>
              <span>환율 악화로 KRW 실손익 압박</span>
            </div>
            <p className="leading-relaxed text-gray-600 pl-5">
              환율 +{fxYoY.toFixed(1)}% 상승({fxPrev.toLocaleString()}→{fxCurr.toLocaleString()}원)으로 
              KRW 기준 생산단가 +{(total.costYoY_krw - 100).toFixed(1)}% 급증. 
              USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +{total.costRateChange_krw.toFixed(1)}%p 악화.
            </p>
          </div>

          {/* 시사점 */}
          <div>
            <div className="font-semibold text-blue-700 flex items-center gap-1 mb-1">
              <span>💡</span>
              <span>시사점</span>
            </div>
            <p className="leading-relaxed text-gray-600 pl-5">
              NON은 대량생산(+{total.qtyYoY?.toFixed(1)}%)과 고가 믹스 전략으로 USD 기준 원가율을 방어했으나, 
              생산단가 인상(+{(total.costYoY_usd - 100).toFixed(1)}%)과 환율 급등(+{fxYoY.toFixed(1)}%)으로 KRW 실손익은 압박받는 구조. 
              향후 생산단가 절감과 환헤지 전략이 핵심 과제.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyMetricsTable;

