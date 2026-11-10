@echo off
rem Agenda o backup da pasta Clientes para todo dia as 12h.
rem Se o PC estiver desligado nesse horario, roda assim que ligar.
chcp 65001 >nul
set "BAT=%~dp0backup-clientes.bat"
schtasks /create /tn "PrimeCred - Backup Clientes" /tr "\"%BAT%\" auto" /sc daily /st 12:00 /f
if errorlevel 1 (
  echo Nao consegui agendar. Clique com o botao direito neste arquivo e escolha "Executar como administrador".
  pause
  exit /b 1
)
powershell -NoProfile -Command "Set-ScheduledTask -TaskName 'PrimeCred - Backup Clientes' -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries) | Out-Null"
echo.
echo Pronto! O backup roda todo dia as 12h, ou assim que o PC ligar se estiver desligado.
pause
