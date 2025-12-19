#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teams 메시지 테스트 스크립트
"""

import json
import requests

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
    # 테스트 메시지
    payload = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "테스트 메시지",
        "themeColor": "0078D4",
        "title": "테스트 메시지",
        "sections": [
            {
                "activityTitle": "대시보드 알림 테스트",
                "text": "**test**\n\n이것은 테스트 메시지입니다.",
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

