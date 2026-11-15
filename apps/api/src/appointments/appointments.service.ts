import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { PilotService } from '../pilot/pilot.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SchedulerService) private readonly schedulerService: SchedulerService,
    @Inject(PilotService) private readonly pilotService: PilotService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  validateAppointmentInput(body: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!body.bookingId || String(body.bookingId).trim().length < 2) {
      errors.push('Missing or invalid bookingId');
    }
    if (!body.patientName || String(body.patientName).trim().length < 2) {
      errors.push('Missing patientName');
    }
    if (!body.mobileNumber || !/^\+?[0-9]{10,15}$/.test(String(body.mobileNumber).trim())) {
      errors.push('Invalid mobileNumber (10-15 digits required)');
    }
    if (!body.hospitalId) {
      errors.push('Missing hospitalId');
    }
    if (!body.department) {
      errors.push('Missing department');
    }
    if (!body.doctorName) {
      errors.push('Missing doctorName');
    }
    if (!body.appointmentDate) {
      errors.push('Missing appointmentDate');
    }
    if (!body.appointmentTime || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(String(body.appointmentTime).trim())) {
      errors.push('Invalid appointmentTime (HH:mm 24h format required)');
    }
    return { valid: errors.length === 0, errors };
  }

  async ingestAppointment(body: any, actorEmail = 'HIS_INGESTION_ENGINE') {
    const validation = this.validateAppointmentInput(body);
    if (!validation.valid) {
      throw new BadRequestException(`Validation failed: ${validation.errors.join('; ')}`);
    }

    const hospital = await this.prisma.hospital.findUnique({
      where: { id: body.hospitalId },
      include: { configuration: true },
    });
    if (!hospital) {
      throw new BadRequestException(`Hospital ID ${body.hospitalId} not found.`);
    }

    const bookingId = String(body.bookingId).trim();

    // Duplicate Detection: Ensure duplicate HIS events do not create duplicate appointments or duplicate messages
    const existingAppt = await this.prisma.appointment.findUnique({
      where: {
        hospitalId_bookingId: {
          hospitalId: hospital.id,
          bookingId,
        },
      },
      include: {
        patient: true,
        hospital: true,
        scheduledMessages: true,
        messageLogs: true,
      },
    });

    const dateStr = String(body.appointmentDate).split('T')[0];
    const scheduledAtUtc = new Date(`${dateStr}T${body.appointmentTime}:00+05:30`);

    if (existingAppt) {
      // Check if date/time or doctor changed (HIS Reschedule Event)
      const timeChanged =
        existingAppt.appointmentTime !== body.appointmentTime ||
        existingAppt.appointmentDate.toISOString().split('T')[0] !== dateStr;

      if (!timeChanged && existingAppt.doctorName === body.doctorName) {
        return {
          duplicateSkipped: true,
          updated: false,
          appointment: existingAppt,
          message: `Duplicate HIS booking event for ${bookingId} ignored safely.`,
        };
      }

      // Date/time changed -> cancel obsolete pending reminders and reschedule
      await this.schedulerService.cancelObsoleteMessagesForAppointment(
        existingAppt.id,
        'APPOINTMENT_RESCHEDULED_BY_HIS'
      );

      const updated = await this.prisma.appointment.update({
        where: { id: existingAppt.id },
        data: {
          appointmentDate: new Date(`${dateStr}T00:00:00.000Z`),
          appointmentTime: body.appointmentTime,
          scheduledAtUtc,
          doctorName: body.doctorName,
          department: body.department,
          status: 'CONFIRMATION_PENDING',
          lastSyncedAt: new Date(),
        },
      });

      await this.prisma.appointmentEvent.create({
        data: {
          appointmentId: existingAppt.id,
          hospitalId: hospital.id,
          eventType: 'HIS_RESCHEDULE_SYNCED',
          previousStatus: existingAppt.status,
          newStatus: 'CONFIRMATION_PENDING',
          description: `HIS updated booking ${bookingId} to ${dateStr} ${body.appointmentTime}. Obsolete reminders cancelled and re-timed.`,
          triggeredBy: actorEmail,
        },
      });

      await this.schedulerService.scheduleAppointmentJourney(updated.id, true);

      return { duplicateSkipped: false, updated: true, appointment: updated };
    }

    // Resolve hospital language routing
    const supportedLangs = hospital.configuration?.supportedLanguages || ['en'];
    const reqLang = String(body.preferredLanguage || '').toLowerCase();
    const routedLanguage = supportedLangs.includes(reqLang)
      ? reqLang
      : hospital.configuration?.defaultLanguage || 'en';

    const externalPatientId = body.externalPatientId || `UHID-${bookingId}`;

    // Upsert Patient & Consent
    const patient = await this.prisma.patient.upsert({
      where: {
        hospitalId_externalPatientId: {
          hospitalId: hospital.id,
          externalPatientId,
        },
      },
      update: {
        fullName: body.patientName,
        mobileNumber: body.mobileNumber,
        preferredLanguage: routedLanguage,
      },
      create: {
        externalPatientId,
        hospitalId: hospital.id,
        fullName: body.patientName,
        mobileNumber: body.mobileNumber,
        preferredLanguage: routedLanguage,
        isSyntheticDemo: Boolean(body.isSyntheticDemo ?? true),
        createdBy: actorEmail,
      },
    });

    const existingConsent = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_hospitalId: {
          patientId: patient.id,
          hospitalId: hospital.id,
        },
      },
    });

    const consentStatus = existingConsent?.optOutStatus
      ? 'REVOKED'
      : body.consentStatus || 'GRANTED';

    if (!existingConsent) {
      await this.prisma.patientConsent.create({
        data: {
          patientId: patient.id,
          hospitalId: hospital.id,
          consentStatus,
          consentSource: body.bookingSource || 'HIS_BOOKING_FEED',
          optOutStatus: consentStatus === 'REVOKED',
          communicationEligible: consentStatus === 'GRANTED',
        },
      });
    }

    const createdAppt = await this.prisma.appointment.create({
      data: {
        bookingId,
        patientId: patient.id,
        hospitalId: hospital.id,
        patientName: body.patientName,
        mobileNumber: body.mobileNumber,
        preferredLanguage: routedLanguage,
        department: body.department,
        doctorName: body.doctorName,
        doctorCode: body.doctorCode || null,
        opdLocation: body.opdLocation || 'Main OPD Wing',
        appointmentDate: new Date(`${dateStr}T00:00:00.000Z`),
        appointmentTime: body.appointmentTime,
        scheduledAtUtc,
        bookingSource: body.bookingSource || 'HIS_API',
        consentStatus,
        status: 'VALIDATED',
        attendanceStatus: 'PENDING',
        integrationSource: body.integrationSource || 'HIS_REST',
        isFirstVisit: Boolean(body.isFirstVisit),
        isSyntheticDemo: Boolean(body.isSyntheticDemo ?? true),
        createdBy: actorEmail,
      },
    });

    await this.prisma.appointmentEvent.create({
      data: {
        appointmentId: createdAppt.id,
        hospitalId: hospital.id,
        eventType: 'VALIDATED',
        previousStatus: 'RECEIVED',
        newStatus: 'VALIDATED',
        description: `Appointment ${bookingId} validated. Routed language: ${routedLanguage.toUpperCase()}.`,
        triggeredBy: actorEmail,
      },
    });

    // Assign Pilot / Control Group if applicable (e.g. New Town pilot)
    await this.pilotService.assignCohortIfApplicable(
      createdAppt.id,
      body.forceCohortGroup
    );

    // Schedule Confirmation + 24h Reminder + 2-3h Reminder
    await this.schedulerService.scheduleAppointmentJourney(
      createdAppt.id,
      body.triggerImmediateConfirmation !== false
    );

    const finalAppt = await this.prisma.appointment.findUnique({
      where: { id: createdAppt.id },
      include: {
        hospital: true,
        patient: true,
        holdoutAssignment: true,
        scheduledMessages: true,
        messageLogs: true,
      },
    });

    await this.auditService.log({
      actorEmail,
      hospitalId: hospital.id,
      action: 'APPOINTMENT_IMPORTED',
      entityType: 'Appointment',
      entityId: createdAppt.id,
      summary: `Ingested appointment ${bookingId} (${body.patientName}) at ${hospital.name}.`,
    });

    return { duplicateSkipped: false, updated: false, appointment: finalAppt };
  }

  async confirmOfficialCancellation(
    id: string,
    reason = 'Confirmed cancellation received from HIS / Hospital Desk',
    actorEmail = 'HIS_SYNC_ENGINE'
  ) {
    const appt = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appt) throw new BadRequestException('Appointment not found.');

    await this.schedulerService.cancelObsoleteMessagesForAppointment(
      appt.id,
      'APPOINTMENT_CANCELLED_CONFIRMED'
    );

    const updated = await this.prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: 'CANCELLED',
        attendanceStatus: 'CANCELLED',
        lastSyncedAt: new Date(),
      },
      include: { scheduledMessages: true, hospital: true },
    });

    await this.prisma.appointmentEvent.create({
      data: {
        appointmentId: appt.id,
        hospitalId: appt.hospitalId,
        eventType: 'CANCELLED_BY_HIS',
        previousStatus: appt.status,
        newStatus: 'CANCELLED',
        description: `${reason}. All pending scheduled reminders cancelled.`,
        triggeredBy: actorEmail,
      },
    });

    await this.auditService.log({
      actorEmail,
      hospitalId: appt.hospitalId,
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: appt.id,
      summary: `Booking ${appt.bookingId} marked officially CANCELLED; pending reminders suppressed.`,
    });

    return updated;
  }

  async bulkImport(records: any[], hospitalId: string, source = 'CSV_UPLOAD', actorEmail = 'ADMIN') {
    let inserted = 0;
    let updated = 0;
    let duplicateSkipped = 0;
    let failed = 0;
    const failedDetails: any[] = [];

    for (const rec of records) {
      try {
        const res = await this.ingestAppointment(
          { ...rec, hospitalId: rec.hospitalId || hospitalId },
          actorEmail
        );
        if (res.duplicateSkipped) duplicateSkipped++;
        else if (res.updated) updated++;
        else inserted++;
      } catch (err: any) {
        failed++;
        failedDetails.push({
          bookingId: rec.bookingId || 'UNKNOWN',
          error: err.message,
        });
      }
    }

    const syncJob = await this.prisma.syncJob.create({
      data: {
        hospitalId,
        jobType: 'HIS_CSV_IMPORT',
        source,
        status: failed === 0 ? 'COMPLETED' : inserted + updated > 0 ? 'PARTIAL_FAILURE' : 'FAILED',
        totalRecords: records.length,
        insertedRecords: inserted,
        updatedRecords: updated,
        duplicateSkipped,
        failedRecords: failed,
        failedDetails,
        completedAt: new Date(),
        triggeredBy: actorEmail,
      },
    });

    return syncJob;
  }
}
