'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home, Calendar, Download, RefreshCw } from 'lucide-react';
import EnhancedStoryCards from '@/components/EnhancedStoryCards';
import Dashboard from '@/components/Dashboard';
import CategoryComparison from '@/components/CategoryComparison';
import WaterfallChart, { InsightSection } from '@/components/WaterfallChart';
import ExecutiveSummary from '@/components/ExecutiveSummary';
import KeyMetricsTable from '@/components/KeyMetricsTable';
import CostRateSummaryTable from '@/components/CostRateSummaryTable';
import { loadCostData, loadSummaryData, loadExchangeRates } from '@/lib/csvParser';
import Papa from 'papaparse';
import { loadInsightsFromCSV, detectSeasonType, isSummaryDataValid } from '@/lib/insightsLoader';
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
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [aiInsights, setAiInsights] = useState<{
    action: string[];
    risk: string[];
    success: string[];
    actionSummary?: string;
    riskSummary?: string;
    successSummary?: string;
    message: string;
  } | null>(null);

  // 의류 / ACC 카테고리 상태 (상세 대시보드용)
  const [categoryType, setCategoryType] = useState<'apparel' | 'acc'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const category = params.get('category');
      if (category === 'apparel' || category === 'acc') {
        return category;
      }
    }
    // URL 정보가 없으면 브랜드 ID 기반으로 기본값 결정
    return (typeof params.brand === 'string' && params.brand.includes('-NON')) ? 'acc' : 'apparel';
  });

  // CSV에서 인사이트 로드 (초기화) - 데이터가 유효할 때만
  useEffect(() => {
    if (summary && isSummaryDataValid(summary)) {
      const seasonType = detectSeasonType(summary.total.qty24F);
      
      // 25SS, 26SS 등은 brandId에서 기간 추출
      let actualSeasonType = seasonType;
      if (brandId === 'DISCOVERY-KIDS') {
        // 25FW DISCOVERY-KIDS는 명시적으로 25FW로 설정
        actualSeasonType = '25FW';
      } else if (brandId.startsWith('25SS-') || brandId.startsWith('26SS-') || brandId.startsWith('26FW-')) {
        actualSeasonType = brandId.startsWith('25SS-') ? '25SS' : 
                          brandId.startsWith('26SS-') ? '26SS' : '26FW';
      } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
        // 25FW 기간의 NON 브랜드들
        actualSeasonType = '25FW';
      } else if (brandId.startsWith('26SS-') && brandId.endsWith('-NON')) {
        actualSeasonType = '26SS';
      } else if (brandId.startsWith('26FW-') && brandId.endsWith('-NON')) {
        actualSeasonType = '26FW';
      } else if (brandId.includes('DISCOVERY-KIDS')) {
        // 25SS-DISCOVERY-KIDS, 26SS-DISCOVERY-KIDS, 26FW-DISCOVERY-KIDS
        if (brandId.startsWith('25SS-')) {
          actualSeasonType = '25SS';
        } else if (brandId.startsWith('26SS-')) {
          actualSeasonType = '26SS';
        } else if (brandId.startsWith('26FW-')) {
          actualSeasonType = '26FW';
        }
      }

      loadInsightsFromCSV(actualSeasonType, brandId).then(data => {
        if (data && (data.actions?.length > 0 || data.risks?.length > 0 || data.success?.length > 0 || data.message)) {
          setAiInsights({
            action: data.actions || [],
            risk: data.risks || [],
            success: data.success || [],
            actionSummary: data.actionSummary,
            riskSummary: data.riskSummary,
            successSummary: data.successSummary,
            message: data.message || '',
          });
        }
      });
    }
  }, [summary, brandId]);

  // 모든 브랜드 정보
  const allBrands = [
    { id: '25FW', name: 'MLB 25FW', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700', period: '25FW' },
    { id: 'KIDS', name: 'MLB KIDS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '25FW' },
    { id: 'DISCOVERY', name: 'DISCOVERY', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '25FW' },
    { id: 'DISCOVERY-KIDS', name: 'DISCOVERY KIDS', icon: 'DK', iconBg: 'bg-teal-300', textColor: 'text-teal-700', period: '25FW' },
    { id: 'ST', name: 'SERGIO TACCHINI 25FW', icon: 'ST', iconBg: 'bg-purple-300', textColor: 'text-purple-700', period: '25FW' },
    { id: 'V', name: 'DUVETICA 25FW', icon: 'DV', iconBg: 'bg-indigo-300', textColor: 'text-indigo-700', period: '25FW' },
    { id: '26SS-M', name: 'MLB 26SS', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700', period: '26SS' },
    { id: '26SS-I', name: 'MLB KIDS 26SS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '26SS' },
    { id: '26SS-X', name: 'DISCOVERY 26SS', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '26SS' },
    { id: '26SS-DISCOVERY-KIDS', name: 'DISCOVERY KIDS 26SS', icon: 'DK', iconBg: 'bg-teal-300', textColor: 'text-teal-700', period: '26SS' },
    { id: '26SS-ST', name: 'SERGIO TACCHINI 26SS', icon: 'ST', iconBg: 'bg-purple-300', textColor: 'text-purple-700', period: '26SS' },
    { id: '26SS-V', name: 'DUVETICA 26SS', icon: 'DV', iconBg: 'bg-indigo-300', textColor: 'text-indigo-700', period: '26SS' },
    { id: '26FW-M', name: 'MLB 26FW', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700', period: '26FW' },
    { id: '26FW-I', name: 'MLB KIDS 26FW', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '26FW' },
    { id: '26FW-X', name: 'DISCOVERY 26FW', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '26FW' },
    { id: '26FW-DISCOVERY-KIDS', name: 'DISCOVERY KIDS 26FW', icon: 'DK', iconBg: 'bg-teal-300', textColor: 'text-teal-700', period: '26FW' },
    { id: '26FW-ST', name: 'SERGIO TACCHINI 26FW', icon: 'ST', iconBg: 'bg-purple-300', textColor: 'text-purple-700', period: '26FW' },
    { id: '26FW-V', name: 'DUVETICA 26FW', icon: 'DV', iconBg: 'bg-indigo-300', textColor: 'text-indigo-700', period: '26FW' },
    { id: '25SS-M', name: 'MLB 25SS', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700', period: '25SS' },
    { id: '25SS-I', name: 'MLB KIDS 25SS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '25SS' },
    { id: '25SS-X', name: 'DISCOVERY 25SS', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '25SS' },
    { id: '25SS-DISCOVERY-KIDS', name: 'DISCOVERY KIDS 25SS', icon: 'DK', iconBg: 'bg-teal-300', textColor: 'text-teal-700', period: '25SS' },
    { id: '25SS-ST', name: 'SERGIO TACCHINI 25SS', icon: 'ST', iconBg: 'bg-purple-300', textColor: 'text-purple-700', period: '25SS' },
    { id: '25SS-V', name: 'DUVETICA 25SS', icon: 'DV', iconBg: 'bg-indigo-300', textColor: 'text-indigo-700', period: '25SS' },
  ];

  // 현재 브랜드의 기간 추출
  const currentPeriod = React.useMemo(() => {
    if (brandId.startsWith('26SS-')) return '26SS';
    if (brandId.startsWith('26FW-')) return '26FW';
    if (brandId.startsWith('25SS-')) return '25SS';
    return '25FW';
  }, [brandId]);

  // 현재 브랜드 코드 추출 (26SS-M → M, 25SS-M → M, 25FW → 25FW, KIDS → KIDS)
  const currentBrandCode = React.useMemo(() => {
    if (brandId.startsWith('26SS-')) {
      // DISCOVERY-KIDS는 전체를 반환
      if (brandId.includes('DISCOVERY-KIDS')) {
        return 'DISCOVERY-KIDS';
      }
      return brandId.split('-')[1]; // M, I, X, ST, V
    }
    if (brandId.startsWith('26FW-')) {
      if (brandId.includes('DISCOVERY-KIDS')) {
        return 'DISCOVERY-KIDS';
      }
      return brandId.split('-')[1];
    }
    if (brandId.startsWith('25SS-')) {
      // DISCOVERY-KIDS는 전체를 반환
      if (brandId.includes('DISCOVERY-KIDS')) {
        return 'DISCOVERY-KIDS';
      }
      return brandId.split('-')[1]; // M, I, X, ST, V
    }
    return brandId; // 25FW, NON, KIDS, DISCOVERY, DISCOVERY-KIDS
  }, [brandId]);

  // 브랜드 코드 매핑 (25SS, 26SS 브랜드 → 25FW 브랜드) - 레거시/백업용
  const brandCodeMapping: Record<string, Record<string, string>> = {
    'M': { '25FW': '25FW', '25SS': '25SS-M', '26SS': '26SS-M', '26FW': '26FW-M' },
    'I': { '25FW': 'KIDS', '25SS': '25SS-I', '26SS': '26SS-I', '26FW': '26FW-I' },
    'X': { '25FW': 'DISCOVERY', '25SS': '25SS-X', '26SS': '26SS-X', '26FW': '26FW-X' },
    'ST': { '25FW': 'ST', '25SS': '25SS-ST', '26SS': '26SS-ST', '26FW': '26FW-ST' },
    'V': { '25FW': 'V', '25SS': '25SS-V', '26SS': '26SS-V', '26FW': '26FW-V' },
    '25FW': { '25FW': '25FW', '25SS': '25SS-M', '26SS': '26SS-M', '26FW': '26FW-M' },
    'KIDS': { '25FW': 'KIDS', '25SS': '25SS-I', '26SS': '26SS-I', '26FW': '26FW-I' },
    'DISCOVERY': { '25FW': 'DISCOVERY', '25SS': '25SS-X', '26SS': '26SS-X', '26FW': '26FW-X' },
    'DISCOVERY-KIDS': { '25FW': 'DISCOVERY-KIDS', '25SS': '25SS-DISCOVERY-KIDS', '26SS': '26SS-DISCOVERY-KIDS', '26FW': '26FW-DISCOVERY-KIDS' },
  };

  // MLB / MK / DX 브랜드 코드 추출 (패턴 기반)
  const getBrandCodeFromId = (id: string): 'M' | 'I' | 'X' | null => {
    if (id === '25FW') return 'M';
    if (id === 'M-NON') return 'M';
    if (id === 'KIDS' || id === 'I-NON') return 'I';
    if (id === 'DISCOVERY' || id === 'X-NON') return 'X';

    const parts = id.split('-');
    if (parts.length === 0) return null;
    const last = parts[parts.length - 1];

    if (last === 'M' || last === 'I' || last === 'X') {
      return last;
    }

    // 26SS-M-NON, 27FW-X-NON 등
    if (last === 'NON' && parts.length >= 2) {
      const code = parts[parts.length - 2];
      if (code === 'M' || code === 'I' || code === 'X') {
        return code;
      }
    }
    return null;
  };

  // 의류용 브랜드 ID 생성 (패턴 + 특수 케이스)
  const getApparelBrandIdForPeriod = (period: string, code: 'M' | 'I' | 'X'): string | null => {
    if (period === '25FW') {
      if (code === 'M') return '25FW';
      if (code === 'I') return 'KIDS';
      if (code === 'X') return 'DISCOVERY';
      return null;
    }
    return `${period}-${code}`;
  };

  // ACC용 브랜드 ID 생성 (패턴 + 특수 케이스)
  const getAccBrandIdForPeriod = (period: string, code: 'M' | 'I' | 'X'): string | null => {
    if (period === '25FW') {
      // 25FW 기간의 NON 브랜드들
      if (code === 'M') return 'M-NON';
      if (code === 'I') return 'I-NON';
      if (code === 'X') return 'X-NON';
      return null;
    }
    // 새 시즌(예: 27FW)도 동일 패턴으로 자동 동작
    return `${period}-${code}-NON`;
  };

  // 기간 선택 핸들러 (카테고리/브랜드 코드 유지, 패턴 기반)
  const handlePeriodChange = (newPeriod: string) => {
    const code = getBrandCodeFromId(brandId);
    let targetBrandId: string | null = null;

    if (code) {
      if (categoryType === 'acc') {
        targetBrandId = getAccBrandIdForPeriod(newPeriod, code);
      } else {
        targetBrandId = getApparelBrandIdForPeriod(newPeriod, code);
      }
    }

    // 패턴으로 찾지 못한 경우 기존 매핑을 백업으로 사용
    if (!targetBrandId) {
      const baseBrandCode = currentBrandCode;
      targetBrandId = brandCodeMapping[baseBrandCode]?.[newPeriod] || null;
    }

    if (targetBrandId) {
      router.push(`/dashboard/${targetBrandId}?period=${newPeriod}&category=${categoryType}`);
    } else {
      // 해당 기간에 브랜드가 없으면 홈으로 이동
      router.push(`/?period=${newPeriod}&category=${categoryType}`);
    }
  };

  // 현재 기간에 맞는 의류 브랜드만 필터링 (ACC 브랜드는 별도 처리)
  const filteredApparelBrands = React.useMemo(() => {
    return allBrands.filter(brand => brand.period === currentPeriod);
  }, [currentPeriod]);

  // ACC 모드에서 사용할 헤더 아이콘 (MLB / MK / DX만, 패턴 기반)
  const accHeaderBrands = React.useMemo(() => {
    if (categoryType !== 'acc') return [];

    const baseIcons = [
      { code: 'M' as const, icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700' },
      { code: 'I' as const, icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700' },
      { code: 'X' as const, icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700' },
    ];

    return baseIcons
      .map((base) => {
        const targetId = getAccBrandIdForPeriod(currentPeriod, base.code);
        if (!targetId) return null;
        return {
          id: targetId,
          name: `${base.icon} ${currentPeriod} ACC`,
          icon: base.icon,
          iconBg: base.iconBg,
          textColor: base.textColor,
          period: currentPeriod,
        };
      })
      .filter((b) => b !== null) as typeof allBrands;
  }, [categoryType, currentPeriod]);

  // 헤더에서 사용할 브랜드 리스트 (의류 / ACC 모드에 따라 변경)
  const headerBrands = React.useMemo(() => {
    if (categoryType === 'acc') {
      return accHeaderBrands;
    }
    return filteredApparelBrands;
  }, [categoryType, accHeaderBrands, filteredApparelBrands]);

  // 사용 가능한 기간 목록 (연도순, 연도 내에서 SS-FW 순서)
  const availablePeriods = [
    { id: '25SS', label: '25SS', value: '25SS' },
    { id: '25FW', label: '25FW', value: '25FW' },
    { id: '26SS', label: '26SS', value: '26SS' },
    { id: '26FW', label: '26FW', value: '26FW' },
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
    'DISCOVERY-KIDS': { 
      name: 'DISCOVERY KIDS', 
      color: 'teal',
      headerBg: 'bg-gradient-to-r from-teal-300 to-teal-200',
      headerText: 'text-teal-700',
      headerTextHover: 'hover:text-teal-800',
      infoBg: 'bg-teal-200',
      infoBorder: 'border-teal-300',
      infoTitle: 'text-teal-700',
      infoText: 'text-teal-700',
      buttonBg: 'bg-teal-300',
      buttonHover: 'hover:bg-teal-400',
    },
    'ST': { 
      name: 'SERGIO TACCHINI 25FW', 
      color: 'purple',
      headerBg: 'bg-gradient-to-r from-purple-300 to-purple-200',
      headerText: 'text-purple-700',
      headerTextHover: 'hover:text-purple-800',
      infoBg: 'bg-purple-200',
      infoBorder: 'border-purple-300',
      infoTitle: 'text-purple-700',
      infoText: 'text-purple-700',
      buttonBg: 'bg-purple-300',
      buttonHover: 'hover:bg-purple-400',
    },
    'V': { 
      name: 'DUVETICA 25FW', 
      color: 'indigo',
      headerBg: 'bg-gradient-to-r from-indigo-300 to-indigo-200',
      headerText: 'text-indigo-700',
      headerTextHover: 'hover:text-indigo-800',
      infoBg: 'bg-indigo-200',
      infoBorder: 'border-indigo-300',
      infoTitle: 'text-indigo-700',
      infoText: 'text-indigo-700',
      buttonBg: 'bg-indigo-300',
      buttonHover: 'hover:bg-indigo-400',
    },
    '26SS-M': { 
      name: 'MLB 26SS', 
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
    '26SS-I': { 
      name: 'MLB KIDS 26SS', 
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
    '26SS-X': { 
      name: 'DISCOVERY 26SS', 
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
    '26SS-DISCOVERY-KIDS': { 
      name: 'DISCOVERY KIDS 26SS', 
      color: 'teal',
      headerBg: 'bg-gradient-to-r from-teal-300 to-teal-200',
      headerText: 'text-teal-700',
      headerTextHover: 'hover:text-teal-800',
      infoBg: 'bg-teal-200',
      infoBorder: 'border-teal-300',
      infoTitle: 'text-teal-700',
      infoText: 'text-teal-700',
      buttonBg: 'bg-teal-300',
      buttonHover: 'hover:bg-teal-400',
    },
    '26SS-ST': { 
      name: 'SERGIO TACCHINI 26SS', 
      color: 'purple',
      headerBg: 'bg-gradient-to-r from-purple-300 to-purple-200',
      headerText: 'text-purple-700',
      headerTextHover: 'hover:text-purple-800',
      infoBg: 'bg-purple-200',
      infoBorder: 'border-purple-300',
      infoTitle: 'text-purple-700',
      infoText: 'text-purple-700',
      buttonBg: 'bg-purple-300',
      buttonHover: 'hover:bg-purple-400',
    },
    '26SS-V': { 
      name: 'DUVETICA 26SS', 
      color: 'indigo',
      headerBg: 'bg-gradient-to-r from-indigo-300 to-indigo-200',
      headerText: 'text-indigo-700',
      headerTextHover: 'hover:text-indigo-800',
      infoBg: 'bg-indigo-200',
      infoBorder: 'border-indigo-300',
      infoTitle: 'text-indigo-700',
      infoText: 'text-indigo-700',
      buttonBg: 'bg-indigo-300',
      buttonHover: 'hover:bg-indigo-400',
    },
    '25SS-M': { 
      name: 'MLB 25SS', 
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
    '25SS-I': { 
      name: 'MLB KIDS 25SS', 
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
    '25SS-X': { 
      name: 'DISCOVERY 25SS', 
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
    '25SS-DISCOVERY-KIDS': { 
      name: 'DISCOVERY KIDS 25SS', 
      color: 'teal',
      headerBg: 'bg-gradient-to-r from-teal-300 to-teal-200',
      headerText: 'text-teal-700',
      headerTextHover: 'hover:text-teal-800',
      infoBg: 'bg-teal-200',
      infoBorder: 'border-teal-300',
      infoTitle: 'text-teal-700',
      infoText: 'text-teal-700',
      buttonBg: 'bg-teal-300',
      buttonHover: 'hover:bg-teal-400',
    },
    '25SS-ST': { 
      name: 'SERGIO TACCHINI 25SS', 
      color: 'purple',
      headerBg: 'bg-gradient-to-r from-purple-300 to-purple-200',
      headerText: 'text-purple-700',
      headerTextHover: 'hover:text-purple-800',
      infoBg: 'bg-purple-200',
      infoBorder: 'border-purple-300',
      infoTitle: 'text-purple-700',
      infoText: 'text-purple-700',
      buttonBg: 'bg-purple-300',
      buttonHover: 'hover:bg-purple-400',
    },
    '25SS-V': { 
      name: 'DUVETICA 25SS', 
      color: 'indigo',
      headerBg: 'bg-gradient-to-r from-indigo-300 to-indigo-200',
      headerText: 'text-indigo-700',
      headerTextHover: 'hover:text-indigo-800',
      infoBg: 'bg-indigo-200',
      infoBorder: 'border-indigo-300',
      infoTitle: 'text-indigo-700',
      infoText: 'text-indigo-700',
      buttonBg: 'bg-indigo-300',
      buttonHover: 'hover:bg-indigo-400',
    },
    '26FW-M': { 
      name: 'MLB 26FW', 
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
    '26FW-I': { 
      name: 'MLB KIDS 26FW', 
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
    '26FW-X': { 
      name: 'DISCOVERY 26FW', 
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
    '26FW-DISCOVERY-KIDS': { 
      name: 'DISCOVERY KIDS 26FW', 
      color: 'teal',
      headerBg: 'bg-gradient-to-r from-teal-300 to-teal-200',
      headerText: 'text-teal-700',
      headerTextHover: 'hover:text-teal-800',
      infoBg: 'bg-teal-200',
      infoBorder: 'border-teal-300',
      infoTitle: 'text-teal-700',
      infoText: 'text-teal-700',
      buttonBg: 'bg-teal-300',
      buttonHover: 'hover:bg-teal-400',
    },
    '26FW-ST': { 
      name: 'SERGIO TACCHINI 26FW', 
      color: 'purple',
      headerBg: 'bg-gradient-to-r from-purple-300 to-purple-200',
      headerText: 'text-purple-700',
      headerTextHover: 'hover:text-purple-800',
      infoBg: 'bg-purple-200',
      infoBorder: 'border-purple-300',
      infoTitle: 'text-purple-700',
      infoText: 'text-purple-700',
      buttonBg: 'bg-purple-300',
      buttonHover: 'hover:bg-purple-400',
    },
    '26FW-V': { 
      name: 'DUVETICA 26FW', 
      color: 'indigo',
      headerBg: 'bg-gradient-to-r from-indigo-300 to-indigo-200',
      headerText: 'text-indigo-700',
      headerTextHover: 'hover:text-indigo-800',
      infoBg: 'bg-indigo-200',
      infoBorder: 'border-indigo-300',
      infoTitle: 'text-indigo-700',
      infoText: 'text-indigo-700',
      buttonBg: 'bg-indigo-300',
      buttonHover: 'hover:bg-indigo-400',
    },
    'M-NON': { 
      name: 'MLB NON 25FW', 
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
    'I-NON': { 
      name: 'MK NON 25FW', 
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
    'X-NON': { 
      name: 'DX NON 25FW', 
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
    '26SS-M-NON': { 
      name: 'MLB NON 26SS', 
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
    '26SS-I-NON': { 
      name: 'MK NON 26SS', 
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
    '26SS-X-NON': { 
      name: 'DX NON 26SS', 
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
    '26FW-M-NON': { 
      name: 'MLB NON 26FW', 
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
    '26FW-I-NON': { 
      name: 'MK NON 26FW', 
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
    '26FW-X-NON': { 
      name: 'DX NON 26FW', 
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
      // 브랜드에 따라 다른 CSV 파일 로드
      let csvFileName: string = '';
      let fxFileName: string = '';
      let summaryFileName: string = '';
      
      try {
        setLoading(true);
        
        switch (brandId) {
          case '25FW':
            csvFileName = 'COST RAW/25FW/M_25F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_m.json';
            break;
          case 'KIDS':
            csvFileName = 'COST RAW/25FW/I_25F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_i.json';
            break;
          case 'DISCOVERY':
            csvFileName = 'COST RAW/25FW/X_25F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_x.json';
            break;
          case 'DISCOVERY-KIDS':
            csvFileName = 'COST RAW/25FW/X_25F_kids.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_x_kids.json';
            break;
          case 'ST':
            csvFileName = 'COST RAW/25FW/ST_25F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_st.json';
            break;
          case 'V':
            csvFileName = 'COST RAW/25FW/V_25F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_v.json';
            break;
          case '26SS-M':
            csvFileName = 'COST RAW/26SS/M_26S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_m.json';
            break;
          case '26SS-I':
            csvFileName = 'COST RAW/26SS/I_26S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_i.json';
            break;
          case '26SS-X':
            csvFileName = 'COST RAW/26SS/X_26S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_x.json';
            break;
          case '26SS-DISCOVERY-KIDS':
            csvFileName = 'COST RAW/26SS/X_26S_kids.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_x_kids.json';
            break;
          case '26SS-ST':
            csvFileName = 'COST RAW/26SS/ST_26S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_st.json';
            break;
          case '26SS-V':
            csvFileName = 'COST RAW/26SS/V_26S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_v.json';
            break;
          case '25SS-M':
            csvFileName = 'COST RAW/25S/M_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_m.json';
            break;
          case '25SS-I':
            csvFileName = 'COST RAW/25S/I_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_i.json';
            break;
          case '25SS-X':
            csvFileName = 'COST RAW/25S/X_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_x.json';
            break;
          case '25SS-DISCOVERY-KIDS':
            csvFileName = 'COST RAW/25S/X_25S_kids.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25ss_x_kids.json';
            break;
          case '25SS-ST':
            csvFileName = 'COST RAW/25S/ST_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_st.json';
            break;
          case 'M-NON':
            csvFileName = 'COST RAW/25FW/M_25F_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_m_non.json';
            break;
          case 'I-NON':
            csvFileName = 'COST RAW/25FW/I_25F_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_i_non.json';
            break;
          case 'X-NON':
            csvFileName = 'COST RAW/25FW/X_25F_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_x_non.json';
            break;
          case '26SS-M-NON':
            csvFileName = 'COST RAW/26SS/M_26S_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_m_non.json';
            break;
          case '26SS-I-NON':
            csvFileName = 'COST RAW/26SS/I_26S_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_i_non.json';
            break;
          case '26SS-X-NON':
            csvFileName = 'COST RAW/26SS/X_26S_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/26SS/summary_26s_x_non.json';
            break;
          case '26FW-M-NON':
            csvFileName = 'COST RAW/26FW/M_26F_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_m_non.json';
            break;
          case '26FW-I-NON':
            csvFileName = 'COST RAW/26FW/I_26F_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_i_non.json';
            break;
          case '26FW-X-NON':
            csvFileName = 'COST RAW/26FW/X_26F_NON.csv';
            fxFileName = 'COST RAW/FX_NON.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_x_non.json';
            break;
          case '25SS-V':
            csvFileName = 'COST RAW/25S/V_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_v.json';
            break;
          case '26FW-M':
            csvFileName = 'COST RAW/26FW/M_26F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_m.json';
            break;
          case '26FW-I':
            csvFileName = 'COST RAW/26FW/I_26F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_i.json';
            break;
          case '26FW-X':
            csvFileName = 'COST RAW/26FW/X_26F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_x.json';
            break;
          case '26FW-DISCOVERY-KIDS':
            csvFileName = 'COST RAW/26FW/X_26F_kids.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_x_kids.json';
            break;
          case '26FW-ST':
            csvFileName = 'COST RAW/26FW/ST_26F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_st.json';
            break;
          case '26FW-V':
            csvFileName = 'COST RAW/26FW/V_26F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26FW/summary_26fw_v.json';
            break;
          default:
            setError('유효하지 않은 브랜드입니다.');
            setLoading(false);
            return;
        }
        
        // CSV 파일명을 state에 저장 (다운로드용)
        setCsvFileName(csvFileName);
        
        // 병렬 데이터 로딩: CSV, Summary, 환율 정보를 동시에 로드
        let costDataPromise: Promise<any>;
        if (brandId.startsWith('26SS-')) {
          costDataPromise = loadCostData(csvFileName, fxFileName, brandId, '26SS', '25SS');
        } else if (brandId.startsWith('26FW-')) {
          costDataPromise = loadCostData(csvFileName, fxFileName, brandId, '26FW', '25FW');
        } else if (brandId.startsWith('25SS-')) {
          costDataPromise = loadCostData(csvFileName, fxFileName, brandId, '25SS', '24SS');
        } else if (brandId === '25FW' || brandId === 'KIDS' || brandId === 'DISCOVERY' || brandId === 'DISCOVERY-KIDS' || brandId === 'ST' || brandId === 'V') {
          // 25FW 기간 브랜드들 (M, I, X, ST, V) - 새 구조
          const brandCode = brandId === '25FW' ? 'M' : brandId === 'KIDS' ? 'I' : brandId === 'DISCOVERY' ? 'X' : brandId === 'DISCOVERY-KIDS' ? 'DISCOVERY-KIDS' : brandId;
          // 25FW-{brandCode} 형식으로 만들어서 일관성 유지 (DISCOVERY-KIDS는 그대로 전달)
          const brandIdForLoad = brandId === 'DISCOVERY-KIDS' ? 'DISCOVERY-KIDS' : `25FW-${brandCode}`;
          costDataPromise = loadCostData(csvFileName, fxFileName, brandIdForLoad, '25FW', '24FW');
        } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
          // 25FW 기간의 NON 브랜드들
          costDataPromise = loadCostData(csvFileName, fxFileName, brandId, '25FW', '24FW');
        } else if (brandId.startsWith('26SS-') && brandId.endsWith('-NON')) {
          costDataPromise = loadCostData(csvFileName, fxFileName, brandId, '26SS', '25SS');
        } else if (brandId.startsWith('26FW-') && brandId.endsWith('-NON')) {
          costDataPromise = loadCostData(csvFileName, fxFileName, brandId, '26FW', '25FW');
        } else {
          costDataPromise = loadCostData(csvFileName, fxFileName);
        }
        
        let fxRatesPromise: Promise<any>;
        // 새로운 시즌 형식(26SS-*, 26FW-*, 25SS-* 등)인 경우 브랜드 ID와 시즌 정보 전달
        if (brandId.startsWith('26SS-')) {
          fxRatesPromise = loadExchangeRates(fxFileName, brandId, '26SS', '25SS');
        } else if (brandId.startsWith('26FW-')) {
          fxRatesPromise = loadExchangeRates(fxFileName, brandId, '26FW', '25FW');
        } else if (brandId.startsWith('25SS-')) {
          fxRatesPromise = loadExchangeRates(fxFileName, brandId, '25SS', '24SS');
        } else if (brandId === '25FW' || brandId === 'KIDS' || brandId === 'DISCOVERY' || brandId === 'DISCOVERY-KIDS' || brandId === 'ST' || brandId === 'V') {
          // 25FW 기간 브랜드들 (M, I, X, ST, V) - 새 구조
          const brandCode = brandId === '25FW' ? 'M' : brandId === 'KIDS' ? 'I' : brandId === 'DISCOVERY' ? 'X' : brandId === 'DISCOVERY-KIDS' ? 'DISCOVERY-KIDS' : brandId;
          // 25FW-{brandCode} 형식으로 만들어서 일관성 유지 (DISCOVERY-KIDS는 그대로 전달)
          const brandIdForFx = brandId === 'DISCOVERY-KIDS' ? 'DISCOVERY-KIDS' : `25FW-${brandCode}`;
          fxRatesPromise = loadExchangeRates(fxFileName, brandIdForFx, '25FW', '24FW');
        } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
          // 25FW 기간의 NON 브랜드들
          fxRatesPromise = loadExchangeRates(fxFileName, brandId, '25FW', '24FW');
        } else if (brandId.startsWith('26SS-') && brandId.endsWith('-NON')) {
          fxRatesPromise = loadExchangeRates(fxFileName, brandId, '26SS', '25SS');
        } else if (brandId.startsWith('26FW-') && brandId.endsWith('-NON')) {
          fxRatesPromise = loadExchangeRates(fxFileName, brandId, '26FW', '25FW');
        } else {
          // 기존 브랜드는 기존 방식 유지
          fxRatesPromise = loadExchangeRates(fxFileName);
        }
        
        // 병렬 로딩 실행
        console.log(`[NON 시즌 데이터 로딩] 브랜드: ${brandId}, CSV: ${csvFileName}, Summary: ${summaryFileName}, FX: ${fxFileName}`);
        const [costData, summaryData, fxRates] = await Promise.all([
          costDataPromise,
          loadSummaryData(summaryFileName),
          fxRatesPromise
        ]);
        
        console.log(`[NON 시즌 데이터 로딩 완료] 브랜드: ${brandId}, CostData: ${costData?.length || 0}개, Summary: ${summaryData ? '있음' : '없음'}, FX: ${fxRates ? '있음' : '없음'}`);
        
        if (summaryData?.total) {
          console.log(`[Summary 데이터 확인] qty24F=${summaryData.total.qty24F}, qty25F=${summaryData.total.qty25F}, costRate24F_usd=${summaryData.total.costRate24F_usd}, costRate25F_usd=${summaryData.total.costRate25F_usd}`);
        } else {
          console.error(`[Summary 데이터 없음] summaryData:`, summaryData);
          console.error(`[Summary 파일 경로] ${summaryFileName}`);
        }
        console.log(`[FX Rates 확인] prev=${fxRates?.prev}, curr=${fxRates?.curr}`);
        
        setItems(costData);
        
        // summaryData가 null이면 빈 객체로 처리
        const enrichedSummary = summaryData ? {
          ...summaryData,
          fx: {
            prev: fxRates.prev,
            curr: fxRates.curr,
            fileName: fxFileName
          }
        } : {
          total: null,
          categories: [],
          fx: {
            prev: fxRates.prev,
            curr: fxRates.curr,
            fileName: fxFileName
          }
        };
        
        console.log(`[enrichedSummary 설정] summaryData 존재: ${!!summaryData}, total 존재: ${!!enrichedSummary?.total}, categories 개수: ${enrichedSummary?.categories?.length || 0}`);
        if (enrichedSummary?.total) {
          console.log(`[enrichedSummary total 데이터] qty24F=${enrichedSummary.total.qty24F}, qty25F=${enrichedSummary.total.qty25F}, costRate24F_usd=${enrichedSummary.total.costRate24F_usd}`);
        }
        setSummary(enrichedSummary);
        
        setLoading(false);
      } catch (err) {
        console.error(`[NON 시즌 데이터 로드 오류] 브랜드: ${brandId}`, err);
        console.error('파일 경로:', { csvFileName, summaryFileName, fxFileName });
        setError(`데이터를 불러오는데 실패했습니다: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    if (brandId) {
      loadData();
    }
  }, [brandId]);

  // CSV 파일 다운로드 함수
  const handleDownloadCSV = async () => {
    if (!csvFileName) {
      alert('다운로드할 파일이 없습니다.');
      return;
    }

    try {
      // 파일명 추출 (경로에서 마지막 부분만)
      let fileName = csvFileName.includes('/') 
        ? csvFileName.split('/').pop() || csvFileName
        : csvFileName;

      // 파일 경로 URL 인코딩 (공백 등 특수문자 처리)
      // 경로를 '/'로 분할하여 각 부분을 인코딩
      const encodedPath = csvFileName
        .split('/')
        .map(part => encodeURIComponent(part))
        .join('/');
      
      const fileUrl = `/${encodedPath}`;
      console.log('CSV 다운로드 시도:', { original: csvFileName, encoded: fileUrl, fileName, brandId });

      // 파일 가져오기
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        console.error('파일 로드 실패:', {
          status: response.status,
          statusText: response.statusText,
          url: fileUrl
        });
        throw new Error(`파일을 불러올 수 없습니다 (${response.status}: ${response.statusText})`);
      }

      // 모든 브랜드 동일하게 처리 (이미 CSV 파일이 분리되어 있음)
      const blob = await response.blob();
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // 정리
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('CSV 다운로드 완료:', fileName);
    } catch (error) {
      console.error('CSV 다운로드 오류:', {
        error,
        csvFileName,
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      });
      alert(`CSV 파일 다운로드에 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n파일: ${csvFileName}`);
    }
  };

  // 실제 데이터에 존재하는 카테고리만 필터링
  const availableCategories = React.useMemo(() => {
    const categorySet = new Set(items.map(item => item.category));
    return [
      { id: 'Outer', name: '아우터 (Outer)', color: '#3b82f6' },
      { id: 'Inner', name: '이너 (Inner)', color: '#10b981' },
      { id: 'Bottom', name: '바텀 (Bottom)', color: '#f59e0b' },
      { id: 'Acc_etc', name: 'ACC', color: '#ef4444' },
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
                  onClick={() => router.push(`/?period=${currentPeriod}`)}
                  className="bg-white rounded-lg shadow-sm p-2 hover:shadow-md transition-all text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">{brandInfo.name} 원가 대시보드</h1>
                {/* CSV 다운로드 버튼 */}
                {csvFileName && (
                  <button
                    onClick={handleDownloadCSV}
                    className={`${brandInfo.buttonBg} ${brandInfo.headerText} rounded-lg shadow-md px-4 py-2 hover:shadow-lg transition-all font-semibold flex items-center gap-2 ${brandInfo.buttonHover}`}
                    title="CSV 파일 다운로드"
                  >
                    <Download className="w-5 h-5" />
                    <span className="text-sm">CSV 다운로드</span>
                  </button>
                )}
              </div>
              {/* 의류/ACC 선택 드롭다운 */}
              <div className="relative">
                <select
                  value={categoryType}
                  onChange={(e) => {
                    const newCategory = e.target.value === 'acc' ? 'acc' : 'apparel';
                    setCategoryType(newCategory);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors bg-white cursor-pointer appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium"
                >
                  <option value="apparel">의류</option>
                  <option value="acc">ACC</option>
                </select>
              </div>
              {/* 기간 선택 드롭다운 */}
              <div className="relative">
                <select
                  value={currentPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors bg-white cursor-pointer appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium"
                >
                  {availablePeriods.map((period) => (
                    <option key={period.id} value={period.value}>
                      {period.label}
                    </option>
                  ))}
                </select>
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              {/* 브랜드 아이콘 네비게이션 */}
              <div className="flex items-center gap-2">
                {/* 홈 아이콘 */}
                <button
                  onClick={() => router.push(`/?period=${currentPeriod}&category=${categoryType}`)}
                  className="bg-gray-200 text-gray-700 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-300 transition-all"
                  title="홈으로"
                >
                  <Home className="w-5 h-5" />
                </button>
                {headerBrands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => router.push(`/dashboard/${brand.id}?period=${currentPeriod}&category=${categoryType}`)}
                    className={`${brand.iconBg} ${brand.textColor} w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm hover:shadow-md transition-all ${
                      brandId === brand.id ? 'ring-2 ring-gray-400 ring-offset-2' : ''
                    }`}
                    title={brand.name}
                  >
                    {brand.icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="text-gray-600 text-sm">
                시즌별 원가 분석 및 인사이트 (v1.4.0)
              </p>
              <p className="text-gray-500 text-xs">
                매일 오전 11시 업데이트
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="w-full max-w-[98%] mx-auto px-2 sm:px-4 lg:px-6 py-4">
        {/* 경영진 요약 */}
        <ExecutiveSummary summary={summary} brandId={brandId} items={items} />

        {/* 인사이트 요약 - 데이터가 유효할 때만 표시 */}
        {summary && isSummaryDataValid(summary) && (
          <div className="mb-4">
            <InsightSection
              summary={summary}
              brandId={brandId}
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
              }}
              loadingAi={loadingAi}
              aiInsights={aiInsights}
            />
          </div>
        )}

        {/* 워터폴 차트 */}
        <div className="mb-4">
          {summary ? (
            <WaterfallChart summary={summary} brandId={brandId} />
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-500">
              데이터를 불러오는 중...
            </div>
          )}
        </div>

        {/* 주요 지표 비교 & 원가율 변동 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {summary ? (
            <>
              <KeyMetricsTable summary={summary} brandId={brandId} items={items} />
              <CostRateSummaryTable summary={summary} brandId={brandId} items={items} />
            </>
          ) : (
            <div className="col-span-2 bg-white rounded-xl shadow-md p-6 text-center text-gray-500">
              데이터를 불러오는 중...
            </div>
          )}
        </div>

        {/* 원가율 카드 - 새로운 디자인 */}
        {summary ? (
          <EnhancedStoryCards summary={summary} brandId={brandId} />
        ) : (
          <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-500 mb-4">
            데이터를 불러오는 중...
          </div>
        )}

        {/* 카테고리 비교 */}
        <CategoryComparison summary={summary} />

        {/* 히트맵 테이블 */}
        <Dashboard items={items} summary={summary} />

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

