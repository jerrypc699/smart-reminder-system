param(
    [string]$AudioFile,
    [string]$Title = "نظام د. عبد العزيز الذكي",
    [string]$Message = "تذكير صوتي جديد",
    [int]$DurationSec = 0
)

# Output encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Show Windows Tray Notification
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $notify = New-Object System.Windows.Forms.NotifyIcon
    
    # Try custom icon or default information icon
    $iconPath = Join-Path $PSScriptRoot "..\public\pwa-192x192.png"
    if (Test-Path $iconPath) {
        $notify.Icon = [System.Drawing.SystemIcons]::Information
    } else {
        $notify.Icon = [System.Drawing.SystemIcons]::Information
    }
    
    $notify.BalloonTipTitle = $Title
    $notify.BalloonTipText = $Message
    $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
    $notify.Visible = $True
    $notify.ShowBalloonTip(10000)
} catch {
    Write-Host "Notification error: $_"
}

# Play Audio Headlessly via WMP COM Object
if ($AudioFile -and (Test-Path $AudioFile)) {
    try {
        $fullAudioPath = (Resolve-Path $AudioFile).Path
        $player = New-Object -ComObject wmplayer.ocx
        $player.settings.volume = 100
        $player.URL = $fullAudioPath
        $player.controls.play()

        if ($DurationSec -gt 0) {
            Start-Sleep -Seconds $DurationSec
            $player.controls.stop()
        } else {
            # Wait for media duration or max 240 seconds
            $waitCount = 0
            while ($player.playState -eq 3 -or $player.playState -eq 0 -or $player.playState -eq 9) {
                Start-Sleep -Seconds 1
                $waitCount++
                if ($waitCount -gt 240) { break }
            }
        }
    } catch {
        Write-Host "Audio play error: $_"
    }
}

# Clean up notification icon
if ($notify) {
    Start-Sleep -Seconds 2
    $notify.Dispose()
}
