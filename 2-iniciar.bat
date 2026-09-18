@echo off
cd /d "%~dp0"
echo Iniciando o EP Partners CRM...
echo Quando aparecer "Ready", abra o navegador em http://localhost:3000
echo Para PARAR o sistema, feche esta janela.
echo.
call npm run dev
