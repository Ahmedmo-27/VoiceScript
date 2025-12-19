@echo off
title Voice App - Starting all services

echo Starting Node backend...
start cmd /k "cd backend && node server.js"

echo Starting React frontend...
start cmd /k "npm run dev"

echo Starting Flask transcription...
start cmd /k "cd flask voice && python flask_transcribe.py"

echo Starting Flask run.py...
start cmd /k "cd flask voice && python run.py"

echo All services started!
pause
