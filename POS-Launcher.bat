@echo off
title POS System Launcher
color 0A

echo.
echo ========================================
echo       Fertilizer POS System
echo ========================================
echo.

:: ตั้งค่า URL ของเว็บ POS (แก้ให้ตรงกับ URL จริง)
set POS_URL=https://fertilizer-pos.vercel.app/

:: Path ของ print-server
set PRINT_SERVER_PATH=%~dp0print-server

echo [1/3] Starting Print Server...
cd /d "%PRINT_SERVER_PATH%"
start /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo [2/3] Waiting for Print Server to be ready...
timeout /t 3 /nobreak >nul

echo [3/3] Opening POS Application...

:: เปิด Chrome ในโหมด App + Maximize (เต็มหน้าจอแบบปกติ)
:: ถ้าใช้ Edge ให้เปลี่ยน chrome.exe เป็น msedge.exe
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%POS_URL%" --start-maximized

echo.
echo ========================================
echo   POS System is now running!
echo   Close this window to stop the server.
echo ========================================
echo.

:: รอให้ปิดหน้าต่างนี้ก่อนถึงจะ terminate
pause
