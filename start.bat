@echo off
echo Stopping any running Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting Signaling Server (Port 3001)...
start "Signaling Server" cmd /k "node server/index.js"

timeout /t 3 /nobreak >nul

echo.
echo Starting Next.js App (Port 3000)...
start "Next.js Dev Server" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   App is starting!
echo ============================================
echo   Laptop:  http://localhost:3000
echo   Mobile:  http://10.110.44.138:3000
echo ============================================
echo.
echo Press any key to open in browser...
pause >nul
start http://localhost:3000
