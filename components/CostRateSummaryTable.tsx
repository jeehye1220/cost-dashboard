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

  // 시즌 판별 (수량 범위로 구분)
  const is25FW = total.qty24F > 3000000 && total.qty24F < 4000000;
  const isKIDS = total.qty24F > 600000 && total.qty24F < 700000;
  const isDISCOVERY = total.qty24F > 1200000 && total.qty24F < 1400000;
  const isNON = !is25FW && !isKIDS && !isDISCOVERY; // MLB NON 시즌

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
    <div className="bg-gradient-to-br from-blue-50/50 via-white to-pink-50/50 rounded-xl shadow-md border border-blue-100 p-5">
      <button
        onClick={() => setShowTable(!showTable)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg transition-all border border-blue-200 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="text-base text-blue-600 font-bold">
            {showTable ? '▼' : '▶'}
          </span>
          <h3 className="text-sm font-bold text-gray-800 whitespace-nowrap">
            원가율 변동 요약 (전년 USD → 당년 KRW)
          </h3>
        </div>
      </button>

      {showTable && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <th className="border-r border-gray-200 px-4 py-3 text-left font-semibold text-gray-800">항목</th>
                <th className="border-r border-gray-200 px-4 py-3 text-center font-semibold text-gray-800">전년</th>
                <th className="border-r border-gray-200 px-4 py-3 text-center font-semibold text-gray-800">당년</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-800">변동</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-200">
                <td className="border-r border-gray-200 px-4 py-2.5 text-gray-700">원부자재+아트웍 원가율</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right text-gray-700">{materialArtwork24F.toFixed(1)}%</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right font-semibold text-gray-900">{materialArtwork25F.toFixed(1)}%</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${materialArtworkChange < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {materialArtworkChange > 0 ? '+' : ''}{materialArtworkChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-200">
                <td className="border-r border-gray-200 px-4 py-2.5 text-gray-700">공임 원가율</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right text-gray-700">{total.laborRate24F_usd.toFixed(1)}%</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right font-semibold text-gray-900">{total.laborRate25F_usd.toFixed(1)}%</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${laborChange < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {laborChange > 0 ? '+' : ''}{laborChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-200">
                <td className="border-r border-gray-200 px-4 py-2.5 text-gray-700">마진 원가율</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right text-gray-700">{total.marginRate24F_usd.toFixed(1)}%</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right font-semibold text-gray-900">{total.marginRate25F_usd.toFixed(1)}%</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${marginChange < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-200">
                <td className="border-r border-gray-200 px-4 py-2.5 text-gray-700">경비 원가율</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right text-gray-700">{total.expenseRate24F_usd.toFixed(1)}%</td>
                <td className="border-r border-gray-200 px-4 py-2.5 text-right font-semibold text-gray-900">{total.expenseRate25F_usd.toFixed(1)}%</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${expenseChange < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="bg-blue-50/70 border-b-2 border-blue-200">
                <td className="border-r border-gray-200 px-4 py-3 font-bold text-gray-900">USD 원가율 (합계)</td>
                <td className="border-r border-gray-200 px-4 py-3 text-right font-bold text-gray-900">{total.costRate24F_usd.toFixed(1)}%</td>
                <td className="border-r border-gray-200 px-4 py-3 text-right font-bold text-gray-900">{total.costRate25F_usd.toFixed(1)}%</td>
                <td className={`px-4 py-3 text-right font-bold ${realCostChange < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {realCostChange > 0 ? '+' : ''}{realCostChange.toFixed(1)}%p
                </td>
              </tr>
              <tr className="bg-orange-50/70 border-b-2 border-orange-200">
                <td className="border-r border-gray-200 px-4 py-3 font-bold text-gray-900">환율 효과</td>
                <td className="border-r border-gray-200 px-4 py-3 text-right text-gray-500">-</td>
                <td className="border-r border-gray-200 px-4 py-3 text-right text-gray-500">-</td>
                <td className={`px-4 py-3 text-right font-bold ${exchangeRateEffect > 0 ? 'text-red-600' : exchangeRateEffect < 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {exchangeRateEffect > 0 ? '+' : ''}{exchangeRateEffect.toFixed(1)}%p
                </td>
              </tr>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <td className="border-r border-gray-200 px-4 py-3 font-bold text-gray-900">KRW 원가율 (최종)</td>
                <td className="border-r border-gray-200 px-4 py-3 text-right font-bold text-gray-900">{total.costRate24F_usd.toFixed(1)}%</td>
                <td className="border-r border-gray-200 px-4 py-3 text-right font-bold text-gray-900">{total.costRate25F_krw.toFixed(1)}%</td>
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  +{(total.costRate25F_krw - total.costRate24F_usd).toFixed(1)}%p
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* 설명 섹션 */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50/80 via-white to-pink-50/80 rounded-xl p-5 space-y-4 border border-blue-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="text-blue-600 text-sm font-bold">📦</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-800">원부자재 = </span>
                  <span className="text-sm text-gray-600">원자재 + 부자재 + 본사공급자재 + 택/라벨</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 shadow-sm">
                  <span className="text-blue-600 text-sm font-bold">📊</span>
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-800">원가율 = </span>
                  <span className="text-sm text-gray-600">(평균원가 ÷ (평균TAG / 1.1)) × 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostRateSummaryTable;

