@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 작업물 관리

start "" http://localhost:4600
node scripts\admin.mjs

echo.
echo 관리 화면이 꺼졌습니다.
pause
