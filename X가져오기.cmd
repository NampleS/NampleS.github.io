@echo off
chcp 65001 > nul
cd /d "%~dp0"
title X 작업물 가져오기

echo.
echo ============================================================
echo   X(트위터) 작업물 가져오기
echo ============================================================
echo.
echo   준비물: X에서 받은 데이터 아카이브 (압축을 푼 폴더)
echo.
echo   아직 없다면:
echo     X 앱/웹  설정  ^>  계정  ^>  데이터 아카이브 다운로드
echo     신청하면 X가 준비해줍니다 (보통 하루 정도 걸립니다)
echo.
echo ------------------------------------------------------------
echo   압축을 푼 폴더를 이 창으로 끌어다 놓고 엔터를 누르세요.
echo ------------------------------------------------------------
echo.

set "ARCHIVE="
set /p "ARCHIVE=폴더: "

if not defined ARCHIVE (
  echo.
  echo 폴더를 안 넣으셨습니다. 그냥 종료합니다.
  echo.
  pause
  exit /b 0
)

echo.
node scripts\import-x.mjs %ARCHIVE%

echo.
pause
