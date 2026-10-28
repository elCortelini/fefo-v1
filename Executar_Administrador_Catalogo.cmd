@echo off
title FEFO - Administrador do Catalogo Local
cd /d "%~dp0"

echo ========================================================
echo   INICIANDO ADMINISTRADOR DE CATALOGO FEFO (REDE LOCAL)
echo ========================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set "PY=python"
) else (
    if exist ".venv\Scripts\python.exe" (
        set "PY=.venv\Scripts\python.exe"
    ) else (
        echo [ERRO] Python nao foi encontrado neste computador!
        echo Instale o Python (versao 3.10 ou superior) marcando 'Add python.exe to PATH'.
        echo.
        pause
        exit /b 1
    )
)

echo Executando com: %PY%
echo Servidor disponivel em: http://127.0.0.1:8765/catalog-admin/index.html
echo.
echo Pressione Ctrl+C nesta janela para parar o servidor.
echo.

%PY% tools\catalog_manager.py
pause
