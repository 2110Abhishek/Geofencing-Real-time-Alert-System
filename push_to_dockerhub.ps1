# GeoTrack - Docker Hub Image Builder & Publisher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  GeoTrack - Docker Hub Image Builder & Publisher" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$dockerUser = Read-Host "Enter your Docker Hub username (e.g. yourname)"
if ([string]::IsNullOrWhiteSpace($dockerUser)) {
    Write-Host "[ERROR] Docker Hub username cannot be empty." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[1/4] Logging in to Docker Hub..." -ForegroundColor Yellow
docker login
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker login failed. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/4] Building Backend Image ($dockerUser/geotrack-backend:latest)..." -ForegroundColor Yellow
docker build -t "$dockerUser/geotrack-backend:latest" ./backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Backend build failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[3/4] Building Frontend Image ($dockerUser/geotrack-frontend:latest)..." -ForegroundColor Yellow
docker build -t "$dockerUser/geotrack-frontend:latest" ./frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[4/4] Pushing images to Docker Hub..." -ForegroundColor Yellow
docker push "$dockerUser/geotrack-backend:latest"
docker push "$dockerUser/geotrack-frontend:latest"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  SUCCESS! Here are your Docker Hub Submission Links:" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Backend Image URL:" -ForegroundColor Cyan
Write-Host "  https://hub.docker.com/r/$dockerUser/geotrack-backend" -ForegroundColor Yellow
Write-Host ""
Write-Host "Frontend Image URL:" -ForegroundColor Cyan
Write-Host "  https://hub.docker.com/r/$dockerUser/geotrack-frontend" -ForegroundColor Yellow
Write-Host ""
Write-Host "Docker Pull Commands for Evaluators:" -ForegroundColor Cyan
Write-Host "  docker pull $dockerUser/geotrack-backend:latest" -ForegroundColor White
Write-Host "  docker pull $dockerUser/geotrack-frontend:latest" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green

