# -*- coding: utf-8 -*-
"""
F&F Cost Dashboard - Summary JSON Generation (MLB KIDS)
"""

import sys
sys.path.insert(0, '.')

import pandas as pd
import json
from typing import Dict, Any

# CSV 파일 경로
CSV_FILE = 'public/MLB KIDS FW.csv'
FX_FILE = 'public/MLB KIDS FX FW.csv'
OUTPUT_FILE = 'public/summary_kids.json'

# 카테고리 순서
CATEGORY_ORDER = ['Outer', 'Inner', 'Bottom', 'Shoes', 'Bag', 'Headwear', 'Acc_etc']

# 환율 데이터 로드
print(f"Loading FX rates from {FX_FILE}...")
fx_df = pd.read_csv(FX_FILE, encoding='utf-8')
FX_RATES = {
    'prev': float(fx_df['24F'].iloc[0]),  # 24F 환율
    'curr': float(fx_df['25F'].iloc[0])   # 25F 환율
}

print(f"FX Rates - 24F: {FX_RATES['prev']}, 25F: {FX_RATES['curr']}")

def calculate_season_kpi(df_season: pd.DataFrame, season: str, currency: str) -> Dict[str, Any]:
    """시즌별 KPI 계산"""
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
    
    qty = df_season.iloc[:, 7].sum()
    
    if currency == 'USD':
        exchange_rate = FX_RATES['prev']
        tag_total = (df_season.iloc[:, 6] / exchange_rate * df_season.iloc[:, 7]).sum()
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # USD 컬럼 사용 (14-21)
        mat_total = (df_season.iloc[:, 14] * df_season.iloc[:, 7]).sum()
        sub_total = (df_season.iloc[:, 16] * df_season.iloc[:, 7]).sum()
        hq_total = (df_season.iloc[:, 19] * df_season.iloc[:, 7]).sum()
        tag_label_total = (df_season.iloc[:, 17] * df_season.iloc[:, 7]).sum()
        material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
        
        art_total = (df_season.iloc[:, 15] * df_season.iloc[:, 7]).sum()
        artwork = art_total / qty if qty > 0 else 0
        
        labor_total = (df_season.iloc[:, 18] * df_season.iloc[:, 7]).sum()
        labor = labor_total / qty if qty > 0 else 0
        
        margin_total = (df_season.iloc[:, 20] * df_season.iloc[:, 7]).sum()
        margin = margin_total / qty if qty > 0 else 0
        
        expense_total = (df_season.iloc[:, 21] * df_season.iloc[:, 7]).sum()
        expense = expense_total / qty if qty > 0 else 0
    else:  # KRW
        tag_total = (df_season.iloc[:, 6] * df_season.iloc[:, 7]).sum()
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # KRW 컬럼 사용 (22-29)
        mat_total = (df_season.iloc[:, 22] * df_season.iloc[:, 7]).sum()
        sub_total = (df_season.iloc[:, 24] * df_season.iloc[:, 7]).sum()
        hq_total = (df_season.iloc[:, 27] * df_season.iloc[:, 7]).sum()
        tag_label_total = (df_season.iloc[:, 25] * df_season.iloc[:, 7]).sum()
        material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
        
        art_total = (df_season.iloc[:, 23] * df_season.iloc[:, 7]).sum()
        artwork = art_total / qty if qty > 0 else 0
        
        labor_total = (df_season.iloc[:, 26] * df_season.iloc[:, 7]).sum()
        labor = labor_total / qty if qty > 0 else 0
        
        margin_total = (df_season.iloc[:, 28] * df_season.iloc[:, 7]).sum()
        margin = margin_total / qty if qty > 0 else 0
        
        expense_total = (df_season.iloc[:, 29] * df_season.iloc[:, 7]).sum()
        expense = expense_total / qty if qty > 0 else 0
    
    avg_cost = material + artwork + labor + margin + expense
    cost_rate = (avg_cost / (avg_tag / 1.1)) * 100 if avg_tag > 0 else 0
    
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

# CSV 파일 로드
print(f"\nLoading CSV: {CSV_FILE}")
df = pd.read_csv(CSV_FILE, encoding='utf-8')

# 수량 컬럼 클렌징
df.iloc[:, 7] = pd.to_numeric(df.iloc[:, 7].astype(str).str.replace(',', '').str.strip(), errors='coerce').fillna(0)

# USD/KRW 단가 컬럼도 숫자로 변환
for col_idx in range(14, 30):
    df.iloc[:, col_idx] = pd.to_numeric(df.iloc[:, col_idx], errors='coerce').fillna(0)

print(f"Total {len(df)} records loaded")

# 전체 통계
print("\nCalculating total statistics...")
df_prev = df[df.iloc[:, 1] == '24F']
df_curr = df[df.iloc[:, 1] == '25F']

qty_prev = df_prev.iloc[:, 7].sum()
qty_curr = df_curr.iloc[:, 7].sum()
qty_yoy = (qty_curr / qty_prev) * 100 if qty_prev > 0 else 0

kpi_prev_usd = calculate_season_kpi(df_prev, '24F', 'USD')
kpi_curr_usd = calculate_season_kpi(df_curr, '25F', 'USD')
kpi_prev_krw = calculate_season_kpi(df_prev, '24F', 'KRW')
kpi_curr_krw = calculate_season_kpi(df_curr, '25F', 'KRW')

tag_yoy_usd = (kpi_curr_usd['avgTag_25F'] / kpi_prev_usd['avgTag_24F']) * 100 if kpi_prev_usd['avgTag_24F'] > 0 else 0
cost_yoy_usd = (kpi_curr_usd['avgCost_25F'] / kpi_prev_usd['avgCost_24F']) * 100 if kpi_prev_usd['avgCost_24F'] > 0 else 0
cost_rate_change_usd = kpi_curr_usd['costRate_25F'] - kpi_prev_usd['costRate_24F']

tag_yoy_krw = (kpi_curr_krw['avgTag_25F'] / kpi_prev_krw['avgTag_24F']) * 100 if kpi_prev_krw['avgTag_24F'] > 0 else 0
cost_yoy_krw = (kpi_curr_krw['avgCost_25F'] / kpi_prev_krw['avgCost_24F']) * 100 if kpi_prev_krw['avgCost_24F'] > 0 else 0
cost_rate_change_krw = kpi_curr_krw['costRate_25F'] - kpi_prev_krw['costRate_24F']

total_stats = {
    'qty24F': int(qty_prev),
    'qty25F': int(qty_curr),
    'qtyYoY': round(qty_yoy, 1),
    'costRate24F_usd': kpi_prev_usd['costRate_24F'],
    'costRate25F_usd': kpi_curr_usd['costRate_25F'],
    'costRateChange_usd': round(cost_rate_change_usd, 1),
    'avgTag24F_usd': kpi_prev_usd['avgTag_24F'],
    'avgTag25F_usd': kpi_curr_usd['avgTag_25F'],
    'tagYoY_usd': round(tag_yoy_usd, 1),
    'avgCost24F_usd': kpi_prev_usd['avgCost_24F'],
    'avgCost25F_usd': kpi_curr_usd['avgCost_25F'],
    'costYoY_usd': round(cost_yoy_usd, 1),
    'material24F_usd': kpi_prev_usd['material_24F'],
    'material25F_usd': kpi_curr_usd['material_25F'],
    'artwork24F_usd': kpi_prev_usd['artwork_24F'],
    'artwork25F_usd': kpi_curr_usd['artwork_25F'],
    'labor24F_usd': kpi_prev_usd['labor_24F'],
    'labor25F_usd': kpi_curr_usd['labor_25F'],
    'margin24F_usd': kpi_prev_usd['margin_24F'],
    'margin25F_usd': kpi_curr_usd['margin_25F'],
    'expense24F_usd': kpi_prev_usd['expense_24F'],
    'expense25F_usd': kpi_curr_usd['expense_25F'],
    'materialRate24F_usd': kpi_prev_usd['materialRate_24F'],
    'materialRate25F_usd': kpi_curr_usd['materialRate_25F'],
    'artworkRate24F_usd': kpi_prev_usd['artworkRate_24F'],
    'artworkRate25F_usd': kpi_curr_usd['artworkRate_25F'],
    'laborRate24F_usd': kpi_prev_usd['laborRate_24F'],
    'laborRate25F_usd': kpi_curr_usd['laborRate_25F'],
    'marginRate24F_usd': kpi_prev_usd['marginRate_24F'],
    'marginRate25F_usd': kpi_curr_usd['marginRate_25F'],
    'expenseRate24F_usd': kpi_prev_usd['expenseRate_24F'],
    'expenseRate25F_usd': kpi_curr_usd['expenseRate_25F'],
    'costRate24F_krw': kpi_prev_krw['costRate_24F'],
    'costRate25F_krw': kpi_curr_krw['costRate_25F'],
    'costRateChange_krw': round(cost_rate_change_krw, 1),
    'avgTag24F_krw': kpi_prev_krw['avgTag_24F'],
    'avgTag25F_krw': kpi_curr_krw['avgTag_25F'],
    'tagYoY_krw': round(tag_yoy_krw, 1),
    'avgCost24F_krw': kpi_prev_krw['avgCost_24F'],
    'avgCost25F_krw': kpi_curr_krw['avgCost_25F'],
    'costYoY_krw': round(cost_yoy_krw, 1),
}

print(f"Cost Rate 24F (USD): {total_stats['costRate24F_usd']}%")
print(f"Cost Rate 25F (USD): {total_stats['costRate25F_usd']}%")
print(f"Cost Rate Change: {total_stats['costRateChange_usd']}%p")

# 카테고리별 통계
print("\nCalculating category statistics...")
categories = []

for category in CATEGORY_ORDER:
    df_cat = df[df.iloc[:, 3] == category]
    
    if len(df_cat) == 0:
        continue
    
    df_prev = df_cat[df_cat.iloc[:, 1] == '24F']
    df_curr = df_cat[df_cat.iloc[:, 1] == '25F']
    
    kpi_prev_usd = calculate_season_kpi(df_prev, '24F', 'USD')
    kpi_curr_usd = calculate_season_kpi(df_curr, '25F', 'USD')
    kpi_prev_krw = calculate_season_kpi(df_prev, '24F', 'KRW')
    kpi_curr_krw = calculate_season_kpi(df_curr, '25F', 'KRW')
    
    qty_yoy = (kpi_curr_usd['qty_25F'] / kpi_prev_usd['qty_24F']) * 100 if kpi_prev_usd['qty_24F'] > 0 else 0
    tag_yoy_usd = (kpi_curr_usd['avgTag_25F'] / kpi_prev_usd['avgTag_24F']) * 100 if kpi_prev_usd['avgTag_24F'] > 0 else 0
    cost_yoy_usd = (kpi_curr_usd['avgCost_25F'] / kpi_prev_usd['avgCost_24F']) * 100 if kpi_prev_usd['avgCost_24F'] > 0 else 0
    cost_rate_change_usd = kpi_curr_usd['costRate_25F'] - kpi_prev_usd['costRate_24F']
    
    tag_yoy_krw = (kpi_curr_krw['avgTag_25F'] / kpi_prev_krw['avgTag_24F']) * 100 if kpi_prev_krw['avgTag_24F'] > 0 else 0
    cost_yoy_krw = (kpi_curr_krw['avgCost_25F'] / kpi_prev_krw['avgCost_24F']) * 100 if kpi_prev_krw['avgCost_24F'] > 0 else 0
    cost_rate_change_krw = kpi_curr_krw['costRate_25F'] - kpi_prev_krw['costRate_24F']
    
    categories.append({
        'category': category,
        'qty24F': kpi_prev_usd['qty_24F'],
        'qty25F': kpi_curr_usd['qty_25F'],
        'qtyYoY': round(qty_yoy, 1),
        'costRate24F_usd': kpi_prev_usd['costRate_24F'],
        'costRate25F_usd': kpi_curr_usd['costRate_25F'],
        'costRateChange_usd': round(cost_rate_change_usd, 1),
        'avgTag24F_usd': kpi_prev_usd['avgTag_24F'],
        'avgTag25F_usd': kpi_curr_usd['avgTag_25F'],
        'tagYoY_usd': round(tag_yoy_usd, 1),
        'avgCost24F_usd': kpi_prev_usd['avgCost_24F'],
        'avgCost25F_usd': kpi_curr_usd['avgCost_25F'],
        'costYoY_usd': round(cost_yoy_usd, 1),
        'material24F_usd': kpi_prev_usd['material_24F'],
        'material25F_usd': kpi_curr_usd['material_25F'],
        'artwork24F_usd': kpi_prev_usd['artwork_24F'],
        'artwork25F_usd': kpi_curr_usd['artwork_25F'],
        'labor24F_usd': kpi_prev_usd['labor_24F'],
        'labor25F_usd': kpi_curr_usd['labor_25F'],
        'margin24F_usd': kpi_prev_usd['margin_24F'],
        'margin25F_usd': kpi_curr_usd['margin_25F'],
        'expense24F_usd': kpi_prev_usd['expense_24F'],
        'expense25F_usd': kpi_curr_usd['expense_25F'],
        'materialRate24F_usd': kpi_prev_usd['materialRate_24F'],
        'materialRate25F_usd': kpi_curr_usd['materialRate_25F'],
        'artworkRate24F_usd': kpi_prev_usd['artworkRate_24F'],
        'artworkRate25F_usd': kpi_curr_usd['artworkRate_25F'],
        'laborRate24F_usd': kpi_prev_usd['laborRate_24F'],
        'laborRate25F_usd': kpi_curr_usd['laborRate_25F'],
        'marginRate24F_usd': kpi_prev_usd['marginRate_24F'],
        'marginRate25F_usd': kpi_curr_usd['marginRate_25F'],
        'expenseRate24F_usd': kpi_prev_usd['expenseRate_24F'],
        'expenseRate25F_usd': kpi_curr_usd['expenseRate_25F'],
        'costRate24F_krw': kpi_prev_krw['costRate_24F'],
        'costRate25F_krw': kpi_curr_krw['costRate_25F'],
        'costRateChange_krw': round(cost_rate_change_krw, 1),
        'avgTag24F_krw': kpi_prev_krw['avgTag_24F'],
        'avgTag25F_krw': kpi_curr_krw['avgTag_25F'],
        'tagYoY_krw': round(tag_yoy_krw, 1),
        'avgCost24F_krw': kpi_prev_krw['avgCost_24F'],
        'avgCost25F_krw': kpi_curr_krw['avgCost_25F'],
        'costYoY_krw': round(cost_yoy_krw, 1),
    })
    
    print(f"  {category}: {kpi_curr_usd['costRate_25F']}%")

# JSON 저장
print(f"\nSaving JSON: {OUTPUT_FILE}")
summary = {
    'total': total_stats,
    'categories': categories,
}

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print(f"summary_kids.json generated successfully!")
print("=" * 60)
print("All tasks completed.")

