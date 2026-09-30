# SprintForge

SprintForge is a Docker-first, full-stack collaborative SDE project delivery application.
It provides projects, Kanban task management, issues, comments, sprint planning, project membership,
RBAC roles (Owner / Admin / Member / Viewer), notifications, activity history, and real-time
WebSocket updates — all backed by Django REST Framework, Django Channels, PostgreSQL, and Redis.

---

## Architecture

```
         INTERNET
             │
             ▼
     ┌───────────────┐
     │     Caddy     │  :80  (redirects to HTTPS)
     │   HTTPS/TLS   │  :443
     └───────┬───────┘
             │
       ┌─────┴──────┐
       │             │
       ▼             ▼
  Next.js :3000  Django/Daphne :8000
  (App Router)  (REST + WebSockets)
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    PostgreSQL :5432        Redis :6379
    (persistent vol)    (channel layer)
```

Public ports: **22** (SSH), **80** (HTTP→HTTPS), **443** (HTTPS).  
All other ports are internal to Docker.

---

## Local Development

### Prerequisites

- Docker Engine + Docker Compose plugin
- (Optional) Python 3.13 + Node 22 for running outside Docker

### Quick start

```bash
git clone https://github.com/YOUR_ORG/sprintforge.git
cd sprintforge
cp .env.example .env    # edit the file — see comments inside
docker compose up --build
```

Open http://localhost:3000, create an account, create a project, add tasks.

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/
- Django Admin: http://localhost:8000/admin/
- Health check: http://localhost:8000/health/

Migrations run automatically on backend startup in development.

### Running without Docker (SQLite)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# .env is loaded automatically from the project root — ensure DATABASE_ENGINE and SQLITE_NAME are set
python manage.py migrate
daphne -p 8000 config.asgi:application

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Production Deployment (Oracle Cloud)

See [docs/ORACLE_DEPLOYMENT.md](docs/ORACLE_DEPLOYMENT.md) for exact step-by-step instructions.

### Summary

1. Provision an Oracle Cloud Always Free VM (Ubuntu 22.04/24.04, ARM64 or x86).
2. Install Docker Engine.
3. Clone the repository to `/opt/sprintforge`.
4. Copy `.env.example` → `.env` and fill in all values:
   - Generate `DJANGO_SECRET_KEY`: `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
   - Generate `POSTGRES_PASSWORD`: `openssl rand -base64 32`
5. Edit `Caddyfile` — replace `example.com` with your domain.
6. Start: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d`
7. Caddy obtains TLS certificates automatically.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DJANGO_SECRET_KEY` | ✅ | Long random string. Never reuse between environments. |
| `DJANGO_DEBUG` | ✅ | `false` in production, `true` in development. |
| `DJANGO_ALLOWED_HOSTS` | ✅ | Comma-separated hostnames Django will serve. |
| `CORS_ALLOWED_ORIGINS` | ✅ | Comma-separated origins for CORS. |
| `CSRF_TRUSTED_ORIGINS` | ✅ | Comma-separated origins for CSRF. |
| `POSTGRES_DB` | ✅ | Database name. |
| `POSTGRES_USER` | ✅ | Database user. |
| `POSTGRES_PASSWORD` | ✅ | Database password. Never hardcode. |
| `POSTGRES_HOST` | ✅ | `db` (Docker service name) in production. |
| `POSTGRES_PORT` | ✅ | `5432` |
| `REDIS_URL` | ✅ | `redis://redis:6379/0` in production. |
| `NEXT_PUBLIC_API_URL` | ✅ | Public backend URL (e.g. `https://api.example.com/api`). |
| `NEXT_PUBLIC_WS_URL` | ✅ | Public WebSocket URL (e.g. `wss://api.example.com`). |

See [`.env.example`](.env.example) for the full template.

---

## Engineering Notes

- **Authentication**: JWT access/refresh tokens (djangorestframework-simplejwt). Tokens are stored in `localStorage` on the client.
- **RBAC**: Owner, Admin, Member, Viewer — enforced server-side in API views.
- **Optimistic concurrency**: Task mutations require the current `version` field; stale writes receive a 400 response.
- **Real-time**: Django Channels broadcasts project events through Redis. The browser connects via WebSocket with a JWT token query parameter.
- **File uploads**: Up to 10 MiB. Stored in `MEDIA_ROOT` (a persistent Docker volume in production).
- **Sprint analytics**: Completion percentage and per-assignee workload from persisted task state.
- **Health check**: `GET /health/` returns `{"status": "ok"}` — used by Docker, Caddy, and monitoring.

---

## CI / CD

GitHub Actions runs on every push and pull request:

- `backend`: migration drift detection, Django migrate, collectstatic, pytest
- `frontend`: `npm ci`, Vitest, `npm run build` (production build verification)
- `docker-build`: builds both images for `linux/amd64` and `linux/arm64` (Oracle Ampere compatibility)

---

## Backups

```bash
# Run a backup now
./scripts/backup.sh

# Schedule daily at 02:00 (add to crontab -e)
0 2 * * * cd /opt/sprintforge && ./scripts/backup.sh >> backups/backup.log 2>&1

# Restore PostgreSQL
gunzip -c backups/sprintforge_TIMESTAMP.sql.gz | \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db \
  psql -U sprintforge sprintforge
```

⚠️ Backups stored only on the VM do **not** protect against VM loss. Copy them off-site.

---

## ARM64 Compatibility

All Docker base images used are official multi-architecture images:
- `python:3.13-slim` — ✅ linux/amd64, linux/arm64
- `node:22-alpine` — ✅ linux/amd64, linux/arm64
- `postgres:16-alpine` — ✅ linux/amd64, linux/arm64
- `redis:7-alpine` — ✅ linux/amd64, linux/arm64
- `caddy:2-alpine` — ✅ linux/amd64, linux/arm64

Python packages: all dependencies (`Django`, `daphne`, `channels`, `channels-redis`, `psycopg[binary]`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`) are pure-Python or have ARM64 wheels on PyPI.

**ARM64 compatibility: PASS** — SprintForge runs on Oracle Ampere A1 instances without modification.

---

## Known Limitations / TODO

- Invitation email delivery and password-reset flows are not yet implemented.
- Media file storage is local VM disk. For high-availability deployments, migrate to object storage (S3/Cloudflare R2/Backblaze B2) and update `DEFAULT_FILE_STORAGE`.
- E2E browser tests (Playwright/Cypress) are not yet implemented.
