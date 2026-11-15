import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getOverviewAnalytics(params: {
    hospitalId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const apptWhere: any = {};
    const msgWhere: any = { direction: 'OUTBOUND' };
    const taskWhere: any = {};
    const respWhere: any = {};

    if (params.hospitalId) {
      apptWhere.hospitalId = params.hospitalId;
      msgWhere.hospitalId = params.hospitalId;
      taskWhere.hospitalId = params.hospitalId;
      respWhere.hospitalId = params.hospitalId;
    }

    if (params.fromDate || params.toDate) {
      apptWhere.appointmentDate = {};
      if (params.fromDate) apptWhere.appointmentDate.gte = new Date(params.fromDate);
      if (params.toDate) apptWhere.appointmentDate.lte = new Date(params.toDate);
    }

    const [appointments, messages, tasks, responses, hospitals, attendanceRecords] =
      await Promise.all([
        this.prisma.appointment.findMany({
          where: apptWhere,
          include: { hospital: true, holdoutAssignment: true },
        }),
        this.prisma.messageLog.findMany({ where: msgWhere }),
        this.prisma.followUpTask.findMany({
          where: taskWhere,
          include: { assignedAgent: { include: { user: true } } },
        }),
        this.prisma.patientResponse.findMany({ where: respWhere }),
        this.prisma.hospital.findMany({ orderBy: { code: 'asc' } }),
        this.prisma.attendanceRecord.findMany({
          where: params.hospitalId ? { hospitalId: params.hospitalId } : {},
        }),
      ]);

    const appointmentsReceived = appointments.length;
    const confirmedAppointments = appointments.filter(
      (a) => a.status === 'CONFIRMED' || a.status === 'COMPLETED'
    ).length;
    const confirmationPending = appointments.filter(
      (a) => a.status === 'CONFIRMATION_PENDING' || a.status === 'VALIDATED'
    ).length;

    const messagesSent = messages.filter((m) =>
      ['SUBMITTED', 'SENT', 'DELIVERED', 'READ'].includes(m.status)
    ).length;
    const messagesDelivered = messages.filter((m) =>
      ['DELIVERED', 'READ'].includes(m.status)
    ).length;
    const messagesRead = messages.filter((m) => m.status === 'READ').length;
    const failedMessages = messages.filter((m) => m.status === 'FAILED').length;
    const suppressedMessages = messages.filter((m) => m.status === 'SUPPRESSED').length;

    const rescheduleRequests =
      appointments.filter((a) => a.status === 'RESCHEDULE_REQUESTED').length ||
      responses.filter((r) => r.mappedAction === 'RESCHEDULE').length;
    const cancellationRequests =
      appointments.filter((a) => a.status === 'CANCELLATION_REQUESTED').length ||
      responses.filter((r) => r.mappedAction === 'CANCEL').length;
    const assistanceRequests = responses.filter((r) => r.mappedAction === 'TALK_TO_US').length;

    const registeredPatients = appointments.filter((a) =>
      ['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)
    ).length;
    const completedAppointments = appointments.filter(
      (a) => a.status === 'COMPLETED' || a.attendanceStatus === 'COMPLETED'
    ).length;
    const noShows = appointments.filter(
      (a) => a.status === 'NO_SHOW' || a.attendanceStatus === 'NO_SHOW'
    ).length;
    const unmatchedAttendance = attendanceRecords.filter(
      (r) => r.matchStatus === 'UNMATCHED'
    ).length;

    const pendingFollowUps = tasks.filter((t) =>
      ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'REOPENED'].includes(t.status)
    ).length;

    // Documented Denominators
    const deliveryRate =
      messagesSent > 0 ? Number(((messagesDelivered / messagesSent) * 100).toFixed(1)) : 0;
    const readRate =
      messagesDelivered > 0 ? Number(((messagesRead / messagesDelivered) * 100).toFixed(1)) : 0;
    const confirmationRate =
      appointmentsReceived > 0
        ? Number(((confirmedAppointments / appointmentsReceived) * 100).toFixed(1))
        : 0;
    const reconciledDenominator = registeredPatients + noShows;
    const attendanceConversionRate =
      reconciledDenominator > 0
        ? Number(((registeredPatients / reconciledDenominator) * 100).toFixed(1))
        : 0;

    // Hospital-wise comparison
    const hospitalComparison = hospitals.map((h) => {
      const hAppts = appointments.filter((a) => a.hospitalId === h.id);
      const hMsgs = messages.filter((m) => m.hospitalId === h.id);
      const hTasks = tasks.filter((t) => t.hospitalId === h.id);
      const hSent = hMsgs.filter((m) => ['SUBMITTED', 'SENT', 'DELIVERED', 'READ'].includes(m.status)).length;
      const hDeliv = hMsgs.filter((m) => ['DELIVERED', 'READ'].includes(m.status)).length;
      return {
        hospitalId: h.id,
        hospitalCode: h.code,
        hospitalName: h.name,
        city: h.city,
        appointments: hAppts.length,
        confirmed: hAppts.filter((a) => ['CONFIRMED', 'COMPLETED'].includes(a.status)).length,
        attended: hAppts.filter((a) => ['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)).length,
        noShows: hAppts.filter((a) => a.attendanceStatus === 'NO_SHOW').length,
        messagesSent: hSent,
        messagesDelivered: hDeliv,
        deliveryRate: hSent > 0 ? Number(((hDeliv / hSent) * 100).toFixed(1)) : 0,
        openTasks: hTasks.filter((t) => t.status !== 'RESOLVED').length,
      };
    });

    // Doctor-wise analysis
    const doctorMap: Record<string, any> = {};
    for (const a of appointments) {
      if (!doctorMap[a.doctorName]) {
        doctorMap[a.doctorName] = {
          doctorName: a.doctorName,
          department: a.department,
          hospitalName: a.hospital?.city || '',
          booked: 0,
          confirmed: 0,
          attended: 0,
          noShows: 0,
          rescheduleRequested: 0,
        };
      }
      doctorMap[a.doctorName].booked += 1;
      if (['CONFIRMED', 'COMPLETED'].includes(a.status)) doctorMap[a.doctorName].confirmed += 1;
      if (['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)) doctorMap[a.doctorName].attended += 1;
      if (a.attendanceStatus === 'NO_SHOW') doctorMap[a.doctorName].noShows += 1;
      if (a.status === 'RESCHEDULE_REQUESTED') doctorMap[a.doctorName].rescheduleRequested += 1;
    }

    // Department-wise analysis
    const deptMap: Record<string, any> = {};
    for (const a of appointments) {
      if (!deptMap[a.department]) {
        deptMap[a.department] = {
          department: a.department,
          booked: 0,
          confirmed: 0,
          attended: 0,
          noShows: 0,
        };
      }
      deptMap[a.department].booked += 1;
      if (['CONFIRMED', 'COMPLETED'].includes(a.status)) deptMap[a.department].confirmed += 1;
      if (['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)) deptMap[a.department].attended += 1;
      if (a.attendanceStatus === 'NO_SHOW') deptMap[a.department].noShows += 1;
    }

    // Language breakdown (for Pie & Cards)
    const languageColors: Record<string, string> = {
      bn: '#0d9488',
      hi: '#6366f1',
      en: '#0284c7',
    };
    const languageBreakdown = ['bn', 'hi', 'en'].map((lang) => {
      const lMsgs = messages.filter((m) => m.language === lang);
      const lAppts = appointments.filter((a) => a.preferredLanguage === lang);
      return {
        language: lang,
        name: lang === 'en' ? 'English (EN)' : lang === 'bn' ? 'Bengali (বাংলা)' : 'Hindi (हिन्दी)',
        label: lang === 'en' ? 'English' : lang === 'bn' ? 'Bengali (বাংলা)' : 'Hindi (हिन्दी)',
        value: lAppts.length,
        appointments: lAppts.length,
        messagesDispatched: lMsgs.length,
        delivered: lMsgs.filter((m) => ['DELIVERED', 'READ'].includes(m.status)).length,
        color: languageColors[lang],
      };
    });

    // Source breakdown
    const sourceColors: Record<string, string> = {
      HIS_API: '#0f766e',
      HIS_WEBHOOK: '#0284c7',
      SFTP_CSV: '#7c3aed',
      DEMO_SIMULATOR: '#f59e0b',
      CALL_CENTRE: '#ec4899',
    };
    const sourceMap: Record<string, number> = {};
    for (const a of appointments) {
      sourceMap[a.bookingSource] = (sourceMap[a.bookingSource] || 0) + 1;
    }
    const sourceBreakdown = Object.entries(sourceMap).map(([source, count]) => ({
      source,
      name: source.replace(/_/g, ' '),
      count,
      value: count,
      color: sourceColors[source] || '#64748b',
    }));

    // 1. Appointment Status Pie Distribution
    const statusDistribution = [
      {
        name: 'Confirmed',
        value: appointments.filter((a) => a.status === 'CONFIRMED').length,
        color: '#10b981',
      },
      {
        name: 'Completed (OPD)',
        value: appointments.filter((a) => a.status === 'COMPLETED').length,
        color: '#0d9488',
      },
      {
        name: 'Confirmation Pending',
        value: appointments.filter((a) => ['CONFIRMATION_PENDING', 'VALIDATED', 'RECEIVED'].includes(a.status)).length,
        color: '#f59e0b',
      },
      {
        name: 'Reschedule Requested',
        value: appointments.filter((a) => a.status === 'RESCHEDULE_REQUESTED').length,
        color: '#f97316',
      },
      {
        name: 'Cancellation Req / Cancelled',
        value: appointments.filter((a) => ['CANCELLATION_REQUESTED', 'CANCELLED'].includes(a.status)).length,
        color: '#ef4444',
      },
      {
        name: 'Verified No-Show',
        value: appointments.filter((a) => a.status === 'NO_SHOW').length,
        color: '#991b1b',
      },
    ].filter((item) => item.value > 0);

    // 2. WhatsApp Delivery Lifecycle Pie Distribution
    const deliveredOnly = Math.max(0, messagesDelivered - messagesRead);
    const sentOnly = Math.max(0, messagesSent - messagesDelivered);
    const whatsappLifecyclePie = [
      { name: 'Read by Patient', value: messagesRead, color: '#4f46e5' },
      { name: 'Delivered to Handset', value: deliveredOnly, color: '#0d9488' },
      { name: 'Submitted / Sent', value: sentOnly, color: '#0284c7' },
      { name: 'Suppressed (Holdout/STOP)', value: suppressedMessages, color: '#94a3b8' },
      { name: 'Delivery Failed', value: failedMessages, color: '#ef4444' },
    ].filter((item) => item.value > 0);

    // 3. Patient Response Intent Pie Distribution
    const responseActionPie = [
      {
        name: 'Confirm Visit',
        value: responses.filter((r) => r.mappedAction === 'CONFIRM').length,
        color: '#10b981',
      },
      {
        name: 'Reschedule Request',
        value: responses.filter((r) => r.mappedAction === 'RESCHEDULE').length,
        color: '#f97316',
      },
      {
        name: 'Cancel Request',
        value: responses.filter((r) => r.mappedAction === 'CANCEL').length,
        color: '#ef4444',
      },
      {
        name: 'Talk to Us / Help',
        value: responses.filter((r) => r.mappedAction === 'TALK_TO_US').length,
        color: '#8b5cf6',
      },
      {
        name: 'STOP / Opt-Out',
        value: responses.filter((r) => r.mappedAction === 'STOP').length,
        color: '#64748b',
      },
    ].filter((item) => item.value > 0);

    // 4. Attendance Outcome Pie Distribution
    const attendanceOutcomePie = [
      {
        name: 'Completed Consultation',
        value: appointments.filter((a) => a.attendanceStatus === 'COMPLETED').length,
        color: '#0d9488',
      },
      {
        name: 'Arrived / Registered',
        value: appointments.filter((a) => ['ARRIVED', 'REGISTERED'].includes(a.attendanceStatus)).length,
        color: '#10b981',
      },
      {
        name: 'Upcoming / Pending',
        value: appointments.filter((a) => a.attendanceStatus === 'PENDING').length,
        color: '#3b82f6',
      },
      {
        name: 'Verified No-Show',
        value: appointments.filter((a) => a.attendanceStatus === 'NO_SHOW').length,
        color: '#ef4444',
      },
      {
        name: 'Unmatched Walk-In',
        value: unmatchedAttendance,
        color: '#a855f7',
      },
    ].filter((item) => item.value > 0);

    // 5. Call-Centre Follow-Up Task Type Pie
    const followUpTaskPie = [
      {
        name: 'Reschedule Callback',
        value: tasks.filter((t) => t.taskType === 'RESCHEDULE_REQUEST').length,
        color: '#f97316',
      },
      {
        name: 'Cancellation Review',
        value: tasks.filter((t) => t.taskType === 'CANCELLATION_REVIEW').length,
        color: '#ef4444',
      },
      {
        name: 'No-Show Rebooking',
        value: tasks.filter((t) => t.taskType === 'NOSHOW_REBOOKING_ASSIST').length,
        color: '#eab308',
      },
      {
        name: 'Patient Help (Talk to Us)',
        value: tasks.filter((t) => t.taskType === 'TALK_TO_US_ASSISTANCE').length,
        color: '#8b5cf6',
      },
      {
        name: 'Delivery Failure Fallback',
        value: tasks.filter((t) => t.taskType === 'DELIVERY_FAILURE_FALLBACK').length,
        color: '#dc2626',
      },
    ].filter((item) => item.value > 0);

    // 6. Daily Chronological Trend
    const dateGroups: Record<string, { date: string; booked: number; confirmed: number; attended: number; noShows: number }> = {};
    for (const a of appointments) {
      const dStr = new Date(a.appointmentDate).toISOString().slice(5, 10); // MM-DD
      if (!dateGroups[dStr]) {
        dateGroups[dStr] = { date: dStr, booked: 0, confirmed: 0, attended: 0, noShows: 0 };
      }
      dateGroups[dStr].booked += 1;
      if (['CONFIRMED', 'COMPLETED'].includes(a.status)) dateGroups[dStr].confirmed += 1;
      if (['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)) dateGroups[dStr].attended += 1;
      if (a.attendanceStatus === 'NO_SHOW') dateGroups[dStr].noShows += 1;
    }
    const dailyTrend = Object.values(dateGroups).sort((a, b) => a.date.localeCompare(b.date));

    return {
      kpis: {
        appointmentsReceived,
        confirmedAppointments,
        confirmationPending,
        messagesSent,
        messagesDelivered,
        messagesRead,
        failedMessages,
        suppressedMessages,
        rescheduleRequests,
        cancellationRequests,
        assistanceRequests,
        registeredPatients,
        completedAppointments,
        noShows,
        unmatchedAttendance,
        attendanceConversionRate,
        deliveryRate,
        readRate,
        confirmationRate,
        pendingFollowUps,
      },
      denominatorsNote: {
        deliveryRate: 'Messages Delivered / Messages Submitted & Sent to Meta Cloud API',
        confirmationRate: 'Patient Confirmed Appointments / Total Appointments Received',
        attendanceConversionRate:
          'HIS Arrived/Registered/Completed Visits / Total Reconciled HIS Visit Outcomes (Excludes Unmatched Records)',
      },
      hospitalComparison,
      doctorAnalysis: Object.values(doctorMap),
      departmentAnalysis: Object.values(deptMap),
      languageBreakdown,
      sourceBreakdown,
      statusDistribution,
      whatsappLifecyclePie,
      responseActionPie,
      attendanceOutcomePie,
      followUpTaskPie,
      dailyTrend,
    };
  }
}
