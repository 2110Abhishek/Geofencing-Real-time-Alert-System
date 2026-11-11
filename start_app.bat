@echo off
echo ========================================================
echo   GeoTrack - Geofencing ^& Real-Time Telematics Platform
echo ========================================================
echo.
echo Starting Backend API ^& WebSocket Server on http://localhost:8080 ...
start "GeoTrack Backend" cmd /k "node scripts/mock_server.js"

echo Starting Frontend Web Application on http://localhost:5173 ...
cd frontend
start "GeoTrack Frontend" cmd /k "pnpm run dev"

echo.
echo GeoTrack is now launching!
echo   - Web Dashboard:  http://localhost:5173
echo   - Backend REST API: http://localhost:8080
echo   - WebSocket Feed:   ws://localhost:8080/ws/alerts
echo ========================================================

