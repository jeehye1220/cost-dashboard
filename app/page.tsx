'use client';

import React, { useEffect, useState } from 'react';
import EnhancedStoryCards from '@/components/EnhancedStoryCards';
import Dashboard from '@/components/Dashboard';
import CategoryComparison from '@/components/CategoryComparison';
import WaterfallChart from '@/components/WaterfallChart';
import ExecutiveSummary from '@/components/ExecutiveSummary';
import KeyMetricsTable from '@/components/KeyMetricsTable';
import CostRateSummaryTable from '@/components/CostRateSummaryTable';
import { loadCostData, loadSummaryData, loadExchangeRates } from '@/lib/csvParser';
import { CostDataItem } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'25FW' | 'NON'>('25FW');
  const [items, setItems] = useState<CostDataItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 탭에 따라 다른 CSV 파일 로드
        const csvFileName = activeTab === '25FW' ? 'MLB FW.csv' : 'MLB non  251111.csv';
        const fxFileName = activeTab === '25FW' ? 'FX FW.csv' : 'FX 251111.csv';
        const summaryFileName = activeTab === '25FW' ? 'summary_25fw.json' : 'summary.json';
        
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold mb-1">F&F 원가 대시보드 (MLB)</h1>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('25FW')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === '25FW'
                    ? 'bg-white text-slate-800 border-t-4 border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                25FW
              </button>
              <button
                onClick={() => setActiveTab('NON')}
                className={`px-6 py-3 font-semibold text-sm transition-all ${
                  activeTab === 'NON'
                    ? 'bg-white text-slate-800 border-t-4 border-blue-500'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                NON
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 경영진 요약 */}
        <ExecutiveSummary summary={summary} />

        {/* 워터폴 차트 & 주요 지표 비교 */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          <WaterfallChart summary={summary} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <KeyMetricsTable summary={summary} />
            <CostRateSummaryTable summary={summary} />
          </div>
        </div>

        {/* 원가율 카드 - 새로운 디자인 */}
        <EnhancedStoryCards summary={summary} />

        {/* 카테고리 비교 */}
        <CategoryComparison summary={summary} />

        {/* 히트맵 테이블 */}
        <Dashboard items={items} />

        {/* 데이터 정보 */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-8">
          <h3 className="font-bold text-blue-800 mb-2">📊 데이터 정보</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨</p>
            <p>• 원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100</p>
            <p>• USD 환율: 전년 {summary?.fx?.prev?.toLocaleString() || '1,297'} KRW / 당년 {summary?.fx?.curr?.toLocaleString() || '1,415'} KRW</p>
          </div>
        </div>

        {/* 범례 - 실제 존재하는 카테고리만 표시 */}
        <div className="bg-gray-100 rounded-lg p-6 mb-8">
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
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-bold mb-3">F&F 원가 대시보드 (MLB)</h4>
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

