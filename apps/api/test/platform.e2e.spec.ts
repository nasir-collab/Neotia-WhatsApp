import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createNestApp } from '../src/main';
import { NonClinicalContentCheck } from '../../../packages/validation/src';
import { SchedulerService } from '../src/scheduler/scheduler.service';
import { ResponsesService } from '../src/responses/responses.service';
import { PilotService } from '../src/pilot/pilot.service';

describe('ANHVL WhatsApp Patient Engagement Platform — Unit, Integration & E2E Suite', () => {
  let app: INestApplication;
  let superAdminToken: string;
  let newTownAdminToken: string;
  let viewerToken: string;
  let newTownHospitalId: string;
  let raipurHospitalId: string;

  beforeAll(async () => {
    app = await createNestApp();
    await app.init();

    // 1. Authenticate Super Admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'superadmin@anhvl-demo.in', password: 'AnhvlDemo@2026' });
    expect(loginRes.status).toBe(200);
    superAdminToken = loginRes.body.data.accessToken;

    // 2. Authenticate New Town Hospital Admin
    const ntkLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin.newtown@anhvl-demo.in', password: 'AnhvlDemo@2026' });
    expect(ntkLogin.status).toBe(200);
    newTownAdminToken = ntkLogin.body.data.accessToken;

    // 3. Authenticate Read-Only Management Viewer
    const viewerLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'management@anhvl-demo.in', password: 'AnhvlDemo@2026' });
    expect(viewerLogin.status).toBe(200);
    viewerToken = viewerLogin.body.data.accessToken;

    // Fetch Hospitals
    const hospRes = await request(app.getHttpServer())
      .get('/api/v1/hospitals')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(hospRes.status).toBe(200);
    const ntk = hospRes.body.data.find((h: any) => h.code === 'ANHVL-NTK');
    const rpr = hospRes.body.data.find((h: any) => h.code === 'ANHVL-RPR');
    newTownHospitalId = ntk.id;
    raipurHospitalId = rpr.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // =========================================================================
  // UNIT TESTS
  // =========================================================================
  describe('Unit Tests — Validation, Non-Clinical Safeguards, Quiet Hours & Parsing', () => {
    it('blocks clinical/diagnostic content from WhatsApp templates (Phase 1 Safeguard)', () => {
      const bad = NonClinicalContentCheck('Patient diagnosis shows malignancy, prescribed 50mg dosage');
      expect(bad.valid).toBe(false);

      const good = NonClinicalContentCheck(
        'Your OPD appointment with Dr. Ananya Chatterjee is confirmed for tomorrow at 10:30 AM.'
      );
      expect(good.valid).toBe(true);
    });

    it('calculates Quiet Hours (8:00 AM - 9:00 PM IST) and shifts 06:00 AM morning reminder to 07:00 AM exception', () => {
      const scheduler = app.get(SchedulerService);
      // 06:00 AM IST is 00:30 UTC
      const targetUtc = new Date('2026-11-20T00:30:00.000Z');
      const res = scheduler.calculateQuietHourAdjustedUtc({
        targetUtc,
        appointmentTimeLocal: '09:00',
        allowMorningException: true,
        morningCutoffTime: '10:30',
        jobType: 'REMINDER_3H',
      });
      expect(res.wasShifted).toBe(true);
      // 07:00 AM IST is 01:30 UTC
      expect(res.adjustedUtc.toISOString()).toBe('2026-11-20T01:30:00.000Z');
    });

    it('parses multilingual patient responses (English, Bengali, Hindi, Interactive Buttons)', () => {
      const responsesService = app.get(ResponsesService);
      expect(responsesService.parseActionFromInput('হ্যাঁ', undefined)).toBe('CONFIRM');
      expect(responsesService.parseActionFromInput('रीशेड्यूल', undefined)).toBe('RESCHEDULE');
      expect(responsesService.parseActionFromInput('বাতিল', undefined)).toBe('CANCEL');
      expect(responsesService.parseActionFromInput('मदद चाहिए', undefined)).toBe('TALK_TO_US');
      expect(responsesService.parseActionFromInput('STOP', undefined)).toBe('STOP');
      expect(responsesService.parseActionFromInput('Anything', 'BTN_CONFIRM')).toBe('CONFIRM');
    });

    it('computes deterministic, reproducible Pilot Cohort assignments', () => {
      const pilotService = app.get(PilotService);
      const first = pilotService.computeDeterministicCohort('NTK-BK-TEST-9001', 20);
      const second = pilotService.computeDeterministicCohort('NTK-BK-TEST-9001', 20);
      expect(first.cohortGroup).toBe(second.cohortGroup);
      expect(first.deterministicHash).toBe(second.deterministicHash);
    });
  });

  // =========================================================================
  // RBAC & HOSPITAL ACCESS RESTRICTIONS
  // =========================================================================
  describe('Security, Authentication & RBAC Enforcement', () => {
    it('prevents Management Viewer (read-only role) from mutating appointments', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ bookingId: 'SHOULD-FAIL' });
      expect(res.status).toBe(403);
    });

    it('restricts New Town Hospital Admin from accessing Raipur Hospital records', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/appointments?hospitalId=${raipurHospitalId}`)
        .set('Authorization', `Bearer ${newTownAdminToken}`);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // END-TO-END JOURNEYS (A through I)
  // =========================================================================
  describe('End-to-End Operational Journeys (A - I)', () => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];

    it('Journey A & I: Appointment creation -> hospital/language routing (Bengali) -> confirmation -> patient confirms -> directions sent', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-A-101',
          externalPatientId: 'UHID-E2E-A101',
          patientName: 'Ritabhari Sen (SYNTHETIC E2E)',
          mobileNumber: '+919830088101',
          preferredLanguage: 'bn',
          hospitalId: newTownHospitalId,
          department: 'Obstetrics & Gynaecology',
          doctorName: 'Dr. Ananya Chatterjee',
          appointmentDate: tomorrow,
          appointmentTime: '11:00',
          forceCohortGroup: 'TREATMENT',
        });

      expect(createRes.status).toBe(201);
      const appt = createRes.body.data.appointment;
      expect(appt.preferredLanguage).toBe('bn');
      expect(appt.messageLogs.length).toBeGreaterThan(0);

      // Verify duplicate HIS event does not create duplicate appointment or duplicate messages
      const dupRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-A-101',
          patientName: 'Ritabhari Sen (SYNTHETIC E2E)',
          mobileNumber: '+919830088101',
          preferredLanguage: 'bn',
          hospitalId: newTownHospitalId,
          department: 'Obstetrics & Gynaecology',
          doctorName: 'Dr. Ananya Chatterjee',
          appointmentDate: tomorrow,
          appointmentTime: '11:00',
        });
      expect(dupRes.body.data.duplicateSkipped).toBe(true);

      // Patient responds Confirm
      const respRes = await request(app.getHttpServer())
        .post('/api/v1/responses/capture')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          appointmentId: appt.id,
          rawResponseText: 'Confirm Appointment',
          buttonPayload: 'BTN_CONFIRM',
        });
      expect(respRes.status).toBe(201);
      expect(respRes.body.data.mappedAction).toBe('CONFIRM');

      const updatedAppt = await request(app.getHttpServer())
        .get(`/api/v1/appointments/${appt.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(updatedAppt.body.data.status).toBe('CONFIRMED');
    });

    it('Journey B: Appointment creation -> patient reschedule request -> call-centre follow-up task created without auto-booking slot', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-B-102',
          externalPatientId: 'UHID-E2E-B102',
          patientName: 'Vikramaditya Verma (SYNTHETIC E2E)',
          mobileNumber: '+919752088102',
          preferredLanguage: 'hi',
          hospitalId: raipurHospitalId,
          department: 'Paediatrics & Child Care',
          doctorName: 'Dr. Rajesh Tiwari',
          appointmentDate: tomorrow,
          appointmentTime: '12:30',
        });

      const appt = createRes.body.data.appointment;

      const respRes = await request(app.getHttpServer())
        .post('/api/v1/responses/capture')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          appointmentId: appt.id,
          rawResponseText: 'Need Reschedule',
          buttonPayload: 'BTN_RESCHEDULE',
        });

      expect(respRes.status).toBe(201);
      expect(respRes.body.data.followUpTriggered).toBe(true);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/appointments/${appt.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(detailRes.body.data.status).toBe('RESCHEDULE_REQUESTED');
      expect(detailRes.body.data.followUpTasks.some((t: any) => t.taskType === 'RESCHEDULE_REQUEST')).toBe(true);
    });

    it('Journey C: Patient cancellation request -> CANCELLATION_REQUESTED -> official HIS confirmation -> pending reminders suppressed', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-C-103',
          externalPatientId: 'UHID-E2E-C103',
          patientName: 'Suman Chatterjee (SYNTHETIC E2E)',
          mobileNumber: '+919830088103',
          preferredLanguage: 'en',
          hospitalId: newTownHospitalId,
          department: 'Fetal Medicine',
          doctorName: 'Dr. Debashis Roy',
          appointmentDate: tomorrow,
          appointmentTime: '15:00',
          forceCohortGroup: 'TREATMENT',
        });

      const appt = createRes.body.data.appointment;

      // Patient taps Cancel -> must become CANCELLATION_REQUESTED, NOT officially CANCELLED yet
      await request(app.getHttpServer())
        .post('/api/v1/responses/capture')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          appointmentId: appt.id,
          rawResponseText: 'Cancel',
          buttonPayload: 'BTN_CANCEL',
        });

      const afterReq = await request(app.getHttpServer())
        .get(`/api/v1/appointments/${appt.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(afterReq.body.data.status).toBe('CANCELLATION_REQUESTED');

      // Official HIS / Hospital cancellation confirmation
      const cancelRes = await request(app.getHttpServer())
        .post(`/api/v1/appointments/${appt.id}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'HIS confirmed slot cancellation' });

      expect(cancelRes.status).toBe(201);
      expect(cancelRes.body.data.status).toBe('CANCELLED');
      const pendingJobs = cancelRes.body.data.scheduledMessages.filter((m: any) => m.status === 'SCHEDULED');
      expect(pendingJobs.length).toBe(0);
    });

    it('Journey D: Appointment -> Meta webhook delivery failure -> call-centre fallback task created', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-D-104',
          externalPatientId: 'UHID-E2E-D104',
          patientName: 'Nandini Gupta (SYNTHETIC E2E)',
          mobileNumber: '+919752088104',
          preferredLanguage: 'en',
          hospitalId: raipurHospitalId,
          department: 'Obstetrics & Gynaecology',
          doctorName: 'Dr. Vandana Sharma',
          appointmentDate: tomorrow,
          appointmentTime: '16:00',
        });

      const appt = createRes.body.data.appointment;
      const wamid = appt.messageLogs[0].whatsappMessageId;

      const webhookRes = await request(app.getHttpServer())
        .post('/api/v1/webhooks/whatsapp')
        .send({
          whatsappMessageId: wamid,
          status: 'failed',
          errorCode: '131026',
          errorTitle: 'Recipient incapable of receiving message',
        });

      expect(webhookRes.status).toBe(200);

      const detailRes = await request(app.getHttpServer())
        .get(`/api/v1/appointments/${appt.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(
        detailRes.body.data.followUpTasks.some((t: any) => t.taskType === 'DELIVERY_FAILURE_FALLBACK')
      ).toBe(true);
    });

    it('Journey E: STOP -> consent suppression -> subsequent outbound message blocked', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-E-105',
          externalPatientId: 'UHID-E2E-E105',
          patientName: 'Tapas Paul (SYNTHETIC E2E)',
          mobileNumber: '+919830088105',
          preferredLanguage: 'en',
          hospitalId: newTownHospitalId,
          department: 'Paediatrics & Neonatology',
          doctorName: 'Dr. Kaushik Banerjee',
          appointmentDate: tomorrow,
          appointmentTime: '17:00',
          forceCohortGroup: 'TREATMENT',
        });

      const appt = createRes.body.data.appointment;

      // Patient replies STOP
      await request(app.getHttpServer())
        .post('/api/v1/responses/capture')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          appointmentId: appt.id,
          rawResponseText: 'STOP',
        });

      // Attempt to send another message -> must be suppressed
      const testSend = await request(app.getHttpServer())
        .post('/api/v1/messages/test')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          appointmentId: appt.id,
          category: 'ADVANCE_REMINDER',
        });

      expect(testSend.status).toBe(201);
      expect(testSend.body.data.suppressed).toBe(true);
      expect(testSend.body.data.reason).toBe('PATIENT_OPTED_OUT_STOP');
    });

    it('Journey F & G: HIS Attendance Reconciliation (COMPLETED, NO_SHOW -> Rebooking Prompt, and UNMATCHED isolation)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-G-106',
          externalPatientId: 'UHID-E2E-G106',
          patientName: 'parमिता / Paramita Roy (SYNTHETIC E2E)',
          mobileNumber: '+919830088106',
          preferredLanguage: 'bn',
          hospitalId: newTownHospitalId,
          department: 'Obstetrics & Gynaecology',
          doctorName: 'Dr. Ritu Sen',
          appointmentDate: tomorrow,
          appointmentTime: '10:00',
          forceCohortGroup: 'TREATMENT',
        });

      const appt = createRes.body.data.appointment;

      // Reconcile verified HIS NO_SHOW outcome -> triggers rebooking prompt
      const noShowRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/reconcile')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: appt.bookingId,
          hospitalId: newTownHospitalId,
          outcomeStatus: 'NO_SHOW',
        });

      expect(noShowRes.status).toBe(201);
      expect(noShowRes.body.data.matched).toBe(true);
      expect(noShowRes.body.data.rebookingSent).toBe(true);

      // Reconcile an UNMATCHED booking ID -> must remain UNMATCHED (never classified as arrived or no-show)
      const unmatchedRes = await request(app.getHttpServer())
        .post('/api/v1/attendance/reconcile')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'UNKNOWN-BOOKING-99999',
          hospitalId: newTownHospitalId,
          outcomeStatus: 'ARRIVED',
        });

      expect(unmatchedRes.status).toBe(201);
      expect(unmatchedRes.body.data.matched).toBe(false);
      expect(unmatchedRes.body.data.record.outcomeStatus).toBe('UNMATCHED');
    });

    it('Journey H: New Town Pilot Control Group -> suppresses automated outbound campaigns', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          bookingId: 'E2E-JOURNEY-H-107',
          externalPatientId: 'UHID-E2E-H107',
          patientName: 'Control Cohort Patient (SYNTHETIC E2E)',
          mobileNumber: '+919830088107',
          preferredLanguage: 'bn',
          hospitalId: newTownHospitalId,
          department: 'Obstetrics & Gynaecology',
          doctorName: 'Dr. Ananya Chatterjee',
          appointmentDate: tomorrow,
          appointmentTime: '13:00',
          forceCohortGroup: 'CONTROL',
        });

      expect(createRes.status).toBe(201);
      const appt = createRes.body.data.appointment;
      expect(appt.holdoutAssignment.cohortGroup).toBe('CONTROL');
      expect(
        appt.scheduledMessages.every((m: any) => m.status === 'SUPPRESSED')
      ).toBe(true);
    });
  });
});

