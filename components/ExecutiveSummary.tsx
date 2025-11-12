'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { loadInsightsFromCSV, detectSeasonType } from '@/lib/insightsLoader';

interface ExecutiveSummaryProps {
  summary: any;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ summary }) => {
  if (!summary || !summary.total) {
    return <div>데이터를 불러오는 중...</div>;
  }

  const { total } = summary;

  // 시즌 타입 확인 (컴포넌트 최상위에서 선언)
  const seasonType = detectSeasonType(total.qty24F);
  const is25FW = seasonType === '25FW';
  const isKIDS = seasonType === 'KIDS';
  const isDISCOVERY = seasonType === 'DISCOVERY';
  
  // CSV에서 로드된 인사이트 데이터
  const [csvInsights, setCsvInsights] = useState<any>(null);
  
  // CSV 인사이트 로드
  useEffect(() => {
    loadInsightsFromCSV(seasonType).then(data => {
      if (data) {
        setCsvInsights(data);
      }
    });
  }, [seasonType]);

  // csvInsights가 로드되면 krwTexts.mainChange 업데이트
  useEffect(() => {
    if (csvInsights || true) { // 항상 업데이트
      const krwChange = total.costRate25F_krw - total.costRate25F_usd;
      const krwChangeText = krwChange > 0 
        ? `▲ ${krwChange.toFixed(1)}%p 악화`
        : krwChange < 0 
        ? `▼ ${Math.abs(krwChange).toFixed(1)}%p 개선`
        : `➡️ 0.0%p 동일`;
      
      setKrwTexts(prev => ({
        ...prev,
        mainChange: krwChangeText,
      }));
    }
  }, [csvInsights, total.costRate25F_krw, total.costRate25F_usd]);

  // 25FW와 NON, KIDS, DISCOVERY 시즌별 초기 텍스트 설정
  const getInitialTexts = () => {
    // KRW mainChange 동적 계산 (당년 KRW - 당년 USD = 환율 효과) - 모든 경우에 적용
    const krwChange = total.costRate25F_krw - total.costRate25F_usd;
    const krwChangeText = krwChange > 0 
      ? `▲ ${krwChange.toFixed(1)}%p 악화`
      : krwChange < 0 
      ? `▼ ${Math.abs(krwChange).toFixed(1)}%p 개선`
      : `➡️ 0.0%p 동일`;
    
    // CSV 데이터가 있으면 CSV 데이터 사용
    if (csvInsights) {
      return {
        usd: csvInsights.usd,
        krw: {
          ...csvInsights.krw,
          // mainChange는 당년 KRW - 당년 USD (환율 효과)로 동적 계산
          mainChange: krwChangeText,
        },
      };
    }
    
    // CSV 데이터가 없으면 기본 데이터 사용 (fallback)
    if (isKIDS) {
      // MLB KIDS 시즌 텍스트
      return {
        usd: {
          title: 'USD 기준: TAG 가격 상승으로 원가율 개선 ⚠️',
          mainChange: `▼ 0.5%p 개선`,
          items: [
            {
              icon: '🔍',
              title: '"경쟁이 아닌 비용 개선" 구조',
              change: `Price Effect`,
              description: `평균원가 USD: 19.90 → 20.91 (+5.1%) 상승. TAG USD: 91.8 → 98.5 (+7.3%) 상승. 즉, 가격 자체는 높아졌으나 TAG가 더 크게 올라, 가격 효과(Price Effect)에 의해 원가율 개선(▼0.5%p).`
            },
            {
              icon: '🔍',
              title: '믹스효과 + 평균TAG 상승으로 방어',
              change: `Mix Effect`,
              description: `Outer 비중 ↑ (28→29%), 고TAG 제품 믹스 확대로 평균 원가율 방어. 고가제품 믹스로 인한 전체 평균 개선효과로, 제조효율 개선이 원가 기여의 일부를 흡수.`
            }
          ],
          summary: `TAG 상승(+7.3%)과 고가 제품 믹스 개선으로 원가율 개선. 단, 실질적인 제조 효율 향상보다 가격설정 재구조화 및 판가 상승 전략의 성과.`
        },
        krw: {
          title: '환율·제조원가 동반 상승으로 악화 ⚠️',
          mainChange: (() => {
            const change = total.costRate25F_krw - total.costRate25F_usd;
            return change > 0 ? `▲ ${change.toFixed(1)}%p 악화` : change < 0 ? `▼ ${Math.abs(change).toFixed(1)}%p 개선` : `➡️ 0.0%p 동일`;
          })(),
          items: [
            {
              icon: '💱',
              title: '환율 효과',
              change: `+${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p`,
              description: `환율 상승(+9.4%, 1,321원→1,446원)으로 USD 기준 효과 상쇄 상실. 당년 USD 원가율 ${total.costRate25F_usd.toFixed(1)}%에서 당년 KRW 원가율 ${total.costRate25F_krw.toFixed(1)}%로 환율 효과 ${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p 악화.`
            },
            {
              icon: '🍊',
              title: '제조원가 상승',
              change: `+5.1%`,
              description: `평균원가 19.90→20.91 USD (+5.1%). 공임단가 +13.4% (4.71→5.34). 아트웍단가 +31.7% (1.04→1.37). 원부자재단가 거의 변동 없음 (11.37→11.33). 즉, 제조단계에서는 실질적 절감 없음. 오히려 가격 인상이 투입됨.`
            }
          ],
          summary: `TAG 상승으로 USD 원가율은 개선되었으나, 공임·아트 등 제조원가 +5.1% 상승. 여기에 환율 상승(+9.4%)까지 더해져 KRW 기준 실질 악화`
        }
      };
    } else if (isDISCOVERY) {
      // DISCOVERY 시즌 텍스트
      return {
        usd: {
          title: 'USD 기준: 원가율 상승 ⚠️',
          mainChange: `▲ 0.5%p 악화`,
          items: [
            {
              icon: '📦',
              title: '원부자재 단가 상승',
              change: `+0.8%p`,
              description: `고가 소재(다운, 기능성 원단 등) 사용 비중 확대로 소재비 비중 14.4% → 15.2%로 상승. 평균원가 $34.12 → $35.11 (+2.9%) 증가했으나 TAG는 $169.33 → $169.84 (+0.3%)로 거의 변화 없어 원가율 악화.`
            },
            {
              icon: '🏷️',
              title: '공임비 절감',
              change: `▼ 0.1%p`,
              description: `공임비율 4.5% → 4.4%로 소폭 감소. Inner/Bottom 카테고리에서 봉제 효율화 성과 있으나, Outer(다운류) 공임단가 상승으로 기여도 제한됨.`
            },
            {
              icon: '💸',
              title: '경비율 절감',
              change: `▼ 0.2%p`,
              description: `아트웍·간접비용 효율화로 경비율 0.9% → 0.7%로 개선. 생산수량 23.4% 증가(134만→166만개)로 고정비 분산 효과.`
            }
          ],
          summary: `TAG 거의 정체(+0.3%) 상황에서 원부자재 단가 상승(+0.8%p)이 공임·경비 절감 효과(-0.3%p)를 상쇄하며 USD 원가율 +0.5%p 악화. "TAG 동결 + 소재비 급등" 구조.`
        },
        krw: {
          title: 'KRW 기준: 환율로 추가 악화 ⚠️',
          mainChange: (() => {
            const change = total.costRate25F_krw - total.costRate25F_usd;
            return change > 0 ? `▲ ${change.toFixed(1)}%p 악화` : change < 0 ? `▼ ${Math.abs(change).toFixed(1)}%p 개선` : `➡️ 0.0%p 동일`;
          })(),
          items: [
            {
              icon: '💱',
              title: '환율 효과',
              change: `+${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p`,
              description: `환율 1,350 → 1,400원(+3.7%) 상승으로 KRW 기준 추가 부담. 당년 USD 원가율 ${total.costRate25F_usd.toFixed(1)}%에서 당년 KRW 원가율 ${total.costRate25F_krw.toFixed(1)}%로 환율 효과 ${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p 악화.`
            },
            {
              icon: '🔥',
              title: 'Outer 카테고리 집중 타격',
              change: `58% 비중`,
              description: `Outer가 전체 생산의 58%(96만개) 차지. Outer 원가율 22.4% → 24.0% (+1.6%p) 급등으로 전체 원가율 상승 주도. 다운 소재 + 환율 이중 악재.`
            }
          ],
          summary: `TAG 상승 없이 원자재 단가만 급등하며 USD 기준 악화. 여기에 환율 3.7% 상승이 더해져 KRW 기준 실손익 크게 압박. TAG 인상 전략 부재가 치명적.`
        }
      };
    } else if (is25FW) {
      // 25FW 시즌 텍스트
      return {
        usd: {
          title: 'USD 기준: 개선 성공',
          mainChange: `▼ 0.8%p 개선`,
          items: [
            {
              icon: '🎨',
              title: '소재단가 절감',
              change: `▼ 0.9%p`,
              description: `구스/덕 충전재 80/20, 90/10 믹스 변경으로 규조적 단가 절감 달성. 협상이 아닌 소재 전략 개선이 주된 요인`
            },
            {
              icon: '💼',
              title: '벤더마진 축소',
              change: `▼ 0.1%p`,
              description: `거래조건 재설상으로 벤더 마진 –0.1%p 회수. 협상 통계력 회복 및 협상력 강화 효과`
            },
            {
              icon: '⚡',
              title: '공정 개선 (Inner)',
              change: `▼ 0.46 USD`,
              description: `봉제 단순화로 공임 –0.46 USD 절감. 효율 모델로 검증된 타 카테고리 확산 기반 확보`
            }
          ],
          summary: `소재 믹스 개선과 공임 효율화로 절감 효과를 달성했으나, 전체 평균 품목 단가 상승이 실질 개선폭 제한`
        },
        krw: {
          title: 'KRW 기준: 환율에 상쇄',
          mainChange: (() => {
            const change = total.costRate25F_krw - total.costRate25F_usd;
            return change > 0 ? `▲ ${change.toFixed(1)}%p 악화` : change < 0 ? `▼ ${Math.abs(change).toFixed(1)}%p 개선` : `➡️ 0.0%p 동일`;
          })(),
          items: [
            {
              icon: '💱',
              title: '환율 효과',
              change: `+${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p`,
              description: `환율 상승(+11%)으로 USD 개선 효과 완전 상쇄. 당년 USD 원가율 ${total.costRate25F_usd.toFixed(1)}%에서 당년 KRW 원가율 ${total.costRate25F_krw.toFixed(1)}%로 환율 효과 ${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p 악화.`
            },
            {
              icon: '👟',
              title: 'Outer 비중 확대',
              change: '리스크 ↑',
              description: `고공임 제품 비중 59% → 62%로 확대되며 원가율은 상승했으나, 주력 고마진 아이템 중심의 믹스 효과로 매출 기여도 큼`
            },
            {
              icon: '🎀',
              title: '공임비 상승(Outer)',
              change: `+0.7%p`,
              description: `Outer 공임 4.3% → 4.9% (+0.7%p). 동계 나이론-고임군 위주 병렬 투입 가더로 강화된 기대`
            }
          ],
          summary: `소재·공임 효율 개선했으나, 환율과 믹스 구조 변화로 실손익 방어에 제한된 시즌.`
        }
      };
    } else {
      // NON 시즌 텍스트
      return {
        usd: {
          title: 'USD 기준: 개선 성공',
          mainChange: `▼ ${Math.abs(total.costRate25F_usd - total.costRate24F_usd).toFixed(1)}%p 개선`,
          items: [
            {
              icon: '🎨',
              title: '원부자재 효율화',
              change: `▼ 0.2%p`,
              description: `원부자재 단가 8.9% → 8.7%, 대량생산(758만개) 체제 전환으로 규모의 경제 달성 및 협상력 강화`
            },
            {
              icon: '💼',
              title: '마진율 최적화',
              change: `▼ 0.2%p`,
              description: `벤더 마진 1.5% → 1.3%, 생산량 증가(+170.8%)로 공급망 단가 협상 구조 개선`
            },
            {
              icon: '⚡',
              title: '경비율 절감',
              change: `▼ 0.6%p`,
              description: `물량 증가에 따른 고정비 분산 효과 및 물류적 운영으로 경비율 1.0% → 0.4% 축소`
            },
            {
              icon: '✨',
              title: 'TAG 상승률 통한 생산단가 방어',
              change: '',
              description: `생산단가 $8.00 → $9.24(+15.5%) 상승에도 TAG +23.2% 증 상세, 고가품 믹스 효과로 원 가율 방어`
            }
          ],
          summary: `TAG 상승과 원가 절감의 동시효과로 USD 기준 원가율 –1.1%p 개선. 생산단가 인상 압력 속에서도 가격 믹스 전략으로 구조적 개선 달성`
        },
        krw: {
          title: 'KRW 기준: 환율에 상쇄',
          mainChange: (() => {
            const change = total.costRate25F_krw - total.costRate25F_usd;
            return change > 0 ? `▲ ${change.toFixed(1)}%p 악화` : change < 0 ? `▼ ${Math.abs(change).toFixed(1)}%p 개선` : `➡️ 0.0%p 동일`;
          })(),
          items: [
            {
              icon: '💱',
              title: '환율 효과',
              change: `+${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p`,
              description: `환율 1,288원 → 1,420원(+10.2%)으로 USD 개선 효과 상쇄. 당년 USD 원가율 ${total.costRate25F_usd.toFixed(1)}%에서 당년 KRW 원가율 ${total.costRate25F_krw.toFixed(1)}%로 환율 효과 ${(total.costRate25F_krw - total.costRate25F_usd).toFixed(1)}%p 악화.`
            },
            {
              icon: '👟',
              title: 'Shoes 카테고리 집중',
              change: '리스크',
              description: `Shoes 원가율 18.8% → 16.8% 개선, 하지만 환율 상승으로 KRW 실적 반영 시 이익 전환 제한`
            },
            {
              icon: '📊',
              title: '생산단가 상승 영향',
              change: `+15.5%`,
              description: `단가 +15.5% 상승으로 원화 환가 부담 확대, TAG 효과는 달러 상쇄에 그침`
            },
            {
              icon: '✨',
              title: '제품 믹스 효과로 원부자재 평균단가 상승',
              change: '',
              description: `카테고리별 단가는 대부분 하락했으나, 고단가(신발·가방) 비중 확대로 전체 평균단가는 상승. 카단가(제조혁신 영향) 비중 축소 결정이 큼`
            }
          ],
          summary: `USD 기준으로 +TAG 효과로 원가율이 개선되나, 환율 상승(+10.2%)이 KRW 실손 이익을 잠식하여 +1.5%p 악화. 환율 환율 리스크 관리 및 환헤 단가 협상력 강화 필요. 혁심 과제`
        }
      };
    }
  };

  const initialTexts = getInitialTexts();
  
  // KRW mainChange 동적 계산 (초기값 설정 시에도)
  const initialKrwChange = total.costRate25F_krw - total.costRate25F_usd;
  const initialKrwChangeText = initialKrwChange > 0 
    ? `▲ ${initialKrwChange.toFixed(1)}%p 악화`
    : initialKrwChange < 0 
    ? `▼ ${Math.abs(initialKrwChange).toFixed(1)}%p 개선`
    : `➡️ 0.0%p 동일`;
  
  // 편집 가능한 텍스트 상태
  const [usdTexts, setUsdTexts] = useState(initialTexts.usd);
  const [krwTexts, setKrwTexts] = useState({
    ...initialTexts.krw,
    mainChange: initialKrwChangeText, // 초기값도 동적으로 계산
  });
  
  // CSV 데이터가 로드되면 state 업데이트
  useEffect(() => {
    if (csvInsights) {
      setUsdTexts(csvInsights.usd);
      setKrwTexts(csvInsights.krw);
    }
  }, [csvInsights]);

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
  const addItem = (section: 'usd' | 'krw') => {
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
  };

  // 항목 삭제 함수
  const deleteItem = (section: 'usd' | 'krw', index: number) => {
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

  // 편집 가능한 텍스트 컴포넌트
  const EditableText = ({ id, value, multiline = false, className, onSave }: any) => {
    const isEditing = editMode === id;
    
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
          onClick={() => setEditMode(null)}
          className="self-end text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          저장
        </button>
      </div>
    ) : (
      <div className="group relative">
        <span className={className}>{value}</span>
        <button
          onClick={() => setEditMode(id)}
          className="ml-2 text-xs text-blue-500 opacity-0 group-hover:opacity-100"
        >
          ✏️
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-700">
          USD 기준 vs KRW 기준 원가율 비교 분석
        </h2>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: USD 기준 (전년 → 당년) */}
        <div className="border-l-4 border-green-400 bg-blue-50/50 rounded-r-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-green-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <EditableText
                  id="usd-title"
                  value={usdTexts.title}
                  className=""
                  onSave={(val: string) => handleTextEdit('usd', 'title', val)}
                />
              </h3>
              <div className="text-2xl font-bold text-gray-700 mt-2">
                <span className="text-gray-500">
                  {total.costRate24F_usd.toFixed(1)}%
                </span>
                {' → '}
                <span className="text-green-600">{total.costRate25F_usd.toFixed(1)}%</span>
              </div>
              <div className="text-sm text-green-600 font-bold mt-2">
                <EditableText
                  id="usd-main-change"
                  value={usdTexts.mainChange}
                  className=""
                  onSave={(val: string) => handleTextEdit('usd', 'mainChange', val)}
                />
              </div>
            </div>
          </div>

          {/* USD 개선 항목들 */}
          <div className="space-y-2.5 mb-3">
            {usdTexts.items.map((item: any, idx: number) => {
              const itemId = `usd-${idx}`;
              const isCollapsed = collapsedItems.has(itemId);
              
              return (
                <div key={idx} className="bg-white rounded p-3 shadow-sm border border-gray-100 group/item">
                  <div className="flex items-start gap-3 mb-1">
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="text-base w-5 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      title={isCollapsed ? '펼치기' : '접기'}
                    >
                      {item.icon}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EditableText
                          id={`usd-title-${idx}`}
                          value={item.title}
                          className="font-semibold text-gray-700 text-sm"
                          onSave={(val: string) => handleTextEdit('usd', 'title', val, idx)}
                        />
                        <EditableText
                          id={`usd-change-${idx}`}
                          value={item.change}
                          className="text-xs font-bold text-green-600"
                          onSave={(val: string) => handleTextEdit('usd', 'change', val, idx)}
                        />
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
                    <div className="ml-8">
                      <EditableText
                        id={`usd-desc-${idx}`}
                        value={item.description}
                        multiline
                        className="text-xs text-gray-600"
                        onSave={(val: string) => handleTextEdit('usd', 'description', val, idx)}
                      />
                      <div className="h-0.5 bg-green-400 rounded-full mt-2" style={{ width: '60%' }}></div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* 항목 추가 버튼 - Alt 키 누를 때만 표시 */}
            {showManageButtons && (
              <button
                onClick={() => addItem('usd')}
                className="w-full py-2 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 hover:border-green-400 transition-colors text-sm font-medium"
              >
                + 항목 추가
              </button>
            )}
          </div>

          {/* USD 핵심 메시지 */}
          <div className="bg-blue-500/90 text-white rounded p-3 min-h-[80px]">
            <div className="flex items-start gap-3">
              <span className="text-base w-5 flex-shrink-0">💡</span>
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">핵심 메시지</div>
                <div className="text-xs leading-relaxed">
                  <EditableText
                    id="usd-summary"
                    value={usdTexts.summary}
                    multiline
                    className=""
                    onSave={(val: string) => handleTextEdit('usd', 'summary', val)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: KRW 기준 (당년 USD → 당년 KRW) */}
        <div className="border-l-4 border-orange-400 bg-orange-50/50 rounded-r-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-orange-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <EditableText
                  id="krw-title"
                  value={krwTexts.title}
                  className=""
                  onSave={(val: string) => handleTextEdit('krw', 'title', val)}
                />
              </h3>
              <div className="text-2xl font-bold text-gray-700 mt-2">
                <span className="text-gray-500">{total.costRate25F_usd.toFixed(1)}%</span>
                {' → '}
                <span className="text-red-600">{total.costRate25F_krw.toFixed(1)}%</span>
              </div>
              <div className="text-sm text-red-600 font-bold mt-2">
                <EditableText
                  id="krw-main-change"
                  value={krwTexts.mainChange}
                  className=""
                  onSave={(val: string) => handleTextEdit('krw', 'mainChange', val)}
                />
              </div>
            </div>
          </div>

          {/* KRW 리스크 항목들 */}
          <div className="space-y-2.5 mb-3">
            {krwTexts.items.map((item: any, idx: number) => {
              const itemId = `krw-${idx}`;
              const isCollapsed = collapsedItems.has(itemId);
              
              return (
                <div key={idx} className="bg-white rounded p-3 shadow-sm border border-gray-100 group/item">
                  <div className="flex items-start gap-3 mb-1">
                    <button
                      onClick={() => toggleItem(itemId)}
                      className="text-base w-5 flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      title={isCollapsed ? '펼치기' : '접기'}
                    >
                      {item.icon}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EditableText
                          id={`krw-title-${idx}`}
                          value={item.title}
                          className="font-semibold text-gray-700 text-sm"
                          onSave={(val: string) => handleTextEdit('krw', 'title', val, idx)}
                        />
                        <EditableText
                          id={`krw-change-${idx}`}
                          value={item.change}
                          className="text-xs font-bold text-red-600"
                          onSave={(val: string) => handleTextEdit('krw', 'change', val, idx)}
                        />
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
                    <div className="ml-8">
                      <EditableText
                        id={`krw-desc-${idx}`}
                        value={item.description}
                        multiline
                        className="text-xs text-gray-600"
                        onSave={(val: string) => handleTextEdit('krw', 'description', val, idx)}
                      />
                      <div className="h-0.5 bg-orange-400 rounded-full mt-2" style={{ width: '60%' }}></div>
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
          <div className="bg-orange-500/90 text-white rounded p-3 min-h-[80px]">
            <div className="flex items-start gap-3">
              <span className="text-base w-5 flex-shrink-0">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">핵심 메시지</div>
                <div className="text-xs leading-relaxed">
                  <EditableText
                    id="krw-summary"
                    value={krwTexts.summary}
                    multiline
                    className=""
                    onSave={(val: string) => handleTextEdit('krw', 'summary', val)}
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
