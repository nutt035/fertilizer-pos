@echo off
title POS Setup Creator
color 0A

echo.
echo ========================================
echo   Creating POS Setup Package
echo ========================================
echo.

:: Create output folder
set OUTPUT_DIR=%USERPROFILE%\Desktop\POS-Setup
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%\print-server"

:: Copy files
echo Copying files...
copy "%~dp0POS-Launcher.bat" "%OUTPUT_DIR%\" >nul
copy "%~dp0LAUNCHER-README.md" "%OUTPUT_DIR%\" >nul
copy "%~dp0print-server\server.js" "%OUTPUT_DIR%\print-server\" >nul
copy "%~dp0print-server\package.json" "%OUTPUT_DIR%\print-server\" >nul
copy "%~dp0print-server\start-server.bat" "%OUTPUT_DIR%\print-server\" >nul

:: Create install script for shop computer
(
echo @echo off
echo title POS Installer
echo color 0A
echo echo.
echo echo ========================================
echo echo   Installing POS System
echo echo ========================================
echo echo.
echo echo Step 1: Installing Node.js dependencies...
echo cd /d "%%~dp0print-server"
echo npm install
echo if %%errorlevel%% neq 0 ^(
echo     echo ERROR: Failed to install dependencies!
echo     echo Make sure Node.js is installed from https://nodejs.org
echo     pause
echo     exit /b 1
echo ^)
echo echo.
echo echo Step 2: Creating Desktop shortcut...
echo powershell "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\POS System.lnk'); $s.TargetPath = '%%~dp0POS-Launcher.bat'; $s.Save()"
echo echo.
echo echo ========================================
echo echo   Installation Complete!
echo echo ========================================
echo echo.
echo echo Double-click "POS System" on Desktop to start.
echo pause
) > "%OUTPUT_DIR%\INSTALL.bat"

echo.
echo ========================================
echo   Setup package created!
echo ========================================
echo.
echo Location: %OUTPUT_DIR%
echo.
echo Copy this folder to USB and run INSTALL.bat on shop computer.
echo.
pause
start "" "%OUTPUT_DIR%"
