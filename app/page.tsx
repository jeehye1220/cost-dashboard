'use client';

import React, { useEffect, useState } from 'react';
import EnhancedStoryCards from '@/components/EnhancedStoryCards';
import Dashboard from '@/components/Dashboard';
import CategoryComparison from '@/components/CategoryComparison';
import WaterfallChart, { InsightSection } from '@/components/WaterfallChart';
import ExecutiveSummary from '@/components/ExecutiveSummary';
import KeyMetricsTable from '@/components/KeyMetricsTable';
import CostRateSummaryTable from '@/components/CostRateSummaryTable';
import { loadCostData, loadSummaryData, loadExchangeRates } from '@/lib/csvParser';
import { CostDataItem } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'25FW' | 'NON' | 'KIDS' | 'DISCOVERY'>('25FW');
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 탭에 따라 다른 CSV 파일 로드
        let csvFileName: string;
        let fxFileName: string;
        let summaryFileName: string;
        
        switch (activeTab) {
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
            csvFileName = 'MLB FW.csv';
            fxFileName = 'FX FW.csv';
            summaryFileName = 'summary_25fw.json';
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

    loadData();
  }, [activeTab]);

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
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-md">
        <div className="w-full max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
          <h1 className="text-2xl font-bold mb-1">F&F 원가 대시보드</h1>
          <p className="text-slate-200 text-sm">
            시즌별 원가 분석 및 인사이트 (v1.4.0)
          </p>
          <div className="mt-3 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-slate-200">실시간 데이터 연동</span>
            </div>
            <div>
              <span className="text-slate-300">마지막 업데이트: 2025-11-11</span>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="bg-slate-800/50 border-t border-slate-600">
          <div className="w-full max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('25FW')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === '25FW'
                    ? 'bg-white text-slate-800 border-t-4 border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                MLB 25FW
              </button>
              <button
                onClick={() => setActiveTab('NON')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === 'NON'
                    ? 'bg-white text-slate-800 border-t-4 border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                MLB NON
              </button>
              <button
                onClick={() => setActiveTab('KIDS')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === 'KIDS'
                    ? 'bg-white text-slate-800 border-t-4 border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                MLB KIDS
              </button>
              <button
                onClick={() => setActiveTab('DISCOVERY')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === 'DISCOVERY'
                    ? 'bg-white text-slate-800 border-t-4 border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                DISCOVERY
              </button>
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

        {/* 데이터 정보 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
          <h3 className="font-bold text-blue-800 mb-2">📊 데이터 정보</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨</p>
            <p>• 원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100</p>
            <p>• USD 환율: 전년 {summary?.fx?.prev?.toFixed(2) || '1297.00'} KRW / 당년 {summary?.fx?.curr?.toFixed(2) || '1415.00'} KRW</p>
          </div>
        </div>

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

