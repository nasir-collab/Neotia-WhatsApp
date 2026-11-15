import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { TemplatesService } from '../templates/templates.service';
import { FollowupsService } from '../followups/followups.service';
import { AuditService } from '../audit/audit.service';
import { NonClinicalContentCheck } from '../../../../packages/validation/src';

@Injectable()
export class WhatsappService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(TemplatesService) private readonly templatesService: TemplatesService,
    @Inject(FollowupsService) private readonly followupsService: FollowupsService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async getOperatingMode(): Promise<'DEMO' | 'PRODUCTION'> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'OPERATING_MODE' },
    });
    if (setting && (setting.value as any)?.mode === 'PRODUCTION') {
      return 'PRODUCTION';
    }
    return process.env.DEMO_MODE === 'false' ? 'PRODUCTION' : 'DEMO';
  }

  hasProductionCredentials(): { ready: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!process.env.META_ACCESS_TOKEN) missing.push('META_ACCESS_TOKEN');
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) missing.push('WHATSAPP_BUSINESS_ACCOUNT_ID');
    return { ready: missing.length === 0, missing };
  }

  async sendAppointmentTemplateMessage(params: {
    appointmentId: string;
    category: string;
    isAutomatedCampaign?: boolean;
    simulateDeliveryReceiptInDemo?: boolean;
    actorEmail?: string;
  }) {
    const mode = await this.getOperatingMode();
    const appt = await this.prisma.appointment.findUnique({
      where: { id: params.appointmentId },
      include: {
        hospital: { include: { configuration: true } },
        patient: true,
      },
    });

    if (!appt) {
      throw new BadRequestException('Appointment record not found.');
    }

    // Pre-send Consent & Eligibility Verification
    const eligibility = await this.consentService.checkCommunicationEligibility({
      patientId: appt.patientId,
      hospitalId: appt.hospitalId,
      appointmentId: appt.id,
      isAutomatedCampaign: params.isAutomatedCampaign ?? true,
    });

    if (!eligibility.eligible) {
      const suppressedLog = await this.prisma.messageLog.create({
        data: {
          appointmentId: appt.id,
          hospitalId: appt.hospitalId,
          direction: 'OUTBOUND',
          recipientMobile: appt.mobileNumber,
          language: appt.preferredLanguage,
          messageCategory: params.category,
          renderedContent: `[SUPPRESSED: ${eligibility.reason}]`,
          status: 'SUPPRESSED',
          providerMode: mode,
          failureReason: eligibility.reason,
          isSyntheticDemo: appt.isSyntheticDemo,
        },
      });
      return { suppressed: true, reason: eligibility.reason, messageLog: suppressedLog };
    }

    // Resolve Hospital & Language Template + Approval Check
    const { template, version, resolvedLanguage } =
      await this.templatesService.resolveTemplateForAppointment({
        hospitalId: appt.hospitalId,
        category: params.category,
        preferredLanguage: appt.preferredLanguage,
        operatingMode: mode,
      });

    const dateStr = appt.appointmentDate.toISOString().split('T')[0];
    const renderedContent = this.templatesService.renderTemplateBody(version.bodyText, {
      patient_name: appt.patientName,
      appointment_date: dateStr,
      appointment_time: appt.appointmentTime,
      doctor_name: appt.doctorName,
      hospital_name: appt.hospital.name,
      hospital_address: appt.hospital.configuration?.address || appt.hospital.city,
      helpline: appt.hospital.configuration?.helpline || '+91-33-0000-1001',
    });

    const clinicalCheck = NonClinicalContentCheck(renderedContent);
    if (!clinicalCheck.valid) {
      throw new BadRequestException(clinicalCheck.reason);
    }

    // PRODUCTION MODE: Never silently fall back to simulated messaging
    if (mode === 'PRODUCTION') {
      const creds = this.hasProductionCredentials();
      if (!creds.ready) {
        await this.prisma.integrationLog.create({
          data: {
            hospitalId: appt.hospitalId,
            integrationType: 'META_WHATSAPP',
            operation: 'WHATSAPP_SEND',
            direction: 'OUTBOUND',
            status: 'BLOCKED_MISSING_CREDENTIALS',
            sanitizedSummary: `Blocked Production send for booking ${appt.bookingId}: Missing ${creds.missing.join(', ')}`,
          },
        });
        throw new BadRequestException(
          `Production Mode cannot send WhatsApp message without verified Meta credentials (${creds.missing.join(', ')}). Never falls back to simulation.`
        );
      }

      // Real Meta Graph API call
      const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: appt.mobileNumber.replace(/[^0-9]/g, ''),
        type: 'template',
        template: {
          name: template.metaTemplateName,
          language: { code: resolvedLanguage },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: appt.patientName },
                { type: 'text', text: dateStr },
                { type: 'text', text: appt.appointmentTime },
                { type: 'text', text: appt.doctorName },
                { type: 'text', text: appt.hospital.name },
                { type: 'text', text: appt.hospital.configuration?.address || appt.hospital.city },
                { type: 'text', text: appt.hospital.configuration?.helpline || '' },
              ],
            },
          ],
        },
      };

      const startTime = Date.now();
      let responseStatus = 0;
      let responseBody: any = null;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        responseStatus = res.status;
        responseBody = await res.json();

        if (!res.ok) {
          throw new Error(responseBody?.error?.message || `Meta HTTP ${res.status}`);
        }

        const wamid = responseBody?.messages?.[0]?.id || null;

        // Crucial requirement: A successful API submission is SUBMITTED/SENT, NOT DELIVERED.
        const msgLog = await this.prisma.messageLog.create({
          data: {
            appointmentId: appt.id,
            hospitalId: appt.hospitalId,
            templateId: template.id,
            direction: 'OUTBOUND',
            recipientMobile: appt.mobileNumber,
            language: resolvedLanguage,
            messageCategory: params.category,
            renderedContent,
            whatsappMessageId: wamid,
            status: wamid ? 'SENT' : 'SUBMITTED',
            providerMode: 'PRODUCTION',
            submittedAt: new Date(),
            sentAt: wamid ? new Date() : null,
            isSyntheticDemo: false,
          },
        });

        await this.prisma.integrationLog.create({
          data: {
            hospitalId: appt.hospitalId,
            integrationType: 'META_WHATSAPP',
            operation: 'WHATSAPP_SEND',
            direction: 'OUTBOUND',
            status: 'SUCCESS',
            httpStatusCode: responseStatus,
            recordsProcessed: 1,
            sanitizedSummary: `Submitted template ${template.metaTemplateName} to Meta Cloud API (wamid: ${wamid}). Awaiting delivery webhook.`,
            durationMs: Date.now() - startTime,
          },
        });

        return { suppressed: false, messageLog: msgLog };
      } catch (err: any) {
        const failedLog = await this.prisma.messageLog.create({
          data: {
            appointmentId: appt.id,
            hospitalId: appt.hospitalId,
            templateId: template.id,
            direction: 'OUTBOUND',
            recipientMobile: appt.mobileNumber,
            language: resolvedLanguage,
            messageCategory: params.category,
            renderedContent,
            status: 'FAILED',
            providerMode: 'PRODUCTION',
            submittedAt: new Date(),
            failedAt: new Date(),
            failureReason: err.message,
            isSyntheticDemo: false,
          },
        });

        await this.followupsService.createFollowUpTask({
          appointmentId: appt.id,
          patientId: appt.patientId,
          hospitalId: appt.hospitalId,
          taskType: 'DELIVERY_FAILURE_FALLBACK',
          priority: 'CRITICAL',
          triggerReason: `Meta WhatsApp API send failed: ${err.message}`,
          isSyntheticDemo: false,
        });

        return { suppressed: false, failed: true, messageLog: failedLog };
      }
    }

    // DEMO MODE: Isolated synthetic execution
    const demoWamid = `wamid.DEMO.${appt.bookingId}.${Date.now()}.${Math.floor(Math.random() * 1000)}`;
    const msgLog = await this.prisma.messageLog.create({
      data: {
        appointmentId: appt.id,
        hospitalId: appt.hospitalId,
        templateId: template.id,
        direction: 'OUTBOUND',
        recipientMobile: appt.mobileNumber,
        language: resolvedLanguage,
        messageCategory: params.category,
        renderedContent,
        whatsappMessageId: demoWamid,
        // Even in Demo Mode, initial submission records SUBMITTED -> SENT; webhook or explicit receipt transitions to DELIVERED
        status: params.simulateDeliveryReceiptInDemo ? 'DELIVERED' : 'SENT',
        providerMode: 'DEMO',
        submittedAt: new Date(),
        sentAt: new Date(),
        deliveredAt: params.simulateDeliveryReceiptInDemo ? new Date() : null,
        isSyntheticDemo: true,
      },
    });

    await this.auditService.log({
      actorEmail: params.actorEmail || 'WHATSAPP_ORCHESTRATOR',
      hospitalId: appt.hospitalId,
      action: 'MESSAGE_DISPATCHED',
      entityType: 'MessageLog',
      entityId: msgLog.id,
      summary: `[DEMO MODE] Dispatched ${params.category} (${resolvedLanguage.toUpperCase()}) for booking ${appt.bookingId} -> Status: ${msgLog.status}.`,
    });

    return { suppressed: false, messageLog: msgLog };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      // In Demo mode when META_APP_SECRET is not configured, signature check is noted as unconfigured
      return true;
    }
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }
    const expected =
      'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async processDeliveryStatusWebhook(params: {
    whatsappMessageId: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    errorCode?: string;
    errorTitle?: string;
    rawPayload?: any;
    signatureValid?: boolean;
  }) {
    const idempotencyKey = `STATUS:${params.whatsappMessageId}:${params.status.toUpperCase()}`;

    const existingWebhook = await this.prisma.whatsAppWebhook.findUnique({
      where: { eventIdempotencyKey: idempotencyKey },
    });
    if (existingWebhook) {
      return { duplicateIgnored: true, webhook: existingWebhook };
    }

    const webhookRecord = await this.prisma.whatsAppWebhook.create({
      data: {
        eventIdempotencyKey: idempotencyKey,
        eventType: 'MESSAGE_STATUS',
        whatsappMessageId: params.whatsappMessageId,
        signatureValid: Boolean(params.signatureValid),
        rawPayload: params.rawPayload || {},
        processingStatus: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    const messageLog = await this.prisma.messageLog.findUnique({
      where: { whatsappMessageId: params.whatsappMessageId },
      include: { appointment: true },
    });

    if (!messageLog) {
      return { duplicateIgnored: false, matchedMessage: false, webhook: webhookRecord };
    }

    const now = new Date();
    const mappedStatus = params.status.toUpperCase();

    const updateData: any = { status: mappedStatus };
    if (mappedStatus === 'SENT') updateData.sentAt = now;
    if (mappedStatus === 'DELIVERED') updateData.deliveredAt = messageLog.deliveredAt || now;
    if (mappedStatus === 'READ') {
      updateData.deliveredAt = messageLog.deliveredAt || now;
      updateData.readAt = now;
    }
    if (mappedStatus === 'FAILED') {
      updateData.failedAt = now;
      updateData.failureCode = params.errorCode || '131026';
      updateData.failureReason = params.errorTitle || 'WhatsApp delivery failure reported by Meta webhook';
      updateData.retryCount = { increment: 1 };
    }

    const updatedMsg = await this.prisma.messageLog.update({
      where: { id: messageLog.id },
      data: updateData,
    });

    if (mappedStatus === 'FAILED' && messageLog.appointment) {
      await this.followupsService.createFollowUpTask({
        appointmentId: messageLog.appointment.id,
        patientId: messageLog.appointment.patientId,
        hospitalId: messageLog.hospitalId,
        taskType: 'DELIVERY_FAILURE_FALLBACK',
        priority: 'CRITICAL',
        triggerReason: `WhatsApp delivery receipt failed (${updateData.failureCode}: ${updateData.failureReason}) for booking ${messageLog.appointment.bookingId}`,
        isSyntheticDemo: messageLog.isSyntheticDemo,
      });
    }

    return { duplicateIgnored: false, matchedMessage: true, messageLog: updatedMsg, webhook: webhookRecord };
  }
}
