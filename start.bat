@echo off
title CarbonLens - Industrial Carbon SaaS
cls
echo ================================================================
echo           CARBONLENS - HACKOUT'26 AT DA-IICT
echo   Industrial Emission Leak-Point Detector & Circular Recommender
echo ================================================================
echo.
echo [1/2] Launching CarbonLens at http://127.0.0.1:8000 ...
timeout /t 2 >nul
start "" "http://127.0.0.1:8000"

echo [2/2] Starting Python API Engine on port 8000 ...
echo Press Ctrl+C in this window anytime to stop the server.
echo.

python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

pause
