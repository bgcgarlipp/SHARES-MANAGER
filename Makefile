.PHONY: install seed run test lint format typecheck migrate revision docker

install:
	uv pip install -e ".[dev]"

seed:
	python seed.py

run:
	uvicorn app.main:app --reload

test:
	pytest --cov=app --cov-report=term-missing

lint:
	ruff check .

format:
	ruff format .

typecheck:
	mypy app

migrate:
	alembic upgrade head

revision:
	alembic revision --autogenerate -m "$(m)"

docker:
	docker compose up --build
