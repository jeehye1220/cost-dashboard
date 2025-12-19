#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MLB (M) 브랜드 CSV 파일을 COST RAW 폴더에 LV2까지 생성
기존 MLB FW.csv 파일을 읽어서 M_25FW.csv, M_25FW_LV1.csv, M_25FW_LV2.csv 생성
"""

import pandas as pd
import os

# ============================================
# 설정
# ============================================
INPUT_FILE = 'public/MLB FW.csv'
OUTPUT_DIR = 'public/COST RAW'
BRAND_CODE = 'M'
SEASON = '25FW'

# ============================================
# 카테고리 → 의류/슈즈/용품 매핑
# ============================================
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

# ============================================
# FX.csv 환율 로드
# ============================================
def load_fx_rate_from_cost_raw(brand_code: str, season_code: str, category: str = None) -> float:
    """
    COST RAW/FX.csv에서 환율 로드
    
    Args:
        brand_code: 브랜드 코드 (예: 'M')
        season_code: 시즌 코드 (예: '25F')
        category: 중분류 카테고리 (예: 'Outer', 'Shoes', 'Bag') - 선택사항
    
    Returns:
        환율 값 (float)
    """
    fx_file = 'public/COST RAW/FX.csv'
    
    if not os.path.exists(fx_file):
        print(f"[WARN] {fx_file} 파일이 없습니다. 기본 환율 1300.0 사용")
        return 1300.0
    
    df_fx = pd.read_csv(fx_file, encoding='utf-8-sig')
    
    # 브랜드명 변환 (코드 → 브랜드명)
    brand_name_map = {
        'M': 'MLB',
        'I': 'MLB KIDS',
        'X': 'DISCOVERY',
        'V': 'DUVETICA',
        'ST': 'SERGIO TACCHINI'
    }
    brand_name = brand_name_map.get(brand_code, brand_code)
    
    # 카테고리 매핑 (의류/슈즈/용품)
    fx_category = map_category_to_fx_category(category) if category else '의류'
    
    # FX.csv에서 해당 브랜드, 시즌, 카테고리의 환율 찾기
    filtered = df_fx[
        (df_fx['브랜드'] == brand_name) &
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
            (df_fx['브랜드'] == brand_name) &
            (df_fx['시즌'] == season_code) &
            (df_fx['카테고리'] == '의류')
        ]
        if len(default) > 0:
            rate = float(default.iloc[0]['환율'])
            if rate > 0:
                return rate
    
    # 최종 기본값
    print(f"[WARN] 환율을 찾을 수 없습니다. 브랜드={brand_name}, 시즌={season_code}, 카테고리={fx_category}. 기본값 1300.0 사용")
    return 1300.0

# ============================================
# CSV 파일 생성 (LV2까지)
# ============================================
def process_mlb_csv():
    """MLB FW.csv 파일을 읽어서 COST RAW 폴더에 LV2까지 생성"""
    
    print("MLB (M) 브랜드 CSV 파일 생성 스크립트")
    print("=" * 60)
    
    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # CSV 파일 읽기
    print(f"\n[1] CSV 파일 읽기: {INPUT_FILE}")
    if not os.path.exists(INPUT_FILE):
        print(f"[ERROR] {INPUT_FILE} 파일이 없습니다.")
        return
    
    df = pd.read_csv(INPUT_FILE, encoding='utf-8-sig')
    print(f"   > {len(df)}개 행 로드 완료")
    
    # 원본 CSV 저장 (M_25FW.csv)
    original_file = os.path.join(OUTPUT_DIR, f"{BRAND_CODE}_{SEASON}.csv")
    df.to_csv(original_file, index=False, encoding='utf-8-sig', lineterminator='\n')
    print(f"\n[2] 원본 CSV 저장: {original_file}")
    
    # LV1: 기본 정제
    print(f"\n[3] LV1 파일 생성 중...")
    df_lv1 = df.copy()
    
    # 문자열 컬럼 공백 제거
    string_cols = df_lv1.select_dtypes(include=['object']).columns
    for col in string_cols:
        df_lv1[col] = df_lv1[col].astype(str).str.strip()
    
    # 숫자 컬럼 정리 (쉼표 제거, 숫자 변환)
    numeric_cols = ['수량', 'TAG', 'TAG_총금액', 'TAG_USD금액(24F환율)']
    for col in numeric_cols:
        if col in df_lv1.columns:
            df_lv1[col] = pd.to_numeric(
                df_lv1[col].astype(str).str.replace(',', '').str.strip(),
                errors='coerce'
            ).fillna(0)
    
    lv1_file = os.path.join(OUTPUT_DIR, f"{BRAND_CODE}_{SEASON}_LV1.csv")
    df_lv1.to_csv(lv1_file, index=False, encoding='utf-8-sig', lineterminator='\n')
    print(f"   > LV1 파일 저장: {lv1_file}")
    
    # LV2: 추가 계산 컬럼
    print(f"\n[4] LV2 파일 생성 중...")
    df_lv2 = df_lv1.copy()
    
    # 원부자재 계산 (USD)
    usd_material_cols = ['(USD)_원자재', '(USD)_부자재', '(USD)본사공급자재', '(USD)_택/라벨']
    if all(col in df_lv2.columns for col in usd_material_cols):
        df_lv2['원부자재(USD)'] = (
            df_lv2['(USD)_원자재'].fillna(0) +
            df_lv2['(USD)_부자재'].fillna(0) +
            df_lv2['(USD)본사공급자재'].fillna(0) +
            df_lv2['(USD)_택/라벨'].fillna(0)
        )
        print(f"   > 원부자재(USD) 컬럼 추가 완료")
    
    # 원부자재 계산 (KRW)
    krw_material_cols = ['(KRW)_원자재', '(KRW)_부자재', '(KRW)본사공급자재', '(KRW)_택/라벨']
    if all(col in df_lv2.columns for col in krw_material_cols):
        df_lv2['원부자재(KRW)'] = (
            df_lv2['(KRW)_원자재'].fillna(0) +
            df_lv2['(KRW)_부자재'].fillna(0) +
            df_lv2['(KRW)본사공급자재'].fillna(0) +
            df_lv2['(KRW)_택/라벨'].fillna(0)
        )
        print(f"   > 원부자재(KRW) 컬럼 추가 완료")
    
    # 총원가 계산 (USD)
    if '원부자재(USD)' in df_lv2.columns:
        df_lv2['총원가(USD)'] = (
            df_lv2['원부자재(USD)'].fillna(0) +
            df_lv2['(USD)_아트웍'].fillna(0) +
            df_lv2['(USD) 공임'].fillna(0) +
            df_lv2['(USD)_정상마진'].fillna(0) +
            df_lv2['(USD)_경비'].fillna(0)
        )
        print(f"   > 총원가(USD) 컬럼 추가 완료")
    
    # 총원가 계산 (KRW)
    if '원부자재(KRW)' in df_lv2.columns:
        df_lv2['총원가(KRW)'] = (
            df_lv2['원부자재(KRW)'].fillna(0) +
            df_lv2['(KRW)_아트웍'].fillna(0) +
            df_lv2['(KRW)_공임'].fillna(0) +
            df_lv2['(KRW)_정상마진'].fillna(0) +
            df_lv2['(KRW)_경비'].fillna(0)
        )
        print(f"   > 총원가(KRW) 컬럼 추가 완료")
    
    lv2_file = os.path.join(OUTPUT_DIR, f"{BRAND_CODE}_{SEASON}_LV2.csv")
    df_lv2.to_csv(lv2_file, index=False, encoding='utf-8-sig', lineterminator='\n')
    print(f"   > LV2 파일 저장: {lv2_file}")
    
    # 완료 메시지
    print("\n" + "=" * 60)
    print("[완료] MLB (M) 브랜드 CSV 파일 생성 완료!")
    print(f"  - 원본: {original_file}")
    print(f"  - LV1:  {lv1_file}")
    print(f"  - LV2:  {lv2_file}")
    print("=" * 60)

if __name__ == '__main__':
    process_mlb_csv()


















