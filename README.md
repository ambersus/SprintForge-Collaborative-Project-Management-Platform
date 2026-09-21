# SprintForge

SprintForge is a Docker-first, full-stack collaborative SDE project delivery application. It deliberately contains no AI features: projects, Kanban work, issues, comments, sprint planning, membership roles, notifications, activity history, and realtime updates are all ordinary application workflows backed by Django and PostgreSQL.

## Run locally

1. Copy `.env.example` to `.env` and replace the passwords and `DJANGO_SECRET_KEY`.
2. Run `docker compose up --build`.
3. Open `http://localhost:3000`, create an account, create a project, then create and move a task.

The backend migrates automatically on Compose startup. The client runs at port 3000; DRF/Daphne runs at port 8000; PostgreSQL and Redis remain internal.

## Engineering notes

- JWT access/refresh authentication; no credentials or secrets are committed.
- RBAC is server-enforced: Owner, Admin, Member, Viewer.
- Task mutations require the current `version`; stale writes receive a 400 conflict-style validation response.
- The board fetches all project task state from the backend, supports native drag-and-drop between columns, and Django Channels broadcasts changes through Redis.
- Tasks support task/issue/bug types, file attachments up to 10 MiB, comments, assignees, priorities, and server-side deletion controls.
- Sprint analytics report completion and per-assignee workload from persisted task state.
- PostgreSQL constraints protect unique membership, an active sprint per project, and a task's column position.
- List endpoints use DRF pagination and task listing supports project, status, assignee, and text-search filters.

## Validation

CI runs migration drift detection, Django migrations and pytest, plus Vitest and the production Next.js build. Run locally with `cd backend; pytest` and `cd frontend; npm install; npm run test; npm run build`. In this coding environment, Docker is unavailable and package-install attempts did not complete, so PostgreSQL/Redis integration, pytest, Vitest, and the Next.js production build still need to be run in Docker or a normal local shell.

See [architecture](docs/architecture.md), [database model](docs/database.md), and [API documentation](docs/api.md).

## Known deployment prerequisites

Compose needs Docker plus an `.env` file. For a production deployment, serve HTTPS in front of both web and API, set `DJANGO_DEBUG=false`, use a unique secret, restrict `DJANGO_ALLOWED_HOSTS`/CORS origins, and use managed PostgreSQL/Redis backups.

## TODO

- Add invitation email delivery and password-reset flows.
- Add task attachment storage and audit retention policy.
- Add E2E browser coverage after Docker is available in the development environment.
