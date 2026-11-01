@echo off
title FEFO - Servidor F5-TTS de Clonagem de Voz por IA
cd /d "%~dp0\.."

echo ========================================================
echo   FEFO - SERVIDOR F5-TTS DE CLONAGEM DE VOZ (IA)
echo   Repositorio Base: https://github.com/SWivid/F5-TTS
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PY=python"
) else (
    if exist ".venv\Scripts\python.exe" (
        set "PY=.venv\Scripts\python.exe"
    ) else (
        echo [ERRO] Python nao foi encontrado no sistema!
        echo Certifique-se de que o Python esta instalado.
        pause
        exit /b 1
    )
)

echo Executando com: %PY%
echo Servidor disponivel em: http://127.0.0.1:9880/health
echo.
echo Para parar o servidor, pressione Ctrl+C nesta janela.
echo ========================================================
echo.

%PY% tools\f5_tts_api.py
pause
