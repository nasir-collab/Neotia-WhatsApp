# ANHVL WhatsApp Patient Engagement Platform — External Dependencies, Integration Handover & Go-Live Checklist

**Client:** Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL)  
**Solution Partner:** Plan D Media  

---

## 1. Transparent Integration Readiness Policy

In strict compliance with enterprise healthcare software standards, this platform separates **Demo Simulation Mode (`PLATFORM_MODE=DEMO`)** from **Live Production Operation (`PLATFORM_MODE=PRODUCTION`)**:

- In `DEMO` mode, all synthetic records carry `[DEMO_SYNTHETIC]` tags, use synthetic patient phone numbers (`+9198300...` / `+9198260...`), and display unmistakable `DEMO SIMULATION` badges across the UI and API responses.
- In `PRODUCTION` mode, the platform **never silently falls back to simulation**. If verified credentials for Meta WhatsApp Cloud API, the Hospital Information System (HIS), or Altruist Call-Centre are missing, the system explicitly reports `NOT_CONFIGURED` or `CONFIGURED_UNTESTED` and blocks unverified live dispatches.

---

## 2. External Credentials & Prerequisites Required from ANHVL

Before switching `PLATFORM_MODE=PRODUCTION`, ANHVL IT, Operations, and Compliance teams must supply the following verified items:

### A. Meta WhatsApp Business Platform (Cloud API)
1. **Verified Meta Business Manager ID** for Ambuja Neotia Healthcare Venture Ltd.
2. **WhatsApp Business Account (WABA) ID** and **Phone Number ID** (`WHATSAPP_PHONE_NUMBER_ID`).
3. **Permanent System User Access Token** (`WHATSAPP_ACCESS_TOKEN`) with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
4. **App Secret** (`WHATSAPP_APP_SECRET`) for `X-Hub-Signature-256` HMAC-SHA256 webhook verification.
5. **Webhook Verification Token** (`WHATSAPP_VERIFY_TOKEN`) configured in Meta Developer Portal pointing to `https://<production-domain>/api/v1/webhooks/whatsapp`.
6. **Meta Approval for All 40 Initial Utility Templates** across:
   - **New Town, Kolkata (`ANHVL-NTK`):** Bengali (`bn`) and English (`en`) across all 10 operational categories.
   - **Raipur (`ANHVL-RPR`):** Hindi (`hi`) and English (`en`) across all 10 operational categories.

### B. Hospital Information System (HIS) Integration
1. **API Endpoint / SFTP Host Details** (`HIS_API_BASE_URL`, `HIS_API_KEY`, `HIS_WEBHOOK_SECRET`) for New Town, Kolkata and Raipur.
2. **Department & Doctor Master Mapping Codes** matching HIS internal IDs.
3. **Booking Payload Feed** (REST webhook or scheduled pull) providing:
   - `bookingId` (Unique external HIS booking reference)
   - `externalPatientId` (UHID)
   - `patientName`, `mobileNumber`, `preferredLanguage`
   - `hospitalCode` (`ANHVL-NTK` or `ANHVL-RPR`), `department`, `doctorName`
   - `appointmentDate` (`YYYY-MM-DD`), `appointmentTime` (`HH:mm`), `isFirstVisit`
4. **HIS Attendance Reconciliation Feed** providing verified post-OPD statuses (`CHECKED_IN`, `COMPLETED`, `NO_SHOW`, `CANCELLED`).
   - *Operational Safeguard:* Any HIS attendance record whose `bookingId` does not match an active platform appointment is logged as `UNMATCHED` for supervisor review and is never auto-classified.
   - *Operational Safeguard:* Automated no-show rebooking prompts trigger **only** when the verified HIS attendance feed records `NO_SHOW`.

### C. Altruist Call-Centre Integration
1. **Altruist CRM / CTI Webhook & REST Credentials** (`ALTRUIST_API_BASE_URL`, `ALTRUIST_API_KEY`).
2. **Agent Roster Mapping** (Agent IDs, hospital assignment, language fluency across Bengali, Hindi, and English).
3. **Escalation Routing Rules** for:
   - `RESCHEDULE` requests (4-hour SLA; never auto-allocates slots via bot).
   - `CANCEL` requests (4-hour SLA; sets `CANCELLATION_REQUESTED` until confirmed in HIS).
   - `TALK_TO_US` / unparsed free-text patient messages (2-hour SLA).
   - `DELIVERY_FAILURE` fallback calls when WhatsApp delivery fails (2-hour SLA).

### D. Verified Hospital Campus Metadata
1. Official reception & emergency helpline numbers for New Town, Kolkata and Raipur (replacing the clearly labelled `DEMO` placeholder numbers).
2. Official Google Maps pin URLs, Gate/Tower entrance instructions, and OPD check-in counter details.
3. Legal/DPO sign-off on patient WhatsApp opt-in consent wording at OPD registration desks and web portals.

