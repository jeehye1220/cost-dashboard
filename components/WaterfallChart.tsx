'use client';

import React, { useState, useEffect } from 'react';
import { loadInsightsFromCSV, detectSeasonType, isSummaryDataValid } from '@/lib/insightsLoader';
import { saveStructuredInsights } from '@/lib/insightsSaver';

interface WaterfallChartProps {
  summary: any;
  brandId?: string;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({ summary, brandId }) => {
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
  
  // CSV 인사이트 데이터
  const [csvInsights, setCsvInsights] = useState<any>(null);

  // 디버깅: summary 객체 전체 확인
  console.log('[WaterfallChart] 렌더링 시작:', {
    brandId,
    summaryExists: !!summary,
    summaryTotalExists: !!summary?.total,
    summaryKeys: summary ? Object.keys(summary) : [],
    summaryTotalKeys: summary?.total ? Object.keys(summary.total) : []
  });
  
  if (!summary || !summary.total) {
    console.warn('[WaterfallChart] summary 또는 summary.total이 없습니다:', { 
      summary, 
      brandId,
      summaryType: typeof summary,
      summaryIsNull: summary === null,
      summaryIsUndefined: summary === undefined
    });
    return (
      <div className="bg-gradient-to-br from-blue-50/50 via-white to-pink-50/50 rounded-xl shadow-md border border-blue-100 p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">원가율 변동 분석 (워터폴 차트)</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-800">
          <p className="font-semibold">데이터를 불러오는 중이거나 데이터가 없습니다.</p>
          <p className="text-sm mt-2">브랜드: {brandId}</p>
        </div>
      </div>
    );
  }

  const { total, fx } = summary;
  
  // 디버깅: 데이터 확인
  if (brandId?.includes('NON')) {
    console.log('[WaterfallChart] 데이터 확인:', {
      brandId,
      costRate24F_usd: total.costRate24F_usd,
      costRate25F_usd: total.costRate25F_usd,
      materialRate24F_usd: total.materialRate24F_usd,
      materialRate25F_usd: total.materialRate25F_usd,
      fxPrev: fx?.prev,
      fxCurr: fx?.curr,
      totalKeys: Object.keys(total)
    });
  }
  
  // 시즌 타입 감지 (brandId 우선)
  let seasonType = detectSeasonType(total.qty24F);
  if (brandId?.startsWith('25SS-') || brandId?.startsWith('26SS-') || brandId?.startsWith('26FW-')) {
    seasonType = brandId.startsWith('25SS-') ? '25SS' : 
                 brandId.startsWith('26SS-') ? '26SS' : '26FW';
  } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
    // 25FW 기간의 NON 브랜드들
    seasonType = '25FW';
  } else if (brandId?.startsWith('26SS-') && brandId?.endsWith('-NON')) {
    seasonType = '26SS';
  } else if (brandId?.startsWith('26FW-') && brandId?.endsWith('-NON')) {
    seasonType = '26FW';
  }
  
  // CSV 인사이트 로드
  useEffect(() => {
    loadInsightsFromCSV(seasonType, brandId).then(data => {
      if (data) {
        setCsvInsights(data);
        // CSV 데이터를 aiInsights로 설정
        setAiInsights({
          action: data.actions,
          risk: data.risks,
          success: data.success,
          actionSummary: data.actionSummary,
          riskSummary: data.riskSummary,
          successSummary: data.successSummary,
          message: data.message,
        });
      }
    });
  }, [seasonType, brandId]);

  // 환율 정보 추출 (동적)
  const fxPrev = fx?.prev || 1297;
  const fxCurr = fx?.curr || 1415;

  // 워터폴 데이터 계산
  const materialArtwork24F = total.materialRate24F_usd + total.artworkRate24F_usd;
  const materialArtwork25F = total.materialRate25F_usd + total.artworkRate25F_usd;
  const materialArtworkChange = materialArtwork25F - materialArtwork24F;
  const laborChange = total.laborRate25F_usd - total.laborRate24F_usd;
  const marginChange = total.marginRate25F_usd - total.marginRate24F_usd;
  const expenseChange = total.expenseRate25F_usd - total.expenseRate24F_usd;
  const exchangeRateEffect = total.costRate25F_krw - total.costRate25F_usd;
  const realCostChange = total.costRate25F_usd - total.costRate24F_usd;

  // 당년 USD 원가율 개선/악화 판단 (전년 USD와 비교)
  const usdCostRateChange = realCostChange; // 이미 계산됨
  const usdStatus = usdCostRateChange < 0 ? '개선' : usdCostRateChange > 0 ? '악화' : '동일';
  const usdStatusIcon = usdCostRateChange < 0 ? '✅' : usdCostRateChange > 0 ? '⚠️' : '➡️';
  
  // 당년 KRW 원가율 개선/악화 판단 (당년 USD와 비교 - 환율 효과)
  const krwStatus = exchangeRateEffect > 0 ? '악화' : exchangeRateEffect < 0 ? '개선' : '동일';
  const krwStatusIcon = exchangeRateEffect > 0 ? '⚠️' : exchangeRateEffect < 0 ? '✅' : '➡️';
  
  // 그래프 높이 계산 (변동 바는 시작/끝 박스보다 작게)
  // 전년/당년 원가율 박스: 고정 180px
  // 변동 바: 최대 120px (시작/끝의 2/3), 최소 40px (작은 차이 구분 가능)
  const baseBoxHeight = 180; // 시작/끝 박스 고정 높이
  
  // 변동 바 높이 계산: 값에 비례하되 최소/최대 범위 내
  const maxChangeBarHeight = 120; // 변동 바 최대 높이
  const minChangeBarHeight = 40; // 변동 바 최소 높이
  const getBarHeight = (value: number) => {
    const absValue = Math.abs(value);
    // 0.1%p = 40px, 1.0%p = 120px로 선형 스케일
    const scaledHeight = minChangeBarHeight + (absValue * 80);
    return Math.min(Math.max(minChangeBarHeight, scaledHeight), maxChangeBarHeight);
  };

  const generateAIComment = async () => {
    setLoadingAi(true);
    try {
      const response = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: 'waterfall',
          data: {
            costRate24F_usd: total.costRate24F_usd,
            costRate25F_usd: total.costRate25F_usd,
            costRate25F_krw: total.costRate25F_krw,
            materialArtworkChange: materialArtworkChange,
            laborChange: laborChange,
            marginChange: marginChange,
            expenseChange: expenseChange,
            exchangeRateEffect: exchangeRateEffect,
          },
          brandId: brandId,
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
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/50 via-white to-pink-50/50 rounded-xl shadow-md border border-blue-100 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">
        원가율 변동 폭포수 차트
      </h2>

      {/* 워터폴 박스 차트 */}
      <div className="mb-6 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-end justify-center gap-3 min-h-[350px] px-4">
          {/* 전년 시작 */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                width: '110px',
                height: `${baseBoxHeight}px`
              }}
            >
              <div className="text-3xl mb-1.5 font-extrabold">
                {total.costRate24F_usd.toFixed(1)}%
              </div>
              <div className="text-xs opacity-95 font-semibold">전년 시작</div>
              <div className="text-xs opacity-80 mt-1">USD/KRW</div>
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold">전년 USD</div>
          </div>

          {/* 소재감 (원부자재 포함) */}
          <div className="flex flex-col items-center relative">
            <div className={`absolute -translate-y-3 bg-white px-3 py-1.5 rounded-lg shadow-md border-2 text-xs font-bold z-10 ${materialArtworkChange < 0 ? 'text-blue-600 border-blue-200' : 'text-red-600 border-red-200'}`}>
              {materialArtworkChange > 0 ? '+' : ''}{materialArtworkChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: materialArtworkChange < 0 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                width: '90px',
                height: `${getBarHeight(materialArtworkChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold leading-tight">원부자재변동<br/>(아트웍포함)</div>
          </div>

          {/* 마진 */}
          <div className="flex flex-col items-center relative">
            <div className={`absolute -translate-y-3 bg-white px-3 py-1.5 rounded-lg shadow-md border-2 text-xs font-bold z-10 ${marginChange < 0 ? 'text-blue-600 border-blue-200' : 'text-red-600 border-red-200'}`}>
              {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: marginChange < 0 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                width: '90px',
                height: `${getBarHeight(marginChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold leading-tight">마진<br/>변동</div>
          </div>

          {/* 공임 */}
          <div className="flex flex-col items-center relative">
            <div className={`absolute -translate-y-3 bg-white px-3 py-1.5 rounded-lg shadow-md border-2 text-xs font-bold z-10 ${laborChange < 0 ? 'text-blue-600 border-blue-200' : 'text-red-600 border-red-200'}`}>
              {laborChange > 0 ? '+' : ''}{laborChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: laborChange < 0 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                width: '90px',
                height: `${getBarHeight(laborChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold leading-tight">공임<br/>변동</div>
          </div>

          {/* 경비 */}
          <div className="flex flex-col items-center relative">
            <div className={`absolute -translate-y-3 bg-white px-3 py-1.5 rounded-lg shadow-md border-2 text-xs font-bold z-10 ${expenseChange < 0 ? 'text-blue-600 border-blue-200' : 'text-red-600 border-red-200'}`}>
              {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: expenseChange < 0 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                width: '90px',
                height: `${getBarHeight(expenseChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold leading-tight">경비<br/>변동</div>
          </div>

          {/* 당년 USD */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
                width: '110px',
                height: `${baseBoxHeight}px`
              }}
            >
              <div className="text-3xl mb-1.5 font-extrabold">{total.costRate25F_usd.toFixed(1)}%</div>
              <div className="text-xs opacity-95 font-semibold">당년 USD</div>
              <div className="text-xs opacity-80 mt-1">{usdStatusIcon} {usdStatus}</div>
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold">당년 USD</div>
          </div>

          {/* 환율 효과 */}
          <div className="flex flex-col items-center relative">
            <div className={`absolute -translate-y-3 bg-white px-3 py-1.5 rounded-lg shadow-md border-2 ${exchangeRateEffect > 0 ? 'border-red-200' : exchangeRateEffect < 0 ? 'border-blue-200' : 'border-gray-200'} text-xs font-bold ${exchangeRateEffect > 0 ? 'text-red-600' : exchangeRateEffect < 0 ? 'text-blue-600' : 'text-gray-600'} z-10`}>
              {exchangeRateEffect > 0 ? '+' : ''}{exchangeRateEffect.toFixed(1)}%p
            </div>
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: exchangeRateEffect > 0 
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : exchangeRateEffect < 0
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                width: '100px',
                height: `${getBarHeight(exchangeRateEffect)}px`
              }}
            >
              <div className="text-sm font-semibold">환율효과</div>
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold">FX 영향</div>
          </div>

          {/* 당년 KRW */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                width: '110px',
                height: `${baseBoxHeight}px`
              }}
            >
              <div className="text-3xl mb-1.5 font-extrabold">{total.costRate25F_krw.toFixed(1)}%</div>
              <div className="text-xs opacity-95 font-semibold">당년 KRW</div>
              <div className="text-xs opacity-80 mt-1">{krwStatusIcon} {krwStatus}</div>
            </div>
            <div className="text-xs text-gray-600 mt-3 text-center font-semibold">당년 KRW</div>
          </div>
        </div>
      </div>

      {/* 하단 설명 박스 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 실질원가효과 (Real) */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/50 border border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xl">📊</div>
            <h4 className="font-bold text-gray-800 text-base">실질원가효과 (Real)</h4>
          </div>
          <p className="text-xs text-gray-600 mb-2 font-medium">
            소재/아트웍 공임 마진 경비
          </p>
          <p className={`text-2xl font-extrabold mb-2 ${realCostChange > 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {realCostChange > 0 ? '+' : ''}{realCostChange.toFixed(1)}%p
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            소재/아트웍/마진 절감, 공임/경비 증가
          </p>
        </div>

        {/* 환율효과 (FX) */}
        <div className="bg-gradient-to-br from-orange-50/80 via-white to-orange-50/50 border border-orange-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xl">💱</div>
            <h4 className="font-bold text-gray-800 text-base">환율효과 (FX)</h4>
          </div>
          <p className="text-xs text-gray-600 mb-2 font-medium">
            전년 USD원가율 ({total.costRate24F_usd.toFixed(1)}) × 환율 ({fxPrev.toFixed(2)}→{fxCurr.toFixed(2)})
          </p>
          <p className={`text-2xl font-extrabold mb-2 ${exchangeRateEffect > 0 ? 'text-red-600' : exchangeRateEffect < 0 ? 'text-blue-600' : 'text-gray-600'}`}>
            {exchangeRateEffect > 0 ? '+' : ''}{exchangeRateEffect.toFixed(1)}%p
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            {exchangeRateEffect > 0 
              ? '환율 악재로 공급 원가 실손익 상승'
              : exchangeRateEffect < 0
              ? '환율 호재로 공급 원가 실손익 개선'
              : '환율 영향 없음'}
          </p>
        </div>
      </div>

      {/* 수식 표시 */}
      <div className="bg-gradient-to-br from-gray-50/80 via-white to-gray-50/50 border border-gray-200 p-4 rounded-xl text-center text-xs text-gray-600 font-medium shadow-sm">
        "USD 기준 {Math.abs(realCostChange).toFixed(1)}%p 개선 
        (소재/아트웍 {materialArtworkChange.toFixed(1)} + 마진 {marginChange.toFixed(1)} + 
        공임 +{laborChange.toFixed(1)} + 경비 +{expenseChange.toFixed(1)}) + 
        환율효과 {exchangeRateEffect > 0 ? '+' : ''}{exchangeRateEffect.toFixed(1)}%p = 
        KRW 기준 {(total.costRate25F_krw - total.costRate24F_usd).toFixed(1)}%p 악화"
      </div>
    </div>
  );
};

// InsightSection 컴포넌트
interface InsightSectionProps {
  summary: any;
  onGenerateAI: () => void;
  loadingAi: boolean;
  aiInsights: {
    action: string[];
    risk: string[];
    success: string[];
    actionSummary?: string;
    riskSummary?: string;
    successSummary?: string;
    message: string;
  } | null;
  brandId?: string;
}

const InsightSection: React.FC<InsightSectionProps> = ({ summary, onGenerateAI, loadingAi, aiInsights, brandId }) => {
  const [insightEditMode, setInsightEditMode] = useState<string | null>(null);
  const [loadingAISection, setLoadingAISection] = useState<{[key: string]: boolean}>({});
  
  // 데이터 유효성 검사 - 데이터가 없으면 인사이트 섹션을 표시하지 않음
  if (!summary || !isSummaryDataValid(summary)) {
    return null;
  }
  
  const { total } = summary || {};
  
  // 시즌 타입 확인 (brandId 우선)
  let seasonType = detectSeasonType(total?.qty24F || 0);
  if (brandId?.startsWith('25SS-') || brandId?.startsWith('26SS-') || brandId?.startsWith('26FW-')) {
    seasonType = brandId.startsWith('25SS-') ? '25SS' : 
                 brandId.startsWith('26SS-') ? '26SS' : '26FW';
  } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
    // 25FW 기간의 NON 브랜드들
    seasonType = '25FW';
  } else if (brandId?.startsWith('26SS-') && brandId?.endsWith('-NON')) {
    seasonType = '26SS';
  } else if (brandId?.startsWith('26FW-') && brandId?.endsWith('-NON')) {
    seasonType = '26FW';
  }
  
  // 하드코딩된 시즌 판별 로직 제거 - brandId 기반으로만 판별
  
  // 하드코딩된 인사이트 제거 - CSV에서만 로드
  const [insights, setInsights] = useState<{
    action: string[];
    risk: string[];
    success: string[];
    message: string;
  }>({
    action: [],
    risk: [],
    success: [],
    message: '',
  });
  const [editMode, setEditMode] = useState<string | null>(null);
  const [showManageButtons, setShowManageButtons] = useState(false);

  // CSV에서만 인사이트 로드 (하드코딩 제거) - 데이터가 유효할 때만
  React.useEffect(() => {
    if (isSummaryDataValid(summary)) {
      loadInsightsFromCSV(seasonType, brandId).then(data => {
        if (data && (data.actions?.length > 0 || data.risks?.length > 0 || data.success?.length > 0 || data.message)) {
          // CSV 데이터만 사용 (하드코딩 제거)
          setInsights({
            action: data.actions || [],
            risk: data.risks || [],
            success: data.success || [],
            message: data.message || '',
          });
        } else {
          // CSV에 데이터가 없으면 빈 상태 유지
          setInsights({
            action: [],
            risk: [],
            success: [],
            message: '',
          });
        }
      });
    }
  }, [seasonType, brandId, summary]);

  // aiInsights prop이 있으면 업데이트 (AI 생성된 경우)
  React.useEffect(() => {
    if (aiInsights) {
      setInsights(aiInsights);
    }
  }, [aiInsights]);

  // Alt 키 감지 (관리 버튼 표시/숨김)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        setShowManageButtons(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) {
        setShowManageButtons(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // CSV 파일에 저장하는 함수
  const saveToCSV = async () => {
    const insightsData = {
      actions: insights.action,
      risks: insights.risk,
      success: insights.success,
      actionSummary: aiInsights?.actionSummary,
      riskSummary: aiInsights?.riskSummary,
      successSummary: aiInsights?.successSummary,
      message: insights.message,
    };
    
    const success = await saveStructuredInsights(seasonType, insightsData);
    if (success) {
      // 저장 성공 (알림은 선택사항)
    } else {
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleEdit = (section: string, index: number, value: string) => {
    const sectionData = insights[section as keyof typeof insights];
    if (Array.isArray(sectionData)) {
      const newData = [...sectionData];
      newData[index] = value;
      setInsights({ ...insights, [section]: newData });
    }
  };

  const handleAdd = async (section: string) => {
    const sectionData = insights[section as keyof typeof insights];
    if (Array.isArray(sectionData)) {
      setInsights({ ...insights, [section]: [...sectionData, '새 항목'] });
      await saveToCSV();
    }
  };

  const handleDelete = async (section: string, index: number) => {
    const sectionData = insights[section as keyof typeof insights];
    if (Array.isArray(sectionData)) {
      const newData = sectionData.filter((_, i) => i !== index);
      setInsights({ ...insights, [section]: newData });
      await saveToCSV();
    }
  };

  // 각 섹션별 AI 생성 함수
  const generateAISection = async (section: 'action' | 'risk' | 'success' | 'message') => {
    setLoadingAISection({ ...loadingAISection, [section]: true });
    try {
      // 워터폴 데이터 계산
      const materialArtwork24F = total.materialRate24F_usd + total.artworkRate24F_usd;
      const materialArtwork25F = total.materialRate25F_usd + total.artworkRate25F_usd;
      const materialArtworkChange = materialArtwork25F - materialArtwork24F;
      const laborChange = total.laborRate25F_usd - total.laborRate24F_usd;
      const marginChange = total.marginRate25F_usd - total.marginRate24F_usd;
      const expenseChange = total.expenseRate25F_usd - total.expenseRate24F_usd;
      const exchangeRateEffect = total.costRate25F_krw - total.costRate25F_usd;

      const response = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: `waterfall_${section}`,
          data: {
            costRate24F_usd: total.costRate24F_usd,
            costRate25F_usd: total.costRate25F_usd,
            costRate25F_krw: total.costRate25F_krw,
            materialArtworkChange: materialArtworkChange,
            laborChange: laborChange,
            marginChange: marginChange,
            expenseChange: expenseChange,
            exchangeRateEffect: exchangeRateEffect,
          },
          brandId: brandId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (section === 'message') {
          // message는 텍스트 형식
          setInsights({ ...insights, message: result.comment });
        } else {
          // action, risk, success는 JSON 형식
          try {
            const parsed = JSON.parse(result.comment);
            if (parsed[section] && Array.isArray(parsed[section])) {
              setInsights({ ...insights, [section]: parsed[section] });
            }
          } catch (e) {
            console.error('AI 응답 파싱 오류:', e);
            alert('AI 응답을 처리할 수 없습니다.');
          }
        }
        await saveToCSV();
      } else {
        alert('AI 인사이트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 인사이트 생성 오류:', error);
      alert('AI 인사이트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoadingAISection({ ...loadingAISection, [section]: false });
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {/* 3단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 즉시 액션 */}
        <div className="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 rounded-xl p-5 shadow-md border-2 border-red-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-red-700 flex items-center gap-2 text-lg">
              <span className="text-2xl">⏰</span>
              즉시 액션
            </h4>
            {process.env.NODE_ENV !== 'production' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateAISection('action')}
                  disabled={loadingAISection['action']}
                  className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI 생성"
                >
                  {loadingAISection['action'] ? '⏳ 생성 중...' : '🤖 AI 생성'}
                </button>
                {showManageButtons && (
                  <button
                    onClick={() => handleAdd('action')}
                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 shadow-sm transition-colors font-medium"
                  >
                    + 추가
                  </button>
                )}
              </div>
            )}
          </div>
          {aiInsights?.actionSummary && (
            <div className="mb-4 p-3 bg-red-100 rounded-lg text-sm text-red-900 font-medium border border-red-200">
              {aiInsights.actionSummary}
            </div>
          )}
          <ul className="space-y-3">
            {insights.action.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm bg-white rounded-lg p-3 shadow-sm border border-red-100 hover:border-red-200 transition-colors">
                <span className="text-red-500 mt-0.5 font-bold text-base">•</span>
                {insightEditMode === `action-${idx}` ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleEdit('action', idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        await saveToCSV();
                        setInsightEditMode(null);
                      }}
                      className="text-xs bg-blue-500 text-white px-2 rounded"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleDelete('action', idx)}
                      className="text-xs bg-red-500 text-white px-2 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 group">
                    <span className="text-gray-700">{item}</span>
                    {process.env.NODE_ENV !== 'production' && (
                      <button
                        onClick={() => setInsightEditMode(`action-${idx}`)}
                        className="ml-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 리스크 관리 */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-xl p-5 shadow-md border-2 border-orange-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-orange-700 flex items-center gap-2 text-lg">
              <span className="text-2xl">⚠️</span>
              리스크 관리
            </h4>
            {process.env.NODE_ENV !== 'production' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateAISection('risk')}
                  disabled={loadingAISection['risk']}
                  className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI 생성"
                >
                  {loadingAISection['risk'] ? '⏳ 생성 중...' : '🤖 AI 생성'}
                </button>
                {showManageButtons && (
                  <button
                    onClick={() => handleAdd('risk')}
                    className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 shadow-sm transition-colors font-medium"
                  >
                    + 추가
                  </button>
                )}
              </div>
            )}
          </div>
          {aiInsights?.riskSummary && (
            <div className="mb-4 p-3 bg-orange-100 rounded-lg text-sm text-orange-900 font-medium border border-orange-200">
              {aiInsights.riskSummary}
            </div>
          )}
          <ul className="space-y-3">
            {insights.risk.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm bg-white rounded-lg p-3 shadow-sm border border-orange-100 hover:border-orange-200 transition-colors">
                <span className="text-orange-500 mt-0.5 font-bold text-base">•</span>
                {insightEditMode === `risk-${idx}` ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleEdit('risk', idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => setInsightEditMode(null)}
                      className="text-xs bg-orange-500 text-white px-2 rounded"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleDelete('risk', idx)}
                      className="text-xs bg-red-500 text-white px-2 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 group">
                    <span className="text-gray-700">{item}</span>
                    {process.env.NODE_ENV !== 'production' && (
                      <button
                        onClick={() => setInsightEditMode(`risk-${idx}`)}
                        className="ml-2 text-xs text-orange-500 opacity-0 group-hover:opacity-100"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 성공 포인트 / 시사점 (KIDS는 시사점) */}
        <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-5 shadow-md border-2 border-green-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-green-700 flex items-center gap-2 text-lg">
              <span className="text-2xl">💡</span>
              시사점
            </h4>
            {process.env.NODE_ENV !== 'production' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generateAISection('success')}
                  disabled={loadingAISection['success']}
                  className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title="AI 생성"
                >
                  {loadingAISection['success'] ? '⏳ 생성 중...' : '🤖 AI 생성'}
                </button>
                {showManageButtons && (
                  <button
                    onClick={() => handleAdd('success')}
                    className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 shadow-sm transition-colors font-medium"
                  >
                    + 추가
                  </button>
                )}
              </div>
            )}
          </div>
          {aiInsights?.successSummary && (
            <div className="mb-4 p-3 bg-green-100 rounded-lg text-sm text-green-900 font-medium border border-green-200">
              {aiInsights.successSummary}
            </div>
          )}
          <ul className="space-y-3">
            {insights.success.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm bg-white rounded-lg p-3 shadow-sm border border-green-100 hover:border-green-200 transition-colors">
                <span className="text-green-500 mt-0.5 font-bold text-base">•</span>
                {insightEditMode === `success-${idx}` ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleEdit('success', idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => setInsightEditMode(null)}
                      className="text-xs bg-green-500 text-white px-2 rounded"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleDelete('success', idx)}
                      className="text-xs bg-red-500 text-white px-2 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 group">
                    <span className="text-gray-700">{item}</span>
                    {process.env.NODE_ENV !== 'production' && (
                      <button
                        onClick={() => setInsightEditMode(`success-${idx}`)}
                        className="ml-2 text-xs text-green-500 opacity-0 group-hover:opacity-100"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 경영진 핵심 메시지 */}
      <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="text-3xl">⭐</div>
          <div className="flex-1">
            <h4 className="font-bold text-purple-800 mb-3 text-lg">경영진 핵심 메시지</h4>
            {insightEditMode === 'message' ? (
              <div>
                <textarea
                  value={insights.message}
                  onChange={(e) => setInsights({ ...insights, message: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows={3}
                  autoFocus
                />
                <button
                  onClick={async () => {
                    await saveToCSV();
                    setInsightEditMode(null);
                  }}
                  className="mt-2 text-sm bg-purple-500 text-white px-4 py-1 rounded"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="group">
                <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                  <p className="text-gray-700 text-sm leading-relaxed">{insights.message}</p>
                </div>
                {process.env.NODE_ENV !== 'production' && (
                  <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => generateAISection('message')}
                      disabled={loadingAISection['message']}
                      className="text-sm bg-purple-500 text-white px-3 py-1.5 rounded-lg hover:bg-purple-600 shadow-sm transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      title="AI 생성"
                    >
                      {loadingAISection['message'] ? '⏳ 생성 중...' : '🤖 AI 생성'}
                    </button>
                    <button
                      onClick={() => setInsightEditMode('message')}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      ✏️ 편집
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterfallChart;

// InsightSection을 별도로 export
export { InsightSection };
