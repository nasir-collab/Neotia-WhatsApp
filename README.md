# ANHVL WhatsApp Patient Engagement Platform

**Client:** Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL)  
**Solution Partner:** Plan D Media  
**Hospitals Configured:** New Town, Kolkata (`ANHVL-NTK` — Bengali & English) | Raipur (`ANHVL-RPR` — Hindi & English)

A production-deployable, full-stack healthcare patient engagement platform managing the end-to-end non-clinical appointment journey:

**HIS / Appointment Booking → Ingestion & Deduplication → Data Validation → Consent Verification → Hospital & Language Selection → WhatsApp Appointment Confirmation → Automated Reminders (T-24h, T-3h, T-60m) → Patient Response Capture → Altruist Call-Centre Follow-Up → HIS Attendance Reconciliation → Executive & Pilot Analytics.**

---

## Monorepo Structure

```text
/
├── apps/
│   ├── api/                  # NestJS 10 + TypeScript REST API, Webhook Engine, Scheduler & Swagger
│   └── web/                  # React 18 + TypeScript + Vite + Tailwind CSS + Recharts (26 Operational Pages)
├── packages/
│   ├── shared-types/         # Shared TypeScript interfaces, enums & domain contracts
│   ├── validation/           # Zod schemas, E.164 phone validator & non-clinical content sanitizer
│   └── configuration/        # Hospital metadata & environment configuration helpers
├── prisma/
│   ├── schema.prisma         # 24 normalized PostgreSQL models with relations & indexes
│   ├── migrations/           # SQL migration scripts
│   └── seed/                 # Synthetic demonstration seed data for New Town & Raipur
├── infrastructure/
│   ├── docker/               # Dockerfile.api and Dockerfile.web
│   ├── deployment/           # Nginx reverse-proxy configuration
│   └── scripts/              # Database migration & build helper scripts
├── docs/
│   ├── architecture/         # Technical Architecture & Requirements Checklist
│   ├── api/                  # REST API & Webhook Reference
│   ├── integrations/         # External Dependencies & ANHVL Handover Checklist
│   └── deployment/           # Production Deployment & Backup Guide
├── docker-compose.yml        # Multi-container orchestration (PostgreSQL 16, Redis 7, API, Web)
└── .env.example              # Environment configuration template
```

---

## UAT & Demonstration Accounts (Seeded via `npm run db:seed`)

All seeded UAT accounts use the password **`Anhvl@2026!`** in `DEMO` mode:

| Role | Email | Hospital Scope |
|---|---|---|
| **Super Administrator** | `superadmin@anhvl-demo.in` | All Hospitals (`ANHVL-NTK`, `ANHVL-RPR`) |
| **Hospital Admin (New Town)** | `admin.newtown@anhvl-demo.in` | New Town, Kolkata (`ANHVL-NTK`) |
| **Hospital Admin (Raipur)** | `admin.raipur@anhvl-demo.in` | Raipur (`ANHVL-RPR`) |
| **Operations Manager** | `ops.manager@anhvl-demo.in` | All Hospitals |
| **Operations Executive (New Town)** | `ops.newtown@anhvl-demo.in` | New Town, Kolkata (`ANHVL-NTK`) |
| **Call-Centre Agent (New Town)** | `agent.kolkata@altruist-demo.in` | New Town, Kolkata (`ANHVL-NTK`) |
| **Call-Centre Agent (Raipur)** | `agent.raipur@altruist-demo.in` | Raipur (`ANHVL-RPR`) |
| **Management Viewer (Read-Only)** | `leadership@anhvl-demo.in` | All Hospitals (Read-Only) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Migrate and seed the PostgreSQL 16 database
npm run db:migrate
npm run db:seed

# Run the automated test suite (Unit, RBAC, and End-to-End Journeys A–I)
npm test

# Start Backend API (http://localhost:4000) and Frontend Web App (http://localhost:5173)
npm run dev:api
npm run dev:web
```

## Documentation Links

- [Requirements Checklist](docs/architecture/REQUIREMENTS_CHECKLIST.md)
- [Technical Architecture](docs/architecture/TECHNICAL_ARCHITECTURE.md)
- [REST API & Webhook Reference](docs/api/API_DOCUMENTATION.md)
- [External Dependencies & ANHVL Go-Live Handover](docs/integrations/EXTERNAL_DEPENDENCIES_AND_HANDOVER.md)
- [Production Deployment & Backup Guide](docs/deployment/PRODUCTION_DEPLOYMENT_AND_BACKUP_GUIDE.md)

