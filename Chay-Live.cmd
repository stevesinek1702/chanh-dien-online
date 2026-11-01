@echo off
rem Chay server Chanh Dien cho LIVE dai (10h, 24h): server dung vi bat ky ly do gi se tu khoi dong lai sau 5 giay.
rem Cau hinh kenh, cai dat duoc luu trong live\data nen khoi dong lai khong mat gi.
title Chanh Dien Online - server
cd /d "%~dp0live"

rem Khoa Euler Stream (nen co khi chay tu 2 kenh tro len, dang ky mien phi tai eulerstream.com):
rem bo chu "rem " o dong duoi va dan khoa vao.
rem set SIGN_API_KEY=dan_khoa_cua_ban_vao_day

where node >nul 2>nul || (echo Chua cai Node.js 20+. Tai tai https://nodejs.org roi chay lai. & pause & exit /b 1)
if not exist node_modules (
  echo Dang cai thu vien lan dau...
  call npm ci --ignore-scripts --no-audit --no-fund || (echo Cai thu vien that bai. Kiem tra mang Internet. & pause & exit /b 1)
)
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000/"

:loop
node server.mjs
echo [%date% %time%] Server dung (ma %errorlevel%). Tu khoi dong lai sau 5 giay... Bam Ctrl+C de thoat han.
timeout /t 5 /nobreak >nul
goto loop
