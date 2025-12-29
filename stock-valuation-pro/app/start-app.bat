@echo off
title Stock Valuation App
echo ========================================
echo    Starting Stock Valuation App...
echo ========================================
echo.

cd /d "c:\Users\Asus\.gemini\antigravity\scratch\stock-valuation-app"

:: Start the browser after a short delay (gives server time to start)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start the dev server (this keeps running)
npm run dev

pause
