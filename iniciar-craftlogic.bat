@echo off
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  echo Instalando dependencias de CraftLogic por primera vez...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
start "" http://localhost:3000
call npm start
pause
