@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   GeoTrack - Docker Hub Image Builder ^& Publisher
echo ========================================================
echo.

set /p DOCKER_USER="Enter your Docker Hub username (e.g. yourname): "
if "%DOCKER_USER%"=="" (
    echo [ERROR] Docker Hub username cannot be empty.
    pause
    exit /b 1
)

echo.
echo [1/4] Logging in to Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo [ERROR] Docker login failed. Please ensure Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo [2/4] Building Backend Image...
docker build -t %DOCKER_USER%/geotrack-backend:latest ./backend
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Building Frontend Image...
docker build -t %DOCKER_USER%/geotrack-frontend:latest ./frontend
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

echo.
echo [4/4] Pushing images to Docker Hub...
docker push %DOCKER_USER%/geotrack-backend:latest
docker push %DOCKER_USER%/geotrack-frontend:latest

echo.
echo ========================================================
echo   SUCCESS! Here are your Docker Hub Submission Links:
echo ========================================================
echo Backend Image URL:
echo   https://hub.docker.com/r/%DOCKER_USER%/geotrack-backend
echo.
echo Frontend Image URL:
echo   https://hub.docker.com/r/%DOCKER_USER%/geotrack-frontend
echo.
echo Docker Pull Commands for Evaluators:
echo   docker pull %DOCKER_USER%/geotrack-backend:latest
echo   docker pull %DOCKER_USER%/geotrack-frontend:latest
echo ========================================================
echo.
pause

