@echo off
title Idle Chronicles - Stop
cd /d "%~dp0"

echo Stopping Idle Chronicles services...

:: Kill by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill node processes from this project
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.cmd >nul 2>&1

echo Done. Services stopped.
pause
