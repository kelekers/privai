Set-Location "D:\Lomba\privai\frontend"

if (-Not (Test-Path ".\node_modules")) {
    Write-Host "node_modules not found. Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Starting PrivAI frontend at http://localhost:5173" -ForegroundColor Green
npm run dev
