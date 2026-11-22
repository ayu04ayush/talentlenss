#!/usr/bin/env bash
set -e

echo "Starting TalentLens AI Recruitment Platform..."

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    ./venv/bin/pip install -r backend/requirements.txt
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo "Starting FastAPI backend on port 8000..."
PYTHONPATH=backend ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting Next.js frontend on port 3000..."
cd frontend
npm run dev

kill $BACKEND_PID
