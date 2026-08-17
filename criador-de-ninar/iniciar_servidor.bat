@echo off
title Servidor FEFO IA - Player Relaxante
cd /d "%~dp0"
echo ====================================================
echo   INICIANDO SERVIDOR LOCAL FEFO IA...
echo ====================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -Path '%~dp0SimpleHttpServer.cs'; [SimpleHttpServer]::Main(@('8080', '%~dp0'))"
pause
