@echo off
echo ==========================================
echo Starting Face Recognition Service on Port 8080...
echo ==========================================
cd backend\FaceRecognitionService
echo Checking dependencies...
python -m pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install dependencies. Please check your internet or Python installation.
    pause
    exit /b %ERRORLEVEL%
)
echo Starting service...
python main.py
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Service failed to start.
    pause
)
pause
