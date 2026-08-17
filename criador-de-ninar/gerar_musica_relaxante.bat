@echo off
title FEFO IA - Sintetizador de Musica Relaxante
cd /d "%~dp0"
echo ====================================================
echo   SINTETIZANDO MUSICA INSTRUMENTAL COM CHUVA (5 MIN)
echo ====================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -Path '%~dp0SoundGenerator.cs'; [SoundGenerator]::Main(@('%~dp0FEFO - Chuva Relaxante (5 Minutos).wav'))"
echo.
echo Copiando para Musicas para o fefo...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item '%~dp0FEFO - Chuva Relaxante (5 Minutos).wav' '..\Musicas para o fefo\FEFO - Chuva Relaxante (5 Minutos).wav' -Force"
echo Concluido!
pause
