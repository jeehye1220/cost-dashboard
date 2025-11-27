# Windows 작업 스케줄러 설정 스크립트
# PowerShell 관리자 권한으로 실행 필요

$taskName = "DashboardAutoUpdate"
$scriptPath = Join-Path $PSScriptRoot "auto_update_dashboard.py"
$pythonPath = (Get-Command python).Source

Write-Host "=" * 60
Write-Host "Windows 작업 스케줄러 설정"
Write-Host "=" * 60
Write-Host "작업 이름: $taskName"
Write-Host "스크립트 경로: $scriptPath"
Write-Host "Python 경로: $pythonPath"
Write-Host ""

# 기존 작업이 있으면 삭제
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "기존 작업 삭제 중..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 작업 실행 액션 생성
$action = New-ScheduledTaskAction -Execute $pythonPath -Argument "`"$scriptPath`"" -WorkingDirectory $PSScriptRoot

# 트리거 생성 (매일 오전 11시)
$trigger = New-ScheduledTaskTrigger -Daily -At 11:00AM

# 설정 생성
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# 작업 생성
Write-Host "작업 스케줄러에 등록 중..."
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "매일 오전 11시 대시보드 자동 업데이트" -User $env:USERNAME

Write-Host ""
Write-Host "작업 스케줄러 등록 완료!"
Write-Host "작업 이름: $taskName"
Write-Host "실행 시간: 매일 오전 11:00"
Write-Host ""
Write-Host "작업 확인: Get-ScheduledTask -TaskName $taskName"
Write-Host "작업 삭제: Unregister-ScheduledTask -TaskName $taskName -Confirm:`$false"

