@echo off
rem Запуск Ghost из исходников (быстрая проверка после правок).
cd /d "%~dp0"
call npm run win:dev
if errorlevel 1 pause
