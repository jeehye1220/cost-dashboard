#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teams 알림 테스트 스크립트 - 배치 완료 시뮬레이션
"""

import json
import requests
from datetime import datetime

# 설정 파일에서 Webhook URL 읽기
config_path = 'auto_update_config.json'
with open(config_path, 'r', encoding='utf-8') as f:
    config = json.load(f)

teams_webhook_url = config.get('teams_webhook_url', '')

if not teams_webhook_url:
    print("[오류] Teams Webhook URL이 설정되지 않았습니다.")
    exit(1)

print("Teams 메시지 전송 중...")
print(f"Webhook URL: {teams_webhook_url[:50]}...")

try:
    # 배치 완료 메시지 시뮬레이션
    start_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    end_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    payload = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "[대시보드 자동 업데이트] 완료",
        "themeColor": "00FF00",  # 초록색 (성공)
        "title": "[대시보드 자동 업데이트] 완료",
        "sections": [
            {
                "activityTitle": "대시보드 자동 업데이트",
                "text": f"""**대시보드 자동 업데이트가 성공적으로 완료되었습니다.**

- 시작 시간: {start_time}
- 종료 시간: {end_time}
- 소요 시간: 테스트 메시지

이것은 Teams 알림 테스트 메시지입니다.""",
                "markdown": True
            }
        ]
    }
    
    response = requests.post(
        teams_webhook_url,
        json=payload,
        timeout=10
    )
    response.raise_for_status()
    
    print("[성공] Teams 메시지 전송 성공!")
    print("Teams 채널에서 메시지를 확인해주세요.")
    
except requests.exceptions.RequestException as e:
    print(f"[실패] Teams 메시지 전송 실패: {e}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"응답 내용: {e.response.text}")
except Exception as e:
    print(f"[오류] 오류 발생: {e}")






