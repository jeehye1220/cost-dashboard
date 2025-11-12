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

# summary JSON 파일에서 전년 KRW 원가율 읽기
def get_cost_rates_from_summary(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return {
                'usd': data['total']['costRate24F_usd'],
                'krw': data['total']['costRate24F_krw']
            }
    except:
        return None

# 각 시즌별 전년 원가율 가져오기
rates_25fw = get_cost_rates_from_summary('public/summary_25fw.json')
rates_non = get_cost_rates_from_summary('public/summary.json')
rates_kids = get_cost_rates_from_summary('public/summary_kids.json')
rates_discovery = get_cost_rates_from_summary('public/summary_discovery.json')

print(f"25FW - 전년 USD: {rates_25fw['usd']}, 전년 KRW: {rates_25fw['krw']}")
print(f"NON - 전년 USD: {rates_non['usd']}, 전년 KRW: {rates_non['krw']}")
print(f"KIDS - 전년 USD: {rates_kids['usd']}, 전년 KRW: {rates_kids['krw']}")
print(f"DISCOVERY - 전년 USD: {rates_discovery['usd']}, 전년 KRW: {rates_discovery['krw']}")

# CSV 파일 업데이트 함수
def update_csv_with_both_rates(csv_file, usd_rate, krw_rate):
    # 기존 CSV 읽기
    with codecs.open(csv_file, 'r', 'utf-8-sig') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    # prev_usd_cost_rate와 prev_krw_cost_rate 위치 찾기
    usd_idx = None
    krw_idx = None
    
    for i, row in enumerate(rows):
        if row[0] == 'prev_usd_cost_rate':
            usd_idx = i
        if row[0] == 'prev_krw_cost_rate':
            krw_idx = i
    
    # prev_usd_cost_rate 업데이트 또는 추가
    if usd_idx is not None:
        rows[usd_idx] = ['prev_usd_cost_rate', '', str(usd_rate)]
    else:
        rows.insert(1, ['prev_usd_cost_rate', '', str(usd_rate)])
        if krw_idx is not None:
            krw_idx += 1  # usd를 추가했으므로 인덱스 조정
    
    # prev_krw_cost_rate 업데이트 또는 추가
    if krw_idx is not None:
        rows[krw_idx] = ['prev_krw_cost_rate', '', str(krw_rate)]
    else:
        # usd 다음에 krw 추가
        insert_pos = 2 if usd_idx is None else (usd_idx if usd_idx is not None else 1) + 1
        rows.insert(insert_pos, ['prev_krw_cost_rate', '', str(krw_rate)])
    
    # 파일 저장
    write_csv(csv_file, rows)

# 각 CSV 파일 업데이트
if rates_25fw:
    update_csv_with_both_rates('public/insights_25fw.csv', rates_25fw['usd'], rates_25fw['krw'])
if rates_non:
    update_csv_with_both_rates('public/insights_non.csv', rates_non['usd'], rates_non['krw'])
if rates_kids:
    update_csv_with_both_rates('public/insights_kids.csv', rates_kids['usd'], rates_kids['krw'])
if rates_discovery:
    update_csv_with_both_rates('public/insights_discovery.csv', rates_discovery['usd'], rates_discovery['krw'])

print("\n모든 CSV 파일에 전년 USD/KRW 원가율 추가 완료!")

