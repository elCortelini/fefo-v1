@echo off
title Configurar PC para o Projeto FEFO
cd /d "%~dp0"

echo ========================================================
echo   CONFIGURACAO DE REDE - PROJETO FEFO (MULTI-PC)
echo ========================================================
echo.

where git >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [1/2] Configurando Git para permitir pasta de rede compartilhada...
    git config --global --add safe.directory "%~dp0"
    git config --global --add safe.directory "Z:/FEFO/GITHUB"
    echo [OK] Git configurado com sucesso!
) else (
    echo [AVISO] Git nao instalado neste computador.
)

echo.
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/2] Instalando requisitos do Python (Pillow, etc.)...
    python -m pip install -r tools\requirements.txt
    echo [OK] Dependencias instaladas!
) else (
    echo [AVISO] Python nao instalado. Instale o Python para rodar ferramentas locais.
)

echo.
echo ========================================================
echo   CONFIGURACAO CONCLUIDA!
echo   Para abrir o Administrador, execute:
echo   Executar_Administrador_Catalogo.cmd
echo ========================================================
echo.
pause
