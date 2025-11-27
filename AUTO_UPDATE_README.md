# 매일 자동 대시보드 업데이트 시스템

매일 오전 11시에 자동으로 SQL에서 데이터를 받아와 CSV를 생성하고, SUMMARY JSON과 인사이트를 생성하여 대시보드를 업데이트합니다.

## 생성된 파일

1. **auto_update_config.json** - 설정 파일
   - 시즌별 브랜드 및 인사이트 생성 여부 설정
   - 이메일 알림 설정

2. **auto_update_dashboard.py** - 자동화 메인 스크립트
   - SQL → CSV 생성
   - SUMMARY JSON 생성
   - 인사이트 CSV 생성 (26SS만)
   - 이메일 알림

3. **generate_insights_rule_based.py** - 규칙 기반 인사이트 생성 스크립트
   - AI API 없이 데이터 기반으로 인사이트 생성
   - 비용 발생 없음

4. **setup_windows_scheduler.ps1** - PowerShell 스케줄러 설정 스크립트
5. **setup_windows_scheduler.bat** - 배치 파일 스케줄러 설정 스크립트

## 설정 방법

### 1. 설정 파일 수정 (`auto_update_config.json`)

```json
{
  "seasons": {
    "25FW": {
      "brands": ["M", "I", "X", "ST", "V"],
      "generate_insights": false
    },
    "26SS": {
      "brands": ["M", "I", "X", "ST", "V"],
      "generate_insights": true
    }
  },
  "email": {
    "recipient": "kjh1@fnfcrop.com",
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender_email": "your-email@gmail.com",
    "sender_password": "your-app-password"
  }
}
```

**이메일 설정:**
- Gmail 사용 시: 앱 비밀번호 필요 (일반 비밀번호 아님)
- 회사 메일 사용 시: SMTP 서버 정보 수정

### 2. Windows 작업 스케줄러 등록

**방법 1: PowerShell 사용 (권장)**
```powershell
# 관리자 권한으로 PowerShell 실행
.\setup_windows_scheduler.ps1
```

**방법 2: 배치 파일 사용**
```cmd
# 관리자 권한으로 명령 프롬프트 실행
setup_windows_scheduler.bat
```

**방법 3: 수동 등록**
1. 작업 스케줄러 열기
2. 기본 작업 만들기
3. 이름: `DashboardAutoUpdate`
4. 트리거: 매일 오전 11:00
5. 작업: 프로그램 시작
   - 프로그램: `python`
   - 인수: `auto_update_dashboard.py`
   - 시작 위치: 프로젝트 루트 경로

## 실행 순서

1. **SQL → CSV 생성** (`sql_to_csv_with_fx.py`)
   - 25FW: M_25F.csv, I_25F.csv, X_25F.csv, ST_25F.csv, V_25F.csv
   - 26SS: M_26SS.csv, I_26SS.csv, X_26SS.csv, ST_26SS.csv, V_26SS.csv

2. **SUMMARY JSON 생성**
   - 25FW: summary_25fw_m.json, summary_25fw_i.json, summary_25fw_x.json, summary_25fw_st.json, summary_25fw_v.json
   - 26SS: summary_26ss_m.json, summary_26ss_i.json, summary_26ss_x.json, summary_26ss_st.json, summary_26ss_v.json

3. **인사이트 CSV 생성** (26SS만)
   - M_insight_26ss.csv, I_insight_26ss.csv, X_insight_26ss.csv, ST_insight_26ss.csv, V_insight_26ss.csv

4. **이메일 알림 전송**
   - 성공/실패 알림

## 새로운 시즌 추가 방법

`auto_update_config.json` 파일에 새로운 시즌을 추가하면 자동으로 처리됩니다.

예시 (26FW 추가):
```json
{
  "seasons": {
    "25FW": {
      "brands": ["M", "I", "X", "ST", "V"],
      "generate_insights": false,
      "season_folder": "25FW",
      "season_code": "25F"
    },
    "26SS": {
      "brands": ["M", "I", "X", "ST", "V"],
      "generate_insights": true,
      "season_folder": "26SS",
      "season_code": "26SS"
    },
    "26FW": {
      "brands": ["M", "I", "X", "ST", "V"],
      "generate_insights": true,
      "season_folder": "26FW",
      "season_code": "26F"
    }
  }
}
```

## 로그 확인

로그 파일은 `logs/auto_update_YYYYMMDD.log` 형식으로 저장됩니다.

## 수동 실행

작업 스케줄러 없이 수동으로 실행하려면:
```bash
python auto_update_dashboard.py
```

## 주의사항

1. **컴퓨터가 켜져 있어야 함**: 작업 스케줄러는 컴퓨터가 켜져 있을 때만 실행됩니다.
2. **로그인 상태**: 사용자가 로그인되어 있어야 합니다 (또는 작업 스케줄러에서 "사용자가 로그온하지 않은 경우에도 실행" 옵션 설정).
3. **Python 환경**: Python이 설치되어 있고 경로가 설정되어 있어야 합니다.
4. **FX.csv 파일**: 환율 정보는 수동으로 업데이트해야 합니다.

## 문제 해결

### 작업 스케줄러가 실행되지 않는 경우
1. 작업 스케줄러에서 작업 상태 확인
2. 로그 파일 확인 (`logs/auto_update_YYYYMMDD.log`)
3. Python 경로 확인

### 이메일이 전송되지 않는 경우
1. `auto_update_config.json`에서 이메일 설정 확인
2. Gmail 사용 시 앱 비밀번호 사용 확인
3. SMTP 서버 정보 확인

### 인사이트가 생성되지 않는 경우
1. SUMMARY JSON 파일이 생성되었는지 확인
2. `generate_insights_rule_based.py` 스크립트 수동 실행 테스트

