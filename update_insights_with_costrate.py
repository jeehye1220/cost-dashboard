# -*- coding: utf-8 -*-
import csv
import codecs
import json

def write_csv(filename, data):
    """UTF-8 BOM으로 CSV 파일 저장"""
    with codecs.open(filename, 'w', 'utf-8-sig') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerows(data)
    print(f"{filename} 업데이트 완료!")

# summary JSON 파일에서 전년 원가율 읽기
def get_cost_rate_from_summary(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data['total']['costRate24F_usd']
    except:
        return None

# 각 시즌별 전년 원가율 가져오기
rate_25fw = get_cost_rate_from_summary('public/summary_25fw.json')
rate_non = get_cost_rate_from_summary('public/summary.json')
rate_kids = get_cost_rate_from_summary('public/summary_kids.json')
rate_discovery = get_cost_rate_from_summary('public/summary_discovery.json')

print(f"25FW 전년 원가율: {rate_25fw}")
print(f"NON 전년 원가율: {rate_non}")
print(f"KIDS 전년 원가율: {rate_kids}")
print(f"DISCOVERY 전년 원가율: {rate_discovery}")

# CSV 파일 업데이트 함수
def update_csv_with_costrate(csv_file, cost_rate):
    # 기존 CSV 읽기
    with codecs.open(csv_file, 'r', 'utf-8-sig') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    # prev_usd_cost_rate 행이 있는지 확인
    has_prev_rate = any(row[0] == 'prev_usd_cost_rate' for row in rows)
    
    if not has_prev_rate:
        # 헤더 다음에 prev_usd_cost_rate 추가
        rows.insert(1, ['prev_usd_cost_rate', '', str(cost_rate)])
    else:
        # 기존 값 업데이트
        for i, row in enumerate(rows):
            if row[0] == 'prev_usd_cost_rate':
                rows[i] = ['prev_usd_cost_rate', '', str(cost_rate)]
                break
    
    # 파일 저장
    write_csv(csv_file, rows)

# 각 CSV 파일 업데이트
if rate_25fw:
    update_csv_with_costrate('public/insights_25fw.csv', rate_25fw)
if rate_non:
    update_csv_with_costrate('public/insights_non.csv', rate_non)
if rate_kids:
    update_csv_with_costrate('public/insights_kids.csv', rate_kids)
if rate_discovery:
    update_csv_with_costrate('public/insights_discovery.csv', rate_discovery)

print("\n모든 CSV 파일에 전년 USD 원가율 추가 완료!")

