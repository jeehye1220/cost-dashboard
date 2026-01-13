'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { loadInsightsFromCSV, detectSeasonType, isSummaryDataValid } from '@/lib/insightsLoader';
import { saveStructuredInsights } from '@/lib/insightsSaver';
import { calculateTotalStats } from '@/lib/calculations';
import { CostDataItem } from '@/lib/types';

interface ExecutiveSummaryProps {
  summary: any;
  brandId?: string;
  items?: CostDataItem[]; // items 추가
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ summary, brandId, items = [] }) => {
  // 공통 함수로 total 계산 (summary.total이 있으면 우선 사용, 없으면 items 기반)
  const calculatedTotal = calculateTotalStats(items, summary);
  
  // 데이터가 없으면 표시하지 않음
  if (!calculatedTotal) {
    return null;
  }

  // calculatedTotal을 total로 사용 (summary.total과 동일한 형식)
  const total = calculatedTotal;
  
  // 데이터 유효성 검사 (인사이트 로드 여부 결정)
  const hasValidData = isSummaryDataValid(summary);

  // 시즌 타입 확인 (brandId 우선, 없으면 qty24F 기반)
  const is25SS = brandId?.startsWith('25SS-') || false;
  const is26SS = brandId?.startsWith('26SS-') || false;
  const is26FW = brandId?.startsWith('26FW-') || false;
  
  // brandId가 없으면 qty24F 기반으로 시즌 타입 감지
  let seasonType = is25SS ? '25SS' : 
                   is26SS ? '26SS' : 
                   is26FW ? '26FW' : 
                   detectSeasonType(total.totalQty24F || 0);
  
  // DISCOVERY-KIDS는 명시적으로 시즌 설정
  if (brandId === 'DISCOVERY-KIDS') {
    seasonType = '25FW';
  } else if (brandId?.includes('DISCOVERY-KIDS')) {
    // 25SS-DISCOVERY-KIDS, 26SS-DISCOVERY-KIDS, 26FW-DISCOVERY-KIDS
    if (brandId.startsWith('25SS-')) {
      seasonType = '25SS';
    } else if (brandId.startsWith('26SS-')) {
      seasonType = '26SS';
    } else if (brandId.startsWith('26FW-')) {
      seasonType = '26FW';
    }
  } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
    // 25FW 기간의 NON 브랜드들
    seasonType = '25FW';
  } else if (brandId?.startsWith('26SS-') && brandId?.endsWith('-NON')) {
    seasonType = '26SS';
  } else if (brandId?.startsWith('26FW-') && brandId?.endsWith('-NON')) {
    seasonType = '26FW';
  }
  
  // CSV에서 로드된 인사이트 데이터
  const [csvInsights, setCsvInsights] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState<{[key: string]: boolean}>({});
  
  // CSV 인사이트 로드 (데이터가 유효할 때만)
  useEffect(() => {
    if (hasValidData) {
      loadInsightsFromCSV(seasonType, brandId).then(data => {
        if (data) {
          setCsvInsights(data);
        }
      });
    }
  }, [seasonType, brandId, hasValidData]);


  // 25FW와 NON, KIDS, DISCOVERY 시즌별 초기 텍스트 설정
  const getInitialTexts = () => {
    // USD 원가율 변화 계산 (당년 - 전년)
    const usdCostRateChange = total.costRate25F_usd - total.costRate24F_usd;
    const isUsdImproved = usdCostRateChange < 0; // 하락 = 개선
    const isUsdWorsened = usdCostRateChange > 0; // 상승 = 악화
    
    // USD 타이틀 동적 생성
    const getUsdTitle = () => {
      if (isUsdImproved) {
        return 'USD 기준: 원가율 개선';
      } else if (isUsdWorsened) {
        return 'USD 기준: 원가율 악화';
      } else {
        return 'USD 기준: 원가율 유지';
      }
    };
    
    // KRW mainChange 동적 계산 (당년 KRW - 당년 USD = 환율 효과) - 모든 경우에 적용
    const krwChange = total.costRate25F_krw - total.costRate25F_usd;
    const isKrwImproved = krwChange < 0; // 하락 = 개선 (환율 유리)
    const isKrwWorsened = krwChange > 0; // 상승 = 악화 (환율 불리)
    
    const krwChangeText = krwChange > 0 
      ? `+${krwChange.toFixed(1)}%p 악화`
      : krwChange < 0 
      ? `-${Math.abs(krwChange).toFixed(1)}%p 개선`
      : `0.0%p 동일`;
    
    // KRW 타이틀 동적 생성
    const getKrwTitle = () => {
      if (isKrwImproved) {
        return 'KRW 기준: 환율 효과로 개선';
      } else if (isKrwWorsened) {
        return 'KRW 기준: 환율 영향으로 악화';
      } else {
        return 'KRW 기준: 환율 영향 없음';
      }
    };
    
    // CSV 데이터가 있으면 CSV 데이터 사용 (단, 타이틀은 동적으로 생성)
    if (csvInsights) {
      // USD mainChange 계산 (CSV에 없으면 동적 계산, 상승=악화 빨간색, 하락=개선 초록색)
      const usdMainChange = csvInsights.usd?.mainChange || 
        (isUsdImproved ? `-${Math.abs(usdCostRateChange).toFixed(1)}%p 개선` : 
         isUsdWorsened ? `+${usdCostRateChange.toFixed(1)}%p 악화` : 
         `0.0%p 동일`);
      
      return {
        usd: {
          title: csvInsights.usd?.title || getUsdTitle(),
          mainChange: usdMainChange,
          items: csvInsights.usd?.items || [],
          summary: csvInsights.usd?.summary || '',
        },
        krw: {
          title: csvInsights.krw?.title || getKrwTitle(),
          mainChange: krwChangeText, // 동적 계산
          items: csvInsights.krw?.items || [],
          summary: csvInsights.krw?.summary || '',
        },
      };
    }
    
    // 25SS, 26SS, 26FW 기간인 경우 기본 텍스트 (CSV 데이터가 없을 때)
    if (is25SS || is26SS || is26FW) {
      return {
        usd: {
          title: getUsdTitle(),
          mainChange: isUsdImproved ? `-${Math.abs(usdCostRateChange).toFixed(1)}%p 개선` : 
                     isUsdWorsened ? `+${usdCostRateChange.toFixed(1)}%p 악화` : 
                     `0.0%p 동일`,
          items: [],
          summary: '',
        },
        krw: {
          title: getKrwTitle(),
          mainChange: krwChangeText,
          items: [],
          summary: '',
        },
      };
    }
    
    // 하드코딩된 fallback 완전 제거 - CSV 인사이트가 없으면 빈 상태 반환
    return {
      usd: {
        title: getUsdTitle(),
        mainChange: isUsdImproved ? `-${Math.abs(usdCostRateChange).toFixed(1)}%p 개선` : 
                   isUsdWorsened ? `+${usdCostRateChange.toFixed(1)}%p 악화` : 
                   `0.0%p 동일`,
        items: [],
        summary: '',
      },
      krw: {
        title: getKrwTitle(),
        mainChange: krwChangeText,
        items: [],
        summary: '',
      },
    };
  };

  const initialTexts = getInitialTexts();
  
  // USD 원가율 변화 계산 (당년 - 전년)
  const usdCostRateChange = total.costRate25F_usd - total.costRate24F_usd;
  const isUsdCostRateIncreased = usdCostRateChange > 0;
  
  // KRW mainChange 동적 계산 (초기값 설정 시에도)
  const initialKrwChange = total.costRate25F_krw - total.costRate25F_usd;
  const isKrwImproved = initialKrwChange < 0; // 하락 = 개선 (환율 유리)
  const isKrwWorsened = initialKrwChange > 0; // 상승 = 악화 (환율 불리)
  const initialKrwChangeText = initialKrwChange > 0 
    ? `+${initialKrwChange.toFixed(1)}%p 악화`
    : initialKrwChange < 0 
    ? `-${Math.abs(initialKrwChange).toFixed(1)}%p 개선`
    : `0.0%p 동일`;
  
  // 편집 가능한 텍스트 상태
  const [usdTexts, setUsdTexts] = useState(initialTexts.usd);
  const [krwTexts, setKrwTexts] = useState({
    ...initialTexts.krw,
    mainChange: initialKrwChangeText, // 초기값도 동적으로 계산
  });
  
  // CSV 데이터가 로드되면 state 업데이트
  useEffect(() => {
    if (csvInsights) {
      // USD 원가율 변화 계산 (당년 - 전년)
      const usdCostRateChange = total.costRate25F_usd - total.costRate24F_usd;
      const isUsdImproved = usdCostRateChange < 0;
      const isUsdWorsened = usdCostRateChange > 0;
      
      // USD 타이틀 동적 생성
      const getUsdTitle = () => {
        if (isUsdImproved) {
          return 'USD 기준: 원가율 개선';
        } else if (isUsdWorsened) {
          return 'USD 기준: 원가율 악화';
        } else {
          return 'USD 기준: 원가율 유지';
        }
      };
      
      // USD mainChange 계산 (상승=악화 빨간색, 하락=개선 초록색)
      const usdMainChange = csvInsights.usd?.mainChange || 
        (isUsdImproved ? `-${Math.abs(usdCostRateChange).toFixed(1)}%p 개선` : 
         isUsdWorsened ? `+${usdCostRateChange.toFixed(1)}%p 악화` : 
         `0.0%p 동일`);
      
      // KRW mainChange는 항상 동적으로 계산 (당년 KRW - 당년 USD)
      const krwChange = total.costRate25F_krw != null && total.costRate25F_usd != null
        ? total.costRate25F_krw - total.costRate25F_usd
        : 0;
      const isKrwImproved = krwChange < 0;
      const isKrwWorsened = krwChange > 0;
      
      const krwChangeText = krwChange > 0 
        ? `+${krwChange.toFixed(1)}%p 악화`
        : krwChange < 0 
        ? `-${Math.abs(krwChange).toFixed(1)}%p 개선`
        : `0.0%p 동일`;
      
      // KRW 타이틀 동적 생성
      const getKrwTitle = () => {
        if (isKrwImproved) {
          return 'KRW 기준: 환율 효과로 개선';
        } else if (isKrwWorsened) {
          return 'KRW 기준: 환율 영향으로 악화';
        } else {
          return 'KRW 기준: 환율 영향 없음';
        }
      };
      
      setUsdTexts({
        title: csvInsights.usd?.title || getUsdTitle(),
        mainChange: usdMainChange,
        items: csvInsights.usd?.items || [],
        summary: csvInsights.usd?.summary || '',
      });
      
      setKrwTexts({
        title: csvInsights.krw?.title || getKrwTitle(),
        mainChange: krwChangeText, // 항상 동적으로 계산된 값 사용
        items: csvInsights.krw?.items || [],
        summary: csvInsights.krw?.summary || '',
      });
    }
  }, [csvInsights, total.costRate25F_krw, total.costRate25F_usd, total.costRate24F_usd, total.costRate25F_usd]);

  const [editMode, setEditMode] = useState<string | null>(null);
  const [showManageButtons, setShowManageButtons] = useState(false);
  
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
  
  // 토글 상태 관리 (각 항목별로 접기/펼치기) - 기본값: 모두 접힌 상태
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(() => {
    const allItems = new Set<string>();
    // USD 항목들
    for (let i = 0; i < (initialTexts.usd.items?.length || 0); i++) {
      allItems.add(`usd-${i}`);
    }
    // KRW 항목들
    for (let i = 0; i < (initialTexts.krw.items?.length || 0); i++) {
      allItems.add(`krw-${i}`);
    }
    return allItems;
  });
  
  const toggleItem = (itemId: string) => {
    setCollapsedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // 항목 추가 함수
  const addItem = async (section: 'usd' | 'krw') => {
    const newItem = {
      icon: '📝',
      title: '새 항목',
      change: '▼ 0.0%p',
      description: '여기에 설명을 입력하세요.'
    };
    
    if (section === 'usd') {
      setUsdTexts({
        ...usdTexts,
        items: [...usdTexts.items, newItem]
      });
    } else {
      setKrwTexts({
        ...krwTexts,
        items: [...krwTexts.items, newItem]
      });
    }
    await saveToCSV();
  };

  // 항목 삭제 함수
  const deleteItem = async (section: 'usd' | 'krw', index: number) => {
    if (section === 'usd') {
      const newItems = usdTexts.items.filter((_item: any, idx: number) => idx !== index);
      setUsdTexts({
        ...usdTexts,
        items: newItems
      });
      // 삭제된 항목의 토글 상태도 제거
      setCollapsedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(`usd-${index}`);
        return newSet;
      });
    } else {
      const newItems = krwTexts.items.filter((_item: any, idx: number) => idx !== index);
      setKrwTexts({
        ...krwTexts,
        items: newItems
      });
      // 삭제된 항목의 토글 상태도 제거
      setCollapsedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(`krw-${index}`);
        return newSet;
      });
    }
    await saveToCSV();
  };

  const handleTextEdit = (section: 'usd' | 'krw', field: string, value: string, itemIndex?: number) => {
    if (section === 'usd') {
      if (itemIndex !== undefined) {
        const newItems = [...usdTexts.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        setUsdTexts({ ...usdTexts, items: newItems });
      } else {
        setUsdTexts({ ...usdTexts, [field]: value });
      }
    } else {
      if (itemIndex !== undefined) {
        const newItems = [...krwTexts.items];
        newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
        setKrwTexts({ ...krwTexts, items: newItems });
      } else {
        setKrwTexts({ ...krwTexts, [field]: value });
      }
    }
  };

  // CSV 파일에 저장하는 함수
  const saveToCSV = async () => {
    const insights = {
      usd: {
        title: usdTexts.title,
        mainChange: usdTexts.mainChange,
        items: usdTexts.items,
        summary: usdTexts.summary,
      },
      krw: {
        title: krwTexts.title,
        mainChange: krwTexts.mainChange,
        items: krwTexts.items,
        summary: krwTexts.summary,
      },
    };
    
    const success = await saveStructuredInsights(seasonType, insights);
    if (success) {
      alert('저장되었습니다!');
    } else {
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // AI 코멘트 생성 함수
  const generateAIComment = async (section: 'usd' | 'krw', field: string, itemIndex?: number) => {
    const key = itemIndex !== undefined ? `${section}-${field}-${itemIndex}` : `${section}-${field}`;
    setLoadingAI({ ...loadingAI, [key]: true });
    try {
      const data = {
        costRate24F_usd: total.costRate24F_usd || 0,
        costRate25F_usd: total.costRate25F_usd || 0,
        costRateChange_usd: total.costRateChange || 0,
        avgTag24F_usd: total.avgTag24F_usd,
        avgTag25F_usd: total.avgTag25F_usd,
        tagYoY_usd: total.tagYoY_usd,
        avgCost24F_usd: total.avgCost24F_usd,
        avgCost25F_usd: total.avgCost25F_usd,
        costYoY_usd: total.costYoY_usd,
        material24F_usd: total.material24F_usd,
        material25F_usd: total.material25F_usd,
        labor24F_usd: total.labor24F_usd,
        labor25F_usd: total.labor25F_usd,
        costRate24F_krw: total.costRate24F_krw,
        costRate25F_krw: total.costRate25F_krw,
        costRateChange_krw: total.costRateChange_krw,
        avgTag24F_krw: total.avgTag24F_krw,
        avgTag25F_krw: total.avgTag25F_krw,
        tagYoY_krw: total.tagYoY_krw,
        avgCost24F_krw: total.avgCost24F_krw,
        avgCost25F_krw: total.avgCost25F_krw,
        costYoY_krw: total.costYoY_krw,
        itemTitle: itemIndex !== undefined ? (section === 'usd' ? usdTexts.items[itemIndex]?.title : krwTexts.items[itemIndex]?.title) : undefined,
      };

      // executive_usd_item 또는 executive_krw_item인 경우 JSON 형식으로 응답 받음
      const isItemField = itemIndex !== undefined && (field === 'title' || field === 'description' || field === 'change');

      const response = await fetch('/api/generate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: `executive_${section}_item`,
          data: data,
          brandId: brandId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // executive_usd_item 또는 executive_krw_item이고 title/description/change 필드인 경우 JSON 파싱
        if (isItemField) {
          try {
            const parsed = JSON.parse(result.comment);
            if (parsed.title && parsed.change && parsed.description) {
              // title, change, description 모두 업데이트
              handleTextEdit(section, 'title', parsed.title, itemIndex);
              handleTextEdit(section, 'change', parsed.change, itemIndex);
              handleTextEdit(section, 'description', parsed.description, itemIndex);
            } else {
              // JSON 형식이 아니거나 필드가 없는 경우 기존 로직 사용
              handleTextEdit(section, field, result.comment, itemIndex);
            }
          } catch (e) {
            // JSON 파싱 실패 시 기존 로직 사용
            handleTextEdit(section, field, result.comment, itemIndex);
          }
        } else {
          // 기존 로직 (summary 등)
          if (itemIndex !== undefined) {
            handleTextEdit(section, field, result.comment, itemIndex);
          } else {
            handleTextEdit(section, field, result.comment);
          }
        }
      } else {
        alert('AI 코멘트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('AI 코멘트 생성 오류:', error);
      alert('AI 코멘트 생성 중 오류가 발생했습니다.');
    } finally {
      setLoadingAI({ ...loadingAI, [key]: false });
    }
  };

  // 편집 가능한 텍스트 컴포넌트
  const EditableText = ({ id, value, multiline = false, className, onSave, showAIButton = false, aiSection, aiField, aiItemIndex }: any) => {
    const isEditing = editMode === id;
    const aiKey = aiItemIndex !== undefined ? `${aiSection}-${aiField}-${aiItemIndex}` : `${aiSection}-${aiField}`;
    
    return isEditing ? (
      <div className="flex flex-col gap-1">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onSave(e.target.value)}
            className="w-full p-2 border border-blue-300 rounded text-sm"
            rows={3}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onSave(e.target.value)}
            className="w-full p-1 border border-blue-300 rounded text-sm"
            autoFocus
          />
        )}
        <button
          onClick={async () => {
            await saveToCSV();
            setEditMode(null);
          }}
          className="self-end text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          저장
        </button>
      </div>
    ) : (
      <div className="group relative">
        <span className={className}>{value}</span>
        {process.env.NODE_ENV !== 'production' && (
          <div className="inline-flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditMode(id)}
              className="text-xs text-blue-500 hover:text-blue-700"
              title="편집"
            >
              ✏️
            </button>
            {showAIButton && (
              <button
                onClick={() => generateAIComment(aiSection, aiField, aiItemIndex)}
                disabled={loadingAI[aiKey]}
                className="text-xs text-purple-500 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI 생성"
              >
                {loadingAI[aiKey] ? '⏳' : '🤖'}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          USD 기준 vs KRW 기준 원가율 비교 분석
        </h2>
        {process.env.NODE_ENV !== 'production' && (
          <>
            {!showManageButtons && (
              <span className="text-xs text-gray-400 italic">
                💡 Alt 키를 눌러 편집 모드
              </span>
            )}
            {showManageButtons && (
              <span className="text-xs text-blue-600 font-semibold animate-pulse">
                ✏️ 편집 모드 활성화
              </span>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: USD 기준 (전년 → 당년) */}
        {(() => {
          // mainChange 텍스트를 파싱하여 개선/악화 판단
          const mainChangeText = usdTexts.mainChange || '';
          const isImproved = mainChangeText.includes('개선');
          const isWorsened = mainChangeText.includes('악화');
          // 텍스트에 "개선" 또는 "악화"가 명시되어 있으면 그것을 우선, 없으면 수치로 판단
          const isUsdImproved = isImproved || (!isWorsened && usdCostRateChange < 0);
          const isUsdWorsened = isWorsened || (!isImproved && usdCostRateChange > 0);
          
          return (
            <div className={`rounded-xl p-6 shadow-md border-2 hover:shadow-lg transition-shadow ${
              isUsdWorsened 
                ? 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-red-200' 
                : 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex-1">
                  <h3 className={`text-lg font-bold flex items-center gap-2 mb-3 ${
                    isUsdWorsened ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {isUsdWorsened ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    <EditableText
                      id="usd-title"
                      value={usdTexts.title}
                      className=""
                      onSave={(val: string) => handleTextEdit('usd', 'title', val)}
                    />
                  </h3>
                  <div className={`bg-white rounded-lg p-4 shadow-sm border mb-3 ${
                    isUsdWorsened ? 'border-red-200' : 'border-green-200'
                  }`}>
                    <div className="text-3xl font-bold text-gray-800 mb-1">
                      <span className="text-gray-500">
                        {total.costRate24F_usd.toFixed(1)}%
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className={isUsdWorsened ? 'text-red-600' : 'text-green-600'}>
                        {total.costRate25F_usd.toFixed(1)}%
                      </span>
                    </div>
                    <div className={`text-sm font-bold ${
                      isUsdWorsened ? 'text-red-600' : 'text-green-600'
                    }`}>
                      <EditableText
                        id="usd-main-change"
                        value={usdTexts.mainChange}
                        className={isUsdWorsened ? 'text-red-600' : 'text-green-600'}
                        onSave={(val: string) => handleTextEdit('usd', 'mainChange', val)}
                      />
                    </div>
                  </div>
                </div>
              </div>

          {/* USD 개선 항목들 */}
          <div className="space-y-2.5 mb-3">
            {usdTexts.items.map((item: any, idx: number) => {
              const itemId = `usd-${idx}`;
              const isCollapsed = collapsedItems.has(itemId);
              
              // mainChange 텍스트를 파싱하여 개선/악화 판단 (USD 섹션 전체)
              const mainChangeText = usdTexts.mainChange || '';
              const isUsdImproved = mainChangeText.includes('개선');
              const isUsdWorsened = mainChangeText.includes('악화');
              
              // change 값 파싱하여 양수/음수 판단
              const getChangeColor = (changeStr: string) => {
                if (!changeStr) return 'text-gray-600 bg-gray-50';
                
                // "▼", "▲", "+", "-" 등의 부호 확인
                const hasDownArrow = changeStr.includes('▼');
                const hasUpArrow = changeStr.includes('▲');
                const hasPlus = changeStr.startsWith('+') || changeStr.includes('+');
                const hasMinus = changeStr.startsWith('-') || changeStr.includes('-');
                
                // 음수(감소/절감)인 경우 녹색
                if (hasDownArrow || hasMinus) {
                  return 'text-green-600 bg-green-50';
                }
                // 양수(증가/상승)인 경우 빨간색
                if (hasUpArrow || hasPlus) {
                  return 'text-red-600 bg-red-50';
                }
                
                // 기본값: mainChange 텍스트에 따라
                return isUsdWorsened 
                  ? 'text-red-600 bg-red-50' 
                  : 'text-green-600 bg-green-50';
              };
              
              return (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all group/item">
                  <div className="flex items-start gap-3 mb-1">
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="text-xl w-6 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      title={isCollapsed ? '펼치기' : '접기'}
                    >
                      {item.icon}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                      <EditableText
                        id={`usd-title-${idx}`}
                        value={item.title}
                        className="font-semibold text-gray-800 text-sm"
                        onSave={(val: string) => handleTextEdit('usd', 'title', val, idx)}
                        showAIButton={true}
                        aiSection="usd"
                        aiField="title"
                        aiItemIndex={idx}
                      />
                        {item.change && (
                          <EditableText
                            id={`usd-change-${idx}`}
                            value={item.change}
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${getChangeColor(item.change)}`}
                            onSave={(val: string) => handleTextEdit('usd', 'change', val, idx)}
                            showAIButton={true}
                            aiSection="usd"
                            aiField="change"
                            aiItemIndex={idx}
                          />
                        )}
                      </div>
                    </div>
                    {showManageButtons && (
                      <button
                        onClick={() => deleteItem('usd', idx)}
                        className="text-red-500 hover:text-red-700 transition-opacity"
                        title="항목 삭제"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="ml-9 mt-2">
                      <EditableText
                        id={`usd-desc-${idx}`}
                        value={item.description}
                        multiline
                        className="text-xs text-gray-600 leading-relaxed"
                        onSave={(val: string) => handleTextEdit('usd', 'description', val, idx)}
                        showAIButton={true}
                        aiSection="usd"
                        aiField="description"
                        aiItemIndex={idx}
                      />
                      <div className={`h-1 rounded-full mt-3 ${
                        (() => {
                          const mainChangeText = usdTexts.mainChange || '';
                          const isWorsened = mainChangeText.includes('악화');
                          return isWorsened
                            ? 'bg-gradient-to-r from-red-400 to-rose-500' 
                            : 'bg-gradient-to-r from-green-400 to-emerald-500';
                        })()
                      }`} style={{ width: '60%' }}></div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 항목 추가 버튼 - Alt 키 누를 때만 표시 */}
            {showManageButtons && (
              <button
                onClick={() => addItem('usd')}
                className={`w-full py-2 border-2 border-dashed rounded-lg transition-colors text-sm font-medium ${
                  (() => {
                    const mainChangeText = usdTexts.mainChange || '';
                    const isWorsened = mainChangeText.includes('악화');
                    return isWorsened
                      ? 'border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400'
                      : 'border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400';
                  })()
                }`}
              >
                + 항목 추가
              </button>
            )}
          </div>

          {/* USD 핵심 메시지 */}
          <div className={`text-white rounded-lg p-4 min-h-[80px] shadow-md ${
            (() => {
              const mainChangeText = usdTexts.mainChange || '';
              const isWorsened = mainChangeText.includes('악화');
              return isWorsened
                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                : 'bg-gradient-to-r from-green-500 to-emerald-600';
            })()
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl w-6 flex-shrink-0">💡</span>
              <div className="flex-1">
                <div className="font-bold text-sm mb-2">핵심 메시지</div>
                <div className="text-xs leading-relaxed">
                  <EditableText
                    id="usd-summary"
                    value={usdTexts.summary}
                    multiline
                    className=""
                    onSave={(val: string) => handleTextEdit('usd', 'summary', val)}
                    showAIButton={true}
                    aiSection="usd"
                    aiField="summary"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>
          )})()}

        {/* 오른쪽: KRW 기준 (당년 USD → 당년 KRW) */}
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 rounded-xl p-6 shadow-md border-2 border-orange-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" />
                <EditableText
                  id="krw-title"
                  value={krwTexts.title}
                  className=""
                  onSave={(val: string) => handleTextEdit('krw', 'title', val)}
                />
              </h3>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-200 mb-3">
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  <span className="text-gray-500">{total.costRate25F_usd.toFixed(1)}%</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className={isKrwImproved ? 'text-green-600' : isKrwWorsened ? 'text-red-600' : 'text-gray-600'}>{total.costRate25F_krw.toFixed(1)}%</span>
                </div>
                <div className={`text-sm font-bold ${isKrwImproved ? 'text-green-600' : isKrwWorsened ? 'text-red-600' : 'text-gray-600'}`}>
                  <EditableText
                    id="krw-main-change"
                    value={krwTexts.mainChange}
                    className=""
                    onSave={(val: string) => handleTextEdit('krw', 'mainChange', val)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* KRW 리스크 항목들 */}
          <div className="space-y-2.5 mb-3">
            {krwTexts.items.map((item: any, idx: number) => {
              const itemId = `krw-${idx}`;
              const isCollapsed = collapsedItems.has(itemId);
              
              return (
                <div key={idx} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all group/item">
                  <div className="flex items-start gap-3 mb-1">
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="text-xl w-6 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      title={isCollapsed ? '펼치기' : '접기'}
                    >
                      {item.icon}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EditableText
                          id={`krw-title-${idx}`}
                          value={item.title}
                          className="font-semibold text-gray-800 text-sm"
                          onSave={(val: string) => handleTextEdit('krw', 'title', val, idx)}
                          showAIButton={true}
                          aiSection="krw"
                          aiField="title"
                          aiItemIndex={idx}
                        />
                        {item.change && (
                          <EditableText
                            id={`krw-change-${idx}`}
                            value={item.change}
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              isKrwImproved ? 'text-green-600 bg-green-50' : isKrwWorsened ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50'
                            }`}
                            onSave={(val: string) => handleTextEdit('krw', 'change', val, idx)}
                            showAIButton={true}
                            aiSection="krw"
                            aiField="change"
                            aiItemIndex={idx}
                          />
                        )}
                      </div>
                    </div>
                    {showManageButtons && (
                      <button
                        onClick={() => deleteItem('krw', idx)}
                        className="text-red-500 hover:text-red-700 transition-opacity"
                        title="항목 삭제"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="ml-9 mt-2">
                      <EditableText
                        id={`krw-desc-${idx}`}
                        value={item.description}
                        multiline
                        className="text-xs text-gray-600 leading-relaxed"
                        onSave={(val: string) => handleTextEdit('krw', 'description', val, idx)}
                        showAIButton={true}
                        aiSection="krw"
                        aiField="description"
                        aiItemIndex={idx}
                      />
                      <div className={`h-1 rounded-full mt-3 ${
                        isKrwImproved 
                          ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                          : isKrwWorsened 
                          ? 'bg-gradient-to-r from-orange-400 to-red-500' 
                          : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      }`} style={{ width: '60%' }}></div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 항목 추가 버튼 - Alt 키 누를 때만 표시 */}
            {showManageButtons && (
              <button
                onClick={() => addItem('krw')}
                className="w-full py-2 border-2 border-dashed border-orange-300 rounded-lg text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-colors text-sm font-medium"
              >
                + 항목 추가
              </button>
            )}
          </div>

          {/* KRW 핵심 메시지 */}
          <div className={`text-white rounded-lg p-4 min-h-[80px] shadow-md ${
            isKrwImproved 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : isKrwWorsened 
              ? 'bg-gradient-to-r from-orange-500 to-red-600' 
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl w-6 flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-sm mb-2">핵심 메시지</div>
                <div className="text-xs leading-relaxed">
                  <EditableText
                    id="krw-summary"
                    value={krwTexts.summary}
                    multiline
                    className=""
                    onSave={(val: string) => handleTextEdit('krw', 'summary', val)}
                    showAIButton={true}
                    aiSection="krw"
                    aiField="summary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveSummary;
