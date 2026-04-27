@echo off
title Idle Chronicles
cd /d "%~dp0"

echo ========================================
echo    Idle Chronicles - Start
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js not found. Please install Node.js
    echo Download: https://nodejs.org/
    pause
    exit /b
)

set SERVER_DIR=%~dp0server
set CLIENT_DIR=%~dp0client

:: Install server deps
if not exist "%SERVER_DIR%\node_modules" (
    echo [1/3] Installing server dependencies...
    cd /d "%SERVER_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo [Error] Server dependencies install failed
        pause
        exit /b
    )
)

:: Install client deps
if not exist "%CLIENT_DIR%\node_modules" (
    echo [2/3] Installing client dependencies...
    cd /d "%CLIENT_DIR%"
    call npm install
    if %errorlevel% neq 0 (
        echo [Error] Client dependencies install failed
        pause
        exit /b
    )
)

echo [3/3] Starting services...

:: Kill old services on port 3001 and 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start server in same console window (background)
cd /d "%SERVER_DIR%"
start "" /B node src/index.js > "%TEMP%\ic_server.log" 2>&1

:: Wait for server startup
timeout /t 3 /nobreak >nul

:: Start client in same console window (background)
cd /d "%CLIENT_DIR%"
start "" /B npm run dev -- --host > "%TEMP%\ic_client.log" 2>&1

:: Go back to root
cd /d "%~dp0"

echo.
echo ========================================
echo   Done! Services running in this window.
echo   Server log:  %%TEMP%%\ic_server.log
echo   Client log:  %%TEMP%%\ic_client.log
echo   Open http://localhost:3000 in browser
echo   To stop services, run stop.bat
echo ========================================

start http://localhost:3000

echo.
echo Press any key to close this window (services stop when window closes)...
pause >nul

:: Cleanup on exit
taskkill /F /IM node.exe >nul 2>&1
