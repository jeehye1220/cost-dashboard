#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
F&F 원가 대시보드 - Summary JSON 생성 스크립트 (26SS용)

사용 방법:
    python generate_summary_26ss.py --brand M
    python generate_summary_26ss.py --brand I
    python generate_summary_26ss.py --brand X
    python generate_summary_26ss.py --brand ST
    python generate_summary_26ss.py --brand V

이 스크립트는 CSV 파일을 읽어서 전체 및 카테고리별 KPI를 계산하고
summary_26ss_{brand}.json 파일을 생성합니다.

핵심 원칙:
- 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨 (아트웍 제외!)
- 원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100
- 수량 가중 평균 사용
- USD와 KRW 별도 계산
- 환율: 브랜드-시즌-중분류 조합으로 FX.csv에서 조회
- 전시즌 TAG USD 변환: 전시즌 환율 사용 (25SS → 24SS 환율, 26SS → 25SS 환율)
"""

import pandas as pd
import json
import argparse
import os
from typing import Dict, Any

# 카테고리 순서 (중분류 통합 후: SHOES/BAG/HEADWEAR → Acc_etc)
CATEGORY_ORDER = ['Outer', 'Inner', 'Bottom', 'Acc_etc', 'Wear_etc']

# FX 파일 경로
FX_FILE = 'public/COST RAW/FX.csv'

# 카테고리 → FX 카테고리 매핑
def map_category_to_fx_category(category: str) -> str:
    """중분류 카테고리를 의류/슈즈/용품으로 매핑"""
    category_upper = category.strip().upper()
    
    # 의류: Outer, Inner, Bottom, Wear_etc
    if category_upper in ['OUTER', 'INNER', 'BOTTOM', 'WEAR_ETC']:
        return '의류'
    
    # 슈즈: Shoes
    if category_upper == 'SHOES':
        return '슈즈'
    
    # 용품: Bag, Headwear, Acc_etc
    if category_upper in ['BAG', 'HEADWEAR', 'ACC_ETC']:
        return '용품'
    
    # 기본값: 의류
    return '의류'

# FX.csv에서 환율 조회
def get_exchange_rate(df_fx: pd.DataFrame, brand_code: str, season_code: str, category: str = None) -> float:
    """
    FX.csv에서 특정 브랜드/시즌/카테고리의 환율 조회
    
    Args:
        df_fx: FX.csv DataFrame
        brand_code: 브랜드 코드 (M, I, X, V, ST)
        season_code: 시즌 코드 (26S, 25S, 24S 등)
        category: 중분류 카테고리 (선택사항)
    
    Returns:
        환율 값 (float)
    """
    if df_fx is None or df_fx.empty:
        print(f"[WARN] FX 데이터가 없습니다. 기본 환율 1300.0 사용")
        return 1300.0
    
    # 카테고리 매핑
    fx_category = map_category_to_fx_category(category) if category else '의류'
    
    # FX.csv에서 해당 브랜드, 시즌, 카테고리의 환율 찾기
    filtered = df_fx[
        (df_fx['브랜드'] == brand_code) &
        (df_fx['시즌'] == season_code) &
        (df_fx['카테고리'] == fx_category)
    ]
    
    if len(filtered) > 0:
        rate = float(filtered.iloc[0]['환율'])
        if rate > 0:  # 0인 경우 제외
            return rate
    
    # 기본값: 의류 환율 사용
    if category and fx_category != '의류':
        default = df_fx[
            (df_fx['브랜드'] == brand_code) &
            (df_fx['시즌'] == season_code) &
            (df_fx['카테고리'] == '의류')
        ]
        if len(default) > 0:
            rate = float(default.iloc[0]['환율'])
            if rate > 0:
                return rate
    
    # 최종 기본값
    print(f"[WARN] 환율을 찾을 수 없습니다. 브랜드={brand_code}, 시즌={season_code}, 카테고리={fx_category}. 기본값 1300.0 사용")
    return 1300.0

# 전시즌 코드 계산
def get_previous_season(season: str) -> str:
    """전시즌 코드 반환"""
    season_map = {
        '26SS': '25SS',
        '26S': '25S',
        '25SS': '24SS',
        '25S': '24S',
        '25FW': '24FW',
        '25F': '24F',
        '24SS': '23SS',
        '24S': '23S',
        '24FW': '23FW',
        '24F': '23F',
    }
    return season_map.get(season, '')

# 시즌 코드 변환 (26SS → 26S, 25SS → 25S)
def convert_season_format(season: str) -> str:
    """시즌 형식 변환"""
    if season.endswith('SS'):
        return season.replace('SS', 'S')
    if season.endswith('FW'):
        return season.replace('FW', 'F')
    return season

def calculate_season_kpi(
    df_season: pd.DataFrame,
    season: str,
    currency: str,
    df_fx: pd.DataFrame,
    brand_code: str,
    current_season_code: str
) -> Dict[str, float]:
    """
    시즌별 KPI 계산
    
    Args:
        df_season: 시즌별 데이터프레임
        season: 시즌명 (전년, 당년)
        currency: 통화 (USD, KRW)
        df_fx: FX.csv DataFrame
        brand_code: 브랜드 코드
        current_season_code: 현재 시즌 코드 (26S, 25S 등)
    
    Returns:
        KPI 딕셔너리
    """
    if len(df_season) == 0:
        return {
            f'qty_{season}': 0,
            f'avgTag_{season}': 0,
            f'avgCost_{season}': 0,
            f'costRate_{season}': 0,
            f'material_{season}': 0,
            f'artwork_{season}': 0,
            f'labor_{season}': 0,
            f'margin_{season}': 0,
            f'expense_{season}': 0,
            f'materialRate_{season}': 0,
            f'artworkRate_{season}': 0,
            f'laborRate_{season}': 0,
            f'marginRate_{season}': 0,
            f'expenseRate_{season}': 0,
        }
    
    qty = df_season.iloc[:, 7].sum()  # 수량
    
    if currency == 'USD':
        # 전시즌 환율 사용 (25SS → 24SS 환율, 26SS → 25SS 환율)
        prev_season = get_previous_season(current_season_code)
        prev_season_code = convert_season_format(prev_season) if prev_season else current_season_code
        
        # TAG (USD) - 전시즌 환율 사용
        # 각 행별로 카테고리에 맞는 환율 조회
        tag_total = 0
        for idx, row in df_season.iterrows():
            category = row.iloc[3] if len(row) > 3 else None
            fx_rate = get_exchange_rate(df_fx, brand_code, prev_season_code, category)
            tag_krw = pd.to_numeric(row.iloc[6], errors='coerce') or 0
            qty_row = pd.to_numeric(row.iloc[7], errors='coerce') or 0
            tag_total += (tag_krw / fx_rate) * qty_row
        
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # 원가 항목 계산 (USD 총금액 컬럼 직접 사용)
        # 컬럼 30: USD_재료계(원/부/택/본공)_총금액(단가×수량)
        # 컬럼 31: USD_아트웍_총금액(단가×수량)
        # 컬럼 32: USD_공임_총금액(단가×수량)
        # 컬럼 33: USD_정상마진_총금액(단가×수량)
        # 컬럼 34: USD_경비_총금액(단가×수량)
        material_total = df_season.iloc[:, 30].astype(float).sum()  # USD_재료계 총금액
        artwork_total = df_season.iloc[:, 31].astype(float).sum()   # USD_아트웍 총금액
        labor_total = df_season.iloc[:, 32].astype(float).sum()     # USD_공임 총금액
        margin_total = df_season.iloc[:, 33].astype(float).sum()    # USD_정상마진 총금액
        expense_total = df_season.iloc[:, 34].astype(float).sum()  # USD_경비 총금액
        
        material = material_total / qty if qty > 0 else 0
        artwork = artwork_total / qty if qty > 0 else 0
        labor = labor_total / qty if qty > 0 else 0
        margin = margin_total / qty if qty > 0 else 0
        expense = expense_total / qty if qty > 0 else 0
        
    else:  # KRW
        # TAG (KRW)
        tag_total = (df_season.iloc[:, 6] * df_season.iloc[:, 7]).sum()
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
        mat_total = (df_season.iloc[:, 22] * df_season.iloc[:, 7]).sum()
        sub_total = (df_season.iloc[:, 24] * df_season.iloc[:, 7]).sum()
        hq_total = (df_season.iloc[:, 27] * df_season.iloc[:, 7]).sum()
        tag_label_total = (df_season.iloc[:, 25] * df_season.iloc[:, 7]).sum()
        material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
        
        # 아트웍
        art_total = (df_season.iloc[:, 23] * df_season.iloc[:, 7]).sum()
        artwork = art_total / qty if qty > 0 else 0
        
        # 공임
        labor_total = (df_season.iloc[:, 26] * df_season.iloc[:, 7]).sum()
        labor = labor_total / qty if qty > 0 else 0
        
        # 마진
        margin_total = (df_season.iloc[:, 28] * df_season.iloc[:, 7]).sum()
        margin = margin_total / qty if qty > 0 else 0
        
        # 경비
        expense_total = (df_season.iloc[:, 29] * df_season.iloc[:, 7]).sum()
        expense = expense_total / qty if qty > 0 else 0
    
    # 총 원가
    avg_cost = material + artwork + labor + margin + expense
    
    # 원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100
    cost_rate = (avg_cost / (avg_tag / 1.1)) * 100 if avg_tag > 0 else 0
    
    # 항목별 원가율
    tag_excl_vat = avg_tag / 1.1 if avg_tag > 0 else 0
    material_rate = (material / tag_excl_vat) * 100 if tag_excl_vat > 0 else 0
    artwork_rate = (artwork / tag_excl_vat) * 100 if tag_excl_vat > 0 else 0
    labor_rate = (labor / tag_excl_vat) * 100 if tag_excl_vat > 0 else 0
    margin_rate = (margin / tag_excl_vat) * 100 if tag_excl_vat > 0 else 0
    expense_rate = (expense / tag_excl_vat) * 100 if tag_excl_vat > 0 else 0
    
    return {
        f'qty_{season}': int(qty),
        f'avgTag_{season}': round(avg_tag, 2),
        f'avgCost_{season}': round(avg_cost, 2),
        f'costRate_{season}': round(cost_rate, 1),
        f'material_{season}': round(material, 2),
        f'artwork_{season}': round(artwork, 2),
        f'labor_{season}': round(labor, 2),
        f'margin_{season}': round(margin, 2),
        f'expense_{season}': round(expense, 2),
        f'materialRate_{season}': round(material_rate, 1),
        f'artworkRate_{season}': round(artwork_rate, 1),
        f'laborRate_{season}': round(labor_rate, 1),
        f'marginRate_{season}': round(margin_rate, 1),
        f'expenseRate_{season}': round(expense_rate, 1),
    }

def calculate_total_stats(df: pd.DataFrame, df_fx: pd.DataFrame, brand_code: str, current_season_code: str, prev_season_code: str) -> Dict[str, Any]:
    """전체 통계 계산"""
    # 전년/당년 시즌 필터링 (동적)
    # 시즌 형식 변환 (25SS → 25S, 26SS → 26S)
    def normalize_season(season_str):
        if pd.isna(season_str):
            return ''
        s = str(season_str).strip().upper()
        if s.endswith('SS'):
            return s[:-1]  # 25SS → 25S
        if s.endswith('FW'):
            return s[:-1]  # 25FW → 25F
        return s
    
    # 전년 시즌 필터 (24S, 25S 등)
    df_prev = df[df.iloc[:, 1].apply(normalize_season).isin([prev_season_code, prev_season_code + 'S', prev_season_code + 'SS'])]
    # 당년 시즌 필터 (25S, 26S 등)
    df_curr = df[df.iloc[:, 1].apply(normalize_season).isin([current_season_code, current_season_code + 'S', current_season_code + 'SS'])]
    
    # 수량 계산
    qty_prev = df_prev.iloc[:, 7].sum()
    qty_curr = df_curr.iloc[:, 7].sum()
    qty_yoy = (qty_curr / qty_prev) * 100 if qty_prev > 0 else 0
    
    # USD 기준
    kpi_prev_usd = calculate_season_kpi(df_prev, '전년', 'USD', df_fx, brand_code, prev_season_code)
    kpi_curr_usd = calculate_season_kpi(df_curr, '당년', 'USD', df_fx, brand_code, current_season_code)
    
    # KRW 기준
    kpi_prev_krw = calculate_season_kpi(df_prev, '전년', 'KRW', df_fx, brand_code, prev_season_code)
    kpi_curr_krw = calculate_season_kpi(df_curr, '당년', 'KRW', df_fx, brand_code, current_season_code)
    
    # YOY 계산
    tag_yoy_usd = (kpi_curr_usd['avgTag_당년'] / kpi_prev_usd['avgTag_전년']) * 100 if kpi_prev_usd['avgTag_전년'] > 0 else 0
    cost_yoy_usd = (kpi_curr_usd['avgCost_당년'] / kpi_prev_usd['avgCost_전년']) * 100 if kpi_prev_usd['avgCost_전년'] > 0 else 0
    cost_rate_change_usd = kpi_curr_usd['costRate_당년'] - kpi_prev_usd['costRate_전년']
    
    tag_yoy_krw = (kpi_curr_krw['avgTag_당년'] / kpi_prev_krw['avgTag_전년']) * 100 if kpi_prev_krw['avgTag_전년'] > 0 else 0
    cost_yoy_krw = (kpi_curr_krw['avgCost_당년'] / kpi_prev_krw['avgCost_전년']) * 100 if kpi_prev_krw['avgCost_전년'] > 0 else 0
    cost_rate_change_krw = kpi_curr_krw['costRate_당년'] - kpi_prev_krw['costRate_전년']
    
    return {
        # 수량 정보
        'qty24F': int(qty_prev),
        'qty25F': int(qty_curr),
        'qtyYoY': round(qty_yoy, 1),
        # USD 기준
        'costRate24F_usd': kpi_prev_usd['costRate_전년'],
        'costRate25F_usd': kpi_curr_usd['costRate_당년'],
        'costRateChange_usd': round(cost_rate_change_usd, 1),
        'avgTag24F_usd': kpi_prev_usd['avgTag_전년'],
        'avgTag25F_usd': kpi_curr_usd['avgTag_당년'],
        'tagYoY_usd': round(tag_yoy_usd, 1),
        'avgCost24F_usd': kpi_prev_usd['avgCost_전년'],
        'avgCost25F_usd': kpi_curr_usd['avgCost_당년'],
        'costYoY_usd': round(cost_yoy_usd, 1),
        'material24F_usd': kpi_prev_usd['material_전년'],
        'material25F_usd': kpi_curr_usd['material_당년'],
        'artwork24F_usd': kpi_prev_usd['artwork_전년'],
        'artwork25F_usd': kpi_curr_usd['artwork_당년'],
        'labor24F_usd': kpi_prev_usd['labor_전년'],
        'labor25F_usd': kpi_curr_usd['labor_당년'],
        'margin24F_usd': kpi_prev_usd['margin_전년'],
        'margin25F_usd': kpi_curr_usd['margin_당년'],
        'expense24F_usd': kpi_prev_usd['expense_전년'],
        'expense25F_usd': kpi_curr_usd['expense_당년'],
        'materialRate24F_usd': kpi_prev_usd['materialRate_전년'],
        'materialRate25F_usd': kpi_curr_usd['materialRate_당년'],
        'artworkRate24F_usd': kpi_prev_usd['artworkRate_전년'],
        'artworkRate25F_usd': kpi_curr_usd['artworkRate_당년'],
        'laborRate24F_usd': kpi_prev_usd['laborRate_전년'],
        'laborRate25F_usd': kpi_curr_usd['laborRate_당년'],
        'marginRate24F_usd': kpi_prev_usd['marginRate_전년'],
        'marginRate25F_usd': kpi_curr_usd['marginRate_당년'],
        'expenseRate24F_usd': kpi_prev_usd['expenseRate_전년'],
        'expenseRate25F_usd': kpi_curr_usd['expenseRate_당년'],
        
        # KRW 기준
        'costRate24F_krw': kpi_prev_krw['costRate_전년'],
        'costRate25F_krw': kpi_curr_krw['costRate_당년'],
        'costRateChange_krw': round(cost_rate_change_krw, 1),
        'avgTag24F_krw': kpi_prev_krw['avgTag_전년'],
        'avgTag25F_krw': kpi_curr_krw['avgTag_당년'],
        'tagYoY_krw': round(tag_yoy_krw, 1),
        'avgCost24F_krw': kpi_prev_krw['avgCost_전년'],
        'avgCost25F_krw': kpi_curr_krw['avgCost_당년'],
        'costYoY_krw': round(cost_yoy_krw, 1),
    }

def calculate_category_stats(df: pd.DataFrame, df_fx: pd.DataFrame, brand_code: str, current_season_code: str, prev_season_code: str) -> list:
    """카테고리별 통계 계산"""
    categories = []
    
    # 시즌 형식 변환 함수
    def normalize_season(season_str):
        if pd.isna(season_str):
            return ''
        s = str(season_str).strip().upper()
        if s.endswith('SS'):
            return s[:-1]  # 25SS → 25S
        if s.endswith('FW'):
            return s[:-1]  # 25FW → 25F
        return s
    
    for category in CATEGORY_ORDER:
        df_cat = df[df.iloc[:, 3] == category]
        
        if len(df_cat) == 0:
            continue
        
        # 전년/당년 시즌 필터링 (동적)
        df_prev = df_cat[df_cat.iloc[:, 1].apply(normalize_season).isin([prev_season_code, prev_season_code + 'S', prev_season_code + 'SS'])]
        df_curr = df_cat[df_cat.iloc[:, 1].apply(normalize_season).isin([current_season_code, current_season_code + 'S', current_season_code + 'SS'])]
        
        # USD 기준
        kpi_prev_usd = calculate_season_kpi(df_prev, '전년', 'USD', df_fx, brand_code, prev_season_code)
        kpi_curr_usd = calculate_season_kpi(df_curr, '당년', 'USD', df_fx, brand_code, current_season_code)
        
        # KRW 기준
        kpi_prev_krw = calculate_season_kpi(df_prev, '전년', 'KRW', df_fx, brand_code, prev_season_code)
        kpi_curr_krw = calculate_season_kpi(df_curr, '당년', 'KRW', df_fx, brand_code, current_season_code)
        
        # YOY 계산
        qty_yoy = (kpi_curr_usd['qty_당년'] / kpi_prev_usd['qty_전년']) * 100 if kpi_prev_usd['qty_전년'] > 0 else 0
        tag_yoy_usd = (kpi_curr_usd['avgTag_당년'] / kpi_prev_usd['avgTag_전년']) * 100 if kpi_prev_usd['avgTag_전년'] > 0 else 0
        cost_yoy_usd = (kpi_curr_usd['avgCost_당년'] / kpi_prev_usd['avgCost_전년']) * 100 if kpi_prev_usd['avgCost_전년'] > 0 else 0
        cost_rate_change_usd = kpi_curr_usd['costRate_당년'] - kpi_prev_usd['costRate_전년']
        
        tag_yoy_krw = (kpi_curr_krw['avgTag_당년'] / kpi_prev_krw['avgTag_전년']) * 100 if kpi_prev_krw['avgTag_전년'] > 0 else 0
        cost_yoy_krw = (kpi_curr_krw['avgCost_당년'] / kpi_prev_krw['avgCost_전년']) * 100 if kpi_prev_krw['avgCost_전년'] > 0 else 0
        cost_rate_change_krw = kpi_curr_krw['costRate_당년'] - kpi_prev_krw['costRate_전년']
        
        categories.append({
            'category': category,
            'qty24F': kpi_prev_usd['qty_전년'],
            'qty25F': kpi_curr_usd['qty_당년'],
            'qtyYoY': round(qty_yoy, 1),
            
            # USD 기준
            'costRate24F_usd': kpi_prev_usd['costRate_전년'],
            'costRate25F_usd': kpi_curr_usd['costRate_당년'],
            'costRateChange_usd': round(cost_rate_change_usd, 1),
            'avgTag24F_usd': kpi_prev_usd['avgTag_전년'],
            'avgTag25F_usd': kpi_curr_usd['avgTag_당년'],
            'tagYoY_usd': round(tag_yoy_usd, 1),
            'avgCost24F_usd': kpi_prev_usd['avgCost_전년'],
            'avgCost25F_usd': kpi_curr_usd['avgCost_당년'],
            'costYoY_usd': round(cost_yoy_usd, 1),
            'material24F_usd': kpi_prev_usd['material_전년'],
            'material25F_usd': kpi_curr_usd['material_당년'],
            'artwork24F_usd': kpi_prev_usd['artwork_전년'],
            'artwork25F_usd': kpi_curr_usd['artwork_당년'],
            'labor24F_usd': kpi_prev_usd['labor_전년'],
            'labor25F_usd': kpi_curr_usd['labor_당년'],
            'margin24F_usd': kpi_prev_usd['margin_전년'],
            'margin25F_usd': kpi_curr_usd['margin_당년'],
            'expense24F_usd': kpi_prev_usd['expense_전년'],
            'expense25F_usd': kpi_curr_usd['expense_당년'],
            'materialRate24F_usd': kpi_prev_usd['materialRate_전년'],
            'materialRate25F_usd': kpi_curr_usd['materialRate_당년'],
            'artworkRate24F_usd': kpi_prev_usd['artworkRate_전년'],
            'artworkRate25F_usd': kpi_curr_usd['artworkRate_당년'],
            'laborRate24F_usd': kpi_prev_usd['laborRate_전년'],
            'laborRate25F_usd': kpi_curr_usd['laborRate_당년'],
            'marginRate24F_usd': kpi_prev_usd['marginRate_전년'],
            'marginRate25F_usd': kpi_curr_usd['marginRate_당년'],
            'expenseRate24F_usd': kpi_prev_usd['expenseRate_전년'],
            'expenseRate25F_usd': kpi_curr_usd['expenseRate_당년'],
            
            # KRW 기준
            'costRate24F_krw': kpi_prev_krw['costRate_전년'],
            'costRate25F_krw': kpi_curr_krw['costRate_당년'],
            'costRateChange_krw': round(cost_rate_change_krw, 1),
            'avgTag24F_krw': kpi_prev_krw['avgTag_전년'],
            'avgTag25F_krw': kpi_curr_krw['avgTag_당년'],
            'tagYoY_krw': round(tag_yoy_krw, 1),
            'avgCost24F_krw': kpi_prev_krw['avgCost_전년'],
            'avgCost25F_krw': kpi_curr_krw['avgCost_당년'],
            'costYoY_krw': round(cost_yoy_krw, 1),
        })
    
    return categories

def main():
    parser = argparse.ArgumentParser(description='Summary JSON 생성 스크립트')
    parser.add_argument('--season', type=str, required=True, 
                       help='시즌 코드 (예: 26SS, 25S, 24S)')
    parser.add_argument('--brand', type=str, nargs='+', required=True, choices=['M', 'I', 'X', 'ST', 'V'],
                       help='브랜드 코드 리스트 (예: M I X ST V)')
    args = parser.parse_args()
    
    season = args.season.upper()
    brands = args.brand if isinstance(args.brand, list) else [args.brand]
    
    # 시즌 폴더명 결정
    if season in ['26SS', '26S']:
        season_folder = '26SS'
        season_code = '26S'
        prev_season_code = '25S'
    elif season in ['25SS', '25S']:
        season_folder = '25S'
        season_code = '25S'
        prev_season_code = '24S'
    elif season in ['24SS', '24S']:
        season_folder = '24S'
        season_code = '24S'
        prev_season_code = '23S'
    elif season in ['26FW', '26F']:
        season_folder = '26FW'
        season_code = '26F'
        prev_season_code = '25F'
    elif season in ['25FW', '25F']:
        season_folder = '25FW'
        season_code = '25F'
        prev_season_code = '24F'
    else:
        season_folder = season
        season_code = season
        prev_season_code = get_previous_season(season_code)
    
    print(f"F&F Cost Dashboard - Summary JSON Generation ({season})")
    print("=" * 60)
    print(f"\n시즌: {season}")
    print(f"브랜드: {', '.join(brands)}")
    
    # FX 파일 로드
    if not os.path.exists(FX_FILE):
        print(f"\n[ERROR] {FX_FILE} 파일이 없습니다.")
        return
    
    df_fx = pd.read_csv(FX_FILE, encoding='utf-8-sig')
    print(f"\n[OK] FX 파일 로드 완료: {len(df_fx)}개 환율 데이터")
    
    # 각 브랜드별로 처리
    for brand_code in brands:
        print(f"\n{'=' * 60}")
        print(f"브랜드 {brand_code} 처리 중...")
        print(f"{'=' * 60}")
        
        # 파일명 결정: SS/S, FW/F는 동일하므로 항상 season_code(S/F 형식) 사용
        file_season = season_code  # 항상 S/F 형식으로 통일
        csv_file = f'public/COST RAW/{season_folder}/{brand_code}_{file_season}.csv'
        print(f"CSV 파일: {csv_file}")
        
        # CSV 파일 로드
        if not os.path.exists(csv_file):
            print(f"\n[ERROR] {csv_file} 파일이 없습니다. 건너뜁니다.")
            continue
        
        print(f"\n[1] CSV 파일 로드: {csv_file}")
        df = pd.read_csv(csv_file, encoding='utf-8-sig')
        
        # X 브랜드인 경우 스타일 코드로 필터링하여 두 개의 Summary 파일 생성
        if brand_code == 'X':
            # 스타일 코드 필터링 (컬럼 인덱스 2가 스타일 코드)
            df['style_upper'] = df.iloc[:, 2].astype(str).str.upper().str.strip()
            
            # DISCOVERY: DX로 시작하는 스타일
            df_discovery = df[df['style_upper'].str.startswith('DX', na=False)].copy()
            # DISCOVERY-KIDS: DK로 시작하는 스타일
            df_kids = df[df['style_upper'].str.startswith('DK', na=False)].copy()
            
            # DISCOVERY Summary 생성
            if len(df_discovery) > 0:
                print(f"\n[1-1] DISCOVERY 데이터 필터링: {len(df_discovery)}개 레코드")
                process_brand_data(df_discovery, df_fx, brand_code, season_code, prev_season_code, 
                                 season_folder, season, f'summary_{season.lower()}_{brand_code.lower()}.json')
            else:
                print(f"\n[WARN] DISCOVERY 데이터가 없습니다. (DX로 시작하는 스타일 없음)")
            
            # DISCOVERY-KIDS Summary 생성
            if len(df_kids) > 0:
                print(f"\n[1-2] DISCOVERY-KIDS 데이터 필터링: {len(df_kids)}개 레코드")
                process_brand_data(df_kids, df_fx, brand_code, season_code, prev_season_code, 
                                 season_folder, season, f'summary_{season.lower()}_{brand_code.lower()}_kids.json')
            else:
                print(f"\n[WARN] DISCOVERY-KIDS 데이터가 없습니다. (DK로 시작하는 스타일 없음)")
            
            continue
        
        # X 브랜드가 아닌 경우 기존 로직 사용
        output_file = f'public/COST RAW/{season_folder}/summary_{season.lower()}_{brand_code.lower()}.json'
        print(f"출력 파일: {output_file}")
        
        # 공통 처리 함수 호출
        process_brand_data(df, df_fx, brand_code, season_code, prev_season_code, 
                         season_folder, season, f'summary_{season.lower()}_{brand_code.lower()}.json')
    
    print("\n" + "=" * 60)
    print("All tasks completed.")


def process_brand_data(df: pd.DataFrame, df_fx: pd.DataFrame, brand_code: str, 
                       season_code: str, prev_season_code: str, season_folder: str, 
                       season: str, output_filename: str):
    """브랜드 데이터 처리 및 Summary JSON 생성"""
    output_file = f'public/COST RAW/{season_folder}/{output_filename}'
    print(f"출력 파일: {output_file}")
    
    # 중분류 통합: SHOES, BAG, HEADWEAR, Acc_etc → Acc_etc
    # 컬럼 인덱스 3이 중분류
    def normalize_category(category):
        if pd.isna(category):
            return 'Acc_etc'
        category_str = str(category).strip()
        category_upper = category_str.upper()
        if category_upper in ['SHOES', 'BAG', 'HEADWEAR', 'ACC_ETC', 'ACC']:
            return 'Acc_etc'
        return category_str
    
    df.iloc[:, 3] = df.iloc[:, 3].apply(normalize_category)
    print(f"   > 중분류 통합 완료: SHOES/BAG/HEADWEAR/Acc_etc → Acc_etc")
    
    # 수량 컬럼 클렌징
    df.iloc[:, 7] = pd.to_numeric(df.iloc[:, 7].astype(str).str.replace(',', '').str.strip(), errors='coerce').fillna(0)
    
    # USD/KRW 단가 컬럼도 숫자로 변환
    for col_idx in range(14, 30):
        df.iloc[:, col_idx] = pd.to_numeric(df.iloc[:, col_idx], errors='coerce').fillna(0)
    
    print(f"   > 총 {len(df)}개 레코드 로드")
    
    # 전체 통계 계산
    print("\n[2] 전체 통계 계산 중...")
    total_stats = calculate_total_stats(df, df_fx, brand_code, season_code, prev_season_code)
    print(f"   > 전년 Cost Rate (USD): {total_stats['costRate24F_usd']:.1f}%")
    print(f"   > 당년 Cost Rate (USD): {total_stats['costRate25F_usd']:.1f}%")
    print(f"   > Cost Rate Change: {total_stats['costRateChange_usd']:+.1f}%p")
    
    # 카테고리별 통계 계산
    print("\n[3] 카테고리별 통계 계산 중...")
    category_stats = calculate_category_stats(df, df_fx, brand_code, season_code, prev_season_code)
    for cat in category_stats:
        print(f"   > {cat['category']}: {cat['costRate25F_usd']:.1f}%")
    
    # JSON 저장
    print(f"\n[4] JSON 저장: {output_file}")
    summary = {
        'total': total_stats,
        'categories': category_stats,
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"   > {output_filename} 생성 완료!")
    
    print("\n" + "=" * 60)
    print("All tasks completed.")

if __name__ == '__main__':
    main()

