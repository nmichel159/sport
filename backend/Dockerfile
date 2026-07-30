FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

FROM base AS development
RUN pip install --no-cache-dir -r requirements-dev.txt
CMD ["sh", "-c", "alembic upgrade head && python scripts/seed_demo_users.py && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

FROM base AS production
RUN addgroup --system sport && adduser --system --ingroup sport sport
USER sport
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
