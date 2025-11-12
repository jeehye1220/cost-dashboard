'use client';

import React from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { CATEGORIES } from '@/lib/csvParser';

interface EnhancedStoryCardsProps {
  summary: any;
}

const EnhancedStoryCards: React.FC<EnhancedStoryCardsProps> = ({ summary }) => {
  if (!summary || !summary.total || !summary.categories) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total, categories } = summary;

  // 실제 데이터가 있는 카테고리만 필터링
  const categoryData = CATEGORIES.map(cat => {
    const data = categories.find((c: any) => c.category === cat.id);
    return {
      ...cat,
      data: data || null,
    };
  }).filter(cat => cat.data !== null);

  // 변동 표시 컴포넌트
  const ChangeIndicator = ({ value, suffix = '%p' }: { value: number; suffix?: string }) => {
    const isNegative = value < 0;
    
    return (
      <div className="flex items-center gap-0.5">
        {isNegative ? (
          <ArrowDown className="w-3.5 h-3.5 text-green-600" />
        ) : (
          <ArrowUp className="w-3.5 h-3.5 text-red-600" />
        )}
        <span className={`text-sm font-bold ${isNegative ? 'text-green-600' : 'text-red-600'}`}>
          {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
        </span>
      </div>
    );
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">원가율 카드 대시보드</h2>
      
      {/* 섹션 1: 전체 및 카테고리별 원가율 (USD) */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
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
                <span className="font-bold">{(total.qty25F / 1000000).toFixed(1)}M ({total.qtyYoY?.toFixed(1) || '0'}%)</span>
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
          {categoryData.map((cat) => {
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
                      {cat.data.qty25F ? `${(cat.data.qty25F / 1000000).toFixed(1)}M (${cat.data.qtyYoY?.toFixed(1) || '0'}%)` : '-'}
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
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
        <h3 className="text-lg font-bold text-gray-700 mb-6">평균단가 (USD 기준)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {/* 전체 평균단가 */}
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <div className="text-xs font-semibold opacity-90 mb-1.5">전체 평균단가</div>
            <div className="text-2xl font-extrabold mb-1.5">${total.avgCost25F_usd.toFixed(2)}</div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] opacity-80">전년 대비</span>
              <div className="flex items-center gap-1">
                {(total.avgCost25F_usd - total.avgCost24F_usd) < 0 ? (
                  <ArrowDown className="w-3 h-3 text-green-300" />
                ) : (
                  <ArrowUp className="w-3 h-3 text-red-300" />
                )}
                <span className={`text-[10px] font-bold ${(total.avgCost25F_usd - total.avgCost24F_usd) < 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {(total.avgCost25F_usd - total.avgCost24F_usd) > 0 ? '+' : ''}${(total.avgCost25F_usd - total.avgCost24F_usd).toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="space-y-1.5 text-[10px] border-t border-white/30 pt-3 mt-3">
              {/* 원부자재 */}
              <div>
                <div className="opacity-80 mb-0.5">원부자재</div>
                <div className="flex justify-between items-center text-[9px] opacity-90">
                  <span>${total.material24F_usd.toFixed(2)} → ${total.material25F_usd.toFixed(2)}</span>
                  <span className={`font-bold ${(total.material25F_usd - total.material24F_usd) < 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {(total.material25F_usd - total.material24F_usd) > 0 ? '+' : ''}${(total.material25F_usd - total.material24F_usd).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* 아트웍 */}
              <div>
                <div className="opacity-80 mb-0.5">아트웍</div>
                <div className="flex justify-between items-center text-[9px] opacity-90">
                  <span>${total.artwork24F_usd.toFixed(2)} → ${total.artwork25F_usd.toFixed(2)}</span>
                  <span className={`font-bold ${(total.artwork25F_usd - total.artwork24F_usd) < 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {(total.artwork25F_usd - total.artwork24F_usd) > 0 ? '+' : ''}${(total.artwork25F_usd - total.artwork24F_usd).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* 공임 */}
              <div>
                <div className="opacity-80 mb-0.5">공임</div>
                <div className="flex justify-between items-center text-[9px] opacity-90">
                  <span>${total.labor24F_usd.toFixed(2)} → ${total.labor25F_usd.toFixed(2)}</span>
                  <span className={`font-bold ${(total.labor25F_usd - total.labor24F_usd) < 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {(total.labor25F_usd - total.labor24F_usd) > 0 ? '+' : ''}${(total.labor25F_usd - total.labor24F_usd).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* 마진 */}
              <div>
                <div className="opacity-80 mb-0.5">마진</div>
                <div className="flex justify-between items-center text-[9px] opacity-90">
                  <span>${total.margin24F_usd.toFixed(2)} → ${total.margin25F_usd.toFixed(2)}</span>
                  <span className={`font-bold ${(total.margin25F_usd - total.margin24F_usd) < 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {(total.margin25F_usd - total.margin24F_usd) > 0 ? '+' : ''}${(total.margin25F_usd - total.margin24F_usd).toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* 경비 */}
              <div>
                <div className="opacity-80 mb-0.5">경비</div>
                <div className="flex justify-between items-center text-[9px] opacity-90">
                  <span>${total.expense24F_usd.toFixed(2)} → ${total.expense25F_usd.toFixed(2)}</span>
                  <span className={`font-bold ${(total.expense25F_usd - total.expense24F_usd) < 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {(total.expense25F_usd - total.expense24F_usd) > 0 ? '+' : ''}${(total.expense25F_usd - total.expense24F_usd).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 카테고리별 평균단가 */}
          {categoryData.map((cat) => {
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
                  <span className="text-[10px] text-gray-500">전년 대비</span>
                  <div className="flex items-center gap-1">
                    {(cat.data.avgCost25F_usd - cat.data.avgCost24F_usd) < 0 ? (
                      <ArrowDown className="w-3 h-3 text-green-600" />
                    ) : (
                      <ArrowUp className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`text-[10px] font-bold ${(cat.data.avgCost25F_usd - cat.data.avgCost24F_usd) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(cat.data.avgCost25F_usd - cat.data.avgCost24F_usd) > 0 ? '+' : ''}${(cat.data.avgCost25F_usd - cat.data.avgCost24F_usd).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5 text-[10px] border-t border-gray-200 pt-3 mt-3">
                  {/* 원부자재 */}
                  <div>
                    <div className="text-gray-600 mb-0.5">원부자재</div>
                    <div className="flex justify-between items-center text-[9px] text-gray-500">
                      <span>${cat.data.material24F_usd.toFixed(2)} → ${cat.data.material25F_usd.toFixed(2)}</span>
                      <span className={`font-bold ${(cat.data.material25F_usd - cat.data.material24F_usd) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(cat.data.material25F_usd - cat.data.material24F_usd) > 0 ? '+' : ''}${(cat.data.material25F_usd - cat.data.material24F_usd).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* 아트웍 */}
                  <div>
                    <div className="text-gray-600 mb-0.5">아트웍</div>
                    <div className="flex justify-between items-center text-[9px] text-gray-500">
                      <span>${cat.data.artwork24F_usd.toFixed(2)} → ${cat.data.artwork25F_usd.toFixed(2)}</span>
                      <span className={`font-bold ${(cat.data.artwork25F_usd - cat.data.artwork24F_usd) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(cat.data.artwork25F_usd - cat.data.artwork24F_usd) > 0 ? '+' : ''}${(cat.data.artwork25F_usd - cat.data.artwork24F_usd).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* 공임 */}
                  <div>
                    <div className="text-gray-600 mb-0.5">공임</div>
                    <div className="flex justify-between items-center text-[9px] text-gray-500">
                      <span>${cat.data.labor24F_usd.toFixed(2)} → ${cat.data.labor25F_usd.toFixed(2)}</span>
                      <span className={`font-bold ${(cat.data.labor25F_usd - cat.data.labor24F_usd) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(cat.data.labor25F_usd - cat.data.labor24F_usd) > 0 ? '+' : ''}${(cat.data.labor25F_usd - cat.data.labor24F_usd).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* 마진 */}
                  <div>
                    <div className="text-gray-600 mb-0.5">마진</div>
                    <div className="flex justify-between items-center text-[9px] text-gray-500">
                      <span>${cat.data.margin24F_usd.toFixed(2)} → ${cat.data.margin25F_usd.toFixed(2)}</span>
                      <span className={`font-bold ${(cat.data.margin25F_usd - cat.data.margin24F_usd) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(cat.data.margin25F_usd - cat.data.margin24F_usd) > 0 ? '+' : ''}${(cat.data.margin25F_usd - cat.data.margin24F_usd).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* 경비 */}
                  <div>
                    <div className="text-gray-600 mb-0.5">경비</div>
                    <div className="flex justify-between items-center text-[9px] text-gray-500">
                      <span>${cat.data.expense24F_usd.toFixed(2)} → ${cat.data.expense25F_usd.toFixed(2)}</span>
                      <span className={`font-bold ${(cat.data.expense25F_usd - cat.data.expense24F_usd) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(cat.data.expense25F_usd - cat.data.expense24F_usd) > 0 ? '+' : ''}${(cat.data.expense25F_usd - cat.data.expense24F_usd).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 섹션 3: 전체 및 카테고리별 원가율 (KRW) */}
      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
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
                <span className="font-bold">{(total.qty25F / 1000000).toFixed(1)}M ({total.qtyYoY?.toFixed(1) || '0'}%)</span>
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
          {categoryData.map((cat) => {
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
                      <ArrowDown className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span className={`text-sm font-bold ${cat.data.costRateChange_krw < 0 ? 'text-green-600' : 'text-red-600'}`}>
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

