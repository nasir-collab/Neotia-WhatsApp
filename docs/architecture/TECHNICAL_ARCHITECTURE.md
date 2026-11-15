# ANHVL WhatsApp Patient Engagement Platform — Technical Architecture

**Client:** Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL)  
**Solution Partner:** Plan D Media  
**Version:** 1.0.0 (Production-Ready Full-Stack Platform)

---

## 1. Architectural Overview

The ANHVL WhatsApp Patient Engagement Platform is a modular, multi-hospital enterprise software application built to orchestrate the complete non-clinical patient appointment lifecycle across **New Town, Kolkata (`ANHVL-NTK`)** and **Raipur (`ANHVL-RPR`)**.

### Core Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend (`apps/web`)** | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router v6, Recharts, Lucide Icons | 26-screen role-protected operational portal, agent workbench, template studio, live simulator & client presentation view |
| **Backend (`apps/api`)** | Node.js, TypeScript, NestJS 10, Swagger/OpenAPI, Passport/JWT, `bcryptjs` | REST API server, webhook ingestion, RBAC & hospital-scope guards, consent engine, scheduler, pilot cohort evaluator |
| **Database (`prisma/`)** | PostgreSQL 16 + Prisma ORM | 24 normalized relational tables with ACID transactions, foreign keys, composite indexes, and immutable audit logs |
| **Queue & Workers (`scheduler/`)** | Redis 7 + BullMQ / Persistent Transactional Queue | Idempotent T-24h, T-3h, and T-60m reminder scheduling, exponential backoff retry engine, cancellation suppression |
| **Shared Contracts (`packages/`)** | `@anhvl/shared-types`, `@anhvl/validation`, `@anhvl/configuration` | Shared TypeScript interfaces, Zod schemas, non-clinical content validator, E.164 phone validator |

---

## 2. End-to-End Operational Data Flow

```
[Hospital Information System (HIS)]
   │ (REST API / Signed Webhook / Scheduled Pull / CSV Fallback)
   ▼
[1. Appointment Ingestion & Deduplication]
   │ - Matches by (hospitalId, bookingId)
   │ - Updates existing record if modified; prevents duplicate confirmation messages
   ▼
[2. Validation & Consent Verification]
   │ - Validates E.164 Indian mobile (+91), hospital code, doctor, department, date/time
   │ - Verifies PatientConsent (GRANTED / REVOKED / PENDING)
   │ - Checks Pilot Holdout Cohort (90% TREATMENT vs 10% CONTROL at New Town)
   ▼
[3. Hospital & Language Routing]
   │ - New Town, Kolkata (ANHVL-NTK) -> Bengali (bn) or English (en)
   │ - Raipur (ANHVL-RPR) -> Hindi (hi) or English (en)
   ▼
[4. WhatsApp Business Platform (Meta Cloud API)]
   │ - Immediate Appointment Confirmation + Interactive Quick-Reply Buttons
   │ - First-Visit Campus Navigation & OPD Check-in Guide
   │ - Scheduled Reminders: T-24 Hours, T-3 Hours, T-60 Minutes
   │ - Tracks lifecycle separately: QUEUED -> SUBMITTED -> SENT -> DELIVERED -> READ / FAILED
   ▼
[5. Inbound Patient Response & Intent Classification]
   │ - CONFIRM -> Appointment Status = CONFIRMED
   │ - RESCHEDULE -> Appointment Status = RESCHEDULE_REQUESTED + High-Priority Follow-Up Task (never auto-allocates slots)
   │ - CANCEL -> Appointment Status = CANCELLATION_REQUESTED + Review Task (only CANCELLED after HIS confirmation)
   │ - TALK_TO_US / Free-text -> Agent Escalation Follow-Up Task
   │ - STOP / UNSUBSCRIBE -> Immediate Consent Revocation + Cancellation of all pending ScheduledMessages
   ▼
[6. Altruist Call-Centre Workbench & Synchronizer]
   │ - Agents claim tasks, log call outcomes, record reschedules, or trigger HIS-confirmed cancellations
   ▼
[7. HIS Attendance Reconciliation & No-Show Recovery]
   │ - Reconciles actual OPD check-in feed (CHECKED_IN / COMPLETED / NO_SHOW)
   │ - Flags unknown booking IDs as UNMATCHED (never auto-classified)
   │ - Triggers No-Show Rebooking Prompt & Recovery Task ONLY upon verified HIS NO_SHOW feed
```

---

## 3. Database Schema (24 Normalized Entities)

1. `Role` — RBAC role definitions (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `OPERATIONS_MANAGER`, `OPERATIONS_EXECUTIVE`, `CALL_CENTRE_AGENT`, `MANAGEMENT_VIEWER`).
2. `Permission` — Granular module/action permissions linked to roles.
3. `Hospital` — Hospital master record (`ANHVL-NTK`, `ANHVL-RPR`).
4. `HospitalConfiguration` — Per-hospital OPD timings, helpline, map URL, languages, reminder offsets, and pilot holdout percentage.
5. `User` — Authenticated staff accounts with bcrypt password hashes, role assignment, and optional `hospitalId` scope restriction.
6. `Patient` — Non-clinical patient master record (UHID, name, E.164 mobile, preferred language, hospital).
7. `PatientConsent` — Explicit opt-in/opt-out ledger (`GRANTED`, `REVOKED`, `PENDING`, `EXPIRED`) with source, timestamp, and audit trail.
8. `Appointment` — Core appointment record with `bookingId`, status, attendance status, pilot cohort assignment, and HIS sync timestamp.
9. `AppointmentEvent` — Immutable event timeline per appointment.
10. `MessageTemplate` — Multilingual WhatsApp template master across 10 operational categories.
11. `TemplateVersion` — Versioned template body, variables, buttons, and Meta approval status (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`).
12. `ScheduledMessage` — Persistent reminder queue (`CONFIRMATION`, `FIRST_VISIT_GUIDE`, `REMINDER_24H`, `REMINDER_3H`, `REMINDER_60M`, `NO_SHOW_RECOVERY`) with unique idempotency key.
13. `MessageLog` — Outbound WhatsApp message log tracking `QUEUED`, `SUBMITTED`, `SENT`, `DELIVERED`, `READ`, `FAILED`, and `SUPPRESSED` timestamps separately.
14. `WhatsAppWebhook` — Raw inbound Meta webhook payload store for idempotency and signature audit.
15. `PatientResponse` — Parsed inbound patient reply (`CONFIRM`, `RESCHEDULE`, `CANCEL`, `TALK_TO_US`, `STOP`, `OTHER`).
16. `Agent` — Altruist / call-centre agent roster and capacity tracking.
17. `FollowUpTask` — Prioritized call-centre queue with SLA deadlines, assignee, status, and call notes.
18. `AttendanceRecord` — HIS OPD attendance reconciliation ledger (`CHECKED_IN`, `COMPLETED`, `NO_SHOW`, `CANCELLED`, `UNMATCHED`).
19. `IntegrationConfiguration` — Per-hospital adapter configuration for Meta WhatsApp, HIS, and Altruist (`NOT_CONFIGURED`, `CONFIGURED_UNTESTED`, `VERIFIED_CONNECTED`, `DEMO_SIMULATION`).
20. `IntegrationLog` — Outbound/inbound integration request/response telemetry with secret redaction.
21. `SyncJob` — Batch import/reconciliation job tracker.
22. `HoldoutAssignment` — Randomized New Town Pilot cohort assignment (`TREATMENT` vs `CONTROL`).
23. `AuditLog` — Immutable security and operational audit trail.
24. `SystemSetting` — Global platform settings (`PLATFORM_MODE`, non-clinical guardrails, retention policies).

---

## 4. Non-Clinical & Privacy Guardrails

- **Zero Clinical Data Storage:** The database schema and API DTOs strictly store only appointment scheduling and communication metadata. Diagnoses, lab results, prescriptions, and clinical notes are prohibited.
- **Automated Template Sanitizer:** `TemplatesService` scans all template creations and edits against prohibited clinical terms (`diagnosis`, `prescription`, `lab report`, `hiv`, `biopsy`, `chemotherapy`, etc.) and rejects violations with HTTP 400.
- **Instant Opt-Out Enforcement:** Inbound `STOP` / `UNSUBSCRIBE` webhooks immediately transition `PatientConsent` to `REVOKED` and cancel all pending `ScheduledMessage` jobs in a single database transaction.

