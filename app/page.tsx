'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { loadSummaryData, loadExchangeRates } from '@/lib/csvParser';

const brands = [
  {
    id: '25FW',
    name: 'MLB 25FW',
    icon: 'MLB',
    color: 'blue',
    bgColor: 'bg-blue-200',
    hoverColor: 'hover:bg-blue-300',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    iconBg: 'bg-blue-300',
    buttonBg: 'bg-blue-300',
    buttonHover: 'hover:bg-blue-400',
  },
  {
    id: 'NON',
    name: 'MLB ACC',
    icon: 'MLB',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: 'KIDS',
    name: 'MLB KIDS',
    icon: 'MK',
    color: 'red',
    bgColor: 'bg-rose-200',
    hoverColor: 'hover:bg-rose-300',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    iconBg: 'bg-rose-300',
    buttonBg: 'bg-rose-300',
    buttonHover: 'hover:bg-rose-400',
  },
  {
    id: 'DISCOVERY',
    name: 'DISCOVERY',
    icon: 'DX',
    color: 'green',
    bgColor: 'bg-emerald-200',
    hoverColor: 'hover:bg-emerald-300',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-300',
    buttonBg: 'bg-emerald-300',
    buttonHover: 'hover:bg-emerald-400',
  },
];

interface BrandSummary {
  costRate25F_usd: number;
  costRateChange_usd: number;
  qty25F: number;
  qtyYoY: number;
  avgTag25F_krw: number;
  tagYoY_krw: number;
  avgCost25F_usd: number;
  costYoY_usd: number;
  // 환율 정보
  fxPrev: number;
  fxCurr: number;
  // 상세 원가 항목
  material24F_usd: number;
  material25F_usd: number;
  artwork24F_usd: number;
  artwork25F_usd: number;
  labor24F_usd: number;
  labor25F_usd: number;
  margin24F_usd: number;
  margin25F_usd: number;
  expense24F_usd: number;
  expense25F_usd: number;
  // 원가율 데이터 (레이더 차트용)
  materialRate24F_usd: number;
  materialRate25F_usd: number;
  artworkRate24F_usd: number;
  artworkRate25F_usd: number;
  laborRate24F_usd: number;
  laborRate25F_usd: number;
  marginRate24F_usd: number;
  marginRate25F_usd: number;
  expenseRate24F_usd: number;
  expenseRate25F_usd: number;
}

export default function Home() {
  const router = useRouter();
  const [selectedDate] = useState('25FW기간 (25.09~26.02)');
  const [brandSummaries, setBrandSummaries] = useState<Record<string, BrandSummary | null>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCostItems, setExpandedCostItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadAllSummaries = async () => {
      const summaries: Record<string, BrandSummary | null> = {};
      
      // 각 브랜드별 summary 파일 및 FX 파일 매핑
      const brandFiles = {
        '25FW': { summary: 'summary_25fw.json', fx: 'FX FW.csv' },
        'NON': { summary: 'summary.json', fx: 'FX 251111.csv' },
        'KIDS': { summary: 'summary_kids.json', fx: 'MLB KIDS FX FW.csv' },
        'DISCOVERY': { summary: 'summary_discovery.json', fx: 'DX FX FW.csv' },
      };

      for (const [brandId, files] of Object.entries(brandFiles)) {
        try {
          const data = await loadSummaryData(files.summary);
          const fxRates = await loadExchangeRates(files.fx);
          
          if (data && data.total) {
            summaries[brandId] = {
              costRate25F_usd: data.total.costRate25F_usd || 0,
              costRateChange_usd: data.total.costRateChange_usd || 0,
              qty25F: data.total.qty25F || 0,
              qtyYoY: data.total.qtyYoY || 0,
              avgTag25F_krw: data.total.avgTag25F_krw || 0,
              tagYoY_krw: data.total.tagYoY_krw || 0,
              avgCost25F_usd: data.total.avgCost25F_usd || 0,
              costYoY_usd: data.total.costYoY_usd || 0,
              // 환율 정보
              fxPrev: fxRates.prev,
              fxCurr: fxRates.curr,
              // 상세 원가 항목
              material24F_usd: data.total.material24F_usd || 0,
              material25F_usd: data.total.material25F_usd || 0,
              artwork24F_usd: data.total.artwork24F_usd || 0,
              artwork25F_usd: data.total.artwork25F_usd || 0,
              labor24F_usd: data.total.labor24F_usd || 0,
              labor25F_usd: data.total.labor25F_usd || 0,
              margin24F_usd: data.total.margin24F_usd || 0,
              margin25F_usd: data.total.margin25F_usd || 0,
              expense24F_usd: data.total.expense24F_usd || 0,
              expense25F_usd: data.total.expense25F_usd || 0,
              // 원가율 데이터 (레이더 차트용)
              materialRate24F_usd: data.total.materialRate24F_usd || 0,
              materialRate25F_usd: data.total.materialRate25F_usd || 0,
              artworkRate24F_usd: data.total.artworkRate24F_usd || 0,
              artworkRate25F_usd: data.total.artworkRate25F_usd || 0,
              laborRate24F_usd: data.total.laborRate24F_usd || 0,
              laborRate25F_usd: data.total.laborRate25F_usd || 0,
              marginRate24F_usd: data.total.marginRate24F_usd || 0,
              marginRate25F_usd: data.total.marginRate25F_usd || 0,
              expenseRate24F_usd: data.total.expenseRate24F_usd || 0,
              expenseRate25F_usd: data.total.expenseRate25F_usd || 0,
            };
          } else {
            summaries[brandId] = null;
          }
        } catch (error) {
          console.error(`Failed to load summary for ${brandId}:`, error);
          summaries[brandId] = null;
        }
      }
      
      setBrandSummaries(summaries);
      setLoading(false);
    };

    loadAllSummaries();
  }, []);

  const handleBrandClick = (brandId: string) => {
    try {
      console.log('Navigating to:', `/dashboard/${brandId}`);
      router.push(`/dashboard/${brandId}`);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const toggleCostDetails = (brandId: string) => {
    const newExpanded = new Set(expandedCostItems);
    if (newExpanded.has(brandId)) {
      newExpanded.delete(brandId);
    } else {
      newExpanded.add(brandId);
    }
    setExpandedCostItems(newExpanded);
  };

  // 숫자 포맷팅 함수
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatQty = (qty: number): string => {
    if (qty >= 1000) {
      const kValue = (qty / 1000).toFixed(0);
      return `${parseInt(kValue).toLocaleString('en-US')}K`;
    }
    return `${qty.toLocaleString('en-US')}K`;
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 - 카드 형태 */}
      <div className="w-full pt-8 pb-6 px-12">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-blue-200 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-blue-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">F&F 원가 분석 대시보드</h1>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="w-full pb-12">
        <div className="flex items-start justify-between mb-8 px-12">
          {/* 브랜드 선택 섹션 */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">브랜드 선택</h2>
            <p className="text-gray-600 text-sm">분석할 브랜드를 클릭하여 상세 대시보드로 이동합니다</p>
          </div>

          {/* 날짜 선택 및 브랜드 개수 */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
              <Calendar className="w-4 h-4" />
              <span>{selectedDate}</span>
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              {brands.length}개 브랜드
            </button>
          </div>
        </div>

        {/* 브랜드 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-12">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
            >
              {/* 카드 헤더 */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${brand.iconBg} rounded-lg flex items-center justify-center ${brand.textColor} text-sm font-bold shadow-sm`}>
                      {brand.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{brand.name}</h3>
                  </div>
                  {brandSummaries[brand.id] && (
                    <div className="flex flex-col items-end">
                      <div className="text-xs text-gray-500 mb-2">전체원가율(USD)</div>
                      <div className={`px-3 py-2 rounded-lg shadow-sm ${brandSummaries[brand.id]!.costRateChange_usd >= 0 ? 'bg-rose-50' : 'bg-blue-50'}`}>
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="text-xl font-bold text-gray-800">
                            {formatNumber(brandSummaries[brand.id]!.costRate25F_usd)}%
                          </div>
                          <div className={`text-sm font-semibold ${brandSummaries[brand.id]!.costRateChange_usd >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {brandSummaries[brand.id]!.costRateChange_usd >= 0 ? '+' : ''}{formatNumber(brandSummaries[brand.id]!.costRateChange_usd)}%p
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {brandSummaries[brand.id] && (
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      brandSummaries[brand.id]!.qtyYoY > 100 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'bg-rose-50 text-rose-600'
                    }`}>
                      총생산수량 YOY {Math.round(brandSummaries[brand.id]!.qtyYoY)}%
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${
                      brandSummaries[brand.id]!.tagYoY_krw > 100 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'bg-rose-50 text-rose-600'
                    }`}>
                      평균TAG YOY {Math.round(brandSummaries[brand.id]!.tagYoY_krw)}%
                    </span>
                  </div>
                )}
              </div>

              {/* 카드 본문 */}
              <div className="p-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto"></div>
                  </div>
                ) : brandSummaries[brand.id] ? (
                  <div className="mb-4">
                    {/* 주요 지표 그리드 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">총 생산수량</div>
                        <div className="text-base font-bold text-gray-800">
                          {formatQty(brandSummaries[brand.id]!.qty25F)}
                          <span className="ml-2 text-sm text-gray-600">
                            ({Math.round(brandSummaries[brand.id]!.qtyYoY)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">평균TAG (KRW)</div>
                        <div className="text-base font-bold text-gray-800">
                          {brandSummaries[brand.id]!.avgTag25F_krw.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-end gap-4">
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">평균원가(USD)</div>
                            <div className="text-base font-bold text-gray-800">
                              {formatCurrency(brandSummaries[brand.id]!.avgCost25F_usd)}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-1">환율</div>
                            <div className="text-base font-bold text-gray-800">
                              {brandSummaries[brand.id]!.fxPrev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} → {brandSummaries[brand.id]!.fxCurr.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 원가 상세보기 */}
                    <div className="border-t border-gray-200 pt-3">
                      <button
                        onClick={() => toggleCostDetails(brand.id)}
                        className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg px-2 py-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 font-semibold">원가 상세보기</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">USD 기준</span>
                        </div>
                        {expandedCostItems.has(brand.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      
                      {/* 상세 원가 항목 */}
                      {expandedCostItems.has(brand.id) && (
                        <div className="mt-3 space-y-2">
                          {[
                            { name: '원부자재', prev: brandSummaries[brand.id]!.material24F_usd, curr: brandSummaries[brand.id]!.material25F_usd, icon: '📦' },
                            { name: '아트웍', prev: brandSummaries[brand.id]!.artwork24F_usd, curr: brandSummaries[brand.id]!.artwork25F_usd, icon: '🎨' },
                            { name: '공임', prev: brandSummaries[brand.id]!.labor24F_usd, curr: brandSummaries[brand.id]!.labor25F_usd, icon: '👷' },
                            { name: '정상마진', prev: brandSummaries[brand.id]!.margin24F_usd, curr: brandSummaries[brand.id]!.margin25F_usd, icon: '💰' },
                            { name: '경비', prev: brandSummaries[brand.id]!.expense24F_usd, curr: brandSummaries[brand.id]!.expense25F_usd, icon: '📊' },
                          ].map((item) => {
                            const change = item.curr - item.prev;
                            const yoy = item.prev > 0 ? (item.curr / item.prev) * 100 : 0;
                            return (
                              <div 
                                key={item.name} 
                                className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-3 border border-gray-200 hover:shadow-md transition-all hover:border-gray-300"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{item.icon}</span>
                                    <span className="text-sm text-gray-700 font-semibold">{item.name}</span>
                                  </div>
                                  <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    change >= 0 
                                      ? 'bg-red-50 text-red-600' 
                                      : 'bg-blue-50 text-blue-600'
                                  }`}>
                                    {change >= 0 ? '+' : ''}${formatNumber(change, 2)}
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="font-medium">전년</span>
                                    <span className="text-gray-500">${formatNumber(item.prev, 2)}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="font-medium">당년</span>
                                    <span className="text-gray-800 font-semibold">${formatNumber(item.curr, 2)}</span>
                                  </div>
                                  <span className={`text-xs font-semibold ${
                                    change >= 0 ? 'text-red-600' : 'text-blue-600'
                                  }`}>
                                    ({formatNumber(yoy, 1)}%)
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    데이터를 불러올 수 없습니다
                  </div>
                )}

                {/* 전체 대시보드 보기 버튼 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBrandClick(brand.id);
                  }}
                  className={`w-full mt-4 ${brand.buttonBg} ${brand.buttonHover} ${brand.textColor} font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md`}
                >
                  전체 대시보드 보기
                </button>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="w-full">
          <div className="text-center text-sm text-gray-400">
            <p>© 2025 F&F. All rights reserved. | Version 1.4.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
