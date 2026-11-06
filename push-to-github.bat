@echo off
chcp 65001 >nul
set "PATH=%PATH%;C:\Users\Administrator\AppData\Local\Programs\Git\cmd;C:\Users\Administrator\AppData\Local\Programs\GitHubCLI"

echo ========================================================
echo    رفع نظام د. عبد العزيز للتذكير الذكي على GitHub
echo ========================================================
echo.

echo [1/4] التحقق من Git...
git --version
if %errorlevel% neq 0 (
    echo [X] تعذر العثور على أداة Git.
    pause
    exit /b
)

echo.
echo [2/4] تجهيز كافة ملفات المشروع والتعديلات الأخيرة...
git add .
git commit -m "feat(pwa): Dr. Abdelaziz Smart Reminder - Mobile PWA & Vercel deployment" 2>nul

echo.
echo [3/4] المستودع الحالي المعين:
git remote -v
echo.
echo إذا كان لديك مستودع جاهز على GitHub، أدخل رابطه بالأسفل:
echo (أو اضغط Enter مباشرة للاعتماد على: https://github.com/jerrypc699/smart-reminder-system.git)
set /p repo_url="رابط المستودع: "

if "%repo_url%"=="" (
    set repo_url=https://github.com/jerrypc699/smart-reminder-system.git
)

git branch -M main
git remote remove origin 2>nul
git remote add origin %repo_url%

echo.
echo [4/4] جاري رفع المشروع إلى GitHub (%repo_url%)...
echo ملاحظة: إذا ظهرت نافذة تسجيل الدخول لـ GitHub، يرجى الموافقة عليها لإتمام الرفع.
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo    [✓] تم رفع المشروع بنجاح إلى GitHub!
    echo ========================================================
) else (
    echo.
    echo [!] تنبيه: إذا لم يكن المستودع منشأ بعد على حسابك، يرجى إنشاؤه أولاً عبر الرابط:
    echo     https://github.com/new
    echo     ثم إعادة تشغيل هذا الملف.
)

pause
