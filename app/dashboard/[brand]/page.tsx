'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home, Calendar } from 'lucide-react';
import EnhancedStoryCards from '@/components/EnhancedStoryCards';
import Dashboard from '@/components/Dashboard';
import CategoryComparison from '@/components/CategoryComparison';
import WaterfallChart, { InsightSection } from '@/components/WaterfallChart';
import ExecutiveSummary from '@/components/ExecutiveSummary';
import KeyMetricsTable from '@/components/KeyMetricsTable';
import CostRateSummaryTable from '@/components/CostRateSummaryTable';
import { loadCostData, loadSummaryData, loadExchangeRates } from '@/lib/csvParser';
import { loadInsightsFromCSV, detectSeasonType } from '@/lib/insightsLoader';
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

  // CSV에서 인사이트 로드 (초기화)
  useEffect(() => {
    if (summary?.total) {
      const seasonType = detectSeasonType(summary.total.qty24F);
      
      // 25SS, 26SS 등은 brandId에서 기간 추출
      let actualSeasonType = seasonType;
      if (brandId.startsWith('25SS-') || brandId.startsWith('26SS-') || brandId.startsWith('26FW-')) {
        actualSeasonType = brandId.startsWith('25SS-') ? '25SS' : 
                          brandId.startsWith('26SS-') ? '26SS' : '26FW';
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
    { id: 'NON', name: 'MLB ACC', icon: 'MLB', iconBg: 'bg-slate-300', textColor: 'text-slate-700', period: '25FW' },
    { id: 'KIDS', name: 'MLB KIDS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '25FW' },
    { id: 'DISCOVERY', name: 'DISCOVERY', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '25FW' },
    { id: 'ST', name: 'SERGIO TACCHINI 25FW', icon: 'ST', iconBg: 'bg-purple-300', textColor: 'text-purple-700', period: '25FW' },
    { id: 'V', name: 'DUVETICA 25FW', icon: 'DV', iconBg: 'bg-indigo-300', textColor: 'text-indigo-700', period: '25FW' },
    { id: '26SS-M', name: 'MLB 26SS', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700', period: '26SS' },
    { id: '26SS-I', name: 'MLB KIDS 26SS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '26SS' },
    { id: '26SS-X', name: 'DISCOVERY 26SS', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '26SS' },
    { id: '26SS-ST', name: 'SERGIO TACCHINI 26SS', icon: 'ST', iconBg: 'bg-purple-300', textColor: 'text-purple-700', period: '26SS' },
    { id: '26SS-V', name: 'DUVETICA 26SS', icon: 'DV', iconBg: 'bg-indigo-300', textColor: 'text-indigo-700', period: '26SS' },
    { id: '25SS-M', name: 'MLB 25SS', icon: 'MLB', iconBg: 'bg-blue-300', textColor: 'text-blue-700', period: '25SS' },
    { id: '25SS-I', name: 'MLB KIDS 25SS', icon: 'MK', iconBg: 'bg-rose-300', textColor: 'text-rose-700', period: '25SS' },
    { id: '25SS-X', name: 'DISCOVERY 25SS', icon: 'DX', iconBg: 'bg-emerald-300', textColor: 'text-emerald-700', period: '25SS' },
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
      return brandId.split('-')[1]; // M, I, X, ST, V
    }
    if (brandId.startsWith('26FW-')) {
      return brandId.split('-')[1];
    }
    if (brandId.startsWith('25SS-')) {
      return brandId.split('-')[1]; // M, I, X, ST, V
    }
    return brandId; // 25FW, NON, KIDS, DISCOVERY
  }, [brandId]);

  // 브랜드 코드 매핑 (25SS, 26SS 브랜드 → 25FW 브랜드)
  const brandCodeMapping: Record<string, Record<string, string>> = {
    'M': { '25FW': '25FW', '25SS': '25SS-M', '26SS': '26SS-M', '26FW': '26FW-M' },
    'I': { '25FW': 'KIDS', '25SS': '25SS-I', '26SS': '26SS-I', '26FW': '26FW-I' },
    'X': { '25FW': 'DISCOVERY', '25SS': '25SS-X', '26SS': '26SS-X', '26FW': '26FW-X' },
    'ST': { '25FW': 'ST', '25SS': '25SS-ST', '26SS': '26SS-ST', '26FW': '26FW-ST' },
    'V': { '25FW': 'V', '25SS': '25SS-V', '26SS': '26SS-V', '26FW': '26FW-V' },
    '25FW': { '25FW': '25FW', '25SS': '25SS-M', '26SS': '26SS-M', '26FW': '26FW-M' },
    'KIDS': { '25FW': 'KIDS', '25SS': '25SS-I', '26SS': '26SS-I', '26FW': '26FW-I' },
    'DISCOVERY': { '25FW': 'DISCOVERY', '25SS': '25SS-X', '26SS': '26SS-X', '26FW': '26FW-X' },
    'NON': { '25FW': 'NON', '25SS': '', '26SS': '', '26FW': '' }, // NON은 25FW만
  };

  // 기간 선택 핸들러
  const handlePeriodChange = (newPeriod: string) => {
    const baseBrandCode = currentBrandCode;
    const newBrandId = brandCodeMapping[baseBrandCode]?.[newPeriod];
    
    if (newBrandId && newBrandId !== '') {
      router.push(`/dashboard/${newBrandId}?period=${newPeriod}`);
    } else {
      // 해당 기간에 브랜드가 없으면 홈으로 이동
      router.push(`/?period=${newPeriod}`);
    }
  };

  // 현재 기간에 맞는 브랜드만 필터링
  const filteredBrands = React.useMemo(() => {
    return allBrands.filter(brand => brand.period === currentPeriod);
  }, [currentPeriod]);

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
            csvFileName = 'COST RAW/25FW/M_25F.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25FW/summary_25fw_m.json';
            break;
          case 'NON':
            csvFileName = 'MLB non  251111.csv';
            fxFileName = 'FX 251111.csv';
            summaryFileName = 'summary.json';
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
            csvFileName = 'COST RAW/26SS/M_26SS.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26ss_m.json';
            break;
          case '26SS-I':
            csvFileName = 'COST RAW/26SS/I_26SS.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26ss_i.json';
            break;
          case '26SS-X':
            csvFileName = 'COST RAW/26SS/X_26SS.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26ss_x.json';
            break;
          case '26SS-ST':
            csvFileName = 'COST RAW/26SS/ST_26SS.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26ss_st.json';
            break;
          case '26SS-V':
            csvFileName = 'COST RAW/26SS/V_26SS.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/26SS/summary_26ss_v.json';
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
          case '25SS-ST':
            csvFileName = 'COST RAW/25S/ST_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_st.json';
            break;
          case '25SS-V':
            csvFileName = 'COST RAW/25S/V_25S.csv';
            fxFileName = 'COST RAW/FX.csv';
            summaryFileName = 'COST RAW/25S/summary_25s_v.json';
            break;
          default:
            setError('유효하지 않은 브랜드입니다.');
            setLoading(false);
            return;
        }
        
        // CSV 파일에서 아이템별 데이터 로드
        let costData;
        if (brandId.startsWith('26SS-')) {
          costData = await loadCostData(csvFileName, fxFileName, brandId, '26SS', '25SS');
        } else if (brandId.startsWith('26FW-')) {
          costData = await loadCostData(csvFileName, fxFileName, brandId, '26FW', '25FW');
        } else if (brandId.startsWith('25SS-')) {
          costData = await loadCostData(csvFileName, fxFileName, brandId, '25SS', '24SS');
        } else if (brandId === '25FW' || brandId === 'KIDS' || brandId === 'DISCOVERY' || brandId === 'ST' || brandId === 'V') {
          // 25FW 기간 브랜드들 (M, I, X, ST, V) - 새 구조
          const brandCode = brandId === '25FW' ? 'M' : brandId === 'KIDS' ? 'I' : brandId === 'DISCOVERY' ? 'X' : brandId;
          // 25FW-{brandCode} 형식으로 만들어서 일관성 유지
          costData = await loadCostData(csvFileName, fxFileName, `25FW-${brandCode}`, '25FW', '24FW');
        } else {
          costData = await loadCostData(csvFileName, fxFileName);
        }
        setItems(costData);
        
        // summary.json 로드
        const summaryData = await loadSummaryData(summaryFileName);
        
        // 환율 정보 로드하여 summary에 추가
        let fxRates;
        // 새로운 시즌 형식(26SS-*, 26FW-*, 25SS-* 등)인 경우 브랜드 ID와 시즌 정보 전달
        if (brandId.startsWith('26SS-')) {
          fxRates = await loadExchangeRates(fxFileName, brandId, '26SS', '25SS');
        } else if (brandId.startsWith('26FW-')) {
          fxRates = await loadExchangeRates(fxFileName, brandId, '26FW', '25FW');
        } else if (brandId.startsWith('25SS-')) {
          fxRates = await loadExchangeRates(fxFileName, brandId, '25SS', '24SS');
        } else if (brandId === '25FW' || brandId === 'KIDS' || brandId === 'DISCOVERY' || brandId === 'ST' || brandId === 'V') {
          // 25FW 기간 브랜드들 (M, I, X, ST, V) - 새 구조
          const brandCode = brandId === '25FW' ? 'M' : brandId === 'KIDS' ? 'I' : brandId === 'DISCOVERY' ? 'X' : brandId;
          // 25FW-{brandCode} 형식으로 만들어서 일관성 유지
          fxRates = await loadExchangeRates(fxFileName, `25FW-${brandCode}`, '25FW', '24FW');
        } else {
          // 기존 브랜드는 기존 방식 유지 (NON 등)
          fxRates = await loadExchangeRates(fxFileName);
        }
        
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
                  onClick={() => router.push(`/?period=${currentPeriod}`)}
                  className="bg-gray-200 text-gray-700 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-300 transition-all"
                  title="홈으로"
                >
                  <Home className="w-5 h-5" />
                </button>
                {filteredBrands.map((brand) => (
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
        <ExecutiveSummary summary={summary} brandId={brandId} />

        {/* 인사이트 요약 */}
        {summary && (
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
          <WaterfallChart summary={summary} brandId={brandId} />
        </div>

        {/* 주요 지표 비교 & 원가율 변동 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <KeyMetricsTable summary={summary} brandId={brandId} />
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

