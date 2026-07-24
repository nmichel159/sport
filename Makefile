.PHONY: up down reset logs test migrate migration

up:
	docker compose up --build
down:
	docker compose down
reset:
	docker compose down -v
	docker compose up --build
logs:
	docker compose logs -f
test:
	docker compose exec backend pytest
migrate:
	docker compose exec backend alembic upgrade head
migration:
	docker compose exec backend alembic revision --autogenerate -m "$(name)"
