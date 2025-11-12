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

  const { total } = summary;

  // 워터폴 데이터 계산
  const materialArtwork24F = total.materialRate24F_usd + total.artworkRate24F_usd;
  const materialArtwork25F = total.materialRate25F_usd + total.artworkRate25F_usd;
  const materialArtworkChange = materialArtwork25F - materialArtwork24F;
  const laborChange = total.laborRate25F_usd - total.laborRate24F_usd;
  const marginChange = total.marginRate25F_usd - total.marginRate24F_usd;
  const expenseChange = total.expenseRate25F_usd - total.expenseRate24F_usd;
  const exchangeRateEffect = total.costRate25F_krw - total.costRate25F_usd;
  const realCostChange = total.costRate25F_usd - total.costRate24F_usd;

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
        <div className="flex items-end justify-center gap-2 min-h-[280px] px-2">
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
                height: `${Math.max(70, Math.abs(materialArtworkChange) * 40)}px`
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
                height: `${Math.max(50, Math.abs(marginChange) * 80)}px`
              }}
            >
              <div className="text-xs opacity-90">마진</div>
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
                height: `${Math.max(60, Math.abs(laborChange) * 80)}px`
              }}
            >
              <div className="text-xs opacity-90">공임</div>
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
                height: `${Math.max(45, Math.abs(expenseChange) * 150)}px`
              }}
            >
              <div className="text-xs opacity-90">경비</div>
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
                height: `${Math.max(90, Math.abs(exchangeRateEffect) * 25)}px`
              }}
            >
              <div className="text-base mb-1">환율<br/>효과</div>
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
            전년 USD원가율 ({total.costRate25F_usd.toFixed(1)}) × 환율 (1,297→1,415)
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
  
  const defaultInsights = {
    action: [
      'Shoes 원부자재 절감 성과(-1.4%p)를 Bag/Acc_etc로 확대: 소재 표준화 및 공급사 통합',
      'Bag 공임비(+0.4%p) 및 Shoes 공임 단가(+27%) 억제: 공정 단순화 및 자동화 투자',
      '환율 헤지 전략 수립: 환율 상승(+9.1%)으로 KRW 원가율 악화 방어',
      'Bag 고마진 구조(2.2%)를 전 카테고리로 확산하여 마진율 추가 개선',
      '경비율 절감 성과(-0.6%p) 유지: 물량 증가 기반 고정비 분산 극대화',
      'Bag(-0.4%p) 및 Acc_etc(-0.1%p) 원가 개선 가속화'
    ],
    risk: [
      '환율 상승에 따른 KRW 원가 압력 지속 (1,420원 수준)',
      '생산량 급증(+170.8%)에 따른 품질 관리 리스크',
      '경비 증가 추세 전환 시 수익성 저하 우려',
      'TAG 단가 상승 지속성 불확실 (마켓 수용도 모니터링 필요)'
    ],
    success: [
      '원부자재 원가율 0.2%p 개선으로 USD 기준 원가 절감 달성',
      '경비 원가율 0.6%p 대폭 절감 (1.0% → 0.4%), 규모의 경제 실현',
      '마진율 0.2%p 축소로 공급망 협상력 강화 입증',
      'USD 기준 1.1%p 원가율 개선 성과 (17.1% → 16.0%)',
      'TAG 단가 +23.2% 상승으로 생산단가 증가 상쇄',
      '대량생산 체제(758만개) 진입으로 시장 지배력 확대'
    ],
    message: '당년 시즌은 대량생산 체제 전환을 통해 USD 기준 1.1%p 원가율 개선을 달성했으나, 환율 상승(+10.2%)으로 KRW 기준 0.4%p 악화. 원부자재·경비·마진 전방위 절감 노력은 우수하나, 환율 리스크 관리가 향후 핵심 과제. TAG 단가 상승(+23.2%)이 생산단가 증가(+15.5%)를 상회하며 수익성 방어 성공.'
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
