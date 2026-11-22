.PHONY: dev install test build clean

dev:
	@echo "Starting TalentLens Platform..."
	@python -m venv venv || true
	@./venv/bin/pip install -r backend/requirements.txt || .\venv\Scripts\pip install -r backend\requirements.txt
	@cd frontend && npm install
	@echo "Starting servers..."
	@PYTHONPATH=backend ./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
	@cd frontend && npm run dev

test:
	PYTHONPATH=backend ./venv/bin/pytest backend/tests || powershell -Command "$$env:PYTHONPATH='backend'; .\venv\Scripts\pytest backend\tests"

build:
	cd frontend && npm run build
