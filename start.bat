@echo off
title CarbonLens SME - Industrial Circular Carbon Intelligence
cls
echo ================================================================
echo                 CARBONLENS SME — HACKOUT'26
echo   Industrial Emission Leak-Point Detector & Circular Recommender
echo ================================================================
echo.

set PY_CMD=python

REM 1. Verify Python Availability (Check 'python' then 'py')
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py -3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python is not installed or not added to your system PATH.
        echo Please install Python 3.10+ from https://www.python.org/downloads/
        echo IMPORTANT: Make sure to check "Add Python to PATH" during installation.
        echo.
        pause
        exit /b 1
    ) else (
        set PY_CMD=py -3
    )
)

echo [1/3] Python environment verified (%PY_CMD%).
echo.

REM 2. Check ALL required Python dependencies (fastapi, uvicorn, pydantic, dotenv, supabase, httpx, reportlab)
echo [2/3] Verifying required Python packages...
%PY_CMD% -c "import fastapi, uvicorn, pydantic, dotenv, supabase, httpx, reportlab" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing required packages from requirements.txt...
    %PY_CMD% -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [INFO] Standard pip install failed. Retrying with --user flag...
        %PY_CMD% -m pip install --user -r requirements.txt
        if %errorlevel% neq 0 (
            echo [ERROR] Automatic pip installation failed.
            echo Please open Command Prompt in this folder and run:
            echo     pip install -r requirements.txt
            echo.
            pause
            exit /b 1
        )
    )
    echo [SUCCESS] Dependencies installed successfully.
) else (
    echo [INFO] All core Python packages are already installed and verified.
)

echo.
echo [3/3] Launching CarbonLens SME Server on http://127.0.0.1:8000 ...
echo Press Ctrl+C in this window anytime to stop the server.
echo.

REM Launch browser in 3 seconds after uvicorn initializes
start /b cmd /c "timeout /t 3 >nul && start http://127.0.0.1:8000"

%PY_CMD% -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

pause
