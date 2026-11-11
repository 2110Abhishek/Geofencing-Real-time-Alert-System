# GeoTrack - Local Quickstart Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  GeoTrack - Geofencing & Real-Time Telematics Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting Backend API & WebSocket Engine (Port 8080)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node scripts/mock_server.js"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend Dev Server (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; pnpm run dev"

Write-Host ""
Write-Host "Services Started!" -ForegroundColor Cyan
Write-Host "  - Frontend Dashboard:   http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - Backend REST API:     http://localhost:8080" -ForegroundColor Yellow
Write-Host "  - WebSocket Alerts:     ws://localhost:8080/ws/alerts" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan

