#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQL 데이터 연결 및 환율 변환 스크립트

SQL 쿼리를 실행하여 데이터를 추출하고, 발주통화에 따라 환율 변환을 적용하여
브랜드_시즌.csv 형식으로 CSV 파일을 생성합니다.

사용 방법:
1. 데이터베이스 연결 정보 설정 (DB_CONFIG)
2. SQL 쿼리 확인 (사용자 제공 쿼리 사용)
3. 스크립트 실행
"""

import pandas as pd
import snowflake.connector
import os
from typing import Optional, Dict

# ============================================
# Snowflake 연결 설정
# ============================================
SNOWFLAKE_CONFIG = {
    'account': 'cixxjbf-wp67697',
    'username': 'kjh1',
    'password': 'Sqlstudy12345!',
    'warehouse': 'DEV_WH',
    'database': 'FNF',
    'schema': 'SAP_FNF',
    'role': 'PUBLIC'  # PU_SQL 역할이 없으면 PUBLIC 사용
}

# ============================================
# SQL 쿼리 (사용자 제공 쿼리)
# ============================================
SQL_QUERY = """
with main as (
    select 
        a.brd_cd,
        a.sesn,
        a.part_cd,
        a.po_no,
        a.cost_quotation_no,
        a.quotation_apv_stat_nm,
        a.tag_amt,
        a.quotation_submit_dt,
        b.type1,
        b.type1_nm,
        b.type2,
        b.type2_nm,
        b.type3,
        a.mfac_compy_nm,
        b.unit,
        b.width,
        b.currency,
        b.mfac_offer_cons,
        b.mfac_offer_cost,
        b.mfac_offer_cost_amt,
        b.mfac_offer_cost_amt_curr,
        b.mfac_nego_cost,
        b.mfac_nego_cost_amt,
        b.mfac_nego_cost_amt_curr,
        p.item_nm as item_nm,
        s.vtext2 as vtext2,
        o1.tag_price as tag_price,
        o2.po_qty_sum as po_qty_sum
    from prcs.db_cost_mst a
    join prcs.db_cost_dtl b on a.po_no = b.po_no 
        and a.quotation_seq = b.quotation_seq 
        and a.quotation_apv_stat_nm = '확정'
    left join prcs.db_prdt p on p.prdt_cd = a.brd_cd || a.sesn || a.part_cd
    left join sap_fnf.mst_prdt s on s.prdt_cd = p.prdt_cd
    left join (
        select prdt_cd, min(tag_price) as tag_price
        from prcs.dw_ord
        where tag_price is not null
        group by prdt_cd
    ) o1 on o1.prdt_cd = p.prdt_cd
    left join (
        select po_no, sum(ord_qty) as po_qty_sum
        from prcs.dw_ord
        group by po_no
    ) o2 on o2.po_no = a.po_no
)
select 
    brd_cd as "브랜드",
    sesn as "시즌",
    part_cd as "스타일",
    vtext2 as "중분류",
    item_nm as "아이템명",
    po_no as "PO",
    tag_price as "TAG",
    po_qty_sum as "수량",
    cost_quotation_no as "원가견적번호",
    currency as "발주통화",
    mfac_compy_nm as "제조업체",
    quotation_submit_dt as "견적서제출일자",
    -- ===== USD 단위 금액 =====
    sum(case when type1 = 100 then mfac_offer_cost_amt_curr else 0 end) as "(USD)_원자재",
    sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end) as "(USD)_아트웍",
    sum(case when type1 = 300 then mfac_offer_cost_amt_curr else 0 end) as "(USD)_부자재",
    sum(case when type1 = 350 then mfac_offer_cost_amt_curr else 0 end) as "(USD)_택/라벨",
    sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end) as "(USD)_공임",
    sum(case when type1 = 700 then mfac_offer_cost_amt_curr else 0 end) as "(USD)_본사공급자재",
    -- 마진/경비(USD) 세부 분리
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "(USD)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "(USD)_기타마진/경비",
    -- ===== KRW 단위 금액 =====
    sum(case when type1 = 100 then mfac_nego_cost_amt else 0 end) as "(KRW)_원자재",
    sum(case when type1 = 200 then mfac_nego_cost_amt else 0 end) as "(KRW)_아트웍",
    sum(case when type1 = 300 then mfac_nego_cost_amt else 0 end) as "(KRW)_부자재",
    sum(case when type1 = 350 then mfac_nego_cost_amt else 0 end) as "(KRW)_택/라벨",
    sum(case when type1 = 400 then mfac_nego_cost_amt else 0 end) as "(KRW)_공임",
    sum(case when type1 = 700 then mfac_nego_cost_amt else 0 end) as "(KRW)_본사공급자재",
    -- 마진/경비(KRW) 세부 분리
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_nego_cost_amt else 0 end) as "(KRW)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_nego_cost_amt else 0 end) as "(KRW)_기타마진/경비"
from main
where brd_cd in ('M', 'I', 'X', 'V', 'ST')  -- M, I, X, V, ST 브랜드만
    and sesn in ('26SS', '26S', '25SS', '25S', '24SS', '24S', '25FW', '25F', '24FW', '24F')  -- 26SS, 25SS, 25FW 기간 포함
group by 
    brd_cd, sesn, part_cd, vtext2, item_nm, po_no, tag_price, 
    po_qty_sum, cost_quotation_no, currency, mfac_compy_nm, quotation_submit_dt
order by brd_cd, sesn desc, part_cd, po_no
"""

# ============================================
# 출력 설정
# ============================================
OUTPUT_DIR = 'public/COST RAW'
FX_FILE = 'public/COST RAW/FX.csv'

# ============================================
# 카테고리 → 의류/슈즈/용품 매핑
# ============================================
def map_category_to_fx_category(category: str) -> str:
    """중분류 카테고리를 의류/슈즈/용품으로 매핑"""
    if pd.isna(category) or category == '':
        return '의류'
    
    category_upper = str(category).strip().upper()
    
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
# 시즌 형식 변환 (25FW → 25F)
# ============================================
def convert_season_format(sesn: str) -> str:
    """SQL의 시즌 형식(25FW)을 FX.csv의 시즌 형식(25F)으로 변환"""
    if pd.isna(sesn) or sesn == '':
        return ''
    
    sesn_str = str(sesn).strip()
    
    # FW로 끝나면 F로 변환 (25FW → 25F)
    if sesn_str.upper().endswith('FW'):
        return sesn_str[:-1]  # 마지막 W 제거
    
    # SS로 끝나면 S로 변환 (25SS → 25S)
    if sesn_str.upper().endswith('SS'):
        return sesn_str[:-1]  # 마지막 S 제거
    
    # 이미 F나 S로 끝나면 그대로 반환
    if sesn_str.upper().endswith(('F', 'S')):
        return sesn_str
    
    return sesn_str

# ============================================
# FX.csv 환율 로드
# ============================================
def load_fx_dataframe() -> Optional[pd.DataFrame]:
    """FX.csv 파일을 DataFrame으로 로드"""
    if not os.path.exists(FX_FILE):
        print(f"[ERROR] {FX_FILE} 파일이 없습니다.")
        return None
    
    try:
        df_fx = pd.read_csv(FX_FILE, encoding='utf-8-sig')
        print(f"[OK] FX 파일 로드 완료: {len(df_fx)}개 행")
        return df_fx
    except Exception as e:
        print(f"[ERROR] FX 파일 로드 실패: {e}")
        return None

def get_exchange_rate(
    df_fx: pd.DataFrame,
    brand_code: str,
    season_code: str,
    category: str = None
) -> float:
    """
    FX.csv에서 특정 브랜드/시즌/카테고리의 환율 조회
    
    Args:
        df_fx: FX.csv DataFrame
        brand_code: 브랜드 코드 (M, I, X, V, ST)
        season_code: 시즌 코드 (25F, 24S 등)
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
                print(f"[INFO] 카테고리 '{category}'에 대한 환율을 찾지 못해 의류 환율 사용: {rate}")
                return rate
    
    # 최종 기본값
    print(f"[WARN] 환율을 찾을 수 없습니다. 브랜드={brand_code}, 시즌={season_code}, 카테고리={fx_category}. 기본값 1300.0 사용")
    return 1300.0

# ============================================
# 환율 변환 로직
# ============================================
def process_currency_conversion(
    df: pd.DataFrame,
    df_fx: pd.DataFrame
) -> pd.DataFrame:
    """
    발주통화에 따라 환율 변환 처리
    
    - 발주통화가 KRW인 경우: (USD)_컬럼들을 (KRW)_컬럼 / 환율로 변환
    - 발주통화가 USD인 경우: 그대로 사용
    - 브랜드 M 특수 처리: (KRW)_본사공급자재를 환율로 나눠서 (USD)_본사공급자재에 추가
    """
    df_result = df.copy()
    
    # USD 컬럼 목록
    usd_columns = [
        '(USD)_원자재',
        '(USD)_아트웍',
        '(USD)_부자재',
        '(USD)_택/라벨',
        '(USD)_공임',
        '(USD)_본사공급자재',
        '(USD)_정상마진',
        '(USD)_기타마진/경비'
    ]
    
    # KRW 컬럼 목록
    krw_columns = [
        '(KRW)_원자재',
        '(KRW)_아트웍',
        '(KRW)_부자재',
        '(KRW)_택/라벨',
        '(KRW)_공임',
        '(KRW)_본사공급자재',
        '(KRW)_정상마진',
        '(KRW)_기타마진/경비'
    ]
    
    print("\n[INFO] 환율 변환 처리 시작...")
    
    # 각 행에 대해 환율 변환 처리
    for idx, row in df_result.iterrows():
        brand_code = str(row['브랜드']).strip()
        sesn = str(row['시즌']).strip()
        currency = str(row['발주통화']).strip().upper()
        category = row['중분류'] if '중분류' in row else None
        
        # 시즌 형식 변환
        season_code = convert_season_format(sesn)
        
        # 환율 조회
        fx_rate = get_exchange_rate(df_fx, brand_code, season_code, category)
        
        # 발주통화가 KRW 또는 USD인 경우 모두 KRW 컬럼 / 환율로 USD 컬럼 계산
        if currency == 'KRW' or currency == 'USD':
            # 각 USD 컬럼을 KRW 컬럼 / 환율로 변환
            for usd_col, krw_col in zip(usd_columns, krw_columns):
                if usd_col in df_result.columns and krw_col in df_result.columns:
                    krw_value = pd.to_numeric(row[krw_col], errors='coerce')
                    if pd.notna(krw_value) and krw_value != 0:
                        usd_value = krw_value / fx_rate
                        df_result.at[idx, usd_col] = usd_value
        
        # 브랜드 M 특수 처리: (KRW)_본사공급자재를 환율로 나눠서 (USD)_본사공급자재에 추가
        if brand_code == 'M' and '(KRW)_본사공급자재' in df_result.columns:
            krw_supply = pd.to_numeric(row['(KRW)_본사공급자재'], errors='coerce')
            if pd.notna(krw_supply) and krw_supply != 0:
                usd_supply_from_krw = krw_supply / fx_rate
                # 기존 (USD)_본사공급자재에 추가
                if '(USD)_본사공급자재' in df_result.columns:
                    existing_usd = pd.to_numeric(row['(USD)_본사공급자재'], errors='coerce')
                    if pd.isna(existing_usd):
                        existing_usd = 0
                    df_result.at[idx, '(USD)_본사공급자재'] = existing_usd + usd_supply_from_krw
    
    print("[OK] 환율 변환 처리 완료")
    return df_result

# ============================================
# Snowflake 연결
# ============================================
def connect_to_database():
    """Snowflake에 연결"""
    try:
        conn = snowflake.connector.connect(
            account=SNOWFLAKE_CONFIG['account'],
            user=SNOWFLAKE_CONFIG['username'],
            password=SNOWFLAKE_CONFIG['password'],
            warehouse=SNOWFLAKE_CONFIG['warehouse'],
            database=SNOWFLAKE_CONFIG['database'],
            schema=SNOWFLAKE_CONFIG['schema']
            # role은 선택사항, 필요시 추가
        )
        print(f"[OK] Snowflake 연결 성공: {SNOWFLAKE_CONFIG['database']}.{SNOWFLAKE_CONFIG['schema']}")
        return conn
    except Exception as e:
        print(f"[ERROR] Snowflake 연결 실패: {e}")
        print("\n[INFO] snowflake-connector-python 설치 필요: pip install snowflake-connector-python")
        return None

# ============================================
# SQL 쿼리 실행
# ============================================
def execute_query(conn, query: str) -> Optional[pd.DataFrame]:
    """SQL 쿼리 실행 및 결과를 DataFrame으로 반환"""
    try:
        print("\n[INFO] SQL 쿼리 실행 중...")
        cursor = conn.cursor()
        cursor.execute(query)
        
        # 컬럼명 가져오기
        columns = [desc[0] for desc in cursor.description]
        
        # 데이터 가져오기
        rows = cursor.fetchall()
        
        # DataFrame 생성
        df = pd.DataFrame(rows, columns=columns)
        cursor.close()
        
        print(f"[OK] {len(df)}개 행 추출 완료")
        return df
    except Exception as e:
        print(f"[ERROR] 쿼리 실행 실패: {e}")
        import traceback
        traceback.print_exc()
        return None

# ============================================
# 전년 시즌 계산
# ============================================
def get_previous_season(season: str) -> str:
    """
    전년 시즌 계산
    예: 25F → 24F, 24S → 23S, 26F → 25F
    """
    if pd.isna(season) or season == '':
        return ''
    
    season_str = str(season).strip()
    
    # 시즌 형식 파싱 (예: 25F, 24S, 25FW, 24SS)
    if season_str.upper().endswith('FW'):
        year = int(season_str[:-2])
        return f"{year-1}F"
    elif season_str.upper().endswith('SS'):
        year = int(season_str[:-2])
        return f"{year-1}S"
    elif season_str.upper().endswith('F'):
        year = int(season_str[:-1])
        return f"{year-1}F"
    elif season_str.upper().endswith('S'):
        year = int(season_str[:-1])
        return f"{year-1}S"
    
    return ''

# ============================================
# 최신 시즌 감지
# ============================================
def get_latest_season(seasons) -> str:
    """
    시즌 리스트에서 최신 시즌 반환
    예: ['26S', '25S'] → '26S'
        ['25F', '24F'] → '25F'
        ['26SS', '25SS'] → '26SS'
    
    Args:
        seasons: pandas Series 또는 numpy array 또는 list
    """
    # pandas Series 또는 numpy array를 list로 변환
    if hasattr(seasons, 'tolist'):
        seasons = seasons.tolist()
    
    if not seasons or len(seasons) == 0:
        return ''
    
    # 시즌 정규화 함수
    def normalize_and_rank(season):
        """시즌을 정규화하고 비교 가능한 값으로 변환"""
        if pd.isna(season) or season == '':
            return (0, 0)  # 최하위
        
        season_str = str(season).strip().upper()
        
        # 연도와 시즌 타입 추출
        if season_str.endswith('FW'):
            year = int(season_str[:-2])
            season_type = 1  # F/FW
        elif season_str.endswith('SS'):
            year = int(season_str[:-2])
            season_type = 0  # S/SS
        elif season_str.endswith('F'):
            year = int(season_str[:-1])
            season_type = 1  # F/FW
        elif season_str.endswith('S'):
            year = int(season_str[:-1])
            season_type = 0  # S/SS
        else:
            return (0, 0)
        
        # 정렬 키: (연도, 시즌타입)
        # 26S < 26F < 27S 순서
        return (year, season_type)
    
    # 모든 시즌을 정규화하고 최댓값 찾기
    valid_seasons = [s for s in seasons if not pd.isna(s) and s != '']
    if not valid_seasons:
        return ''
    
    latest = max(valid_seasons, key=normalize_and_rank)
    return str(latest).strip()

# ============================================
# MLB FW 형식으로 데이터 변환
# ============================================
def format_data_like_mlb_fw(df: pd.DataFrame, df_fx: pd.DataFrame) -> pd.DataFrame:
    """
    MLB FW.csv 형식에 맞게 데이터 변환
    - TAG_총금액 추가 (TAG × 수량)
    - TAG_USD금액(전년환율) 추가 (TAG_총금액 / 전년 환율)
    - 각 항목별 총금액 컬럼 추가 (단가 × 수량)
    """
    df_result = df.copy()
    
    # 수량과 TAG를 숫자로 변환
    df_result['수량'] = pd.to_numeric(df_result['수량'], errors='coerce').fillna(0)
    df_result['TAG'] = pd.to_numeric(df_result['TAG'], errors='coerce').fillna(0)
    
    # 1. TAG_총금액 계산 (TAG × 수량)
    df_result['TAG_총금액'] = df_result['TAG'] * df_result['수량']
    
    # 2. TAG_USD금액 계산 (분석기간 기준 환율 사용)
    # 데이터의 최신 시즌을 분석 기간으로 간주하고, 분석기간-1년 환율을 모든 행에 적용
    df_result['TAG_USD금액(전년환율)'] = 0.0  # 초기화
    
    # 2-1. 데이터에서 최신 시즌 감지 (분석 기간)
    seasons = df_result['시즌'].unique()
    current_period = get_latest_season(seasons)
    
    if not current_period:
        print("[WARN] 시즌 정보를 찾을 수 없습니다. TAG_USD금액 계산을 건너뜁니다.")
    else:
        # 2-2. 기준 환율 시즌 계산 (분석기간 - 1년)
        ref_fx_season = get_previous_season(current_period)
        ref_fx_season_code = convert_season_format(ref_fx_season) if ref_fx_season else current_period
        
        print(f"\n[INFO] TAG_USD금액 계산 중...")
        print(f"[INFO] 분석기간: {current_period}, 기준환율시즌: {ref_fx_season_code}")
        print(f"[INFO] 모든 행(당년/전년)에 대해 {ref_fx_season_code} 환율 적용")
        
        # 2-3. 모든 행에 동일한 기준 환율 시즌 적용 (카테고리별로 조회)
        for idx, row in df_result.iterrows():
            brand_code = str(row['브랜드']).strip()
            category = row['중분류'] if '중분류' in row else None
            
            # 모든 행이 동일한 기준 환율 시즌 사용
            # 카테고리에 따라 의류/슈즈/용품 환율이 다르게 조회됨
            fx_rate = get_exchange_rate(df_fx, brand_code, ref_fx_season_code, category)
            
            # TAG_USD금액 계산 (TAG_총금액 / 기준 환율)
            tag_total = pd.to_numeric(row['TAG_총금액'], errors='coerce')
            if pd.notna(tag_total) and fx_rate > 0:
                df_result.at[idx, 'TAG_USD금액(전년환율)'] = tag_total / fx_rate
        
        print("[OK] TAG_USD금액 계산 완료")
    
    # 3. 컬럼명 수정 (MLB FW 형식에 맞게)
    # "TAG_USD금액(24F환율)" → "TAG_USD금액(전년환율)" (기존 파일 호환성)
    if 'TAG_USD금액(24F환율)' in df_result.columns:
        df_result = df_result.rename(columns={'TAG_USD금액(24F환율)': 'TAG_USD금액(전년환율)'})
    
    # "(USD)_공임" → "(USD) 공임"
    if '(USD)_공임' in df_result.columns:
        df_result = df_result.rename(columns={'(USD)_공임': '(USD) 공임'})
    
    # "(USD)_본사공급자재" → "(USD)본사공급자재"
    if '(USD)_본사공급자재' in df_result.columns:
        df_result = df_result.rename(columns={'(USD)_본사공급자재': '(USD)본사공급자재'})
    
    # "(USD)_기타마진/경비" → "(USD)_경비"
    if '(USD)_기타마진/경비' in df_result.columns:
        df_result = df_result.rename(columns={'(USD)_기타마진/경비': '(USD)_경비'})
    
    # "(KRW)_공임" → "(KRW)_공임" (그대로)
    # "(KRW)_본사공급자재" → "(KRW)본사공급자재"
    if '(KRW)_본사공급자재' in df_result.columns:
        df_result = df_result.rename(columns={'(KRW)_본사공급자재': '(KRW)본사공급자재'})
    
    # "(KRW)_기타마진/경비" → "(KRW)_경비"
    if '(KRW)_기타마진/경비' in df_result.columns:
        df_result = df_result.rename(columns={'(KRW)_기타마진/경비': '(KRW)_경비'})
    
    # 4. USD 총금액 컬럼 계산 (단가 × 수량)
    usd_cols = {
        '재료계': ['(USD)_원자재', '(USD)_부자재', '(USD)_택/라벨', '(USD)본사공급자재'],
        '아트웍': ['(USD)_아트웍'],
        '공임': ['(USD) 공임'],
        '정상마진': ['(USD)_정상마진'],
        '경비': ['(USD)_경비']
    }
    
    for key, cols in usd_cols.items():
        total = 0
        for col in cols:
            if col in df_result.columns:
                df_result[col] = pd.to_numeric(df_result[col], errors='coerce').fillna(0)
                total += df_result[col] * df_result['수량']
        
        if key == '재료계':
            df_result['USD_재료계(원/부/택/본공)_총금액(단가×수량)'] = total
        elif key == '아트웍':
            df_result['USD_아트웍_총금액(단가×수량)'] = total
        elif key == '공임':
            df_result['USD_공임_총금액(단가×수량)'] = total
        elif key == '정상마진':
            df_result['USD_정상마진_총금액(단가×수량)'] = total
        elif key == '경비':
            df_result['USD_경비_총금액(단가×수량)'] = total
    
    # 5. KRW 총금액 컬럼 계산 (단가 × 수량)
    krw_cols = {
        '재료계': ['(KRW)_원자재', '(KRW)_부자재', '(KRW)_택/라벨', '(KRW)본사공급자재'],
        '아트웍': ['(KRW)_아트웍'],
        '공임': ['(KRW)_공임'],
        '정상마진': ['(KRW)_정상마진'],
        '경비': ['(KRW)_경비']
    }
    
    for key, cols in krw_cols.items():
        total = 0
        for col in cols:
            if col in df_result.columns:
                df_result[col] = pd.to_numeric(df_result[col], errors='coerce').fillna(0)
                total += df_result[col] * df_result['수량']
        
        if key == '재료계':
            df_result['KRW_재료계(원/부/택/본공)_총금액(단가×수량)'] = total
        elif key == '아트웍':
            df_result['KRW_아트웍_총금액(단가×수량)'] = total
        elif key == '공임':
            df_result['KRW_공임_총금액(단가×수량)'] = total
        elif key == '정상마진':
            df_result['KRW_정상마진_총금액(단가×수량)'] = total
        elif key == '경비':
            df_result['KRW_경비_총금액(단가×수량)'] = total
    
    # 6. 컬럼 순서를 MLB FW 형식에 맞게 재정렬
    column_order = [
        '브랜드', '시즌', '스타일', '중분류', '아이템명', 'PO', 'TAG', '수량',
        'TAG_총금액', 'TAG_USD금액(전년환율)',
        '원가견적번호', '발주통화', '제조업체', '견적서제출일자',
        '(USD)_원자재', '(USD)_아트웍', '(USD)_부자재', '(USD)_택/라벨', 
        '(USD) 공임', '(USD)본사공급자재', '(USD)_정상마진', '(USD)_경비',
        '(KRW)_원자재', '(KRW)_아트웍', '(KRW)_부자재', '(KRW)_택/라벨',
        '(KRW)_공임', '(KRW)본사공급자재', '(KRW)_정상마진', '(KRW)_경비',
        'USD_재료계(원/부/택/본공)_총금액(단가×수량)', 'USD_아트웍_총금액(단가×수량)',
        'USD_공임_총금액(단가×수량)', 'USD_정상마진_총금액(단가×수량)', 'USD_경비_총금액(단가×수량)',
        'KRW_재료계(원/부/택/본공)_총금액(단가×수량)', 'KRW_아트웍_총금액(단가×수량)',
        'KRW_공임_총금액(단가×수량)', 'KRW_정상마진_총금액(단가×수량)', 'KRW_경비_총금액(단가×수량)'
    ]
    
    # 존재하는 컬럼만 선택
    existing_columns = [col for col in column_order if col in df_result.columns]
    # 존재하지 않는 컬럼도 포함 (혹시 모를 경우)
    other_columns = [col for col in df_result.columns if col not in column_order]
    
    df_result = df_result[existing_columns + other_columns]
    
    return df_result

# ============================================
# CSV 파일 저장 (브랜드별로 분리, 전년 시즌 포함)
# ============================================
def recalculate_tag_usd(df: pd.DataFrame, df_fx: pd.DataFrame, analysis_season: str) -> pd.DataFrame:
    """
    분석기간에 맞는 전년 환율로 TAG_USD금액(전년환율) 재계산
    
    Args:
        df: 데이터프레임
        df_fx: 환율 데이터프레임
        analysis_season: 분석기간 (예: '26S', '25S', '26F', '25F')
    
    Returns:
        TAG_USD금액이 재계산된 데이터프레임
    """
    if df_fx is None or df_fx.empty:
        return df
    
    # 분석기간의 전년 환율 시즌 계산
    ref_fx_season = get_previous_season(analysis_season)
    ref_fx_season_code = convert_season_format(ref_fx_season) if ref_fx_season else analysis_season
    
    print(f"  [FX] 분석기간: {analysis_season}, 적용환율: {ref_fx_season_code}")
    
    # TAG_USD금액(전년환율) 재계산
    for idx, row in df.iterrows():
        brand_code = str(row['브랜드']).strip()
        category = row['중분류'] if '중분류' in row else None
        
        fx_rate = get_exchange_rate(df_fx, brand_code, ref_fx_season_code, category)
        
        tag_total = pd.to_numeric(row['TAG_총금액'], errors='coerce')
        if pd.notna(tag_total) and fx_rate > 0:
            df.at[idx, 'TAG_USD금액(전년환율)'] = tag_total / fx_rate
    
    return df

def save_csv_by_brand_season(df: pd.DataFrame, df_fx: pd.DataFrame = None):
    """
    브랜드와 시즌별로 CSV 파일 저장
    각 파일에는 해당 시즌과 전년 시즌 데이터가 모두 포함됨
    파일명 형식: {브랜드코드}_{시즌}.csv
    예: M_25F.csv → 25F와 24F 데이터 포함
    
    중요: 각 분석기간별로 올바른 전년 환율 적용
    - 26S 파일 → 25S 환율
    - 25S 파일 → 24S 환율
    - 26F 파일 → 25F 환율
    - 25F 파일 → 24F 환율
    """
    if df is None or df.empty:
        print("[WARN] 저장할 데이터가 없습니다.")
        return
    
    # 출력 디렉토리 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 브랜드별로 그룹화
    brand_groups = df.groupby('브랜드')
    
    saved_files = []
    
    for brand, brand_df in brand_groups:
        # 해당 브랜드의 고유 시즌 목록
        unique_seasons = sorted(brand_df['시즌'].unique(), reverse=True)
        
        for season in unique_seasons:
            # 전년 시즌 계산
            prev_season = get_previous_season(season)
            
            # 현재 시즌 데이터
            current_season_df = brand_df[brand_df['시즌'] == season].copy()
            
            # 시즌 코드 정규화 (파일명용: SS/S, FW/F는 동일하므로 항상 S/F 형식으로 통일)
            normalized_season = season
            if season in ['26SS', '26S']:
                normalized_season = '26S'  # 26SS → 26S로 통일
            elif season in ['25SS', '25S']:
                normalized_season = '25S'  # 25SS → 25S로 통일
            elif season in ['24SS', '24S']:
                normalized_season = '24S'  # 24SS → 24S로 통일
            elif season in ['26FW', '26F']:
                normalized_season = '26F'  # 26FW → 26F로 통일
            elif season in ['25FW', '25F']:
                normalized_season = '25F'  # 25FW → 25F로 통일
            elif season in ['24FW', '24F']:
                normalized_season = '24F'  # 24FW → 24F로 통일
            # 이미 S/F 형식이면 그대로 사용
            
            # 전년 시즌 데이터 (있는 경우)
            if prev_season:
                prev_season_df = brand_df[brand_df['시즌'] == prev_season].copy()
                # 두 시즌 데이터 합치기
                combined_df = pd.concat([current_season_df, prev_season_df], ignore_index=True)
                print(f"[INFO] {brand}_{normalized_season}.csv: {season} ({len(current_season_df)}행) + {prev_season} ({len(prev_season_df)}행) = 총 {len(combined_df)}행")
            else:
                combined_df = current_season_df
                print(f"[INFO] {brand}_{normalized_season}.csv: {season} ({len(combined_df)}행) (전년 시즌 없음)")
            
            # ★ 핵심: 해당 분석기간에 맞는 전년 환율로 TAG_USD금액 재계산
            if df_fx is not None and not df_fx.empty:
                combined_df = recalculate_tag_usd(combined_df, df_fx, normalized_season)
            
            # X 브랜드인 경우 DISCOVERY와 DISCOVERY KIDS 분리
            if brand == 'X':
                # 스타일 컬럼을 대문자로 변환하여 확인
                combined_df['스타일_upper'] = combined_df['스타일'].astype(str).str.upper().str.strip()
                
                # DISCOVERY (DK로 시작하지 않는 것)
                df_discovery = combined_df[~combined_df['스타일_upper'].str.startswith('DK', na=False)].copy()
                df_discovery = df_discovery.drop(columns=['스타일_upper'])
                
                # DISCOVERY KIDS (DK로 시작하는 것)
                df_kids = combined_df[combined_df['스타일_upper'].str.startswith('DK', na=False)].copy()
                df_kids = df_kids.drop(columns=['스타일_upper'])
                
                # 시즌 폴더 결정
                if season in ['26SS', '26S', '25SS', '25S', '24SS', '24S', '26FW', '26F', '25FW', '25F']:
                    if season in ['26SS', '26S']:
                        season_folder = '26SS'
                    elif season in ['25SS', '25S']:
                        season_folder = '25S'
                    elif season in ['24SS', '24S']:
                        season_folder = '24S'
                    elif season in ['26FW', '26F']:
                        season_folder = '26FW'
                    elif season in ['25FW', '25F']:
                        season_folder = '25FW'
                    else:
                        season_folder = season
                    
                    season_dir = os.path.join(OUTPUT_DIR, season_folder)
                    os.makedirs(season_dir, exist_ok=True)
                else:
                    season_dir = OUTPUT_DIR
                    os.makedirs(season_dir, exist_ok=True)
                
                # DISCOVERY 파일 저장
                filename_discovery = f"X_{normalized_season}.csv"
                filepath_discovery = os.path.join(season_dir, filename_discovery)
                df_discovery.to_csv(filepath_discovery, index=False, encoding='utf-8-sig', lineterminator='\n')
                saved_files.append(filepath_discovery)
                print(f"[OK] {filename_discovery} 저장 완료 (DISCOVERY, DK 제외: {len(df_discovery)}개 행)")
                
                # DISCOVERY KIDS 파일 저장 (데이터가 있는 경우만)
                if len(df_kids) > 0:
                    filename_kids = f"X_{normalized_season}_kids.csv"
                    filepath_kids = os.path.join(season_dir, filename_kids)
                    df_kids.to_csv(filepath_kids, index=False, encoding='utf-8-sig', lineterminator='\n')
                    saved_files.append(filepath_kids)
                    print(f"[OK] {filename_kids} 저장 완료 (DISCOVERY KIDS, DK만: {len(df_kids)}개 행)")
                else:
                    print(f"[INFO] DISCOVERY KIDS 데이터 없음 (DK로 시작하는 스타일 없음)")
            else:
                # 다른 브랜드는 기존 방식대로
                filename = f"{brand}_{normalized_season}.csv"
                
                # 시즌별 폴더에 저장
                if season in ['26SS', '26S', '25SS', '25S', '24SS', '24S', '26FW', '26F', '25FW', '25F']:
                    if season in ['26SS', '26S']:
                        season_folder = '26SS'
                    elif season in ['25SS', '25S']:
                        season_folder = '25S'
                    elif season in ['24SS', '24S']:
                        season_folder = '24S'
                    elif season in ['26FW', '26F']:
                        season_folder = '26FW'
                    elif season in ['25FW', '25F']:
                        season_folder = '25FW'
                    else:
                        season_folder = season
                    
                    season_dir = os.path.join(OUTPUT_DIR, season_folder)
                    os.makedirs(season_dir, exist_ok=True)
                    filepath = os.path.join(season_dir, filename)
                else:
                    filepath = os.path.join(OUTPUT_DIR, filename)
                
                # UTF-8 BOM 인코딩으로 저장 (Excel 호환성)
                combined_df.to_csv(filepath, index=False, encoding='utf-8-sig', lineterminator='\n')
                saved_files.append(filepath)
                print(f"[OK] {filename} 저장 완료 ({len(combined_df)}개 행)")
    
    print("\n" + "=" * 60)
    print(f"[완료] 총 {len(saved_files)}개 파일 생성 완료!")
    for filepath in saved_files:
        print(f"  - {filepath}")
    print("=" * 60)

# ============================================
# 메인 함수
# ============================================
def main():
    """메인 실행 함수"""
    print("SQL 데이터 연결 및 환율 변환 스크립트")
    print("=" * 60)
    
    # 1. 데이터베이스 연결
    conn = connect_to_database()
    if not conn:
        print("\n[ERROR] 데이터베이스 연결 실패. 스크립트를 종료합니다.")
        return
    
    # 2. FX 파일 로드
    df_fx = load_fx_dataframe()
    if df_fx is None:
        print("\n[WARN] FX 파일을 로드할 수 없습니다. 환율 변환 없이 진행합니다.")
        df_fx = pd.DataFrame()
    
    try:
        # 3. SQL 쿼리 실행
        df = execute_query(conn, SQL_QUERY)
        if df is None or df.empty:
            print("\n[WARN] 추출된 데이터가 없습니다.")
            return
        
        # 4. 환율 변환 처리
        if not df_fx.empty:
            df = process_currency_conversion(df, df_fx)
        else:
            print("[WARN] FX 파일이 없어 환율 변환을 건너뜁니다.")
        
        # 5. MLB FW 형식으로 데이터 변환
        if not df_fx.empty:
            df = format_data_like_mlb_fw(df, df_fx)
        else:
            print("[WARN] FX 파일이 없어 MLB FW 형식 변환을 건너뜁니다.")
        
        # 6. CSV 파일 저장 (브랜드_시즌 형식, 각 분석기간별 전년 환율 적용)
        save_csv_by_brand_season(df, df_fx)
        
        print("\n[OK] 모든 작업이 완료되었습니다!")
        
    except Exception as e:
        print(f"\n[ERROR] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 연결 종료
        if conn:
            conn.close()
            print("\n[INFO] Snowflake 연결 종료")

if __name__ == '__main__':
    main()

