@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 사이트 배포

echo.
echo 바뀐 내용을 확인하는 중...
echo.
git add -A
git diff --cached --stat

git diff --cached --quiet
if %errorlevel%==0 (
  echo.
  echo 바뀐 게 없습니다. 올릴 것이 없어요.
  echo.
  pause
  exit /b 0
)

echo.
echo 인터넷에 올리는 중...
echo.
git commit -m "사이트 업데이트 %date% %time%"
if errorlevel 1 goto fail

git push
if errorlevel 1 goto fail

echo.
echo ============================================
echo   올렸습니다!
echo.
echo   1~2분 뒤에 아래 주소에서 확인하세요
echo       https://namples.github.io
echo.
echo   진행 상황 보기
echo       https://github.com/NampleS/NampleS.github.io/actions
echo ============================================
echo.
pause
exit /b 0

:fail
echo.
echo ---- 문제가 생겼습니다 ----
echo 위에 뜬 빨간 글씨를 그대로 복사해서 클로드에게 보여주세요.
echo.
pause
exit /b 1
