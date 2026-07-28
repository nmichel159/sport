# Sport monorepo

A starter stack with FastAPI/PostgreSQL API, React web client, and Expo React Native mobile client.

## Architecture and stack

`frontend-web` calls FastAPI `/health`; both frontends use versioned `/api/v1` endpoints. FastAPI uses SQLAlchemy 2 and Alembic with PostgreSQL. The web uses Vite, React Router, TypeScript, ESLint and Prettier; mobile uses Expo Router and TypeScript.

## Local setup

Docker Desktop with Compose is required. The local `.env` already exists and is Git-ignored. Recreate it from the safe template if needed:

```bash
cp .env.example .env
docker-compose down -v
docker-compose up --build
```

In PowerShell use `Copy-Item .env.example .env` (add `-Force` to replace). `down -v` removes the named PostgreSQL volume and all local database data.

Service URLs:

- Web: http://localhost:3000
- API: http://localhost:8000
- Health: http://localhost:8000/health
- Swagger: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- PostgreSQL: `localhost:5432`

## Database and tests

Migrations run at backend container start. Run manually:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
docker compose exec backend alembic revision --autogenerate -m "describe_change"
```

The root `Makefile` supplies `make up`, `make down`, `make reset`, `make logs`, `make test`, and migration shortcuts.

## Sign-in

Google sign-in, rotating sessions, and Slovak/English UI are documented in [AUTHENTICATION.md](AUTHENTICATION.md). Configure the public Google client IDs in `.env` before testing the login screens.

## Mobile

Expo runs outside Compose for reliable device/simulator access:

```bash
cd frontend-mobile
npm install
npm run start
# or: npm run android / npm run ios / npm run web
```

Set `EXPO_PUBLIC_API_BASE_URL` before starting Expo. Android emulator uses `http://10.0.2.2:8000`; iOS simulator and browser use `http://localhost:8000`; a physical phone must use your computer LAN address such as `http://192.168.1.10:8000`. Phone `localhost` means the phone itself; allow port 8000 through your firewall.

## Web development

```bash
cd frontend-web
npm install
npm run dev
```

Set `VITE_API_BASE_URL` before launch (default `http://localhost:8000`). The UI visibly reports an unreachable backend.

## Production and deployment

Run `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build`. It disables source mounts/reload and serves the built site through Nginx. Supply production secrets through the deployment environment. TLS termination, reverse proxy/domain routing, database backups, migration rollout, and monitoring remain operational responsibilities; Docker configuration alone does not make a deployment secure.

## Troubleshooting

- Change `BACKEND_PORT`, `WEB_PORT`, or `POSTGRES_PORT` in `.env` for port collisions.
- Reset all database data: `docker-compose down -v`, then start again.
- Check `docker compose logs backend` if health fails.
- For a physical phone, use LAN IP and check Wi-Fi/firewall rules.
