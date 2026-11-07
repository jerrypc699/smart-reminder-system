$ErrorActionPreference = 'SilentlyContinue'

# 1. Stop old instances
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*windows-daemon.cjs*' } | ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
}

# 2. Add to Startup folder
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$startupScript = [System.IO.Path]::Combine($startupFolder, 'DrAbdelaziz-Reminder.vbs')
$sourceScript = 'D:\smart-reminder-system\start-pc-daemon.vbs'

if (Test-Path $sourceScript) {
    Copy-Item -Path $sourceScript -Destination $startupScript -Force
    Write-Host "[OK] Dr. Abdelaziz System registered in Windows Startup successfully." -ForegroundColor Green
}

# 3. Start daemon now
Start-Process "wscript.exe" -ArgumentList "`"$sourceScript`""
Write-Host "[OK] Background Daemon running 24/7." -ForegroundColor Green
Start-Sleep -Seconds 1
