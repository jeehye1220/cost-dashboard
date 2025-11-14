#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KeyMetricsTable용 metrics 필드를 summary JSON에서 자동 생성하여 CSV 파일에 추가/업데이트
"""

import json
import csv
import codecs
import os
from pathlib import Path

def load_summary_json(filepath):
    """Summary JSON 파일 로드"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_fx_rates(fx_file):
    """FX CSV 파일에서 환율 로드"""
    try:
        with open(fx_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            next(reader)  # 헤더 스킵
            row = next(reader)
            return {
                'prev': float(row[0]) if row[0] else 1297.0,
                'curr': float(row[1]) if row[1] else 1415.0
            }
    except:
        return {'prev': 1297.0, 'curr': 1415.0}

def generate_metrics_insights(summary_data, fx_rates, tab_name):
    """Summary 데이터를 기반으로 metrics 인사이트 생성"""
    total = summary_data.get('total', {})
    
    # 기본 계산
    qty24F = total.get('qty24F', 0)
    qty25F = total.get('qty25F', 0)
    qtyYoY = total.get('qtyYoY', 100)
    
    costRate24F_usd = total.get('costRate24F_usd', 0)
    costRate25F_usd = total.get('costRate25F_usd', 0)
    costRateChange_usd = total.get('costRateChange_usd', 0)
    
    costRate24F_krw = total.get('costRate24F_krw', 0)
    costRate25F_krw = total.get('costRate25F_krw', 0)
    costRateChange_krw = total.get('costRateChange_krw', 0)
    
    avgTag24F_usd = total.get('avgTag24F_usd', 0)
    avgTag25F_usd = total.get('avgTag25F_usd', 0)
    tagYoY_usd = total.get('tagYoY_usd', 100)
    
    avgCost24F_usd = total.get('avgCost24F_usd', 0)
    avgCost25F_usd = total.get('avgCost25F_usd', 0)
    costYoY_usd = total.get('costYoY_usd', 100)
    costYoY_krw = total.get('costYoY_krw', 100)
    
    fxPrev = fx_rates.get('prev', 1297.0)
    fxCurr = fx_rates.get('curr', 1415.0)
    fxYoY = ((fxCurr / fxPrev - 1) * 100) if fxPrev > 0 else 0
    
    # 원가 MU 계산
    mu24F = (1 / (costRate24F_usd / 100)) if costRate24F_usd > 0 else 0
    mu25F = (1 / (costRate25F_usd / 100)) if costRate25F_usd > 0 else 0
    muChange = mu25F - mu24F
    
    # 총판매가 계산
    totalTagPrev_KRW = avgTag24F_usd * qty24F * fxPrev
    totalTagCurr_KRW = avgTag25F_usd * qty25F * fxPrev
    tagAmountYoY = ((totalTagCurr_KRW / totalTagPrev_KRW - 1) * 100) if totalTagPrev_KRW > 0 else 0
    
    # 탭별 맞춤 생성
    if tab_name == 'MLB KIDS':
        metrics_title = f"핵심 성과: 생산수량 {qtyYoY:.1f}% 감소, TAG +{(tagYoY_usd-100):.1f}% 상승으로 생산단가 +{(costYoY_usd-100):.1f}% 증가에도 USD 원가율 {abs(costRateChange_usd):.1f}%p 개선"
        metrics_volume = f"생산수량 {(qty24F/10000):.1f}만개 → {(qty25F/10000):.1f}만개 ({qtyYoY:.1f}%) 감소. 시장 축소 또는 전략적 물량 조정으로 추정됨."
        metrics_tag = f"평균TAG ${(avgTag25F_usd - avgTag24F_usd):.2f} 상승(+{(tagYoY_usd-100):.1f}%)으로 원가율 방어. TAG 상승 전략이 원가 인상 압력을 상쇄하여 USD 원가율 {abs(costRateChange_usd):.1f}%p 개선 달성. 원가M/U {mu24F:.2f}→{mu25F:.2f} (+{muChange:.2f})로 수익성 개선됨."
        metrics_fx = f"환율 +{fxYoY:.1f}% 상승({fxPrev:.2f}→{fxCurr:.2f}원)으로 KRW 기준 생산단가 +{(costYoY_krw-100):.1f}% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +{costRateChange_krw:.1f}%p 악화."
        metrics_conclusion = f"KIDS는 물량 감소(-{(100-qtyYoY):.1f}%)에도 TAG 인상 전략(+{(tagYoY_usd-100):.1f}%)으로 USD 기준 원가율을 개선했으나, 환율 급등(+{fxYoY:.1f}%)으로 KRW 실손익은 압박받는 구조. 물량 회복이 핵심 과제."
    
    elif tab_name == 'DISCOVERY':
        # DISCOVERY 데이터 분석
        material24F = total.get('material24F_usd', 0)
        material25F = total.get('material25F_usd', 0)
        materialRate24F = total.get('materialRate24F_usd', 0)
        materialRate25F = total.get('materialRate25F_usd', 0)
        labor24F = total.get('labor24F_usd', 0)
        labor25F = total.get('labor25F_usd', 0)
        laborRate24F = total.get('laborRate24F_usd', 0)
        laborRate25F = total.get('laborRate25F_usd', 0)
        avgCost24F = total.get('avgCost24F_usd', 0)
        avgCost25F = total.get('avgCost25F_usd', 0)
        avgTag24F = total.get('avgTag24F_usd', 0)
        avgTag25F = total.get('avgTag25F_usd', 0)
        tagYoY = total.get('tagYoY_usd', 100)
        costYoY = total.get('costYoY_usd', 100)
        margin24F = total.get('margin24F_usd', 0)
        margin25F = total.get('margin25F_usd', 0)
        expense24F = total.get('expense24F_usd', 0)
        expense25F = total.get('expense25F_usd', 0)
        
        # 카테고리별 데이터 추출
        categories = summary_data.get('categories', [])
        outer_data = None
        inner_labor = None
        bottom_labor = None
        for cat in categories:
            if cat.get('category') == 'Outer':
                outer_data = {
                    'qty24F': cat.get('qty24F', 0),
                    'qty25F': cat.get('qty25F', 0),
                    'material24F': cat.get('material24F_usd', 0),
                    'material25F': cat.get('material25F_usd', 0)
                }
            elif cat.get('category') == 'Inner':
                inner_labor = {
                    'prev': cat.get('labor24F_usd', 0),
                    'curr': cat.get('labor25F_usd', 0)
                }
            elif cat.get('category') == 'Bottom':
                bottom_labor = {
                    'prev': cat.get('labor24F_usd', 0),
                    'curr': cat.get('labor25F_usd', 0)
                }
        
        # Outer 비중 계산
        qty24F = total.get('qty24F', 1)
        qty25F = total.get('qty25F', 1)
        outer_ratio = (outer_data['qty25F'] / qty25F * 100) if outer_data and qty25F > 0 else 0
        
        # 핵심 메시지: TAG 거의 정체(+0.3%)인데 원가 +2.9% 상승으로 원가율 악화
        metrics_title = f"TAG 거의 정체(+{(tagYoY-100):.1f}%) 상황에서 원가 상승(+{(costYoY-100):.1f}%)으로 원가율 {costRateChange_usd:.1f}%p 악화. 원부자재 단가 상승이 주원인."
        
        # 원부자재 단가 상승 설명
        material_change = material25F - material24F
        material_change_pct = ((material25F / material24F - 1) * 100) if material24F > 0 else 0
        metrics_volume = f"원부자재 단가 상승: 원부자재 단가 {material24F:.2f} → {material25F:.2f} USD(+{material_change_pct:.1f}%) 상승. 소재비 비중 {materialRate24F:.1f}% → {materialRate25F:.1f}%로 +{(materialRate25F-materialRate24F):.1f}%p 확대. 고가 소재(다운, 기능성 원단 등) 사용 비중 확대 및 글로벌 원자재 시세 상승 영향."
        
        # 공임비 설명 (Outer 증가 vs Inner/Bottom 절감)
        if outer_data:
            outer_labor_prev = None
            outer_labor_curr = None
            for cat in categories:
                if cat.get('category') == 'Outer':
                    outer_labor_prev = cat.get('labor24F_usd', 0)
                    outer_labor_curr = cat.get('labor25F_usd', 0)
                    break
            
            labor_desc_parts = []
            if outer_labor_prev and outer_labor_curr:
                outer_labor_change = outer_labor_curr - outer_labor_prev
                if outer_labor_change > 0:
                    labor_desc_parts.append(f"Outer(비중 {outer_ratio:.0f}%) 공임비 {outer_labor_prev:.2f} → {outer_labor_curr:.2f} USD(+{outer_labor_change:.2f}) 상승")
            
            if inner_labor:
                inner_change = inner_labor['curr'] - inner_labor['prev']
                if inner_change < 0:
                    labor_desc_parts.append(f"Inner {inner_labor['prev']:.2f} → {inner_labor['curr']:.2f} USD({inner_change:.2f}) 절감")
            
            if bottom_labor:
                bottom_change = bottom_labor['curr'] - bottom_labor['prev']
                if bottom_change < 0:
                    labor_desc_parts.append(f"Bottom {bottom_labor['prev']:.2f} → {bottom_labor['curr']:.2f} USD({bottom_change:.2f}) 절감")
            
            if labor_desc_parts:
                metrics_tag = f"공임비: {' | '.join(labor_desc_parts)}. 전체 평균 공임비 {labor24F:.2f} → {labor25F:.2f} USD({labor25F-labor24F:.2f})로 소폭 감소. 공임비율 {laborRate24F:.1f}% → {laborRate25F:.1f}%로 -{(laborRate24F-laborRate25F):.1f}%p 개선."
            else:
                metrics_tag = f"공임비: 전체 평균 공임비 {labor24F:.2f} → {labor25F:.2f} USD. 공임비율 {laborRate24F:.1f}% → {laborRate25F:.1f}%."
        else:
            metrics_tag = f"공임비: 전체 평균 공임비 {labor24F:.2f} → {labor25F:.2f} USD. 공임비율 {laborRate24F:.1f}% → {laborRate25F:.1f}%."
        
        # 환율 효과 설명
        fx_effect = costRateChange_krw - costRateChange_usd
        metrics_fx = f"환율 효과: 환율 {fxPrev:.2f} → {fxCurr:.2f}(+{fxYoY:.1f}%) 상승으로 KRW 기준 원가율에 +{fx_effect:.1f}%p 추가 악화. USD 기준 {costRate25F_usd:.1f}% 원가율이 KRW 기준 {costRate25F_krw:.1f}%로 상승. 기준환율 관리 필요."
        
        # 결론: Outer 비중과 환율 영향
        if outer_data:
            metrics_conclusion = f"KRW 기준 원가율 악화: USD 기준 {costRate25F_usd:.1f}% 원가율에 환율 상승(+{fxYoY:.1f}%)이 물리며 KRW 기준 {costRate25F_krw:.1f}%로 +{costRateChange_krw:.1f}%p 악화. Outer 카테고리 비중 {outer_ratio:.0f}%로 환율 영향 집중. 다운점퍼 등 Outer 제품의 원부자재 단가가 높아(전년 {outer_data['material24F']:.2f} USD, 당년 {outer_data['material25F']:.2f} USD) 환율 변동에 민감. 추가 환율 악화 시 원가 방어 전략 필요."
        else:
            metrics_conclusion = f"KRW 기준 원가율 악화: USD 기준 {costRate25F_usd:.1f}% 원가율에 환율 상승(+{fxYoY:.1f}%)이 물리며 KRW 기준 {costRate25F_krw:.1f}%로 +{costRateChange_krw:.1f}%p 악화. 추가 환율 악화 시 원가 방어 전략 필요."
    
    else:  # MLB 25FW, MLB NON
        metrics_title = f"핵심 성과: 생산수량 {qtyYoY:.1f}% 증가, TAG +{tagAmountYoY:.1f}% 상승으로 생산단가 +{(costYoY_usd-100):.1f}% 증가에도 USD 원가율 {abs(costRateChange_usd):.1f}%p 개선"
        metrics_volume = f"생산수량 {(qty24F/10000):.1f}만개 → {(qty25F/10000):.1f}만개 (+{qtyYoY:.1f}%) 증가로 스케일 메리트 확보. 총판매가는 {tagAmountYoY:.1f}% 증가하여 고가 제품 믹스 확대 전략 확인됨."
        metrics_tag = f"평균TAG ${(avgTag25F_usd - avgTag24F_usd):.2f} 상승(+{(tagYoY_usd-100):.1f}%)으로 원가율 {abs(costRateChange_usd):.1f}%p 개선 달성. 원가M/U {mu24F:.2f}→{mu25F:.2f} (+{muChange:.2f})로 수익성 개선됨."
        metrics_fx = f"환율 +{fxYoY:.1f}% 상승({fxPrev:.2f}→{fxCurr:.2f}원)으로 KRW 기준 생산단가 +{(costYoY_krw-100):.1f}% 급증. USD 기준 원가율 개선 효과가 환율 악화로 상쇄되어 KRW 원가율 +{costRateChange_krw:.1f}%p 악화."
        metrics_conclusion = f"{tab_name}은 대량생산(+{qtyYoY:.1f}%)과 고가 믹스 전략으로 USD 기준 원가율을 방어했으나, 생산단가 인상(+{(costYoY_usd-100):.1f}%)과 환율 급등(+{fxYoY:.1f}%)으로 KRW 실손익은 압박받는 구조. 향후 생산단가 절감이 핵심 과제."
    
    return {
        'metrics_title': metrics_title,
        'metrics_volume': metrics_volume,
        'metrics_tag': metrics_tag,
        'metrics_fx': metrics_fx,
        'metrics_conclusion': metrics_conclusion
    }

def update_csv_with_metrics(csv_file, metrics_data):
    """CSV 파일에 metrics 필드 추가/업데이트 (기존 내용 유지)"""
    # 기존 CSV 읽기
    existing_data = {}
    rows = []
    
    if os.path.exists(csv_file):
        with codecs.open(csv_file, 'r', 'utf-8-sig') as f:
            reader = csv.reader(f)
            header = next(reader)
            for row in reader:
                if len(row) >= 3:
                    section = row[0].strip()
                    key = row[1].strip()
                    value = row[2].strip() if len(row) > 2 else ''
                    existing_data[section] = value
                    rows.append([section, key, value])
    
    # metrics 필드 업데이트 (기존에 있으면 덮어쓰기, 없으면 추가)
    metrics_fields = ['metrics_title', 'metrics_volume', 'metrics_tag', 'metrics_fx', 'metrics_conclusion']
    for field in metrics_fields:
        if field in metrics_data:
            existing_data[field] = metrics_data[field]
            # 기존 행이 있으면 업데이트, 없으면 추가
            found = False
            for i, row in enumerate(rows):
                if row[0] == field:
                    rows[i] = [field, '', metrics_data[field]]
                    found = True
                    break
            if not found:
                rows.append([field, '', metrics_data[field]])
    
    # CSV 저장 (UTF-8 BOM)
    with codecs.open(csv_file, 'w', 'utf-8-sig') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerow(['section', 'key', 'value'])
        writer.writerows(rows)
    
    print(f"[OK] {csv_file} 업데이트 완료 (metrics 필드 추가/업데이트)")

def main():
    """메인 함수"""
    print("KeyMetricsTable metrics 필드 자동 생성 스크립트")
    print("=" * 60)
    
    # 각 브랜드별 처리
    brands = [
        {
            'name': 'MLB 25FW',
            'summary_file': 'public/summary_25fw.json',
            'fx_file': 'public/FX FW.csv',
            'csv_file': 'public/insights_25fw.csv',
            'season_type': '25FW'
        },
        {
            'name': 'MLB NON',
            'summary_file': 'public/summary.json',
            'fx_file': 'public/FX 251111.csv',
            'csv_file': 'public/insights_non.csv',
            'season_type': 'NON'
        },
        {
            'name': 'MLB KIDS',
            'summary_file': 'public/summary_kids.json',
            'fx_file': 'public/MLB KIDS FX FW.csv',
            'csv_file': 'public/insights_kids.csv',
            'season_type': 'KIDS'
        },
        {
            'name': 'DISCOVERY',
            'summary_file': 'public/summary_discovery.json',
            'fx_file': 'public/DX FX FW.csv',
            'csv_file': 'public/insights_discovery.csv',
            'season_type': 'DISCOVERY'
        }
    ]
    
    for brand in brands:
        print(f"\n[{brand['name']}] 처리 중...")
        
        # Summary JSON 로드
        if not os.path.exists(brand['summary_file']):
            print(f"  [WARN] {brand['summary_file']} 파일이 없습니다. 스킵합니다.")
            continue
        
        summary_data = load_summary_json(brand['summary_file'])
        
        # FX 환율 로드
        fx_rates = load_fx_rates(brand['fx_file'])
        
        # Metrics 인사이트 생성
        metrics_data = generate_metrics_insights(summary_data, fx_rates, brand['name'])
        
        # CSV 파일 업데이트
        update_csv_with_metrics(brand['csv_file'], metrics_data)
    
    print("\n" + "=" * 60)
    print("모든 브랜드 metrics 필드 생성 완료!")
    print("\n[INFO] 이제 Excel에서 CSV 파일을 열어 수정할 수 있습니다.")
    print("       수정한 내용은 하드코딩되지 않고 CSV 파일에만 저장됩니다.")

if __name__ == '__main__':
    main()

