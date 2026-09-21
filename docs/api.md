# API quick reference

All non-auth endpoints require `Authorization: Bearer <access-token>`. List endpoints use `?page=` and return DRF pagination envelopes.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/auth/register/` | Create a user |
| `POST /api/auth/token/` | Obtain JWT access/refresh pair |
| `GET,POST /api/projects/` | List/create accessible projects |
| `GET /api/projects/{slug}/members/` | Membership list |
| `GET,POST /api/projects/{slug}/sprints/` | Sprint planning |
| `GET,POST /api/tasks/?project={slug}` | Filter/list/create tasks |
| `PATCH /api/tasks/{id}/` | Update task; include current `version` |
| `POST /api/tasks/{id}/move/` | Move status; include `version` |
| `GET,POST /api/tasks/{id}/comments/` | Task discussion |
| `GET,POST /api/tasks/{id}/attachments/` | List/upload a file (10 MiB maximum) |
| `GET /api/projects/{slug}/analytics/` | Active sprint, completion, and workload data |
| `GET /api/notifications/` | Current user's notifications |

Connect to `ws://host/ws/projects/{project-uuid}/` for `task.*` and `comment.created` events.
WebSocket connections require a JWT access token in `?token=` and the caller must be a project member.
