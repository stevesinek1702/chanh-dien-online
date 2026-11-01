@echo off
rem Mo overlay 9:16 cua tung kenh trong cua so Chrome rieng (dung cho TikTok LIVE Studio: Add source - Window capture).
rem Am thanh tu bat, cua so bi che van chay muot (khong bi Chrome tam dung), hop cho LIVE dai.
rem   Mo-Overlay.cmd              mo kenh1..kenh4
rem   Mo-Overlay.cmd kenh1 kenh3  chi mo cac kenh duoc ghi
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%CHROME%" (echo Khong tim thay Chrome hoac Edge. & pause & exit /b 1)
set "PROFILE=%~dp0live\data\chrome-overlay"
if "%~1"=="" (set "LIST=kenh1 kenh2 kenh3 kenh4") else (set "LIST=%*")
for %%C in (%LIST%) do (
  start "" "%CHROME%" --user-data-dir="%PROFILE%" --no-first-run --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --app=http://localhost:3000/live/overlay.html?ch=%%C --window-size=540,960
  timeout /t 1 /nobreak >nul
)
