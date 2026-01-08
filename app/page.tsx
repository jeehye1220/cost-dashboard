'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, Calendar, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { loadSummaryData, loadExchangeRates } from '@/lib/csvParser';
import { parseBrandId } from '@/lib/brandUtils';

const brands = [
  {
    id: '25FW',
    name: 'MLB 25FW',
    icon: 'MLB',
    period: '25FW',
    color: 'blue',
    bgColor: 'bg-blue-200',
    hoverColor: 'hover:bg-blue-300',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    iconBg: 'bg-blue-300',
    buttonBg: 'bg-blue-300',
    buttonHover: 'hover:bg-blue-400',
  },
  {
    id: 'M-NON',
    name: 'MLB NON',
    icon: 'MLB',
    period: '25FW',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: 'I-NON',
    name: 'MK NON',
    icon: 'MK',
    period: '25FW',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: 'X-NON',
    name: 'DX NON',
    icon: 'DX',
    period: '25FW',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: 'KIDS',
    name: 'MLB KIDS',
    icon: 'MK',
    period: '25FW',
    color: 'red',
    bgColor: 'bg-rose-200',
    hoverColor: 'hover:bg-rose-300',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    iconBg: 'bg-rose-300',
    buttonBg: 'bg-rose-300',
    buttonHover: 'hover:bg-rose-400',
  },
  {
    id: 'DISCOVERY',
    name: 'DISCOVERY',
    icon: 'DX',
    period: '25FW',
    color: 'green',
    bgColor: 'bg-emerald-200',
    hoverColor: 'hover:bg-emerald-300',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-300',
    buttonBg: 'bg-emerald-300',
    buttonHover: 'hover:bg-emerald-400',
  },
  {
    id: 'DISCOVERY-KIDS',
    name: 'DISCOVERY KIDS',
    icon: 'DK',
    period: '25FW',
    color: 'teal',
    bgColor: 'bg-teal-200',
    hoverColor: 'hover:bg-teal-300',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    iconBg: 'bg-teal-300',
    buttonBg: 'bg-teal-300',
    buttonHover: 'hover:bg-teal-400',
  },
  {
    id: 'ST',
    name: 'SERGIO TACCHINI',
    icon: 'ST',
    period: '25FW',
    color: 'purple',
    bgColor: 'bg-purple-200',
    hoverColor: 'hover:bg-purple-300',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    iconBg: 'bg-purple-300',
    buttonBg: 'bg-purple-300',
    buttonHover: 'hover:bg-purple-400',
  },
  {
    id: 'V',
    name: 'DUVETICA',
    icon: 'DV',
    period: '25FW',
    color: 'indigo',
    bgColor: 'bg-indigo-200',
    hoverColor: 'hover:bg-indigo-300',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    iconBg: 'bg-indigo-300',
    buttonBg: 'bg-indigo-300',
    buttonHover: 'hover:bg-indigo-400',
  },
  {
    id: '26SS-M',
    name: 'MLB',
    icon: 'MLB',
    period: '26SS',
    color: 'blue',
    bgColor: 'bg-blue-200',
    hoverColor: 'hover:bg-blue-300',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    iconBg: 'bg-blue-300',
    buttonBg: 'bg-blue-300',
    buttonHover: 'hover:bg-blue-400',
  },
  {
    id: '26SS-I',
    name: 'MLB KIDS',
    icon: 'MK',
    period: '26SS',
    color: 'red',
    bgColor: 'bg-rose-200',
    hoverColor: 'hover:bg-rose-300',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    iconBg: 'bg-rose-300',
    buttonBg: 'bg-rose-300',
    buttonHover: 'hover:bg-rose-400',
  },
  {
    id: '26SS-X',
    name: 'DISCOVERY',
    icon: 'DX',
    period: '26SS',
    color: 'green',
    bgColor: 'bg-emerald-200',
    hoverColor: 'hover:bg-emerald-300',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-300',
    buttonBg: 'bg-emerald-300',
    buttonHover: 'hover:bg-emerald-400',
  },
  {
    id: '26SS-DISCOVERY-KIDS',
    name: 'DISCOVERY KIDS',
    icon: 'DK',
    period: '26SS',
    color: 'teal',
    bgColor: 'bg-teal-200',
    hoverColor: 'hover:bg-teal-300',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    iconBg: 'bg-teal-300',
    buttonBg: 'bg-teal-300',
    buttonHover: 'hover:bg-teal-400',
  },
  {
    id: '26SS-ST',
    name: 'SERGIO TACCHINI',
    icon: 'ST',
    period: '26SS',
    color: 'purple',
    bgColor: 'bg-purple-200',
    hoverColor: 'hover:bg-purple-300',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    iconBg: 'bg-purple-300',
    buttonBg: 'bg-purple-300',
    buttonHover: 'hover:bg-purple-400',
  },
  {
    id: '26SS-V',
    name: 'DUVETICA',
    icon: 'DV',
    period: '26SS',
    color: 'indigo',
    bgColor: 'bg-indigo-200',
    hoverColor: 'hover:bg-indigo-300',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    iconBg: 'bg-indigo-300',
    buttonBg: 'bg-indigo-300',
    buttonHover: 'hover:bg-indigo-400',
  },
  {
    id: '26SS-M-NON',
    name: 'MLB NON',
    icon: 'MLB',
    period: '26SS',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: '26SS-I-NON',
    name: 'MK NON',
    icon: 'MK',
    period: '26SS',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: '26SS-X-NON',
    name: 'DX NON',
    icon: 'DX',
    period: '26SS',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: '25SS-M',
    name: 'MLB',
    icon: 'MLB',
    period: '25SS',
    color: 'blue',
    bgColor: 'bg-blue-200',
    hoverColor: 'hover:bg-blue-300',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    iconBg: 'bg-blue-300',
    buttonBg: 'bg-blue-300',
    buttonHover: 'hover:bg-blue-400',
  },
  {
    id: '25SS-I',
    name: 'MLB KIDS',
    icon: 'MK',
    period: '25SS',
    color: 'red',
    bgColor: 'bg-rose-200',
    hoverColor: 'hover:bg-rose-300',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    iconBg: 'bg-rose-300',
    buttonBg: 'bg-rose-300',
    buttonHover: 'hover:bg-rose-400',
  },
  {
    id: '25SS-X',
    name: 'DISCOVERY',
    icon: 'DX',
    period: '25SS',
    color: 'green',
    bgColor: 'bg-emerald-200',
    hoverColor: 'hover:bg-emerald-300',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-300',
    buttonBg: 'bg-emerald-300',
    buttonHover: 'hover:bg-emerald-400',
  },
  {
    id: '25SS-DISCOVERY-KIDS',
    name: 'DISCOVERY KIDS',
    icon: 'DK',
    period: '25SS',
    color: 'teal',
    bgColor: 'bg-teal-200',
    hoverColor: 'hover:bg-teal-300',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    iconBg: 'bg-teal-300',
    buttonBg: 'bg-teal-300',
    buttonHover: 'hover:bg-teal-400',
  },
  {
    id: '25SS-ST',
    name: 'SERGIO TACCHINI',
    icon: 'ST',
    period: '25SS',
    color: 'purple',
    bgColor: 'bg-purple-200',
    hoverColor: 'hover:bg-purple-300',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    iconBg: 'bg-purple-300',
    buttonBg: 'bg-purple-300',
    buttonHover: 'hover:bg-purple-400',
  },
  {
    id: '25SS-V',
    name: 'DUVETICA',
    icon: 'DV',
    period: '25SS',
    color: 'indigo',
    bgColor: 'bg-indigo-200',
    hoverColor: 'hover:bg-indigo-300',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    iconBg: 'bg-indigo-300',
    buttonBg: 'bg-indigo-300',
    buttonHover: 'hover:bg-indigo-400',
  },
  {
    id: '26FW-M',
    name: 'MLB',
    icon: 'MLB',
    period: '26FW',
    color: 'blue',
    bgColor: 'bg-blue-200',
    hoverColor: 'hover:bg-blue-300',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    iconBg: 'bg-blue-300',
    buttonBg: 'bg-blue-300',
    buttonHover: 'hover:bg-blue-400',
  },
  {
    id: '26FW-I',
    name: 'MLB KIDS',
    icon: 'MK',
    period: '26FW',
    color: 'red',
    bgColor: 'bg-rose-200',
    hoverColor: 'hover:bg-rose-300',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-700',
    iconBg: 'bg-rose-300',
    buttonBg: 'bg-rose-300',
    buttonHover: 'hover:bg-rose-400',
  },
  {
    id: '26FW-X',
    name: 'DISCOVERY',
    icon: 'DX',
    period: '26FW',
    color: 'green',
    bgColor: 'bg-emerald-200',
    hoverColor: 'hover:bg-emerald-300',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-700',
    iconBg: 'bg-emerald-300',
    buttonBg: 'bg-emerald-300',
    buttonHover: 'hover:bg-emerald-400',
  },
  {
    id: '26FW-DISCOVERY-KIDS',
    name: 'DISCOVERY KIDS',
    icon: 'DK',
    period: '26FW',
    color: 'teal',
    bgColor: 'bg-teal-200',
    hoverColor: 'hover:bg-teal-300',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    iconBg: 'bg-teal-300',
    buttonBg: 'bg-teal-300',
    buttonHover: 'hover:bg-teal-400',
  },
  {
    id: '26FW-ST',
    name: 'SERGIO TACCHINI',
    icon: 'ST',
    period: '26FW',
    color: 'purple',
    bgColor: 'bg-purple-200',
    hoverColor: 'hover:bg-purple-300',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    iconBg: 'bg-purple-300',
    buttonBg: 'bg-purple-300',
    buttonHover: 'hover:bg-purple-400',
  },
  {
    id: '26FW-V',
    name: 'DUVETICA',
    icon: 'DV',
    period: '26FW',
    color: 'indigo',
    bgColor: 'bg-indigo-200',
    hoverColor: 'hover:bg-indigo-300',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    iconBg: 'bg-indigo-300',
    buttonBg: 'bg-indigo-300',
    buttonHover: 'hover:bg-indigo-400',
  },
  {
    id: '26FW-M-NON',
    name: 'MLB NON',
    icon: 'MLB',
    period: '26FW',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: '26FW-I-NON',
    name: 'MK NON',
    icon: 'MK',
    period: '26FW',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
  {
    id: '26FW-X-NON',
    name: 'DX NON',
    icon: 'DX',
    period: '26FW',
    color: 'slate',
    bgColor: 'bg-slate-200',
    hoverColor: 'hover:bg-slate-300',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    iconBg: 'bg-slate-300',
    buttonBg: 'bg-slate-300',
    buttonHover: 'hover:bg-slate-400',
  },
];

interface BrandSummary {
  costRate24F_usd: number;
  costRate25F_usd: number;
  costRateChange_usd: number;
  qty25F: number;
  qtyYoY: number;
  avgTag25F_krw: number;
  tagYoY_krw: number;
  avgCost25F_usd: number;
  costYoY_usd: number;
  // 환율 정보
  fxPrev: number;
  fxCurr: number;
  // 상세 원가 항목
  material24F_usd: number;
  material25F_usd: number;
  artwork24F_usd: number;
  artwork25F_usd: number;
  labor24F_usd: number;
  labor25F_usd: number;
  margin24F_usd: number;
  margin25F_usd: number;
  expense24F_usd: number;
  expense25F_usd: number;
  // 원가율 데이터 (레이더 차트용)
  materialRate24F_usd: number;
  materialRate25F_usd: number;
  artworkRate24F_usd: number;
  artworkRate25F_usd: number;
  laborRate24F_usd: number;
  laborRate25F_usd: number;
  marginRate24F_usd: number;
  marginRate25F_usd: number;
  expenseRate24F_usd: number;
  expenseRate25F_usd: number;
}

// 기간 옵션 정의 (연도순, 연도 내에서 SS-FW 순서)
const periods = [
  { id: '25SS', label: '25SS기간 (25.03~25.08)', value: '25SS' },
  { id: '25FW', label: '25FW기간 (25.09~26.02)', value: '25FW' },
  { id: '26SS', label: '26SS기간 (26.03~26.08)', value: '26SS' },
  { id: '26FW', label: '26FW기간 (26.09~27.02)', value: '26FW' },
];

// 기간별 상세 정보 (FW/SS 기간 및 N시즌 정보)
const periodDetails: Record<string, {
  seasonType: 'FW' | 'SS';
  seasonPeriod: string;
  nSeason: {
    prev: string;
    curr: string;
  };
}> = {
  '25FW': {
    seasonType: 'FW',
    seasonPeriod: '25.09~26.02',
    nSeason: {
      prev: '24.06.01~24.11.30',
      curr: '25.06.01~25.11.30',
    },
  },
  '25SS': {
    seasonType: 'SS',
    seasonPeriod: '25.03~25.08',
    nSeason: {
      prev: '23.12.01~24.05.31',
      curr: '24.12.01~25.05.31',
    },
  },
  '26SS': {
    seasonType: 'SS',
    seasonPeriod: '26.03~26.08',
    nSeason: {
      prev: '24.12.01~25.05.31',
      curr: '25.12.01~26.05.31',
    },
  },
  '26FW': {
    seasonType: 'FW',
    seasonPeriod: '26.09~27.02',
    nSeason: {
      prev: '25.06.01~25.11.30',
      curr: '26.06.01~26.11.30',
    },
  },
};

export default function Home() {
  const router = useRouter();
  // URL 쿼리 파라미터에서 period 읽기
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('period') || '25FW';
    }
    return '25FW';
  });
  const [brandSummaries, setBrandSummaries] = useState<Record<string, BrandSummary | null>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCostItems, setExpandedCostItems] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<'apparel' | 'acc'>('apparel');

  // URL 쿼리 파라미터 변경 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const period = params.get('period');
      if (period && (period === '25FW' || period === '25SS' || period === '26SS' || period === '26FW')) {
        setSelectedPeriod(period);
      }
    }
  }, []);

  useEffect(() => {
    const loadAllSummaries = async () => {
      try {
        const summaries: Record<string, BrandSummary | null> = {};
        
        // 각 브랜드별 summary 파일 및 FX 파일 매핑
        const brandFiles: Record<string, { summary: string; fx: string }> = {
        '25FW': { summary: 'COST RAW/25FW/summary_25fw_m.json', fx: 'COST RAW/FX.csv' },
        'KIDS': { summary: 'COST RAW/25FW/summary_25fw_i.json', fx: 'COST RAW/FX.csv' },
        'DISCOVERY': { summary: 'COST RAW/25FW/summary_25fw_x.json', fx: 'COST RAW/FX.csv' },
        'DISCOVERY-KIDS': { summary: 'COST RAW/25FW/summary_25fw_x_kids.json', fx: 'COST RAW/FX.csv' },
        'ST': { summary: 'COST RAW/25FW/summary_25fw_st.json', fx: 'COST RAW/FX.csv' },
        'V': { summary: 'COST RAW/25FW/summary_25fw_v.json', fx: 'COST RAW/FX.csv' },
        '26SS-M': { summary: 'COST RAW/26SS/summary_26ss_m.json', fx: 'COST RAW/FX.csv' },
        '26SS-I': { summary: 'COST RAW/26SS/summary_26ss_i.json', fx: 'COST RAW/FX.csv' },
        '26SS-X': { summary: 'COST RAW/26SS/summary_26ss_x.json', fx: 'COST RAW/FX.csv' },
        '26SS-DISCOVERY-KIDS': { summary: 'COST RAW/26SS/summary_26s_x_kids.json', fx: 'COST RAW/FX.csv' },
        '26SS-ST': { summary: 'COST RAW/26SS/summary_26ss_st.json', fx: 'COST RAW/FX.csv' },
        '26SS-V': { summary: 'COST RAW/26SS/summary_26ss_v.json', fx: 'COST RAW/FX.csv' },
        '25SS-M': { summary: 'COST RAW/25S/summary_25s_m.json', fx: 'COST RAW/FX.csv' },
        '25SS-I': { summary: 'COST RAW/25S/summary_25s_i.json', fx: 'COST RAW/FX.csv' },
        '25SS-X': { summary: 'COST RAW/25S/summary_25s_x.json', fx: 'COST RAW/FX.csv' },
        '25SS-DISCOVERY-KIDS': { summary: 'COST RAW/25S/summary_25ss_x_kids.json', fx: 'COST RAW/FX.csv' },
        '25SS-ST': { summary: 'COST RAW/25S/summary_25s_st.json', fx: 'COST RAW/FX.csv' },
        '25SS-V': { summary: 'COST RAW/25S/summary_25s_v.json', fx: 'COST RAW/FX.csv' },
        '26FW-M': { summary: 'COST RAW/26FW/summary_26fw_m.json', fx: 'COST RAW/FX.csv' },
        '26FW-I': { summary: 'COST RAW/26FW/summary_26fw_i.json', fx: 'COST RAW/FX.csv' },
        '26FW-X': { summary: 'COST RAW/26FW/summary_26fw_x.json', fx: 'COST RAW/FX.csv' },
        '26FW-DISCOVERY-KIDS': { summary: 'COST RAW/26FW/summary_26fw_x_kids.json', fx: 'COST RAW/FX.csv' },
        '26FW-ST': { summary: 'COST RAW/26FW/summary_26fw_st.json', fx: 'COST RAW/FX.csv' },
        '26FW-V': { summary: 'COST RAW/26FW/summary_26fw_v.json', fx: 'COST RAW/FX.csv' },
        'M-NON': { summary: 'COST RAW/25FW/summary_25fw_m_non.json', fx: 'COST RAW/FX_NON.csv' },
        'I-NON': { summary: 'COST RAW/25FW/summary_25fw_i_non.json', fx: 'COST RAW/FX_NON.csv' },
        'X-NON': { summary: 'COST RAW/25FW/summary_25fw_x_non.json', fx: 'COST RAW/FX_NON.csv' },
        '26SS-M-NON': { summary: 'COST RAW/26SS/summary_26ss_m_non.json', fx: 'COST RAW/FX_NON.csv' },
        '26SS-I-NON': { summary: 'COST RAW/26SS/summary_26ss_i_non.json', fx: 'COST RAW/FX_NON.csv' },
        '26SS-X-NON': { summary: 'COST RAW/26SS/summary_26ss_x_non.json', fx: 'COST RAW/FX_NON.csv' },
        '26FW-M-NON': { summary: 'COST RAW/26FW/summary_26fw_m_non.json', fx: 'COST RAW/FX_NON.csv' },
        '26FW-I-NON': { summary: 'COST RAW/26FW/summary_26fw_i_non.json', fx: 'COST RAW/FX_NON.csv' },
        '26FW-X-NON': { summary: 'COST RAW/26FW/summary_26fw_x_non.json', fx: 'COST RAW/FX_NON.csv' },
      };

      for (const [brandId, files] of Object.entries(brandFiles)) {
        try {
          const data = await loadSummaryData(files.summary);
          
          // 환율 정보 로드 - 새로운 시즌 형식인 경우 브랜드 ID와 시즌 정보 전달
          let fxRates;
          if (brandId.startsWith('26SS-')) {
            fxRates = await loadExchangeRates(files.fx, brandId, '26SS', '25SS');
          } else if (brandId.startsWith('26FW-')) {
            fxRates = await loadExchangeRates(files.fx, brandId, '26FW', '25FW');
          } else if (brandId.startsWith('25SS-')) {
            fxRates = await loadExchangeRates(files.fx, brandId, '25SS', '24SS');
          } else if (brandId === 'M-NON' || brandId === 'I-NON' || brandId === 'X-NON') {
            // 25FW 기간의 NON 브랜드들
            fxRates = await loadExchangeRates(files.fx, brandId, '25FW', '24FW');
          } else if (brandId.startsWith('26SS-') && brandId.endsWith('-NON')) {
            fxRates = await loadExchangeRates(files.fx, brandId, '26SS', '25SS');
          } else if (brandId.startsWith('26FW-') && brandId.endsWith('-NON')) {
            fxRates = await loadExchangeRates(files.fx, brandId, '26FW', '25FW');
          } else if (brandId.startsWith('25SS-') && brandId.endsWith('-NON')) {
            fxRates = await loadExchangeRates(files.fx, brandId, '25SS', '24SS');
          } else if (brandId === '25FW' || brandId === 'KIDS' || brandId === 'DISCOVERY' || brandId === 'DISCOVERY-KIDS' || brandId === 'ST' || brandId === 'V') {
            // 25FW 기간 브랜드들 (M, I, X, ST, V) - 새 구조
            const brandCode = brandId === '25FW' ? 'M' : brandId === 'KIDS' ? 'I' : brandId === 'DISCOVERY' ? 'X' : brandId === 'DISCOVERY-KIDS' ? 'DISCOVERY-KIDS' : brandId;
            // 25FW-{brandCode} 형식으로 만들어서 일관성 유지 (DISCOVERY-KIDS는 그대로 전달)
            const brandIdForFx = brandId === 'DISCOVERY-KIDS' ? 'DISCOVERY-KIDS' : `25FW-${brandCode}`;
            fxRates = await loadExchangeRates(files.fx, brandIdForFx, '25FW', '24FW');
          } else {
            // 기존 브랜드는 기존 방식 유지 (NON 등)
            fxRates = await loadExchangeRates(files.fx);
          }
          
          if (data && data.total) {
            summaries[brandId] = {
              costRate24F_usd: data.total.costRate24F_usd || 0,
              costRate25F_usd: data.total.costRate25F_usd || 0,
              costRateChange_usd: data.total.costRateChange_usd || 0,
              qty25F: data.total.qty25F || 0,
              qtyYoY: data.total.qtyYoY || 0,
              avgTag25F_krw: data.total.avgTag25F_krw || 0,
              tagYoY_krw: data.total.tagYoY_krw || 0,
              avgCost25F_usd: data.total.avgCost25F_usd || 0,
              costYoY_usd: data.total.costYoY_usd || 0,
              // 환율 정보
              fxPrev: fxRates.prev,
              fxCurr: fxRates.curr,
              // 상세 원가 항목
              material24F_usd: data.total.material24F_usd || 0,
              material25F_usd: data.total.material25F_usd || 0,
              artwork24F_usd: data.total.artwork24F_usd || 0,
              artwork25F_usd: data.total.artwork25F_usd || 0,
              labor24F_usd: data.total.labor24F_usd || 0,
              labor25F_usd: data.total.labor25F_usd || 0,
              margin24F_usd: data.total.margin24F_usd || 0,
              margin25F_usd: data.total.margin25F_usd || 0,
              expense24F_usd: data.total.expense24F_usd || 0,
              expense25F_usd: data.total.expense25F_usd || 0,
              // 원가율 데이터 (레이더 차트용)
              materialRate24F_usd: data.total.materialRate24F_usd || 0,
              materialRate25F_usd: data.total.materialRate25F_usd || 0,
              artworkRate24F_usd: data.total.artworkRate24F_usd || 0,
              artworkRate25F_usd: data.total.artworkRate25F_usd || 0,
              laborRate24F_usd: data.total.laborRate24F_usd || 0,
              laborRate25F_usd: data.total.laborRate25F_usd || 0,
              marginRate24F_usd: data.total.marginRate24F_usd || 0,
              marginRate25F_usd: data.total.marginRate25F_usd || 0,
              expenseRate24F_usd: data.total.expenseRate24F_usd || 0,
              expenseRate25F_usd: data.total.expenseRate25F_usd || 0,
            };
          } else {
            summaries[brandId] = null;
          }
        } catch (error) {
          console.error(`Failed to load summary for ${brandId}:`, error);
          summaries[brandId] = null;
        }
      }
      
      setBrandSummaries(summaries);
      setLoading(false);
      } catch (error) {
        console.error('Failed to load summaries:', error);
        setLoading(false);
      }
    };

    loadAllSummaries();
  }, [selectedPeriod]);

  const handleBrandClick = (brandId: string) => {
    try {
      console.log('Navigating to:', `/dashboard/${brandId}`);
      router.push(`/dashboard/${brandId}`);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const toggleCostDetails = (brandId: string) => {
    const newExpanded = new Set(expandedCostItems);
    if (newExpanded.has(brandId)) {
      newExpanded.delete(brandId);
    } else {
      newExpanded.add(brandId);
    }
    setExpandedCostItems(newExpanded);
  };

  // 숫자 포맷팅 함수
  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const formatQty = (qty: number): string => {
    if (qty >= 1000) {
      const kValue = (qty / 1000).toFixed(0);
      return `${parseInt(kValue).toLocaleString('en-US')}K`;
    }
    return `${qty.toLocaleString('en-US')}K`;
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // NON 브랜드 ID에서 브랜드 코드 추출 (M, I, X)
  const extractBrandCodeFromNON = (brandId: string): string | null => {
    if (!brandId.includes('-NON')) return null;
    
    // 패턴: M-NON, I-NON, X-NON 또는 26SS-M-NON, 26FW-M-NON 등
    const parts = brandId.split('-');
    if (parts.length === 2) {
      // M-NON, I-NON, X-NON 형식
      return parts[0];
    } else if (parts.length === 3) {
      // 26SS-M-NON 형식 (두 번째가 브랜드 코드)
      return parts[1];
    }
    return null;
  };

  // ACC 필터 시 NON 브랜드의 의류 브랜드 색상 반환
  const getBrandColorClasses = (brand: typeof brands[0]): typeof brands[0] => {
    // ACC 필터이고 NON 브랜드인 경우
    if (categoryFilter === 'acc' && brand.id.includes('-NON')) {
      const brandCode = extractBrandCodeFromNON(brand.id);
      
      if (brandCode === 'M') {
        return {
          ...brand,
          color: 'blue',
          bgColor: 'bg-blue-200',
          hoverColor: 'hover:bg-blue-300',
          borderColor: 'border-blue-300',
          textColor: 'text-blue-700',
          iconBg: 'bg-blue-300',
          buttonBg: 'bg-blue-300',
          buttonHover: 'hover:bg-blue-400',
        };
      } else if (brandCode === 'I') {
        return {
          ...brand,
          color: 'red',
          bgColor: 'bg-rose-200',
          hoverColor: 'hover:bg-rose-300',
          borderColor: 'border-rose-300',
          textColor: 'text-rose-700',
          iconBg: 'bg-rose-300',
          buttonBg: 'bg-rose-300',
          buttonHover: 'hover:bg-rose-400',
        };
      } else if (brandCode === 'X') {
        return {
          ...brand,
          color: 'green',
          bgColor: 'bg-emerald-200',
          hoverColor: 'hover:bg-emerald-300',
          borderColor: 'border-emerald-300',
          textColor: 'text-emerald-700',
          iconBg: 'bg-emerald-300',
          buttonBg: 'bg-emerald-300',
          buttonHover: 'hover:bg-emerald-400',
        };
      }
    }
    
    // 의류 필터이거나 NON 브랜드가 아닌 경우 기존 색상 유지
    return brand;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 - 흰색 배경 디자인 */}
      <div className="w-full pt-6 pb-4 px-8 md:px-12">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-200">
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center shadow-md border border-blue-200">
              <Calculator className="w-8 h-8 text-blue-700" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-black">F&F 원가 분석 대시보드</h1>
              <p className="text-gray-600 text-sm mt-1">Cost Analysis Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <main className="w-full pb-12">
        <div className="flex flex-col md:flex-row items-start justify-between mb-8 px-8 md:px-12 gap-4">
          {/* 기간 정보 섹션 */}
          {periodDetails[selectedPeriod] && (
            <div className="flex-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200/50">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      의류: 원가견적서 시즌 기준
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      ACC: 전년 {periodDetails[selectedPeriod].nSeason.prev} / 당년 {periodDetails[selectedPeriod].nSeason.curr} (합의납기일 기준)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 날짜 선택 및 카테고리 필터 */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* 카테고리 필터 버튼 */}
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-gray-200/50">
              <button
                onClick={() => setCategoryFilter('apparel')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  categoryFilter === 'apparel'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                의류
              </button>
              <button
                onClick={() => setCategoryFilter('acc')}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  categoryFilter === 'acc'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                ACC
              </button>
            </div>
            
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  const newPeriod = e.target.value;
                  setSelectedPeriod(newPeriod);
                  // URL 쿼리 파라미터 업데이트
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('period', newPeriod);
                    window.history.pushState({}, '', url.toString());
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-blue-400 rounded-xl text-blue-700 hover:bg-blue-50 transition-all bg-white cursor-pointer appearance-none pr-12 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 shadow-md font-semibold text-sm"
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
              <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 브랜드 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 px-8 md:px-12">
          {brands.filter(brand => {
            // 기간 필터
            if (brand.period !== selectedPeriod) return false;
            
            // 카테고리 필터
            const isNON = brand.id.includes('-NON');
            if (categoryFilter === 'apparel') {
              return !isNON; // 의류: NON이 아닌 것들
            } else {
              return isNON; // ACC: NON인 것들
            }
          }).map((brand) => {
            // ACC 필터 시 NON 브랜드 색상 동적 변경
            const brandWithColor = getBrandColorClasses(brand);
            
            return (
            <div
              key={brand.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200/50 group hover:-translate-y-1"
            >
              {/* 카드 헤더 */}
              <div className="p-4 border-b border-gray-200/50 bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-12 h-12 ${brandWithColor.iconBg} rounded-xl flex items-center justify-center ${brandWithColor.textColor} text-sm font-bold shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {brand.icon}
                    </div>
                    <h3 className="text-base font-bold text-gray-800 group-hover:text-gray-900 transition-colors">{brand.name}</h3>
                  </div>
                  {brandSummaries[brand.id] && (() => {
                    // 항상 조회기간 당년 원가율 표시 (데이터 없으면 0.0%)
                    const costRate25F = brandSummaries[brand.id]!.costRate25F_usd || 0;
                    const costRate24F = brandSummaries[brand.id]!.costRate24F_usd || 0;
                    
                    // 전년 대비 차이: 전년 데이터가 있을 때만 계산
                    const displayCostRate = costRate25F;
                    const displayChange = costRate24F > 0 ? costRate25F - costRate24F : null;
                    const hasChange = displayChange !== null;
                    
                    return (
                        <div className="flex flex-col items-end">
                        <div className="text-xs text-gray-500 mb-1.5 font-medium">전체원가율(USD)</div>
                        <div className={`px-3 py-2 rounded-xl shadow-md border-2 ${hasChange && displayChange! >= 0 ? 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200' : hasChange && displayChange! < 0 ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200' : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'}`}>
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="text-xl font-bold text-gray-900">
                              {formatNumber(displayCostRate)}%
                            </div>
                            {hasChange && (
                              <div className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${displayChange! >= 0 ? 'bg-rose-200 text-rose-700' : 'bg-blue-200 text-blue-700'}`}>
                                {displayChange! >= 0 ? '+' : ''}{formatNumber(displayChange!)}%p
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {brandSummaries[brand.id] && (
                  <div className="flex gap-1.5 mt-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${
                      brandSummaries[brand.id]!.qtyYoY > 100 
                        ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300' 
                        : 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border border-rose-300'
                    }`}>
                      총생산수량 YOY {Math.round(brandSummaries[brand.id]!.qtyYoY)}%
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-sm ${
                      brandSummaries[brand.id]!.tagYoY_krw > 100 
                        ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border border-blue-300' 
                        : 'bg-gradient-to-r from-rose-100 to-rose-200 text-rose-700 border border-rose-300'
                    }`}>
                      평균TAG YOY {Math.round(brandSummaries[brand.id]!.tagYoY_krw)}%
                    </span>
                  </div>
                )}
              </div>

              {/* 카드 본문 */}
              <div className="p-4 bg-white">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-3">데이터 로딩 중...</p>
                  </div>
                ) : brandSummaries[brand.id] ? (
                  <div className="mb-4">
                    {/* 주요 지표 그리드 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-2.5 border border-gray-200/50 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1 font-medium">총 생산수량</div>
                        <div className="text-base font-bold text-gray-900">
                          {formatQty(brandSummaries[brand.id]!.qty25F)}
                          <span className="ml-1.5 text-xs text-gray-600 font-semibold">
                            ({Math.round(brandSummaries[brand.id]!.qtyYoY)}%)
                          </span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-2.5 border border-gray-200/50 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1 font-medium">평균TAG (KRW)</div>
                        <div className="text-sm font-bold text-gray-900">
                          {brandSummaries[brand.id]!.avgTag25F_krw.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-stretch gap-3">
                          <div className="flex-1 bg-gradient-to-br from-gray-50 to-white rounded-xl p-2.5 border border-gray-200/50 shadow-sm h-full flex flex-col justify-center">
                            <div className="text-xs text-gray-500 font-medium">평균원가(USD)</div>
                            <div className="mt-0.5 text-sm font-bold text-gray-900">
                              ${formatNumber(brandSummaries[brand.id]!.avgCost25F_usd, 2)}
                            </div>
                          </div>
                          <div className="flex-1 bg-gradient-to-br from-gray-50 to-white rounded-xl p-2.5 border border-gray-200/50 shadow-sm h-full flex flex-col justify-center">
                            <div className="text-xs text-gray-500 font-medium">환율</div>
                            <div className="mt-0.5 text-sm font-bold text-gray-900 whitespace-nowrap">
                              {brandSummaries[brand.id]!.fxPrev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} →{' '}
                              {brandSummaries[brand.id]!.fxCurr.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{' '}
                              <span className="ml-1 text-xs text-gray-600 font-semibold">
                                ({brandSummaries[brand.id]!.fxPrev > 0 ? Math.round((brandSummaries[brand.id]!.fxCurr / brandSummaries[brand.id]!.fxPrev) * 100) : 0}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 원가 상세보기 */}
                    <div className="border-t border-gray-200/50 pt-3">
                      <button
                        onClick={() => toggleCostDetails(brand.id)}
                        className="w-full flex items-center justify-between text-left hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 rounded-xl px-3 py-2 transition-all duration-200 border border-gray-200/50 hover:border-gray-300 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-700 font-semibold">원가 상세보기</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium border border-gray-200">USD 기준</span>
                        </div>
                        {expandedCostItems.has(brand.id) ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                      
                      {/* 상세 원가 항목 */}
                      {expandedCostItems.has(brand.id) && (
                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          {[
                            { name: '원부자재', prev: brandSummaries[brand.id]!.material24F_usd, curr: brandSummaries[brand.id]!.material25F_usd, icon: '📦' },
                            { name: '아트웍', prev: brandSummaries[brand.id]!.artwork24F_usd, curr: brandSummaries[brand.id]!.artwork25F_usd, icon: '🎨' },
                            { name: '공임', prev: brandSummaries[brand.id]!.labor24F_usd, curr: brandSummaries[brand.id]!.labor25F_usd, icon: '👷' },
                            { name: '정상마진', prev: brandSummaries[brand.id]!.margin24F_usd, curr: brandSummaries[brand.id]!.margin25F_usd, icon: '💰' },
                            { name: '경비', prev: brandSummaries[brand.id]!.expense24F_usd, curr: brandSummaries[brand.id]!.expense25F_usd, icon: '📊' },
                          ].map((item) => {
                            const change = item.curr - item.prev;
                            const yoy = item.prev > 0 ? (item.curr / item.prev) * 100 : 0;
                            return (
                              <div 
                                key={item.name} 
                                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{item.icon}</span>
                                    <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                                  </div>
                                </div>
                                <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-medium w-8">전년</span>
                                        <span className="text-gray-700 font-semibold w-16 text-right">${formatNumber(item.prev, 2)}</span>
                                      </div>
                                      <span className="text-gray-300 mx-1">→</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-medium w-8">당년</span>
                                        <span className="text-gray-900 font-bold w-16 text-right">${formatNumber(item.curr, 2)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-semibold w-16 text-right ${change >= 0 ? 'text-rose-600' : 'text-blue-600'}`}>
                                        ${change >= 0 ? '+' : ''}{formatNumber(change, 2)}
                                      </span>
                                      <span className={`font-medium px-2 py-0.5 rounded min-w-[3.5rem] text-center ${
                                        change >= 0 ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
                                      }`}>
                                        {formatNumber(yoy, 1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-gray-200">
                    <p className="font-medium">데이터를 불러올 수 없습니다</p>
                  </div>
                )}

                {/* 전체 대시보드 보기 버튼 */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleBrandClick(brand.id);
                  }}
                  className={`w-full mt-4 ${brandWithColor.buttonBg} ${brandWithColor.buttonHover} ${brandWithColor.textColor} font-bold py-2.5 px-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-2xl hover:scale-[1.02] transform border-2 ${brandWithColor.borderColor} hover:border-opacity-80 text-sm`}
                >
                  전체 대시보드 보기
                </button>
              </div>
            </div>
            );
          })}
        </div>

      </main>

      {/* 푸터 */}
      <footer className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 text-white py-8 mt-16 border-t border-gray-700">
        <div className="w-full px-8 md:px-12">
          <div className="text-center">
            <p className="text-sm text-gray-300 font-medium">© 2025 F&F. All rights reserved. | Version 1.4.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
