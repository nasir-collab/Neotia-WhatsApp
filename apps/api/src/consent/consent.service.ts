import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ConsentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async checkCommunicationEligibility(params: {
    patientId: string;
    hospitalId: string;
    appointmentId?: string;
    isAutomatedCampaign?: boolean;
  }): Promise<{ eligible: boolean; reason?: string }> {
    const consent = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_hospitalId: {
          patientId: params.patientId,
          hospitalId: params.hospitalId,
        },
      },
    });

    if (!consent) {
      return { eligible: false, reason: 'NO_CONSENT_RECORD' };
    }

    if (consent.optOutStatus || !consent.communicationEligible || consent.consentStatus === 'REVOKED') {
      return { eligible: false, reason: 'PATIENT_OPTED_OUT_STOP' };
    }

    if (params.appointmentId) {
      const appt = await this.prisma.appointment.findUnique({
        where: { id: params.appointmentId },
        include: { holdoutAssignment: true },
      });

      if (!appt) {
        return { eligible: false, reason: 'APPOINTMENT_NOT_FOUND' };
      }

      if (appt.status === 'CANCELLED' || appt.status === 'COMPLETED') {
        return { eligible: false, reason: `APPOINTMENT_${appt.status}` };
      }

      if (
        params.isAutomatedCampaign !== false &&
        appt.holdoutAssignment &&
        appt.holdoutAssignment.cohortGroup === 'CONTROL' &&
        appt.holdoutAssignment.campaignsSuppressed
      ) {
        return { eligible: false, reason: 'PILOT_CONTROL_GROUP_HOLDOUT' };
      }
    }

    return { eligible: true };
  }

  async processStopOptOut(params: {
    patientId: string;
    hospitalId: string;
    reason?: string;
    source?: string;
    actorEmail?: string;
  }) {
    const now = new Date();

    const updatedConsent = await this.prisma.$transaction(async (tx) => {
      const consent = await tx.patientConsent.upsert({
        where: {
          patientId_hospitalId: {
            patientId: params.patientId,
            hospitalId: params.hospitalId,
          },
        },
        update: {
          consentStatus: 'REVOKED',
          consentSource: params.source || 'WHATSAPP_STOP',
          optOutStatus: true,
          optOutTimestamp: now,
          optOutReason: params.reason || 'Patient replied STOP / Opt-out',
          communicationEligible: false,
          updatedBy: params.actorEmail || 'PATIENT_WHATSAPP_STOP',
        },
        create: {
          patientId: params.patientId,
          hospitalId: params.hospitalId,
          consentStatus: 'REVOKED',
          consentSource: params.source || 'WHATSAPP_STOP',
          optOutStatus: true,
          optOutTimestamp: now,
          optOutReason: params.reason || 'Patient replied STOP / Opt-out',
          communicationEligible: false,
          updatedBy: params.actorEmail || 'PATIENT_WHATSAPP_STOP',
        },
      });

      // Suppress all pending scheduled messages for this patient's appointments at this hospital
      const patientAppointments = await tx.appointment.findMany({
        where: { patientId: params.patientId, hospitalId: params.hospitalId },
        select: { id: true },
      });
      const apptIds = patientAppointments.map((a) => a.id);

      if (apptIds.length > 0) {
        await tx.appointment.updateMany({
          where: { id: { in: apptIds } },
          data: { consentStatus: 'REVOKED' },
        });

        await tx.scheduledMessage.updateMany({
          where: {
            appointmentId: { in: apptIds },
            status: { in: ['QUEUED', 'SCHEDULED'] },
          },
          data: {
            status: 'SUPPRESSED',
            suppressionReason: 'PATIENT_OPTED_OUT_STOP',
          },
        });
      }

      return consent;
    });

    await this.auditService.log({
      actorEmail: params.actorEmail || 'WHATSAPP_INBOUND_STOP',
      hospitalId: params.hospitalId,
      action: 'STOP_OPTOUT_PROCESSED',
      entityType: 'PatientConsent',
      entityId: updatedConsent.id,
      summary: `Patient ${params.patientId} opted out via ${params.source || 'WHATSAPP_STOP'}. All pending outbound reminders suppressed.`,
    });

    return updatedConsent;
  }

  async updateConsentStatus(params: {
    id: string;
    consentStatus: 'GRANTED' | 'REVOKED';
    consentSource: string;
    reason?: string;
    actor: any;
  }) {
    const existing = await this.prisma.patientConsent.findUnique({ where: { id: params.id } });
    if (params.consentStatus === 'REVOKED') {
      return this.processStopOptOut({
        patientId: existing.patientId,
        hospitalId: existing.hospitalId,
        reason: params.reason || 'Manual revocation by administrator',
        source: params.consentSource || 'ADMIN_OVERRIDE',
        actorEmail: params.actor?.email,
      });
    }

    const updated = await this.prisma.patientConsent.update({
      where: { id: params.id },
      data: {
        consentStatus: 'GRANTED',
        consentSource: params.consentSource || 'REGISTRATION_DESK',
        consentTimestamp: new Date(),
        optOutStatus: false,
        optOutTimestamp: null,
        optOutReason: null,
        communicationEligible: true,
        updatedBy: params.actor?.email,
      },
    });

    await this.prisma.appointment.updateMany({
      where: { patientId: existing.patientId, hospitalId: existing.hospitalId },
      data: { consentStatus: 'GRANTED' },
    });

    await this.auditService.log({
      userId: params.actor?.id,
      actorEmail: params.actor?.email,
      actorRole: params.actor?.roleCode,
      hospitalId: existing.hospitalId,
      action: 'CONSENT_GRANTED',
      entityType: 'PatientConsent',
      entityId: updated.id,
      summary: `Restored communication consent for patient ${existing.patientId} via ${params.consentSource}.`,
    });

    return updated;
  }
}
