'use client';

import React, { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CATEGORIES } from '@/lib/csvParser';

interface CategoryComparisonProps {
  summary: any;
}

const CategoryComparison: React.FC<CategoryComparisonProps> = ({ summary }) => {
  const [showPrev, setShowPrev] = useState(true);
  const [showCurr, setShowCurr] = useState(true);

  if (!summary || !summary.categories || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { categories, total } = summary;

  // 시즌 판별 (EnhancedStoryCards와 동일한 로직)
  const is25FW = total.qty24F > 3000000 && total.qty24F < 4000000;
  const isKIDS = total.qty24F > 600000 && total.qty24F < 700000;
  const isDISCOVERY = total.qty24F > 1200000 && total.qty24F < 1400000;
  const isFWSS = is25FW || isKIDS || isDISCOVERY;
  const isNonSeason = !isFWSS;

  // 전체 레이더 차트 데이터 (5각형: 원부자재, 아트웍, 공임, 마진, 경비)
  const createRadarData = (data: any) => [
    { subject: '원부자재', '전년': data.materialRate24F_usd, '당년': data.materialRate25F_usd, fullMark: 15 },
    { subject: '아트웍', '전년': data.artworkRate24F_usd, '당년': data.artworkRate25F_usd, fullMark: 15 },
    { subject: '공임', '전년': data.laborRate24F_usd, '당년': data.laborRate25F_usd, fullMark: 15 },
    { subject: '마진', '전년': data.marginRate24F_usd, '당년': data.marginRate25F_usd, fullMark: 15 },
    { subject: '경비', '전년': data.expenseRate24F_usd, '당년': data.expenseRate25F_usd, fullMark: 15 },
  ];

  // 전체 데이터
  const totalRadarData = createRadarData(total);

  // 카테고리 색상 매핑 (MLB NON 시즌용)
  const getCategoryColor = (categoryId: string): string => {
    const categoryMap: Record<string, string> = {
      'Outer': '#3b82f6',
      'Inner': '#10b981',
      'Bottom': '#f59e0b',
      'Shoes': '#8b5cf6',
      'Bag': '#ec4899',
      'Headwear': '#f97316',
      'Acc_etc': '#ef4444',
      'Wear_etc': '#f97316',
    };
    return categoryMap[categoryId] || '#6b7280';
  };

  // 카테고리 이름 매핑
  const getCategoryName = (categoryId: string): string => {
    const nameMap: Record<string, string> = {
      'Outer': 'OUTER',
      'Inner': 'INNER',
      'Bottom': 'BOTTOM',
      'Shoes': 'SHOES',
      'Bag': 'BAG',
      'Headwear': 'HEADWEAR',
      'Acc_etc': 'ACC',
      'Wear_etc': 'WEAR',
    };
    return nameMap[categoryId] || categoryId.toUpperCase();
  };

  // 카테고리별 레이더 데이터
  // MLB NON 시즌은 summary.categories에서 직접 가져오고, FW/SS 시즌은 CATEGORIES 사용
  const categoryRadarData = isNonSeason
    ? (() => {
        // 모든 카테고리 데이터 생성
        const allCategoryData = categories.map((categoryData: any) => {
          const catId = categoryData.category;
          // Wear_etc만 제외
          if (catId === 'Wear_etc') {
            return null;
          }
          return {
            id: catId,
            name: getCategoryName(catId),
            color: getCategoryColor(catId),
            data: createRadarData(categoryData),
            costRate24F: categoryData.costRate24F_usd,
            costRate25F: categoryData.costRate25F_usd,
            materialRate24F: categoryData.materialRate24F_usd,
            materialRate25F: categoryData.materialRate25F_usd,
            artworkRate24F: categoryData.artworkRate24F_usd,
            artworkRate25F: categoryData.artworkRate25F_usd,
            laborRate24F: categoryData.laborRate24F_usd,
            laborRate25F: categoryData.laborRate25F_usd,
            marginRate24F: categoryData.marginRate24F_usd,
            marginRate25F: categoryData.marginRate25F_usd,
            expenseRate24F: categoryData.expenseRate24F_usd,
            expenseRate25F: categoryData.expenseRate25F_usd,
          };
        }).filter(Boolean);
        
        // ETC 제외한 상위 4개 + ACC_ETC
        const nonEtcCategories = allCategoryData.filter((cat: any) => 
          cat.id !== 'Acc_etc' && cat.id !== 'Wear_etc'
        );
        const top4 = nonEtcCategories
          .sort((a: any, b: any) => (b.costRate25F || 0) - (a.costRate25F || 0))
          .slice(0, 4);
        
        // ACC_ETC 추가
        const accEtc = allCategoryData.find((cat: any) => cat.id === 'Acc_etc');
        if (accEtc) {
          top4.push(accEtc);
        }
        
        return top4;
      })()
    : (() => {
        // FW/SS 시즌: Outer, Inner, Bottom 무조건 표시 + (Wear_etc 있으면 Wear_etc, 없으면 Acc_etc)
        const requiredCategories = ['Outer', 'Inner', 'Bottom'];
        const selected: any[] = [];
        
        // Outer, Inner, Bottom 추가
        requiredCategories.forEach(catId => {
          const categoryData = categories.find((c: any) => c.category === catId);
          if (categoryData) {
            const cat = CATEGORIES.find(c => c.id === catId);
            if (cat) {
              selected.push({
                id: cat.id,
                name: cat.name,
                color: cat.color,
                data: createRadarData(categoryData),
                costRate24F: categoryData.costRate24F_usd,
                costRate25F: categoryData.costRate25F_usd,
                materialRate24F: categoryData.materialRate24F_usd,
                materialRate25F: categoryData.materialRate25F_usd,
                artworkRate24F: categoryData.artworkRate24F_usd,
                artworkRate25F: categoryData.artworkRate25F_usd,
                laborRate24F: categoryData.laborRate24F_usd,
                laborRate25F: categoryData.laborRate25F_usd,
                marginRate24F: categoryData.marginRate24F_usd,
                marginRate25F: categoryData.marginRate25F_usd,
                expenseRate24F: categoryData.expenseRate24F_usd,
                expenseRate25F: categoryData.expenseRate25F_usd,
              });
            }
          }
        });
        
        // 4번째 카드: Wear_etc 있으면 Wear_etc, 없으면 Acc_etc
        const wearEtcData = categories.find((c: any) => c.category === 'Wear_etc');
        const accEtcData = categories.find((c: any) => c.category === 'Acc_etc');
        const etcCategoryData = wearEtcData || accEtcData;
        const etcCategory = wearEtcData ? CATEGORIES.find(c => c.id === 'Wear_etc') : 
                           accEtcData ? CATEGORIES.find(c => c.id === 'Acc_etc') : null;
        
        if (etcCategoryData && etcCategory) {
          selected.push({
            id: etcCategory.id,
            name: etcCategory.name,
            color: etcCategory.color,
            data: createRadarData(etcCategoryData),
            costRate24F: etcCategoryData.costRate24F_usd,
            costRate25F: etcCategoryData.costRate25F_usd,
            materialRate24F: etcCategoryData.materialRate24F_usd,
            materialRate25F: etcCategoryData.materialRate25F_usd,
            artworkRate24F: etcCategoryData.artworkRate24F_usd,
            artworkRate25F: etcCategoryData.artworkRate25F_usd,
            laborRate24F: etcCategoryData.laborRate24F_usd,
            laborRate25F: etcCategoryData.laborRate25F_usd,
            marginRate24F: etcCategoryData.marginRate24F_usd,
            marginRate25F: etcCategoryData.marginRate25F_usd,
            expenseRate24F: etcCategoryData.expenseRate24F_usd,
            expenseRate25F: etcCategoryData.expenseRate25F_usd,
          });
        }
        
        return selected;
      })();

  // 개별 레이더 차트 컴포넌트
  const RadarChartCard = ({ title, data, color, stats }: any) => (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-blue-100 p-5 hover:shadow-md hover:border-blue-200 transition-all">
      <h3 className="text-center font-bold text-base mb-4" style={{ color: color || '#333' }}>
        {title}
      </h3>
      
      {/* 레이더 차트 */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="#dbeafe" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }} />
            <PolarRadiusAxis angle={90} domain={[0, 15]} tick={{ fontSize: 10, fill: '#6b7280' }} />
            {showPrev && (
              <Radar
                name="전년"
                dataKey="전년"
                stroke="#9ca3af"
                fill="#9ca3af"
                fillOpacity={0.25}
                strokeWidth={2.5}
              />
            )}
            {showCurr && (
              <Radar
                name="당년"
                dataKey="당년"
                stroke={color || '#333'}
                fill={color || '#333'}
                fillOpacity={0.35}
                strokeWidth={2.5}
              />
            )}
            <Legend 
              wrapperStyle={{ fontSize: '12px', fontWeight: '600', paddingTop: '10px' }}
              iconType="circle"
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #dbeafe', 
                borderRadius: '8px', 
                padding: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 하단 통계 테이블 */}
      <div className="mt-4 border-t border-blue-100 pt-4">
        <div className="grid grid-cols-4 gap-2 text-xs">
          {/* 헤더 */}
          <div className="font-bold text-gray-800 text-center bg-blue-50/50 py-2 rounded-lg text-xs border border-blue-100">구분</div>
          <div className="font-bold text-gray-800 text-center bg-blue-50/50 py-2 rounded-lg text-xs border border-blue-100">전년</div>
          <div className="font-bold text-center bg-blue-50/50 py-2 rounded-lg text-xs text-gray-900 border border-blue-100">당년</div>
          <div className="font-bold text-gray-800 text-center bg-blue-50/50 py-2 rounded-lg text-xs border border-blue-100">차이</div>
          
          {/* 전체 원가율 */}
          <div className="text-gray-800 font-semibold text-center py-2 text-xs bg-gray-50/50 rounded-md">원가율</div>
          <div className="text-gray-600 text-center py-2 font-medium text-xs">{stats.costRate24F.toFixed(1)}%</div>
          <div className="font-bold text-center py-2 text-xs text-gray-900 bg-white rounded-md">
            {stats.costRate25F.toFixed(1)}%
          </div>
          <div className={`font-bold text-center py-2 text-xs rounded-md ${(stats.costRate25F - stats.costRate24F) < 0 ? 'text-blue-600 bg-blue-50/50' : (stats.costRate25F - stats.costRate24F) > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-900 bg-gray-50/50'}`}>
            {(stats.costRate25F - stats.costRate24F) > 0 ? '+' : ''}{(stats.costRate25F - stats.costRate24F).toFixed(1)}%p
          </div>
          
          {/* 원부자재 */}
          <div className="text-gray-800 text-center py-2 text-xs bg-gray-50/50 rounded-md">원부자재</div>
          <div className="text-gray-600 text-center py-2 text-xs">{stats.materialRate24F.toFixed(1)}%</div>
          <div className="text-center py-2 font-bold text-xs text-gray-900 bg-white rounded-md">
            {stats.materialRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-2 text-xs rounded-md ${(stats.materialRate25F - stats.materialRate24F) < 0 ? 'text-blue-600 bg-blue-50/50' : (stats.materialRate25F - stats.materialRate24F) > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-900 bg-gray-50/50'}`}>
            {(stats.materialRate25F - stats.materialRate24F) > 0 ? '+' : ''}{(stats.materialRate25F - stats.materialRate24F).toFixed(1)}%p
          </div>
          
          {/* 아트웍 */}
          <div className="text-gray-800 text-center py-2 text-xs bg-gray-50/50 rounded-md">아트웍</div>
          <div className="text-gray-600 text-center py-2 text-xs">{stats.artworkRate24F.toFixed(1)}%</div>
          <div className="text-center py-2 font-bold text-xs text-gray-900 bg-white rounded-md">
            {stats.artworkRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-2 text-xs rounded-md ${(stats.artworkRate25F - stats.artworkRate24F) < 0 ? 'text-blue-600 bg-blue-50/50' : (stats.artworkRate25F - stats.artworkRate24F) > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-900 bg-gray-50/50'}`}>
            {(stats.artworkRate25F - stats.artworkRate24F) > 0 ? '+' : ''}{(stats.artworkRate25F - stats.artworkRate24F).toFixed(1)}%p
          </div>
          
          {/* 공임 */}
          <div className="text-gray-800 text-center py-2 text-xs bg-gray-50/50 rounded-md">공임</div>
          <div className="text-gray-600 text-center py-2 text-xs">{stats.laborRate24F.toFixed(1)}%</div>
          <div className="text-center py-2 font-bold text-xs text-gray-900 bg-white rounded-md">
            {stats.laborRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-2 text-xs rounded-md ${(stats.laborRate25F - stats.laborRate24F) < 0 ? 'text-blue-600 bg-blue-50/50' : (stats.laborRate25F - stats.laborRate24F) > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-900 bg-gray-50/50'}`}>
            {(stats.laborRate25F - stats.laborRate24F) > 0 ? '+' : ''}{(stats.laborRate25F - stats.laborRate24F).toFixed(1)}%p
          </div>
          
          {/* 마진 */}
          <div className="text-gray-800 text-center py-2 text-xs bg-gray-50/50 rounded-md">마진</div>
          <div className="text-gray-600 text-center py-2 text-xs">{stats.marginRate24F.toFixed(1)}%</div>
          <div className="text-center py-2 font-bold text-xs text-gray-900 bg-white rounded-md">
            {stats.marginRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-2 text-xs rounded-md ${(stats.marginRate25F - stats.marginRate24F) < 0 ? 'text-blue-600 bg-blue-50/50' : (stats.marginRate25F - stats.marginRate24F) > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-900 bg-gray-50/50'}`}>
            {(stats.marginRate25F - stats.marginRate24F) > 0 ? '+' : ''}{(stats.marginRate25F - stats.marginRate24F).toFixed(1)}%p
          </div>
          
          {/* 경비 */}
          <div className="text-gray-800 text-center py-2 text-xs bg-gray-50/50 rounded-md">경비</div>
          <div className="text-gray-600 text-center py-2 text-xs">{stats.expenseRate24F.toFixed(1)}%</div>
          <div className="text-center py-2 font-bold text-xs text-gray-900 bg-white rounded-md">
            {stats.expenseRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-2 text-xs rounded-md ${(stats.expenseRate25F - stats.expenseRate24F) < 0 ? 'text-blue-600 bg-blue-50/50' : (stats.expenseRate25F - stats.expenseRate24F) > 0 ? 'text-red-600 bg-red-50/50' : 'text-gray-900 bg-gray-50/50'}`}>
            {(stats.expenseRate25F - stats.expenseRate24F) > 0 ? '+' : ''}{(stats.expenseRate25F - stats.expenseRate24F).toFixed(1)}%p
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-blue-50/50 via-white to-pink-50/50 rounded-xl shadow-lg p-8 mb-8 border border-blue-100">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          카테고리별 원가 구성 비교 (USD 기준)
        </h2>
        
        {/* 시즌 토글 버튼 */}
        <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-blue-100">
          <button
            onClick={() => setShowPrev(!showPrev)}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              showPrev
                ? 'bg-gray-600 text-white shadow-sm'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>전년</span>
              {showPrev && <span className="text-white">✓</span>}
            </span>
          </button>
          <button
            onClick={() => setShowCurr(!showCurr)}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              showCurr
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>당년</span>
              {showCurr && <span className="text-white">✓</span>}
            </span>
          </button>
        </div>
      </div>

      {/* 레이더 차트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
        {/* 전체 */}
        <RadarChartCard
          title="전체"
          data={totalRadarData}
          color="#333"
          stats={{
            costRate24F: total.costRate24F_usd,
            costRate25F: total.costRate25F_usd,
            materialRate24F: total.materialRate24F_usd,
            materialRate25F: total.materialRate25F_usd,
            artworkRate24F: total.artworkRate24F_usd,
            artworkRate25F: total.artworkRate25F_usd,
            laborRate24F: total.laborRate24F_usd,
            laborRate25F: total.laborRate25F_usd,
            marginRate24F: total.marginRate24F_usd,
            marginRate25F: total.marginRate25F_usd,
            expenseRate24F: total.expenseRate24F_usd,
            expenseRate25F: total.expenseRate25F_usd,
          }}
        />
        
        {/* 카테고리별 */}
        {categoryRadarData.map((cat: any) => (
          <RadarChartCard
            key={cat.id}
            title={cat.name}
            data={cat.data}
            color={cat.color}
            stats={{
              costRate24F: cat.costRate24F,
              costRate25F: cat.costRate25F,
              materialRate24F: cat.materialRate24F,
              materialRate25F: cat.materialRate25F,
              artworkRate24F: cat.artworkRate24F,
              artworkRate25F: cat.artworkRate25F,
              laborRate24F: cat.laborRate24F,
              laborRate25F: cat.laborRate25F,
              marginRate24F: cat.marginRate24F,
              marginRate25F: cat.marginRate25F,
              expenseRate24F: cat.expenseRate24F,
              expenseRate25F: cat.expenseRate25F,
            }}
          />
        ))}
      </div>

      {/* 안내 메시지 */}
      <div className="bg-gradient-to-br from-blue-50/80 via-white to-pink-50/80 rounded-xl p-4 shadow-sm border border-blue-200/50">
        <div className="flex items-center gap-3 mb-3">
          <h4 className="text-sm font-bold text-gray-800">📊 레이더 차트 가이드</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-blue-600 text-xs">▸</span>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">회색 영역:</span> 전년 데이터<br />
              <span className="font-semibold text-gray-700">컬러 영역:</span> 당년 데이터
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-blue-600 text-xs">▸</span>
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-blue-600">파란색</span> = 개선(감소)<br />
              <span className="font-semibold text-red-600">빨간색</span> = 악화(증가)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryComparison;

