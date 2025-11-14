'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import EnhancedStoryCards from '@/components/EnhancedStoryCards';
import Dashboard from '@/components/Dashboard';
import CategoryComparison from '@/components/CategoryComparison';
import WaterfallChart, { InsightSection } from '@/components/WaterfallChart';
import ExecutiveSummary from '@/components/ExecutiveSummary';
import KeyMetricsTable from '@/components/KeyMetricsTable';
import CostRateSummaryTable from '@/components/CostRateSummaryTable';
import { loadCostData, loadSummaryData, loadExchangeRates } from '@/lib/csvParser';
import { CostDataItem } from '@/lib/types';

export default function BrandDashboard() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brand as string;
  
  const [items, setItems] = useState<CostDataItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    action: string[];
    risk: string[];
    success: string[];
    actionSummary?: string;
    riskSummary?: string;
    successSummary?: string;
    message: string;
  } | null>(null);

  // 모든 브랜드 정보
  const allBrands = [
    { id: '25FW', name: 'MLB 25FW', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700' },
    { id: 'NON', name: 'MLB ACC', icon: 'MLB', iconBg: 'bg-slate-300', textColor: 'text-slate-700' },
    { id: 'KIDS', name: 'MLB KIDS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700' },
    { id: 'DISCOVERY', name: 'DISCOVERY', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700' },
  ];

  // 브랜드 정보
  const brandInfo = {
    '25FW': { 
      name: 'MLB 25FW', 
      color: 'blue',
      headerBg: 'bg-gradient-to-r from-blue-300 to-blue-200',
      headerText: 'text-blue-700',
      headerTextHover: 'hover:text-blue-800',
      infoBg: 'bg-blue-200',
      infoBorder: 'border-blue-300',
      infoTitle: 'text-blue-700',
      infoText: 'text-blue-700',
      buttonBg: 'bg-blue-300',
      buttonHover: 'hover:bg-blue-400',
    },
    'NON': { 
      name: 'MLB ACC', 
      color: 'slate',
      headerBg: 'bg-gradient-to-r from-slate-300 to-slate-200',
      headerText: 'text-slate-700',
      headerTextHover: 'hover:text-slate-800',
      infoBg: 'bg-slate-200',
      infoBorder: 'border-slate-300',
      infoTitle: 'text-slate-700',
      infoText: 'text-slate-700',
      buttonBg: 'bg-slate-300',
      buttonHover: 'hover:bg-slate-400',
    },
    'KIDS': { 
      name: 'MLB KIDS', 
      color: 'red',
      headerBg: 'bg-gradient-to-r from-rose-300 to-rose-200',
      headerText: 'text-rose-700',
      headerTextHover: 'hover:text-rose-800',
      infoBg: 'bg-rose-200',
      infoBorder: 'border-rose-300',
      infoTitle: 'text-rose-700',
      infoText: 'text-rose-700',
      buttonBg: 'bg-rose-300',
      buttonHover: 'hover:bg-rose-400',
    },
    'DISCOVERY': { 
      name: 'DISCOVERY', 
      color: 'green',
      headerBg: 'bg-gradient-to-r from-emerald-300 to-emerald-200',
      headerText: 'text-emerald-700',
      headerTextHover: 'hover:text-emerald-800',
      infoBg: 'bg-emerald-200',
      infoBorder: 'border-emerald-300',
      infoTitle: 'text-emerald-700',
      infoText: 'text-emerald-700',
      buttonBg: 'bg-emerald-300',
      buttonHover: 'hover:bg-emerald-400',
    },
  }[brandId] || { 
    name: 'Unknown', 
    color: 'gray',
    headerBg: 'bg-gradient-to-r from-gray-300 to-gray-200',
    headerText: 'text-gray-700',
    headerTextHover: 'hover:text-gray-800',
    infoBg: 'bg-gray-200',
    infoBorder: 'border-gray-300',
    infoTitle: 'text-gray-700',
    infoText: 'text-gray-700',
    buttonBg: 'bg-gray-300',
    buttonHover: 'hover:bg-gray-400',
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 브랜드에 따라 다른 CSV 파일 로드
        let csvFileName: string;
        let fxFileName: string;
        let summaryFileName: string;
        
        switch (brandId) {
          case '25FW':
            csvFileName = 'MLB FW.csv';
            fxFileName = 'FX FW.csv';
            summaryFileName = 'summary_25fw.json';
            break;
          case 'NON':
            csvFileName = 'MLB non  251111.csv';
            fxFileName = 'FX 251111.csv';
            summaryFileName = 'summary.json';
            break;
          case 'KIDS':
            csvFileName = 'MLB KIDS FW.csv';
            fxFileName = 'MLB KIDS FX FW.csv';
            summaryFileName = 'summary_kids.json';
            break;
          case 'DISCOVERY':
            csvFileName = 'DX FW.csv';
            fxFileName = 'DX FX FW.csv';
            summaryFileName = 'summary_discovery.json';
            break;
          default:
            setError('유효하지 않은 브랜드입니다.');
            setLoading(false);
            return;
        }
        
        // CSV 파일에서 아이템별 데이터 로드
        const costData = await loadCostData(csvFileName, fxFileName);
        setItems(costData);
        
        // summary.json 로드
        const summaryData = await loadSummaryData(summaryFileName);
        
        // 환율 정보 로드하여 summary에 추가
        const fxRates = await loadExchangeRates(fxFileName);
        const enrichedSummary = {
          ...summaryData,
          fx: {
            prev: fxRates.prev,
            curr: fxRates.curr,
            fileName: fxFileName
          }
        };
        
        setSummary(enrichedSummary);
        
        setLoading(false);
      } catch (err) {
        console.error('데이터 로드 오류:', err);
        setError('데이터를 불러오는데 실패했습니다.');
        setLoading(false);
      }
    };

    if (brandId) {
      loadData();
    }
  }, [brandId]);

  // 실제 데이터에 존재하는 카테고리만 필터링
  const availableCategories = React.useMemo(() => {
    const categorySet = new Set(items.map(item => item.category));
    return [
      { id: 'Outer', name: '아우터 (Outer)', color: '#3b82f6' },
      { id: 'Inner', name: '이너 (Inner)', color: '#10b981' },
      { id: 'Bottom', name: '바텀 (Bottom)', color: '#f59e0b' },
      { id: 'Shoes', name: '슈즈 (Shoes)', color: '#8b5cf6' },
      { id: 'Bag', name: '가방 (Bag)', color: '#ec4899' },
      { id: 'Headwear', name: '헤드웨어 (Headwear)', color: '#06b6d4' },
      { id: 'Acc_etc', name: '악세사리 (Acc_etc)', color: '#ef4444' },
    ].filter(cat => categorySet.has(cat.id));
  }, [items]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-16 w-16 border-b-2 ${brandInfo.buttonBg} mx-auto mb-4`}></div>
          <p className="text-gray-600 text-lg">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className={`px-6 py-2 ${brandInfo.buttonBg} ${brandInfo.headerText} rounded-lg ${brandInfo.buttonHover} font-semibold`}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white shadow-md pt-4">
        <div className="w-full px-8 sm:px-12 lg:px-16 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="bg-white rounded-lg shadow-sm p-2 hover:shadow-md transition-all text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">{brandInfo.name} 원가 대시보드</h1>
              </div>
              {/* 브랜드 아이콘 네비게이션 */}
              <div className="flex items-center gap-2">
                {/* 홈 아이콘 */}
                <button
                  onClick={() => router.push('/')}
                  className="bg-gray-200 text-gray-700 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-300 transition-all"
                  title="홈으로"
                >
                  <Home className="w-5 h-5" />
                </button>
                {allBrands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => router.push(`/dashboard/${brand.id}`)}
                    className={`${brand.iconBg} ${brand.textColor} w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm hover:shadow-md transition-all ${
                      brandId === brand.id ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                    }`}
                    title={brand.name}
                  >
                    {brand.id === 'NON' ? 'MLB ACC' : brand.icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600">실시간 데이터 연동</span>
                </div>
                <div>
                  <span className="text-gray-500">마지막 업데이트: 2025-11-11</span>
                </div>
              </div>
              <p className="text-gray-600 text-sm">
                시즌별 원가 분석 및 인사이트 (v1.4.0)
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="w-full max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* 경영진 요약 */}
        <ExecutiveSummary summary={summary} />

        {/* 인사이트 요약 */}
        {summary && (
          <div className="mb-4">
            <InsightSection
              summary={summary}
              onGenerateAI={async () => {
                setLoadingAi(true);
                try {
                  const { total } = summary || {};
                  const materialArtworkChange = (total?.materialRate25F_usd || 0) - (total?.materialRate24F_usd || 0) + 
                    (total?.artworkRate25F_usd || 0) - (total?.artworkRate24F_usd || 0);
                  const laborChange = (total?.laborRate25F_usd || 0) - (total?.laborRate24F_usd || 0);
                  const marginChange = (total?.marginRate25F_usd || 0) - (total?.marginRate24F_usd || 0);
                  const expenseChange = (total?.expenseRate25F_usd || 0) - (total?.expenseRate24F_usd || 0);
                  const exchangeRateEffect = (total?.costRate25F_krw || 0) - (total?.costRate25F_usd || 0);

                  const response = await fetch('/api/generate-comment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      section: 'waterfall',
                      data: {
                        costRate24F_usd: total?.costRate24F_usd || 0,
                        costRate25F_usd: total?.costRate25F_usd || 0,
                        costRate25F_krw: total?.costRate25F_krw || 0,
                        materialArtworkChange: materialArtworkChange,
                        laborChange: laborChange,
                        marginChange: marginChange,
                        expenseChange: expenseChange,
                        exchangeRateEffect: exchangeRateEffect,
                      },
                    }),
                  });

                  if (response.ok) {
                    const result = await response.json();
                    try {
                      const insights = JSON.parse(result.comment);
                      setAiInsights(insights);
                    } catch (e) {
                      console.error('AI 응답 파싱 오류:', e);
                      alert('AI 응답을 처리할 수 없습니다.');
                    }
                  } else {
                    alert('AI 인사이트 생성에 실패했습니다.');
                  }
                } catch (error) {
                  console.error('AI 인사이트 생성 오류:', error);
                  alert('AI 인사이트 생성 중 오류가 발생했습니다.');
                } finally {
                  setLoadingAi(false);
                }
              }}
              loadingAi={loadingAi}
              aiInsights={aiInsights}
            />
          </div>
        )}

        {/* 워터폴 차트 */}
        <div className="mb-4">
          <WaterfallChart summary={summary} />
        </div>

        {/* 주요 지표 비교 & 원가율 변동 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <KeyMetricsTable summary={summary} />
          <CostRateSummaryTable summary={summary} />
        </div>

        {/* 원가율 카드 - 새로운 디자인 */}
        <EnhancedStoryCards summary={summary} />

        {/* 카테고리 비교 */}
        <CategoryComparison summary={summary} />

        {/* 히트맵 테이블 */}
        <Dashboard items={items} />

        {/* 범례 - 실제 존재하는 카테고리만 표시 */}
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <h3 className="font-bold text-gray-800 mb-4">📖 카테고리 색상 범례</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableCategories.map(cat => (
              <div key={cat.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: cat.color }}></div>
                <span className="text-sm text-gray-700">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="w-full max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold mb-3">F&F 원가 대시보드</h4>
              <p className="text-sm text-gray-400">
                시즌별 원가 데이터 분석 및 인사이트 제공
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3">주요 기능</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• 전체/카테고리별 원가율 분석</li>
                <li>• 아이템별 원가 구성 히트맵</li>
                <li>• AI 기반 인사이트 생성</li>
                <li>• 시즌 간 비교 분석</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">문의</h4>
              <p className="text-sm text-gray-400">
                F&F 경영관리팀 FP&A<br />
                Cost Analysis Dashboard
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>© 2025 F&F. All rights reserved. | Version 1.2.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

