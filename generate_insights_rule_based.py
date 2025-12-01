#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
규칙 기반 인사이트 생성 스크립트 (AI API 없음)

SUMMARY JSON 데이터를 분석하여 템플릿 기반으로 인사이트를 생성합니다.
비용이 발생하지 않습니다.

사용 방법:
    python generate_insights_rule_based.py --season 26SS --brands M I X ST V
"""

import json
import os
import argparse
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any

# FX 파일 경로
FX_FILE = 'public/COST RAW/FX.csv'
FX_NON_FILE = 'public/COST RAW/FX_NON.csv'


def load_fx_rates(brand_code: str, season_code: str, is_non_season: bool = False) -> Dict[str, float]:
    """FX.csv 또는 FX_NON.csv에서 환율 정보 로드"""
    if is_non_season:
        # FX_NON.csv 구조: 브랜드,기간,시즌,환율
        try:
            df_fx = pd.read_csv(FX_NON_FILE, encoding='utf-8-sig')
            
            prev_rate = 0.0
            curr_rate = 0.0
            
            # 전년 환율 조회
            prev_filtered = df_fx[
                (df_fx['브랜드'] == brand_code) &
                (df_fx['기간'] == '전년') &
                (df_fx['시즌'] == season_code)
            ]
            if len(prev_filtered) > 0:
                prev_rate = float(prev_filtered.iloc[0]['환율'])
            
            # 당년 환율 조회
            curr_filtered = df_fx[
                (df_fx['브랜드'] == brand_code) &
                (df_fx['기간'] == '당년') &
                (df_fx['시즌'] == season_code)
            ]
            if len(curr_filtered) > 0:
                curr_rate = float(curr_filtered.iloc[0]['환율'])
            
            # FX_NON.csv에서 환율이 0이면 0으로 반환 (1300.0 기본값 사용 안 함)
            return {'prev': prev_rate, 'curr': curr_rate}
        except Exception as e:
            print(f"[WARN] FX_NON.csv 파일 로드 실패: {e}")
            return {'prev': 0.0, 'curr': 0.0}
    else:
        # 기존 FX.csv 로드
        try:
            df_fx = pd.read_csv(FX_FILE, encoding='utf-8-sig')
            
            # 카테고리는 '의류'로 고정
            filtered = df_fx[
                (df_fx['브랜드'] == brand_code) &
                (df_fx['시즌'] == season_code) &
                (df_fx['카테고리'] == '의류')
            ]
            
            if len(filtered) > 0:
                rate = float(filtered.iloc[0]['환율'])
                return {'prev': rate, 'curr': rate}  # 전년/당년 동일 시즌 코드면 같은 환율
        except Exception as e:
            print(f"[WARN] FX 파일 로드 실패: {e}")
        
        return {'prev': 1300.0, 'curr': 1300.0}


def get_previous_season(season: str) -> str:
    """전시즌 코드 반환"""
    season_map = {
        '26SS': '25SS', '26S': '25S',
        '25SS': '24SS', '25S': '24S',
        '25FW': '24FW', '25F': '24F',
        '24SS': '23SS', '24S': '23S',
        '24FW': '23FW', '24F': '23F',
    }
    return season_map.get(season, '')


def convert_season_format(season: str) -> str:
    """시즌 형식 변환 (26SS → 26S)"""
    if season.endswith('SS'):
        return season.replace('SS', 'S')
    if season.endswith('FW'):
        return season.replace('FW', 'F')
    return season


def generate_usd_summary(total: Dict[str, Any], season: str) -> str:
    """USD 기준 요약 생성"""
    cost_rate_change = total.get('costRateChange_usd', 0)
    cost_rate_prev = total.get('costRate24F_usd', 0)
    cost_rate_curr = total.get('costRate25F_usd', 0)
    
    # 주요 변동 항목 찾기
    material_change = (total.get('materialRate25F_usd', 0) - total.get('materialRate24F_usd', 0))
    artwork_change = (total.get('artworkRate25F_usd', 0) - total.get('artworkRate24F_usd', 0))
    labor_change = (total.get('laborRate25F_usd', 0) - total.get('laborRate24F_usd', 0))
    margin_change = (total.get('marginRate25F_usd', 0) - total.get('marginRate24F_usd', 0))
    expense_change = (total.get('expenseRate25F_usd', 0) - total.get('expenseRate24F_usd', 0))
    
    # 가장 큰 변동 항목 찾기
    changes = {
        '재료계': material_change,
        '아트웍': artwork_change,
        '공임': labor_change,
        '마진': margin_change,
        '경비': expense_change
    }
    max_change_item = max(changes.items(), key=lambda x: abs(x[1]))
    
    direction = "개선" if cost_rate_change < 0 else "악화"
    sign = "" if cost_rate_change < 0 else "+"
    
    if abs(cost_rate_change) < 0.1:
        return f"{season} 시즌 USD 기준 원가율은 {cost_rate_prev:.1f}%로 전시즌 대비 거의 변화가 없었습니다."
    
    return f"{season} 시즌 USD 기준 원가율은 {cost_rate_prev:.1f}%에서 {cost_rate_curr:.1f}%로 {sign}{abs(cost_rate_change):.1f}%p {direction}되었습니다. 주요 원인은 {max_change_item[0]} 원가율 {sign}{abs(max_change_item[1]):.1f}%p 변동입니다."


def generate_krw_summary(total: Dict[str, Any], season: str, fx_rates: Dict[str, float]) -> str:
    """KRW 기준 요약 생성"""
    cost_rate_curr_usd = total.get('costRate25F_usd', 0)
    cost_rate_curr_krw = total.get('costRate25F_krw', 0)
    
    # 환율 효과: 당년 KRW 원가율 - 당년 USD 원가율
    fx_effect = cost_rate_curr_krw - cost_rate_curr_usd
    # 환율 변동률: (현재/이전 * 100) - 100
    fx_change = ((fx_rates['curr'] / fx_rates['prev']) * 100) - 100 if fx_rates['prev'] > 0 else 0
    
    # 환율 변동 방향
    fx_direction = "하락" if fx_change < 0 else "상승"
    # 환율 효과 방향 (fx_effect < 0이면 개선, > 0이면 악화)
    fx_effect_direction = "개선" if fx_effect < 0 else "악화"
    fx_effect_sign = "" if fx_effect < 0 else "+"
    
    if abs(fx_effect) > 0.5:
        return f"당년 USD 원가율 {cost_rate_curr_usd:.1f}%에서 환율 {abs(fx_change):.1f}% {fx_direction}({fx_rates['prev']:.0f}→{fx_rates['curr']:.0f}원) 효과로 당년 KRW 원가율은 {cost_rate_curr_krw:.1f}%로 {fx_effect_sign}{abs(fx_effect):.1f}%p {fx_effect_direction}되었습니다."
    
    return f"당년 USD 원가율 {cost_rate_curr_usd:.1f}%에서 환율 변동 효과로 당년 KRW 원가율은 {cost_rate_curr_krw:.1f}%로 나타났습니다."


def generate_actions(total: Dict[str, Any]) -> List[str]:
    """액션 아이템 생성"""
    actions = []
    
    material_change = (total.get('materialRate25F_usd', 0) - total.get('materialRate24F_usd', 0))
    labor_change = (total.get('laborRate25F_usd', 0) - total.get('laborRate24F_usd', 0))
    cost_rate_change = total.get('costRateChange_usd', 0)
    
    if material_change > 0.5:
        actions.append(f"소재비 절감: 원자재 단가 상승({material_change:+.1f}%p)으로 소재 사양 재검토 및 대체소재 전환 검토 필요.")
    
    if labor_change > 0.5:
        actions.append(f"공임 효율화: 공임 원가율 상승({labor_change:+.1f}%p)으로 봉제 자동화 및 작업공정 단순화 추진.")
    
    if cost_rate_change > 0.5:
        actions.append(f"원가 모니터링: USD/KRW 원가율을 분리 관리하여 환율 영향 실시간 추적.")
    
    # 기본 액션
    if not actions:
        actions.append("원가 구조 개선: 세부 항목별 원가율 모니터링 강화.")
        actions.append("소싱 다변화: 공급망 리스크 분산 및 원가 안정성 확보.")
    
    return actions[:3]  # 최대 3개


def generate_risks(total: Dict[str, Any], fx_rates: Dict[str, float]) -> List[str]:
    """리스크 아이템 생성"""
    risks = []
    
    cost_rate_change_usd = total.get('costRateChange_usd', 0)
    cost_rate_change_krw = total.get('costRateChange_krw', 0)
    fx_change = ((fx_rates['curr'] / fx_rates['prev']) * 100) - 100 if fx_rates['prev'] > 0 else 0
    
    margin_change = (total.get('marginRate25F_usd', 0) - total.get('marginRate24F_usd', 0))
    material_change = (total.get('materialRate25F_usd', 0) - total.get('materialRate24F_usd', 0))
    
    if abs(fx_change) > 3:
        risks.append(f"환율 리스크: 환율 {fx_change:+.1f}% 변동({fx_rates['prev']:.0f}→{fx_rates['curr']:.0f}원)으로 KRW 원가율 {cost_rate_change_krw - cost_rate_change_usd:+.1f}%p 추가 {('악화' if (cost_rate_change_krw - cost_rate_change_usd) > 0 else '개선')}. 기준환율 관리 필요.")
    
    if material_change > 0.5:
        risks.append(f"원자재 리스크: 글로벌 소재 단가 상승으로 원자재 원가율 {material_change:+.1f}%p 상승.")
    
    if margin_change > 0.3:
        risks.append(f"마진 리스크: 협력사 정상마진 확대({margin_change:+.2f}%p)로 납품단가 상승 압박 지속.")
    
    # 기본 리스크
    if not risks:
        risks.append("환율 변동성: 환율 급변 시 원가율 변동 확대 가능성.")
        risks.append("원자재 가격: 글로벌 원자재 시장 불안정성.")
    
    return risks[:3]  # 최대 3개


def generate_success(total: Dict[str, Any], fx_rates: Dict[str, float], season: str = '') -> List[str]:
    """시사점 생성 (25FW 제외) 또는 성공 포인트 생성 (25FW만)"""
    success = []
    
    # 25FW 시즌은 기존 성공 포인트 로직 유지
    is_25fw = '25FW' in season or '25F' in season
    
    if is_25fw:
        # 25FW: 성공 포인트
        cost_rate_change_usd = total.get('costRateChange_usd', 0)
        fx_change = ((fx_rates['curr'] / fx_rates['prev']) * 100) - 100 if fx_rates['prev'] > 0 else 0
        
        if cost_rate_change_usd < -0.3:
            success.append(f"원가 효율화: USD 기준 원가율 {cost_rate_change_usd:+.1f}%p 개선으로 구조적 원가 절감 성과.")
        
        if abs(fx_change) < 2:
            success.append(f"환율 안정: 환율 변동 {fx_change:+.1f}%로 원가율에 미치는 영향 최소화.")
        
        labor_change = (total.get('laborRate25F_usd', 0) - total.get('laborRate24F_usd', 0))
        if labor_change < -0.3:
            success.append(f"공임 효율화: 공임 원가율 {labor_change:+.1f}%p 개선으로 생산 효율성 향상.")
        
        # 기본 성공 포인트
        if not success:
            success.append("원가 구조: 세부 항목별 원가율 모니터링 체계 구축.")
            success.append("공급망 안정성: 장기계약 및 소싱 다변화로 원가 안정성 확보.")
    else:
        # 25FW 제외 시즌: 시사점
        cost_rate_change_usd = total.get('costRateChange_usd', 0)
        cost_rate_change_krw = total.get('costRateChange_krw', 0)
        fx_change = ((fx_rates['curr'] / fx_rates['prev']) * 100) - 100 if fx_rates['prev'] > 0 else 0
        
        # 원가율 변화에 따른 시사점
        if cost_rate_change_usd > 0.5:
            success.append(f"원가 압박 심화: USD 기준 원가율 {cost_rate_change_usd:+.1f}%p 악화로 실질 원가 상승 압력 지속. 소재비·공임비 절감 전략 수립 필요.")
        elif cost_rate_change_usd < -0.3:
            success.append(f"원가 개선 여지: USD 기준 원가율 {cost_rate_change_usd:+.1f}%p 개선 추세. 개선 요인 분석 및 차기 시즌 확대 적용 검토.")
        
        # 환율 영향 시사점
        if fx_change > 5:
            success.append(f"환율 리스크 관리: 환율 {fx_change:+.1f}% 상승으로 KRW 기준 원가율 {cost_rate_change_krw:+.1f}%p 악화. 기준환율 설정 및 환율 헤징 전략 검토 필요.")
        elif fx_change < -3:
            success.append(f"환율 기회: 환율 {fx_change:+.1f}% 하락으로 원가 개선 여건 형성. 환율 변동성 모니터링 강화.")
        
        # 공임/소재비 시사점
        labor_change = (total.get('laborRate25F_usd', 0) - total.get('laborRate24F_usd', 0))
        material_change = (total.get('materialRate25F_usd', 0) - total.get('materialRate24F_usd', 0))
        
        if labor_change > 0.5:
            success.append(f"공임비 관리: 공임 원가율 {labor_change:+.1f}%p 상승으로 생산 효율성 개선 필요. 공정 단순화 및 생산지 다변화 검토.")
        if material_change > 0.5:
            success.append(f"소재비 최적화: 원부자재 원가율 {material_change:+.1f}%p 상승. 소재 사양 재검토 및 대체소재 전환 검토.")
        
        # 기본 시사점
        if not success:
            success.append("원가 구조 분석: 세부 항목별 원가율 변화 추이 모니터링 및 개선 포인트 도출.")
            success.append("공급망 안정화: 장기계약 및 소싱 다변화를 통한 원가 안정성 확보 전략 수립.")
    
    return success[:3]  # 최대 3개


def generate_message(total: Dict[str, Any], season: str, fx_rates: Dict[str, float]) -> str:
    """핵심 메시지 생성"""
    cost_rate_change_usd = total.get('costRateChange_usd', 0)
    cost_rate_change_krw = total.get('costRateChange_krw', 0)
    fx_change = ((fx_rates['curr'] / fx_rates['prev']) * 100) - 100 if fx_rates['prev'] > 0 else 0
    
    direction_usd = "개선" if cost_rate_change_usd < 0 else "악화"
    direction_krw = "개선" if cost_rate_change_krw < 0 else "악화"
    sign_usd = "" if cost_rate_change_usd < 0 else "+"
    sign_krw = "" if cost_rate_change_krw < 0 else "+"
    
    return f"{season} 시즌은 USD 기준 {sign_usd}{abs(cost_rate_change_usd):.1f}%p {direction_usd}, KRW 기준 {sign_krw}{abs(cost_rate_change_krw):.1f}%p {direction_krw}되었습니다. {'환율 변동' if abs(fx_change) > 3 else '환율 안정'}이 {'KRW 원가율에 영향을 미쳤습니다' if abs(fx_change) > 3 else 'KRW 원가율에 미치는 영향이 제한적이었습니다'}. 단기적으로는 세부 항목별 원가 모니터링, 중기적으로는 소싱 다변화와 공임 효율화를 통한 구조적 원가 방어가 필요합니다."


def generate_metrics_insights(total: Dict[str, Any], fx_rates: Dict[str, float]) -> Dict[str, str]:
    """메트릭스 관련 인사이트 생성"""
    qty_yoy = total.get('qtyYoY', 0)
    tag_yoy = total.get('tagYoY_usd', 0)
    cost_yoy = total.get('costYoY_usd', 0)
    fx_change = ((fx_rates['curr'] / fx_rates['prev']) * 100) - 100 if fx_rates['prev'] > 0 else 0
    
    metrics_title = f"주요 지표 요약"
    
    metrics_volume = f"생산 수량은 전시즌 대비 {qty_yoy - 100:+.1f}% {'증가' if qty_yoy > 100 else '감소'}했습니다."
    
    metrics_tag = f"평균 TAG는 전시즌 대비 {tag_yoy - 100:+.1f}% {'상승' if tag_yoy > 100 else '하락'}했습니다."
    
    metrics_fx = f"환율은 {fx_rates['prev']:.0f}원에서 {fx_rates['curr']:.0f}원으로 {fx_change:+.1f}% {'상승' if fx_change > 0 else '하락'}했습니다."
    
    metrics_conclusion = f"전체적으로 수량 {qty_yoy - 100:+.1f}% 변동, TAG {tag_yoy - 100:+.1f}% 변동, 원가 {cost_yoy - 100:+.1f}% 변동으로 {'성장세' if qty_yoy > 100 and tag_yoy > 100 else '안정세'}를 보였습니다."
    
    return {
        'metrics_title': metrics_title,
        'metrics_volume': metrics_volume,
        'metrics_tag': metrics_tag,
        'metrics_fx': metrics_fx,
        'metrics_conclusion': metrics_conclusion
    }


def generate_executive_summary(total: Dict[str, Any], season: str, fx_rates: Dict[str, float]) -> str:
    """경영진 요약 생성"""
    cost_rate_change_usd = total.get('costRateChange_usd', 0)
    cost_rate_change_krw = total.get('costRateChange_krw', 0)
    cost_rate_prev_usd = total.get('costRate24F_usd', 0)
    cost_rate_curr_usd = total.get('costRate25F_usd', 0)
    
    direction_usd = "개선" if cost_rate_change_usd < 0 else "악화"
    direction_krw = "개선" if cost_rate_change_krw < 0 else "악화"
    sign_usd = "" if cost_rate_change_usd < 0 else "+"
    sign_krw = "" if cost_rate_change_krw < 0 else "+"
    
    return f"{season} 시즌 원가 분석 결과, USD 기준 원가율은 {cost_rate_prev_usd:.1f}%에서 {cost_rate_curr_usd:.1f}%로 {sign_usd}{abs(cost_rate_change_usd):.1f}%p {direction_usd}되었습니다. KRW 기준으로는 {sign_krw}{abs(cost_rate_change_krw):.1f}%p {direction_krw}되었으며, 환율 변동이 영향을 미쳤습니다. 세부 항목별 원가율 모니터링과 구조적 원가 절감 노력이 필요합니다."


def create_insights_csv(insights: Dict[str, Any], output_file: str):
    """인사이트를 CSV 파일로 저장"""
    csv_lines = ['section,key,value']
    
    # 각 인사이트 항목을 CSV 형식으로 변환
    for key, value in insights.items():
        if isinstance(value, list):
            for i, item in enumerate(value, 1):
                csv_lines.append(f"{key},{i},{item}")
        else:
            csv_lines.append(f"{key},,{value}")
    
    # CSV 파일 저장
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        f.write('\n'.join(csv_lines))
    
    print(f"[OK] 인사이트 CSV 저장 완료: {output_file}")


def generate_kids_insights_only(season: str, season_folder: str):
    """DISCOVERY-KIDS 인사이트만 생성 (DISCOVERY 인사이트는 건드리지 않음)"""
    print(f"\n{'=' * 60}")
    print(f"DISCOVERY-KIDS 인사이트 생성 중...")
    print(f"{'=' * 60}")
    
    brand_code = 'X'
    
    # DISCOVERY-KIDS용 Summary 파일 확인
    summary_file_kids = f'public/COST RAW/{season_folder}/summary_{season.lower()}_{brand_code.lower()}_kids.json'
    if not os.path.exists(summary_file_kids):
        print(f"[ERROR] DISCOVERY-KIDS SUMMARY 파일이 없습니다: {summary_file_kids}")
        return False
    
    with open(summary_file_kids, 'r', encoding='utf-8') as f:
        summary_kids = json.load(f)
    total_kids = summary_kids.get('total', {})
    
    # 환율 정보 로드 (X 브랜드 환율 사용)
    prev_season = get_previous_season(season)
    prev_season_code = convert_season_format(prev_season) if prev_season else convert_season_format(season)
    curr_season_code = convert_season_format(season)
    
    fx_rates_prev = load_fx_rates(brand_code, prev_season_code)
    fx_rates_curr = load_fx_rates(brand_code, curr_season_code)
    fx_rates = {'prev': fx_rates_prev['curr'], 'curr': fx_rates_curr['curr']}
    
    # DISCOVERY-KIDS 인사이트 생성
    insights_kids = {
        'prev_usd_cost_rate': total_kids.get('costRate24F_usd', 0),
        'prev_krw_cost_rate': total_kids.get('costRate24F_krw', 0),
        'usd_summary': generate_usd_summary(total_kids, season),
        'krw_summary': generate_krw_summary(total_kids, season, fx_rates),
    }
    
    actions_kids = generate_actions(total_kids)
    risks_kids = generate_risks(total_kids, fx_rates)
    success_kids = generate_success(total_kids, fx_rates, season)
    
    for i, action in enumerate(actions_kids, 1):
        insights_kids[f'action_{i}'] = action
    
    for i, risk in enumerate(risks_kids, 1):
        insights_kids[f'risk_{i}'] = risk
    
    for i, s in enumerate(success_kids, 1):
        insights_kids[f'success_{i}'] = s
    
    insights_kids['action summary'] = f"주요 액션: {', '.join([a.split(':')[0] for a in actions_kids])}"
    insights_kids['risk summary'] = f"주요 리스크: {', '.join([r.split(':')[0] for r in risks_kids])}"
    insights_kids['success summary'] = f"성공 포인트: {', '.join([s.split(':')[0] for s in success_kids])}"
    insights_kids['message'] = generate_message(total_kids, season, fx_rates)
    
    metrics_kids = generate_metrics_insights(total_kids, fx_rates)
    insights_kids.update(metrics_kids)
    insights_kids['executive_summary'] = generate_executive_summary(total_kids, season, fx_rates)
    
    # DISCOVERY-KIDS 인사이트 파일 저장
    output_file_kids = f'public/COST RAW/{season_folder}/{brand_code}_insight_{season.lower()}_kids.csv'
    create_insights_csv(insights_kids, output_file_kids)
    print(f"[OK] DISCOVERY-KIDS 인사이트 생성 완료: {output_file_kids}")
    
    return True


def generate_insights_for_brand(brand_code: str, season: str, season_folder: str, is_non_season: bool = False):
    """브랜드별 인사이트 생성"""
    print(f"\n{'=' * 60}")
    print(f"브랜드 {brand_code} 인사이트 생성 중... (NON 시즌: {is_non_season})")
    print(f"{'=' * 60}")
    
    # NON 시즌 감지 (시즌명에 _NON 포함 여부)
    if not is_non_season:
        is_non_season = '_NON' in season or season.endswith('_NON')
    
    # SUMMARY JSON 파일 경로 결정
    if is_non_season:
        # NON 시즌: summary_{season_folder}_{brand}_non.json
        summary_file = f'public/COST RAW/{season_folder}/summary_{season_folder.lower()}_{brand_code.lower()}_non.json'
    else:
        # 일반 시즌: summary_{season}_{brand}.json
        summary_file = f'public/COST RAW/{season_folder}/summary_{season.lower()}_{brand_code.lower()}.json'
    
    if not os.path.exists(summary_file):
        print(f"[ERROR] SUMMARY 파일이 없습니다: {summary_file}")
        return False
    
    with open(summary_file, 'r', encoding='utf-8') as f:
        summary = json.load(f)
    
    total = summary.get('total', {})
    
    # 환율 정보 로드
    prev_season = get_previous_season(season.replace('_NON', ''))
    prev_season_code = convert_season_format(prev_season) if prev_season else convert_season_format(season.replace('_NON', ''))
    curr_season_code = convert_season_format(season.replace('_NON', ''))
    
    fx_rates_prev = load_fx_rates(brand_code, prev_season_code, is_non_season)
    fx_rates_curr = load_fx_rates(brand_code, curr_season_code, is_non_season)
    fx_rates = {'prev': fx_rates_prev['prev'], 'curr': fx_rates_curr['curr']}
    
    # 인사이트 생성
    insights = {
        'prev_usd_cost_rate': total.get('costRate24F_usd', 0),
        'prev_krw_cost_rate': total.get('costRate24F_krw', 0),
        'usd_summary': generate_usd_summary(total, season),
        'krw_summary': generate_krw_summary(total, season, fx_rates),
    }
    
    # 액션, 리스크, 성공 포인트/시사점
    actions = generate_actions(total)
    risks = generate_risks(total, fx_rates)
    success = generate_success(total, fx_rates, season)
    
    for i, action in enumerate(actions, 1):
        insights[f'action_{i}'] = action
    
    for i, risk in enumerate(risks, 1):
        insights[f'risk_{i}'] = risk
    
    for i, s in enumerate(success, 1):
        insights[f'success_{i}'] = s
    
    # 요약
    insights['action summary'] = f"주요 액션: {', '.join([a.split(':')[0] for a in actions])}"
    insights['risk summary'] = f"주요 리스크: {', '.join([r.split(':')[0] for r in risks])}"
    insights['success summary'] = f"성공 포인트: {', '.join([s.split(':')[0] for s in success])}"
    
    # 핵심 메시지
    insights['message'] = generate_message(total, season, fx_rates)
    
    # 메트릭스
    metrics = generate_metrics_insights(total, fx_rates)
    insights.update(metrics)
    
    # 경영진 요약
    insights['executive_summary'] = generate_executive_summary(total, season, fx_rates)
    
    # CSV 파일 저장
    # NON 시즌 인사이트 파일 경로 결정
    if is_non_season:
        output_file = f'public/COST RAW/{season_folder}/{brand_code}_insight_{season_folder.lower()}_non.csv'
    else:
        output_file = f'public/COST RAW/{season_folder}/{brand_code}_insight_{season.lower()}.csv'
    
    # X 브랜드인 경우 두 개의 파일 생성 (DISCOVERY, DISCOVERY-KIDS)
    if brand_code == 'X' and not is_non_season:
        # DISCOVERY용 파일
        output_file_discovery = f'public/COST RAW/{season_folder}/{brand_code}_insight_{season.lower()}.csv'
        create_insights_csv(insights, output_file_discovery)
        
        # DISCOVERY-KIDS용 파일 (별도 Summary 파일이 있는 경우)
        summary_file_kids = f'public/COST RAW/{season_folder}/summary_{season.lower()}_{brand_code.lower()}_kids.json'
        if os.path.exists(summary_file_kids):
            with open(summary_file_kids, 'r', encoding='utf-8') as f:
                summary_kids = json.load(f)
            total_kids = summary_kids.get('total', {})
            
            # DISCOVERY-KIDS 인사이트 생성
            insights_kids = {
                'prev_usd_cost_rate': total_kids.get('costRate24F_usd', 0),
                'prev_krw_cost_rate': total_kids.get('costRate24F_krw', 0),
                'usd_summary': generate_usd_summary(total_kids, season),
                'krw_summary': generate_krw_summary(total_kids, season, fx_rates),
            }
            
            actions_kids = generate_actions(total_kids)
            risks_kids = generate_risks(total_kids, fx_rates)
            success_kids = generate_success(total_kids, fx_rates, season)
            
            for i, action in enumerate(actions_kids, 1):
                insights_kids[f'action_{i}'] = action
            
            for i, risk in enumerate(risks_kids, 1):
                insights_kids[f'risk_{i}'] = risk
            
            for i, s in enumerate(success_kids, 1):
                insights_kids[f'success_{i}'] = s
            
            insights_kids['action summary'] = f"주요 액션: {', '.join([a.split(':')[0] for a in actions_kids])}"
            insights_kids['risk summary'] = f"주요 리스크: {', '.join([r.split(':')[0] for r in risks_kids])}"
            insights_kids['success summary'] = f"성공 포인트: {', '.join([s.split(':')[0] for s in success_kids])}"
            insights_kids['message'] = generate_message(total_kids, season, fx_rates)
            
            metrics_kids = generate_metrics_insights(total_kids, fx_rates)
            insights_kids.update(metrics_kids)
            insights_kids['executive_summary'] = generate_executive_summary(total_kids, season, fx_rates)
            
            # DISCOVERY-KIDS 인사이트 파일 저장
            output_file_kids = f'public/COST RAW/{season_folder}/{brand_code}_insight_{season.lower()}_kids.csv'
            create_insights_csv(insights_kids, output_file_kids)
    else:
        # NON 시즌이거나 일반 브랜드인 경우
        create_insights_csv(insights, output_file)
    
    return True


def main():
    parser = argparse.ArgumentParser(description='규칙 기반 인사이트 생성 스크립트')
    parser.add_argument('--season', type=str, required=True, help='시즌 코드 (예: 26SS)')
    parser.add_argument('--brands', nargs='+', required=False, choices=['M', 'I', 'X', 'ST', 'V'],
                       help='브랜드 코드 리스트 (예: M I X ST V)')
    parser.add_argument('--kids-only', action='store_true',
                       help='DISCOVERY-KIDS 인사이트만 생성 (DISCOVERY 인사이트는 건드리지 않음)')
    
    args = parser.parse_args()
    
    season = args.season.upper()
    
    # NON 시즌 감지
    is_non_season = '_NON' in season or season.endswith('_NON')
    base_season = season.replace('_NON', '') if is_non_season else season
    
    # 시즌 폴더명 결정
    if base_season in ['26SS', '26S']:
        season_folder = '26SS'
    elif base_season in ['25SS', '25S']:
        season_folder = '25S'
    elif base_season in ['25FW', '25F']:
        season_folder = '25FW'
    elif base_season in ['26FW', '26F']:
        season_folder = '26FW'
    else:
        season_folder = base_season
    
    print("=" * 60)
    print("규칙 기반 인사이트 생성 스크립트")
    print("=" * 60)
    
    # DISCOVERY-KIDS만 생성하는 경우
    if args.kids_only:
        print(f"\n시즌: {season}")
        print("DISCOVERY-KIDS 인사이트만 생성 (DISCOVERY 인사이트는 건드리지 않음)")
        if generate_kids_insights_only(season, season_folder):
            print("\n" + "=" * 60)
            print("DISCOVERY-KIDS 인사이트 생성 완료")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print("DISCOVERY-KIDS 인사이트 생성 실패")
            print("=" * 60)
        return
    
    # 일반 브랜드 인사이트 생성
    if not args.brands:
        parser.error("--brands 또는 --kids-only 옵션이 필요합니다.")
    
    brands = args.brands if isinstance(args.brands, list) else [args.brands]
    
    print(f"\n시즌: {season} (NON 시즌: {is_non_season})")
    print(f"브랜드: {', '.join(brands)}")
    
    success_count = 0
    for brand in brands:
        if generate_insights_for_brand(brand, season, season_folder, is_non_season):
            success_count += 1
    
    print("\n" + "=" * 60)
    print(f"인사이트 생성 완료: {success_count}/{len(brands)}")
    print("=" * 60)


if __name__ == '__main__':
    main()

