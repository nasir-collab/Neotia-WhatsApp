# Client Advisory & Technical Scope Response — Two Additional Use Cases

**Prepared For:** Neotia Bhagirathi / Ambuja Neotia Healthcare Venture Ltd. (ANHVL)  
**Prepared By:** Plan D Media  
**Modules Implemented in Live Portal:**
- **Use Case 1:** `/doctor-disruptions` (*Doctor Cancellation, Delay & Bulk Reschedule Broadcast*)
- **Use Case 2:** `/retargeting` (*Multi-Segment Re-Targeting & Meta Consent Governance Console*)

---

## Use Case 1: Doctor Cancellation / Delay / Bulk Reschedule

### 1. Is it possible?
**Yes — 100% feasible and already architected into the platform.**

### 2. Recommended Operational Flow (Including When HIS Is Not Updated Per Booking)
1. **Admin Selection:** Operations / Hospital Admin selects **Hospital Unit**, **Doctor**, **OPD Date** (or all upcoming slots), and **Event Type** (`Doctor Cancelled` or `Doctor Running Late` + delay minutes).
2. **Impact Preview:** The platform immediately queries all active bookings for that doctor/date and shows:
   - Total affected patients and their preferred language (`BN`/`HI`/`EN`).
   - Total pending reminders (`T-24h`, `T-3h`) that will be halted.
   - Same-day bookings requiring immediate Altruist outbound calls.
3. **One-Click Execution & HIS-Independent Override Lock:**
   - **Stops Pending Reminders:** All `SCHEDULED` / `QUEUED` reminders for those Booking IDs are immediately set to `CANCELLED` (`DOCTOR_CANCELLED_ADMIN_OVERRIDE`).
   - **Applies an Internal Override Lock (`DOCTOR_DISRUPTION_OVERRIDE`):** Even if the hospital HIS is **not** updated booking-by-booking, subsequent HIS polling syncs carrying the old slot timestamp are safely ignored by our scheduler so old reminders are **never** re-queued. The lock clears automatically once HIS syncs a **new slot timestamp** or an **official HIS cancellation**.
   - **Sends ONE Multilingual WhatsApp Utility Message:** Each eligible patient receives a single **Meta UTILITY** service update with 3 interactive buttons:
     - `Next Available Slot`
     - `See Another Doctor`
     - `Call Me`
   - **Same-Day Altruist Escalation:** All same-day patients (and any WhatsApp-opted-out patients) automatically generate **CRITICAL priority tasks** in the Altruist Call-Centre Worklist for immediate human outreach.

### 3. Phase 1 vs Change Request & Estimated Cost
- **Scope Recommendation:** **Change Request (CR-01) / Phase 1B** (can be delivered immediately after core Phase 1 go-live, or bundled into Phase 1 with a 5–7 day schedule buffer).
- **One-Time Development Effort & Cost:** **₹25,000 – ₹35,000 + GST** (covers admin broadcast engine, HIS stale-sync override lock, 3 multilingual Meta Utility templates across BN/HI/EN, and same-day Altruist escalation routing).
- **Recurring WhatsApp Meta Cost:** Classified under **Meta UTILITY** (~₹0.115 – ₹0.15 per delivered message in India), making it highly cost-effective.

---

## Use Case 2: Multi-Segment Patient Re-Targeting & Lead Re-Engagement

### 1. Is it possible?
**Yes — feasible, with strict Meta Template Category (`UTILITY` vs `MARKETING`) and Dual-Consent separation.**

### 2. Meta Category & Consent Matrix

| Segment | Meta WhatsApp Category | Consent Requirement | Operational Guardrails |
|---|---|---|---|
| **1. Verified No-Shows Who Didn't Rebook** | **UTILITY** *(within 24–72h, tied directly to the missed booking ID)*; **MARKETING** *(if >72h or general follow-up)* | Standard **Appointment / Service Consent** (`GRANTED`) | Excludes New Town Pilot `CONTROL` Holdout cohort; strictly triggers only after verified HIS `NO_SHOW` feed. |
| **2. Cancelled Patients Without a New Slot** | **MARKETING** *(Mandatory — Meta rejects post-cancellation re-solicitation under Utility)* | **Separate Explicit Marketing Opt-In** (`marketingOptIn = true`) | Never use transactional booking consent alone; always include instant `STOP` opt-out button. |
| **3. Website / Ad Form-Fillers Who Never Booked** | **MARKETING** *(Mandatory — no confirmed appointment/transaction exists yet)* | **Explicit Web-Form Marketing Opt-In Checkbox** (`FORM_MARKETING_OPTIN`) | Requires CRM/Website webhook or CSV lead feed; enforce frequency cap (max 1–2 nudges per 14 days) + instant `STOP`. |

### 3. Rough Operational Flow
1. **Lead & Cohort Ingestion:** Verified No-Shows and Cancelled-without-rebook lists auto-populate from HIS reconciliation; Website/Ad form-fillers ingest via Webhook or CSV upload with their `marketingOptIn` timestamp.
2. **Automated Dual-Consent Filter:** The platform automatically separates **Consent-Eligible** contacts from **Blocked** contacts (missing marketing opt-in, `STOP` opt-out, Pilot Control Holdout, or 14-day frequency cap reached).
3. **Campaign Execution & Conversion Tracking:** Operations Manager launches a multilingual re-engagement wave (`Book / Rebook Slot` | `Call Me` | `STOP`), tracks clicks/replies, and routes `Call Me` responses straight to Altruist.

### 4. Phase 1 vs Change Request & Estimated Cost
- **Scope Recommendation:**
  - *No-Show Rebooking Prompt (within 72h Utility window):* **Already included in Phase 1**.
  - *Cancelled-Without-Slot & Unconverted Form-Filler Re-Targeting (Marketing Category, Dual-Consent Ledger, Lead Webhook, Frequency Capping):* **Change Request (CR-02) / Phase 2** (recommended after Phase 1 core attendance workflows stabilize, so Marketing quality ratings never impact core OPD Utility WABA health).
- **One-Time Development Effort & Cost:** **₹35,000 – ₹45,000 + GST** (covers Dual-Consent upgrade `serviceConsent` vs `marketingOptIn`, Website/CRM Lead Connector, Re-Targeting Console, Frequency Cap Engine, and Marketing Template setup).
- **Recurring WhatsApp Meta Cost:** **Meta MARKETING** conversations in India cost ~**₹0.78 – ₹0.88 per delivered message** (approx. 6–7× Utility cost), billed directly by Meta to ANHVL's WABA.

---

## Summary Comparison Table

| Use Case | Possible? | Meta Category | Recommended Phase | Est. One-Time CR Cost |
|---|---|---|---|---|
| **1. Doctor Cancellation / Delay Broadcast** | Yes (Built in Demo) | **UTILITY** | Phase 1B / CR-01 | ₹25,000 – ₹35,000 + GST |
| **2A. No-Show Rebooking (≤72h)** | Yes (Built in Demo) | **UTILITY** | **Included in Phase 1** | Included in Phase 1 |
| **2B. Cancelled & Form-Filler Re-Targeting** | Yes (Built in Demo) | **MARKETING** | Phase 2 / CR-02 | ₹35,000 – ₹45,000 + GST |
| **Combined Bundle (CR-01 + CR-02)** | Yes | UTILITY + MARKETING | Phased Rollout | **₹55,000 – ₹70,000 + GST** |
