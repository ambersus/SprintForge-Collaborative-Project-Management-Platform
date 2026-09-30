# SprintForge — Oracle Cloud Always Free Deployment Guide

This document provides exact, copy-paste commands for deploying SprintForge on an
Oracle Cloud Always Free VM running Ubuntu.

---

## Architecture

```
         INTERNET
             │
             ▼
   Oracle Cloud VM (public IP / domain)
             │
             ▼
     ┌───────────────┐
     │     Caddy     │  :80 (→ HTTPS redirect)
     │   HTTPS/TLS   │  :443
     └───────┬───────┘
             │  (internal Docker network)
       ┌─────┴──────┐
       │             │
       ▼             ▼
  Next.js :3000  Django :8000
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    PostgreSQL :5432        Redis :6379
          │                     │
          ▼                     ▼
   persistent volume    persistent volume
```

Publicly exposed ports (Oracle Security List + Ubuntu UFW):
- `22/tcp`  — SSH
- `80/tcp`  — HTTP (Caddy redirects to HTTPS)
- `443/tcp` — HTTPS

All other ports (3000, 8000, 5432, 6379) are **internal only**.

---

## 1. Create Oracle Cloud Account

1. Go to https://signup.cloud.oracle.com
2. Complete the free-tier signup (credit card required for identity verification; you will not be charged for Always Free resources).
3. Sign in to the Oracle Cloud Console.

---

## 2. Create Always Free Compute Instance

1. Navigate to **Compute → Instances → Create Instance**.
2. Choose a name (e.g. `sprintforge-vm`).
3. Under **Image and Shape**:
   - Image: **Ubuntu 22.04** or **Ubuntu 24.04** (Canonical)
   - Shape: Select an **Always Free eligible** shape.
     - ARM64/Ampere: `VM.Standard.A1.Flex` — up to 4 OCPUs / 24 GB RAM (recommended)
     - x86: `VM.Standard.E2.1.Micro` — 1 OCPU / 1 GB RAM (limited)
   - SprintForge runs on **both** AMD64 and ARM64 — all Docker images are multi-arch.
4. Under **Boot volume**: 50 GB (Always Free eligible).
5. Under **Add SSH keys**: upload or paste your **public** SSH key.
   - Generate a key pair locally if you do not have one:
     ```bash
     ssh-keygen -t ed25519 -C "sprintforge-oracle" -f ~/.ssh/oracle_sprintforge
     ```
   - Upload the contents of `~/.ssh/oracle_sprintforge.pub`.
6. Under **Networking**: ensure a public IP is assigned.
7. Click **Create**.

---

## 3. Configure Oracle Security List (Firewall)

In the Oracle Cloud Console:

1. Navigate to **Networking → Virtual Cloud Networks → your VCN → Security Lists**.
2. Edit the default Security List **Ingress Rules**. Add:

| Source CIDR | Protocol | Destination Port | Description |
|---|---|---|---|
| `0.0.0.0/0` | TCP | `22` | SSH |
| `0.0.0.0/0` | TCP | `80` | HTTP (Caddy) |
| `0.0.0.0/0` | TCP | `443` | HTTPS (Caddy) |

Remove or keep the default `0.0.0.0/0 TCP All ports` rule — it is safer to remove it and only allow the three ports above.

---

## 4. SSH into the VM

```bash
ssh -i ~/.ssh/oracle_sprintforge ubuntu@SERVER_IP
```

Replace `SERVER_IP` with your VM's public IP address.

---

## 5. Update the Server

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

After reboot, SSH back in.

---

## 6. Configure Ubuntu Firewall (UFW)

Oracle's Security List is the outer firewall. Ubuntu UFW is a second layer.

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 7. Install Docker Engine

Use the official Docker installation script for Ubuntu:

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group so you don't need sudo for every command
sudo usermod -aG docker ubuntu

# Apply group change without logging out
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 8. Clone the Repository

```bash
sudo mkdir -p /opt/sprintforge
sudo chown ubuntu:ubuntu /opt/sprintforge
cd /opt/sprintforge

git clone https://github.com/YOUR_ORG/sprintforge.git .
```

---

## 9. Configure Environment Variables

```bash
cp .env.example .env
nano .env   # or: vim .env
```

Fill in every value. Generate the required secrets:

```bash
# Django secret key (run this, copy the output into .env)
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# PostgreSQL password (run this, copy into .env)
openssl rand -base64 32
```

**Minimum required values to edit in `.env`:**

```bash
DJANGO_SECRET_KEY=<generated above>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=your-domain.com,api.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com
CSRF_TRUSTED_ORIGINS=https://your-domain.com,https://api.your-domain.com

POSTGRES_PASSWORD=<generated above>

NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
```

Protect the file:

```bash
chmod 600 .env
```

---

## 10. Edit the Caddyfile

```bash
nano Caddyfile
```

Replace `example.com` and `api.example.com` with your actual domain names.

---

## 11. Build and Start All Services

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

This will:
1. Build the backend image (with `collectstatic` during build)
2. Build the frontend image (production Next.js bundle)
3. Pull official images for Caddy, PostgreSQL, Redis
4. Start all containers in dependency order
5. Run Django migrations automatically on backend startup
6. Caddy obtains TLS certificates from Let's Encrypt

First build takes 3–8 minutes. Watch progress:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

---

## 12. Verify All Services Are Running

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

All services should show `running` or `healthy`.

---

## 13. Test the Deployment

```bash
# Health check
curl https://api.your-domain.com/health/
# Expected: {"status": "ok"}

# API is responding
curl https://api.your-domain.com/api/

# Frontend loads
curl -I https://your-domain.com
```

---

## 14. DNS Configuration

In your domain registrar or DNS provider, add:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `your-domain.com` | `ORACLE_VM_PUBLIC_IP` | 300 |
| `A` | `api.your-domain.com` | `ORACLE_VM_PUBLIC_IP` | 300 |

Wait for DNS propagation (2–60 minutes). Caddy will then automatically obtain
TLS certificates via Let's Encrypt.

### Single-domain alternative

If you prefer `your-domain.com` for everything (frontend and backend on one domain),
uncomment the single-domain block in `Caddyfile` and set:

```bash
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_WS_URL=wss://your-domain.com
```

---

## 15. HTTPS

Caddy handles TLS automatically:

- Certificates are obtained from **Let's Encrypt** on first request.
- Certificates are stored in the `caddy_data` Docker volume.
- Certificates are renewed automatically **before expiry** (no cron needed).
- HTTP requests on port 80 are automatically redirected to HTTPS.

No manual certificate management is required.

---

## 16. Logs

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Individual service
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f db
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f redis
```

Log files are limited to 10–20 MB per service and rotate automatically (configured in `docker-compose.prod.yml`).

---

## 17. Backups

### Database backup

```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

The script:
- Dumps PostgreSQL to a timestamped `.sql.gz` file in `backups/`
- Archives media/upload files
- Deletes backups older than 14 days (configurable via `RETAIN_DAYS`)

### Schedule daily backups (cron)

```bash
crontab -e
```

Add:

```cron
0 2 * * * cd /opt/sprintforge && ./scripts/backup.sh >> /opt/sprintforge/backups/backup.log 2>&1
```

### ⚠️ Off-site backup (strongly recommended)

Backups stored only on the Oracle VM do **not** protect against VM loss or accidental deletion.

Copy backups to an external location using `rclone`:

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure a remote (e.g., Backblaze B2, Cloudflare R2, AWS S3)
rclone config

# Sync backups to remote (add this after the backup.sh call in cron)
rclone sync /opt/sprintforge/backups remote:sprintforge-backups
```

---

## 18. Restore from Backup

```bash
# Find your backup file
ls -lh backups/

# Restore database
BACKUP_FILE=backups/sprintforge_20260101_020000.sql.gz

gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T db \
    psql --username=sprintforge --dbname=sprintforge

# Restore media files (if needed)
MEDIA_BACKUP=backups/media_20260101_020000.tar.gz
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    run --rm -v backend_media:/target alpine \
    sh -c "tar xzf - -C /target" < "$MEDIA_BACKUP"
```

---

## 19. Updating the Application

```bash
cd /opt/sprintforge

# Pull latest code
git pull

# Rebuild and restart (zero-downtime: Compose restarts containers in order)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Check for errors
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

Migrations run automatically on backend startup. No separate migration step needed.

---

## 20. Rollback Procedure

If the new version causes problems:

```bash
# Roll back to the previous Git commit
git log --oneline -10      # find the commit hash
git checkout <PREVIOUS_COMMIT_HASH>

# Rebuild and restart with the old code
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

If the update included database migrations that are not reversible, restore from the backup taken before the update (see step 18).

---

## 21. Troubleshooting

| Problem | Command |
|---|---|
| Backend won't start | `docker compose ... logs backend` |
| Database connection error | `docker compose ... logs db` |
| Redis connection error | `docker compose ... logs redis` |
| HTTPS not working | `docker compose ... logs caddy` |
| Container keeps restarting | `docker compose ... ps` and check health status |
| Re-run migrations manually | `docker compose ... exec backend python manage.py migrate` |
| Create a Django superuser | `docker compose ... exec backend python manage.py createsuperuser` |
| Check disk usage | `df -h` and `docker system df` |

---

## 22. Exact Deployment Commands (Quick Reference)

```bash
# 1. SSH into VM
ssh -i ~/.ssh/oracle_sprintforge ubuntu@SERVER_IP

# 2. Clone and configure
git clone https://github.com/YOUR_ORG/sprintforge.git /opt/sprintforge
cd /opt/sprintforge
cp .env.example .env
nano .env       # fill in all required values
nano Caddyfile  # replace example.com with your domain

# 3. Start everything
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 4. Watch startup
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# 5. Verify health
curl https://api.your-domain.com/health/

# 6. Create admin user (optional)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec backend python manage.py createsuperuser
```
