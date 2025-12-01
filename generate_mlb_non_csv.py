#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MLB Non 시즌 데이터 추출 및 CSV 생성 스크립트

사용 방법:
    python generate_mlb_non_csv.py --season 25FW

기능:
- Snowflake에서 MLB Non 시즌 데이터 추출 (브랜드: M, I, X)
- 전년/당년 기간 자동 계산
- 환율 계산 및 적용
- 브랜드별 CSV 파일 생성
"""

import pandas as pd
import snowflake.connector
import os
import argparse
from datetime import datetime, date
from typing import Optional, Dict, Tuple

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
    'role': 'PUBLIC'
}

# ============================================
# 기간 계산 함수
# ============================================
def calculate_periods(season: str) -> Tuple[date, date, date, date]:
    """
    시즌에 따른 전년/당년 기간 계산
    
    Args:
        season: 시즌 코드 (예: '25FW', '26SS')
    
    Returns:
        (prev_start, prev_end, curr_start, curr_end) 튜플
    """
    # 시즌 파싱
    season_upper = season.upper()
    
    if 'FW' in season_upper or (season_upper.endswith('F') and len(season) == 3):
        # FW: 6/1 ~ 11/30
        year_2digit = int(season[:2])
        # 2자리 연도를 4자리로 변환 (25 -> 2025)
        year = 2000 + year_2digit
        prev_year = year - 1
        curr_year = year
        
        prev_start = date(prev_year, 6, 1)
        prev_end = date(prev_year, 11, 30)
        curr_start = date(curr_year, 6, 1)
        
        # 현재 날짜 확인
        today = date.today()
        if today > date(curr_year, 11, 30):
            curr_end = date(curr_year, 11, 30)
        else:
            curr_end = today
            
    elif 'SS' in season_upper or (season_upper.endswith('S') and len(season) == 3):
        # SS: 12/1 ~ 다음해 5/31
        # 예: 25S 당년 = 2024-12-01 ~ 2025-05-31, 전년 = 2023-12-01 ~ 2024-05-31
        year_2digit = int(season[:2])
        # 2자리 연도를 4자리로 변환 (25 -> 2025)
        year = 2000 + year_2digit
        
        # 당년: (year-1)년 12/1 ~ year년 5/31
        curr_start = date(year - 1, 12, 1)
        curr_end_year = year
        
        # 전년: (year-2)년 12/1 ~ (year-1)년 5/31
        prev_start = date(year - 2, 12, 1)
        prev_end = date(year - 1, 5, 31)
        
        # 현재 날짜 확인
        today = date.today()
        if today > date(curr_end_year, 5, 31):
            curr_end = date(curr_end_year, 5, 31)
        else:
            curr_end = today
    else:
        raise ValueError(f"지원하지 않는 시즌 형식: {season}")
    
    return prev_start, prev_end, curr_start, curr_end


def build_sql_query(prev_start: date, prev_end: date, curr_start: date, curr_end: date) -> str:
    """
    SQL 쿼리 생성 (사용자 제공 쿼리 기반)
    """
    # 날짜를 문자열로 변환 (YYYY-MM-DD 형식)
    prev_start_str = prev_start.strftime('%Y-%m-%d')
    prev_end_str = prev_end.strftime('%Y-%m-%d')
    curr_start_str = curr_start.strftime('%Y-%m-%d')
    curr_end_str = curr_end.strftime('%Y-%m-%d')
    
    query = f"""
with 
-- A) 전년/당년 기간 필터 + 기간 라벨링
stor_filtered as (
    select 
        po_no,
        stor_dt,
        qty,
        case 
            when stor_dt between date '{prev_start_str}' and date '{prev_end_str}' then '전년'
            when stor_dt between date '{curr_start_str}' and date '{curr_end_str}' then '당년'
        end as period_label
    from prcs.dw_stor
    where (stor_dt between date '{prev_start_str}' and date '{prev_end_str}')
       or (stor_dt between date '{curr_start_str}' and date '{curr_end_str}')
),
-- B) 기간 내 PO만 (중복 방지용)
stor_po as (
    select distinct po_no, period_label
    from stor_filtered
),
-- C) 기간별 PO 집계: 입고수량 합계 + 최초/최종 입고일
stor_sum as (
    select 
        po_no,
        period_label,
        sum(qty) as stor_qty_sum,
        min(stor_dt) as first_stor_dt,
        max(stor_dt) as last_stor_dt
    from stor_filtered
    group by po_no, period_label
),
main as (
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
        o2.po_qty_sum as po_qty_sum,
        sp.period_label as period_label,
        ss.stor_qty_sum as stor_qty_sum,
        ss.first_stor_dt as first_stor_dt,
        ss.last_stor_dt as last_stor_dt
    from prcs.db_cost_mst a
    join prcs.db_cost_dtl b on a.po_no = b.po_no 
        and a.quotation_seq = b.quotation_seq 
        and a.quotation_apv_stat_nm = '확정'
    inner join stor_po sp on sp.po_no = a.po_no
    left join stor_sum ss on ss.po_no = a.po_no and ss.period_label = sp.period_label
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
    where a.sesn like '%N%'
      and a.brd_cd in ('M', 'I', 'X')
      and b.currency in ('USD', 'KRW')
)
select 
    period_label as "기간",
    brd_cd as "브랜드",
    sesn as "시즌",
    part_cd as "스타일",
    vtext2 as "중분류",
    item_nm as "아이템명",
    po_no as "PO",
    tag_price as "TAG",
    po_qty_sum as "발주수량",
    stor_qty_sum as "입고수량",
    first_stor_dt as "최초입고일",
    last_stor_dt as "최종입고일",
    cost_quotation_no as "원가견적번호",
    currency as "발주통화",
    mfac_compy_nm as "제조업체",
    quotation_submit_dt as "견적서제출일자",
    -- USD 금액 (기존)
    sum(case when type1 = 100 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_원자재",
    sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_아트웍",
    sum(case when type1 = 300 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_부자재",
    sum(case when type1 = 350 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_택/라벨",
    sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_공임",
    sum(case when type1 = 700 then mfac_offer_cost_amt_curr else 0 end) as "(USD)본사공급자재",
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_기타마진/경비",
    -- KRW 금액(기존)
    sum(case when type1 = 100 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_원자재",
    sum(case when type1 = 200 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_아트웍",
    sum(case when type1 = 300 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_부자재",
    sum(case when type1 = 350 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_택/라벨",
    sum(case when type1 = 400 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_공임",
    sum(case when type1 = 700 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_본사공급자재",
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_기타마진/경비",
    -- USD 총금액
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 in (100,300,350,700) then mfac_offer_cost_amt_curr else 0 end),0) as "USD_재료계(원/부/택/본공)_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end),0) as "USD_아트웍_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end),0) as "USD_공임_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end),0) as "USD_정상마진_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and (type2 <> 'AAA' or type2 is null) then mfac_offer_cost_amt_curr else 0 end),0) as "USD_경비_총금액(단가×수량)",
    -- KRW 총금액
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 in (100,300,350,700) then mfac_nego_cost_amt else 0 end),0) as "KRW_재료계(원/부/택/본공)_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 200 then mfac_nego_cost_amt else 0 end),0) as "KRW_아트웍_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 400 then mfac_nego_cost_amt else 0 end),0) as "KRW_공임_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and type2 = 'AAA' then mfac_nego_cost_amt else 0 end),0) as "KRW_정상마진_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and (type2 <> 'AAA' or type2 is null) then mfac_nego_cost_amt else 0 end),0) as "KRW_경비_총금액(단가×수량)"
from main
group by 
    period_label, brd_cd, sesn, part_cd, vtext2, item_nm, po_no, tag_price, 
    po_qty_sum, stor_qty_sum, first_stor_dt, last_stor_dt, 
    cost_quotation_no, currency, mfac_compy_nm, quotation_submit_dt
order by period_label desc, brd_cd, sesn desc, part_cd, po_no
"""
    return query


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
        )
        print(f"[OK] Snowflake 연결 성공: {SNOWFLAKE_CONFIG['database']}.{SNOWFLAKE_CONFIG['schema']}")
        return conn
    except Exception as e:
        print(f"[ERROR] Snowflake 연결 실패: {e}")
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
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
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
# FX.csv 파일 로드
# ============================================
def load_fx_dataframe() -> Optional[pd.DataFrame]:
    """FX.csv 파일을 로드하여 DataFrame으로 반환"""
    fx_file = 'public/COST RAW/FX.csv'
    try:
        if os.path.exists(fx_file):
            df_fx = pd.read_csv(fx_file, encoding='utf-8-sig')
            print(f"[OK] FX.csv 파일 로드 완료: {len(df_fx)}행")
            return df_fx
        else:
            print(f"[WARN] FX.csv 파일을 찾을 수 없습니다: {fx_file}")
            return None
    except Exception as e:
        print(f"[ERROR] FX.csv 파일 로드 실패: {e}")
        return None


# ============================================
# FX_NON.csv 파일에서 전년환율 로드
# ============================================
def load_fx_non_prev_rate(brand: str, season_code: str) -> float:
    """
    FX_NON.csv에서 브랜드/시즌별 전년환율 조회
    
    Args:
        brand: 브랜드 코드 (M, I, X)
        season_code: 시즌 코드 (25F, 25S, 26F, 26S) - 당년 시즌 코드
    
    Returns:
        전년환율 (float), 없으면 0.0
    """
    fx_file = 'public/COST RAW/FX_NON.csv'
    try:
        if not os.path.exists(fx_file):
            return 0.0
        
        df_fx = pd.read_csv(fx_file, encoding='utf-8-sig')
        
        # 전년 환율 조회 (기간='전년', 브랜드, 시즌 매칭)
        mask = (df_fx['브랜드'] == brand) & (df_fx['기간'] == '전년') & (df_fx['시즌'] == season_code)
        matched = df_fx[mask]
        
        if len(matched) > 0:
            rate = float(matched.iloc[0]['환율'])
            return rate
        else:
            return 0.0
    except Exception as e:
        return 0.0


def load_fx_non_rate(brand: str, period: str, season_code: str) -> float:
    """
    FX_NON.csv에서 브랜드/기간/시즌별 환율 조회
    
    Args:
        brand: 브랜드 코드 (M, I, X)
        period: 기간 ('전년' 또는 '당년')
        season_code: 시즌 코드 (25F, 25S, 26F, 26S)
    
    Returns:
        환율 (float), 없으면 0.0
    """
    fx_file = 'public/COST RAW/FX_NON.csv'
    try:
        if not os.path.exists(fx_file):
            return 0.0
        
        df_fx = pd.read_csv(fx_file, encoding='utf-8-sig')
        
        # 환율 조회 (기간, 브랜드, 시즌 매칭)
        mask = (df_fx['브랜드'] == brand) & (df_fx['기간'] == period) & (df_fx['시즌'] == season_code)
        matched = df_fx[mask]
        
        if len(matched) > 0:
            rate = float(matched.iloc[0]['환율'])
            return rate
        else:
            return 0.0
    except Exception as e:
        return 0.0


def get_fx_rate(df_fx: pd.DataFrame, brand: str, season_code: str, category: str = '의류') -> float:
    """FX.csv에서 브랜드/시즌/카테고리 조합으로 환율 조회"""
    if df_fx is None or df_fx.empty:
        return 0.0
    
    try:
        # 브랜드 코드 매핑
        brand_map = {
            'M': 'M',
            'I': 'I',
            'X': 'X'
        }
        brand_code = brand_map.get(brand, brand)
        
        # FX.csv에서 조회
        mask = (
            (df_fx['브랜드'] == brand_code) &
            (df_fx['시즌'] == season_code) &
            (df_fx['카테고리'] == category)
        )
        matched = df_fx[mask]
        
        if len(matched) > 0:
            rate = pd.to_numeric(matched.iloc[0]['환율'], errors='coerce')
            if pd.notna(rate) and rate > 0:
                return float(rate)
        
        return 0.0
    except Exception as e:
        print(f"[ERROR] FX 환율 조회 실패: {e}")
        return 0.0


# ============================================
# 환율 계산
# ============================================
def calculate_exchange_rates(df: pd.DataFrame, season: str = None) -> Dict[str, float]:
    """
    전년/당년 각각 브랜드별로 환율 계산
    USD 발주만 피벗하여 총 금액으로 계산
    USD 원자재 == KRW 원자재인 경우 동적으로 KRW로 간주하여 제외
    """
    # 동적으로 KRW로 취급할 PO 찾기
    # USD 발주 중에서 USD 원자재 == KRW 원자재인 경우
    usd_orders = df[df['발주통화'] == 'USD'].copy()
    krw_treated_pos = []
    
    if len(usd_orders) > 0:
        usd_raw = pd.to_numeric(usd_orders['본사협의단가_금액(USD)_원자재'], errors='coerce')
        krw_raw = pd.to_numeric(usd_orders['본사협의단가_T_금액(KRW)_원자재'], errors='coerce')
        
        # 값이 정확히 같거나 거의 같은 경우 (반올림 오차 고려: 차이 <= 5)
        diff = abs(usd_raw - krw_raw)
        same_value_mask = ((usd_raw == krw_raw) | (diff <= 5.0)) & pd.notna(usd_raw) & pd.notna(krw_raw) & (usd_raw != 0)
        krw_treated_pos = usd_orders[same_value_mask]['PO'].unique().tolist()
        
        print(f"[DEBUG] 동적으로 KRW로 취급할 PO: {len(krw_treated_pos)}개")
        if len(krw_treated_pos) > 0:
            print(f"[DEBUG] PO 목록 (처음 10개): {krw_treated_pos[:10]}")
    
    exchange_rates = {}
    
    # FX.csv 파일 로드 (I, X 브랜드용)
    df_fx = load_fx_dataframe()
    
    # 시즌 코드 변환 함수
    def convert_season_code(season: str, period: str) -> str:
        """시즌 코드를 FX.csv 형식으로 변환"""
        if not season:
            return None
        
        season_upper = season.upper()
        if 'FW' in season_upper or (season_upper.endswith('F') and len(season) == 3):
            # FW 시즌
            year_2digit = int(season[:2])
            if period == '전년':
                return f"{year_2digit - 1}F"
            else:
                return f"{year_2digit}F"
        elif 'SS' in season_upper or (season_upper.endswith('S') and len(season) == 3):
            # SS 시즌
            year_2digit = int(season[:2])
            if period == '전년':
                return f"{year_2digit - 1}S"
            else:
                return f"{year_2digit}S"
        return None
    
    # 전년/당년 각각 처리
    for period in ['전년', '당년']:
        # "기간" 컬럼이 있으면 사용, 없으면 "시즌" 컬럼에서 추출
        if '기간' in df.columns:
            df_period = df[df['기간'] == period]
        elif '시즌' in df.columns:
            # "당년(25N)" 형식에서 "당년"만 추출
            df_period = df[df['시즌'].str.startswith(period, na=False)]
        else:
            print(f"[ERROR] '기간' 또는 '시즌' 컬럼을 찾을 수 없습니다.")
            continue
        
        if len(df_period) == 0:
            continue
        
        # 브랜드별로 처리
        for brand in ['M', 'I', 'X']:
            # 동적으로 찾은 PO 리스트 사용
            krw_po_list = krw_treated_pos
            
            # 브랜드별 환율 계산 방식
            if brand == 'M':
                # M 브랜드: USD 발주 데이터 필요
                df_brand = df_period[
                    (df_period['브랜드'] == brand) & 
                    (df_period['발주통화'] == 'USD') &
                    (~df_period['PO'].isin(krw_po_list))  # 동적으로 찾은 PO 제외
                ]
                
                if len(df_brand) == 0:
                    print(f"[DEBUG] {period}_{brand}: USD 발주 데이터 없음 (동적 PO 제외 후)")
                    exchange_rates[f"{period}_{brand}"] = 0.0
                    continue
                
                print(f"[DEBUG] {period}_{brand}: USD 발주 {len(df_brand)}개 행 (동적 PO 제외 후)")
                # M 브랜드: 공임 기준으로 계산 (PO별 집계 후 합산)
                # PO별로 집계
                df_po_agg = df_brand.groupby('PO').agg({
                    'KRW_공임_총금액(단가×수량)': 'sum',
                    'USD_공임_총금액(단가×수량)': 'sum'
                }).reset_index()
                
                # PO별 집계 후 합산
                krw_total = df_po_agg['KRW_공임_총금액(단가×수량)'].sum()
                usd_total = df_po_agg['USD_공임_총금액(단가×수량)'].sum()
                
                print(f"[DEBUG] {period}_{brand}: PO별 집계 후 - KRW 공임 총액 = {krw_total:,.0f}, USD 공임 총액 = {usd_total:,.2f} (PO 수: {len(df_po_agg)})")
                
                if usd_total > 0:
                    rate = krw_total / usd_total
                    key = f"{period}_{brand}"
                    exchange_rates[key] = rate
                    print(f"[INFO] 환율 계산 (공임 기준): {key} = {rate:.2f} (KRW 총액: {krw_total:,.0f} / USD 총액: {usd_total:,.2f})")
                else:
                    print(f"[WARN] {period}_{brand}: USD 총액이 0이므로 환율 0.0 사용")
                    exchange_rates[f"{period}_{brand}"] = 0.0
            else:
                # I, X 브랜드: FX.csv에서 의류 환율 조회 (USD 발주 데이터 없어도 조회 시도)
                season_code = convert_season_code(season, period)
                if season_code:
                    rate = get_fx_rate(df_fx, brand, season_code, '의류')
                    if rate > 0:
                        key = f"{period}_{brand}"
                        exchange_rates[key] = rate
                        print(f"[INFO] 환율 조회 (FX.csv 의류): {key} = {rate:.2f} (브랜드={brand}, 시즌={season_code})")
                    else:
                        print(f"[WARN] {period}_{brand}: FX.csv에서 환율을 찾을 수 없습니다. 브랜드={brand}, 시즌={season_code}")
                        exchange_rates[f"{period}_{brand}"] = 0.0
                else:
                    print(f"[WARN] {period}_{brand}: 시즌 코드 변환 실패 (season={season}, period={period})")
                    exchange_rates[f"{period}_{brand}"] = 0.0
    
    return exchange_rates


# ============================================
# 환율 적용 및 데이터 변환
# ============================================
def apply_exchange_rates(df: pd.DataFrame, exchange_rates: Dict[str, float], season: str = None) -> pd.DataFrame:
    """
    환율을 적용하여 KRW 발주 항목을 USD로 변환
    KRW 발주인 경우: SQL에서 계산된 USD 값을 무시하고, FX_NON.csv의 환율로 KRW 값을 변환
    """
    df_result = df.copy()
    
    # 시즌 코드 변환 (FX_NON.csv 조회용)
    season_upper = season.upper() if season else ''
    if season_upper in ['25FW', '25F']:
        fx_season_code = '25F'
    elif season_upper in ['25SS', '25S']:
        fx_season_code = '25S'
    elif season_upper in ['26SS', '26S']:
        fx_season_code = '26S'
    elif season_upper in ['26FW', '26F']:
        fx_season_code = '26F'
    else:
        fx_season_code = None
    
    # KRW 필드를 USD 필드로 변환할 컬럼 매핑
    krw_to_usd_mapping = {
        '본사협의단가_T_금액(KRW)_원자재': '본사협의단가_금액(USD)_원자재',
        '본사협의단가_T_금액(KRW)_아트웍': '본사협의단가_금액(USD)_아트웍',
        '본사협의단가_T_금액(KRW)_부자재': '본사협의단가_금액(USD)_부자재',
        '본사협의단가_T_금액(KRW)_택/라벨': '본사협의단가_금액(USD)_택/라벨',
        '본사협의단가_T_금액(KRW)_공임': '본사협의단가_금액(USD)_공임',
        '본사협의단가_T_금액(KRW)_본사공급자재': '(USD)본사공급자재',
        '본사협의단가_T_금액(KRW)_정상마진': '본사협의단가_금액(USD)_정상마진',
        '본사협의단가_T_금액(KRW)_기타마진/경비': '본사협의단가_금액(USD)_기타마진/경비',
    }
    
    krw_total_to_usd_mapping = {
        'KRW_재료계(원/부/택/본공)_총금액(단가×수량)': 'USD_재료계(원/부/택/본공)_총금액(단가×수량)',
        'KRW_아트웍_총금액(단가×수량)': 'USD_아트웍_총금액(단가×수량)',
        'KRW_공임_총금액(단가×수량)': 'USD_공임_총금액(단가×수량)',
        'KRW_정상마진_총금액(단가×수량)': 'USD_정상마진_총금액(단가×수량)',
        'KRW_경비_총금액(단가×수량)': 'USD_경비_총금액(단가×수량)',
    }
    
    print("\n[INFO] 환율 적용 중...")
    
    # period에 따라 시즌 코드를 다르게 조회하는 함수
    def get_season_code_for_period(period: str, base_season_code: str) -> str:
        """
        period에 따라 시즌 코드를 반환
        - period가 "전년"이면 이전 시즌 코드 사용 (25F → 24F, 25S → 24S, 26F → 25F, 26S → 25S)
        - period가 "당년"이면 현재 시즌 코드 사용
        """
        if period == '전년':
            # 이전 시즌 코드 계산
            if base_season_code == '25F':
                return '24F'
            elif base_season_code == '25S':
                return '24S'
            elif base_season_code == '26F':
                return '25F'
            elif base_season_code == '26S':
                return '25S'
            else:
                return base_season_code
        elif period == '당년':
            # 현재 시즌 코드 사용
            return base_season_code
        else:
            return base_season_code
    
    for idx, row in df_result.iterrows():
        period = row['기간']
        brand = row['브랜드']
        currency = row['발주통화']
        
        # period에 따라 시즌 코드 결정
        lookup_season_code = get_season_code_for_period(period, fx_season_code) if fx_season_code else None
        
        # 모든 발주(USD/KRW)에 대해 KRW 컬럼을 환율로 나눠서 USD 컬럼에 계산
        # FX_NON.csv에서 환율 조회
        rate = load_fx_non_rate(brand, period, lookup_season_code) if lookup_season_code else 0.0
        
        if rate == 0:
            # FX_NON.csv에서 조회 실패 시 exchange_rates에서 조회 (fallback)
            rate_key = f"{period}_{brand}"
            rate = exchange_rates.get(rate_key, 0.0)
        
        if rate == 0:
            continue  # 환율이 0이면 변환하지 않음
        
        # 모든 발주에 대해 SQL에서 계산된 USD 단가 컬럼을 먼저 0으로 초기화
        for usd_col in krw_to_usd_mapping.values():
            if usd_col in df_result.columns:
                df_result.at[idx, usd_col] = 0.0
        
        # KRW 값을 USD로 변환 (모든 발주에 대해)
        for krw_col, usd_col in krw_to_usd_mapping.items():
            if krw_col in df_result.columns and usd_col in df_result.columns:
                krw_value = pd.to_numeric(row[krw_col], errors='coerce')
                if pd.notna(krw_value) and krw_value != 0:
                    usd_value = krw_value / rate
                    df_result.at[idx, usd_col] = usd_value
        
        # 모든 발주에 대해 SQL에서 계산된 USD 총금액 컬럼을 먼저 0으로 초기화
        for usd_col in krw_total_to_usd_mapping.values():
            if usd_col in df_result.columns:
                df_result.at[idx, usd_col] = 0.0
        
        # 총금액도 변환 (모든 발주에 대해)
        for krw_col, usd_col in krw_total_to_usd_mapping.items():
            if krw_col in df_result.columns and usd_col in df_result.columns:
                krw_value = pd.to_numeric(row[krw_col], errors='coerce')
                if pd.notna(krw_value) and krw_value != 0:
                    usd_value = krw_value / rate
                    df_result.at[idx, usd_col] = usd_value
        
    
    return df_result


# ============================================
# 데이터 매핑 및 변환
# ============================================
# ============================================
# CSV 필드 매핑 (M_25F.csv 구조에 맞춤)
# ============================================
def map_to_m24s_format(df: pd.DataFrame, season: str, exchange_rates: Dict[str, float] = None) -> pd.DataFrame:
    """
    M_25F.csv 형식에 맞게 컬럼 매핑 및 변환
    """
    df_result = df.copy()
    
    # 시즌 컬럼을 period_label + sesn 형식으로 변환
    def format_season(row):
        period = row['기간']
        sesn = row['시즌']
        if period == '전년':
            return f"전년({sesn})"
        elif period == '당년':
            return f"당년({sesn})"
        return sesn
    
    df_result['시즌'] = df_result.apply(format_season, axis=1)
    
    # 수량 컬럼 추가/변환
    if '수량' not in df_result.columns:
        df_result['수량'] = df_result['발주수량']
    
    # TAG_총금액 계산
    if 'TAG_총금액' not in df_result.columns:
        df_result['TAG_총금액'] = df_result['TAG'] * df_result['수량']
    
    # 컬럼명 매핑 (M_25F.csv 형식으로)
    column_mapping = {
        # USD 단가 컬럼
        '본사협의단가_금액(USD)_원자재': '(USD)_원자재',
        '본사협의단가_금액(USD)_아트웍': '(USD)_아트웍',
        '본사협의단가_금액(USD)_부자재': '(USD)_부자재',
        '본사협의단가_금액(USD)_택/라벨': '(USD)_택/라벨',
        '본사협의단가_금액(USD)_공임': '(USD) 공임',
        '(USD)본사공급자재': '(USD)본사공급자재',
        '본사협의단가_금액(USD)_정상마진': '(USD)_정상마진',
        '본사협의단가_금액(USD)_기타마진/경비': '(USD)_경비',
        # KRW 단가 컬럼
        '본사협의단가_T_금액(KRW)_원자재': '(KRW)_원자재',
        '본사협의단가_T_금액(KRW)_아트웍': '(KRW)_아트웍',
        '본사협의단가_T_금액(KRW)_부자재': '(KRW)_부자재',
        '본사협의단가_T_금액(KRW)_택/라벨': '(KRW)_택/라벨',
        '본사협의단가_T_금액(KRW)_공임': '(KRW)_공임',
        '본사협의단가_T_금액(KRW)_본사공급자재': '(KRW)본사공급자재',
        '본사협의단가_T_금액(KRW)_정상마진': '(KRW)_정상마진',
        '본사협의단가_T_금액(KRW)_기타마진/경비': '(KRW)_경비',
    }
    
    # 컬럼명 변경
    for old_name, new_name in column_mapping.items():
        if old_name in df_result.columns:
            df_result = df_result.rename(columns={old_name: new_name})
    
    # 시즌 코드 변환 (FX_NON.csv 조회용)
    # FX_NON.csv에는 "25F", "25S" 형식으로 저장되어 있음
    season_upper = season.upper()
    if season_upper in ['25FW', '25F']:
        fx_season_code = '25F'  # 25F 시즌의 전년환율 사용
    elif season_upper in ['25SS', '25S']:
        fx_season_code = '25S'  # 25S 시즌의 전년환율 사용
    elif season_upper in ['26SS', '26S']:
        fx_season_code = '26S'  # 26S 시즌의 전년환율 사용
    elif season_upper in ['26FW', '26F']:
        fx_season_code = '26F'  # 26F 시즌의 전년환율 사용
    else:
        fx_season_code = None
    
    # TAG_USD금액(전년환율) 계산 - FX_NON.csv에서 전년환율 사용
    df_result['TAG_USD금액(전년환율)'] = 0.0
    
    for idx, row in df_result.iterrows():
        brand = row['브랜드']
        
        # FX_NON.csv에서 전년환율 조회 (당년 시즌의 전년환율)
        prev_rate = load_fx_non_prev_rate(brand, fx_season_code) if fx_season_code else 0.0
        
        if prev_rate > 0:
            tag_krw = pd.to_numeric(row['TAG'], errors='coerce')
            if pd.notna(tag_krw) and tag_krw > 0:
                qty = pd.to_numeric(row['수량'], errors='coerce')
                if pd.notna(qty) and qty > 0:
                    tag_total_krw = tag_krw * qty
                    tag_usd = tag_total_krw / prev_rate
                    df_result.at[idx, 'TAG_USD금액(전년환율)'] = tag_usd
    
    # M_25F.csv 컬럼 순서 정의
    base_columns = [
        '브랜드', '시즌', '스타일', '중분류', '아이템명', 'PO', 'TAG', '수량',
        'TAG_총금액', 'TAG_USD금액(전년환율)', '원가견적번호', '발주통화', '제조업체', '견적서제출일자'
    ]
    
    # PO 컬럼명이 다를 수 있으므로 확인
    if 'PO' not in df_result.columns and 'po_no' in df_result.columns:
        df_result = df_result.rename(columns={'po_no': 'PO'})
    elif 'PO' not in df_result.columns and 'PO' in [col for col in df_result.columns if 'PO' in col.upper()]:
        # PO가 포함된 컬럼 찾기
        po_col = [col for col in df_result.columns if 'PO' in col.upper()][0]
        df_result = df_result.rename(columns={po_col: 'PO'})
    
    usd_unit_columns = [
        '(USD)_원자재', '(USD)_아트웍', '(USD)_부자재', '(USD)_택/라벨', 
        '(USD) 공임', '(USD)본사공급자재', '(USD)_정상마진', '(USD)_경비'
    ]
    
    krw_unit_columns = [
        '(KRW)_원자재', '(KRW)_아트웍', '(KRW)_부자재', '(KRW)_택/라벨',
        '(KRW)_공임', '(KRW)본사공급자재', '(KRW)_정상마진', '(KRW)_경비'
    ]
    
    usd_total_columns = [
        'USD_재료계(원/부/택/본공)_총금액(단가×수량)', 'USD_아트웍_총금액(단가×수량)',
        'USD_공임_총금액(단가×수량)', 'USD_정상마진_총금액(단가×수량)', 'USD_경비_총금액(단가×수량)'
    ]
    
    krw_total_columns = [
        'KRW_재료계(원/부/택/본공)_총금액(단가×수량)', 'KRW_아트웍_총금액(단가×수량)',
        'KRW_공임_총금액(단가×수량)', 'KRW_정상마진_총금액(단가×수량)', 'KRW_경비_총금액(단가×수량)'
    ]
    
    # 입고 관련 컬럼 (맨 끝으로)
    storage_columns = ['입고수량', '최초입고일', '최종입고일']
    
    # 컬럼 순서대로 재구성
    ordered_columns = []
    for col_list in [base_columns, usd_unit_columns, krw_unit_columns, usd_total_columns, krw_total_columns]:
        for col in col_list:
            if col in df_result.columns:
                ordered_columns.append(col)
    
    # 입고 관련 컬럼 추가 (있는 경우만)
    for col in storage_columns:
        if col in df_result.columns:
            ordered_columns.append(col)
    
    # 기간 컬럼 제거 (시즌에 이미 포함됨)
    if '기간' in ordered_columns:
        ordered_columns.remove('기간')
    
    # 중복 컬럼 제거 (마지막에 있는 수량, TAG_총금액, TAG_USD금액 중복 확인)
    # ordered_columns에 이미 포함된 컬럼만 사용
    final_columns = []
    seen = set()
    for col in ordered_columns:
        if col not in seen:
            final_columns.append(col)
            seen.add(col)
    
    # 존재하는 컬럼만 선택
    available_columns = [col for col in final_columns if col in df_result.columns]
    
    # 나머지 컬럼 추가 (정렬되지 않은 컬럼들, 단 중복 제거)
    remaining_columns = [col for col in df_result.columns if col not in available_columns and col not in ['기간', '발주수량']]
    available_columns.extend(remaining_columns)
    
    # DataFrame 재구성
    df_result = df_result[available_columns]
    
    return df_result




# ============================================
# CSV 저장
# ============================================
def save_csv_by_brand(df: pd.DataFrame, season: str, output_dir: str):
    """
    브랜드별로 CSV 파일 저장
    """
    os.makedirs(output_dir, exist_ok=True)
    
    for brand in ['M', 'I', 'X']:
        df_brand = df[df['브랜드'] == brand].copy()
        
        if len(df_brand) == 0:
            print(f"[WARN] {brand} 브랜드 데이터가 없습니다.")
            continue
        
        # 파일명 생성 (예: M_25F_NON.csv)
        season_upper = season.upper()
        if 'FW' in season_upper or (season_upper.endswith('F') and len(season) == 3):
            file_season = season_upper.replace('FW', 'F')
        elif 'SS' in season_upper or (season_upper.endswith('S') and len(season) == 3):
            file_season = season_upper.replace('SS', 'S')
        else:
            file_season = season_upper
        
        filename = f"{brand}_{file_season}_NON.csv"
        output_path = os.path.join(output_dir, filename)
        
        # CSV 저장
        df_brand.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"[OK] {output_path} 저장 완료 ({len(df_brand)}행)")


# ============================================
# 메인 함수
# ============================================
def main():
    """
    메인 실행 함수
    """
    parser = argparse.ArgumentParser(description='MLB Non 시즌 CSV 생성')
    parser.add_argument('--season', type=str, required=True, help='시즌 코드 (예: 25FW, 26SS)')
    args = parser.parse_args()
    
    season = args.season
    print(f"\n[INFO] MLB Non 시즌 CSV 생성 시작: {season}")
    
    # 기간 계산
    prev_start, prev_end, curr_start, curr_end = calculate_periods(season)
    print(f"[INFO] 전년 기간: {prev_start} ~ {prev_end}")
    print(f"[INFO] 당년 기간: {curr_start} ~ {curr_end}")
    
    # 데이터베이스 연결
    conn = connect_to_database()
    if not conn:
        print("[ERROR] 데이터베이스 연결 실패")
        sys.exit(1)
    
    try:
        # 브랜드별로 데이터 추출 및 저장
        for brand in ['M', 'I', 'X']:
            print(f"\n[INFO] {brand} 브랜드 데이터 추출 중...")
            
            # SQL 쿼리 생성
            sql_query = build_sql_query(prev_start, prev_end, curr_start, curr_end)
            
            # 쿼리 실행
            df = execute_query(conn, sql_query)
            
            if len(df) == 0:
                print(f"[WARN] {brand} 브랜드 데이터가 없습니다.")
                # 빈 CSV 파일 생성
                output_dir = os.path.join('public', 'COST RAW', season.replace('FW', 'FW').replace('SS', 'SS'))
                os.makedirs(output_dir, exist_ok=True)
                season_upper = season.upper()
                if 'FW' in season_upper or (season_upper.endswith('F') and len(season) == 3):
                    file_season = season_upper.replace('FW', 'F')
                elif 'SS' in season_upper or (season_upper.endswith('S') and len(season) == 3):
                    file_season = season_upper.replace('SS', 'S')
                else:
                    file_season = season_upper
                filename = f"{brand}_{file_season}_NON.csv"
                filepath = os.path.join(output_dir, filename)
                empty_df = pd.DataFrame()
                empty_df.to_csv(filepath, index=False, encoding='utf-8-sig', lineterminator='\n')
                print(f"[WARN] 브랜드 {brand}에 대한 데이터가 없습니다. 빈 파일 생성: {filepath}")
                continue
            
            # 환율 계산
            exchange_rates = calculate_exchange_rates(df, season)
            print(f"[INFO] 환율 계산 완료: {exchange_rates}")
            
            # 환율 적용 (KRW 발주는 FX_NON.csv에서 환율 조회)
            df = apply_exchange_rates(df, exchange_rates, season)
            
            # CSV 형식으로 변환
            df = map_to_m24s_format(df, season, exchange_rates)
            
            # CSV 저장
            output_dir = os.path.join('public', 'COST RAW', season.replace('FW', 'FW').replace('SS', 'SS'))
            save_csv_by_brand(df, season, output_dir)
        
        print("\n[OK] 모든 작업 완료!")
        
    finally:
        conn.close()
        print("[INFO] 데이터베이스 연결 종료")


if __name__ == '__main__':
    main()

