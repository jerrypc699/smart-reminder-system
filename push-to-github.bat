@echo off
chcp 65001 >nul
echo ========================================================
echo    رفع نظام د. عبد العزيز للتذكير الذكي على GitHub
echo ========================================================
echo.

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] تنبيه: أداة Git غير مثبتة في مسار النظام حالياً.
    echo يمكنك تحميل وتثبيت Git بسهولة من الرابط التالي:
    echo https://git-scm.com/download/win
    echo أو استخدام تطبيق GitHub Desktop البسيط:
    echo https://desktop.github.com
    echo.
    pause
    exit /b
)

echo [1/4] تهيئة مستودع Git محلي...
git init

echo [2/4] إضافة وتجهيز كافة ملفات المشروع...
git add .

echo [3/4] إنشاء Commit بالنسخة الحالية...
git commit -m "Release: Dr. Abdelaziz Smart Reminder & Media Scheduler System"

set /p repo_url="ضع رابط مستودع GitHub هنا (مثال: https://github.com/username/repo.git): "

if "%repo_url%"=="" (
    echo تم إنشاء المستودع المحلي بنجاح، يمكنك ربطه لاحقاً.
    pause
    exit /b
)

echo [4/4] جاري رفع المشروع إلى GitHub...
git branch -M main
git remote remove origin 2>nul
git remote add origin %repo_url%
git push -u origin main

echo.
echo [✓] تم رفع المشروع بنجاح إلى GitHub!
pause

