@echo off
echo ========================================
echo   POS Print Server
echo ========================================
echo.
echo Starting server...
echo.
cd /d "%~dp0"

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo Server is starting...
echo.
node server.js

:: If we get here, the server crashed
echo.
echo ========================================
echo   SERVER STOPPED OR CRASHED
echo ========================================
echo.
pause
