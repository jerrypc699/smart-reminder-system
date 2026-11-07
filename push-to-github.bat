@echo off
chcp 65001 >nul
set "PATH=%PATH%;C:\Users\Administrator\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd;C:\Users\Administrator\AppData\Local\Programs\Git\cmd"

echo ========================================================
echo    رفع نظام د. عبد العزيز للتذكير الذكي على GitHub
echo ========================================================
echo.

echo [1/3] التحقق من Git...
git --version
if %errorlevel% neq 0 (
    echo [X] تعذر العثور على أداة Git.
    pause
    exit /b
)

echo.
echo [2/3] تجهيز كافة ملفات المشروع والتعديلات الأخيرة...
git add .
git commit -m "feat: Add Android APK builder and 24/7 prayer pulse" 2>nul

git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/jerrypc699/smart-reminder-system.git

echo.
echo [3/3] جاري رفع المشروع إلى GitHub تلقائياً...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo    [✓] تم رفع المشروع بنجاح إلى GitHub!
    echo    جاري الآن بناء تطبيق الأندرويد (APK) سحابياً...
    echo ========================================================
) else (
    echo.
    echo [!] يرجى التأكد من تسجيل الدخول إلى GitHub في المتصفح.
)

timeout /t 5
