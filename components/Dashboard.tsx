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

  // 카테고리 색상 및 이름 매핑 (MLB NON 시즌용)
  const getCategoryInfoForNon = (categoryId: string): { name: string; color: string } => {
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

  // CSV 데이터에 실제로 존재하는 카테고리만 추출
  const availableCategories = React.useMemo(() => {
    const categorySet = new Set(items.map(item => item.category));
    const categoriesFromItems = Array.from(categorySet);
    
    // MLB NON 시즌인지 확인 (카테고리에 SHOES, BAG, HEADWEAR가 있으면 NON 시즌)
    const isNonSeason = categoriesFromItems.some(cat => 
      ['Shoes', 'Bag', 'Headwear'].includes(cat)
    );
    
    if (isNonSeason) {
      // MLB NON 시즌: items에서 직접 카테고리 정보 생성
      return categoriesFromItems
        .filter(cat => cat !== 'Acc_etc' && cat !== 'Wear_etc') // ETC 제외
        .map(cat => {
          const info = getCategoryInfoForNon(cat);
          return {
            id: cat,
            name: info.name,
            color: info.color,
            order: 0,
          };
        });
    } else {
      // FW/SS 시즌: CATEGORIES 사용
      return CATEGORIES.filter(cat => categorySet.has(cat.id));
    }
  }, [items]);

  // MLB NON 시즌인지 확인 (카테고리에 SHOES, BAG, HEADWEAR가 있으면 NON 시즌)
  const isNonSeason = React.useMemo(() => {
    const categorySet = new Set(items.map(item => item.category));
    return Array.from(categorySet).some(cat => 
      ['Shoes', 'Bag', 'Headwear'].includes(cat)
    );
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
    // 먼저 availableCategories에서 찾기
    const found = availableCategories.find(c => c.id === categoryId);
    if (found) {
      return found as CategoryInfo;
    }
    // 없으면 CATEGORIES에서 찾기
    return CATEGORIES.find(c => c.id === categoryId);
  };

  // 필터링된 아이템
  // NON 시즌인 경우: qty24F > 0 || qty25F > 0 (둘 중 하나라도 있으면 표시)
  // 일반 시즌인 경우: qty24F > 0 && qty25F > 0 (둘 다 있어야 표시)
  const filteredItems = React.useMemo(() => {
    const categoryFiltered = selectedCategory === '전체' 
      ? items 
      : items.filter(item => item.category === selectedCategory);
    
    if (isNonSeason) {
      // NON 시즌: 전년 또는 당년 데이터가 하나라도 있으면 표시
      return categoryFiltered.filter(item => item.qty24F > 0 || item.qty25F > 0);
    } else {
      // 일반 시즌: 전년과 당년 데이터가 모두 있어야 표시
      return categoryFiltered.filter(item => item.qty24F > 0 && item.qty25F > 0);
    }
  }, [items, selectedCategory, isNonSeason]);

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
    <div className="bg-white rounded-xl shadow-md p-6 mb-4 border border-gray-100">
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
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-700 text-sm font-medium hover:border-gray-300 transition-all"
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
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-gray-700 text-sm font-medium hover:border-gray-300 transition-all"
          >
            <option value="수량순">수량순</option>
            <option value="원가율변동순">원가율변동순</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50/30">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800 w-12">
                
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                카테고리
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                아이템
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                평균<br/>KRW TAG
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                TAG<br/>YOY
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                원가<br/>YOY
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                원가율<br/>변동
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                총원가차이<br/>(USD)
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                원부자재
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                아트웍
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                공임
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                마진
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                기타경비
              </th>
              <th className="border-r border-gray-200 bg-white px-3 py-3 text-center font-semibold text-gray-800">
                수량(전년비)
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
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <td
                      colSpan={14}
                      className="border-r border-gray-200 px-4 py-3 text-left font-bold text-gray-800"
                      style={{ 
                        color: category.color,
                        borderLeft: `4px solid ${category.color}`
                      }}
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

                    // KRW TAG는 이미 KRW 단위
                    const avgTagKRW = item.avgTag25F;

                    return (
                      <React.Fragment key={itemKey}>
                        <tr className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 bg-white">
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
                          <td className="border-r border-gray-200 px-3 py-2.5 text-center">
                            <span 
                              className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold text-white shadow-sm"
                              style={{ backgroundColor: category.color }}
                            >
                              {category.name}
                            </span>
                          </td>
                          
                          {/* 아이템 */}
                          <td className="border-r border-gray-200 px-3 py-2.5 text-center font-medium text-gray-800">
                            {item.item_name}
                          </td>
                          
                          {/* 평균 KRW TAG */}
                          <td className="border-r border-gray-200 px-3 py-2.5 text-right text-gray-700">
                            {avgTagKRW.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          
                          {/* TAG YOY */}
                          <td className={`border-r border-gray-200 px-3 py-2.5 text-right font-semibold ${
                            item.tagYoY > 100 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {item.tagYoY?.toFixed(0) || '0'}%
                          </td>
                          
                          {/* 원가 YOY */}
                          <td className={`border-r border-gray-200 px-3 py-2.5 text-right font-semibold ${
                            item.costYoY > 100 ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {item.costYoY?.toFixed(0) || '0'}%
                          </td>
                          
                          {/* 원가율 변동 */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right font-bold"
                            style={{
                              backgroundColor: item.costRateChange < 0 ? '#dbeafe' : '#fee2e2',
                              color: item.costRateChange < 0 ? '#1e40af' : '#991b1b'
                            }}
                          >
                            {item.costRateChange > 0 ? '+' : ''}
                            {item.costRateChange?.toFixed(1) || '0.0'}%p
                          </td>
                          
                          {/* 총원가차이 (USD) */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right font-semibold"
                            style={{
                              backgroundColor: (materialChange + artworkChange + laborChange + marginChange + expenseChange) < 0 ? '#dbeafe' : '#fee2e2',
                              color: (materialChange + artworkChange + laborChange + marginChange + expenseChange) < 0 ? '#1e40af' : '#991b1b'
                            }}
                          >
                            {(materialChange + artworkChange + laborChange + marginChange + expenseChange) >= 0 ? '+' : '-'}
                            ${Math.abs(materialChange + artworkChange + laborChange + marginChange + expenseChange).toFixed(2)}
                          </td>
                          
                          {/* 원부자재 */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right"
                            style={{ backgroundColor: getHeatmapColor(materialChange) }}
                          >
                            {materialChange >= 0 ? '+' : '-'}${Math.abs(materialChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 아트웍 */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right"
                            style={{ backgroundColor: getHeatmapColor(artworkChange) }}
                          >
                            {artworkChange >= 0 ? '+' : '-'}${Math.abs(artworkChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 공임 */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right"
                            style={{ backgroundColor: getHeatmapColor(laborChange) }}
                          >
                            {laborChange >= 0 ? '+' : '-'}${Math.abs(laborChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 마진 */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right"
                            style={{ backgroundColor: getHeatmapColor(marginChange) }}
                          >
                            {marginChange >= 0 ? '+' : '-'}${Math.abs(marginChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 기타경비 */}
                          <td
                            className="border-r border-gray-200 px-3 py-2.5 text-right"
                            style={{ backgroundColor: getHeatmapColor(expenseChange) }}
                          >
                            {expenseChange >= 0 ? '+' : '-'}${Math.abs(expenseChange)?.toFixed(2) || '0.00'}
                          </td>
                          
                          {/* 수량 */}
                          <td className="border-r border-gray-200 px-3 py-2.5 text-right text-gray-700">
                            {item.qty25F?.toLocaleString() || '0'}개
                            {item.qty24F > 0 && item.qty25F > 0 && (
                              <span className="text-gray-500 ml-1">
                                ({Math.round((item.qty25F / item.qty24F) * 100)}%)
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* 확장된 상세 정보 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={14} className="border-r border-gray-200 px-6 py-5 bg-gradient-to-br from-blue-50/30 via-white to-pink-50/30">
                              <div className="grid grid-cols-2 gap-6">
                                {/* 24F 데이터 */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                                  <h4 className="font-bold text-gray-800 mb-4 text-base">
                                    전년 시즌
                                  </h4>
                                  <div className="space-y-2.5 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">수량:</span>
                                      <span className="font-medium">
                                        {item.qty24F?.toLocaleString() || '0'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">평균 TAG:</span>
                                      <span className="font-medium">
                                        {(item.avgTag24F)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
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
                                    <div className="flex justify-between pt-3 border-t border-gray-200">
                                      <span className="text-gray-800 font-semibold">
                                        평균 원가:
                                      </span>
                                      <span className="font-bold text-gray-900">
                                        ${item.avgCost24F?.toFixed(2) || '0.00'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-800 font-semibold">
                                        원가율:
                                      </span>
                                      <span className="font-bold text-gray-900">
                                        {item.costRate24F?.toFixed(1) || '0.0'}%
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 당년 데이터 */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                                  <h4 className="font-bold text-gray-800 mb-4 text-base">
                                    당년 시즌
                                  </h4>
                                  <div className="space-y-2.5 text-sm">
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
                                        {(item.avgTag25F)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '0'}
                                        <span className={`ml-2 text-xs ${
                                          (item.tagYoY || 0) > 100
                                            ? 'text-blue-600'
                                            : 'text-red-600'
                                        }`}>
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
                                              ? 'text-blue-600'
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
                                              ? 'text-blue-600'
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
                                              ? 'text-blue-600'
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
                                              ? 'text-blue-600'
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
                                              ? 'text-blue-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({expenseChange >= 0 ? '+' : '-'}$
                                          {Math.abs(expenseChange)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-gray-200">
                                      <span className="text-gray-800 font-semibold">
                                        평균 원가:
                                      </span>
                                      <span className="font-bold">
                                        ${item.avgCost25F?.toFixed(2) || '0.00'}
                                        <span
                                          className={`ml-2 text-xs ${
                                            (item.avgCost25F - item.avgCost24F) < 0
                                              ? 'text-blue-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          ({(item.avgCost25F - item.avgCost24F) >= 0 ? '+' : '-'}$
                                          {Math.abs(item.avgCost25F - item.avgCost24F)?.toFixed(2)})
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-800 font-semibold">
                                        원가율:
                                      </span>
                                      <span className="font-bold">
                                        {item.costRate25F?.toFixed(1) || '0.0'}%
                                        <span
                                          className={`ml-2 text-xs ${
                                            item.costRateChange < 0
                                              ? 'text-blue-600'
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
         <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
           <div className="flex items-center gap-4 justify-center flex-wrap">
             <span className="text-sm text-gray-700 font-semibold">히트맵 범례 (전년→당년 증감):</span>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
               <div className="w-12 h-6 rounded" style={{ backgroundColor: getHeatmapColor(-3) }}></div>
               <span className="text-xs text-gray-600 font-medium">큰 감소</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
               <div className="w-12 h-6 rounded" style={{ backgroundColor: getHeatmapColor(-1.5) }}></div>
               <span className="text-xs text-gray-600 font-medium">감소</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
               <div className="w-12 h-6 rounded" style={{ backgroundColor: getHeatmapColor(-0.5) }}></div>
               <span className="text-xs text-gray-600 font-medium">약간 감소</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
               <div className="w-12 h-6 rounded" style={{ backgroundColor: getHeatmapColor(0.5) }}></div>
               <span className="text-xs text-gray-600 font-medium">약간 증가</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
               <div className="w-12 h-6 rounded" style={{ backgroundColor: getHeatmapColor(1.5) }}></div>
               <span className="text-xs text-gray-600 font-medium">증가</span>
             </div>
             <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200">
               <div className="w-12 h-6 rounded" style={{ backgroundColor: getHeatmapColor(3) }}></div>
               <span className="text-xs text-gray-600 font-medium">큰 증가</span>
             </div>
           </div>
         </div>

        {/* 가이드 메시지 */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong className="text-blue-600">📊 히트맵 가이드 (USD 기준):</strong> <span className="text-red-500">연한 핑크</span>는 증가(+), <span className="text-blue-500">연한 블루</span>는 감소(-)를 나타내며, 
              색상이 진할수록 변동폭이 큽니다. 단위는 USD 달러입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

