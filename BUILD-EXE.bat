@echo off
rem Сборка установщика Windows (.exe) в папку release. Попросит права администратора.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1" -BuildOnly
