# Authentication and localisation

The API exchanges a cryptographically verified Google OpenID Connect ID token with a verified email for a short-lived signed access token and an opaque refresh token. The Google `sub` is stored in `user_auth_identities` and is the durable identity key. A verified Google email may claim a matching imported profile, preventing pre-registration denial of service without trusting an unverified address. Refresh tokens are random, SHA-256 hashed in `auth_sessions`, row-locked during rotation, and a reused/revoked token revokes its token family.

Web refresh tokens are HttpOnly cookies; access tokens stay in memory. Mobile refresh tokens use Expo SecureStore. The web client uses Google Identity Services and Expo uses `expo-auth-session`; both send only the returned ID token to the API for verification. `GET /api/v1/auth/me`, user routes, and logout-all use the reusable active-user dependency. Configure HTTPS and `COOKIE_SECURE=true` in production.

## Google Cloud setup

Create separate OAuth clients for Web, Android, and iOS. Put their public IDs in `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID`, and `GOOGLE_IOS_CLIENT_ID` on the backend, and only their matching public values in `VITE_GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_*` on clients. Add `http://localhost:3000` to Web JavaScript origins for development and the production domain in production. Expo development and production builds require Android package/SHA-1 and iOS bundle identifiers registered in Google Cloud; use the `sport://` scheme configured in `app.json` for native redirects. Never put a Google client secret in either frontend.

## Run and migrate

Copy `.env.example` to `.env`, set a long `SECRET_KEY`, client IDs, and run `docker compose up --build`. Set `DEVELOPMENT_LOGIN_ENABLED=true` only when the local passwordless helper is deliberately needed; production rejects it. Existing databases require `docker compose exec backend alembic upgrade head`. Run backend tests with `docker compose exec backend pytest`; web checks are `cd frontend-web; npm run lint; npm run build`.

Translations are deliberately small shared concepts with `sk` as fallback: `frontend-web/src/i18n.tsx` and `frontend-mobile/i18n.tsx`. Add a language by adding the same keys, extending the language type, and allowing its stable language code in the API setting validation/migration.

## Operational notes

Production configuration fails closed unless it has a strong secret, HTTPS-only explicit `CORS_ORIGINS`, explicit `ALLOWED_HOSTS`, secure cookies, disabled development login, and shared rate-limit storage such as Redis. Cookie-backed refresh and logout requests additionally require a trusted `Origin`. If a deployment needs `SameSite=none`, HTTPS remains mandatory. Keep migrations on a separate deployment step/database role when production operations are introduced.
