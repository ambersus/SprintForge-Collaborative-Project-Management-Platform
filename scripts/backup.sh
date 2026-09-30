#!/usr/bin/env bash
# =============================================================================
# SprintForge — PostgreSQL backup script
# =============================================================================
# Usage:
#   chmod +x scripts/backup.sh
#   ./scripts/backup.sh
#
# Schedule with cron (daily at 02:00):
#   crontab -e
#   0 2 * * * /opt/sprintforge/scripts/backup.sh >> /opt/sprintforge/backups/backup.log 2>&1
#
# Database credentials are read from the .env file in the parent directory, or
# from environment variables already set in the shell — never hardcoded.
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_DIR}/.env"
BACKUP_DIR="${PROJECT_DIR}/backups"
RETAIN_DAYS="${RETAIN_DAYS:-14}"    # Keep backups for this many days (override via env)

# ── Load .env if it exists and variables are not already set ──────────────────
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    set -a; source "$ENV_FILE"; set +a
fi

# ── Validate required variables ───────────────────────────────────────────────
: "${POSTGRES_DB:?POSTGRES_DB must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# ── Create backup directory ───────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Timestamp ────────────────────────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DUMP_FILE="${BACKUP_DIR}/sprintforge_${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting backup → ${DUMP_FILE}"

# ── Dump via the running db container ─────────────────────────────────────────
# pg_dump runs inside the 'db' Docker container so it can reach PostgreSQL
# on the internal Docker network without exposing port 5432.
PGPASSWORD="${POSTGRES_PASSWORD}" \
docker compose -f "${PROJECT_DIR}/docker-compose.yml" \
               -f "${PROJECT_DIR}/docker-compose.prod.yml" \
    exec -T db \
    pg_dump \
        --username="${POSTGRES_USER}" \
        --no-password \
        --format=plain \
        "${POSTGRES_DB}" \
    | gzip > "${DUMP_FILE}"

echo "[$(date -Iseconds)] Backup complete: $(du -sh "${DUMP_FILE}" | cut -f1)"

# ── Backup media/uploads ──────────────────────────────────────────────────────
MEDIA_ARCHIVE="${BACKUP_DIR}/media_${TIMESTAMP}.tar.gz"
echo "[$(date -Iseconds)] Archiving media files → ${MEDIA_ARCHIVE}"
docker compose -f "${PROJECT_DIR}/docker-compose.yml" \
               -f "${PROJECT_DIR}/docker-compose.prod.yml" \
    run --rm --no-deps \
    -v backend_media:/source:ro \
    alpine tar czf - -C /source . > "${MEDIA_ARCHIVE}" 2>/dev/null || {
    echo "[$(date -Iseconds)] WARNING: media archive failed (no media volume?)"
}

# ── Prune old backups ─────────────────────────────────────────────────────────
echo "[$(date -Iseconds)] Removing backups older than ${RETAIN_DAYS} days..."
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime "+${RETAIN_DAYS}" -delete

echo "[$(date -Iseconds)] Backup finished."
echo ""
echo "⚠️  IMPORTANT: Backups stored on the same VM do NOT protect against VM loss."
echo "   Consider copying ${BACKUP_DIR} to an off-site location (e.g. Rclone → S3/B2)."
