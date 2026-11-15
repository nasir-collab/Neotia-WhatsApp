import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ResponsesService } from '../responses/responses.service';
import { AttendanceService } from '../attendance/attendance.service';

export interface SimulatorScenarioDefinition {
  id: string;
  number: number;
  title: string;
  hospitalCode: 'ANHVL-NTK' | 'ANHVL-RPR';
  language: 'en' | 'bn' | 'hi';
  description: string;
  totalSteps: number;
  steps: string[];
}

export const SIMULATOR_SCENARIOS: SimulatorScenarioDefinition[] = [
  {
    id: 'SCENARIO_1_CONFIRM',
    number: 1,
    title: '1. Successful Appointment Confirmation',
    hospitalCode: 'ANHVL-NTK',
    language: 'bn',
    description: 'HIS booking ingested for New Town -> Bengali utility confirmation sent -> Delivered/Read receipt -> Patient taps Confirm -> Directions shared -> HIS attendance completed.',
    totalSteps: 4,
    steps: [
      'Ingest HIS Appointment & Validate Consent (New Town, Bengali)',
      'Dispatch Approved WhatsApp Utility Confirmation & Receive Delivery/Read Webhook',
      'Patient Taps Interactive "Confirm Appointment" Button -> Share Directions',
      'Receive HIS Registration & Attendance Outcome (COMPLETED)',
    ],
  },
  {
    id: 'SCENARIO_2_RESCHEDULE',
    number: 2,
    title: '2. Patient Reschedule Request',
    hospitalCode: 'ANHVL-NTK',
    language: 'en',
    description: 'Patient taps "Reschedule" on WhatsApp -> Status set to RESCHEDULE_REQUESTED (no auto-slot allocation) -> Reschedule Ack sent -> High-priority Altruist Call-Centre task created.',
    totalSteps: 3,
    steps: [
      'Ingest HIS Appointment & Send WhatsApp Confirmation',
      'Patient Taps "Reschedule" Interactive Button',
      'Verify RESCHEDULE_ACK Dispatched & Altruist Call-Centre Task Created',
    ],
  },
  {
    id: 'SCENARIO_3_CANCEL',
    number: 3,
    title: '3. Cancellation Request & HIS Confirmation',
    hospitalCode: 'ANHVL-RPR',
    language: 'hi',
    description: 'Patient taps "Cancel" -> Status becomes CANCELLATION_REQUESTED (not officially cancelled yet) -> Call-centre review task -> Official HIS cancellation confirms & suppresses pending reminders.',
    totalSteps: 3,
    steps: [
      'Ingest Raipur HIS Booking & Send Hindi Confirmation',
      'Patient Taps "Cancel" -> Status CANCELLATION_REQUESTED & Altruist Review Task',
      'Hospital/HIS Confirms Official Cancellation -> Pending 24h/3h Reminders Cancelled',
    ],
  },
  {
    id: 'SCENARIO_4_TALK_TO_US',
    number: 4,
    title: '4. Talk-to-Us Assistance',
    hospitalCode: 'ANHVL-RPR',
    language: 'hi',
    description: 'Patient requests navigation/first-visit help -> Platform sends Talk-to-Us acknowledgement and routes task to Raipur Altruist agent queue.',
    totalSteps: 2,
    steps: [
      'Ingest Raipur First-Visit Booking & Send Confirmation',
      'Patient Replies "Talk to Us" -> Send Ack & Route to Altruist Agent Queue',
    ],
  },
  {
    id: 'SCENARIO_5_DELIVERY_FAILURE',
    number: 5,
    title: '5. WhatsApp Delivery Failure & Fallback',
    hospitalCode: 'ANHVL-NTK',
    language: 'en',
    description: 'Outbound confirmation submitted -> Meta webhook returns Error 131026 (Undeliverable) -> Critical Call-Centre Fallback Task generated.',
    totalSteps: 2,
    steps: [
      'Ingest Booking & Submit Confirmation to WhatsApp Adapter (Status: SENT)',
      'Process Meta Delivery Failure Webhook (131026) -> Create Critical Call-Centre Fallback Task',
    ],
  },
  {
    id: 'SCENARIO_6_STOP_OPTOUT',
    number: 6,
    title: '6. STOP / Opt-Out & Immediate Suppression',
    hospitalCode: 'ANHVL-NTK',
    language: 'en',
    description: 'Patient replies STOP -> Consent revoked immediately -> Queued 24h & 3h reminders suppressed -> Subsequent outbound send blocked.',
    totalSteps: 3,
    steps: [
      'Ingest Booking & Schedule 24h + 3h Reminders',
      'Patient Replies "STOP" -> Revoke Consent & Suppress All Pending Reminders',
      'Attempt Subsequent Reminder Execution -> Verify Blocked by Pre-Send Consent Check',
    ],
  },
  {
    id: 'SCENARIO_7_NOSHOW_REBOOKING',
    number: 7,
    title: '7. No-Show & Rebooking Workflow',
    hospitalCode: 'ANHVL-NTK',
    language: 'bn',
    description: 'Verified HIS Attendance Feed reports NO_SHOW -> Platform checks consent -> Sends approved No-Show Rebooking Prompt -> Creates rebooking assistance task.',
    totalSteps: 2,
    steps: [
      'Create Confirmed Appointment (No prompt sent merely from clock passing)',
      'Receive Verified HIS NO_SHOW Outcome -> Send Rebooking Prompt & Create Call-Centre Task',
    ],
  },
  {
    id: 'SCENARIO_8_QUIET_HOURS',
    number: 8,
    title: '8. Quiet-Hour Reminder Deferral (8 AM – 9 PM)',
    hospitalCode: 'ANHVL-NTK',
    language: 'en',
    description: '09:00 AM morning appointment where 3h reminder (06:00 AM) falls in Quiet Hours -> Scheduler shifts job to approved 07:00 AM Morning Exception window.',
    totalSteps: 2,
    steps: [
      'Ingest 09:00 AM Morning Appointment & Compute Reminder Schedule',
      'Verify Quiet-Hour Shift (06:00 AM -> 07:00 AM Morning Exception) & Execute',
    ],
  },
  {
    id: 'SCENARIO_9_CONTROL_GROUP',
    number: 9,
    title: '9. New Town Pilot Control Group Holdout',
    hospitalCode: 'ANHVL-NTK',
    language: 'bn',
    description: 'Appointment assigned to New Town Pilot CONTROL holdout group -> Automated campaign messages suppressed while HIS attendance is tracked.',
    totalSteps: 2,
    steps: [
      'Ingest New Town Appointment Assigned to CONTROL Holdout Cohort -> Verify Campaign Suppressed',
      'Reconcile HIS Attendance Outcome for Control Group Measurement',
    ],
  },
  {
    id: 'SCENARIO_10_LANGUAGE_ROUTING',
    number: 10,
    title: '10. New Town (BN/EN) & Raipur (HI/EN) Language Routing',
    hospitalCode: 'ANHVL-RPR',
    language: 'hi',
    description: 'Demonstrates automatic hospital-specific template, address, helpline, and language fallback routing across New Town (Bengali) and Raipur (Hindi).',
    totalSteps: 2,
    steps: [
      'Ingest New Town Booking (Bengali) & Verify Kolkata Address/Helpline/Bengali Template',
      'Ingest Raipur Booking (Hindi) & Verify Raipur First-Visit Help/Hindi Template',
    ],
  },
];

@Injectable()
export class SimulatorService {
  private initialized = false;
  private state = {
    isRunning: false,
    isPaused: false,
    activeScenarioId: 'SCENARIO_1_CONFIRM',
    currentStep: 0,
    simulatedClockIso: new Date().toISOString(),
    activeBookingId: null as string | null,
    activeAppointmentId: null as string | null,
    whatsappHandsetMessages: [] as Array<{
      id: string;
      sender: 'HOSPITAL' | 'PATIENT' | 'SYSTEM';
      text: string;
      timestamp: string;
      status?: string;
      buttons?: Array<{ id: string; label: string; action: string }>;
    }>,
    eventHistory: [] as Array<{
      step: number;
      timestamp: string;
      module: string;
      summary: string;
      status: string;
    }>,
  };

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AppointmentsService) private readonly appointmentsService: AppointmentsService,
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService,
    @Inject(ResponsesService) private readonly responsesService: ResponsesService,
    @Inject(AttendanceService) private readonly attendanceService: AttendanceService
  ) {}

  async getSimulatorStatus() {
    if (!this.initialized) {
      this.initialized = true;
      try {
        await this.startScenario('SCENARIO_1_CONFIRM');
        await this.runNextStep();
        await this.runNextStep();
      } catch {
        // ignore
      }
    }

    const scenario =
      SIMULATOR_SCENARIOS.find((s) => s.id === this.state.activeScenarioId) ||
      SIMULATOR_SCENARIOS[0];

    let activeAppointment = null;
    if (this.state.activeAppointmentId) {
      activeAppointment = await this.prisma.appointment.findUnique({
        where: { id: this.state.activeAppointmentId },
        include: {
          hospital: true,
          patient: { include: { consents: true } },
          scheduledMessages: true,
          messageLogs: { orderBy: { createdAt: 'asc' } },
          patientResponses: true,
          followUpTasks: { include: { assignedAgent: { include: { user: true } } } },
          attendanceRecords: true,
          holdoutAssignment: true,
        },
      });
    }

    return {
      demoBanner: 'ISOLATED SYNTHETIC DEMO SIMULATOR — NO LIVE PATIENT DATA OR REAL WHATSAPP MESSAGES',
      scenarios: SIMULATOR_SCENARIOS,
      currentScenario: scenario,
      state: this.state,
      activeAppointment,
    };
  }

  async startScenario(scenarioId: string) {
    const scenario = SIMULATOR_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) throw new BadRequestException(`Unknown scenario: ${scenarioId}`);

    this.state = {
      isRunning: true,
      isPaused: false,
      activeScenarioId: scenario.id,
      currentStep: 0,
      simulatedClockIso: new Date().toISOString(),
      activeBookingId: `SIM-${scenario.number}-${Date.now().toString().slice(-4)}`,
      activeAppointmentId: null,
      whatsappHandsetMessages: [
        {
          id: `sys-init-${Date.now()}`,
          sender: 'SYSTEM',
          text: `[DEMO SIMULATOR] Initialized ${scenario.title} (${scenario.hospitalCode}, Language: ${scenario.language.toUpperCase()})`,
          timestamp: this.state.simulatedClockIso,
        },
      ],
      eventHistory: [
        {
          step: 0,
          timestamp: new Date().toISOString(),
          module: 'SIMULATOR_ORCHESTRATOR',
          summary: `Started Scenario ${scenario.number}: ${scenario.title}`,
          status: 'READY',
        },
      ],
    };

    // Automatically execute Step 1 on start so the user immediately sees live data
    await this.runNextStep();
    return this.getSimulatorStatus();
  }

  advanceClock(minutes = 60) {
    const nextTime = new Date(new Date(this.state.simulatedClockIso).getTime() + minutes * 60000);
    this.state.simulatedClockIso = nextTime.toISOString();
    this.state.eventHistory.unshift({
      step: this.state.currentStep,
      timestamp: this.state.simulatedClockIso,
      module: 'SIMULATION_CLOCK',
      summary: `Advanced isolated simulation clock by +${minutes} minutes to ${nextTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST.`,
      status: 'CLOCK_SHIFTED',
    });
    return this.getSimulatorStatus();
  }

  pauseResume(pause: boolean) {
    this.state.isPaused = pause;
    this.state.eventHistory.unshift({
      step: this.state.currentStep,
      timestamp: new Date().toISOString(),
      module: 'SIMULATOR_CONTROL',
      summary: pause ? 'Simulation paused by presenter.' : 'Simulation resumed by presenter.',
      status: pause ? 'PAUSED' : 'RUNNING',
    });
    return this.getSimulatorStatus();
  }

  resetSimulator() {
    this.state = {
      isRunning: false,
      isPaused: false,
      activeScenarioId: 'SCENARIO_1_CONFIRM',
      currentStep: 0,
      simulatedClockIso: new Date().toISOString(),
      activeBookingId: null,
      activeAppointmentId: null,
      whatsappHandsetMessages: [],
      eventHistory: [],
    };
    return this.getSimulatorStatus();
  }

  async runNextStep() {
    const scenario =
      SIMULATOR_SCENARIOS.find((s) => s.id === this.state.activeScenarioId) ||
      SIMULATOR_SCENARIOS[0];

    if (this.state.currentStep >= scenario.totalSteps) {
      return this.getSimulatorStatus();
    }

    const nextStep = this.state.currentStep + 1;
    this.state.currentStep = nextStep;

    const hospital = await this.prisma.hospital.findUnique({
      where: { code: scenario.hospitalCode },
    });

    const tomorrowStr = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0];
    const bookingId = this.state.activeBookingId || `SIM-${scenario.number}-${Date.now().toString().slice(-4)}`;
    this.state.activeBookingId = bookingId;

    // Step 1 across scenarios: Ingest Synthetic Appointment
    if (nextStep === 1) {
      const forceCohort =
        scenario.id === 'SCENARIO_9_CONTROL_GROUP' ? 'CONTROL' : 'TREATMENT';
      const apptTime = scenario.id === 'SCENARIO_8_QUIET_HOURS' ? '09:00' : '11:30';
      const triggerImmediate =
        scenario.id !== 'SCENARIO_9_CONTROL_GROUP';

      const ingested = await this.appointmentsService.ingestAppointment(
        {
          bookingId,
          externalPatientId: `UHID-${bookingId}`,
          patientName:
            scenario.hospitalCode === 'ANHVL-NTK'
              ? `Aparajita Sen`
              : `Pooja Deshmukh`,
          mobileNumber: `+91990000000${scenario.number}`,
          preferredLanguage: scenario.language,
          hospitalId: hospital.id,
          department: 'Obstetrics & Gynaecology',
          doctorName:
            scenario.hospitalCode === 'ANHVL-NTK'
              ? 'Dr. Ananya Chatterjee'
              : 'Dr. Vandana Sharma',
          appointmentDate: tomorrowStr,
          appointmentTime: apptTime,
          bookingSource: 'DEMO_SIMULATOR',
          consentStatus: 'GRANTED',
          isFirstVisit: true,
          isSyntheticDemo: true,
          forceCohortGroup: forceCohort,
          triggerImmediateConfirmation: triggerImmediate,
        },
        'DEMO_SIMULATOR'
      );

      this.state.activeAppointmentId = ingested.appointment.id;
      const latestMsg = (ingested.appointment as any).messageLogs?.[0];

      if (latestMsg && latestMsg.status !== 'SUPPRESSED') {
        this.state.whatsappHandsetMessages.push({
          id: latestMsg.id,
          sender: 'HOSPITAL',
          text: latestMsg.renderedContent,
          timestamp: new Date().toISOString(),
          status: latestMsg.status,
          buttons: [
            { id: 'BTN_CONFIRM', label: 'Confirm Appointment', action: 'CONFIRM' },
            { id: 'BTN_RESCHEDULE', label: 'Reschedule', action: 'RESCHEDULE' },
            { id: 'BTN_CANCEL', label: 'Cancel', action: 'CANCEL' },
            { id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' },
          ],
        });
      } else if (scenario.id === 'SCENARIO_9_CONTROL_GROUP') {
        this.state.whatsappHandsetMessages.push({
          id: `suppressed-${Date.now()}`,
          sender: 'SYSTEM',
          text: '[PILOT CONTROL GROUP HOLDOUT] Outbound WhatsApp confirmation & reminders suppressed per randomized holdout rule.',
          timestamp: new Date().toISOString(),
        });
      }

      this.state.eventHistory.unshift({
        step: 1,
        timestamp: new Date().toISOString(),
        module: 'HIS_INGESTION_AND_SCHEDULER',
        summary: scenario.steps[0],
        status: 'COMPLETED',
      });

      return this.getSimulatorStatus();
    }

    // Step 2+ per scenario
    const apptId = this.state.activeAppointmentId;
    const appt = await this.prisma.appointment.findUnique({
      where: { id: apptId },
      include: { messageLogs: { orderBy: { createdAt: 'desc' } }, scheduledMessages: true },
    });

    if (scenario.id === 'SCENARIO_1_CONFIRM') {
      if (nextStep === 2) {
        const msg = appt.messageLogs[0];
        if (msg?.whatsappMessageId) {
          await this.whatsappService.processDeliveryStatusWebhook({
            whatsappMessageId: msg.whatsappMessageId,
            status: 'read',
            signatureValid: true,
          });
        }
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'META_WEBHOOK_PROCESSOR',
          summary: 'Processed Meta DELIVERED and READ receipt webhooks for confirmation message.',
          status: 'READ',
        });
      } else if (nextStep === 3) {
        this.state.whatsappHandsetMessages.push({
          id: `pat-${Date.now()}`,
          sender: 'PATIENT',
          text: 'Confirm Appointment',
          timestamp: new Date().toISOString(),
        });
        await this.responsesService.processInboundResponse({
          appointmentId: appt.id,
          rawResponseText: 'Confirm Appointment',
          buttonPayload: 'BTN_CONFIRM',
          responseChannel: 'SIMULATOR',
        });
        const updatedMsgs = await this.prisma.messageLog.findMany({
          where: { appointmentId: appt.id, direction: 'OUTBOUND' },
          orderBy: { createdAt: 'desc' },
        });
        if (updatedMsgs[0]) {
          this.state.whatsappHandsetMessages.push({
            id: updatedMsgs[0].id,
            sender: 'HOSPITAL',
            text: updatedMsgs[0].renderedContent,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          });
        }
        this.state.eventHistory.unshift({
          step: 3,
          timestamp: new Date().toISOString(),
          module: 'PATIENT_RESPONSE_ENGINE',
          summary: 'Patient confirmed visit -> Status updated to CONFIRMED -> First-Visit & Directions guide sent.',
          status: 'CONFIRMED',
        });
      } else if (nextStep === 4) {
        await this.attendanceService.reconcileAttendanceOutcome({
          bookingId: appt.bookingId,
          hospitalId: appt.hospitalId,
          outcomeStatus: 'COMPLETED',
          actorEmail: 'DEMO_SIMULATOR',
        });
        this.state.eventHistory.unshift({
          step: 4,
          timestamp: new Date().toISOString(),
          module: 'HIS_ATTENDANCE_RECONCILER',
          summary: 'Matched HIS visit registration outcome (COMPLETED) to booking ID -> Dashboard conversion updated.',
          status: 'RECONCILED',
        });
      }
    } else if (scenario.id === 'SCENARIO_2_RESCHEDULE') {
      if (nextStep === 2) {
        this.state.whatsappHandsetMessages.push({
          id: `pat-${Date.now()}`,
          sender: 'PATIENT',
          text: 'Reschedule',
          timestamp: new Date().toISOString(),
        });
        await this.responsesService.processInboundResponse({
          appointmentId: appt.id,
          rawResponseText: 'Reschedule',
          buttonPayload: 'BTN_RESCHEDULE',
          responseChannel: 'SIMULATOR',
        });
        const updatedMsgs = await this.prisma.messageLog.findMany({
          where: { appointmentId: appt.id, direction: 'OUTBOUND' },
          orderBy: { createdAt: 'desc' },
        });
        if (updatedMsgs[0]) {
          this.state.whatsappHandsetMessages.push({
            id: updatedMsgs[0].id,
            sender: 'HOSPITAL',
            text: updatedMsgs[0].renderedContent,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          });
        }
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'PATIENT_RESPONSE_ENGINE',
          summary: 'Patient tapped Reschedule -> Status set to RESCHEDULE_REQUESTED (no auto-booking) -> Sent Reschedule Ack.',
          status: 'RESCHEDULE_REQUESTED',
        });
      } else if (nextStep === 3) {
        this.state.eventHistory.unshift({
          step: 3,
          timestamp: new Date().toISOString(),
          module: 'ALTRUIST_CALL_CENTRE_QUEUE',
          summary: 'Verified High-Priority RESCHEDULE_REQUEST task assigned to Altruist Call-Centre Agent.',
          status: 'TASK_ASSIGNED',
        });
      }
    } else if (scenario.id === 'SCENARIO_3_CANCEL') {
      if (nextStep === 2) {
        this.state.whatsappHandsetMessages.push({
          id: `pat-${Date.now()}`,
          sender: 'PATIENT',
          text: 'Cancel',
          timestamp: new Date().toISOString(),
        });
        await this.responsesService.processInboundResponse({
          appointmentId: appt.id,
          rawResponseText: 'Cancel',
          buttonPayload: 'BTN_CANCEL',
          responseChannel: 'SIMULATOR',
        });
        const updatedMsgs = await this.prisma.messageLog.findMany({
          where: { appointmentId: appt.id, direction: 'OUTBOUND' },
          orderBy: { createdAt: 'desc' },
        });
        if (updatedMsgs[0]) {
          this.state.whatsappHandsetMessages.push({
            id: updatedMsgs[0].id,
            sender: 'HOSPITAL',
            text: updatedMsgs[0].renderedContent,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          });
        }
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'PATIENT_RESPONSE_ENGINE',
          summary: 'Patient requested cancellation -> Status set to CANCELLATION_REQUESTED (awaiting HIS confirmation).',
          status: 'CANCELLATION_REQUESTED',
        });
      } else if (nextStep === 3) {
        await this.appointmentsService.confirmOfficialCancellation(
          appt.id,
          'Confirmed cancellation received from Raipur HIS feed',
          'DEMO_SIMULATOR'
        );
        this.state.eventHistory.unshift({
          step: 3,
          timestamp: new Date().toISOString(),
          module: 'HIS_CANCELLATION_SYNC',
          summary: 'Official HIS cancellation confirmed -> Appointment marked CANCELLED & all pending reminders cancelled.',
          status: 'CANCELLED',
        });
      }
    } else if (scenario.id === 'SCENARIO_4_TALK_TO_US') {
      if (nextStep === 2) {
        this.state.whatsappHandsetMessages.push({
          id: `pat-${Date.now()}`,
          sender: 'PATIENT',
          text: 'Talk to Us — मदद चाहिए (Need First-Visit & Parking Help)',
          timestamp: new Date().toISOString(),
        });
        await this.responsesService.processInboundResponse({
          appointmentId: appt.id,
          rawResponseText: 'Talk to Us — मदद चाहिए',
          buttonPayload: 'BTN_TALK',
          responseChannel: 'SIMULATOR',
        });
        const updatedMsgs = await this.prisma.messageLog.findMany({
          where: { appointmentId: appt.id, direction: 'OUTBOUND' },
          orderBy: { createdAt: 'desc' },
        });
        if (updatedMsgs[0]) {
          this.state.whatsappHandsetMessages.push({
            id: updatedMsgs[0].id,
            sender: 'HOSPITAL',
            text: updatedMsgs[0].renderedContent,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          });
        }
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'ALTRUIST_ASSISTANCE_ROUTER',
          summary: 'Sent Hindi Talk-to-Us Acknowledgement & assigned TALK_TO_US_ASSISTANCE task to Raipur agent.',
          status: 'ASSISTANCE_QUEUED',
        });
      }
    } else if (scenario.id === 'SCENARIO_5_DELIVERY_FAILURE') {
      if (nextStep === 2) {
        const msg = appt.messageLogs[0];
        if (msg?.whatsappMessageId) {
          await this.whatsappService.processDeliveryStatusWebhook({
            whatsappMessageId: msg.whatsappMessageId,
            status: 'failed',
            errorCode: '131026',
            errorTitle: 'Message undeliverable (recipient phone not on WhatsApp)',
            signatureValid: true,
          });
        }
        this.state.whatsappHandsetMessages.push({
          id: `fail-${Date.now()}`,
          sender: 'SYSTEM',
          text: '[WEBHOOK ERROR 131026] Delivery failed -> Critical Call-Centre Fallback Task generated.',
          timestamp: new Date().toISOString(),
        });
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'DELIVERY_FAILURE_HANDLER',
          summary: 'Meta webhook reported FAILED (131026) -> Created CRITICAL DELIVERY_FAILURE_FALLBACK task for call-centre.',
          status: 'FAILED_ESCALATED',
        });
      }
    } else if (scenario.id === 'SCENARIO_6_STOP_OPTOUT') {
      if (nextStep === 2) {
        this.state.whatsappHandsetMessages.push({
          id: `pat-stop-${Date.now()}`,
          sender: 'PATIENT',
          text: 'STOP',
          timestamp: new Date().toISOString(),
        });
        await this.responsesService.processInboundResponse({
          appointmentId: appt.id,
          rawResponseText: 'STOP',
          responseChannel: 'SIMULATOR',
        });
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'CONSENT_PROTECTION_ENGINE',
          summary: 'Patient replied STOP -> Consent revoked & all pending 24h/3h reminders marked SUPPRESSED.',
          status: 'OPTED_OUT',
        });
      } else if (nextStep === 3) {
        const attempt = await this.whatsappService.sendAppointmentTemplateMessage({
          appointmentId: appt.id,
          category: 'ADVANCE_REMINDER',
          isAutomatedCampaign: true,
        });
        this.state.whatsappHandsetMessages.push({
          id: `blocked-${Date.now()}`,
          sender: 'SYSTEM',
          text: `[CONSENT SAFEGUARD] Outbound reminder blocked prior to dispatch: ${attempt.reason}`,
          timestamp: new Date().toISOString(),
        });
        this.state.eventHistory.unshift({
          step: 3,
          timestamp: new Date().toISOString(),
          module: 'PRE_SEND_ELIGIBILITY_GUARD',
          summary: `Subsequent reminder attempt blocked: ${attempt.reason}.`,
          status: 'SUPPRESSED',
        });
      }
    } else if (scenario.id === 'SCENARIO_7_NOSHOW_REBOOKING') {
      if (nextStep === 2) {
        await this.attendanceService.reconcileAttendanceOutcome({
          bookingId: appt.bookingId,
          hospitalId: appt.hospitalId,
          outcomeStatus: 'NO_SHOW',
          actorEmail: 'DEMO_SIMULATOR',
        });
        const updatedMsgs = await this.prisma.messageLog.findMany({
          where: { appointmentId: appt.id, direction: 'OUTBOUND' },
          orderBy: { createdAt: 'desc' },
        });
        if (updatedMsgs[0]) {
          this.state.whatsappHandsetMessages.push({
            id: updatedMsgs[0].id,
            sender: 'HOSPITAL',
            text: updatedMsgs[0].renderedContent,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          });
        }
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'NOSHOW_REBOOKING_ENGINE',
          summary: 'Verified HIS NO_SHOW feed received -> Sent approved Bengali No-Show Rebooking Prompt & created rebooking task.',
          status: 'REBOOKING_PROMPT_SENT',
        });
      }
    } else if (scenario.id === 'SCENARIO_8_QUIET_HOURS') {
      if (nextStep === 2) {
        const shiftedJob = appt.scheduledMessages.find((m) => m.jobType === 'REMINDER_3H');
        this.state.whatsappHandsetMessages.push({
          id: `qh-${Date.now()}`,
          sender: 'SYSTEM',
          text: `[QUIET HOURS ENGINE] 09:00 AM visit 3h reminder (06:00 AM IST) fell in Quiet Hours (9 PM - 8 AM). Shifted to 07:00 AM IST Morning Exception Window (wasQuietHourShifted: ${shiftedJob?.wasQuietHourShifted}).`,
          timestamp: new Date().toISOString(),
        });
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'QUIET_HOURS_SCHEDULER',
          summary: 'Verified 06:00 AM target shifted to 07:00 AM IST morning exception window.',
          status: 'QUIET_HOUR_SHIFTED',
        });
      }
    } else if (scenario.id === 'SCENARIO_9_CONTROL_GROUP') {
      if (nextStep === 2) {
        await this.attendanceService.reconcileAttendanceOutcome({
          bookingId: appt.bookingId,
          hospitalId: appt.hospitalId,
          outcomeStatus: 'NO_SHOW',
          actorEmail: 'DEMO_SIMULATOR',
        });
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'PILOT_MEASUREMENT_ENGINE',
          summary: 'Recorded HIS outcome for Control Group appointment while keeping automated WhatsApp campaigns suppressed.',
          status: 'CONTROL_MEASURED',
        });
      }
    } else if (scenario.id === 'SCENARIO_10_LANGUAGE_ROUTING') {
      if (nextStep === 2) {
        const ntk = await this.prisma.hospital.findUnique({ where: { code: 'ANHVL-NTK' } });
        const ntkRes = await this.appointmentsService.ingestAppointment(
          {
            bookingId: `${bookingId}-NTK`,
            externalPatientId: `UHID-${bookingId}-NTK`,
            patientName: 'Srabani Chatterjee',
            mobileNumber: '+919830099910',
            preferredLanguage: 'bn',
            hospitalId: ntk.id,
            department: 'Paediatrics & Neonatology',
            doctorName: 'Dr. Kaushik Banerjee',
            appointmentDate: tomorrowStr,
            appointmentTime: '12:00',
            bookingSource: 'DEMO_SIMULATOR',
            isSyntheticDemo: true,
          },
          'DEMO_SIMULATOR'
        );
        const ntkMsg = (ntkRes.appointment as any).messageLogs?.[0];
        if (ntkMsg) {
          this.state.whatsappHandsetMessages.push({
            id: ntkMsg.id,
            sender: 'HOSPITAL',
            text: ntkMsg.renderedContent,
            timestamp: new Date().toISOString(),
            status: 'DELIVERED',
          });
        }
        this.state.eventHistory.unshift({
          step: 2,
          timestamp: new Date().toISOString(),
          module: 'MULTILINGUAL_ROUTER',
          summary: 'Routed Raipur booking in Hindi (HI) and New Town booking in Bengali (BN) with hospital-specific helplines & addresses.',
          status: 'ROUTED',
        });
      }
    }

    return this.getSimulatorStatus();
  }
}
