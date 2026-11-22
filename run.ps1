# TalentLens One-Command Startup Script for Windows PowerShell
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Starting TalentLens AI Recruitment Platform" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 1. Check Python virtual environment
if (-Not (Test-Path "venv")) {
    Write-Host "[1/3] Creating Python Virtual Environment..." -ForegroundColor Yellow
    python -m venv venv
    .\venv\Scripts\pip install -r backend\requirements.txt
}

# 2. Check Node Modules
if (-Not (Test-Path "frontend\node_modules")) {
    Write-Host "[2/3] Installing Frontend Dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

# 3. Start Backend in background
Write-Host "[3/3] Starting Backend API (Port 8000) & Next.js UI (Port 3000)..." -ForegroundColor Cyan
$env:PYTHONPATH = "backend"
$backendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; .\venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# Start Frontend
Set-Location frontend
npm run dev
