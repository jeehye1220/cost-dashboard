import snowflake.connector
import pandas as pd
from datetime import date

# Snowflake 연결 설정
SNOWFLAKE_CONFIG = {
    'account': 'cixxjbf-wp67697',
    'username': 'kjh1',
    'password': 'Sqlstudy12345!',
    'warehouse': 'DEV_WH',
    'database': 'FNF',
    'schema': 'SAP_FNF',
    'role': 'PUBLIC'
}

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

def check_m_brand_data(season: str, period: str):
    """M브랜드 데이터 상세 확인"""
    # 기간 계산
    if 'SS' in season.upper() or (season.upper().endswith('S') and len(season) == 3):
        # SS 시즌: 12월~다음해 5월
        year_2digit = int(season[:2])
        year = 2000 + year_2digit
        
        if period == '전년':
            prev_start = date(year - 1, 12, 1)
            prev_end = date(year, 5, 31)
        else:  # 당년
            curr_start = date(year, 12, 1)
            curr_end = date(year + 1, 5, 31)
    else:
        # FW 시즌: 6월~11월
        year_2digit = int(season[:2])
        year = 2000 + year_2digit
        
        if period == '전년':
            prev_start = date(year - 1, 6, 1)
            prev_end = date(year - 1, 11, 30)
        else:  # 당년
            curr_start = date(year, 6, 1)
            curr_end = date(year, 11, 30)
    
    if period == '전년':
        start_date = prev_start
        end_date = prev_end
    else:
        start_date = curr_start
        end_date = curr_end
    
    print(f"\n{'='*80}")
    print(f"[{season} {period}] M브랜드 데이터 확인")
    print(f"{'='*80}")
    print(f"기간: {start_date} ~ {end_date}")
    
    query = f"""
with 
stor_filtered as (
    select 
        po_no,
        stor_dt,
        qty,
        case 
            when stor_dt between date '{start_date}' and date '{end_date}' then '{period}'
        end as period_label
    from prcs.dw_stor
    where stor_dt between date '{start_date}' and date '{end_date}'
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
        b.type1,
        b.currency,
        b.mfac_offer_cost_amt_curr,
        b.mfac_nego_cost_amt,
        o2.po_qty_sum as po_qty_sum,
        sp.period_label as period_label
    from prcs.db_cost_mst a
    join prcs.db_cost_dtl b on a.po_no = b.po_no 
        and a.quotation_seq = b.quotation_seq 
        and a.quotation_apv_stat_nm = '확정'
    inner join stor_po sp on sp.po_no = a.po_no
    left join (
        select po_no, sum(ord_qty) as po_qty_sum
        from prcs.dw_ord
        group by po_no
    ) o2 on o2.po_no = a.po_no
    where a.sesn like '%N%'
      and a.brd_cd = 'M'
      and b.currency = 'USD'
)
select 
    po_no,
    currency,
    type1,
    sum(mfac_offer_cost_amt_curr) as usd_amt,
    sum(mfac_nego_cost_amt) as krw_amt,
    max(po_qty_sum) as po_qty_sum,
    sum(case when type1 in (100,300,350,700) then mfac_offer_cost_amt_curr else 0 end) as usd_material,
    sum(case when type1 in (100,300,350,700) then mfac_nego_cost_amt else 0 end) as krw_material
from main
group by po_no, currency, type1
order by po_no, type1
"""
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        df = pd.DataFrame(rows, columns=columns)
        cursor.close()
        
        print(f"\n[INFO] 총 {len(df)}개 행 조회")
        
        if len(df) > 0:
            # PO별 집계
            po_summary = df.groupby('PO_NO').agg({
                'USD_AMT': 'sum',
                'KRW_AMT': 'sum',
                'PO_QTY_SUM': 'first',
                'USD_MATERIAL': 'sum',
                'KRW_MATERIAL': 'sum'
            }).reset_index()
            
            po_summary['USD_TOTAL'] = po_summary['PO_QTY_SUM'] * po_summary['USD_MATERIAL']
            po_summary['KRW_TOTAL'] = po_summary['PO_QTY_SUM'] * po_summary['KRW_MATERIAL']
            
            print(f"\n[PO별 집계]")
            print(po_summary.head(20).to_string())
            
            # 총합
            total_usd = po_summary['USD_TOTAL'].sum()
            total_krw = po_summary['KRW_TOTAL'].sum()
            
            print(f"\n[총합]")
            print(f"USD 총액: {total_usd:,.2f}")
            print(f"KRW 총액: {total_krw:,.0f}")
            print(f"환율: {total_krw / total_usd:.2f}" if total_usd > 0 else "환율: 0.00")
            
            # type1=700이 있는 PO 확인
            type1_700 = df[df['TYPE1'] == 700]
            if len(type1_700) > 0:
                print(f"\n[type1=700 (본사공급자재) 포함 PO]")
                print(type1_700[['PO_NO', 'USD_AMT', 'KRW_AMT', 'PO_QTY_SUM']].to_string())
                
                # type1=700의 총합
                type1_700_total_usd = (type1_700['PO_QTY_SUM'] * type1_700['USD_AMT']).sum()
                type1_700_total_krw = (type1_700['PO_QTY_SUM'] * type1_700['KRW_AMT']).sum()
                print(f"\n[type1=700 총합]")
                print(f"USD: {type1_700_total_usd:,.2f}")
                print(f"KRW: {type1_700_total_krw:,.0f}")
            
            # type1별 집계
            print(f"\n[type1별 집계]")
            type1_summary = df.groupby('TYPE1').agg({
                'USD_AMT': 'sum',
                'KRW_AMT': 'sum',
                'PO_QTY_SUM': 'first'
            }).reset_index()
            type1_summary['USD_TOTAL'] = type1_summary['PO_QTY_SUM'] * type1_summary['USD_AMT']
            type1_summary['KRW_TOTAL'] = type1_summary['PO_QTY_SUM'] * type1_summary['KRW_AMT']
            print(type1_summary.to_string())
        
    except Exception as e:
        print(f"[ERROR] 쿼리 실행 실패: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    # 문제가 있는 기간 확인
    check_m_brand_data('25S', '전년')
    check_m_brand_data('25F', '전년')

