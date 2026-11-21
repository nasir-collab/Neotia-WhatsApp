import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

export interface UnconvertedFormLead {
  id: string;
  leadCode: string;
  fullName: string;
  mobileNumber: string;
  hospitalCode: 'ANHVL-NTK' | 'ANHVL-RPR';
  hospitalCity: string;
  departmentInterest: string;
  preferredLanguage: 'bn' | 'hi' | 'en';
  formSource: string;
  submittedAt: string;
  marketingOptIn: boolean;
  optOutStatus: boolean;
  nudgesSentLast14d: number;
  lastNudgeAt?: string | null;
}

const SYNTHETIC_FORM_LEADS: UnconvertedFormLead[] = [
  {
    id: 'lead-ntk-01',
    leadCode: 'WEB-NTK-901',
    fullName: 'Barnali Sengupta (Web Form Lead)',
    mobileNumber: '+919830088001',
    hospitalCode: 'ANHVL-NTK',
    hospitalCity: 'New Town, Kolkata',
    departmentInterest: 'Obstetrics & Gynaecology',
    preferredLanguage: 'bn',
    formSource: 'Website OPD Enquiry Form',
    submittedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    marketingOptIn: true,
    optOutStatus: false,
    nudgesSentLast14d: 0,
  },
  {
    id: 'lead-ntk-02',
    leadCode: 'WEB-NTK-902',
    fullName: 'Sagnik Chowdhury (Web Form Lead)',
    mobileNumber: '+919830088002',
    hospitalCode: 'ANHVL-NTK',
    hospitalCity: 'New Town, Kolkata',
    departmentInterest: 'Paediatrics & Neonatology',
    preferredLanguage: 'en',
    formSource: 'Meta Click-to-Form Ad (Paediatrics)',
    submittedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(),
    marketingOptIn: true,
    optOutStatus: false,
    nudgesSentLast14d: 1,
    lastNudgeAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lead-ntk-03',
    leadCode: 'WEB-NTK-903',
    fullName: 'Roshni Banerjee (Web Form — No Marketing Opt-In)',
    mobileNumber: '+919830088003',
    hospitalCode: 'ANHVL-NTK',
    hospitalCity: 'New Town, Kolkata',
    departmentInterest: 'Fetal Medicine',
    preferredLanguage: 'bn',
    formSource: 'Website Callback Widget (Unchecked Marketing Box)',
    submittedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    marketingOptIn: false,
    optOutStatus: false,
    nudgesSentLast14d: 0,
  },
  {
    id: 'lead-rpr-01',
    leadCode: 'WEB-RPR-904',
    fullName: 'Komal Deshmukh (Web Form Lead)',
    mobileNumber: '+919752088004',
    hospitalCode: 'ANHVL-RPR',
    hospitalCity: 'Raipur',
    departmentInterest: 'Fertility & Reproductive Medicine',
    preferredLanguage: 'hi',
    formSource: 'Raipur Maternity Landing Page',
    submittedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    marketingOptIn: true,
    optOutStatus: false,
    nudgesSentLast14d: 0,
  },
  {
    id: 'lead-rpr-02',
    leadCode: 'WEB-RPR-905',
    fullName: 'Sandeep Tiwari (Web Form Lead)',
    mobileNumber: '+919752088005',
    hospitalCode: 'ANHVL-RPR',
    hospitalCity: 'Raipur',
    departmentInterest: 'Paediatrics & Child Care',
    preferredLanguage: 'hi',
    formSource: 'Google Search OPD Form',
    submittedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    marketingOptIn: true,
    optOutStatus: false,
    nudgesSentLast14d: 0,
  },
  {
    id: 'lead-rpr-03',
    leadCode: 'WEB-RPR-906',
    fullName: 'Neha Agrawal (Opted Out — STOP)',
    mobileNumber: '+919752088006',
    hospitalCode: 'ANHVL-RPR',
    hospitalCity: 'Raipur',
    departmentInterest: 'Obstetrics & Gynaecology',
    preferredLanguage: 'en',
    formSource: 'Website OPD Enquiry Form',
    submittedAt: new Date(Date.now() - 90 * 3600 * 1000).toISOString(),
    marketingOptIn: true,
    optOutStatus: true,
    nudgesSentLast14d: 1,
  },
];

@Injectable()
export class CampaignsService {
  private disruptionHistory: any[] = [];
  private retargetingCampaignHistory: any[] = [];
  private formLeads: UnconvertedFormLead[] = [...SYNTHETIC_FORM_LEADS];

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async getDoctorsForDisruption(hospitalId?: string) {
    const where: any = {};
    if (hospitalId && hospitalId !== 'ALL') where.hospitalId = hospitalId;

    const appts = await this.prisma.appointment.findMany({
      where,
      include: { hospital: true },
      orderBy: { appointmentDate: 'asc' },
    });

    const doctorMap: Record<string, any> = {};
    for (const a of appts) {
      const key = `${a.hospitalId}:${a.doctorName}`;
      if (!doctorMap[key]) {
        doctorMap[key] = {
          doctorName: a.doctorName,
          department: a.department,
          hospitalId: a.hospitalId,
          hospitalCode: a.hospital?.code,
          hospitalCity: a.hospital?.city,
          activeBookingsCount: 0,
          dates: new Set<string>(),
        };
      }
      if (!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)) {
        doctorMap[key].activeBookingsCount += 1;
      }
      doctorMap[key].dates.add(new Date(a.appointmentDate).toISOString().split('T')[0]);
    }

    return {
      doctors: Object.values(doctorMap).map((d) => ({
        ...d,
        dates: Array.from(d.dates).sort(),
      })),
      disruptionHistory: this.disruptionHistory,
    };
  }

  async previewDoctorDisruption(params: {
    hospitalId?: string;
    doctorName: string;
    date?: string;
  }) {
    if (!params.doctorName) {
      throw new BadRequestException('doctorName is required');
    }

    const where: any = {
      doctorName: params.doctorName,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] },
    };
    if (params.hospitalId && params.hospitalId !== 'ALL') {
      where.hospitalId = params.hospitalId;
    }

    let appts = await this.prisma.appointment.findMany({
      where,
      include: {
        hospital: true,
        patient: { include: { consents: true } },
        scheduledMessages: true,
      },
      orderBy: { appointmentTime: 'asc' },
    });

    if (params.date && params.date !== 'ALL_UPCOMING') {
      appts = appts.filter(
        (a) => new Date(a.appointmentDate).toISOString().split('T')[0] === params.date
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const affected = appts.map((a) => {
      const apptDateStr = new Date(a.appointmentDate).toISOString().split('T')[0];
      const isSameDay = apptDateStr <= todayStr;
      const pendingReminders = (a.scheduledMessages || []).filter((m) =>
        ['SCHEDULED', 'QUEUED'].includes(m.status)
      ).length;
      const consent = a.patient?.consents?.[0];
      const whatsappEligible =
        a.consentStatus === 'GRANTED' && !consent?.optOutStatus;

      return {
        appointmentId: a.id,
        bookingId: a.bookingId,
        patientName: a.patientName,
        mobileNumber: a.mobileNumber,
        preferredLanguage: a.preferredLanguage,
        hospitalCity: a.hospital?.city,
        department: a.department,
        appointmentDate: apptDateStr,
        appointmentTime: a.appointmentTime,
        currentStatus: a.status,
        pendingRemindersToStop: pendingReminders,
        isSameDay,
        whatsappEligible,
        altruistCallbackRequired: isSameDay || !whatsappEligible,
      };
    });

    return {
      doctorName: params.doctorName,
      date: params.date || 'ALL_UPCOMING',
      totalAffected: affected.length,
      totalPendingRemindersToStop: affected.reduce((acc, x) => acc + x.pendingRemindersToStop, 0),
      sameDayAltruistEscalations: affected.filter((x) => x.altruistCallbackRequired).length,
      whatsappEligibleCount: affected.filter((x) => x.whatsappEligible).length,
      hisSyncProtectionNote:
        'Platform applies an internal DOCTOR_DISRUPTION_OVERRIDE lock on affected Booking IDs. Stale HIS sync polls will NOT re-queue old reminders until HIS provides a new appointment timestamp or official cancellation.',
      affectedPatients: affected,
    };
  }

  async executeDoctorDisruption(
    payload: {
      hospitalId?: string;
      doctorName: string;
      date?: string;
      disruptionType: 'DOCTOR_CANCELLED' | 'DOCTOR_DELAYED';
      delayMinutes?: number;
      reason?: string;
    },
    actorEmail: string
  ) {
    const preview = await this.previewDoctorDisruption({
      hospitalId: payload.hospitalId,
      doctorName: payload.doctorName,
      date: payload.date,
    });

    if (preview.totalAffected === 0) {
      throw new BadRequestException(
        `No active upcoming bookings found for ${payload.doctorName} on ${payload.date || 'selected dates'}.`
      );
    }

    let remindersStopped = 0;
    let messagesSent = 0;
    let altruistTasksCreated = 0;

    const agents = await this.prisma.agent.findMany();

    for (const item of preview.affectedPatients) {
      // 1. Immediately stop pending reminders for this booking
      const cancelRes = await this.prisma.scheduledMessage.updateMany({
        where: {
          appointmentId: item.appointmentId,
          status: { in: ['SCHEDULED', 'QUEUED'] },
        },
        data: {
          status: 'CANCELLED',
          suppressionReason: `${payload.disruptionType}_ADMIN_OVERRIDE`,
        },
      });
      remindersStopped += cancelRes.count;

      // 2. Apply HIS-Independent Override Lock & Status update
      const appt = await this.prisma.appointment.update({
        where: { id: item.appointmentId },
        data: {
          status: 'RESCHEDULE_REQUESTED',
        },
        include: { hospital: true },
      });

      await this.prisma.appointmentEvent.create({
        data: {
          appointmentId: appt.id,
          hospitalId: appt.hospitalId,
          eventType: 'DOCTOR_DISRUPTION_OVERRIDE',
          previousStatus: item.currentStatus,
          newStatus: 'RESCHEDULE_REQUESTED',
          description: `${payload.disruptionType} (${payload.reason || 'Unavoidable clinical schedule change'}). Stopped ${cancelRes.count} pending reminders. HIS stale-sync override lock active until new slot is synced.`,
          triggeredBy: actorEmail,
          metadata: {
            disruptionType: payload.disruptionType,
            delayMinutes: payload.delayMinutes || null,
            hisOverrideLock: true,
          },
        },
      });

      // 3. Send ONE clean multilingual WhatsApp Utility Message with 3 interactive options
      if (item.whatsappEligible) {
        const renderedContent =
          item.preferredLanguage === 'bn'
            ? `[UTILITY] নমস্কার ${item.patientName}, অনিবার্য কারণে ${payload.doctorName}-এর ${item.appointmentDate} (${item.appointmentTime}) ওপিডি স্লট ${payload.disruptionType === 'DOCTOR_DELAYED' ? `${payload.delayMinutes || 60} মিনিট বিলম্বিত হয়েছে` : 'বাতিল/পরিবর্তন হয়েছে'}। অনুগ্রহ করে বেছে নিন: [Next Available Slot] | [See Another Doctor] | [Call Me]`
            : item.preferredLanguage === 'hi'
            ? `[UTILITY] नमस्कार ${item.patientName}, अपरिहार्य कारणों से ${payload.doctorName} की ${item.appointmentDate} (${item.appointmentTime}) ओपीडी ${payload.disruptionType === 'DOCTOR_DELAYED' ? `${payload.delayMinutes || 60} मिनट विलंबित है` : 'रद्द/पुनर्निर्धारित की गई है'}। कृपया विकल्प चुनें: [Next Available Slot] | [See Another Doctor] | [Call Me]`
            : `[UTILITY] Namaskar ${item.patientName}, due to an unavoidable schedule update, ${payload.doctorName}'s OPD on ${item.appointmentDate} at ${item.appointmentTime} is ${payload.disruptionType === 'DOCTOR_DELAYED' ? `delayed by ${payload.delayMinutes || 60} mins` : 'cancelled/rescheduled'}. Please choose: [Next Available Slot] | [See Another Doctor] | [Call Me]`;

        await this.prisma.messageLog.create({
          data: {
            appointmentId: appt.id,
            hospitalId: appt.hospitalId,
            direction: 'OUTBOUND',
            recipientMobile: item.mobileNumber,
            language: item.preferredLanguage,
            messageCategory: 'DOCTOR_DISRUPTION_UTILITY',
            renderedContent,
            whatsappMessageId: `wamid.DISRUPT.${appt.bookingId}.${Date.now().toString().slice(-4)}`,
            status: 'DELIVERED',
            providerMode: 'DEMO',
            submittedAt: new Date(),
            sentAt: new Date(),
            deliveredAt: new Date(),
            isSyntheticDemo: true,
          },
        });
        messagesSent += 1;
      }

      // 4. Same-day cases (or non-WhatsApp patients) immediately route to Altruist Call-Centre
      if (item.altruistCallbackRequired) {
        const hospAgent = agents.find((ag) => ag.hospitalId === appt.hospitalId) || agents[0];
        await this.prisma.followUpTask.create({
          data: {
            taskCode: `TSK-DISR-${Date.now().toString().slice(-5)}-${altruistTasksCreated + 1}`,
            appointmentId: appt.id,
            patientId: appt.patientId,
            hospitalId: appt.hospitalId,
            taskType: 'RESCHEDULE_REQUEST',
            priority: item.isSameDay ? 'CRITICAL' : 'HIGH',
            assignedAgentId: hospAgent?.id || null,
            status: 'OPEN',
            triggerReason: `[${payload.disruptionType}] Same-day / priority proactive Altruist call for ${payload.doctorName} (${item.appointmentDate} ${item.appointmentTime}).`,
            internalNotes: [
              {
                author: actorEmail,
                timestamp: new Date().toISOString(),
                note: `Triggered by Doctor Disruption Broadcast (${payload.disruptionType}). Offer Next Slot or Alternate Doctor and update HIS once confirmed.`,
              },
            ],
            altruistSyncStatus: 'PENDING_EXPORT',
            isSyntheticDemo: true,
          },
        });
        altruistTasksCreated += 1;
      }
    }

    const record = {
      id: `disr-${Date.now()}`,
      executedAt: new Date().toISOString(),
      executedBy: actorEmail,
      doctorName: payload.doctorName,
      date: payload.date || 'ALL_UPCOMING',
      disruptionType: payload.disruptionType,
      delayMinutes: payload.delayMinutes || null,
      reason: payload.reason || 'Clinical schedule update',
      affectedCount: preview.totalAffected,
      remindersStopped,
      messagesSent,
      altruistTasksCreated,
    };

    this.disruptionHistory.unshift(record);

    await this.auditService.log({
      actorEmail,
      action: 'DOCTOR_DISRUPTION_BROADCAST',
      entityType: 'Appointment',
      summary: `Executed ${payload.disruptionType} for ${payload.doctorName}: ${preview.totalAffected} patients affected, ${remindersStopped} pending reminders stopped, ${messagesSent} WhatsApp Utility messages sent, ${altruistTasksCreated} Altruist callback tasks created.`,
    });

    return record;
  }

  async getRetargetingCohorts(hospitalId?: string) {
    const apptWhere: any = {};
    if (hospitalId && hospitalId !== 'ALL') apptWhere.hospitalId = hospitalId;

    const hospitals = await this.prisma.hospital.findMany();
    const selectedHospital = hospitals.find((h) => h.id === hospitalId);

    const appts = await this.prisma.appointment.findMany({
      where: apptWhere,
      include: {
        hospital: true,
        patient: { include: { consents: true } },
        holdoutAssignment: true,
      },
      orderBy: { appointmentDate: 'desc' },
    });

    // Segment 1: Verified No-Shows who didn't rebook
    const noShows = appts
      .filter((a) => a.status === 'NO_SHOW' || a.attendanceStatus === 'NO_SHOW')
      .map((a) => {
        const consent = a.patient?.consents?.[0];
        const hoursSinceAppt = Math.max(
          1,
          Math.round((Date.now() - new Date(a.appointmentDate).getTime()) / (3600 * 1000))
        );
        const metaCategory = hoursSinceAppt <= 72 ? 'UTILITY' : 'MARKETING';
        const isControl = a.holdoutAssignment?.cohortGroup === 'CONTROL';
        const eligible =
          a.consentStatus === 'GRANTED' && !consent?.optOutStatus && !isControl;
        return {
          id: a.id,
          referenceCode: a.bookingId,
          patientName: a.patientName,
          mobileNumber: a.mobileNumber,
          hospitalCity: a.hospital?.city,
          department: a.department,
          doctorName: a.doctorName,
          preferredLanguage: a.preferredLanguage,
          eventDate: new Date(a.appointmentDate).toISOString().split('T')[0],
          metaCategory,
          consentRequired:
            metaCategory === 'UTILITY' ? 'Appointment Service Consent' : 'Explicit Marketing Opt-In',
          eligible,
          blockReason: isControl
            ? 'New Town Pilot CONTROL Holdout'
            : !eligible
            ? 'Patient Opted Out (STOP)'
            : null,
        };
      });

    // Segment 2: Cancelled patients without a new slot
    const cancelledNoSlot = appts
      .filter((a) => ['CANCELLED', 'CANCELLATION_REQUESTED'].includes(a.status))
      .map((a, idx) => {
        const consent = a.patient?.consents?.[0];
        // Demonstrate strict marketing opt-in enforcement (e.g. 1 patient without marketing opt-in)
        const hasMarketingOptIn = idx % 3 !== 2;
        const eligible =
          a.consentStatus === 'GRANTED' && !consent?.optOutStatus && hasMarketingOptIn;
        return {
          id: a.id,
          referenceCode: a.bookingId,
          patientName: a.patientName,
          mobileNumber: a.mobileNumber,
          hospitalCity: a.hospital?.city,
          department: a.department,
          doctorName: a.doctorName,
          preferredLanguage: a.preferredLanguage,
          eventDate: new Date(a.appointmentDate).toISOString().split('T')[0],
          metaCategory: 'MARKETING',
          consentRequired: 'Explicit Marketing Opt-In (Post-Cancellation Re-Engagement)',
          eligible,
          blockReason: !hasMarketingOptIn
            ? 'Missing Explicit Marketing Opt-In'
            : consent?.optOutStatus
            ? 'Patient Opted Out (STOP)'
            : null,
        };
      });

    // Segment 3: Form-Fillers who never booked
    const leads = this.formLeads
      .filter((l) => !selectedHospital || l.hospitalCode === selectedHospital.code)
      .map((l) => {
        const eligible = l.marketingOptIn && !l.optOutStatus && l.nudgesSentLast14d < 2;
        return {
          id: l.id,
          referenceCode: l.leadCode,
          patientName: l.fullName,
          mobileNumber: l.mobileNumber,
          hospitalCity: l.hospitalCity,
          department: l.departmentInterest,
          doctorName: l.formSource,
          preferredLanguage: l.preferredLanguage,
          eventDate: l.submittedAt.split('T')[0],
          metaCategory: 'MARKETING',
          consentRequired: 'Explicit Web-Form Marketing Checkbox Opt-In',
          eligible,
          blockReason: l.optOutStatus
            ? 'Opted Out (STOP)'
            : !l.marketingOptIn
            ? 'Web Form Marketing Checkbox Unchecked'
            : l.nudgesSentLast14d >= 2
            ? '14-Day Frequency Cap Reached'
            : null,
        };
      });

    return {
      segments: {
        NO_SHOW_UNREBOOKED: {
          key: 'NO_SHOW_UNREBOOKED',
          title: '1. Verified No-Shows Who Didn’t Rebook',
          metaCategoryRule: 'UTILITY (≤72h tied to missed booking) / MARKETING (>72h follow-up)',
          consentRule: 'Active Service Consent + Not in Pilot Control Holdout + No STOP opt-out',
          total: noShows.length,
          eligibleCount: noShows.filter((x) => x.eligible).length,
          blockedCount: noShows.filter((x) => !x.eligible).length,
          records: noShows,
        },
        CANCELLED_NO_SLOT: {
          key: 'CANCELLED_NO_SLOT',
          title: '2. Cancelled Patients Without a New Slot',
          metaCategoryRule: 'MARKETING (Meta prohibits re-soliciting cancelled bookings as Utility)',
          consentRule: 'Separate Explicit Marketing Opt-In required + Instant STOP opt-out',
          total: cancelledNoSlot.length,
          eligibleCount: cancelledNoSlot.filter((x) => x.eligible).length,
          blockedCount: cancelledNoSlot.filter((x) => !x.eligible).length,
          records: cancelledNoSlot,
        },
        UNCONVERTED_FORM_LEADS: {
          key: 'UNCONVERTED_FORM_LEADS',
          title: '3. Website / Ad Form-Fillers Who Never Booked',
          metaCategoryRule: 'MARKETING (Strict — no confirmed clinical transaction exists)',
          consentRule: 'Explicit Form Checkbox Opt-In + Max 2 nudges per 14 days + Instant STOP',
          total: leads.length,
          eligibleCount: leads.filter((x) => x.eligible).length,
          blockedCount: leads.filter((x) => !x.eligible).length,
          records: leads,
        },
      },
      campaignHistory: this.retargetingCampaignHistory,
    };
  }

  async launchRetargetingCampaign(
    payload: {
      segment: 'NO_SHOW_UNREBOOKED' | 'CANCELLED_NO_SLOT' | 'UNCONVERTED_FORM_LEADS';
      hospitalId?: string;
    },
    actorEmail: string
  ) {
    const cohorts = await this.getRetargetingCohorts(payload.hospitalId);
    const seg = cohorts.segments[payload.segment];
    if (!seg) throw new BadRequestException('Invalid retargeting segment');

    const eligible = seg.records.filter((r: any) => r.eligible);
    if (eligible.length === 0) {
      throw new BadRequestException('No consent-eligible contacts available in this segment.');
    }

    const hospitals = await this.prisma.hospital.findMany();
    const defaultHospId = payload.hospitalId && payload.hospitalId !== 'ALL' ? payload.hospitalId : hospitals[0]?.id;

    for (const contact of eligible) {
      if (payload.segment === 'UNCONVERTED_FORM_LEADS') {
        const lead = this.formLeads.find((l) => l.id === contact.id);
        if (lead) {
          lead.nudgesSentLast14d += 1;
          lead.lastNudgeAt = new Date().toISOString();
        }
      }

      if (defaultHospId) {
        await this.prisma.messageLog.create({
          data: {
            appointmentId: payload.segment === 'UNCONVERTED_FORM_LEADS' ? null : contact.id,
            hospitalId: defaultHospId,
            direction: 'OUTBOUND',
            recipientMobile: contact.mobileNumber,
            language: contact.preferredLanguage || 'en',
            messageCategory: `RETARGETING_${contact.metaCategory}`,
            renderedContent: `[${contact.metaCategory} RE-ENGAGEMENT] Namaskar ${contact.patientName}, Neotia Bhagirathi (${contact.hospitalCity}) would be happy to assist you in scheduling your ${contact.department} consultation. Tap [Book / Rebook Slot] or [Call Me]. Reply STOP to opt out.`,
            whatsappMessageId: `wamid.RET.${contact.referenceCode}.${Date.now().toString().slice(-4)}`,
            status: 'DELIVERED',
            providerMode: 'DEMO',
            submittedAt: new Date(),
            sentAt: new Date(),
            deliveredAt: new Date(),
            isSyntheticDemo: true,
          },
        });
      }
    }

    const campaign = {
      id: `cmp-${Date.now()}`,
      launchedAt: new Date().toISOString(),
      launchedBy: actorEmail,
      segment: payload.segment,
      segmentTitle: seg.title,
      metaCategory: payload.segment === 'NO_SHOW_UNREBOOKED' ? 'UTILITY / MARKETING' : 'MARKETING',
      dispatchedCount: eligible.length,
      suppressedCount: seg.blockedCount,
    };

    this.retargetingCampaignHistory.unshift(campaign);

    await this.auditService.log({
      actorEmail,
      action: 'RETARGETING_CAMPAIGN_LAUNCHED',
      entityType: 'Campaign',
      summary: `Launched ${seg.title}: dispatched ${eligible.length} messages (${campaign.metaCategory}), suppressed ${seg.blockedCount} contacts due to consent/holdout guardrails.`,
    });

    return campaign;
  }
}
