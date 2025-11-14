'use client';

import React, { useState, useEffect } from 'react';
import { loadInsightsFromCSV, detectSeasonType } from '@/lib/insightsLoader';
import { saveStructuredInsights } from '@/lib/insightsSaver';

interface WaterfallChartProps {
  summary: any;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({ summary }) => {
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

  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total, fx } = summary;
  
  // 시즌 타입 감지
  const seasonType = detectSeasonType(total.qty24F);
  
  // CSV 인사이트 로드
  useEffect(() => {
    loadInsightsFromCSV(seasonType).then(data => {
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
  }, [seasonType]);

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

  // MLB KIDS 시즌 여부 판별
  const isKIDS = total.qty24F > 600000 && total.qty24F < 700000;
  
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
            <div className="absolute -translate-y-3 bg-white px-3 py-1.5 rounded-lg shadow-md border-2 border-red-200 text-xs font-bold text-red-600 z-10">
              +{exchangeRateEffect.toFixed(1)}%p
            </div>
            <div
              className="rounded-xl flex flex-col items-center justify-center text-white font-bold shadow-lg border-2 border-white/20"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
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
          <p className="text-2xl font-extrabold mb-2 text-red-600">
            +{exchangeRateEffect.toFixed(1)}%p
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            환율 악재로 공급 원가 실손익 상승
          </p>
        </div>
      </div>

      {/* 수식 표시 */}
      <div className="bg-gradient-to-br from-gray-50/80 via-white to-gray-50/50 border border-gray-200 p-4 rounded-xl text-center text-xs text-gray-600 font-medium shadow-sm">
        "USD 기준 {Math.abs(realCostChange).toFixed(1)}%p 개선 
        (소재/아트웍 {materialArtworkChange.toFixed(1)} + 마진 {marginChange.toFixed(1)} + 
        공임 +{laborChange.toFixed(1)} + 경비 +{expenseChange.toFixed(1)}) + 
        환율효과 +{exchangeRateEffect.toFixed(1)}%p = 
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
}

const InsightSection: React.FC<InsightSectionProps> = ({ summary, onGenerateAI, loadingAi, aiInsights }) => {
  const [insightEditMode, setInsightEditMode] = useState<string | null>(null);
  
  const { total } = summary || {};
  
  // 시즌 타입 확인
  const seasonType = detectSeasonType(total?.qty24F || 0);
  
  // MLB KIDS 시즌 여부 판별 (qty24F가 60만~70만 정도면 KIDS)
  const isKIDS = total?.qty24F > 600000 && total?.qty24F < 700000;
  // DISCOVERY 시즌 여부 판별 (qty24F가 120만~140만 정도면 DISCOVERY)
  const isDISCOVERY = total?.qty24F > 1200000 && total?.qty24F < 1400000;
  
  const defaultInsights = isDISCOVERY ? {
    // DISCOVERY 시즌 인사이트
    action: [
      '소재비 절감: 고가 소재(다운, 기능성 원단 등) 사양 재검토 및 대체소재 전환.',
      '공임 효율화: 봉제 자동화·작업공정 단순화로 공임 단가 하락 추진.',
      '원가 모니터링: USD/KRW 원가율을 분리 관리해 환율 영향 실시간 추적.'
    ],
    risk: [
      '환율 리스크: 1,350→1,400(+3.7%) 상승으로 원가율 +0.8%p 악화. → 기준환율 관리 필요.',
      '원자재 리스크: 글로벌 소재 단가 상승, 고가 소재 비중 확대(+0.8%p).',
      '마진 리스크: 협력사 정상마진 확대(2.26→2.34%)로 납품단가 상승 압박 지속.'
    ],
    success: [
      '환율 구조: TAG 원화 고정이므로, 환율 1% 상승 시 원가율 약 +0.25%p 상승. → FX 안정장치 확대 필수.',
      '공급망 구조: 고가 소재 의존도 축소, 소싱 다변화·장기계약화로 원가 안정성 확보.',
      '생산 효율: 공임 효율화 성공사례(BOTTOM/INNER) 타군 확산 필요.'
    ],
    message: '25F 시즌은 원부자재 단가 상승과 원화 약세가 동시에 작용하며 원가율이 USD 기준 +0.5%p, KRW 기준 +0.9%p 악화되었습니다. TAG가 원화로 고정된 구조상, 환율 상승분이 직접 제조원가에 반영되어 수익성 부담이 확대되었습니다. 단기적으로는 소재비 절감, 중기적으로는 소싱 다변화와 공임 효율화를 통한 구조적 원가 방어가 필요합니다.'
  } : isKIDS ? {
    // MLB KIDS 시즌 인사이트
    action: [
      '공임 효율화 강화 → 봉제공정 단순화, 효율 공장 물량 축소. 26F 시즌부터 공임단가 상승분(5.34 USD/pcs)을 최소화해야 환율 리스크 완충 가능',
      '소재 사양 및 디자인 단순화 → 복잡 아트웍·트리밍·부자재 구조를 단순화하여 실제 단가 절감형 원가절감효과 창출 필요'
    ],
    risk: [
      'TAG 의존 구조의 취약성 → 원가율 개선이 TAG 인상(+7.3%) 효과에 의존하고 있어, 환율 상승·할인율 확대 시 즉각적인 원가율 악화 리스크 존재',
      '카테고리별 가격 전가력 차이 → 특히 Inner / Bottom류는 소비자 가격 민감도가 높아 원가 상승분을 TAG에 전가하기 어려워 세밀한 원가관리 필요'
    ],
    success: [
      '원가율 개선 배경 (USD 기준): 평균단가 상승(19.90 → 20.91, +5.1%)에도 불구하고 원가율 23.9% → 23.4%(–0.5%p) 개선. 이는 TAG 인상(91.8 → 98.5, +7.3%)과 고TAG 제품 믹스 확대로 인한 비율상 개선효과이며, 실질적인 원가 절감은 제한적임.',
      '실질 원가 상승 압력: 공임·아트웍 단가 상승 압력 지속 (공임 +13.4%, 아트웍 +31.7%)으로, 단위당 원가 자체는 오히려 상승. 단, Outer·다운류 등 고TAG군 비중 확대(28% → 29%)로 전체 원가율 방어에 성공.'
    ],
    message: '25F 시즌은 TAG 상승(+7.3%)과 Outer 비중 28%→29%(고가제품)을 통해 원가율을 개선한 시즌입니다. 그러나 실질 제조원가는 +5.1% 상승했으며, 특히 공임단가 (4.71→5.34, +13.4%), 아트웍(1.04→1.37, +31.7%)이 급등했습니다. USD 기준 23.9% → 23.4%로 개선되었으나, 환율 상승(+9.4%)으로 KRW 기준은 25.5%로 상승했습니다. 다음 시즌은 가격 효과 의존도를 줄이고, 공임·아트웍 등 실질 제조원가 절감에 집중하여 지속 가능한 수익성을 확보해야 합니다.'
  } : (total?.qty24F > 3000000 && total?.qty24F < 4000000) ? {
    // MLB 25FW 시즌 인사이트
    action: [
      'Inner 공정개선 모델을 Outer·Bottom으로 확대 적용 (Inner 공임 14.76 → 12.69 USD, △2.07 USD 감소)',
      '팬츠·우븐류 봉제 난이도 단순화 및 스티칭 축소 → 원부자재 단가 하락에도 공임비 상승으로 평균원가 개선 폭이 제한된 만큼, 공임 0.5~1.0%p 절감 목표로 설계 단순화 추진',
      '다운점퍼 충전재 믹스 최적화(구스→덕 80/20) 사례를 타 브랜드로 수평 전개하여 소재단가 구조 절감 확산',
      '공임 비중 KPI 설정 및 고임금 라인 전환 계획 수립 (카테고리별 공임 비중 목표화로 생산지 효율 관리)'
    ],
    risk: [
      'Outer·팬츠류 공임 비중 상승 → 봉제 복잡도 및 고임금 라인 투입 증가로 원가율 0.6~1.0%p 악화 가능 → 공정 슬리밍 및 패턴 단순화를 통한 생산성 회복 필요',
      '환율(1,288→1,420원) 상승 영향으로 KRW 기준 원가율 +0.9%p 악화 (USD 기준 개선분 상쇄)'
    ],
    success: [
      '정상마진 –0.2%p 하락 (2.0% → 1.8%) → 벤더 마진 회수 성공, 협상력 개선을 통한 구매단가 절감 효과 확인',
      '충전재 믹스 최적화(구스→덕 80/20)로 소재단가 평균 –1.88 USD 절감 (12.91 → 11.03 USD), 협상이 아닌 조성비 전략 기반 구조적 절감 달성',
      'Inner 봉제공정 단순화로 공임 –2.07 USD 절감 (14.76 → 12.69 USD), 유일하게 실질 제조 효율이 개선된 카테고리',
      'USD 기준 전사 원가율 –0.8%p 개선 (18.2% → 17.4%), 협상력 강화 + 공정 효율화 효과가 병행된 구조적 개선 시즌'
    ],
    message: '25F 시즌은 구스→덕(80/20) 충전재 믹스 조정과 봉제 공정 단순화를 통해 실질 원가 효율이 개선된 시즌입니다. 벤더 마진을 0.2%p 회수하며 협상력이 강화되었으나, 환율 상승(1,288→1,420원)과 공임 부담이 수익성을 압박하였습니다. 다음 시즌은 Outer·Bottom 중심으로 공정 슬리밍과 생산지 효율화를 확대하여 원가율을 안정적으로 관리할 필요가 있습니다.'
  } : {
    // MLB NON 시즌 인사이트
    action: [
      '대량생산 체제 유지 및 확대 → 758만개 생산 규모를 기반으로 협상력 강화. 차기 시즌도 최소 700만개 이상 물량 확보로 고정비 분산 및 단가 협상 우위 유지',
      '고가 믹스 전략 지속 → TAG +23.2% 상승 효과를 활용한 고마진 제품군 확대. 평균 TAG $60 이상 제품 비중을 현재 수준 이상으로 유지하여 원가율 방어',
      '벤더 마진율 관리 체계화 → 정상마진 1.5%→1.3% 절감 성과를 토대로 벤더별 마진 KPI 설정. 대량 발주 시즌 협상력을 활용한 추가 0.2~0.3%p 절감 목표',
      '경비율 최적화 지속 → 물량 증가 시 고정비(물류, 검품, 관리비) 분산 효과로 경비율 1.0%→0.4% 달성. 차기 시즌 목표 0.3% 이하로 설정'
    ],
    risk: [
      '생산단가 급등 리스크 → 평균원가 +15.5% 상승($8.00→$9.24)으로 원가 압박 지속. TAG 상승률(+23.2%)이 둔화될 경우 원가율 즉각 악화 가능',
      '환율 변동성 확대 → 환율 +9.1% 상승(1,297→1,415원)으로 KRW 기준 원가율 +0.4%p 악화. USD 개선분(-1.1%p) 대부분이 환율로 상쇄됨. 추가 환율 상승 시 실손익 급격 악화 우려',
      'TAG 의존 구조 취약성 → 원가율 개선이 TAG 상승에 전적으로 의존. 시장 경쟁 심화 또는 소비 둔화 시 TAG 인상 여력 상실하면 즉시 원가율 악화 전환',
      '카테고리 불균형 심화 → 특정 카테고리(Headwear, Bag 등) 고성장하나 일부는 정체. 믹스 변동 시 전체 원가율 불안정성 증가'
    ],
    success: [
      '대량생산 스케일 메리트 극대화 → 생산수량 +170.8% 증가(444만→759만개)로 규모의 경제 달성. 고정비 분산으로 경비율 1.0%→0.4%(-0.6%p) 개선',
      'TAG 전략적 상승 성공 → 평균TAG +23.2% 증가($51.56→$63.53)로 생산단가 상승(+15.5%) 압력 완전 흡수. 고가 제품 믹스로 평균 판가 구조 개선',
      '벤더 협상력 강화 → 정상마진 1.5%→1.3%(-0.2%p) 절감으로 대량 발주 시즌 협상 우위 입증. 물량 기반 단가 협상 체계 구축',
      'USD 원가율 구조적 개선 → 17.1%→16.0%(-1.1%p)로 원가율 방어 성공. 원가 M/U 5.85→6.25(+0.40) 개선으로 수익성 강화 구조 확립'
    ],
    message: 'NON 시즌은 대량생산(+170.8%)과 TAG 전략적 상승(+23.2%)으로 생산단가 급등(+15.5%)에도 USD 원가율 -1.1%p 개선을 달성한 시즌입니다. 규모의 경제와 고가 믹스 전략이 성공적으로 작용했으나, 환율 상승(+9.1%)으로 KRW 기준 실손익 개선폭은 제한되었습니다. 차기 시즌은 TAG 의존도를 낮추고 실질 제조원가 절감(소재비, 공임비)에 집중하여 환율 변동에도 안정적인 수익 구조를 확보해야 합니다.'
  };

  const [insights, setInsights] = useState(defaultInsights);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [showManageButtons, setShowManageButtons] = useState(false);

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
            {showManageButtons && (
              <button
                onClick={() => handleAdd('action')}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 shadow-sm transition-colors font-medium"
              >
                + 추가
              </button>
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
                    <button
                      onClick={() => setInsightEditMode(`action-${idx}`)}
                      className="ml-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100"
                    >
                      ✏️
                    </button>
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
            {showManageButtons && (
              <button
                onClick={() => handleAdd('risk')}
                className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 shadow-sm transition-colors font-medium"
              >
                + 추가
              </button>
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
                    <button
                      onClick={() => setInsightEditMode(`risk-${idx}`)}
                      className="ml-2 text-xs text-orange-500 opacity-0 group-hover:opacity-100"
                    >
                      ✏️
                    </button>
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
              {(isKIDS || isDISCOVERY) ? '시사점' : '성공 포인트'}
            </h4>
            {showManageButtons && (
              <button
                onClick={() => handleAdd('success')}
                className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 shadow-sm transition-colors font-medium"
              >
                + 추가
              </button>
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
                    <button
                      onClick={() => setInsightEditMode(`success-${idx}`)}
                      className="ml-2 text-xs text-green-500 opacity-0 group-hover:opacity-100"
                    >
                      ✏️
                    </button>
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
                <button
                  onClick={() => setInsightEditMode('message')}
                  className="mt-3 text-sm text-purple-600 hover:text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                >
                  ✏️ 편집
                </button>
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
