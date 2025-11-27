"""
기존 CSV 파일들의 헤더를 일괄 변경하는 스크립트
TAG_USD금액(24F환율) → TAG_USD금액(전년환율)
"""
import os
import csv
from pathlib import Path

def update_csv_header(csv_file_path: str):
    """CSV 파일의 헤더를 변경"""
    try:
        # 파일 전체를 읽기
        with open(csv_file_path, 'r', encoding='utf-8-sig') as infile:
            content = infile.read()
        
        if not content:
            print(f"  [SKIP] {csv_file_path}: 빈 파일")
            return False
        
        # 헤더 변경 (첫 번째 줄만)
        if 'TAG_USD금액(24F환율)' in content:
            # 첫 번째 줄만 변경
            lines = content.split('\n')
            if lines:
                lines[0] = lines[0].replace('TAG_USD금액(24F환율)', 'TAG_USD금액(전년환율)')
                content = '\n'.join(lines)
                
                # 파일에 다시 쓰기
                with open(csv_file_path, 'w', encoding='utf-8-sig', newline='') as outfile:
                    outfile.write(content)
                
                print(f"  [OK] {csv_file_path}")
                return True
            else:
                print(f"  [SKIP] {csv_file_path}: 변경할 필드 없음")
                return False
        else:
            print(f"  [SKIP] {csv_file_path}: 변경할 필드 없음")
            return False
                
    except Exception as e:
        print(f"  [ERROR] {csv_file_path}: {e}")
        return False

def main():
    """public/COST RAW 폴더의 모든 CSV 파일 헤더 변경"""
    base_dir = Path('public/COST RAW')
    
    if not base_dir.exists():
        print(f"[ERROR] {base_dir} 폴더가 존재하지 않습니다.")
        return
    
    print("=" * 60)
    print("CSV 파일 헤더 일괄 변경")
    print("=" * 60)
    print(f"대상 폴더: {base_dir}")
    print(f"변경 내용: TAG_USD금액(24F환율) → TAG_USD금액(전년환율)")
    print()
    
    # 모든 CSV 파일 찾기
    csv_files = list(base_dir.rglob('*.csv'))
    
    if not csv_files:
        print("[INFO] 변경할 CSV 파일이 없습니다.")
        return
    
    print(f"[INFO] 총 {len(csv_files)}개 파일 발견")
    print()
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for csv_file in csv_files:
        if update_csv_header(str(csv_file)):
            updated_count += 1
        else:
            skipped_count += 1
    
    print()
    print("=" * 60)
    print(f"[완료] 변경: {updated_count}개, 스킵: {skipped_count}개")
    print("=" * 60)

if __name__ == '__main__':
    main()

