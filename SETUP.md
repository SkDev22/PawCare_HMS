# PawCare HMS — Setup Guide

Complete local development setup from zero to a running application.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 LTS | https://nodejs.org |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| OpenSSL | any | Bundled on macOS/Linux. Windows: install via Git Bash or WSL |

---

## Step 1 — Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd pawcare-hms
pnpm install
```

This installs all workspace packages in a single command.

---

## Step 2 — Generate RS256 JWT Keys

PawCare uses RS256 (asymmetric JWT signing). You need a private/public key pair.

```bash
# Create the keys directory inside the server package
mkdir -p server/keys

# Generate a 2048-bit RSA private key
openssl genrsa -out server/keys/private.pem 2048

# Extract the corresponding public key
openssl rsa -in server/keys/private.pem -pubout -out server/keys/public.pem

# Verify both files exist
ls -la server/keys/
```

Expected output:
```
-rw-------  1 you staff  1679 private.pem
-rw-r--r--  1 you staff   451 public.pem
```

> **Security:** `private.pem` is already in `.gitignore` — never commit it.
> In production, inject both keys via environment variables or a secrets manager.

**Windows (PowerShell / Git Bash):**
```powershell
New-Item -ItemType Directory -Force -Path server/keys
# Then run the openssl commands inside Git Bash, or install OpenSSL for Windows
```

---

## Step 3 — Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Set automatically if you use the Docker setup below |
| `REDIS_URL` | Yes | Set automatically if you use the Docker setup below |
| `JWT_PRIVATE_KEY_PATH` | Yes | `./keys/private.pem` (relative to `server/`) |
| `JWT_PUBLIC_KEY_PATH` | Yes | `./keys/public.pem` |
| `STRIPE_SECRET_KEY` | Optional | Required for billing features |
| `SENDGRID_API_KEY` | Optional | Required for email notifications |
| `TWILIO_*` | Optional | Required for SMS notifications |
| `AWS_*` / `S3_BUCKET_NAME` | Optional | Required for file uploads |

For local development the defaults in `.env.example` match the Docker Compose services — you only need to fill in third-party API keys when testing those features.

---

## Step 4 — Start Docker Services

```bash
# Start PostgreSQL 16 and Redis 7 in the background
docker compose up -d postgres redis

# Verify they are healthy
docker compose ps
```

Expected:
```
NAME               STATUS          PORTS
pawcare_postgres   Up (healthy)    0.0.0.0:5432->5432/tcp
pawcare_redis      Up (healthy)    0.0.0.0:6379->6379/tcp
```

---

## Step 5 — Run Database Migrations

```bash
# Generate Prisma client types
pnpm --filter @pawcare/server db:generate

# Run all migrations (creates tables in pawcare_dev)
pnpm --filter @pawcare/server db:migrate
```

When prompted for a migration name (first time), type: `init`

---

## Step 6 — Seed Default Data

```bash
pnpm --filter @pawcare/server db:seed
```

This creates:

| Role | Email | Password |
|---|---|---|
| Admin | admin@pawcare.vet | Admin@123 |
| Veterinarian | dr.smith@pawcare.vet | Vet@123456 |

> **Change these passwords immediately after first login!**

---

## Step 7 — Start Development Servers

```bash
# Start all apps (server + web) via Turborepo
pnpm dev
```

Or start individually:

```bash
# Server only (port 3001)
pnpm --filter @pawcare/server dev

# Web only (port 3000)
pnpm --filter @pawcare/web dev
```

Open: http://localhost:3000

---

## Verification Checklist

- [ ] http://localhost:3000 shows the PawCare login page
- [ ] Log in with `admin@pawcare.vet / Admin@123` — redirects to Dashboard
- [ ] http://localhost:3001/health returns `{"status":"ok",...}`
- [ ] `docker compose ps` shows both services as "healthy"

---

## Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (requires running DB)
pnpm test:integration

# Type checking across all packages
pnpm type-check
```

---

## Useful Commands

```bash
# Inspect the database with Prisma Studio
pnpm --filter @pawcare/server db:studio

# Create a new migration after schema changes
pnpm --filter @pawcare/server db:migrate -- --name <migration_name>

# Stop Docker services
docker compose down

# Stop and wipe all data (destructive)
docker compose down -v
```

---

## Production Key Injection

In production, avoid storing key files on disk. Instead:

```bash
# Read the PEM content into an env var (base64 encoded)
export JWT_PRIVATE_KEY_B64=$(base64 -w 0 server/keys/private.pem)
export JWT_PUBLIC_KEY_B64=$(base64 -w 0 server/keys/public.pem)
```

Then update `server/src/lib/jwt.ts` to read from the base64 env var and decode with `Buffer.from(key, 'base64')` instead of reading from disk — or use your cloud provider's secrets manager (AWS Secrets Manager, GCP Secret Manager, etc.).

---

## Project Structure Quick Reference

```
pawcare-hms/
├── apps/web/          React 18 + Vite web app (port 3000)
├── packages/shared/   Shared Zod schemas, types, permissions
├── server/            Express + Prisma API server (port 3001)
│   ├── src/
│   │   ├── config/    Environment validation
│   │   ├── lib/       Logger, Prisma, Redis, JWT, errors
│   │   ├── middleware/ Auth, RBAC, validation, error handler
│   │   ├── modules/   Feature modules (auth, patients, ...)
│   │   ├── api/       Route aggregator
│   │   ├── jobs/      BullMQ background jobs
│   │   └── prisma/    Schema + migrations + seed
│   └── keys/          RS256 key pair (gitignored)
├── docker-compose.yml PostgreSQL + Redis
└── SETUP.md           This file
```
