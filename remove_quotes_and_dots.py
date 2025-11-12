#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSV 파일에서 따옴표(")와 말끝 온점(.) 제거 스크립트
"""

import csv
import codecs
import re
import os

def clean_text(text):
    """텍스트에서 따옴표와 말끝 온점 제거"""
    if not text:
        return text
    
    # 모든 종류의 따옴표 제거
    text = text.replace('"', '')
    text = text.replace("'", '')
    # 연속된 따옴표도 제거
    while '""' in text:
        text = text.replace('""', '')
    
    # 말끝 온점 제거 (문장 끝의 . 제거)
    # 마지막 문자가 .인 경우 제거 (숫자나 URL의 .은 유지하기 위해 마지막이 .으로 끝나는 경우만)
    text = text.rstrip()
    while text and text[-1] == '.':
        text = text[:-1].rstrip()
    
    # 공백 정리
    text = text.strip()
    
    return text

def process_csv_file(filepath):
    """CSV 파일 처리"""
    if not os.path.exists(filepath):
        print(f"[WARN] {filepath} 파일이 없습니다. 스킵합니다.")
        return
    
    print(f"\n[{filepath}] 처리 중...")
    
    # CSV 읽기
    rows = []
    with codecs.open(filepath, 'r', 'utf-8-sig') as f:
        reader = csv.reader(f)
        for row in reader:
            # value 컬럼(3번째 컬럼, 인덱스 2)만 처리
            if len(row) >= 3:
                row[2] = clean_text(row[2])
            rows.append(row)
    
    # CSV 저장 (UTF-8 BOM) - 값에 쉼표가 없으면 따옴표 없이 저장
    with codecs.open(filepath, 'w', 'utf-8-sig') as f:
        writer = csv.writer(f, lineterminator='\n', quoting=csv.QUOTE_MINIMAL)
        for row in rows:
            # 값에 쉼표가 없으면 따옴표 없이 수동 저장
            if len(row) >= 3 and ',' not in row[2]:
                # 쉼표가 없으면 따옴표 없이 저장
                f.write(f"{row[0]},{row[1]},{row[2]}\n")
            else:
                # 쉼표가 있으면 CSV writer 사용 (자동으로 따옴표 추가)
                writer.writerow(row)
    
    print(f"[OK] {filepath} 업데이트 완료")

def main():
    """메인 함수"""
    print("CSV 파일에서 따옴표와 말끝 온점 제거 스크립트")
    print("=" * 60)
    
    # 모든 브랜드 CSV 파일 처리
    csv_files = [
        'public/insights_25fw.csv',
        'public/insights_non.csv',
        'public/insights_kids.csv',
        'public/insights_discovery.csv',
    ]
    
    for csv_file in csv_files:
        process_csv_file(csv_file)
    
    print("\n" + "=" * 60)
    print("모든 CSV 파일 처리 완료!")
    print("\n[INFO] 따옴표(\")와 말끝 온점(.)이 제거되었습니다.")

if __name__ == '__main__':
    main()

