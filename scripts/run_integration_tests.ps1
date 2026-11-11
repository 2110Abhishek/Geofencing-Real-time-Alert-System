$env:PORT = "8089"
$proc = Start-Process node -ArgumentList "scripts/mock_server.js" -PassThru
Start-Sleep -Seconds 2

try {
    $env:BASE_URL = "http://localhost:8089"
    & "C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe" scripts/verify_scenarios.py
} finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
