'use client';

import React, { useState } from 'react';

interface WaterfallChartProps {
  summary: any;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({ summary }) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiInsights, setAiInsights] = useState<{
    action: string[];
    risk: string[];
    success: string[];
    message: string;
  } | null>(null);

  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total, fx } = summary;

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

  // 그래프 높이 계산 (비례 스케일: 1%p = 100px)
  const heightScale = 100; // 1%p당 100px (차이를 명확하게 표시)
  const minHeight = 50; // 최소 높이
  
  const getBarHeight = (value: number) => {
    return Math.max(minHeight, Math.abs(value) * heightScale);
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <h2 className="text-lg font-bold text-gray-700 mb-4">
        원가율 변동 폭포수 차트
      </h2>

      {/* 워터폴 박스 차트 */}
      <div className="mb-6">
        <div className="flex items-end justify-center gap-2 min-h-[350px] px-2">
          {/* 전년 시작 */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-lg"
              style={{
                backgroundColor: '#64748b',
                width: '100px',
                height: '180px'
              }}
            >
              <div className="text-2xl mb-1">{total.costRate24F_usd.toFixed(1)}%</div>
              <div className="text-xs opacity-90">전년 시작</div>
              <div className="text-xs opacity-75 mt-1">USD/KRW</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">전년 USD</div>
          </div>

          {/* 소재감 (원부자재 포함) */}
          <div className="flex flex-col items-center">
            <div className={`absolute -translate-y-2 bg-white px-2 py-1 rounded shadow text-xs font-bold ${materialArtworkChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {materialArtworkChange > 0 ? '+' : ''}{materialArtworkChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: materialArtworkChange < 0 ? '#10b981' : '#ef4444',
                width: '80px',
                height: `${getBarHeight(materialArtworkChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">원부자재변동<br/>(아트웍포함)</div>
          </div>

          {/* 마진 */}
          <div className="flex flex-col items-center">
            <div className={`absolute -translate-y-2 bg-white px-2 py-1 rounded shadow text-xs font-bold ${marginChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {marginChange > 0 ? '+' : ''}{marginChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: marginChange < 0 ? '#10b981' : '#ef4444',
                width: '80px',
                height: `${getBarHeight(marginChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">마진<br/>변동</div>
          </div>

          {/* 공임 */}
          <div className="flex flex-col items-center">
            <div className={`absolute -translate-y-2 bg-white px-2 py-1 rounded shadow text-xs font-bold ${laborChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {laborChange > 0 ? '+' : ''}{laborChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: laborChange < 0 ? '#10b981' : '#ef4444',
                width: '80px',
                height: `${getBarHeight(laborChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">공임<br/>변동</div>
          </div>

          {/* 경비 */}
          <div className="flex flex-col items-center">
            <div className={`absolute -translate-y-2 bg-white px-2 py-1 rounded shadow text-xs font-bold ${expenseChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {expenseChange > 0 ? '+' : ''}{expenseChange.toFixed(1)}%p
            </div>
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: expenseChange < 0 ? '#10b981' : '#ef4444',
                width: '80px',
                height: `${getBarHeight(expenseChange)}px`
              }}
            >
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">경비<br/>변동</div>
          </div>

          {/* 당년 USD */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: '#818cf8',
                width: '100px',
                height: '180px'
              }}
            >
              <div className="text-2xl mb-1">{total.costRate25F_usd.toFixed(1)}%</div>
              <div className="text-xs opacity-90">당년 USD</div>
              <div className="text-xs opacity-75 mt-1">✅ 개선</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">당년 USD</div>
          </div>

          {/* 환율 효과 */}
          <div className="flex flex-col items-center">
            <div className="absolute -translate-y-2 bg-white px-2 py-1 rounded shadow text-xs font-bold text-red-600">
              +{exchangeRateEffect.toFixed(1)}%p
            </div>
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: '#ef4444',
                width: '100px',
                height: `${getBarHeight(exchangeRateEffect)}px`
              }}
            >
              <div className="text-sm">환율효과</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">FX 영향</div>
          </div>

          {/* 당년 KRW */}
          <div className="flex flex-col items-center">
            <div
              className="rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-md"
              style={{
                backgroundColor: '#f97316',
                width: '100px',
                height: '200px'
              }}
            >
              <div className="text-2xl mb-1">{total.costRate25F_krw.toFixed(1)}%</div>
              <div className="text-xs opacity-90">당년 KRW</div>
              <div className="text-xs opacity-75 mt-1">⚠️ 악화</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center font-medium">당년 KRW</div>
          </div>
        </div>
      </div>

      {/* 하단 설명 박스 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* 실질원가효과 (Real) */}
        <div className="bg-blue-50/70 border-l-4 border-blue-400 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-base">📊</div>
            <h4 className="font-semibold text-gray-700 text-sm">실질원가효과 (Real)</h4>
          </div>
          <p className="text-xs text-gray-600 mb-1">
            소재/아트웍 공임 마진 경비
          </p>
          <p className="text-xl font-bold text-green-600">
            {realCostChange.toFixed(1)}%p
          </p>
          <p className="text-xs text-gray-500 mt-1">
            소재/아트웍/마진 절감, 공임/경비 증가
          </p>
        </div>

        {/* 환율효과 (FX) */}
        <div className="bg-orange-50/70 border-l-4 border-orange-400 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-base">💱</div>
            <h4 className="font-semibold text-gray-700 text-sm">환율효과 (FX)</h4>
          </div>
          <p className="text-xs text-gray-600 mb-1">
            전년 USD원가율 ({total.costRate25F_usd.toFixed(1)}) × 환율 ({fxPrev.toLocaleString()}→{fxCurr.toLocaleString()})
          </p>
          <p className="text-xl font-bold text-red-600">
            +{exchangeRateEffect.toFixed(1)}%p
          </p>
          <p className="text-xs text-gray-500 mt-1">
            환율 악재로 공급 원가 실손익 상승
          </p>
        </div>
      </div>

      {/* 수식 표시 */}
      <div className="bg-gray-50 p-2.5 rounded-lg text-center text-xs text-gray-500 mb-4 italic">
        "USD 기준 {Math.abs(realCostChange).toFixed(1)}%p 개선 
        (소재/아트웍 {materialArtworkChange.toFixed(1)} + 마진 {marginChange.toFixed(1)} + 
        공임 +{laborChange.toFixed(1)} + 경비 +{expenseChange.toFixed(1)}) + 
        환율효과 +{exchangeRateEffect.toFixed(1)}%p = 
        KRW 기준 {(total.costRate25F_krw - total.costRate24F_usd).toFixed(1)}%p 악화"
      </div>

      {/* Insight Section */}
      <InsightSection
        summary={summary}
        onGenerateAI={generateAIComment}
        loadingAi={loadingAi}
        aiInsights={aiInsights}
      />
    </div>
  );
};

// InsightSection 컴포넌트 (기존 코드 유지)
interface InsightSectionProps {
  summary: any;
  onGenerateAI: () => void;
  loadingAi: boolean;
  aiInsights: {
    action: string[];
    risk: string[];
    success: string[];
    message: string;
  } | null;
}

const InsightSection: React.FC<InsightSectionProps> = ({ summary, onGenerateAI, loadingAi, aiInsights }) => {
  const [editMode, setEditMode] = useState<string | null>(null);
  
  const { total } = summary || {};
  
  const defaultInsights = {
    action: [
      'Inner 공정개선 모델을 Outer·Bottom으로 확대 적용 (Inner 공임 14.76 → 12.69 USD, △2.07 USD 감소)',
      '팬츠·우븐류 봉제 난이도 단순화 및 스티칭 축소 → 원부자재 단가 하락에도 공임비 상승으로 평균원가 개선 폭이 제한된 만큼, 공임 0.5~1.0%p 절감 목표로 설계 단순화 추진',
      '다운점퍼 충전재 믹스 최적화(구스→덕 80/20) 사례를 타 브랜드로 수평 전개하여 소재단가 구조 절감 확산',
      '공임 비중 KPI 설정 및 고임금 라인 전환 계획 수립 (카테고리별 공임 비중 목표화로 생산지 효율 관리)'
    ],
    risk: [
      'Outer·팬츠류 공임 비중 상승 → 봉제 복잡도 및 고임금 라인 투입 증가로 원가율 0.6~1.0%p 악화 가능 → 공정 슬리밍 및 패턴 단순화를 통한 생산성 회복 필요',
      '환율(1,288→1,420원) 상승 영향으로 KRW 기준 원가율 +0.9%p 악화 (USD 기준 개선분 상쇄)',
      'USD 결제 벤더 환노출 구간 관리 및 환헤지 전략 강화 (재무팀 협업 필요)'
    ],
    success: [
      '정상마진 –0.2%p 하락 (2.0% → 1.8%) → 벤더 마진 회수 성공, 협상력 개선을 통한 구매단가 절감 효과 확인',
      '충전재 믹스 최적화(구스→덕 80/20)로 소재단가 평균 –1.88 USD 절감 (12.91 → 11.03 USD), 협상이 아닌 조성비 전략 기반 구조적 절감 달성',
      'Inner 봉제공정 단순화로 공임 –2.07 USD 절감 (14.76 → 12.69 USD), 유일하게 실질 제조 효율이 개선된 카테고리',
      'USD 기준 전사 원가율 –0.8%p 개선 (18.2% → 17.4%), 협상력 강화 + 공정 효율화 효과가 병행된 구조적 개선 시즌'
    ],
    message: '25F 시즌은 구스→덕(80/20) 충전재 믹스 조정과 봉제 공정 단순화를 통해 실질 원가 효율이 개선된 시즌입니다. 벤더 마진을 0.2%p 회수하며 협상력이 강화되었으나, 환율 상승(1,288→1,420원)과 공임 부담이 수익성을 압박하였습니다. 다음 시즌은 Outer·Bottom 중심으로 공정 슬리밍과 생산지 효율화를 확대하여 원가율을 안정적으로 관리할 필요가 있습니다.'
  };

  const [insights, setInsights] = useState(defaultInsights);

  React.useEffect(() => {
    if (aiInsights) {
      setInsights(aiInsights);
    }
  }, [aiInsights]);

  const handleEdit = (section: string, index: number, value: string) => {
    const sectionData = insights[section as keyof typeof insights];
    if (Array.isArray(sectionData)) {
      const newData = [...sectionData];
      newData[index] = value;
      setInsights({ ...insights, [section]: newData });
    }
  };

  const handleAdd = (section: string) => {
    const sectionData = insights[section as keyof typeof insights];
    if (Array.isArray(sectionData)) {
      setInsights({ ...insights, [section]: [...sectionData, '새 항목'] });
    }
  };

  const handleDelete = (section: string, index: number) => {
    const sectionData = insights[section as keyof typeof insights];
    if (Array.isArray(sectionData)) {
      const newData = sectionData.filter((_, i) => i !== index);
      setInsights({ ...insights, [section]: newData });
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {/* 3단 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 즉시 액션 */}
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-blue-800 flex items-center gap-2">
              🎯 즉시 액션
            </h4>
            <button
              onClick={() => handleAdd('action')}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
            >
              + 추가
            </button>
          </div>
          <ul className="space-y-2">
            {insights.action.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-blue-600 mt-0.5">•</span>
                {editMode === `action-${idx}` ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleEdit('action', idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditMode(null)}
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
                      onClick={() => setEditMode(`action-${idx}`)}
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
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-orange-800 flex items-center gap-2">
              ⚠️ 리스크 관리
            </h4>
            <button
              onClick={() => handleAdd('risk')}
              className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
            >
              + 추가
            </button>
          </div>
          <ul className="space-y-2">
            {insights.risk.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-orange-600 mt-0.5">•</span>
                {editMode === `risk-${idx}` ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleEdit('risk', idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditMode(null)}
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
                      onClick={() => setEditMode(`risk-${idx}`)}
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

        {/* 성공 포인트 */}
        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-green-800 flex items-center gap-2">
              ✅ 성공 포인트
            </h4>
            <button
              onClick={() => handleAdd('success')}
              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
            >
              + 추가
            </button>
          </div>
          <ul className="space-y-2">
            {insights.success.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-green-600 mt-0.5">•</span>
                {editMode === `success-${idx}` ? (
                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleEdit('success', idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditMode(null)}
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
                      onClick={() => setEditMode(`success-${idx}`)}
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
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border-l-4 border-purple-500 shadow-md">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📌</div>
          <div className="flex-1">
            <h4 className="font-bold text-purple-800 mb-2">경영진 핵심 메시지</h4>
            {editMode === 'message' ? (
              <div>
                <textarea
                  value={insights.message}
                  onChange={(e) => setInsights({ ...insights, message: e.target.value })}
                  className="w-full px-3 py-2 border rounded text-sm"
                  rows={3}
                  autoFocus
                />
                <button
                  onClick={() => setEditMode(null)}
                  className="mt-2 text-sm bg-purple-500 text-white px-4 py-1 rounded"
                >
                  저장
                </button>
              </div>
            ) : (
              <div className="group">
                <p className="text-gray-700 text-sm leading-relaxed">{insights.message}</p>
                <button
                  onClick={() => setEditMode('message')}
                  className="mt-2 text-sm text-purple-500 opacity-0 group-hover:opacity-100"
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
