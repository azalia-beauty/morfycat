@echo off
rem Установка всего необходимого и (по желанию) сборка Ghost. Двойной клик.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
