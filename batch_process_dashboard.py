#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
배치 처리 스크립트 - 대시보드 데이터 생성

사용 방법:
    python batch_process_dashboard.py --season 26FW --brands M I X ST V

이 스크립트는:
1. 스노우플레이크에서 데이터를 가공하여 CSV 생성
2. COST RAW 폴더에 CSV 파일 저장
3. SUMMARY JSON 생성
4. 대시보드 라우팅 자동 추가 (수동 확인 필요)
"""

import argparse
import os
import sys
import subprocess
from pathlib import Path
import pandas as pd

# 브랜드 코드 매핑
BRAND_MAP = {
    'M': 'MLB',
    'I': 'MLB KIDS',
    'X': 'DISCOVERY',
    'ST': 'SERGIO TACCHINI',
    'V': 'DUVETICA',
}

def create_directory_structure(season: str, brands: list):
    """COST RAW 폴더 구조 생성"""
    base_dir = Path('public/COST RAW') / season
    base_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n[1] 폴더 구조 생성: {base_dir}")
    print(f"   > 브랜드: {', '.join(brands)}")
    
    return base_dir

def create_empty_csv_template(season: str, brand: str):
    """빈 CSV 템플릿 생성 (헤더만 있는 파일)"""
    import pandas as pd
    
    header = [
        '브랜드', '시즌', '스타일', '중분류', '아이템명', 'PO', 'TAG', '수량', 
        'TAG_총금액', 'TAG_USD금액(24F환율)', '원가견적번호', '발주통화', '제조업체', '견적서제출일자',
        '(USD)_원자재', '(USD)_아트웍', '(USD)_부자재', '(USD)_택/라벨', '(USD) 공임', 
        '(USD)본사공급자재', '(USD)_정상마진', '(USD)_경비',
        '(KRW)_원자재', '(KRW)_아트웍', '(KRW)_부자재', '(KRW)_택/라벨', '(KRW)_공임', 
        '(KRW)본사공급자재', '(KRW)_정상마진', '(KRW)_경비',
        'USD_재료계(원/부/택/본공)_총금액(단가×수량)', 'USD_아트웍_총금액(단가×수량)', 
        'USD_공임_총금액(단가×수량)', 'USD_정상마진_총금액(단가×수량)', 'USD_경비_총금액(단가×수량)',
        'KRW_재료계(원/부/택/본공)_총금액(단가×수량)', 'KRW_아트웍_총금액(단가×수량)', 
        'KRW_공임_총금액(단가×수량)', 'KRW_정상마진_총금액(단가×수량)', 'KRW_경비_총금액(단가×수량)'
    ]
    
    csv_file = Path('public/COST RAW') / season / f"{brand}_{season}.csv"
    
    if csv_file.exists():
        print(f"   > {csv_file} 이미 존재합니다. 건너뜁니다.")
        return
    
    df = pd.DataFrame(columns=header)
    df.to_csv(csv_file, index=False, encoding='utf-8-sig', lineterminator='\n')
    print(f"   > 빈 템플릿 생성: {csv_file}")

def process_csv_generation(season: str, brand: str):
    """
    CSV 생성 처리
    실제로는 sql_to_csv_lv2.py 또는 sql_to_csv_with_fx.py를 호출해야 함
    """
    print(f"\n[2] CSV 생성 처리: {brand}_{season}")
    
    # CSV 파일이 없으면 빈 템플릿 생성
    csv_file = Path('public/COST RAW') / season / f"{brand}_{season}.csv"
    if not csv_file.exists():
        print(f"   > CSV 파일이 없어 빈 템플릿을 생성합니다.")
        create_empty_csv_template(season, brand)
        print(f"   > 스노우플레이크에서 데이터 추출 후 파일을 채워주세요.")
    else:
        print(f"   > CSV 파일 존재: {csv_file}")
        print(f"   > 참고: sql_to_csv_with_fx.py 스크립트로 데이터 업데이트 가능")

def generate_summary(season: str, brand: str):
    """SUMMARY JSON 생성"""
    print(f"\n[3] SUMMARY JSON 생성: {brand}_{season}")
    
    # 시즌에 따라 적절한 스크립트 선택
    if season == '26SS':
        script_name = 'generate_summary_26ss.py'
        csv_file = Path('public/COST RAW') / season / f"{brand}_{season}.csv"
        
        # CSV 파일이 있고 데이터가 있으면 SUMMARY 생성
        if csv_file.exists():
            try:
                import pandas as pd
                df = pd.read_csv(csv_file, encoding='utf-8-sig')
                if len(df) > 0:
                    print(f"   > {script_name} 실행 중...")
                    result = subprocess.run(
                        ['python', script_name, '--brand', brand],
                        capture_output=True,
                        text=True
                    )
                    if result.returncode == 0:
                        print(f"   > SUMMARY 생성 완료")
                    else:
                        print(f"   > 오류: {result.stderr}")
                else:
                    print(f"   > CSV 파일이 비어있습니다. 데이터를 추가한 후 다시 실행하세요.")
            except Exception as e:
                print(f"   > 오류 발생: {e}")
        else:
            print(f"   > CSV 파일이 없습니다. 먼저 CSV 파일을 생성하세요.")
    else:
        print(f"   > {season} 시즌용 SUMMARY 생성 스크립트는 아직 구현되지 않았습니다.")

def verify_files(season: str, brands: list):
    """생성된 파일 확인"""
    print(f"\n[4] 파일 확인:")
    base_dir = Path('public/COST RAW') / season
    
    all_ok = True
    for brand in brands:
        csv_file = base_dir / f"{brand}_{season}.csv"
        summary_file = base_dir / f"summary_{season.lower()}_{brand.lower()}.json"
        
        csv_exists = csv_file.exists()
        summary_exists = summary_file.exists()
        
        status = "[OK]" if (csv_exists and summary_exists) else "[X]"
        print(f"   {status} {brand}: CSV={csv_exists}, SUMMARY={summary_exists}")
        
        if not csv_exists or not summary_exists:
            all_ok = False
    
    return all_ok

def print_next_steps(season: str, brands: list):
    """다음 단계 안내"""
    print(f"\n[5] 다음 단계:")
    print(f"   1. 생성된 CSV 파일 확인: public/COST RAW/{season}/")
    print(f"   2. SUMMARY JSON 파일 확인: public/COST RAW/{season}/")
    print(f"   3. 대시보드 라우팅 확인:")
    for brand in brands:
        brand_id = f"{season}-{brand}" if season.startswith('26') else brand
        print(f"      - /dashboard/{brand_id}")
    print(f"   4. 홈페이지에서 브랜드 카드 확인")
    print(f"   5. 개발 서버 재시작 (필요시)")

def main():
    parser = argparse.ArgumentParser(
        description='대시보드 데이터 배치 처리 스크립트',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python batch_process_dashboard.py --season 26FW --brands M I X ST V
  python batch_process_dashboard.py --season 26SS --brands M I X
        """
    )
    
    parser.add_argument(
        '--season',
        type=str,
        required=True,
        help='시즌 코드 (예: 26FW, 26SS)'
    )
    
    parser.add_argument(
        '--brands',
        nargs='+',
        required=True,
        choices=['M', 'I', 'X', 'ST', 'V'],
        help='브랜드 코드 리스트 (예: M I X ST V)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("F&F 원가 대시보드 - 배치 처리 스크립트")
    print("=" * 60)
    print(f"\n시즌: {args.season}")
    print(f"브랜드: {', '.join(args.brands)}")
    
    # 1. 폴더 구조 생성
    base_dir = create_directory_structure(args.season, args.brands)
    
    # 2. CSV 생성 (실제로는 스노우플레이크에서 데이터 추출 필요)
    for brand in args.brands:
        process_csv_generation(args.season, brand)
    
    # 3. SUMMARY JSON 생성
    for brand in args.brands:
        generate_summary(args.season, brand)
    
    # 4. 파일 확인
    files_ok = verify_files(args.season, args.brands)
    
    # 5. 다음 단계 안내
    print_next_steps(args.season, args.brands)
    
    print("\n" + "=" * 60)
    if files_ok:
        print("[완료] 모든 파일이 생성되었습니다!")
    else:
        print("[주의] 일부 파일이 누락되었습니다. 위의 단계를 확인하세요.")
    print("=" * 60)

if __name__ == '__main__':
    main()

