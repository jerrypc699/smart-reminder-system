Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\smart-reminder-system"
WshShell.Run "node scripts\windows-daemon.cjs", 0, False

