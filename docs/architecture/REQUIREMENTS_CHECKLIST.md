# ANHVL WhatsApp Patient Engagement Platform — Functional Requirements Checklist

**Client:** Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL)  
**Solution Partner:** Plan D Media  
**Reference Document:** `docs/WhatsApp Patient Engagement System.pdf` (Version 1.1 - Revised)

---

## 1. Core End-to-End Patient Engagement Journey
- [x] **Step 1 — HIS / Appointment Booking & Ingestion**: Read new/updated/rescheduled/cancelled bookings via REST API, Webhook, or SFTP/CSV import.
- [x] **Step 2 — Data Validation & Deduplication**: Validate required fields (Booking ID, Patient Name, Mobile, Hospital, Department, Doctor, Appointment Date/Time), deduplicate via stable `bookingId` + `hospitalId`, log exceptions.
- [x] **Step 3 — Consent Verification & Eligibility**: Verify patient consent status, check STOP/opt-out status, verify non-clinical safeguard, check pilot holdout/control group assignment.
- [x] **Step 4 — Hospital & Language Routing**:
  - **New Town, Kolkata**: Bengali (`bn`) and English (`en`), fallback `en`, timezone `Asia/Kolkata`.
  - **Raipur**: Hindi (`hi`) and English (`en`), fallback `hi`/`en`, timezone `Asia/Kolkata`.
- [x] **Step 5 — WhatsApp Appointment Confirmation**: Trigger approved utility template with `{{patient_name}}`, `{{appointment_date}}`, `{{appointment_time}}`, `{{doctor_name}}`, `{{hospital_name}}`, `{{hospital_address}}`, `{{helpline}}` and interactive Confirm / Reschedule / Cancel / Talk-to-Us options.
- [x] **Step 6 — Automated Reminder Engine**:
  - ~24-hour advance reminder.
  - ~2–3-hour pre-appointment reminder.
  - Same-day booking handling (suppress redundant 24h reminder if booked within 24h).
  - Morning appointment handling & Quiet Hours enforcement (8:00 AM – 9:00 PM local time, with approved morning-appointment exception).
  - Automatic cancellation/re-timing of pending reminders upon booking update or cancellation.
- [x] **Step 7 — Directions & First-Visit Assistance**: Share location pin, entrance/gate, parking guidance, OPD floor/desk, items to carry, helpline, and Raipur enhanced first-visit assistance.
- [x] **Step 8 — Patient Response Capture**:
  - Handle interactive button replies & text keywords (`CONFIRM`, `RESCHEDULE`, `CANCEL`, `HELP`/`TALK TO US`, `STOP`/`UNSUBSCRIBE`).
  - Reschedule request creates a call-centre follow-up task (never auto-books slots).
  - Cancellation request sets `CANCELLATION_REQUESTED` and creates a review task (does not mark `CANCELLED` until hospital/HIS confirmation).
  - STOP immediately updates `PatientConsent` to opted-out, suppresses all queued/scheduled messages, and logs an audit entry.
- [x] **Step 9 — Call-Centre / Altruist Follow-Up Queue**:
  - Generate structured follow-up tasks for reschedule, cancellation review, talk-to-us assistance, unconfirmed visits, and WhatsApp delivery failures.
  - Support agent assignment, reassignment, status transitions (`OPEN`, `IN_PROGRESS`, `ESCALATED`, `RESOLVED`, `REOPENED`), internal notes, Altruist REST adapter, and CSV worklist export.
- [x] **Step 10 — HIS Attendance Reconciliation & No-Show Engine**:
  - Match HIS registration/visit outcomes (`ARRIVED`, `REGISTERED`, `COMPLETED`, `NO_SHOW`, `CANCELLED`, `UNMATCHED`) by `bookingId`.
  - Never auto-classify unmatched records as arrived or no-show.
  - Trigger No-Show Rebooking Prompt only when a verified HIS outcome indicates `NO_SHOW` (never purely because appointment time passed).
- [x] **Step 11 — Pilot / Control Group Measurement (New Town)**:
  - Deterministic/reproducible assignment of eligible New Town appointments into `TREATMENT` vs `CONTROL` holdout group.
  - Suppress automated campaign reminders for `CONTROL` group while tracking HIS attendance outcomes to measure arrival-rate lift.
- [x] **Step 12 — Executive Dashboard & Operational Reporting**:
  - 15+ real-time KPIs with explicit denominators (distinguishing API Submitted, WhatsApp Delivered/Read, Patient Confirmed, and HIS Attended).
  - Breakdowns by hospital, department, doctor, language, booking source, and call-centre workload, with date filters and CSV exports.

---

## 2. Database Entities (24 Normalized Tables)
1. `User` — System users with password hashes, role, hospital scope, status, login timestamps.
2. `Role` — System roles (`SUPER_ADMIN`, `HOSPITAL_ADMIN`, `OPS_MANAGER`, `OPS_EXECUTIVE`, `CALL_CENTRE_AGENT`, `MANAGEMENT_VIEWER`).
3. `Permission` — Granular RBAC permissions linked to roles.
4. `Hospital` — Hospital master records (New Town Kolkata, Raipur).
5. `HospitalConfiguration` — OPD timings, entrance/parking, directions, map URL, helpline, languages, reminder offsets, quiet hours, department/doctor mappings.
6. `Patient` — Restricted patient demographic record (no clinical diagnosis/prescriptions stored).
7. `PatientConsent` — Consent status, source, timestamp, opt-out flag, opt-out timestamp, eligibility flag.
8. `Appointment` — Core appointment record with `bookingId`, status, attendance status, consent status, holdout group, sync timestamp.
9. `AppointmentEvent` — Immutable event log for every state transition on an appointment.
10. `MessageTemplate` — Multilingual template master across 10 required categories.
11. `TemplateVersion` — Versioned template body, variables, buttons, Meta approval status (`DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`).
12. `ScheduledMessage` — Persistent scheduled job record with idempotency key, scheduled time, status, retry count.
13. `MessageLog` — Outbound/inbound message lifecycle log (`QUEUED`, `SCHEDULED`, `SUBMITTED`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `SUPPRESSED`, `CANCELLED`) with Meta `wamid`.
14. `WhatsAppWebhook` — Raw inbound webhook payload store with signature validation & idempotency tracking.
15. `PatientResponse` — Parsed patient action (`CONFIRM`, `RESCHEDULE`, `CANCEL`, `TALK_TO_US`, `STOP`) linked to appointment and message.
16. `FollowUpTask` — Call-centre / Altruist actionable task with priority, status, notes, resolution, handoff state.
17. `Agent` — Call-centre agent profile linked to user/hospital and task metrics.
18. `AttendanceRecord` — HIS registration/attendance reconciliation record (`ARRIVED`, `REGISTERED`, `COMPLETED`, `NO_SHOW`, `CANCELLED`, `UNMATCHED`).
19. `IntegrationConfiguration` — Adapter configuration for Meta WhatsApp Cloud API, HIS REST/Webhook/SFTP, and Altruist (credentials masked in responses).
20. `IntegrationLog` — Request/response audit trail for external integrations and connection tests.
21. `SyncJob` — Batch/scheduled synchronization job tracking (HIS import, attendance reconciliation, Altruist export).
22. `HoldoutAssignment` — New Town pilot treatment vs control group assignment record.
23. `AuditLog` — Comprehensive security and operational audit trail.
24. `SystemSetting` — Global platform settings (`DEMO_MODE` vs `PRODUCTION_MODE`, retention policies, alert thresholds).

