import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { FollowupsService } from '../followups/followups.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ResponsesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(FollowupsService) private readonly followupsService: FollowupsService,
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  parseActionFromInput(rawText: string, buttonPayload?: string): string {
    const btn = (buttonPayload || '').trim().toUpperCase();
    if (btn === 'BTN_CONFIRM' || btn === 'CONFIRM') return 'CONFIRM';
    if (btn === 'BTN_RESCHEDULE' || btn === 'RESCHEDULE') return 'RESCHEDULE';
    if (btn === 'BTN_CANCEL' || btn === 'CANCEL') return 'CANCEL';
    if (btn === 'BTN_TALK' || btn === 'TALK_TO_US') return 'TALK_TO_US';

    const text = (rawText || '').trim().toUpperCase();
    if (['STOP', 'UNSUBSCRIBE', 'OPTOUT', 'OPT OUT', 'বন্ধ'].includes(text)) {
      return 'STOP';
    }
    if (
      text.includes('CONFIRM') ||
      text === 'YES' ||
      text === '1' ||
      rawText.includes('হ্যাঁ') ||
      rawText.includes('हाँ') ||
      rawText.includes('पुष्टि')
    ) {
      return 'CONFIRM';
    }
    if (
      text.includes('RESCHEDULE') ||
      text.includes('CHANGE') ||
      rawText.includes('পুনরায়') ||
      rawText.includes('रीशेड्यूल')
    ) {
      return 'RESCHEDULE';
    }
    if (
      text.includes('CANCEL') ||
      rawText.includes('বাতিল') ||
      rawText.includes('रद्द')
    ) {
      return 'CANCEL';
    }
    if (
      text.includes('TALK') ||
      text.includes('HELP') ||
      text.includes('AGENT') ||
      rawText.includes('সহায়তা') ||
      rawText.includes('मदद') ||
      rawText.includes('सहायता')
    ) {
      return 'TALK_TO_US';
    }
    return 'TALK_TO_US'; // Unrecognized queries route safely to human assistance per Operating Principle
  }

  async processInboundResponse(params: {
    appointmentId?: string;
    senderMobile?: string;
    rawResponseText: string;
    buttonPayload?: string;
    responseChannel?: string;
  }) {
    let appointment: any = null;

    if (params.appointmentId) {
      appointment = await this.prisma.appointment.findUnique({
        where: { id: params.appointmentId },
        include: { patient: true, hospital: true },
      });
    } else if (params.senderMobile) {
      const normalized = params.senderMobile.replace(/[^0-9+]/g, '');
      appointment = await this.prisma.appointment.findFirst({
        where: {
          mobileNumber: { contains: normalized.slice(-10) },
        },
        include: { patient: true, hospital: true },
        orderBy: { appointmentDate: 'desc' },
      });
    }

    if (!appointment) {
      throw new BadRequestException('Could not match inbound response to an active appointment record.');
    }

    const mappedAction = this.parseActionFromInput(params.rawResponseText, params.buttonPayload);

    // Record inbound message in MessageLog
    const inboundMsg = await this.prisma.messageLog.create({
      data: {
        appointmentId: appointment.id,
        hospitalId: appointment.hospitalId,
        direction: 'INBOUND',
        recipientMobile: appointment.mobileNumber,
        language: appointment.preferredLanguage,
        messageCategory: `INBOUND_${mappedAction}`,
        renderedContent: params.rawResponseText,
        status: 'DELIVERED',
        providerMode: appointment.isSyntheticDemo ? 'DEMO' : 'PRODUCTION',
        deliveredAt: new Date(),
        isSyntheticDemo: appointment.isSyntheticDemo,
      },
    });

    let followUpTriggered = false;
    let acknowledgementSent = false;
    let newApptStatus = appointment.status;

    if (mappedAction === 'STOP') {
      await this.consentService.processStopOptOut({
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        reason: `Patient replied "${params.rawResponseText}"`,
        source: 'WHATSAPP_STOP',
      });
    } else if (mappedAction === 'CONFIRM') {
      if (!['CANCELLED', 'COMPLETED'].includes(appointment.status)) {
        newApptStatus = 'CONFIRMED';
        await this.prisma.appointment.update({
          where: { id: appointment.id },
          data: { status: 'CONFIRMED' },
        });
        await this.prisma.appointmentEvent.create({
          data: {
            appointmentId: appointment.id,
            hospitalId: appointment.hospitalId,
            eventType: 'PATIENT_CONFIRMED',
            previousStatus: appointment.status,
            newStatus: 'CONFIRMED',
            description: `Patient confirmed appointment via WhatsApp ("${params.rawResponseText}").`,
            triggeredBy: 'PATIENT_WHATSAPP',
          },
        });
        // Send Directions / First-Visit Assistance upon confirmation
        await this.whatsappService.sendAppointmentTemplateMessage({
          appointmentId: appointment.id,
          category: appointment.isFirstVisit ? 'FIRST_VISIT_ASSISTANCE' : 'DIRECTIONS',
          isAutomatedCampaign: false,
          simulateDeliveryReceiptInDemo: true,
        });
        acknowledgementSent = true;
      }
    } else if (mappedAction === 'RESCHEDULE') {
      // Do NOT auto-allocate a slot; record request, send ack, and create call-centre follow-up task
      newApptStatus = 'RESCHEDULE_REQUESTED';
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'RESCHEDULE_REQUESTED' },
      });
      await this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          hospitalId: appointment.hospitalId,
          eventType: 'RESCHEDULE_REQUESTED',
          previousStatus: appointment.status,
          newStatus: 'RESCHEDULE_REQUESTED',
          description: `Patient requested reschedule via WhatsApp. Routed to Altruist call-centre queue.`,
          triggeredBy: 'PATIENT_WHATSAPP',
        },
      });
      await this.whatsappService.sendAppointmentTemplateMessage({
        appointmentId: appointment.id,
        category: 'RESCHEDULE_ACK',
        isAutomatedCampaign: false,
        simulateDeliveryReceiptInDemo: true,
      });
      acknowledgementSent = true;
      await this.followupsService.createFollowUpTask({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        taskType: 'RESCHEDULE_REQUEST',
        priority: 'HIGH',
        triggerReason: `Patient requested appointment reschedule via WhatsApp ("${params.rawResponseText}") for booking ${appointment.bookingId}`,
        isSyntheticDemo: appointment.isSyntheticDemo,
      });
      followUpTriggered = true;
    } else if (mappedAction === 'CANCEL') {
      // Strict requirement: Record CANCELLATION_REQUESTED, do NOT mark officially CANCELLED until hospital/HIS confirmation!
      newApptStatus = 'CANCELLATION_REQUESTED';
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'CANCELLATION_REQUESTED' },
      });
      await this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          hospitalId: appointment.hospitalId,
          eventType: 'CANCELLATION_REQUESTED',
          previousStatus: appointment.status,
          newStatus: 'CANCELLATION_REQUESTED',
          description: `Patient requested cancellation via WhatsApp. Awaiting HIS/Hospital cancellation confirmation.`,
          triggeredBy: 'PATIENT_WHATSAPP',
        },
      });
      await this.whatsappService.sendAppointmentTemplateMessage({
        appointmentId: appointment.id,
        category: 'CANCELLATION_ACK',
        isAutomatedCampaign: false,
        simulateDeliveryReceiptInDemo: true,
      });
      acknowledgementSent = true;
      await this.followupsService.createFollowUpTask({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        taskType: 'CANCELLATION_REVIEW',
        priority: 'HIGH',
        triggerReason: `Patient requested cancellation via WhatsApp ("${params.rawResponseText}"). Requires HIS cancellation confirmation.`,
        isSyntheticDemo: appointment.isSyntheticDemo,
      });
      followUpTriggered = true;
    } else if (mappedAction === 'TALK_TO_US') {
      await this.whatsappService.sendAppointmentTemplateMessage({
        appointmentId: appointment.id,
        category: 'TALK_TO_US_ACK',
        isAutomatedCampaign: false,
        simulateDeliveryReceiptInDemo: true,
      });
      acknowledgementSent = true;
      await this.followupsService.createFollowUpTask({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        taskType: 'TALK_TO_US_ASSISTANCE',
        priority: 'HIGH',
        triggerReason: `Patient requested human assistance ("${params.rawResponseText}") on booking ${appointment.bookingId}`,
        isSyntheticDemo: appointment.isSyntheticDemo,
      });
      followUpTriggered = true;
    }

    const responseRecord = await this.prisma.patientResponse.create({
      data: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        hospitalId: appointment.hospitalId,
        messageLogId: inboundMsg.id,
        rawResponseText: params.rawResponseText,
        buttonPayload: params.buttonPayload || null,
        mappedAction,
        responseChannel: params.responseChannel || 'WHATSAPP_INTERACTIVE',
        acknowledgementSent,
        followUpTriggered,
      },
      include: {
        appointment: true,
        patient: true,
        hospital: true,
      },
    });

    await this.auditService.log({
      actorEmail: 'PATIENT_INBOUND_WHATSAPP',
      hospitalId: appointment.hospitalId,
      action: `PATIENT_RESPONSE_${mappedAction}`,
      entityType: 'PatientResponse',
      entityId: responseRecord.id,
      summary: `Captured patient response '${mappedAction}' for booking ${appointment.bookingId} -> Appointment status: ${newApptStatus}.`,
    });

    return responseRecord;
  }
}
