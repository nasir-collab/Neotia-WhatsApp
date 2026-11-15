# ANHVL WhatsApp Patient Engagement Platform — REST API Reference

**Base URL:** `http://localhost:4000/api/v1`  
**Interactive Swagger UI:** `http://localhost:4000/api/docs`  
**OpenAPI JSON Spec:** `http://localhost:4000/api/docs-json`

---

## 1. Authentication & Authorization (`auth`, `users`)

All protected endpoints require `Authorization: Bearer <accessToken>`. Hospital-scoped users (`HOSPITAL_ADMIN`, `OPERATIONS_MANAGER`, `OPERATIONS_EXECUTIVE`, `CALL_CENTRE_AGENT`) are automatically restricted to their assigned `hospitalId` on the backend.

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticate with email & password; returns `accessToken`, `refreshToken`, and user profile |
| `POST` | `/api/v1/auth/refresh` | Public | Exchange valid `refreshToken` for a new `accessToken` |
| `GET` | `/api/v1/auth/me` | Authenticated | Get current authenticated user profile, role, and hospital scope |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Change current user password and log audit event |
| `GET` | `/api/v1/users` | `SUPER_ADMIN`, `HOSPITAL_ADMIN` | List users and available RBAC roles |
| `POST` | `/api/v1/users` | `SUPER_ADMIN`, `HOSPITAL_ADMIN` | Create a new staff user account |
| `PATCH` | `/api/v1/users/:id/status` | `SUPER_ADMIN`, `HOSPITAL_ADMIN` | Activate or deactivate a user account |

---

## 2. Hospital Configuration (`hospitals`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/hospitals` | List configured hospitals (`ANHVL-NTK` New Town Kolkata, `ANHVL-RPR` Raipur) with configurations and counts |
| `GET` | `/api/v1/hospitals/:id` | Retrieve detailed configuration, departments, doctors, and integration statuses for a hospital |
| `PATCH` | `/api/v1/hospitals/:id/configuration` | Update OPD timings, helpline, map link, entrance/parking guidance, reminder offsets, or holdout % |

---

## 3. Appointments & HIS Ingestion (`appointments`, `patients`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/appointments` | Search and filter appointments by hospital, status, attendance, language, cohort, or query |
| `GET` | `/api/v1/appointments/export/csv` | Export filtered appointments as CSV |
| `GET` | `/api/v1/appointments/:id` | Full appointment details including event timeline, messages, scheduled reminders, responses, and follow-up tasks |
| `POST` | `/api/v1/appointments/ingest` | Idempotent appointment ingestion (deduplicates by `hospitalId + bookingId`, evaluates consent & pilot cohort, schedules T-24h/T-3h/T-60m reminders) |
| `POST` | `/api/v1/appointments/bulk-import` | Bulk CSV/JSON appointment import with row-level validation and `SyncJob` audit tracking |
| `POST` | `/api/v1/appointments/:id/confirm-cancellation` | Official HIS/hospital confirmation of cancellation (`CANCELLED`); automatically cancels all pending scheduled reminders |
| `GET` | `/api/v1/patients` | List patients with consent records and appointment counts |

---

## 4. Consent Ledger (`consent`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/consent` | List patient consent records (`GRANTED`, `REVOKED`, `PENDING`, `EXPIRED`) |
| `POST` | `/api/v1/consent/update` | Grant or revoke WhatsApp communication consent; revoking immediately cancels pending scheduled reminders |

---

## 5. WhatsApp Cloud API, Templates & Scheduler (`whatsapp`, `templates`, `scheduler`, `responses`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/whatsapp/messages` | List outbound WhatsApp `MessageLog` records with separate `submittedAt`, `sentAt`, `deliveredAt`, `readAt`, and `failedAt` timestamps |
| `POST` | `/api/v1/whatsapp/send` | Trigger an outbound template message for an appointment |
| `GET` | `/api/v1/webhooks/whatsapp` | Meta Cloud API `hub.challenge` webhook verification endpoint |
| `POST` | `/api/v1/webhooks/whatsapp` | Meta Cloud API inbound message & status receipt webhook handler |
| `GET` | `/api/v1/templates` | List multilingual message templates across New Town (`bn`, `en`) and Raipur (`hi`, `en`) |
| `POST` | `/api/v1/templates` | Create a new non-clinical WhatsApp template (enforces clinical keyword prohibition) |
| `POST` | `/api/v1/templates/:id/versions` | Create a new template version (`DRAFT`, `SUBMITTED`, `APPROVED`) |
| `GET` | `/api/v1/scheduler/jobs` | List `ScheduledMessage` queue jobs (`SCHEDULED`, `SENT`, `CANCELLED`, `SUPPRESSED`, `FAILED`) |
| `POST` | `/api/v1/scheduler/process-due` | Trigger immediate processing of due scheduled reminder jobs |
| `GET` | `/api/v1/responses` | List inbound patient replies (`CONFIRM`, `RESCHEDULE`, `CANCEL`, `TALK_TO_US`, `STOP`) |

---

## 6. Call-Centre Follow-Ups & Attendance Reconciliation (`followups`, `attendance`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/followups` | List call-centre follow-up tasks filtered by hospital, status, priority, or task type |
| `GET` | `/api/v1/followups/agents` | List Altruist / call-centre agents and active workload |
| `PATCH` | `/api/v1/followups/:id/status` | Claim task, log call notes, record reschedule, or trigger official HIS cancellation |
| `GET` | `/api/v1/attendance` | List HIS attendance reconciliation records (`CHECKED_IN`, `COMPLETED`, `NO_SHOW`, `UNMATCHED`) |
| `POST` | `/api/v1/attendance/reconcile` | Reconcile batch of HIS attendance records; flags unknown booking IDs as `UNMATCHED` and triggers no-show recovery only on verified `NO_SHOW` |

---

## 7. Integrations, Pilot Holdout, Reports & Simulator (`integrations`, `pilot`, `reports`, `simulator`, `settings`, `audit`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/integrations` | List all external integration configurations and connection readiness states |
| `POST` | `/api/v1/integrations/:id/verify` | Run live connectivity check against configured endpoint |
| `GET` | `/api/v1/pilot/metrics` | New Town 90-day pilot comparison (`TREATMENT` vs `CONTROL` no-show rates, relative reduction %, and recovery conversions) |
| `GET` | `/api/v1/reports/executive-summary` | Executive KPI summary, status distribution, language breakdown, and integration readiness |
| `GET` | `/api/v1/simulator/status` | Get current 10-scenario & 9-step interactive demo simulator state |
| `POST` | `/api/v1/simulator/scenario` | Execute one of the 10 pre-configured end-to-end patient journey scenarios |
| `POST` | `/api/v1/simulator/step` | Execute a guided step (Steps 1–9) in the interactive simulator |
| `GET` | `/api/v1/settings/health` | Production health check endpoint (Database, Queue, Platform Mode) |
| `GET` | `/api/v1/audit` | Query immutable security and operational audit logs |

