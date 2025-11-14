'use client';

import React from 'react';
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

interface BrandData {
  brandId: string;
  brandName: string;
  data: {
    materialRate24F: number;
    materialRate25F: number;
    artworkRate24F: number;
    artworkRate25F: number;
    laborRate24F: number;
    laborRate25F: number;
    marginRate24F: number;
    marginRate25F: number;
    expenseRate24F: number;
    expenseRate25F: number;
  } | null;
}

interface AllBrandsRadarChartProps {
  brandsData: BrandData[];
}

const AllBrandsRadarChart: React.FC<AllBrandsRadarChartProps> = ({ brandsData }) => {
  // 모든 브랜드 데이터가 있는지 확인
  const hasData = brandsData.every(brand => brand.data !== null);
  
  if (!hasData) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center text-gray-500">데이터를 불러오는 중...</div>
      </div>
    );
  }

  // 레이더 차트 데이터 생성 (5각형: 원부자재, 아트웍, 공임, 정상마진, 경비)
  const radarData: Record<string, any>[] = [
    { subject: '원부자재' },
    { subject: '아트웍' },
    { subject: '공임' },
    { subject: '정상마진' },
    { subject: '경비' },
  ];

  // 각 브랜드별로 24F와 25F 데이터 추가
  brandsData.forEach((brand) => {
    if (brand.data) {
      radarData[0][`${brand.brandName}_24F`] = brand.data.materialRate24F;
      radarData[0][`${brand.brandName}_25F`] = brand.data.materialRate25F;
      radarData[1][`${brand.brandName}_24F`] = brand.data.artworkRate24F;
      radarData[1][`${brand.brandName}_25F`] = brand.data.artworkRate25F;
      radarData[2][`${brand.brandName}_24F`] = brand.data.laborRate24F;
      radarData[2][`${brand.brandName}_25F`] = brand.data.laborRate25F;
      radarData[3][`${brand.brandName}_24F`] = brand.data.marginRate24F;
      radarData[3][`${brand.brandName}_25F`] = brand.data.marginRate25F;
      radarData[4][`${brand.brandName}_24F`] = brand.data.expenseRate24F;
      radarData[4][`${brand.brandName}_25F`] = brand.data.expenseRate25F;
    }
  });

  // 최대값 계산 (차트 스케일 조정)
  const allValues: number[] = [];
  radarData.forEach(d => {
    Object.keys(d).forEach(key => {
      if (key !== 'subject' && typeof d[key] === 'number') {
        allValues.push(d[key]);
      }
    });
  });
  const maxValue = Math.max(...allValues);
  const domainMax = Math.ceil(maxValue * 1.2);

  // 브랜드 색상 매핑 (카드 색상과 동일한 파스텔 톤)
  const colorMap: Record<string, string> = {
    'MLB 25FW': '#60a5fa', // blue-400
    'MLB ACC': '#94a3b8', // slate-400
    'MLB KIDS': '#fb7185', // rose-400
    'DISCOVERY': '#34d399', // emerald-400
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-center font-bold text-lg mb-4 text-gray-800">
        브랜드별 원가구조 비교
      </h3>
      
      <ResponsiveContainer width="100%" height={500}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} 
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, domainMax]} 
            tick={{ fontSize: 10 }} 
          />
          {brandsData.map((brand) => {
            const brandColor = colorMap[brand.brandName] || '#6b7280';
            return (
              <React.Fragment key={brand.brandId}>
                <Radar
                  name={`${brand.brandName} (24F)`}
                  dataKey={`${brand.brandName}_24F`}
                  stroke="#9ca3af"
                  fill="#9ca3af"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  hide={true}
                />
                <Radar
                  name={brand.brandName}
                  dataKey={`${brand.brandName}_25F`}
                  stroke={brandColor}
                  fill={brandColor}
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
              </React.Fragment>
            );
          })}
          <Legend 
            wrapperStyle={{ fontSize: '12px', fontWeight: '600' }}
            iconType="line"
          />
          <Tooltip 
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              padding: '10px' 
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AllBrandsRadarChart;

