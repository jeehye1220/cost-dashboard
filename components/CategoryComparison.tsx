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

  // 카테고리별 레이더 데이터
  const categoryRadarData = CATEGORIES.map(cat => {
    const categoryData = categories.find((c: any) => c.category === cat.id);
    if (!categoryData) return null;
    
    return {
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
    };
  }).filter(Boolean);

  // 개별 레이더 차트 컴포넌트
  const RadarChartCard = ({ title, data, color, stats }: any) => (
    <div className="flex flex-col bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      <h3 className="text-center font-bold text-base mb-3" style={{ color: color || '#333' }}>
        {title}
      </h3>
      
      {/* 레이더 차트 */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }} />
            <PolarRadiusAxis angle={90} domain={[0, 15]} tick={{ fontSize: 10 }} />
            {showPrev && (
              <Radar
                name="전년"
                dataKey="전년"
                stroke="#9ca3af"
                fill="#9ca3af"
                fillOpacity={0.2}
                strokeWidth={3}
              />
            )}
            {showCurr && (
              <Radar
                name="당년"
                dataKey="당년"
                stroke={color || '#333'}
                fill={color || '#333'}
                fillOpacity={0.4}
                strokeWidth={3}
              />
            )}
            <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600' }} />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(1)}%`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      
      {/* 하단 통계 테이블 */}
      <div className="mt-3 border-t border-gray-200 pt-3">
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          {/* 헤더 */}
          <div className="font-bold text-gray-700 text-center bg-gray-50 py-1.5 rounded text-[11px]">구분</div>
          <div className="font-bold text-gray-700 text-center bg-gray-50 py-1.5 rounded text-[11px]">전년</div>
          <div className="font-bold text-center bg-gray-50 py-1.5 rounded text-[11px]" style={{ color: color || '#333' }}>당년</div>
          <div className="font-bold text-gray-700 text-center bg-gray-50 py-1.5 rounded text-[11px]">차이</div>
          
          {/* 전체 원가율 */}
          <div className="text-gray-700 font-semibold text-center py-1.5 text-[11px]">원가율</div>
          <div className="text-gray-600 text-center py-1.5 font-medium text-[11px]">{stats.costRate24F.toFixed(1)}%</div>
          <div className="font-bold text-center py-1.5 text-[11px]" style={{ color: color || '#333' }}>
            {stats.costRate25F.toFixed(1)}%
          </div>
          <div className={`font-bold text-center py-1.5 text-[11px] ${(stats.costRate25F - stats.costRate24F) < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.costRate25F - stats.costRate24F) > 0 ? '+' : ''}{(stats.costRate25F - stats.costRate24F).toFixed(1)}%p
          </div>
          
          {/* 원부자재 */}
          <div className="text-gray-700 text-center py-1.5 text-[10px]">원부자재</div>
          <div className="text-gray-600 text-center py-1.5 text-[10px]">{stats.materialRate24F.toFixed(1)}%</div>
          <div className={`text-center py-1.5 font-bold text-[10px] ${stats.materialRate25F < stats.materialRate24F ? 'text-blue-600' : 'text-red-600'}`}>
            {stats.materialRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-1.5 text-[10px] ${(stats.materialRate25F - stats.materialRate24F) < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.materialRate25F - stats.materialRate24F) > 0 ? '+' : ''}{(stats.materialRate25F - stats.materialRate24F).toFixed(1)}%p
          </div>
          
          {/* 아트웍 */}
          <div className="text-gray-700 text-center py-1.5 text-[10px]">아트웍</div>
          <div className="text-gray-600 text-center py-1.5 text-[10px]">{stats.artworkRate24F.toFixed(1)}%</div>
          <div className={`text-center py-1.5 font-bold text-[10px] ${stats.artworkRate25F < stats.artworkRate24F ? 'text-blue-600' : 'text-red-600'}`}>
            {stats.artworkRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-1.5 text-[10px] ${(stats.artworkRate25F - stats.artworkRate24F) < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.artworkRate25F - stats.artworkRate24F) > 0 ? '+' : ''}{(stats.artworkRate25F - stats.artworkRate24F).toFixed(1)}%p
          </div>
          
          {/* 공임 */}
          <div className="text-gray-700 text-center py-1.5 text-[10px]">공임</div>
          <div className="text-gray-600 text-center py-1.5 text-[10px]">{stats.laborRate24F.toFixed(1)}%</div>
          <div className={`text-center py-1.5 font-bold text-[10px] ${stats.laborRate25F < stats.laborRate24F ? 'text-blue-600' : 'text-red-600'}`}>
            {stats.laborRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-1.5 text-[10px] ${(stats.laborRate25F - stats.laborRate24F) < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.laborRate25F - stats.laborRate24F) > 0 ? '+' : ''}{(stats.laborRate25F - stats.laborRate24F).toFixed(1)}%p
          </div>
          
          {/* 마진 */}
          <div className="text-gray-700 text-center py-1.5 text-[10px]">마진</div>
          <div className="text-gray-600 text-center py-1.5 text-[10px]">{stats.marginRate24F.toFixed(1)}%</div>
          <div className={`text-center py-1.5 font-bold text-[10px] ${stats.marginRate25F < stats.marginRate24F ? 'text-blue-600' : 'text-red-600'}`}>
            {stats.marginRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-1.5 text-[10px] ${(stats.marginRate25F - stats.marginRate24F) < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.marginRate25F - stats.marginRate24F) > 0 ? '+' : ''}{(stats.marginRate25F - stats.marginRate24F).toFixed(1)}%p
          </div>
          
          {/* 경비 */}
          <div className="text-gray-700 text-center py-1.5 text-[10px]">경비</div>
          <div className="text-gray-600 text-center py-1.5 text-[10px]">{stats.expenseRate24F.toFixed(1)}%</div>
          <div className={`text-center py-1.5 font-bold text-[10px] ${stats.expenseRate25F < stats.expenseRate24F ? 'text-blue-600' : 'text-red-600'}`}>
            {stats.expenseRate25F.toFixed(1)}%
          </div>
          <div className={`font-semibold text-center py-1.5 text-[10px] ${(stats.expenseRate25F - stats.expenseRate24F) < 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(stats.expenseRate25F - stats.expenseRate24F) > 0 ? '+' : ''}{(stats.expenseRate25F - stats.expenseRate24F).toFixed(1)}%p
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg p-8 mb-8 border border-gray-200">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">
          카테고리별 원가 구성 비교 (USD 기준)
        </h2>
        
        {/* 시즌 토글 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowPrev(!showPrev)}
            className={`px-5 py-2.5 rounded-lg font-bold transition-all ${
              showPrev
                ? 'bg-gray-500 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            전년 {showPrev ? '✓' : ''}
          </button>
          <button
            onClick={() => setShowCurr(!showCurr)}
            className={`px-5 py-2.5 rounded-lg font-bold transition-all ${
              showCurr
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >
            당년 {showCurr ? '✓' : ''}
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
      <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg">
        <p className="text-sm text-gray-800 leading-relaxed">
          <span className="text-lg mr-2">💡</span>
          <strong className="text-blue-900">전체 및 각 카테고리의 원가 구성 비율을 5각형 레이더 차트로 표시합니다.</strong>
          <br />
          <span className="text-gray-600">
            <span className="ml-7">• 회색 영역: 24F(전년) 데이터 | 컬러 영역: 25F(당년) 데이터<br /></span>
            <span className="ml-7">• 차트 하단 테이블에서 각 항목별 정확한 수치 확인 가능<br /></span>
            <span className="ml-7">• 파란색 숫자는 개선(감소), 빨간색 숫자는 악화(증가)를 의미</span>
          </span>
        </p>
      </div>
    </div>
  );
};

export default CategoryComparison;

