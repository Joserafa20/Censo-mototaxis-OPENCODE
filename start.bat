@echo off
echo ============================================
echo   Sistema de Censo de Mototaxis - Start
echo ============================================
echo.

echo [1/2] Starting Backend (port 3000)...
cd /d "%~dp0"
start "Censo-Backend" cmd /k "title Backend - Puerto 3000 & npx tsx src/server.ts"

echo [2/2] Starting Frontend (port 5173)...
cd /d "%~dp0frontend"
start "Censo-Frontend" cmd /k "title Frontend - Puerto 5173 & npm run dev"

echo.
echo ============================================
echo   Both services started!
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
echo Login: admin@sabanalarga.gov.co / Admin@2026!
echo.
pause