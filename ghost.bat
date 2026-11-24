@echo off
chcp 65001 >nul
rem Morphin · Ghost: запускает ghost.sh. Если Git Bash нет — сам ставит всё нужное (Node.js, Git, GitHub CLI).
rem Примеры:  ghost.bat            (меню)    ghost.bat all    ghost.bat update    ghost.bat release
cd /d "%~dp0"

call :findbash
if not defined GBASH (
  echo [Morphin] Git Bash не найден — ставлю Node.js, Git и GitHub CLI. Сейчас появится запрос Windows, нажмите "Да".
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0scripts\setup-windows.ps1\" -InstallOnly'"
  call :findbash
)
if not defined GBASH (
  echo.
  echo [Morphin] Не удалось найти Git Bash. Установите Git с https://git-scm.com и запустите ghost.bat снова.
  pause
  exit /b 1
)

"%GBASH%" "%~dp0ghost.sh" %*
set "RC=%errorlevel%"
if "%~1"=="" goto :eof
echo.
pause
exit /b %RC%

:findbash
set "GBASH="
for %%P in ("%ProgramFiles%\Git\bin\bash.exe" "%ProgramFiles(x86)%\Git\bin\bash.exe" "%LocalAppData%\Programs\Git\bin\bash.exe") do (
  if exist %%P set "GBASH=%%~P"
)
exit /b 0
