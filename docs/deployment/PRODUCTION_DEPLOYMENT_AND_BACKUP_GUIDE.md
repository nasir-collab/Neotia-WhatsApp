# ANHVL WhatsApp Patient Engagement Platform — Production Deployment, Security & Backup Guide

---

## 1. Local Development & Zero-Config Startup

The repository is pre-configured with an embedded PostgreSQL 16 wire-protocol engine (`@electric-sql/pglite` + `@electric-sql/pglite-socket`) that automatically starts if no external PostgreSQL service is listening on `127.0.0.1:5432`, alongside a persistent database-backed job queue when Redis is not running locally.

### Quick Start Commands

```bash
# 1. Install all workspace dependencies
npm install

# 2. Generate Prisma Client, apply PostgreSQL migrations, and seed initial data
npm run prisma:generate
npm run db:migrate
npm run db:seed

# 3. Run automated Unit, Integration, RBAC & End-to-End Test Suite
npm test

# 4. Start Backend API (port 4000) and Frontend Web App (port 5173)
npm run dev:api
npm run dev:web
```

---

## 2. Docker & Cloud Server Deployment

For staging and production Linux servers with Docker and Docker Compose installed:

```bash
# 1. Copy environment template and configure production secrets
cp .env.example .env

# 2. Build and launch PostgreSQL 16, Redis 7, NestJS API, and Nginx Web containers
docker compose up -d --build

# 3. Verify container health
docker compose ps
curl http://localhost:4000/api/v1/settings/health
```

### Nginx Reverse Proxy & HTTPS
- `infrastructure/deployment/nginx.conf` proxies `/api/*` to the NestJS API container (`api:4000`) and serves the compiled React SPA with `try_files $uri $uri/ /index.html`.
- Terminate TLS 1.2/1.3 (HTTPS) at your cloud load balancer (AWS ALB / GCP HTTPS Load Balancer / Azure Application Gateway) or mount Let's Encrypt certificates into the `web` Nginx container on port `443`.

---

## 3. Database Backup & Recovery Strategy

### Automated Daily PostgreSQL Backups
Run the following cron job on the database host or backup runner at `02:00 IST` daily:

```bash
pg_dump -Fc -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  > "/backups/anhvl_engagement_$(date +%Y%m%d_%H%M%S).dump"
```

### Point-in-Time Recovery / Restore

```bash
pg_restore -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean \
  /backups/anhvl_engagement_<timestamp>.dump
```

### Retention Policy
- **Operational Database Backups:** 30-day rolling encrypted daily snapshots.
- **Audit Logs & Consent Ledger (`AuditLog`, `PatientConsent`):** Retained for statutory compliance and tamper-evident traceability.

