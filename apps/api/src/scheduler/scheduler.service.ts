import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import net from 'node:net';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { TemplatesService } from '../templates/templates.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AuditService } from '../audit/audit.service';

function checkRedisPort(port = 6379, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(500);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private bullQueue: Queue | null = null;
  private bullWorker: Worker | null = null;
  public queueBackendMode: 'REDIS_BULLMQ' | 'POSTGRES_PERSISTENT_WORKER' = 'POSTGRES_PERSISTENT_WORKER';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConsentService) private readonly consentService: ConsentService,
    @Inject(TemplatesService) private readonly templatesService: TemplatesService,
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) { }

  async onModuleInit() {
    const redisAvailable = await checkRedisPort(6379);
    if (redisAvailable) {
      try {
        const connection = { host: '127.0.0.1', port: 6379 };
        this.bullQueue = new Queue('anhvl-patient-reminders', { connection });
        this.bullWorker = new Worker(
          'anhvl-patient-reminders',
          async (job) => {
            await this.executeScheduledJobById(job.data.scheduledMessageId);
          },
          { connection }
        );
        this.queueBackendMode = 'REDIS_BULLMQ';
        console.log('[Scheduler] Connected to Redis BullMQ queue (anhvl-patient-reminders).');
      } catch {
        this.queueBackendMode = 'POSTGRES_PERSISTENT_WORKER';
      }
    } else {
      this.queueBackendMode = 'POSTGRES_PERSISTENT_WORKER';
      console.log('[Scheduler] Running persistent PostgreSQL transactional reminder scheduler.');
    }
  }

  async onModuleDestroy() {
    if (this.bullWorker) await this.bullWorker.close();
    if (this.bullQueue) await this.bullQueue.close();
  }

  /**
   * Applies Hospital Quiet Hours (8:00 AM to 9:00 PM IST/Hospital Local Time)
   * with configurable Morning Appointment Exception.
   */
  calculateQuietHourAdjustedUtc(params: {
    targetUtc: Date;
    appointmentTimeLocal: string; // HH:mm
    allowMorningException: boolean;
    morningCutoffTime: string; // e.g. 10:30
    jobType: string;
  }): { adjustedUtc: Date; wasShifted: boolean } {
    // Convert UTC to IST (Asia/Kolkata = UTC + 5:30 = +330 minutes)
    const istOffsetMs = 330 * 60 * 1000;
    const localDate = new Date(params.targetUtc.getTime() + istOffsetMs);
    const localHours = localDate.getUTCHours();
    const localMinutes = localDate.getUTCMinutes();
    const timeDecimal = localHours + localMinutes / 60;

    // Quiet hours: 21:00 (21.0) to 08:00 (8.0)
    const isQuietHours = timeDecimal >= 21.0 || timeDecimal < 8.0;
    if (!isQuietHours) {
      return { adjustedUtc: params.targetUtc, wasShifted: false };
    }

    // Check morning appointment exception (e.g., appointment at 09:00 AM -> 3h reminder at 06:00 AM -> shift to 07:00 AM exception window)
    const [apptHour, apptMin] = params.appointmentTimeLocal.split(':').map(Number);
    const [cutHour, cutMin] = (params.morningCutoffTime || '10:30').split(':').map(Number);
    const isMorningAppointment = apptHour * 60 + apptMin <= cutHour * 60 + cutMin;

    const shiftedLocal = new Date(localDate.getTime());
    if (params.jobType === 'REMINDER_3H' && isMorningAppointment && params.allowMorningException) {
      // Approved morning-appointment exception: send at 07:00 AM local time instead of 05:30/06:00 AM
      shiftedLocal.setUTCHours(7, 0, 0, 0);
    } else if (timeDecimal < 8.0) {
      // Shift early-morning routine message to 08:00 AM local time
      shiftedLocal.setUTCHours(8, 0, 0, 0);
    } else {
      // Target was >= 21:00 local time; shift to 08:00 AM next morning
      shiftedLocal.setUTCDate(shiftedLocal.getUTCDate() + 1);
      shiftedLocal.setUTCHours(8, 0, 0, 0);
    }

    const adjustedUtc = new Date(shiftedLocal.getTime() - istOffsetMs);
    return { adjustedUtc, wasShifted: true };
  }

  async scheduleAppointmentJourney(appointmentId: string, triggerImmediateConfirmation = true) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        hospital: { include: { configuration: true } },
        holdoutAssignment: true,
      },
    });
    if (!appt) return [];

    const config = appt.hospital.configuration;
    const mode = await this.whatsappService.getOperatingMode();

    // Check eligibility (consent & control group holdout)
    const eligibility = await this.consentService.checkCommunicationEligibility({
      patientId: appt.patientId,
      hospitalId: appt.hospitalId,
      appointmentId: appt.id,
      isAutomatedCampaign: true,
    });

    const now = new Date();
    const hoursUntilAppt = (appt.scheduledAtUtc.getTime() - now.getTime()) / (3600 * 1000);

    const jobsToSchedule: Array<{
      jobType: string;
      category: string;
      targetUtc: Date;
      immediate?: boolean;
    }> = [
        {
          jobType: 'CONFIRMATION',
          category: 'APPOINTMENT_CONFIRMATION',
          targetUtc: now,
          immediate: triggerImmediateConfirmation,
        },
      ];

    // Advance 24h Reminder: Only schedule if appointment is more than 6 hours away (avoid redundant burst on same-day booking)
    const advanceHours = config?.advanceReminderHours || 24;
    if (hoursUntilAppt > 6) {
      const target24h = new Date(appt.scheduledAtUtc.getTime() - advanceHours * 3600 * 1000);
      jobsToSchedule.push({
        jobType: 'REMINDER_24H',
        category: 'ADVANCE_REMINDER',
        targetUtc: target24h > now ? target24h : new Date(now.getTime() + 1800 * 1000),
      });
    }

    // Pre-Visit 2-3h Same-Day Reminder
    const preVisitHours = config?.preVisitReminderHours || 3;
    if (hoursUntilAppt > 1) {
      const target3h = new Date(appt.scheduledAtUtc.getTime() - preVisitHours * 3600 * 1000);
      jobsToSchedule.push({
        jobType: 'REMINDER_3H',
        category: 'SAMEDAY_REMINDER',
        targetUtc: target3h > now ? target3h : new Date(now.getTime() + 900 * 1000),
      });
    }

    const createdJobs = [];

    for (const item of jobsToSchedule) {
      const { template } = await this.templatesService.resolveTemplateForAppointment({
        hospitalId: appt.hospitalId,
        category: item.category,
        preferredLanguage: appt.preferredLanguage,
        operatingMode: mode,
      });

      const { adjustedUtc, wasShifted } =
        item.jobType === 'CONFIRMATION'
          ? { adjustedUtc: item.targetUtc, wasShifted: false }
          : this.calculateQuietHourAdjustedUtc({
            targetUtc: item.targetUtc,
            appointmentTimeLocal: appt.appointmentTime,
            allowMorningException: config?.allowMorningException ?? true,
            morningCutoffTime: config?.morningCutoffTime || '10:30',
            jobType: item.jobType,
          });

      const idempotencyKey = `${appt.id}:${item.jobType}`;

      const scheduledRecord = await this.prisma.scheduledMessage.upsert({
        where: { idempotencyKey },
        update: {
          templateId: template.id,
          scheduledForUtc: adjustedUtc,
          originalTargetUtc: item.targetUtc,
          wasQuietHourShifted: wasShifted,
          status: eligibility.eligible ? 'SCHEDULED' : 'SUPPRESSED',
          suppressionReason: eligibility.eligible ? null : eligibility.reason,
        },
        create: {
          idempotencyKey,
          appointmentId: appt.id,
          hospitalId: appt.hospitalId,
          templateId: template.id,
          jobType: item.jobType,
          scheduledForUtc: adjustedUtc,
          originalTargetUtc: item.targetUtc,
          wasQuietHourShifted: wasShifted,
          status: eligibility.eligible ? 'SCHEDULED' : 'SUPPRESSED',
          suppressionReason: eligibility.eligible ? null : eligibility.reason,
          isSyntheticDemo: appt.isSyntheticDemo,
        },
      });

      if (this.bullQueue && eligibility.eligible && !item.immediate) {
        const delayMs = Math.max(0, adjustedUtc.getTime() - Date.now());
        await this.bullQueue.add(
          item.jobType,
          { scheduledMessageId: scheduledRecord.id },
          { jobId: idempotencyKey, delay: delayMs, removeOnComplete: true }
        );
      }

      if (item.immediate && eligibility.eligible) {
        await this.executeScheduledJobById(scheduledRecord.id);
      }

      createdJobs.push(scheduledRecord);
    }

    return createdJobs;
  }

  async cancelObsoleteMessagesForAppointment(appointmentId: string, reason: string) {
    return this.prisma.scheduledMessage.updateMany({
      where: {
        appointmentId,
        status: { in: ['QUEUED', 'SCHEDULED'] },
      },
      data: {
        status: 'CANCELLED',
        suppressionReason: reason,
      },
    });
  }

  async executeScheduledJobById(scheduledMessageId: string) {
    const job = await this.prisma.scheduledMessage.findUnique({
      where: { id: scheduledMessageId },
      include: { appointment: true, template: true },
    });

    if (!job || ['COMPLETED', 'CANCELLED', 'SUPPRESSED'].includes(job.status)) {
      return { skipped: true, reason: 'ALREADY_TERMINAL_STATE', job };
    }

    // Re-verify appointment status & consent immediately before execution
    const eligibility = await this.consentService.checkCommunicationEligibility({
      patientId: job.appointment.patientId,
      hospitalId: job.hospitalId,
      appointmentId: job.appointmentId,
      isAutomatedCampaign: true,
    });

    if (!eligibility.eligible) {
      const suppressed = await this.prisma.scheduledMessage.update({
        where: { id: job.id },
        data: {
          status: 'SUPPRESSED',
          suppressionReason: eligibility.reason,
          executedAt: new Date(),
        },
      });
      return { skipped: true, reason: eligibility.reason, job: suppressed };
    }

    try {
      const dispatchResult = await this.whatsappService.sendAppointmentTemplateMessage({
        appointmentId: job.appointmentId,
        category: job.template.category,
        isAutomatedCampaign: true,
        simulateDeliveryReceiptInDemo: true,
      });

      const updatedJob = await this.prisma.scheduledMessage.update({
        where: { id: job.id },
        data: {
          status: dispatchResult.suppressed
            ? 'SUPPRESSED'
            : (dispatchResult as any).failed
              ? 'FAILED'
              : 'COMPLETED',
          suppressionReason: dispatchResult.suppressed ? dispatchResult.reason : null,
          executedAt: new Date(),
        },
      });

      if (job.jobType === 'CONFIRMATION' && job.appointment.status === 'VALIDATED') {
        await this.prisma.appointment.update({
          where: { id: job.appointmentId },
          data: { status: 'CONFIRMATION_PENDING' },
        });
      }

      return { skipped: false, job: updatedJob, dispatchResult };
    } catch (err: any) {
      const nextRetry = job.retryCount + 1;
      const isExhausted = nextRetry >= job.maxRetries;
      const failedJob = await this.prisma.scheduledMessage.update({
        where: { id: job.id },
        data: {
          retryCount: nextRetry,
          status: isExhausted ? 'FAILED' : 'SCHEDULED',
          lastError: err.message,
        },
      });
      return { skipped: false, error: err.message, job: failedJob };
    }
  }
}
