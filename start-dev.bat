@echo off
echo Starting AssurePro AI...

:: Start backend in new window
start "AssurePro Backend" cmd /k "cd backend && npm start"

:: Wait 3 seconds
timeout /t 3 /nobreak

:: Start frontend
echo Starting frontend...
npm run dev
