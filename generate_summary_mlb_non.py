#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MLB Non 시즌 Summary JSON 생성 스크립트

사용 방법:
    python generate_summary_mlb_non.py --season 25FW --brand M

기능:
- MLB Non CSV 파일 로드
- 전년/당년 기간별 KPI 계산
- 카테고리별 통계 계산
- JSON 파일 생성
"""

import pandas as pd
import json
import argparse
import os
from typing import Dict, Any, List

# 카테고리 순서
CATEGORY_ORDER = ['Outer', 'Inner', 'Bottom', 'Shoes', 'Bag', 'Headwear', 'Acc_etc', 'Wear_etc']

def normalize_season_for_filename(season: str) -> str:
    """
    시즌 코드를 파일명용으로 정규화
    25SS → 25s, 26SS → 26s, 25FW → 25fw, 26FW → 26fw
    """
    season_upper = season.upper()
    if season_upper.endswith('SS'):
        return season_upper[:-2].lower() + 's'  # 25SS → 25s, 26SS → 26s
    elif season_upper.endswith('FW'):
        return season_upper.lower()  # 25FW → 25fw
    else:
        return season.lower()


def calculate_season_kpi(df_season: pd.DataFrame, season: str, currency: str = 'USD') -> Dict[str, float]:
    """
    시즌별 KPI 계산
    
    Args:
        df_season: 시즌별 데이터프레임
        season: 시즌명 (전년, 당년)
        currency: 통화 (USD, KRW)
    
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
    
    # 수량 컬럼 찾기 (발주수량 또는 수량)
    if '발주수량' in df_season.columns:
        qty_col = pd.to_numeric(df_season['발주수량'], errors='coerce')
    elif '수량' in df_season.columns:
        qty_col = pd.to_numeric(df_season['수량'], errors='coerce')
    else:
        qty_col = pd.to_numeric(df_season.iloc[:, 8], errors='coerce')  # 발주수량 (인덱스 8)
    
    qty = qty_col.sum()
    
    if currency == 'USD':
        # TAG (USD) - TAG_USD금액(전년환율) 컬럼 사용 (있는 경우)
        # TAG_USD금액(전년환율)은 이미 총금액이므로 그냥 합산
        if 'TAG_USD금액(전년환율)' in df_season.columns:
            tag_usd_col = pd.to_numeric(df_season['TAG_USD금액(전년환율)'], errors='coerce')
            tag_total = tag_usd_col.sum()  # 이미 총금액이므로 합산만
            avg_tag = tag_total / qty if qty > 0 else 0
        else:
            # TAG_USD금액(전년환율) 컬럼이 없으면 TAG KRW를 환율로 나눠서 계산
            exchange_rate = 1300.0  # 기본값
            if 'TAG' in df_season.columns:
                tag_col = pd.to_numeric(df_season['TAG'], errors='coerce')
            else:
                tag_col = pd.to_numeric(df_season.iloc[:, 7], errors='coerce')  # TAG (인덱스 7)
            tag_total = (tag_col / exchange_rate * qty_col).sum()
            avg_tag = tag_total / qty if qty > 0 else 0
        
        # 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
        # USD 총금액 컬럼 사용 (단가×수량이 이미 계산된 값)
        if 'USD_재료계(원/부/택/본공)_총금액(단가×수량)' in df_season.columns:
            material_total = pd.to_numeric(df_season['USD_재료계(원/부/택/본공)_총금액(단가×수량)'], errors='coerce').sum()
            material = material_total / qty if qty > 0 else 0
        else:
            # 컬럼명이 없으면 인덱스 사용 (fallback)
            mat_col = pd.to_numeric(df_season.iloc[:, 16], errors='coerce') if len(df_season.columns) > 16 else pd.Series([0])
            sub_col = pd.to_numeric(df_season.iloc[:, 18], errors='coerce') if len(df_season.columns) > 18 else pd.Series([0])
            hq_col = pd.to_numeric(df_season.iloc[:, 21], errors='coerce') if len(df_season.columns) > 21 else pd.Series([0])
            tag_label_col = pd.to_numeric(df_season.iloc[:, 19], errors='coerce') if len(df_season.columns) > 19 else pd.Series([0])
            mat_total = (mat_col * qty_col).sum()
            sub_total = (sub_col * qty_col).sum()
            hq_total = (hq_col * qty_col).sum()
            tag_label_total = (tag_label_col * qty_col).sum()
            material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
        
        # 아트웍
        if 'USD_아트웍_총금액(단가×수량)' in df_season.columns:
            artwork_total = pd.to_numeric(df_season['USD_아트웍_총금액(단가×수량)'], errors='coerce').sum()
            artwork = artwork_total / qty if qty > 0 else 0
        else:
            art_col = pd.to_numeric(df_season.iloc[:, 17], errors='coerce') if len(df_season.columns) > 17 else pd.Series([0])
            art_total = (art_col * qty_col).sum()
            artwork = art_total / qty if qty > 0 else 0
        
        # 공임
        if 'USD_공임_총금액(단가×수량)' in df_season.columns:
            labor_total = pd.to_numeric(df_season['USD_공임_총금액(단가×수량)'], errors='coerce').sum()
            labor = labor_total / qty if qty > 0 else 0
        else:
            labor_col = pd.to_numeric(df_season.iloc[:, 20], errors='coerce') if len(df_season.columns) > 20 else pd.Series([0])
            labor_total = (labor_col * qty_col).sum()
            labor = labor_total / qty if qty > 0 else 0
        
        # 마진
        if 'USD_정상마진_총금액(단가×수량)' in df_season.columns:
            margin_total = pd.to_numeric(df_season['USD_정상마진_총금액(단가×수량)'], errors='coerce').sum()
            margin = margin_total / qty if qty > 0 else 0
        else:
            margin_col = pd.to_numeric(df_season.iloc[:, 22], errors='coerce') if len(df_season.columns) > 22 else pd.Series([0])
            margin_total = (margin_col * qty_col).sum()
            margin = margin_total / qty if qty > 0 else 0
        
        # 경비
        if 'USD_경비_총금액(단가×수량)' in df_season.columns:
            expense_total = pd.to_numeric(df_season['USD_경비_총금액(단가×수량)'], errors='coerce').sum()
            expense = expense_total / qty if qty > 0 else 0
        else:
            expense_col = pd.to_numeric(df_season.iloc[:, 23], errors='coerce') if len(df_season.columns) > 23 else pd.Series([0])
            expense_total = (expense_col * qty_col).sum()
            expense = expense_total / qty if qty > 0 else 0
        
    else:  # KRW
        # TAG (KRW)
        if 'TAG' in df_season.columns:
            tag_col = pd.to_numeric(df_season['TAG'], errors='coerce')
        else:
            tag_col = pd.to_numeric(df_season.iloc[:, 7], errors='coerce')  # TAG (인덱스 7)
        tag_total = (tag_col * qty_col).sum()
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # 원부자재
        if 'KRW_재료계(원/부/택/본공)_총금액(단가×수량)' in df_season.columns:
            material_total = pd.to_numeric(df_season['KRW_재료계(원/부/택/본공)_총금액(단가×수량)'], errors='coerce').sum()
            material = material_total / qty if qty > 0 else 0
        else:
            mat_col = pd.to_numeric(df_season.iloc[:, 24], errors='coerce') if len(df_season.columns) > 24 else pd.Series([0])
            sub_col = pd.to_numeric(df_season.iloc[:, 26], errors='coerce') if len(df_season.columns) > 26 else pd.Series([0])
            hq_col = pd.to_numeric(df_season.iloc[:, 29], errors='coerce') if len(df_season.columns) > 29 else pd.Series([0])
            tag_label_col = pd.to_numeric(df_season.iloc[:, 27], errors='coerce') if len(df_season.columns) > 27 else pd.Series([0])
            mat_total = (mat_col * qty_col).sum()
            sub_total = (sub_col * qty_col).sum()
            hq_total = (hq_col * qty_col).sum()
            tag_label_total = (tag_label_col * qty_col).sum()
            material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
        
        # 아트웍
        if 'KRW_아트웍_총금액(단가×수량)' in df_season.columns:
            artwork_total = pd.to_numeric(df_season['KRW_아트웍_총금액(단가×수량)'], errors='coerce').sum()
            artwork = artwork_total / qty if qty > 0 else 0
        else:
            art_col = pd.to_numeric(df_season.iloc[:, 25], errors='coerce') if len(df_season.columns) > 25 else pd.Series([0])
            art_total = (art_col * qty_col).sum()
            artwork = art_total / qty if qty > 0 else 0
        
        # 공임
        if 'KRW_공임_총금액(단가×수량)' in df_season.columns:
            labor_total = pd.to_numeric(df_season['KRW_공임_총금액(단가×수량)'], errors='coerce').sum()
            labor = labor_total / qty if qty > 0 else 0
        else:
            labor_col = pd.to_numeric(df_season.iloc[:, 28], errors='coerce') if len(df_season.columns) > 28 else pd.Series([0])
            labor_total = (labor_col * qty_col).sum()
            labor = labor_total / qty if qty > 0 else 0
        
        # 마진
        if 'KRW_정상마진_총금액(단가×수량)' in df_season.columns:
            margin_total = pd.to_numeric(df_season['KRW_정상마진_총금액(단가×수량)'], errors='coerce').sum()
            margin = margin_total / qty if qty > 0 else 0
        else:
            margin_col = pd.to_numeric(df_season.iloc[:, 30], errors='coerce') if len(df_season.columns) > 30 else pd.Series([0])
            margin_total = (margin_col * qty_col).sum()
            margin = margin_total / qty if qty > 0 else 0
        
        # 경비
        if 'KRW_경비_총금액(단가×수량)' in df_season.columns:
            expense_total = pd.to_numeric(df_season['KRW_경비_총금액(단가×수량)'], errors='coerce').sum()
            expense = expense_total / qty if qty > 0 else 0
        else:
            expense_col = pd.to_numeric(df_season.iloc[:, 31], errors='coerce') if len(df_season.columns) > 31 else pd.Series([0])
            expense_total = (expense_col * qty_col).sum()
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


def extract_period_from_season(season_str: str) -> str:
    """
    시즌 컬럼에서 기간 추출
    예: "전년(24N)" -> "전년", "당년(25N)" -> "당년"
    """
    if pd.isna(season_str):
        return ''
    
    season_str = str(season_str).strip()
    if season_str.startswith('전년'):
        return '전년'
    elif season_str.startswith('당년'):
        return '당년'
    return season_str


def calculate_total_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """전체 통계 계산"""
    # 시즌 컬럼에서 기간 추출
    df['기간'] = df['시즌'].apply(extract_period_from_season)
    
    df_prev = df[df['기간'] == '전년']
    df_curr = df[df['기간'] == '당년']
    
    # 수량 계산
    qty_prev = df_prev.iloc[:, 7].sum()
    qty_curr = df_curr.iloc[:, 7].sum()
    qty_yoy = (qty_curr / qty_prev) * 100 if qty_prev > 0 else 0
    
    # USD 기준
    kpi_prev_usd = calculate_season_kpi(df_prev, '전년', 'USD')
    kpi_curr_usd = calculate_season_kpi(df_curr, '당년', 'USD')
    
    # KRW 기준
    kpi_prev_krw = calculate_season_kpi(df_prev, '전년', 'KRW')
    kpi_curr_krw = calculate_season_kpi(df_curr, '당년', 'KRW')
    
    # YOY 계산
    tag_yoy_usd = (kpi_curr_usd['avgTag_당년'] / kpi_prev_usd['avgTag_전년']) * 100 if kpi_prev_usd['avgTag_전년'] > 0 else 0
    cost_yoy_usd = (kpi_curr_usd['avgCost_당년'] / kpi_prev_usd['avgCost_전년']) * 100 if kpi_prev_usd['avgCost_전년'] > 0 else 0
    cost_rate_change_usd = kpi_curr_usd['costRate_당년'] - kpi_prev_usd['costRate_전년']
    
    tag_yoy_krw = (kpi_curr_krw['avgTag_당년'] / kpi_prev_krw['avgTag_전년']) * 100 if kpi_prev_krw['avgTag_전년'] > 0 else 0
    cost_yoy_krw = (kpi_curr_krw['avgCost_당년'] / kpi_prev_krw['avgCost_전년']) * 100 if kpi_prev_krw['avgCost_전년'] > 0 else 0
    cost_rate_change_krw = kpi_curr_krw['costRate_당년'] - kpi_prev_krw['costRate_전년']
    
    return {
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


def calculate_category_stats(df: pd.DataFrame) -> list:
    """카테고리별 통계 계산"""
    categories = []
    
    # 시즌 컬럼에서 기간 추출
    df['기간'] = df['시즌'].apply(extract_period_from_season)
    
    for category in CATEGORY_ORDER:
        df_cat = df[df.iloc[:, 3] == category]
        
        if len(df_cat) == 0:
            continue
        
        df_prev = df_cat[df_cat['기간'] == '전년']
        df_curr = df_cat[df_cat['기간'] == '당년']
        
        # USD 기준
        kpi_prev_usd = calculate_season_kpi(df_prev, '전년', 'USD')
        kpi_curr_usd = calculate_season_kpi(df_curr, '당년', 'USD')
        
        # KRW 기준
        kpi_prev_krw = calculate_season_kpi(df_prev, '전년', 'KRW')
        kpi_curr_krw = calculate_season_kpi(df_curr, '당년', 'KRW')
        
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
    parser = argparse.ArgumentParser(description='MLB Non 시즌 Summary JSON 생성')
    parser.add_argument('--season', type=str, required=True, help='시즌 코드 (예: 25FW, 26SS)')
    parser.add_argument('--brand', type=str, required=True, help='브랜드 코드 (M, I, X)')
    
    args = parser.parse_args()
    season = args.season
    brand = args.brand
    
    print("=" * 60)
    print(f"MLB Non 시즌 Summary JSON 생성")
    print(f"시즌: {season}, 브랜드: {brand}")
    print("=" * 60)
    
    # 파일 경로 결정 (기존 폴더 구조에 맞게)
    season_upper = season.upper()
    if season_upper in ['25FW', '25F']:
        season_folder = '25FW'
        file_season = '25F'
    elif season_upper in ['25SS', '25S']:
        season_folder = '25S'
        file_season = '25S'
    elif season_upper in ['26SS', '26S']:
        season_folder = '26SS'
        file_season = '26S'
    elif season_upper in ['26FW', '26F']:
        season_folder = '26FW'
        file_season = '26F'
    else:
        season_folder = season
        file_season = season
    
    csv_file = f'public/COST RAW/{season_folder}/{brand}_{file_season}_NON.csv'
    
    if not os.path.exists(csv_file):
        print(f"[ERROR] CSV 파일이 없습니다: {csv_file}")
        return
    
    # CSV 파일 로드
    print(f"\n[1] CSV 파일 로드: {csv_file}")
    df = pd.read_csv(csv_file, encoding='utf-8-sig')
    
    # 수량 컬럼 클렌징
    df.iloc[:, 7] = pd.to_numeric(df.iloc[:, 7].astype(str).str.replace(',', '').str.strip(), errors='coerce').fillna(0)
    
    print(f"   > {len(df)}개 행 로드 완료")
    
    # 전체 통계 계산
    print("\n[2] 전체 통계 계산 중...")
    total_stats = calculate_total_stats(df)
    print(f"   > 전년 Cost Rate (USD): {total_stats['costRate24F_usd']:.1f}%")
    print(f"   > 당년 Cost Rate (USD): {total_stats['costRate25F_usd']:.1f}%")
    print(f"   > Cost Rate Change: {total_stats['costRateChange_usd']:+.1f}%p")
    
    # 카테고리별 통계 계산
    print("\n[3] 카테고리별 통계 계산 중...")
    category_stats = calculate_category_stats(df)
    for cat in category_stats:
        print(f"   > {cat['category']}: {cat['costRate25F_usd']:.1f}%")
    
    # JSON 저장
    output_file = f'public/COST RAW/{season_folder}/summary_{normalize_season_for_filename(season)}_{brand.lower()}_non.json'
    print(f"\n[4] JSON 파일 저장: {output_file}")
    
    summary = {
        'total': total_stats,
        'categories': category_stats,
    }
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"   > summary JSON 생성 완료!")
    print("\n" + "=" * 60)
    print("모든 작업 완료.")
    print("=" * 60)


if __name__ == '__main__':
    main()

