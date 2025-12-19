#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
매일 자동 대시보드 업데이트 스크립트

매일 오전 11시에 자동으로 실행되어:
1. SQL에서 데이터 추출하여 CSV 생성
2. SUMMARY JSON 생성
3. 인사이트 CSV 생성 (26SS만, 규칙 기반)
4. 이메일 알림 전송

사용 방법:
    python auto_update_dashboard.py
"""

import json
import os
import sys
import subprocess
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import ctypes
from ctypes import wintypes
try:
    import requests
except ImportError:
    requests = None

# 로깅 설정
LOG_DIR = Path('logs')
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / f"auto_update_{datetime.now().strftime('%Y%m%d')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def load_config() -> Dict:
    """설정 파일 로드"""
    config_path = Path('auto_update_config.json')
    if not config_path.exists():
        logger.error(f"설정 파일이 없습니다: {config_path}")
        sys.exit(1)
    
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def send_email(config: Dict, subject: str, body: str, is_error: bool = False):
    """이메일 알림 전송"""
    email_config = config.get('email', {})
    recipient = email_config.get('recipient', 'kjh1@fnfcrop.com')
    smtp_server = email_config.get('smtp_server', 'smtp.gmail.com')
    smtp_port = email_config.get('smtp_port', 587)
    sender_email = email_config.get('sender_email', '')
    sender_password = email_config.get('sender_password', '')
    
    # 이메일 설정이 없으면 스킵
    if not sender_email or not sender_password:
        logger.warning("이메일 설정이 없어 알림을 전송하지 않습니다.")
        return
    
    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = recipient
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
        
        logger.info(f"이메일 전송 완료: {recipient}")
    except Exception as e:
        logger.error(f"이메일 전송 실패: {e}")


def show_windows_notification(title: str, message: str, is_error: bool = False):
    """윈도우 팝업 알림 표시"""
    try:
        # Windows API 상수
        MB_OK = 0x0
        MB_ICONINFORMATION = 0x40
        MB_ICONERROR = 0x10
        MB_ICONWARNING = 0x30
        
        # 아이콘 선택
        icon = MB_ICONERROR if is_error else MB_ICONINFORMATION
        
        # MessageBoxW 호출 (유니코드 지원)
        ctypes.windll.user32.MessageBoxW(
            0,  # 부모 윈도우 핸들 (없음)
            message,  # 메시지 텍스트
            title,  # 제목
            MB_OK | icon
        )
        logger.info("윈도우 팝업 알림 표시 완료")
    except Exception as e:
        logger.error(f"윈도우 팝업 알림 실패: {e}")


def send_teams_message(config: Dict, title: str, message: str, is_error: bool = False):
    """Teams 메시지 전송"""
    logger.info("Teams 메시지 전송 시도 중...")
    
    if requests is None:
        logger.warning("requests 라이브러리가 설치되지 않아 Teams 메시지를 전송할 수 없습니다. 'pip install requests' 실행 필요")
        return
    
    teams_webhook_url = config.get('teams_webhook_url', '')
    
    if not teams_webhook_url:
        logger.warning("Teams Webhook URL이 설정되지 않아 알림을 전송하지 않습니다.")
        return
    
    logger.info(f"Teams Webhook URL 확인됨: {teams_webhook_url[:50]}...")
    
    try:
        # 성공/실패에 따라 색상 결정
        theme_color = "FF0000" if is_error else "00FF00"  # 빨강(실패) / 초록(성공)
        
        # Teams 메시지 포맷 (Adaptive Card 형식)
        payload = {
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "summary": title,
            "themeColor": theme_color,
            "title": title,
            "sections": [
                {
                    "activityTitle": "대시보드 자동 업데이트",
                    "text": message,
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
        logger.info("Teams 메시지 전송 완료")
    except requests.exceptions.RequestException as e:
        logger.error(f"Teams 메시지 전송 실패: {e}")
    except Exception as e:
        logger.error(f"Teams 메시지 전송 중 오류: {e}")


def run_sql_to_csv():
    """SQL에서 CSV 생성"""
    logger.info("=" * 60)
    logger.info("[1] SQL에서 CSV 생성 시작")
    logger.info("=" * 60)
    
    try:
        result = subprocess.run(
            ['python', 'sql_to_csv_with_fx.py'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            logger.info("SQL → CSV 생성 완료")
            logger.info(result.stdout)
            return True
        else:
            logger.error(f"SQL → CSV 생성 실패: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"SQL → CSV 생성 중 오류: {e}")
        return False


def generate_summary_25fw(brands: List[str]):
    """25FW 브랜드별 SUMMARY JSON 생성"""
    logger.info("=" * 60)
    logger.info("[2] 25FW SUMMARY JSON 생성 시작")
    logger.info("=" * 60)
    
    # generate_summary_26ss.py를 사용하되 25FW로 실행
    # 또는 별도 스크립트 사용
    success_count = 0
    
    for brand in brands:
        logger.info(f"\n25FW 브랜드 {brand} 처리 중...")
        
        try:
            # generate_summary_26ss.py를 25FW로 사용
            result = subprocess.run(
                ['python', 'generate_summary_26ss.py', '--season', '25FW', '--brand', brand],
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            
            if result.returncode == 0:
                logger.info(f"25FW 브랜드 {brand} SUMMARY 생성 완료")
                success_count += 1
            else:
                logger.error(f"25FW 브랜드 {brand} SUMMARY 생성 실패: {result.stderr}")
        except Exception as e:
            logger.error(f"25FW 브랜드 {brand} 처리 중 오류: {e}")
    
    logger.info(f"\n25FW SUMMARY 생성 완료: {success_count}/{len(brands)}")
    return success_count == len(brands)


def generate_summary_26ss(brands: List[str], season: str = '26SS'):
    """시즌별 브랜드 SUMMARY JSON 생성 (25SS, 26SS, 26FW 등)"""
    logger.info("=" * 60)
    logger.info(f"[3] {season} SUMMARY JSON 생성 시작")
    logger.info("=" * 60)
    
    success_count = 0
    
    for brand in brands:
        logger.info(f"\n{season} 브랜드 {brand} 처리 중...")
        
        try:
            result = subprocess.run(
                ['python', 'generate_summary_26ss.py', '--season', season, '--brand', brand],
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            
            if result.returncode == 0:
                logger.info(f"{season} 브랜드 {brand} SUMMARY 생성 완료")
                success_count += 1
            else:
                logger.error(f"{season} 브랜드 {brand} SUMMARY 생성 실패: {result.stderr}")
        except Exception as e:
            logger.error(f"{season} 브랜드 {brand} 처리 중 오류: {e}")
    
    logger.info(f"\n{season} SUMMARY 생성 완료: {success_count}/{len(brands)}")
    return success_count == len(brands)


def generate_insights_for_season(season: str, brands: List[str]):
    """시즌별 인사이트 CSV 생성 (규칙 기반) - 일반화된 함수"""
    logger.info("=" * 60)
    logger.info(f"[인사이트 생성] {season} 시즌 인사이트 CSV 생성 시작")
    logger.info("=" * 60)
    
    try:
        result = subprocess.run(
            ['python', 'generate_insights_rule_based.py', '--season', season, '--brands'] + brands,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            logger.info(f"{season} 인사이트 CSV 생성 완료")
            logger.info(result.stdout)
            return True
        else:
            logger.error(f"{season} 인사이트 CSV 생성 실패: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"{season} 인사이트 CSV 생성 중 오류: {e}")
        return False

def generate_insights_26ss(brands: List[str]):
    """26SS 브랜드별 인사이트 CSV 생성 (규칙 기반) - 하위 호환성 유지"""
    return generate_insights_for_season('26SS', brands)


def generate_non_csv(season: str):
    """NON 시즌 CSV 생성"""
    logger.info("=" * 60)
    logger.info(f"[NON CSV 생성] {season} 시즌 CSV 생성 시작")
    logger.info("=" * 60)
    
    try:
        result = subprocess.run(
            ['python', 'generate_mlb_non_csv.py', '--season', season],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            logger.info(f"{season} NON 시즌 CSV 생성 완료")
            logger.info(result.stdout)
            return True
        else:
            logger.error(f"{season} NON 시즌 CSV 생성 실패: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"{season} NON 시즌 CSV 생성 중 오류: {e}")
        return False


def generate_non_fx_csv():
    """NON 시즌 환율 CSV 생성 (한 번만 실행)"""
    logger.info("=" * 60)
    logger.info("[NON 환율 CSV 생성] FX_NON.csv 생성 시작")
    logger.info("=" * 60)
    
    try:
        result = subprocess.run(
            ['python', 'generate_fx_non_csv.py'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode == 0:
            logger.info("FX_NON.csv 생성 완료")
            logger.info(result.stdout)
            return True
        else:
            logger.error(f"FX_NON.csv 생성 실패: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"FX_NON.csv 생성 중 오류: {e}")
        return False


def generate_summary_non(season: str, brands: List[str]):
    """NON 시즌 브랜드별 SUMMARY JSON 생성"""
    logger.info("=" * 60)
    logger.info(f"[NON SUMMARY 생성] {season} 시즌 SUMMARY JSON 생성 시작")
    logger.info("=" * 60)
    
    success_count = 0
    
    for brand in brands:
        logger.info(f"\n{season} NON 브랜드 {brand} 처리 중...")
        
        try:
            result = subprocess.run(
                ['python', 'generate_summary_mlb_non.py', '--season', season, '--brand', brand],
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            
            if result.returncode == 0:
                logger.info(f"{season} NON 브랜드 {brand} SUMMARY 생성 완료")
                success_count += 1
            else:
                logger.error(f"{season} NON 브랜드 {brand} SUMMARY 생성 실패: {result.stderr}")
        except Exception as e:
            logger.error(f"{season} NON 브랜드 {brand} 처리 중 오류: {e}")
    
    logger.info(f"\n{season} NON SUMMARY 생성 완료: {success_count}/{len(brands)}")
    return success_count == len(brands)


def git_commit_and_push(config: Dict) -> bool:
    """생성된 파일을 Git에 커밋하고 푸시"""
    logger.info("=" * 60)
    logger.info("[5] Git 커밋 및 푸시 시작")
    logger.info("=" * 60)
    
    try:
        # Git 저장소 확인
        result = subprocess.run(
            ['git', 'status'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode != 0:
            logger.warning("Git 저장소가 아닙니다. Git 커밋/푸시를 건너뜁니다.")
            return False
        
        # 변경된 파일 확인
        result = subprocess.run(
            ['git', 'status', '--porcelain', 'public/COST RAW/'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if not result.stdout.strip():
            logger.info("변경된 파일이 없습니다. Git 커밋/푸시를 건너뜁니다.")
            return True
        
        # 파일 추가
        logger.info("변경된 파일을 Git에 추가 중...")
        result = subprocess.run(
            ['git', 'add', 'public/COST RAW/'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode != 0:
            logger.error(f"Git add 실패: {result.stderr}")
            return False
        
        # 커밋
        commit_message = f"Auto update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        logger.info(f"Git 커밋 중: {commit_message}")
        result = subprocess.run(
            ['git', 'commit', '-m', commit_message],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode != 0:
            if 'nothing to commit' in result.stdout or 'nothing to commit' in result.stderr:
                logger.info("커밋할 변경사항이 없습니다.")
                return True
            logger.error(f"Git commit 실패: {result.stderr}")
            return False
        
        logger.info("Git 커밋 완료")
        
        # 푸시
        logger.info("Git 푸시 중...")
        result = subprocess.run(
            ['git', 'push', 'origin', 'main'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode != 0:
            # main 브랜치가 없으면 master 시도
            logger.warning("main 브랜치 푸시 실패, master 브랜치 시도...")
            result = subprocess.run(
                ['git', 'push', 'origin', 'master'],
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            
            if result.returncode != 0:
                logger.error(f"Git push 실패: {result.stderr}")
                return False
        
        logger.info("Git 푸시 완료")
        logger.info("=" * 60)
        logger.info("[5] Git 커밋 및 푸시 완료")
        logger.info("=" * 60)
        return True
        
    except Exception as e:
        logger.error(f"Git 커밋/푸시 중 오류 발생: {e}", exc_info=True)
        return False


def deploy_to_vercel(config: Dict) -> bool:
    """Vercel에 자동 배포"""
    logger.info("=" * 60)
    logger.info("[6] Vercel 배포 시작")
    logger.info("=" * 60)
    
    try:
        # Vercel CLI가 설치되어 있는지 확인
        result = subprocess.run(
            ['vercel', '--version'],
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        
        if result.returncode != 0:
            logger.warning("Vercel CLI가 설치되어 있지 않습니다. 배포를 건너뜁니다.")
            return False
        
        logger.info("Vercel CLI 확인 완료")
        
        # Vercel 프로젝트가 연결되어 있는지 확인
        result = subprocess.run(
            ['vercel', 'ls'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=Path.cwd()
        )
        
        if result.returncode != 0:
            logger.warning("Vercel 프로젝트가 연결되어 있지 않습니다. 배포를 건너뜁니다.")
            logger.info("Vercel 프로젝트 연결 방법: vercel link")
            return False
        
        # 프로덕션 배포 실행
        logger.info("Vercel 프로덕션 배포 실행 중...")
        result = subprocess.run(
            ['vercel', '--prod', '--yes'],
            capture_output=True,
            text=True,
            encoding='utf-8',
            cwd=Path.cwd()
        )
        
        if result.returncode == 0:
            logger.info("Vercel 배포 완료")
            logger.info(result.stdout)
            logger.info("=" * 60)
            logger.info("[6] Vercel 배포 완료")
            logger.info("=" * 60)
            return True
        else:
            logger.error(f"Vercel 배포 실패: {result.stderr}")
            return False
            
    except FileNotFoundError:
        logger.warning("Vercel CLI가 설치되어 있지 않습니다. 배포를 건너뜁니다.")
        return False
    except Exception as e:
        logger.error(f"Vercel 배포 중 오류 발생: {e}", exc_info=True)
        return False


def verify_files(config: Dict) -> bool:
    """생성된 파일 확인"""
    logger.info("=" * 60)
    logger.info("[5] 파일 검증 시작")
    logger.info("=" * 60)
    
    all_ok = True
    seasons = config.get('seasons', {})
    
    for season_key, season_config in seasons.items():
        season_folder = season_config.get('season_folder', season_key)
        brands = season_config.get('brands', [])
        is_non_season = season_config.get('is_non_season', False)
        
        for brand in brands:
            if is_non_season:
                # NON 시즌 파일 확인
                season_code = season_config.get('season_code', season_key)
                # CSV 파일 확인 (NON 시즌)
                csv_file = Path(f'public/COST RAW/{season_folder}/{brand}_{season_code}_NON.csv')
                if not csv_file.exists():
                    logger.warning(f"NON CSV 파일 없음: {csv_file}")
                    all_ok = False
                
                # SUMMARY JSON 확인 (NON 시즌)
                summary_file = Path(f'public/COST RAW/{season_folder}/summary_{season_key.lower()}_{brand.lower()}_non.json')
                if not summary_file.exists():
                    logger.warning(f"NON SUMMARY JSON 없음: {summary_file}")
                    all_ok = False
                
                # 인사이트 CSV 확인 (NON 시즌, 설정된 경우)
                if season_config.get('generate_insights', False):
                    insight_file = Path(f'public/COST RAW/{season_folder}/{brand}_insight_{season_key.lower()}_non.csv')
                    if not insight_file.exists():
                        logger.warning(f"NON 인사이트 CSV 없음: {insight_file}")
                        all_ok = False
            else:
                # 일반 시즌 파일 확인
                # CSV 파일 확인
                csv_file = Path(f'public/COST RAW/{season_folder}/{brand}_{season_config.get("season_code", season_key)}.csv')
                if not csv_file.exists():
                    logger.warning(f"CSV 파일 없음: {csv_file}")
                    all_ok = False
                
                # SUMMARY JSON 확인
                summary_file = Path(f'public/COST RAW/{season_folder}/summary_{season_key.lower()}_{brand.lower()}.json')
                if not summary_file.exists():
                    logger.warning(f"SUMMARY JSON 없음: {summary_file}")
                    all_ok = False
                
                # X 브랜드인 경우 DISCOVERY-KIDS Summary 파일도 확인
                if brand == 'X':
                    summary_file_kids = Path(f'public/COST RAW/{season_folder}/summary_{season_key.lower()}_{brand.lower()}_kids.json')
                    if not summary_file_kids.exists():
                        logger.warning(f"DISCOVERY-KIDS SUMMARY JSON 없음: {summary_file_kids}")
                        all_ok = False
                
                # 인사이트 CSV 확인 (26SS만)
                if season_config.get('generate_insights', False):
                    insight_file = Path(f'public/COST RAW/{season_folder}/{brand}_insight_{season_key.lower()}.csv')
                    if not insight_file.exists():
                        logger.warning(f"인사이트 CSV 없음: {insight_file}")
                        all_ok = False
                    
                    # X 브랜드인 경우 DISCOVERY-KIDS 인사이트 파일도 확인
                    if brand == 'X':
                        insight_file_kids = Path(f'public/COST RAW/{season_folder}/{brand}_insight_{season_key.lower()}_kids.csv')
                        if not insight_file_kids.exists():
                            logger.warning(f"DISCOVERY-KIDS 인사이트 CSV 없음: {insight_file_kids}")
                            all_ok = False
    
    if all_ok:
        logger.info("모든 파일 검증 완료")
    else:
        logger.warning("일부 파일이 누락되었습니다.")
    
    return all_ok


def main():
    """메인 함수"""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info("자동 대시보드 업데이트 시작")
    logger.info(f"시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)
    
    # 설정 로드
    config = load_config()
    seasons = config.get('seasons', {})
    
    # 이메일 알림 (시작)
    send_email(
        config,
        "[대시보드 자동 업데이트] 시작",
        f"대시보드 자동 업데이트가 시작되었습니다.\n시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}"
    )
    
    success = True
    error_messages = []
    
    try:
        # 1. SQL → CSV 생성
        if not run_sql_to_csv():
            success = False
            error_messages.append("SQL → CSV 생성 실패")
        
        # NON 시즌과 일반 시즌 분리
        non_seasons = {}
        regular_seasons = {}
        
        for season_key, season_config in seasons.items():
            if season_config.get('is_non_season', False):
                non_seasons[season_key] = season_config
            else:
                regular_seasons[season_key] = season_config
        
        # 2. NON 시즌 처리 (환율 CSV는 한 번만 생성)
        if non_seasons:
            logger.info("=" * 60)
            logger.info("[NON 시즌 처리 시작]")
            logger.info("=" * 60)
            
            # 2-1. NON 시즌 환율 CSV 생성 (한 번만)
            if not generate_non_fx_csv():
                success = False
                error_messages.append("NON 시즌 환율 CSV 생성 실패")
            
            # 2-2. 각 NON 시즌별 처리
            for season_key, season_config in non_seasons.items():
                brands = season_config.get('brands', [])
                
                # 시즌 코드 추출 (25FW_NON -> 25FW)
                base_season = season_key.replace('_NON', '')
                
                # NON 시즌 CSV 생성
                if not generate_non_csv(base_season):
                    success = False
                    error_messages.append(f"{season_key} CSV 생성 실패")
                
                # NON 시즌 SUMMARY 생성
                if not generate_summary_non(base_season, brands):
                    success = False
                    error_messages.append(f"{season_key} SUMMARY 생성 실패")
                
                # NON 시즌 인사이트 생성 (설정된 경우)
                if season_config.get('generate_insights', False):
                    logger.info(f"{season_key} 인사이트 생성 (규칙 기반)")
                    if not generate_insights_for_season(season_key, brands):
                        success = False
                        error_messages.append(f"{season_key} 인사이트 생성 실패")
        
        # 3. 일반 시즌 처리
        for season_key, season_config in regular_seasons.items():
            brands = season_config.get('brands', [])
            
            if season_key == '25FW':
                if not generate_summary_25fw(brands):
                    success = False
                    error_messages.append(f"{season_key} SUMMARY 생성 실패")
            elif season_key == '25SS':
                # 25SS는 generate_summary_26ss.py 사용
                logger.info(f"{season_key} 시즌 처리 (generate_summary_26ss.py 사용)")
                if not generate_summary_26ss(brands, '25SS'):
                    success = False
                    error_messages.append(f"{season_key} SUMMARY 생성 실패")
            elif season_key == '26SS':
                if not generate_summary_26ss(brands, '26SS'):
                    success = False
                    error_messages.append(f"{season_key} SUMMARY 생성 실패")
            elif season_key == '26FW':
                # 26FW는 generate_summary_26ss.py 사용
                logger.info(f"{season_key} 시즌 처리 (generate_summary_26ss.py 사용)")
                if not generate_summary_26ss(brands, '26FW'):
                    success = False
                    error_messages.append(f"{season_key} SUMMARY 생성 실패")
            else:
                # 새로운 시즌은 generate_summary_26ss.py 사용
                logger.info(f"{season_key} 시즌 처리 (generate_summary_26ss.py 사용)")
                if not generate_summary_26ss(brands, season_key):
                    success = False
                    error_messages.append(f"{season_key} SUMMARY 생성 실패")
            
            # 4. 인사이트 생성 (설정된 시즌만)
            if season_config.get('generate_insights', False):
                # 25FW의 경우 M, I, X 제외 (하지만 DISCOVERY-KIDS는 별도 생성)
                if season_key == '25FW':
                    exclude_brands = season_config.get('exclude_insights_for', [])
                    filtered_brands = [b for b in brands if b not in exclude_brands]
                    if filtered_brands:
                        logger.info(f"{season_key} 인사이트 생성 (제외 브랜드: {', '.join(exclude_brands)})")
                        if not generate_insights_for_season(season_key, filtered_brands):
                            success = False
                            error_messages.append(f"{season_key} 인사이트 생성 실패")
                    else:
                        logger.info(f"{season_key} 인사이트 생성할 브랜드가 없습니다 (모두 제외됨)")
                    
                    # DISCOVERY-KIDS 인사이트만 별도 생성 (DISCOVERY 인사이트는 건드리지 않음)
                    logger.info(f"{season_key} DISCOVERY-KIDS 인사이트 생성 (DISCOVERY 인사이트는 건드리지 않음)")
                    try:
                        result = subprocess.run(
                            ['python', 'generate_insights_rule_based.py', '--season', season_key, '--kids-only'],
                            capture_output=True,
                            text=True,
                            encoding='utf-8'
                        )
                        if result.returncode == 0:
                            logger.info(f"{season_key} DISCOVERY-KIDS 인사이트 생성 완료")
                            logger.info(result.stdout)
                        else:
                            logger.error(f"{season_key} DISCOVERY-KIDS 인사이트 생성 실패: {result.stderr}")
                            success = False
                            error_messages.append(f"{season_key} DISCOVERY-KIDS 인사이트 생성 실패")
                    except Exception as e:
                        logger.error(f"{season_key} DISCOVERY-KIDS 인사이트 생성 중 오류: {e}")
                        success = False
                        error_messages.append(f"{season_key} DISCOVERY-KIDS 인사이트 생성 중 오류")
                else:
                    # 25SS, 26SS, 26FW 등 모든 브랜드 처리
                    logger.info(f"{season_key} 인사이트 생성 (규칙 기반)")
                    if not generate_insights_for_season(season_key, brands):
                        success = False
                        error_messages.append(f"{season_key} 인사이트 생성 실패")
        
        # 5. 파일 검증
        verify_files(config)
        
        # 6. Git 커밋 및 푸시 (성공한 경우만)
        if success:
            if not git_commit_and_push(config):
                logger.warning("Git 커밋/푸시 실패했지만 계속 진행합니다.")
                # Git 실패는 전체 실패로 처리하지 않음 (선택사항)
            
            # 7. Vercel 배포 (Git 푸시 성공한 경우)
            if not deploy_to_vercel(config):
                logger.warning("Vercel 배포 실패했지만 계속 진행합니다.")
                # 배포 실패는 전체 실패로 처리하지 않음
        
    except Exception as e:
        success = False
        error_messages.append(f"예상치 못한 오류: {str(e)}")
        logger.error(f"예상치 못한 오류: {e}", exc_info=True)
    
    # 완료 시간
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info("=" * 60)
    if success:
        logger.info("자동 대시보드 업데이트 완료")
    else:
        logger.error("자동 대시보드 업데이트 실패")
    logger.info(f"종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"소요 시간: {duration:.1f}초")
    logger.info("=" * 60)
    
    # 이메일 알림 (완료/실패)
    if success:
        subject = "[대시보드 자동 업데이트] 완료"
        body = f"""대시보드 자동 업데이트가 성공적으로 완료되었습니다.

시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}
종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}
소요 시간: {duration:.1f}초

로그 파일: {LOG_FILE}
"""
    else:
        subject = "[대시보드 자동 업데이트] 실패"
        body = f"""대시보드 자동 업데이트 중 오류가 발생했습니다.

시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}
종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}
소요 시간: {duration:.1f}초

오류 내용:
{chr(10).join(error_messages)}

로그 파일: {LOG_FILE}
"""
    
    send_email(config, subject, body, is_error=not success)
    
    # 윈도우 팝업 알림
    popup_title = "[대시보드 자동 업데이트] 완료" if success else "[대시보드 자동 업데이트] 실패"
    popup_message = f"""대시보드 자동 업데이트가 {'성공적으로 완료' if success else '실패'}되었습니다.

시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}
종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}
소요 시간: {duration:.1f}초"""
    
    if not success:
        popup_message += f"\n\n오류 내용:\n{chr(10).join(error_messages)}"
    
    show_windows_notification(popup_title, popup_message, is_error=not success)
    
    # Teams 메시지 전송
    teams_title = "[대시보드 자동 업데이트] 완료" if success else "[대시보드 자동 업데이트] 실패"
    teams_message = f"""**대시보드 자동 업데이트가 {'성공적으로 완료' if success else '실패'}되었습니다.**

- 시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}
- 종료 시간: {end_time.strftime('%Y-%m-%d %H:%M:%S')}
- 소요 시간: {duration:.1f}초
- 로그 파일: `{LOG_FILE}`"""
    
    if not success:
        teams_message += f"\n\n**오류 내용:**\n```\n{chr(10).join(error_messages)}\n```"
    
    send_teams_message(config, teams_title, teams_message, is_error=not success)
    
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()

