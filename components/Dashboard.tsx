'use client';

import React, { useState } from 'react';
import { CostDataItem, CategoryInfo } from '@/lib/types';
import { CATEGORIES } from '@/lib/csvParser';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardProps {
  items: CostDataItem[];
}

const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [sortBy, setSortBy] = useState<string>('수량순');

  // CSV 데이터에 실제로 존재하는 카테고리만 추출
  const availableCategories = React.useMemo(() => {
    const categorySet = new Set(items.map(item => item.category));
    return CATEGORIES.filter(cat => categorySet.has(cat.id));
  }, [items]);

  // 히트맵 색상 계산 (증감에 따라)
  // 빨간색: 증가(+), 파란색: 감소(-)
  const getHeatmapColor = (value: number): string => {
    if (value > 2) return 'rgb(220, 38, 38)'; // 진한 빨강 (큰 증가)
    if (value > 1) return 'rgb(239, 68, 68)'; // 빨강 (증가)
    if (value > 0) return 'rgb(252, 165, 165)'; // 연한 빨강 (약간 증가)
    if (value > -1) return 'rgb(191, 219, 254)'; // 연한 파랑 (약간 감소)
    if (value > -2) return 'rgb(96, 165, 250)'; // 파랑 (감소)
    return 'rgb(37, 99, 235)'; // 진한 파랑 (큰 감소)
  };

  // 아이템 확장/축소 토글
  const toggleItem = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  // 카테고리 정보 조회
  const getCategoryInfo = (categoryId: string): CategoryInfo | undefined => {
    return CATEGORIES.find(c => c.id === categoryId);
  };

  // 필터링된 아이템 (전년 또는 당년 수량이 0인 것 제외)
  const filteredItems = (selectedCategory === '전체' 
    ? items 
    : items.filter(item => item.category === selectedCategory)
  ).filter(item => item.qty24F > 0 && item.qty25F > 0);

  // 정렬
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === '수량순') {
      return (b.qty25F || 0) - (a.qty25F || 0);
    } else if (sortBy === '원가율변동순') {
      return a.costRateChange - b.costRateChange; // 오름차순 (개선된 것 먼저)
    }
    return 0;
  });

  // 카테고리별로 그룹핑
  const groupedItems = sortedItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CostDataItem[]>);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          아이템별 원가 구성 히트맵
        </h2>
        
        {/* 필터 및 정렬 드롭다운 */}
        <div className="flex gap-3">
          {/* 카테고리 필터 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="전체">전체</option>
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          {/* 정렬 선택 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="수량순">수량순</option>
            <option value="원가율변동순">원가율변동순</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-center font-semibold text-gray-700 w-12">
                
              </th>
              <th className="border px-3 py-2 text-left font-semibold text-gray-700">
                카테고리
              </th>
              <th className="border px-3 py-2 text-left font-semibold text-gray-700">
                아이템
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                평균<br/>KRW TAG
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                TAG<br/>YOY
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                원가<br/>YOY
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                원가율<br/>변동
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                원부자재
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                아트웍
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                공임
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                마진
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                기타경비
              </th>
              <th className="border px-3 py-2 text-center font-semibold text-gray-700">
                수량
              </th>
            </tr>
          </thead>
          <tbody>
            {availableCategories.map(category => {
              const categoryItems = groupedItems[category.id] || [];
              
              if (categoryItems.length === 0) return null;

              return (
                <React.Fragment key={category.id}>
                  {/* 카테고리 헤더 */}
                  <tr className="bg-gray-50">
                    <td
                      colSpan={13}
                      className="border px-3 py-2 font-bold text-gray-800"
                      style={{ color: category.color }}
                    >
                      {category.name} ({categoryItems.length}개 아이템)
                    </td>
                  </tr>

                  {/* 아이템 목록 */}
                  {categoryItems.map(item => {
                    const itemKey = `${item.category}_${item.item_name}`;
                    const isExpanded = expandedItems.has(itemKey);

                    // 증감 계산 (변동값)
                    const materialChange = item.material25F - item.material24F;
                    const artworkChange = item.artwork25F - item.artwork24F;
                    const laborChange = item.labor25F - item.labor24F;
                    const marginChange = item.margin25F - item.margin24F;
                    const expenseChange = item.expense25F - item.expense24F;

                    // KRW TAG 계산 (25F 기준, 1288 환율 적용)
                    const avgTagKRW = item.avgTag25F * 1288;

                    return (
                      <React.Fragment key={itemKey}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          {/* 화살표 (왼쪽) */}
                          <td className="border px-2 py-2 text-center">
                            <button
                              onClick={() => toggleItem(itemKey)}
                              className="text-gray-500 hover:text-blue-600"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </td>
                          
                          {/* 카테고리 */}
                          <td className="border px-3 py-2">
                            <span 
                              className="inline-block px-2 py-1 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: category.color }}
                            >
                              {category.name}
                            </span>
                          </td>
                          
                          {/* 아이템 */}
                          <td className="border px-3 py-2 font-medium text-gray-800">
                            {item.item_name}
                          </td>
                          
                          {/* 평균 KRW TAG */}
                          <td className="border px-3 py-2 text-center">
                            {avgTagKRW.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          
                          {/* TAG YOY */}
                          <td className={`border px-3 py-2 text-center font-semibold ${
                            item.tagYoY < 100 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.tagYoY?.toFixed(0) || '0'}%
                          </td>
                          
                          {/* 원가 YOY */}
                          <td className={`border px-3 py-2 text-center font-semibold ${
                            item.costYoY < 100 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.costYoY?.toFixed(0) || '0'}%
                          </td>
                          
                          {/* 원가율 변동 */}
                          <td
                            className="border px-3 py-2 text-center font-bold"
                            style={{
                              backgroundColor: item.costRateChange < 0 ? '#d1fae5' : '#fee2e2',
                              color: item.costRateChange < 0 ? '#065f46' : '#991b1b'
                            }}
                          >
                            {item.costRateChange > 0 ? '+' : ''}
                            {item.costRateChange?.toFixed(1) || '0.0'}%p
                          </td>
                          
                          {/* 원부자재 */}
                          <td
                            className="border px-3 py-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(materialChange) }}
                          >
                            {materialChange >= 0 ? '+' : '-'}${Math.abs(materialChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 아트웍 */}
                          <td
                            className="border px-3 py-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(artworkChange) }}
                          >
                            {artworkChange >= 0 ? '+' : '-'}${Math.abs(artworkChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 공임 */}
                          <td
                            className="border px-3 py-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(laborChange) }}
                          >
                            {laborChange >= 0 ? '+' : '-'}${Math.abs(laborChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 마진 */}
                          <td
                            className="border px-3 py-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(marginChange) }}
                          >
                            {marginChange >= 0 ? '+' : '-'}${Math.abs(marginChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 기타경비 */}
                          <td
                            className="border px-3 py-2 text-center"
                            style={{ backgroundColor: getHeatmapColor(expenseChange) }}
                          >
                            {expenseChange >= 0 ? '+' : '-'}${Math.abs(expenseChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 수량 */}
                          <td className="border px-3 py-2 text-center">
                            {item.qty25F?.toLocaleString() || '0'}
                          </td>
                        </tr>

                        {/* 확장된 상세 정보 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={13} className="border px-6 py-4 bg-gray-50">
                              <div className="grid grid-cols-2 gap-6">
                                {/* 24F 데이터 */}
                                <div>
                                  <h4 className="font-bold text-gray-700 mb-3">
                                    전년 시즌
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">수량:</span>
                                      <span className="font-medium">
                                        {item.qty24F?.toLocaleString() || '0'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">평균 TAG:</span>
                                      <span className="font-medium">
                                        {(item.avgTag24F * 1297)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">원부자재:</span>
                                      <span className="font-medium">
                                        ${item.material24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">아트웍:</span>
                                      <span className="font-medium">
                                        ${item.artwork24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">공임:</span>
                                      <span className="font-medium">
                                        ${item.labor24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">마진:</span>
                                      <span className="font-medium">
                                        ${item.margin24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">경비:</span>
                                      <span className="font-medium">
                                        ${item.expense24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t">
                                      <span className="text-gray-700 font-semibold">
                                        평균 원가:
                                      </span>
                                      <span className="font-bold">
                                        ${item.avgCost24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-700 font-semibold">
                                        원가율:
                                      </span>
                                      <span className="font-bold">
                                        {item.costRate24F?.toFixed(1) || '0.0'}%
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 당년 데이터 */}
                                <div>
                                  <h4 className="font-bold text-gray-700 mb-3">
                                    당년 시즌
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">수량:</span>
                                      <span className="font-medium">
                                        {item.qty25F?.toLocaleString() || '0'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            item.qtyChange >= 0
                                              ? 'text-blue-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({item.qtyChange >= 0 ? '+' : ''}
                                          {item.qtyChange?.toLocaleString()})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">평균 TAG:</span>
                                      <span className="font-medium">
                                        {(item.avgTag25F * 1297)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                                        <span className="ml-2 text-xs text-gray-500">
                                          (YOY: {item.tagYoY?.toFixed(1) || '0'}%)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">원부자재:</span>
                                      <span className="font-medium">
                                        ${item.material25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            materialChange < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({materialChange >= 0 ? '+' : '-'}$
                                          {Math.abs(materialChange)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">아트웍:</span>
                                      <span className="font-medium">
                                        ${item.artwork25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            artworkChange < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({artworkChange >= 0 ? '+' : '-'}$
                                          {Math.abs(artworkChange)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">공임:</span>
                                      <span className="font-medium">
                                        ${item.labor25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            laborChange < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({laborChange >= 0 ? '+' : '-'}$
                                          {Math.abs(laborChange)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">마진:</span>
                                      <span className="font-medium">
                                        ${item.margin25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            marginChange < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({marginChange >= 0 ? '+' : '-'}$
                                          {Math.abs(marginChange)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">경비:</span>
                                      <span className="font-medium">
                                        ${item.expense25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            expenseChange < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({expenseChange >= 0 ? '+' : '-'}$
                                          {Math.abs(expenseChange)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t">
                                      <span className="text-gray-700 font-semibold">
                                        평균 원가:
                                      </span>
                                      <span className="font-bold">
                                        ${item.avgCost25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            (item.avgCost25F - item.avgCost24F) < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({(item.avgCost25F - item.avgCost24F) >= 0 ? '+' : '-'}$
                                          {Math.abs(item.avgCost25F - item.avgCost24F)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-700 font-semibold">
                                        원가율:
                                      </span>
                                      <span className="font-bold">
                                        {item.costRate25F?.toFixed(1) || '0.0'}%
                                        <span
                                          className={`ml-2 text-xs ${
                                            item.costRateChange < 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({item.costRateChange >= 0 ? '+' : ''}
                                          {item.costRateChange?.toFixed(1)}%p)
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 히트맵 범례 및 가이드 */}
      <div className="mt-6 space-y-4">
        {/* 히트맵 색상 범례 */}
        <div className="flex items-center gap-4 justify-center flex-wrap">
          <span className="text-sm text-gray-600 font-medium">히트맵 범례 (24F→25F 증감):</span>
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 rounded" style={{ backgroundColor: 'rgb(37, 99, 235)' }}></div>
            <span className="text-xs text-gray-600">큰 감소</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 rounded" style={{ backgroundColor: 'rgb(96, 165, 250)' }}></div>
            <span className="text-xs text-gray-600">감소</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 rounded" style={{ backgroundColor: 'rgb(191, 219, 254)' }}></div>
            <span className="text-xs text-gray-600">약간 감소</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 rounded" style={{ backgroundColor: 'rgb(252, 165, 165)' }}></div>
            <span className="text-xs text-gray-600">약간 증가</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 rounded" style={{ backgroundColor: 'rgb(239, 68, 68)' }}></div>
            <span className="text-xs text-gray-600">증가</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-6 rounded" style={{ backgroundColor: 'rgb(220, 38, 38)' }}></div>
            <span className="text-xs text-gray-600">큰 증가</span>
          </div>
        </div>

        {/* 가이드 메시지 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>📊 히트맵 가이드 (USD 기준):</strong> 빨간색은 증가(+), 파란색은 감소(-)를 나타내며, 
              색상이 진할수록 변동폭이 큽니다. 단위는 USD 달러입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

