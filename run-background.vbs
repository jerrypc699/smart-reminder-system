Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\smart-reminder-system"
WshShell.Run "cmd /c npm run dev", 0, False
WScript.Sleep 2000
WshShell.Run "http://localhost:5173"

