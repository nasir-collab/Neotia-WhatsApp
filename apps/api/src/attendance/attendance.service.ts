import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { FollowupsService } from '../followups/followups.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService,
    @Inject(FollowupsService) private readonly followupsService: FollowupsService,
    @Inject(SchedulerService) private readonly schedulerService: SchedulerService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async reconcileAttendanceOutcome(params: {
    externalVisitId?: string;
    bookingId: string;
    hospitalId: string;
    patientIdentifier?: string;
    outcomeStatus: 'ARRIVED' | 'REGISTERED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
    checkInTime?: string;
    completedTime?: string;
    sourceFeed?: string;
    actorEmail?: string;
  }) {
    if (!params.bookingId || !params.hospitalId || !params.outcomeStatus) {
      throw new BadRequestException('bookingId, hospitalId, and outcomeStatus are required.');
    }

    const externalVisitId =
      params.externalVisitId || `HIS-VIS-${params.bookingId}-${Date.now().toString().slice(-4)}`;

    const appointment = await this.prisma.appointment.findUnique({
      where: {
        hospitalId_bookingId: {
          hospitalId: params.hospitalId,
          bookingId: params.bookingId,
        },
      },
      include: { holdoutAssignment: true },
    });

    // Strict Rule: Do not automatically classify unmatched records as arrived or no-show
    if (!appointment) {
      const unmatched = await this.prisma.attendanceRecord.upsert({
        where: { externalVisitId },
        update: {
          outcomeStatus: 'UNMATCHED',
          matchStatus: 'UNMATCHED',
          reconciledBy: params.actorEmail || 'HIS_RECONCILER',
          reconciledAt: new Date(),
        },
        create: {
          externalVisitId,
          bookingId: params.bookingId,
          appointmentId: null,
          hospitalId: params.hospitalId,
          patientIdentifier: params.patientIdentifier || null,
          outcomeStatus: 'UNMATCHED',
          matchStatus: 'UNMATCHED',
          rebookingPromptEligible: false,
          rebookingPromptSent: false,
          sourceFeed: params.sourceFeed || 'HIS_OUTCOME_API',
          reconciledBy: params.actorEmail || 'HIS_RECONCILER',
        },
      });

      await this.auditService.log({
        actorEmail: params.actorEmail || 'HIS_RECONCILER',
        hospitalId: params.hospitalId,
        action: 'ATTENDANCE_UNMATCHED_LOGGED',
        entityType: 'AttendanceRecord',
        entityId: unmatched.id,
        summary: `Unmatched HIS outcome record for bookingId '${params.bookingId}' logged as UNMATCHED (not classified as arrived or no-show).`,
      });

      return { matched: false, record: unmatched };
    }

    // If appointment is already COMPLETED or CANCELLED and feed says NO_SHOW, protect completed/cancelled state
    if (
      params.outcomeStatus === 'NO_SHOW' &&
      ['COMPLETED', 'CANCELLED'].includes(appointment.status)
    ) {
      throw new BadRequestException(
        `Cannot mark appointment ${appointment.bookingId} as NO_SHOW because it is already ${appointment.status}.`
      );
    }

    // Cancel any remaining pending reminders once attendance/visit outcome arrives
    await this.schedulerService.cancelObsoleteMessagesForAppointment(
      appointment.id,
      `HIS_ATTENDANCE_${params.outcomeStatus}`
    );

    let nextApptStatus = appointment.status;
    if (['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(params.outcomeStatus)) {
      nextApptStatus = 'COMPLETED';
    } else if (params.outcomeStatus === 'NO_SHOW') {
      nextApptStatus = 'NO_SHOW';
    } else if (params.outcomeStatus === 'CANCELLED') {
      nextApptStatus = 'CANCELLED';
    }

    await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: nextApptStatus,
        attendanceStatus: params.outcomeStatus,
        lastSyncedAt: new Date(),
      },
    });

    await this.prisma.appointmentEvent.create({
      data: {
        appointmentId: appointment.id,
        hospitalId: appointment.hospitalId,
        eventType: 'ATTENDANCE_RECONCILED',
        previousStatus: appointment.status,
        newStatus: nextApptStatus,
        description: `HIS registration/attendance outcome reconciled: ${params.outcomeStatus}.`,
        triggeredBy: params.actorEmail || 'HIS_RECONCILER',
      },
    });

    let rebookingEligible = false;
    let rebookingSent = false;

    // No-Show & Rebooking Engine (Section 14)
    if (params.outcomeStatus === 'NO_SHOW') {
      const eligibility = await this.consentService.checkCommunicationEligibility({
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        appointmentId: appointment.id,
        isAutomatedCampaign: true,
      });

      rebookingEligible = eligibility.eligible;

      if (rebookingEligible) {
        const sendRes = await this.whatsappService.sendAppointmentTemplateMessage({
          appointmentId: appointment.id,
          category: 'NOSHOW_REBOOKING',
          isAutomatedCampaign: true,
          simulateDeliveryReceiptInDemo: true,
          actorEmail: params.actorEmail || 'NOSHOW_ENGINE',
        });
        rebookingSent = !sendRes.suppressed && !(sendRes as any).failed;
      }

      // Create follow-up task for human assistance on no-show rebooking
      await this.followupsService.createFollowUpTask({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        taskType: 'NOSHOW_REBOOKING_ASSIST',
        priority: 'MEDIUM',
        triggerReason: `Verified HIS No-Show outcome recorded for booking ${appointment.bookingId}. Rebooking prompt ${rebookingSent ? 'sent via WhatsApp' : 'suppressed'}.`,
        isSyntheticDemo: appointment.isSyntheticDemo,
      });
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: { externalVisitId },
      update: {
        outcomeStatus: params.outcomeStatus,
        matchStatus: 'MATCHED',
        rebookingPromptEligible: rebookingEligible,
        rebookingPromptSent: rebookingSent,
        reconciledBy: params.actorEmail || 'HIS_RECONCILER',
        reconciledAt: new Date(),
      },
      create: {
        externalVisitId,
        bookingId: params.bookingId,
        appointmentId: appointment.id,
        hospitalId: appointment.hospitalId,
        patientIdentifier: params.patientIdentifier || null,
        outcomeStatus: params.outcomeStatus,
        matchStatus: 'MATCHED',
        checkInTime: params.checkInTime ? new Date(params.checkInTime) : new Date(),
        completedTime: params.completedTime ? new Date(params.completedTime) : null,
        rebookingPromptEligible: rebookingEligible,
        rebookingPromptSent: rebookingSent,
        sourceFeed: params.sourceFeed || 'HIS_OUTCOME_API',
        reconciledBy: params.actorEmail || 'HIS_RECONCILER',
      },
      include: { appointment: true, hospital: true },
    });

    await this.auditService.log({
      actorEmail: params.actorEmail || 'HIS_RECONCILER',
      hospitalId: appointment.hospitalId,
      action: 'ATTENDANCE_RECONCILED',
      entityType: 'AttendanceRecord',
      entityId: record.id,
      summary: `Reconciled HIS outcome ${params.outcomeStatus} for booking ${appointment.bookingId} (Rebooking prompt sent: ${rebookingSent}).`,
    });

    return { matched: true, rebookingSent, record };
  }
}
