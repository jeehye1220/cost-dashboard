#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQL에서 CSV 파일로 변환하는 스크립트 (~_LV2까지)

이 스크립트는 SQL 데이터베이스에서 데이터를 추출하여
원본 CSV와 LV2까지의 변환된 CSV 파일을 생성합니다.

사용 방법:
1. 데이터베이스 연결 정보 설정
2. SQL 쿼리 작성
3. 스크립트 실행
"""

import pandas as pd
import pyodbc  # 또는 pymssql, sqlalchemy 등 사용 가능
import os
from typing import Optional

# ============================================
# 데이터베이스 연결 설정
# ============================================
# SQL Server 예시
DB_CONFIG = {
    'server': 'your_server_name',
    'database': 'your_database_name',
    'username': 'your_username',
    'password': 'your_password',
    'driver': '{ODBC Driver 17 for SQL Server}',  # 또는 다른 드라이버
}

# 또는 연결 문자열 직접 사용
CONNECTION_STRING = (
    f"DRIVER={DB_CONFIG['driver']};"
    f"SERVER={DB_CONFIG['server']};"
    f"DATABASE={DB_CONFIG['database']};"
    f"UID={DB_CONFIG['username']};"
    f"PWD={DB_CONFIG['password']}"
)

# ============================================
# SQL 쿼리 설정
# ============================================
SQL_QUERY = """
SELECT 
    브랜드,
    시즌,
    스타일,
    중분류,
    아이템명,
    PO,
    TAG,
    수량,
    TAG_합계,
    TAG_USD_금액,
    견적번호,
    통화,
    제조업체,
    제출일자,
    -- USD 단가
    [원자재(USD)],
    [아트웍(USD)],
    [부자재(USD)],
    [택/라벨(USD)],
    [공임(USD)],
    [본사공급자재(USD)],
    [정상마진(USD)],
    [경비(USD)],
    -- KRW 단가
    [원자재(KRW)],
    [아트웍(KRW)],
    [부자재(KRW)],
    [택/라벨(KRW)],
    [공임(KRW)],
    [본사공급자재(KRW)],
    [정상마진(KRW)],
    [경비(KRW)]
FROM 
    your_table_name
WHERE 
    조건 = '값'
ORDER BY 
    브랜드, 시즌, 중분류
"""

# ============================================
# 출력 파일 설정
# ============================================
OUTPUT_DIR = 'public'
BASE_FILENAME = 'MLB_FW'  # 기본 파일명 (확장자 제외)

# ============================================
# 함수 정의
# ============================================

def connect_to_database() -> Optional[pyodbc.Connection]:
    """데이터베이스에 연결"""
    try:
        conn = pyodbc.connect(CONNECTION_STRING)
        print(f"[OK] 데이터베이스 연결 성공: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"[ERROR] 데이터베이스 연결 실패: {e}")
        print("\n[INFO] pyodbc 설치 필요: pip install pyodbc")
        return None


def execute_query(conn: pyodbc.Connection, query: str) -> Optional[pd.DataFrame]:
    """SQL 쿼리 실행 및 결과를 DataFrame으로 반환"""
    try:
        print("\n[INFO] SQL 쿼리 실행 중...")
        df = pd.read_sql(query, conn)
        print(f"[OK] {len(df)}개 행 추출 완료")
        return df
    except Exception as e:
        print(f"[ERROR] 쿼리 실행 실패: {e}")
        return None


def save_csv_with_encoding(df: pd.DataFrame, filepath: str, encoding: str = 'utf-8-sig'):
    """DataFrame을 CSV 파일로 저장 (인코딩 지정)"""
    try:
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(filepath) if os.path.dirname(filepath) else '.', exist_ok=True)
        
        # CSV 저장
        df.to_csv(filepath, index=False, encoding=encoding, lineterminator='\n')
        print(f"[OK] {filepath} 저장 완료 ({encoding} 인코딩)")
    except Exception as e:
        print(f"[ERROR] CSV 저장 실패: {e}")


def process_data_levels(df: pd.DataFrame, base_filename: str):
    """데이터를 여러 레벨로 처리하여 CSV 파일 생성"""
    
    # ============================================
    # 레벨 0: 원본 데이터 (그대로 저장)
    # ============================================
    original_file = f"{OUTPUT_DIR}/{base_filename}.csv"
    save_csv_with_encoding(df, original_file)
    
    # ============================================
    # 레벨 1: 기본 정제 (필요시)
    # ============================================
    df_lv1 = df.copy()
    
    # 예시: 공백 제거, 데이터 타입 정리
    # 문자열 컬럼의 앞뒤 공백 제거
    string_cols = df_lv1.select_dtypes(include=['object']).columns
    for col in string_cols:
        df_lv1[col] = df_lv1[col].astype(str).str.strip()
    
    # 숫자 컬럼 정리 (쉼표 제거, 숫자 변환)
    numeric_cols = ['수량', 'TAG', 'TAG_합계', 'TAG_USD_금액']
    for col in numeric_cols:
        if col in df_lv1.columns:
            df_lv1[col] = pd.to_numeric(
                df_lv1[col].astype(str).str.replace(',', '').str.strip(),
                errors='coerce'
            ).fillna(0)
    
    lv1_file = f"{OUTPUT_DIR}/{base_filename}_LV1.csv"
    save_csv_with_encoding(df_lv1, lv1_file)
    
    # ============================================
    # 레벨 2: 추가 처리 및 집계 (필요시)
    # ============================================
    df_lv2 = df_lv1.copy()
    
    # 예시: 원부자재 계산 (원자재 + 부자재 + 본사공급자재 + 택/라벨)
    usd_material_cols = [
        '[원자재(USD)]',
        '[부자재(USD)]',
        '[본사공급자재(USD)]',
        '[택/라벨(USD)]'
    ]
    
    # 컬럼명이 실제 데이터와 일치하도록 확인 필요
    # 실제 컬럼명에 맞게 수정하세요
    if all(col in df_lv2.columns for col in usd_material_cols):
        df_lv2['원부자재(USD)'] = (
            df_lv2['[원자재(USD)]'].fillna(0) +
            df_lv2['[부자재(USD)]'].fillna(0) +
            df_lv2['[본사공급자재(USD)]'].fillna(0) +
            df_lv2['[택/라벨(USD)]'].fillna(0)
        )
    
    # KRW 원부자재도 동일하게 계산
    krw_material_cols = [
        '[원자재(KRW)]',
        '[부자재(KRW)]',
        '[본사공급자재(KRW)]',
        '[택/라벨(KRW)]'
    ]
    
    if all(col in df_lv2.columns for col in krw_material_cols):
        df_lv2['원부자재(KRW)'] = (
            df_lv2['[원자재(KRW)]'].fillna(0) +
            df_lv2['[부자재(KRW)]'].fillna(0) +
            df_lv2['[본사공급자재(KRW)]'].fillna(0) +
            df_lv2['[택/라벨(KRW)]'].fillna(0)
        )
    
    # 총원가 계산 (원부자재 + 아트웍 + 공임 + 마진 + 경비)
    if '원부자재(USD)' in df_lv2.columns:
        df_lv2['총원가(USD)'] = (
            df_lv2['원부자재(USD)'].fillna(0) +
            df_lv2['[아트웍(USD)]'].fillna(0) +
            df_lv2['[공임(USD)]'].fillna(0) +
            df_lv2['[정상마진(USD)]'].fillna(0) +
            df_lv2['[경비(USD)]'].fillna(0)
        )
    
    if '원부자재(KRW)' in df_lv2.columns:
        df_lv2['총원가(KRW)'] = (
            df_lv2['원부자재(KRW)'].fillna(0) +
            df_lv2['[아트웍(KRW)]'].fillna(0) +
            df_lv2['[공임(KRW)]'].fillna(0) +
            df_lv2['[정상마진(KRW)]'].fillna(0) +
            df_lv2['[경비(KRW)]'].fillna(0)
        )
    
    lv2_file = f"{OUTPUT_DIR}/{base_filename}_LV2.csv"
    save_csv_with_encoding(df_lv2, lv2_file)
    
    # ============================================
    # 요약 정보 출력
    # ============================================
    print("\n" + "=" * 60)
    print("파일 생성 완료:")
    print(f"  - 원본: {original_file}")
    print(f"  - LV1:  {lv1_file}")
    print(f"  - LV2:  {lv2_file}")
    print("=" * 60)


def main():
    """메인 함수"""
    print("SQL to CSV 변환 스크립트 (~_LV2)")
    print("=" * 60)
    
    # 데이터베이스 연결
    conn = connect_to_database()
    if not conn:
        print("\n[ERROR] 데이터베이스 연결 실패. 스크립트를 종료합니다.")
        return
    
    try:
        # SQL 쿼리 실행
        df = execute_query(conn, SQL_QUERY)
        if df is None or df.empty:
            print("\n[WARN] 추출된 데이터가 없습니다.")
            return
        
        # 데이터 레벨별 처리 및 CSV 저장
        process_data_levels(df, BASE_FILENAME)
        
        print("\n[OK] 모든 작업이 완료되었습니다!")
        
    except Exception as e:
        print(f"\n[ERROR] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # 연결 종료
        if conn:
            conn.close()
            print("\n[INFO] 데이터베이스 연결 종료")


# ============================================
# 대안: SQL 파일에서 직접 읽기 (데이터베이스 연결 없이)
# ============================================
def sql_file_to_csv(sql_file_path: str, output_base_name: str):
    """
    SQL 파일의 쿼리를 실행하여 CSV로 변환
    (데이터베이스 연결이 필요한 경우)
    """
    try:
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            query = f.read()
        
        conn = connect_to_database()
        if not conn:
            return
        
        df = execute_query(conn, query)
        if df is not None:
            process_data_levels(df, output_base_name)
        
        conn.close()
    except Exception as e:
        print(f"[ERROR] SQL 파일 처리 실패: {e}")


# ============================================
# 대안: 기존 CSV 파일을 LV2까지 변환 (SQL 없이)
# ============================================
def csv_to_lv2(input_csv_path: str, output_base_name: Optional[str] = None):
    """
    기존 CSV 파일을 읽어서 LV2까지 변환
    SQL 연결이 필요 없는 경우 사용
    """
    if output_base_name is None:
        output_base_name = os.path.splitext(os.path.basename(input_csv_path))[0]
    
    print(f"\n[INFO] CSV 파일 읽기: {input_csv_path}")
    try:
        df = pd.read_csv(input_csv_path, encoding='utf-8-sig')
        print(f"[OK] {len(df)}개 행 로드 완료")
        
        process_data_levels(df, output_base_name)
    except Exception as e:
        print(f"[ERROR] CSV 파일 처리 실패: {e}")


if __name__ == '__main__':
    # 방법 1: SQL 데이터베이스에서 직접 추출
    # main()
    
    # 방법 2: 기존 CSV 파일을 LV2까지 변환 (SQL 연결 불필요)
    # csv_to_lv2('public/MLB FW.csv', 'MLB_FW')
    
    print("\n[INFO] 사용 방법:")
    print("1. 데이터베이스 연결 정보 설정 (DB_CONFIG)")
    print("2. SQL 쿼리 작성 (SQL_QUERY)")
    print("3. main() 함수 호출 주석 해제")
    print("\n또는")
    print("1. csv_to_lv2() 함수 사용하여 기존 CSV 파일 변환")

