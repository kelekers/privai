Set-Location "D:\Lomba\privai\backend"

if (-Not (Test-Path ".\.venv\Scripts\Activate.ps1")) {
    Write-Host "Virtual environment not found. Creating venv..." -ForegroundColor Yellow
    py -3.11 -m venv .venv
}

.\.venv\Scripts\Activate.ps1

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host "Starting PrivAI backend at http://127.0.0.1:8000" -ForegroundColor Green
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
