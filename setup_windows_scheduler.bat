@echo off
REM Windows 작업 스케줄러 설정 배치 파일
REM 관리자 권한으로 실행 필요

echo ============================================================
echo Windows 작업 스케줄러 설정
echo ============================================================
echo.

set TASK_NAME=DashboardAutoUpdate
set SCRIPT_PATH=%~dp0auto_update_dashboard.py
set PYTHON_PATH=python

echo 작업 이름: %TASK_NAME%
echo 스크립트 경로: %SCRIPT_PATH%
echo Python 경로: %PYTHON_PATH%
echo.

REM 기존 작업이 있으면 삭제
schtasks /Query /TN %TASK_NAME% >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo 기존 작업 삭제 중...
    schtasks /Delete /TN %TASK_NAME% /F
)

REM 작업 생성 (매일 오전 11시)
echo 작업 스케줄러에 등록 중...
schtasks /Create /TN %TASK_NAME% /TR "%PYTHON_PATH% \"%SCRIPT_PATH%\"" /SC DAILY /ST 11:00 /RU %USERNAME% /RL HIGHEST /F

if %ERRORLEVEL% == 0 (
    echo.
    echo 작업 스케줄러 등록 완료!
    echo 작업 이름: %TASK_NAME%
    echo 실행 시간: 매일 오전 11:00
    echo.
    echo 작업 확인: schtasks /Query /TN %TASK_NAME%
    echo 작업 삭제: schtasks /Delete /TN %TASK_NAME% /F
) else (
    echo.
    echo 작업 스케줄러 등록 실패!
    echo 관리자 권한으로 실행했는지 확인하세요.
)

pause

