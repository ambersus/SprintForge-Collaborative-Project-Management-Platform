# ── SprintForge Backend ─────────────────────────────────────────────────────
# Official multi-architecture image: compatible with linux/amd64 and linux/arm64
# (Oracle Cloud Ampere A1 / Always Free ARM instances).
FROM python:3.13-slim

# Prevent .pyc files and enable unbuffered stdout/stderr for Docker logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system packages needed for psycopg (PostgreSQL driver) binary wheels.
# libpq-dev is the only native dependency; it is available on ARM64.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies before copying code for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Collect static files so Django can serve them (or a CDN / Caddy can serve them)
# This runs with a dummy key so the command succeeds without secrets at build time.
RUN DJANGO_SECRET_KEY=build-only-dummy-key \
    DATABASE_ENGINE=django.db.backends.sqlite3 \
    SQLITE_NAME=/tmp/build.sqlite3 \
    CHANNEL_BACKEND=memory \
    python manage.py collectstatic --noinput

# Create a non-root user for production security
RUN addgroup --system app && adduser --system --ingroup app app
USER app

# Daphne is the ASGI server already declared in INSTALLED_APPS.
# It handles both HTTP (DRF) and WebSocket (Django Channels) on a single port.
EXPOSE 8000
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
