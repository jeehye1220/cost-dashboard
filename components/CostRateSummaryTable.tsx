'use client';

import React, { useState } from 'react';

interface CostRateSummaryTableProps {
  summary: any;
}

const CostRateSummaryTable: React.FC<CostRateSummaryTableProps> = ({ summary }) => {
  const [showTable, setShowTable] = useState(false);

  if (!summary || !summary.total) {
    return null;
  }

  const { total } = summary;

  // 워터폴 데이터 계산
  const materialArtwork24F = total.materialRate24F_usd + total.artworkRate24F_usd;
  const materialArtwork25F = total.materialRate25F_usd + total.artworkRate25F_usd;
  const materialArtworkChange = materialArtwork25F - materialArtwork24F;
  const laborChange = total.laborRate25F_usd - total.laborRate24F_usd;
  const marginChange = total.marginRate25F_usd - total.marginRate24F_usd;
  const expenseChange = total.expenseRate25F_usd - total.expenseRate24F_usd;
  const exchangeRateEffect = total.costRate25F_krw - total.costRate25F_usd;
  const realCostChange = total.costRate25F_usd - total.costRate24F_usd;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <button
        onClick={() => setShowTable(!showTable)}
        className="w-full flex items-center justify-between p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {showTable ? '▼' : '▶'}
          </span>
          <h3 className="text-xs font-semibold text-gray-700 whitespace-nowrap">
            원가율 변동 요약 (전년 USD → 당년 KRW)
          </h3>
        </div>
        <span className="text-[10px] text-gray-500 whitespace-nowrap">
          전년: 24.06.01~24.10.31 | 당년: 25.06.01~25.10.31
        </span>
      </button>

      {showTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1.5 text-left font-semibold text-[11px]">항목</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px]">전년</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px]">당년</th>
                <th className="border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px]">변동</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1.5 text-[11px]">원부자재+아트웍 원가율</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{materialArtwork24F.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{materialArtwork25F.toFixed(1)}%</td>
                <td className={`border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px] ${materialArtworkChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {materialArtworkChange > 0 ? '+' : ''}{materialArtworkChange.toFixed(1)}%p
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-1.5 text-[11px]">공임 원가율</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{total.laborRate24F_usd.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{total.laborRate25F_usd.toFixed(1)}%</td>
                <td className={`border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px] ${laborChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {laborChange > 0 ? '+' : ''}{laborChange.toFixed(1)}%p
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-1.5 text-[11px]">마진 원가율</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{total.marginRate24F_usd.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{total.marginRate25F_usd.toFixed(1)}%</td>
                <td className={`border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px] ${marginChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}%p
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-2 py-1.5 text-[11px]">경비 원가율</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{total.expenseRate24F_usd.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">{total.expenseRate25F_usd.toFixed(1)}%</td>
                <td className={`border border-gray-300 px-2 py-1.5 text-center font-semibold text-[11px] ${expenseChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-300 px-2 py-1.5 font-bold text-[11px]">USD 원가율 (합계)</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-[11px]">{total.costRate24F_usd.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-[11px]">{total.costRate25F_usd.toFixed(1)}%</td>
                <td className={`border border-gray-300 px-2 py-1.5 text-center font-bold text-[11px] ${realCostChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {realCostChange > 0 ? '+' : ''}{realCostChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="bg-orange-50">
                <td className="border border-gray-300 px-2 py-1.5 font-bold text-[11px]">환율 효과</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">-</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center text-[11px]">-</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-red-600 text-[11px]">
                  +{exchangeRateEffect.toFixed(1)}%p
                </td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-300 px-2 py-1.5 font-bold text-[11px]">KRW 원가율 (최종)</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-[11px]">{total.costRate24F_usd.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-[11px]">{total.costRate25F_krw.toFixed(1)}%</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-red-600 text-[11px]">
                  +{(total.costRate25F_krw - total.costRate24F_usd).toFixed(1)}%p
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CostRateSummaryTable;

