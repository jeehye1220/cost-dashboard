#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
F&F 원가 대시보드 - Summary JSON 생성 스크립트 (25FW용)

이 스크립트는 CSV 파일을 읽어서 전체 및 카테고리별 KPI를 계산하고
summary_25fw.json 파일을 생성합니다.

핵심 원칙:
- 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨 (아트웍 제외!)
- 원가율 = (평균원가 ÷ (평균TAG / 1.1)) × 100
- 수량 가중 평균 사용
- USD와 KRW 별도 계산
"""

import pandas as pd
import json
from typing import Dict, Any

# CSV 파일 경로 (25FW용)
CSV_FILE = 'public/MLB KIDS FW.csv'
FX_FILE = 'public/MLB KIDS FX FW.csv'
OUTPUT_FILE = 'public/summary_kids.json'

# 카테고리 순서
CATEGORY_ORDER = ['Outer', 'Inner', 'Bottom', 'Shoes', 'Bag', 'Headwear', 'Acc_etc']

# 환율 데이터 로드
def load_exchange_rates():
    """FX CSV에서 환율 데이터 로드"""
    df_fx = pd.read_csv(FX_FILE, encoding='utf-8')
    return {
        '전년': float(df_fx.iloc[0, 0]),  # 첫 번째 행, 첫 번째 열
        '당년': float(df_fx.iloc[0, 1])   # 첫 번째 행, 두 번째 열
    }

# 환율 로드
FX_RATES = load_exchange_rates()


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
        # TAG (USD) - 당년은 전년 환율 사용!
        # 전년: 전년 환율
        # 당년: 전년 환율 (당시즌은 전시즌 환율 적용)
        exchange_rate = FX_RATES['전년']  # 항상 전년 환율 사용
        tag_total = (df_season.iloc[:, 6] / exchange_rate * df_season.iloc[:, 7]).sum()  # (TAG / 환율) × 수량
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # 24F는 USD 컬럼에 #REF! 오류가 있으므로 KRW 컬럼 사용
        # 시즌 판별: '24F'면 KRW를 환율로 나눔, '25F'면 USD 직접 사용
        is_24f = season == '전년'  # 24F 시즌인 경우
        
        if is_24f:
            # KRW 컬럼 사용 (인덱스 22-29) - 환율로 나눔
            season_exchange = FX_RATES['전년']  # 24F는 전년 환율
            mat_total = (df_season.iloc[:, 22] / season_exchange * df_season.iloc[:, 7]).sum()
            sub_total = (df_season.iloc[:, 24] / season_exchange * df_season.iloc[:, 7]).sum()
            hq_total = (df_season.iloc[:, 27] / season_exchange * df_season.iloc[:, 7]).sum()
            tag_label_total = (df_season.iloc[:, 25] / season_exchange * df_season.iloc[:, 7]).sum()
            material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
            
            art_total = (df_season.iloc[:, 23] / season_exchange * df_season.iloc[:, 7]).sum()
            artwork = art_total / qty if qty > 0 else 0
            
            labor_total = (df_season.iloc[:, 26] / season_exchange * df_season.iloc[:, 7]).sum()
            labor = labor_total / qty if qty > 0 else 0
            
            margin_total = (df_season.iloc[:, 28] / season_exchange * df_season.iloc[:, 7]).sum()
            margin = margin_total / qty if qty > 0 else 0
            
            expense_total = (df_season.iloc[:, 29] / season_exchange * df_season.iloc[:, 7]).sum()
            expense = expense_total / qty if qty > 0 else 0
        else:
            # 25F는 USD 컬럼 사용 (인덱스 14-21)
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
        # TAG (KRW)
        tag_total = (df_season.iloc[:, 6] * df_season.iloc[:, 7]).sum()  # TAG × 수량
        avg_tag = tag_total / qty if qty > 0 else 0
        
        # 원부자재 = 원자재 + 부자재 + 본사공급자재 + 택/라벨
        mat_total = (df_season.iloc[:, 22] * df_season.iloc[:, 7]).sum()  # 원자재
        sub_total = (df_season.iloc[:, 24] * df_season.iloc[:, 7]).sum()  # 부자재
        hq_total = (df_season.iloc[:, 27] * df_season.iloc[:, 7]).sum()   # 본사공급자재
        tag_label_total = (df_season.iloc[:, 25] * df_season.iloc[:, 7]).sum()  # 택/라벨
        material = (mat_total + sub_total + hq_total + tag_label_total) / qty if qty > 0 else 0
        
        # 아트웍 (별도)
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


def calculate_total_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """전체 통계 계산"""
    df_prev = df[df.iloc[:, 1] == '24F']
    df_curr = df[df.iloc[:, 1] == '25F']
    
    # 수량 계산
    qty_prev = df_prev.iloc[:, 7].sum()  # 총 생산수량 (발주수량)
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


def calculate_category_stats(df: pd.DataFrame) -> list:
    """카테고리별 통계 계산"""
    categories = []
    
    for category in CATEGORY_ORDER:
        df_cat = df[df.iloc[:, 3] == category]
        
        if len(df_cat) == 0:
            continue
        
        df_prev = df_cat[df_cat.iloc[:, 1] == '24F']
        df_curr = df_cat[df_cat.iloc[:, 1] == '25F']
        
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
    """메인 함수"""
    print("F&F Cost Dashboard - Summary JSON Generation (MLB KIDS)")
    print("=" * 60)
    
    # 환율 정보 출력
    print(f"\n0. Exchange Rates:")
    print(f"   > 전년: {FX_RATES['전년']:.2f} KRW")
    print(f"   > 당년: {FX_RATES['당년']:.2f} KRW")
    
    # CSV 파일 로드
    print(f"\n1. Loading CSV: {CSV_FILE}")
    df = pd.read_csv(CSV_FILE, encoding='utf-8')
    
    # 수량 컬럼 클렌징 (공백 제거 및 숫자 변환)
    df.iloc[:, 7] = pd.to_numeric(df.iloc[:, 7].astype(str).str.replace(',', '').str.strip(), errors='coerce').fillna(0)
    
    # USD/KRW 단가 컬럼도 숫자로 변환
    for col_idx in range(14, 30):
        df.iloc[:, col_idx] = pd.to_numeric(df.iloc[:, col_idx], errors='coerce').fillna(0)
    
    print(f"   > Total {len(df)} records loaded")
    
    # 전체 통계 계산
    print("\n2. Calculating total statistics")
    total_stats = calculate_total_stats(df)
    print(f"   > 전년 Cost Rate (USD): {total_stats['costRate24F_usd']:.1f}%")
    print(f"   > 당년 Cost Rate (USD): {total_stats['costRate25F_usd']:.1f}%")
    print(f"   > Cost Rate Change: {total_stats['costRateChange_usd']:+.1f}%p")
    
    # 카테고리별 통계 계산
    print("\n3. Calculating category statistics")
    category_stats = calculate_category_stats(df)
    for cat in category_stats:
        print(f"   > {cat['category']}: {cat['costRate25F_usd']:.1f}%")
    
    # JSON 저장
    print(f"\n4. Saving JSON: {OUTPUT_FILE}")
    summary = {
        'total': total_stats,
        'categories': category_stats,
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    print(f"   > summary_kids.json generated successfully!")
    print("\n" + "=" * 60)
    print("All tasks completed.")


if __name__ == '__main__':
    main()

