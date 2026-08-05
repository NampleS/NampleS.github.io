@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 사이트 미리보기

if not exist node_modules (
  echo.
  echo 처음 실행이라 준비를 좀 하겠습니다. 1~2분 걸립니다...
  echo.
  call npm install
)

echo.
echo ============================================
echo   브라우저에서 아래 주소를 여세요
echo.
echo       http://localhost:4321
echo.
echo   끄고 싶으면 이 창에서 Ctrl + C
echo ============================================
echo.

call npm run dev
pause
