#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MLB Non 시즌 환율 데이터 수집 및 FX_NON.csv 생성 스크립트

사용 방법:
    python generate_fx_non_csv.py

기능:
- 모든 기간(25S, 25F, 26S, 26F)에 대해 환율 계산
- FX_NON.csv 파일 생성
"""

import pandas as pd
import snowflake.connector
import os
from datetime import date
from typing import Dict, List, Tuple, Optional

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
# 기간 계산 함수 (generate_mlb_non_csv.py에서 복사)
# ============================================
def calculate_periods(season: str) -> Tuple[date, date, date, date]:
    """시즌에 따른 전년/당년 기간 계산"""
    season_upper = season.upper()
    
    if 'FW' in season_upper or (season_upper.endswith('F') and len(season) == 3):
        # FW: 6/1 ~ 11/30
        year_2digit = int(season[:2])
        year = 2000 + year_2digit
        prev_year = year - 1
        curr_year = year
        
        prev_start = date(prev_year, 6, 1)
        prev_end = date(prev_year, 11, 30)
        curr_start = date(curr_year, 6, 1)
        
        today = date.today()
        if today > date(curr_year, 11, 30):
            curr_end = date(curr_year, 11, 30)
        else:
            curr_end = today
            
    elif 'SS' in season_upper or (season_upper.endswith('S') and len(season) == 3):
        # SS: 12/1 ~ 다음해 5/31
        # 예: 25S 당년 = 2024-12-01 ~ 2025-05-31, 전년 = 2023-12-01 ~ 2024-05-31
        year_2digit = int(season[:2])
        year = 2000 + year_2digit
        
        # 당년: (year-1)년 12/1 ~ year년 5/31
        curr_start = date(year - 1, 12, 1)
        curr_end_year = year
        
        # 전년: (year-2)년 12/1 ~ (year-1)년 5/31
        prev_start = date(year - 2, 12, 1)
        prev_end = date(year - 1, 5, 31)
        
        today = date.today()
        if today > date(curr_end_year, 5, 31):
            curr_end = date(curr_end_year, 5, 31)
        else:
            curr_end = today
    else:
        raise ValueError(f"지원하지 않는 시즌 형식: {season}")
    
    return prev_start, prev_end, curr_start, curr_end

# ============================================
# SQL 쿼리 생성 (generate_mlb_non_csv.py에서 복사)
# ============================================
def build_sql_query(prev_start: date, prev_end: date, curr_start: date, curr_end: date) -> str:
    """SQL 쿼리 생성"""
    prev_start_str = prev_start.strftime('%Y-%m-%d')
    prev_end_str = prev_end.strftime('%Y-%m-%d')
    curr_start_str = curr_start.strftime('%Y-%m-%d')
    curr_end_str = curr_end.strftime('%Y-%m-%d')
    
    query = f"""
with 
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
stor_po as (
    select distinct po_no, period_label
    from stor_filtered
),
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
    sum(case when type1 = 100 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_원자재",
    sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_아트웍",
    sum(case when type1 = 300 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_부자재",
    sum(case when type1 = 350 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_택/라벨",
    sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_공임",
    sum(case when type1 = 700 then mfac_offer_cost_amt_curr else 0 end) as "(USD)본사공급자재",
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_offer_cost_amt_curr else 0 end) as "본사협의단가_금액(USD)_기타마진/경비",
    sum(case when type1 = 100 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_원자재",
    sum(case when type1 = 200 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_아트웍",
    sum(case when type1 = 300 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_부자재",
    sum(case when type1 = 350 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_택/라벨",
    sum(case when type1 = 400 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_공임",
    sum(case when type1 = 700 then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_본사공급자재",
    sum(case when type1 = 500 and type2 = 'AAA' then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_정상마진",
    sum(case when type1 = 500 and type2 <> 'AAA' then mfac_nego_cost_amt else 0 end) as "본사협의단가_T_금액(KRW)_기타마진/경비",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 in (100,300,350,700) then mfac_offer_cost_amt_curr else 0 end),0) as "USD_재료계(원/부/택/본공)_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 200 then mfac_offer_cost_amt_curr else 0 end),0) as "USD_아트웍_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 400 then mfac_offer_cost_amt_curr else 0 end),0) as "USD_공임_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and type2 = 'AAA' then mfac_offer_cost_amt_curr else 0 end),0) as "USD_정상마진_총금액(단가×수량)",
    coalesce(po_qty_sum,0) * coalesce(sum(case when type1 = 500 and (type2 <> 'AAA' or type2 is null) then mfac_offer_cost_amt_curr else 0 end),0) as "USD_경비_총금액(단가×수량)",
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
        return conn
    except Exception as e:
        print(f"[ERROR] Snowflake 연결 실패: {e}")
        return None

# ============================================
# SQL 쿼리 실행
# ============================================
def execute_query(conn, query: str) -> pd.DataFrame:
    """SQL 쿼리 실행 및 결과를 DataFrame으로 반환"""
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        df = pd.DataFrame(rows, columns=columns)
        cursor.close()
        
        return df
    except Exception as e:
        print(f"[ERROR] 쿼리 실행 실패: {e}")
        return pd.DataFrame()

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
    """전년/당년 각각 브랜드별로 환율 계산"""
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
    
    for period in ['전년', '당년']:
        if '기간' in df.columns:
            df_period = df[df['기간'] == period]
        elif '시즌' in df.columns:
            df_period = df[df['시즌'].str.startswith(period, na=False)]
        else:
            continue
        
        if len(df_period) == 0:
            continue
        
        for brand in ['M', 'I', 'X']:
            # 브랜드별 환율 계산 방식
            if brand == 'M':
                # M 브랜드: USD 발주 데이터 필요
                # 동적으로 찾은 PO 리스트 사용
                krw_po_list = krw_treated_pos
                
                df_brand = df_period[
                    (df_period['브랜드'] == brand) & 
                    (df_period['발주통화'] == 'USD') &
                    (~df_period['PO'].isin(krw_po_list))
                ]
                
                if len(df_brand) == 0:
                    exchange_rates[f"{period}_{brand}"] = 0.0
                    continue
                # M 브랜드: 공임 기준으로 계산 (PO별 집계 후 합산)
                # PO별로 집계
                df_po_agg = df_brand.groupby('PO').agg({
                    'KRW_공임_총금액(단가×수량)': 'sum',
                    'USD_공임_총금액(단가×수량)': 'sum'
                }).reset_index()
                
                # PO별 집계 후 합산
                krw_total = df_po_agg['KRW_공임_총금액(단가×수량)'].sum()
                usd_total = df_po_agg['USD_공임_총금액(단가×수량)'].sum()
                
                if usd_total > 0:
                    rate = krw_total / usd_total
                    exchange_rates[f"{period}_{brand}"] = rate
                else:
                    exchange_rates[f"{period}_{brand}"] = 0.0
            else:
                # I, X 브랜드: FX.csv에서 의류 환율 조회 (USD 발주 데이터 없어도 조회 시도)
                season_code = convert_season_code(season, period)
                if season_code:
                    rate = get_fx_rate(df_fx, brand, season_code, '의류')
                    if rate > 0:
                        exchange_rates[f"{period}_{brand}"] = rate
                    else:
                        exchange_rates[f"{period}_{brand}"] = 0.0
                else:
                    exchange_rates[f"{period}_{brand}"] = 0.0
    
    return exchange_rates

# ============================================
# 메인 함수
# ============================================
def main():
    seasons = ['25S', '25F', '26S', '26F']
    all_fx_data = []
    
    print("=" * 60)
    print("MLB Non 시즌 환율 계산 및 FX_NON.csv 생성")
    print("=" * 60)
    
    # Snowflake 연결
    conn = connect_to_database()
    if not conn:
        print("[ERROR] 데이터베이스 연결 실패")
        return
    
    try:
        for season in seasons:
            print(f"\n[{season}] 기간 처리 중...")
            
            # 기간 계산
            prev_start, prev_end, curr_start, curr_end = calculate_periods(season)
            
            # SQL 쿼리 생성 및 실행
            query = build_sql_query(prev_start, prev_end, curr_start, curr_end)
            df = execute_query(conn, query)
            
            if df.empty:
                print(f"[WARN] {season} 기간 데이터 없음")
                continue
            
            # 환율 계산
            exchange_rates = calculate_exchange_rates(df, season)
            
            # 시즌 코드 변환 (25F -> 25F, 25S -> 25S)
            season_code = season
            
            # 환율 데이터 수집
            for period in ['전년', '당년']:
                for brand in ['M', 'I', 'X']:
                    key = f"{period}_{brand}"
                    rate = exchange_rates.get(key, 0.0)
                    all_fx_data.append({
                        '브랜드': brand,
                        '기간': period,
                        '시즌': season_code,
                        '환율': round(rate, 2)
                    })
                    print(f"  {key}: {rate:.2f}")
        
        # FX_NON.csv 생성
        if all_fx_data:
            df_fx = pd.DataFrame(all_fx_data)
            output_path = 'public/COST RAW/FX_NON.csv'
            df_fx.to_csv(output_path, index=False, encoding='utf-8-sig', lineterminator='\n')
            print(f"\n[OK] FX_NON.csv 저장 완료: {output_path} ({len(df_fx)}개 행)")
        else:
            print("\n[WARN] 환율 데이터가 없습니다.")
        
    except Exception as e:
        print(f"\n[ERROR] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()
            print("\n[INFO] Snowflake 연결 종료")

if __name__ == '__main__':
    main()

