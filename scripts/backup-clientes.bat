@echo off
rem Atualiza a pasta "Clientes" (ao lado da pasta do codigo) com os dados e documentos do Supabase.
rem Clique duas vezes para rodar agora. O agendamento diario chama com "auto".
chcp 65001 >nul
cd /d "%~dp0.."
if "%1"=="auto" (
  if not exist logs mkdir logs
  node --env-file=.env.local scripts\backup-clientes.mjs >> logs\backup-clientes.log 2>&1
  exit /b
)
node --env-file=.env.local scripts\backup-clientes.mjs
echo.
pause
