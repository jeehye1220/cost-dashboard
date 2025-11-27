#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
25SS 기간 AI 분석 및 Insights CSV 생성 스크립트
"""

import requests
import json
import sys
import os

# Windows에서 UTF-8 출력 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 브랜드 정보
brands = [
    {"brandId": "25SS-M", "brandCode": "M"},
    {"brandId": "25SS-I", "brandCode": "I"},
    {"brandId": "25SS-X", "brandCode": "X"},
    {"brandId": "25SS-ST", "brandCode": "ST"},
    {"brandId": "25SS-V", "brandCode": "V"},
]

def generate_insights():
    period = "25SS"
    api_url = "http://localhost:3000/api/batch-generate-insights"
    
    print("=" * 60)
    print("25SS 기간 AI 분석 시작")
    print("=" * 60)
    print(f"기간: {period}")
    print(f"브랜드 수: {len(brands)}")
    print(f"브랜드: {', '.join([b['brandCode'] for b in brands])}")
    print("")
    
    try:
        response = requests.post(
            api_url,
            json={
                "period": period,
                "brands": brands
            },
            timeout=1800  # 30분 타임아웃
        )
        
        if response.status_code != 200:
            print(f"API 호출 실패: {response.status_code}")
            print(f"오류 내용: {response.text}")
            sys.exit(1)
        
        result = response.json()
        
        print("=" * 60)
        print("AI 분석 완료!")
        print("=" * 60)
        print(f"총 브랜드: {result.get('total', 0)}")
        print(f"성공: {result.get('success', 0)}")
        print(f"실패: {result.get('failed', 0)}")
        print("")
        
        if result.get('results'):
            print("브랜드별 결과:")
            for i, r in enumerate(result['results']):
                brand_code = brands[i]['brandCode']
                if r.get('success'):
                    print(f"  ✓ {brand_code}: 성공")
                else:
                    error_msg = r.get('error', '알 수 없는 오류')
                    print(f"  ✗ {brand_code}: 실패 - {error_msg}")
        
        print("")
        print("생성된 파일 위치:")
        for b in brands:
            print(f"  - public/COST RAW/25S/{b['brandCode']}_insight_25ss.csv")
        
    except requests.exceptions.ConnectionError:
        print("오류: 개발 서버에 연결할 수 없습니다.")
        print("먼저 'npm run dev'로 개발 서버를 실행해주세요.")
        sys.exit(1)
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    generate_insights()


