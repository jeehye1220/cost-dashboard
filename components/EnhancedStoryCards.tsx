'use client';

import React from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CATEGORIES } from '@/lib/csvParser';

interface EnhancedStoryCardsProps {
  summary: any;
}

const EnhancedStoryCards: React.FC<EnhancedStoryCardsProps> = ({ summary }) => {
  // 데이터가 없어도 카드는 표시 (기본값으로 표시)
  if (!summary || !summary.total) {
    return null; // 또는 기본 구조를 표시할 수도 있음
  }

  const { total, categories } = summary;
  
  // categories가 없으면 빈 배열로 처리
  const safeCategories = categories || [];

  // 시즌 판별
  const is25FW = total.qty24F > 3000000 && total.qty24F < 4000000;
  const isKIDS = total.qty24F > 600000 && total.qty24F < 700000;
  const isDISCOVERY = total.qty24F > 1200000 && total.qty24F < 1400000;
  const isNON = !is25FW && !isKIDS && !isDISCOVERY; // MLB NON 시즌
  const isFWSS = is25FW || isKIDS || isDISCOVERY; // FW/SS 시즌

  // 발주비중 계산 함수
  const calculateOrderShare = (catData: any) => {
    // 전체 발주TAG금액 계산
    const totalTagAmount25F = total.avgTag25F_usd * total.qty25F;
    const totalTagAmount24F = total.avgTag24F_usd * total.qty24F;
    
    // 카테고리별 발주TAG금액 계산
    const catTagAmount25F = catData.avgTag25F_usd * catData.qty25F;
    const catTagAmount24F = catData.avgTag24F_usd * catData.qty24F;
    
    // 발주비중 계산 (%)
    const orderShare25F = totalTagAmount25F > 0 ? (catTagAmount25F / totalTagAmount25F) * 100 : 0;
    const orderShare24F = totalTagAmount24F > 0 ? (catTagAmount24F / totalTagAmount24F) * 100 : 0;
    
    // 전년비 계산 (%)
    const orderShareYoY = orderShare24F > 0 ? (orderShare25F / orderShare24F) * 100 : 0;
    
    return {
      orderShare25F,
      orderShare24F,
      orderShareYoY
    };
  };

  // 전체 발주비중 계산 (100%)
  const totalOrderShare = {
    orderShare25F: 100,
    orderShare24F: 100,
    orderShareYoY: 100
  };

  // 카테고리 색상 및 이름 매핑 (MLB NON 시즌용)
  const getCategoryInfo = (categoryId: string) => {
    const categoryMap: Record<string, { name: string; color: string }> = {
      'Outer': { name: 'OUTER', color: '#3b82f6' },
      'Inner': { name: 'INNER', color: '#10b981' },
      'Bottom': { name: 'BOTTOM', color: '#f59e0b' },
      'Shoes': { name: 'SHOES', color: '#8b5cf6' },
      'Bag': { name: 'BAG', color: '#ec4899' },
      'Headwear': { name: 'HEADWEAR', color: '#f97316' },
      'Acc_etc': { name: 'ACC', color: '#ef4444' },
      'Wear_etc': { name: 'WEAR', color: '#f97316' },
    };
    return categoryMap[categoryId] || { name: categoryId.toUpperCase(), color: '#6b7280' };
  };

  // 카테고리 선택 로직
  const categoryData = (() => {
    let allCategoryData;
    
    if (isNON) {
      // MLB NON 시즌: summary.categories에서 직접 가져오기
      allCategoryData = safeCategories.map((categoryData: any) => {
        const catId = categoryData.category;
        const info = getCategoryInfo(catId);
        return {
          id: catId,
          name: info.name,
          color: info.color,
          data: categoryData,
        };
      }).filter((cat: any) => cat.data !== null);
    } else {
      // FW/SS 시즌: CATEGORIES 사용
      allCategoryData = CATEGORIES.map(cat => {
        const data = safeCategories.find((c: any) => c.category === cat.id);
        return {
          ...cat,
          data: data || null,
        };
      }).filter((cat: any) => cat.data !== null);
    }

    if (isFWSS) {
      // FW/SS 시즌: Outer, Inner, Bottom 무조건 표시 + (Wear_etc 있으면 Wear_etc, 없으면 Acc_etc)
      const requiredCategories = ['Outer', 'Inner', 'Bottom'];
      const selected = allCategoryData.filter((cat: any) => requiredCategories.includes(cat.id));

      // 4번째 카드: Wear_etc 있으면 Wear_etc, 없으면 Acc_etc
      const wearEtc = allCategoryData.find((cat: any) => cat.id === 'Wear_etc');
      const accEtc = allCategoryData.find((cat: any) => cat.id === 'Acc_etc');
      const etcCategory = wearEtc || accEtc;
      
      if (etcCategory) {
        selected.push(etcCategory);
      }

      return selected;
    } else {
      // NON 시즌: ETC를 제외한 상위 4개 중분류 + ACC_ETC 표시
      const sortedByQty = [...allCategoryData].sort((a, b) => {
        const qtyA = a.data?.qty25F || 0;
        const qtyB = b.data?.qty25F || 0;
        return qtyB - qtyA; // 내림차순
      });

      // ETC 카테고리 제외 (Wear_etc만 제외, Acc_etc는 포함)
      const nonEtcCategories = sortedByQty.filter((cat: any) => {
        // Wear_etc만 ETC로 간주하여 제외
        return cat.id !== 'Wear_etc';
      });

      // ETC 제외한 상위 4개 선택
      const top4 = nonEtcCategories.filter((cat: any) => cat.id !== 'Acc_etc').slice(0, 4);
      
      // ACC_ETC 추가
      const accEtc = allCategoryData.find((cat: any) => cat.id === 'Acc_etc');
      if (accEtc) {
        top4.push(accEtc);
      }

      return top4;
    }
  })();

  // 변동 표시 컴포넌트 (원가율용: 상승=빨강, 하락=파랑)
  const ChangeIndicator = ({ value, suffix = '%p' }: { value: number; suffix?: string }) => {
    const isNegative = value < 0;
    
    return (
      <div className="flex items-center gap-0.5">
        {isNegative ? (
          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
        ) : (
          <ArrowUp className="w-3.5 h-3.5 text-red-600" />
        )}
        <span className={`text-sm font-bold ${isNegative ? 'text-blue-600' : 'text-red-600'}`}>
          {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">원가율 카드 대시보드</h2>
      
      {/* 섹션 1: 전체 및 카테고리별 원가율 (USD) */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-lg font-bold text-gray-700 mb-6">원가율 (USD 기준)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* 전체 카드 */}
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="text-xs font-semibold opacity-90 mb-2">전체 (USD)</div>
            <div className="text-3xl font-extrabold mb-3">{total.costRate25F_usd.toFixed(1)}%</div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/30">
              <span className="text-xs opacity-80">전년 대비</span>
              <ChangeIndicator value={total.costRateChange_usd} />
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="opacity-80">생산수량</span>
                <span className="font-bold">{Math.round(total.qty25F / 1000).toLocaleString()}K ({total.qtyYoY?.toFixed(0) || '0'}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-80">발주비중</span>
                <span className="font-bold">{totalOrderShare.orderShare25F.toFixed(0)}% ({totalOrderShare.orderShareYoY.toFixed(0)}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-80">TAG YOY</span>
                <span className="font-bold">{total.tagYoY_usd.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-80">원가 YOY</span>
                <span className="font-bold">{total.costYoY_usd.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* 카테고리별 카드 */}
          {categoryData.map((cat: any) => {
            const orderShare = calculateOrderShare(cat.data);
            return (
              <div
                key={cat.id}
                className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all hover:scale-105 hover:border-gray-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-1 h-8 rounded-full shadow-md" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="text-xs font-bold text-gray-700">{cat.name} (USD)</div>
                </div>
                <div className="text-3xl font-extrabold mb-3" style={{ color: cat.color }}>
                  {cat.data.costRate25F_usd.toFixed(1)}%
                </div>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">전년 대비</span>
                  <ChangeIndicator value={cat.data.costRateChange_usd} />
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">생산수량</span>
                    <span className="font-bold text-gray-800">
                      {cat.data.qty25F ? `${Math.round(cat.data.qty25F / 1000).toLocaleString()}K (${cat.data.qtyYoY?.toFixed(0) || '0'}%)` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">발주비중</span>
                    <span className="font-bold text-gray-800">
                      {orderShare.orderShare25F.toFixed(0)}% ({orderShare.orderShareYoY.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">TAG YOY</span>
                    <span className="font-bold text-gray-800">
                      {cat.data.tagYoY_usd.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">원가 YOY</span>
                    <span className="font-bold text-gray-800">
                      {cat.data.costYoY_usd.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 2: 전체 및 카테고리별 평균단가 증감 (USD) */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-lg font-bold text-gray-700 mb-6">평균단가 (USD 기준)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* 전체 평균단가 */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="text-xs font-semibold opacity-90 mb-1.5">전체 평균단가</div>
            <div className="text-2xl font-extrabold mb-1.5">${total.avgCost25F_usd.toFixed(2)}</div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs opacity-80">전년 대비</span>
              <div className="flex items-center gap-1">
                {(total.avgCost25F_usd - total.avgCost24F_usd) < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5 text-blue-300" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5 text-red-300" />
                )}
                <span className={`text-xs font-bold ${(total.avgCost25F_usd - total.avgCost24F_usd) < 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {(() => {
                    const change = total.avgCost25F_usd - total.avgCost24F_usd;
                    return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                  })()}
                </span>
              </div>
            </div>
            
            <div className="space-y-1.5 text-xs border-t border-white/30 pt-3 mt-3">
              {/* 헤더 */}
              <div className="flex items-center gap-2 opacity-80 pb-1 border-b border-white/20">
                <span className="w-14 text-left"></span>
                <span className="flex-1 text-right text-xs">전년</span>
                <span className="flex-1 text-right text-xs">당년</span>
                <span className="w-14 text-right text-xs">차이</span>
              </div>
              
              {/* 원부자재 */}
              <div className="flex items-center gap-2 opacity-90">
                <span className="opacity-80 w-14 text-left">원부자재:</span>
                <span className="flex-1 text-right">${total.material24F_usd.toFixed(2)}</span>
                <span className="flex-1 text-right">${total.material25F_usd.toFixed(2)}</span>
                <span className={`font-bold w-14 text-right ${(total.material25F_usd - total.material24F_usd) < 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {(() => {
                    const change = total.material25F_usd - total.material24F_usd;
                    return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                  })()}
                </span>
              </div>
              
              {/* 아트웍 */}
              <div className="flex items-center gap-2 opacity-90">
                <span className="opacity-80 w-14 text-left">아트웍:</span>
                <span className="flex-1 text-right">${total.artwork24F_usd.toFixed(2)}</span>
                <span className="flex-1 text-right">${total.artwork25F_usd.toFixed(2)}</span>
                <span className={`font-bold w-14 text-right ${(total.artwork25F_usd - total.artwork24F_usd) < 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {(() => {
                    const change = total.artwork25F_usd - total.artwork24F_usd;
                    return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                  })()}
                </span>
              </div>
              
              {/* 공임 */}
              <div className="flex items-center gap-2 opacity-90">
                <span className="opacity-80 w-14 text-left">공임:</span>
                <span className="flex-1 text-right">${total.labor24F_usd.toFixed(2)}</span>
                <span className="flex-1 text-right">${total.labor25F_usd.toFixed(2)}</span>
                <span className={`font-bold w-14 text-right ${(total.labor25F_usd - total.labor24F_usd) < 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {(() => {
                    const change = total.labor25F_usd - total.labor24F_usd;
                    return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                  })()}
                </span>
              </div>
              
              {/* 마진 */}
              <div className="flex items-center gap-2 opacity-90">
                <span className="opacity-80 w-14 text-left">마진:</span>
                <span className="flex-1 text-right">${total.margin24F_usd.toFixed(2)}</span>
                <span className="flex-1 text-right">${total.margin25F_usd.toFixed(2)}</span>
                <span className={`font-bold w-14 text-right ${(total.margin25F_usd - total.margin24F_usd) < 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {(() => {
                    const change = total.margin25F_usd - total.margin24F_usd;
                    return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                  })()}
                </span>
              </div>
              
              {/* 경비 */}
              <div className="flex items-center gap-2 opacity-90">
                <span className="opacity-80 w-14 text-left">경비:</span>
                <span className="flex-1 text-right">${total.expense24F_usd.toFixed(2)}</span>
                <span className="flex-1 text-right">${total.expense25F_usd.toFixed(2)}</span>
                <span className={`font-bold w-14 text-right ${(total.expense25F_usd - total.expense24F_usd) < 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  {(() => {
                    const change = total.expense25F_usd - total.expense24F_usd;
                    return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* 카테고리별 평균단가 */}
          {categoryData.map((cat: any) => {
            return (
              <div
                key={`avg-${cat.id}`}
                className="bg-white rounded-xl p-7 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-all hover:scale-105 hover:border-gray-300"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div 
                    className="w-1 h-6 rounded-full shadow-md" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="text-xs font-bold text-gray-700">{cat.name} 평균단가</div>
                </div>
                <div className="text-2xl font-extrabold mb-1.5" style={{ color: cat.color }}>
                  ${cat.data.avgCost25F_usd.toFixed(2)}
                </div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs text-gray-500">전년 대비</span>
                  <div className="flex items-center gap-1">
                    {(cat.data.avgCost25F_usd - cat.data.avgCost24F_usd) < 0 ? (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span className={`text-xs font-bold ${(cat.data.avgCost25F_usd - cat.data.avgCost24F_usd) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {(() => {
                        const change = cat.data.avgCost25F_usd - cat.data.avgCost24F_usd;
                        return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5 text-xs border-t border-gray-200 pt-3 mt-3">
                  {/* 헤더 */}
                  <div className="flex items-center gap-2 text-gray-500 pb-1 border-b border-gray-200">
                    <span className="w-14 text-left"></span>
                    <span className="flex-1 text-right text-xs font-medium">전년</span>
                    <span className="flex-1 text-right text-xs font-medium">당년</span>
                    <span className="w-14 text-right text-xs font-medium">차이</span>
                  </div>
                  
                  {/* 원부자재 */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-600 w-14 text-left">원부자재:</span>
                    <span className="flex-1 text-right">${cat.data.material24F_usd.toFixed(2)}</span>
                    <span className="flex-1 text-right">${cat.data.material25F_usd.toFixed(2)}</span>
                    <span className={`font-bold w-14 text-right ${(cat.data.material25F_usd - cat.data.material24F_usd) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {(() => {
                        const change = cat.data.material25F_usd - cat.data.material24F_usd;
                        return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                  
                  {/* 아트웍 */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-600 w-14 text-left">아트웍:</span>
                    <span className="flex-1 text-right">${cat.data.artwork24F_usd.toFixed(2)}</span>
                    <span className="flex-1 text-right">${cat.data.artwork25F_usd.toFixed(2)}</span>
                    <span className={`font-bold w-14 text-right ${(cat.data.artwork25F_usd - cat.data.artwork24F_usd) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {(() => {
                        const change = cat.data.artwork25F_usd - cat.data.artwork24F_usd;
                        return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                  
                  {/* 공임 */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-600 w-14 text-left">공임:</span>
                    <span className="flex-1 text-right">${cat.data.labor24F_usd.toFixed(2)}</span>
                    <span className="flex-1 text-right">${cat.data.labor25F_usd.toFixed(2)}</span>
                    <span className={`font-bold w-14 text-right ${(cat.data.labor25F_usd - cat.data.labor24F_usd) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {(() => {
                        const change = cat.data.labor25F_usd - cat.data.labor24F_usd;
                        return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                  
                  {/* 마진 */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-600 w-14 text-left">마진:</span>
                    <span className="flex-1 text-right">${cat.data.margin24F_usd.toFixed(2)}</span>
                    <span className="flex-1 text-right">${cat.data.margin25F_usd.toFixed(2)}</span>
                    <span className={`font-bold w-14 text-right ${(cat.data.margin25F_usd - cat.data.margin24F_usd) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {(() => {
                        const change = cat.data.margin25F_usd - cat.data.margin24F_usd;
                        return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                  
                  {/* 경비 */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-600 w-14 text-left">경비:</span>
                    <span className="flex-1 text-right">${cat.data.expense24F_usd.toFixed(2)}</span>
                    <span className="flex-1 text-right">${cat.data.expense25F_usd.toFixed(2)}</span>
                    <span className={`font-bold w-14 text-right ${(cat.data.expense25F_usd - cat.data.expense24F_usd) < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {(() => {
                        const change = cat.data.expense25F_usd - cat.data.expense24F_usd;
                        return change < 0 ? `-$${Math.abs(change).toFixed(2)}` : `+$${change.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 3: 전체 및 카테고리별 원가율 (KRW) */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-lg font-bold text-gray-700 mb-6">원가율 (KRW 기준)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* 전체 KRW 카드 */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="text-xs font-semibold opacity-90 mb-2">전체 (KRW)</div>
            <div className="text-3xl font-extrabold mb-3">{total.costRate25F_krw.toFixed(1)}%</div>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/30">
              <span className="text-xs opacity-80">전년 대비</span>
              <div className="flex items-center gap-0.5">
                {total.costRateChange_krw < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" />
                )}
                <span className="text-sm font-extrabold">
                  {total.costRateChange_krw > 0 ? '+' : ''}{total.costRateChange_krw.toFixed(1)}%p
                </span>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="opacity-80">생산수량</span>
                <span className="font-bold">{Math.round(total.qty25F / 1000).toLocaleString()}K ({total.qtyYoY?.toFixed(0) || '0'}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-80">TAG YOY</span>
                <span className="font-bold">{total.tagYoY_krw.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="opacity-80">원가 YOY</span>
                <span className="font-bold">{total.costYoY_krw.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* 카테고리별 KRW 카드 */}
          {categoryData.map((cat: any) => {
            return (
              <div
                key={`krw-${cat.id}`}
                className="bg-white rounded-lg p-5 shadow-md border border-gray-200 hover:shadow-lg transition-all hover:border-gray-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-1 h-8 rounded-full" 
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="text-xs font-semibold text-gray-600">{cat.name} (KRW)</div>
                </div>
                <div className="text-3xl font-bold mb-3" style={{ color: cat.color }}>
                  {cat.data.costRate25F_krw.toFixed(1)}%
                </div>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                  <span className="text-xs text-gray-500">전년 대비</span>
                  <div className="flex items-center gap-0.5">
                    {cat.data.costRateChange_krw < 0 ? (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span className={`text-sm font-bold ${cat.data.costRateChange_krw < 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {cat.data.costRateChange_krw > 0 ? '+' : ''}{cat.data.costRateChange_krw.toFixed(1)}%p
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">TAG YOY</span>
                    <span className="font-bold text-gray-800">
                      {cat.data.tagYoY_krw.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">원가 YOY</span>
                    <span className="font-bold text-gray-800">
                      {cat.data.costYoY_krw.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EnhancedStoryCards;

