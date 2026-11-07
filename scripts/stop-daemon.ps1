$ErrorActionPreference = 'SilentlyContinue'

Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*windows-daemon.cjs*' } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
    Write-Host "[OK] Stopped background daemon process (PID: $($_.ProcessId))." -ForegroundColor Green
}

$statusFile = 'D:\smart-reminder-system\daemon-status.json'
if (Test-Path $statusFile) {
    Remove-Item $statusFile -Force
}

Write-Host "[OK] Background Daemon stopped." -ForegroundColor Green
Start-Sleep -Seconds 1
