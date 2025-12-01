"""
각 기간별 브랜드별 환율 계산 테스트 스크립트
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from generate_mlb_non_csv import connect_to_database, calculate_periods, build_sql_query, execute_query, calculate_exchange_rates

def test_exchange_rates():
    """각 기간별 브랜드별 환율 계산 테스트"""
    seasons = ['25S', '25F', '26S', '26F']
    brands = ['M', 'I', 'X']
    
    print("=" * 80)
    print("환율 계산 테스트")
    print("=" * 80)
    
    # Snowflake 연결
    conn = connect_to_database()
    if not conn:
        print("[ERROR] 데이터베이스 연결 실패")
        return
    
    try:
        for season in seasons:
            print(f"\n{'='*80}")
            print(f"[{season}] 기간 테스트")
            print(f"{'='*80}")
            
            # 기간 계산
            prev_start, prev_end, curr_start, curr_end = calculate_periods(season)
            print(f"전년 기간: {prev_start} ~ {prev_end}")
            print(f"당년 기간: {curr_start} ~ {curr_end}")
            
            # SQL 쿼리 생성 및 실행
            query = build_sql_query(prev_start, prev_end, curr_start, curr_end)
            df = execute_query(conn, query)
            
            if df.empty:
                print(f"[WARN] {season} 기간 데이터 없음")
                continue
            
            print(f"[INFO] 조회된 데이터: {len(df)}행")
            
            # 환율 계산
            exchange_rates = calculate_exchange_rates(df)
            
            # 결과 출력
            print(f"\n[{season}] 환율 계산 결과:")
            print("-" * 80)
            for period in ['전년', '당년']:
                for brand in brands:
                    key = f"{period}_{brand}"
                    rate = exchange_rates.get(key, 0.0)
                    print(f"  {key:20s}: {rate:>10.2f}")
            print("-" * 80)
    
    finally:
        conn.close()
        print("\n[INFO] 데이터베이스 연결 종료")

if __name__ == "__main__":
    test_exchange_rates()


