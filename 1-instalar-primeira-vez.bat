@echo off
cd /d "%~dp0"
echo ==============================================
echo   Instalando o EP Partners CRM (primeira vez)
echo ==============================================
echo.
call npm install
call npm run db:push
call npm run db:seed
echo.
echo ==============================================
echo   Instalacao concluida! Iniciando o sistema...
echo ==============================================
call npm run dev
