import snapshotData from './db-snapshot.json';

const STORAGE_KEY = 'anhvl_live_runtime_state_v1';

function getRuntimeState(): any {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  const cloned = JSON.parse(JSON.stringify(snapshotData));
  return cloned;
}

function saveRuntimeState(state: any) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function computeOverview(state: any, hospitalId?: string | null, fromDate?: string | null, toDate?: string | null) {
  const hid = hospitalId && hospitalId !== 'ALL' ? hospitalId : null;
  let appointments = state.appointments || [];
  let messages = (state.messages || []).filter((m: any) => m.direction === 'OUTBOUND');
  let tasks = state.followups || [];
  let responses = state.responses || [];
  let attendanceRecords = state.attendance?.records || [];
  const hospitals = state.hospitals || [];

  if (hid) {
    appointments = appointments.filter((a: any) => a.hospitalId === hid);
    messages = messages.filter((m: any) => m.hospitalId === hid);
    tasks = tasks.filter((t: any) => t.hospitalId === hid);
    responses = responses.filter((r: any) => r.hospitalId === hid);
    attendanceRecords = attendanceRecords.filter((r: any) => r.hospitalId === hid);
  }

  if (fromDate) {
    appointments = appointments.filter((a: any) => new Date(a.appointmentDate) >= new Date(fromDate));
  }
  if (toDate) {
    appointments = appointments.filter((a: any) => new Date(a.appointmentDate) <= new Date(toDate));
  }

  const appointmentsReceived = appointments.length;
  const confirmedAppointments = appointments.filter((a: any) => ['CONFIRMED', 'COMPLETED'].includes(a.status)).length;
  const confirmationPending = appointments.filter((a: any) => ['CONFIRMATION_PENDING', 'VALIDATED'].includes(a.status)).length;

  const messagesSent = messages.filter((m: any) => ['SUBMITTED', 'SENT', 'DELIVERED', 'READ'].includes(m.status)).length;
  const messagesDelivered = messages.filter((m: any) => ['DELIVERED', 'READ'].includes(m.status)).length;
  const messagesRead = messages.filter((m: any) => m.status === 'READ').length;
  const failedMessages = messages.filter((m: any) => m.status === 'FAILED').length;
  const suppressedMessages = messages.filter((m: any) => m.status === 'SUPPRESSED').length;

  const rescheduleRequests =
    appointments.filter((a: any) => a.status === 'RESCHEDULE_REQUESTED').length ||
    responses.filter((r: any) => r.mappedAction === 'RESCHEDULE').length;
  const cancellationRequests =
    appointments.filter((a: any) => a.status === 'CANCELLATION_REQUESTED').length ||
    responses.filter((r: any) => r.mappedAction === 'CANCEL').length;
  const assistanceRequests = responses.filter((r: any) => r.mappedAction === 'TALK_TO_US').length;

  const registeredPatients = appointments.filter((a: any) =>
    ['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)
  ).length;
  const completedAppointments = appointments.filter(
    (a: any) => a.status === 'COMPLETED' || a.attendanceStatus === 'COMPLETED'
  ).length;
  const noShows = appointments.filter(
    (a: any) => a.status === 'NO_SHOW' || a.attendanceStatus === 'NO_SHOW'
  ).length;
  const unmatchedAttendance = attendanceRecords.filter((r: any) => r.matchStatus === 'UNMATCHED').length;

  const pendingFollowUps = tasks.filter((t: any) =>
    ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'REOPENED'].includes(t.status)
  ).length;

  const deliveryRate = messagesSent > 0 ? Number(((messagesDelivered / messagesSent) * 100).toFixed(1)) : 0;
  const readRate = messagesDelivered > 0 ? Number(((messagesRead / messagesDelivered) * 100).toFixed(1)) : 0;
  const confirmationRate =
    appointmentsReceived > 0 ? Number(((confirmedAppointments / appointmentsReceived) * 100).toFixed(1)) : 0;
  const reconciledDenominator = registeredPatients + noShows;
  const attendanceConversionRate =
    reconciledDenominator > 0 ? Number(((registeredPatients / reconciledDenominator) * 100).toFixed(1)) : 0;

  const hospitalComparison = hospitals.map((h: any) => {
    const hAppts = appointments.filter((a: any) => a.hospitalId === h.id);
    const hMsgs = messages.filter((m: any) => m.hospitalId === h.id);
    const hTasks = tasks.filter((t: any) => t.hospitalId === h.id);
    const hSent = hMsgs.filter((m: any) => ['SUBMITTED', 'SENT', 'DELIVERED', 'READ'].includes(m.status)).length;
    const hDeliv = hMsgs.filter((m: any) => ['DELIVERED', 'READ'].includes(m.status)).length;
    return {
      hospitalId: h.id,
      hospitalCode: h.code,
      hospitalName: h.name,
      city: h.city,
      appointments: hAppts.length,
      confirmed: hAppts.filter((a: any) => ['CONFIRMED', 'COMPLETED'].includes(a.status)).length,
      attended: hAppts.filter((a: any) => ['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)).length,
      noShows: hAppts.filter((a: any) => a.attendanceStatus === 'NO_SHOW').length,
      messagesSent: hSent,
      messagesDelivered: hDeliv,
      deliveryRate: hSent > 0 ? Number(((hDeliv / hSent) * 100).toFixed(1)) : 0,
      openTasks: hTasks.filter((t: any) => t.status !== 'RESOLVED').length,
    };
  });

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

  const languageColors: Record<string, string> = { bn: '#0d9488', hi: '#6366f1', en: '#0284c7' };
  const languageBreakdown = ['bn', 'hi', 'en'].map((lang) => {
    const lMsgs = messages.filter((m: any) => m.language === lang);
    const lAppts = appointments.filter((a: any) => a.preferredLanguage === lang);
    return {
      language: lang,
      name: lang === 'en' ? 'English (EN)' : lang === 'bn' ? 'Bengali (বাংলা)' : 'Hindi (हिन्दी)',
      label: lang === 'en' ? 'English' : lang === 'bn' ? 'Bengali (বাংলা)' : 'Hindi (हिन्दी)',
      value: lAppts.length,
      appointments: lAppts.length,
      messagesDispatched: lMsgs.length,
      delivered: lMsgs.filter((m: any) => ['DELIVERED', 'READ'].includes(m.status)).length,
      color: languageColors[lang],
    };
  });

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

  const statusDistribution = [
    { name: 'Confirmed', value: appointments.filter((a: any) => a.status === 'CONFIRMED').length, color: '#10b981' },
    { name: 'Completed (OPD)', value: appointments.filter((a: any) => a.status === 'COMPLETED').length, color: '#0d9488' },
    {
      name: 'Confirmation Pending',
      value: appointments.filter((a: any) => ['CONFIRMATION_PENDING', 'VALIDATED', 'RECEIVED'].includes(a.status)).length,
      color: '#f59e0b',
    },
    { name: 'Reschedule Requested', value: appointments.filter((a: any) => a.status === 'RESCHEDULE_REQUESTED').length, color: '#f97316' },
    {
      name: 'Cancellation Req / Cancelled',
      value: appointments.filter((a: any) => ['CANCELLATION_REQUESTED', 'CANCELLED'].includes(a.status)).length,
      color: '#ef4444',
    },
    { name: 'Verified No-Show', value: appointments.filter((a: any) => a.status === 'NO_SHOW').length, color: '#991b1b' },
  ].filter((item) => item.value > 0);

  const deliveredOnly = Math.max(0, messagesDelivered - messagesRead);
  const sentOnly = Math.max(0, messagesSent - messagesDelivered);
  const whatsappLifecyclePie = [
    { name: 'Read by Patient', value: messagesRead, color: '#4f46e5' },
    { name: 'Delivered to Handset', value: deliveredOnly, color: '#0d9488' },
    { name: 'Submitted / Sent', value: sentOnly, color: '#0284c7' },
    { name: 'Suppressed (Holdout/STOP)', value: suppressedMessages, color: '#94a3b8' },
    { name: 'Delivery Failed', value: failedMessages, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  const responseActionPie = [
    { name: 'Confirm Visit', value: responses.filter((r: any) => r.mappedAction === 'CONFIRM').length, color: '#10b981' },
    { name: 'Reschedule Request', value: responses.filter((r: any) => r.mappedAction === 'RESCHEDULE').length, color: '#f97316' },
    { name: 'Cancel Request', value: responses.filter((r: any) => r.mappedAction === 'CANCEL').length, color: '#ef4444' },
    { name: 'Talk to Us / Help', value: responses.filter((r: any) => r.mappedAction === 'TALK_TO_US').length, color: '#8b5cf6' },
    { name: 'STOP / Opt-Out', value: responses.filter((r: any) => r.mappedAction === 'STOP').length, color: '#64748b' },
  ].filter((item) => item.value > 0);

  const attendanceOutcomePie = [
    { name: 'Completed Consultation', value: appointments.filter((a: any) => a.attendanceStatus === 'COMPLETED').length, color: '#0d9488' },
    { name: 'Arrived / Registered', value: appointments.filter((a: any) => ['ARRIVED', 'REGISTERED'].includes(a.attendanceStatus)).length, color: '#10b981' },
    { name: 'Upcoming / Pending', value: appointments.filter((a: any) => a.attendanceStatus === 'PENDING').length, color: '#3b82f6' },
    { name: 'Verified No-Show', value: appointments.filter((a: any) => a.attendanceStatus === 'NO_SHOW').length, color: '#ef4444' },
    { name: 'Unmatched Walk-In', value: unmatchedAttendance, color: '#a855f7' },
  ].filter((item) => item.value > 0);

  const followUpTaskPie = [
    { name: 'Reschedule Callback', value: tasks.filter((t: any) => t.taskType === 'RESCHEDULE_REQUEST').length, color: '#f97316' },
    { name: 'Cancellation Review', value: tasks.filter((t: any) => t.taskType === 'CANCELLATION_REVIEW').length, color: '#ef4444' },
    { name: 'No-Show Rebooking', value: tasks.filter((t: any) => t.taskType === 'NOSHOW_REBOOKING_ASSIST').length, color: '#eab308' },
    { name: 'Patient Help (Talk to Us)', value: tasks.filter((t: any) => t.taskType === 'TALK_TO_US_ASSISTANCE').length, color: '#8b5cf6' },
    { name: 'Delivery Failure Fallback', value: tasks.filter((t: any) => t.taskType === 'DELIVERY_FAILURE_FALLBACK').length, color: '#dc2626' },
  ].filter((item) => item.value > 0);

  const dateGroups: Record<string, any> = {};
  for (const a of appointments) {
    const dStr = new Date(a.appointmentDate).toISOString().slice(5, 10);
    if (!dateGroups[dStr]) {
      dateGroups[dStr] = { date: dStr, booked: 0, confirmed: 0, attended: 0, noShows: 0 };
    }
    dateGroups[dStr].booked += 1;
    if (['CONFIRMED', 'COMPLETED'].includes(a.status)) dateGroups[dStr].confirmed += 1;
    if (['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.attendanceStatus)) dateGroups[dStr].attended += 1;
    if (a.attendanceStatus === 'NO_SHOW') dateGroups[dStr].noShows += 1;
  }
  const dailyTrend = Object.values(dateGroups).sort((a: any, b: any) => a.date.localeCompare(b.date));

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
    denominatorsNote: state.overview?.denominatorsNote || {},
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

export function handleFallbackRequest(path: string, options: RequestInit = {}): any {
  const state = getRuntimeState();
  const method = (options.method || 'GET').toUpperCase();
  const parsedUrl = new URL(path, 'http://localhost');
  const pathname = parsedUrl.pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  const sp = parsedUrl.searchParams;
  const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};

  if (pathname === '/auth/login' && method === 'POST') {
    const email = (body.email || 'superadmin@anhvl-demo.in').toLowerCase().trim();
    const matchedUser =
      (state.users || []).find((u: any) => u.email.toLowerCase() === email) || state.users?.[0];
    const roleCode = matchedUser?.role?.code || 'SUPER_ADMIN';
    const hospital = (state.hospitals || []).find((h: any) => h.id === matchedUser?.hospitalId);
    const sessionUser = {
      id: matchedUser?.id || 'demo-user-1',
      email: matchedUser?.email || email,
      fullName: matchedUser?.fullName || 'Arindam Sen (Plan D / ANHVL Super Admin)',
      roleCode,
      roleName: matchedUser?.role?.name || 'Super Administrator',
      hospitalId: matchedUser?.hospitalId || null,
      hospitalName: hospital ? hospital.name : 'All ANHVL Hospitals (Kolkata & Raipur)',
      hospitalCode: hospital ? hospital.code : 'ALL',
      permissions: ['appointments:manage', 'messages:manage', 'templates:manage', 'reports:manage', 'settings:manage'],
    };
    return {
      success: true,
      data: {
        accessToken: `demo-jwt-${sessionUser.id}`,
        refreshToken: `demo-refresh-${sessionUser.id}`,
        expiresIn: 28800,
        user: sessionUser,
      },
    };
  }

  if (pathname === '/auth/logout') {
    return { success: true, data: { loggedOut: true } };
  }

  if (pathname === '/settings/health') {
    return {
      ...state.health,
      timestamp: new Date().toISOString(),
      database: {
        ...state.health?.database,
        appointmentsCount: (state.appointments || []).length,
      },
    };
  }

  if (pathname === '/settings' && method === 'GET') {
    return { success: true, data: state.settings };
  }

  if (pathname === '/settings/mode' && method === 'POST') {
    if (body.mode === 'PRODUCTION') {
      throw new Error('Cannot switch to PRODUCTION mode while Meta WhatsApp, HIS, and Altruist credentials are unverified.');
    }
    return { success: true, data: { mode: 'DEMO' } };
  }

  if (pathname === '/hospitals' && method === 'GET') {
    return { success: true, data: state.hospitals };
  }

  if (pathname.startsWith('/hospitals/') && method === 'PATCH') {
    const id = pathname.split('/')[2];
    const hosp = (state.hospitals || []).find((h: any) => h.id === id);
    if (hosp && hosp.configuration) {
      Object.assign(hosp.configuration, body);
      saveRuntimeState(state);
    }
    return { success: true, data: hosp };
  }

  if (pathname === '/reports/overview' && method === 'GET') {
    return {
      success: true,
      data: computeOverview(state, sp.get('hospitalId'), sp.get('fromDate'), sp.get('toDate')),
    };
  }

  if (pathname === '/appointments' && method === 'GET') {
    let list = [...(state.appointments || [])];
    const hid = sp.get('hospitalId');
    const status = sp.get('status');
    const attendanceStatus = sp.get('attendanceStatus');
    const search = (sp.get('search') || '').toLowerCase();

    if (hid && hid !== 'ALL') list = list.filter((a: any) => a.hospitalId === hid);
    if (status && status !== 'ALL') list = list.filter((a: any) => a.status === status);
    if (attendanceStatus && attendanceStatus !== 'ALL') list = list.filter((a: any) => a.attendanceStatus === attendanceStatus);
    if (search) {
      list = list.filter(
        (a: any) =>
          a.bookingId?.toLowerCase().includes(search) ||
          a.patientName?.toLowerCase().includes(search) ||
          a.mobileNumber?.toLowerCase().includes(search) ||
          a.doctorName?.toLowerCase().includes(search)
      );
    }
    return { success: true, data: list, meta: { total: list.length } };
  }

  if (pathname === '/appointments' && method === 'POST') {
    const hosp = (state.hospitals || []).find((h: any) => h.id === body.hospitalId) || state.hospitals[0];
    const existing = (state.appointments || []).find(
      (a: any) => a.hospitalId === hosp.id && a.bookingId === body.bookingId
    );
    if (existing) {
      return { success: true, data: { deduplicated: true, action: 'UPDATED_EXISTING', appointment: existing } };
    }
    const newAppt = {
      id: `appt-${Date.now()}`,
      bookingId: body.bookingId || `BK-${Date.now().toString().slice(-5)}`,
      hospitalId: hosp.id,
      hospital: hosp,
      patientName: body.patientName,
      mobileNumber: body.mobileNumber,
      preferredLanguage: body.preferredLanguage || 'en',
      department: body.department || 'Obstetrics & Gynaecology',
      doctorName: body.doctorName || 'Dr. Ananya Chatterjee',
      appointmentDate: body.appointmentDate || new Date().toISOString(),
      appointmentTime: body.appointmentTime || '11:00',
      bookingSource: body.bookingSource || 'HIS_API',
      consentStatus: body.consentStatus || 'GRANTED',
      status: 'CONFIRMATION_PENDING',
      attendanceStatus: 'PENDING',
      isFirstVisit: Boolean(body.isFirstVisit),
      isSyntheticDemo: true,
      createdAt: new Date().toISOString(),
      events: [
        {
          id: `evt-${Date.now()}`,
          eventType: 'INGESTED',
          newStatus: 'CONFIRMATION_PENDING',
          description: `Ingested appointment ${body.bookingId} and dispatched WhatsApp confirmation.`,
          createdAt: new Date().toISOString(),
        },
      ],
      scheduledMessages: [],
      messageLogs: [],
      patientResponses: [],
      followUpTasks: [],
      attendanceRecords: [],
    };
    state.appointments.unshift(newAppt);
    saveRuntimeState(state);
    return { success: true, data: { deduplicated: false, action: 'CREATED_NEW', appointment: newAppt } };
  }

  if (pathname === '/appointments/bulk-import' && method === 'POST') {
    const records = body.records || [];
    return {
      success: true,
      data: { totalRecords: records.length, insertedRecords: records.length, updatedRecords: 0, failedRecords: 0 },
    };
  }

  if (pathname.startsWith('/appointments/') && pathname.endsWith('/cancel') && method === 'POST') {
    const id = pathname.split('/')[2];
    const appt = (state.appointments || []).find((a: any) => a.id === id);
    if (appt) {
      appt.status = 'CANCELLED';
      appt.attendanceStatus = 'CANCELLED';
      saveRuntimeState(state);
    }
    return { success: true, data: appt };
  }

  if (pathname.startsWith('/appointments/') && method === 'GET') {
    const id = pathname.split('/')[2];
    const appt = (state.appointments || []).find((a: any) => a.id === id) || state.appointments?.[0];
    return { success: true, data: appt };
  }

  if (pathname === '/patients' && method === 'GET') {
    let list = state.patients || [];
    const hid = sp.get('hospitalId');
    if (hid && hid !== 'ALL') list = list.filter((p: any) => p.hospitalId === hid);
    return { success: true, data: list };
  }

  if (pathname === '/messages' && method === 'GET') {
    let list = state.messages || [];
    const hid = sp.get('hospitalId');
    const st = sp.get('status');
    if (hid && hid !== 'ALL') list = list.filter((m: any) => m.hospitalId === hid);
    if (st && st !== 'ALL') list = list.filter((m: any) => m.status === st);
    return { success: true, data: list };
  }

  if (pathname === '/messages/test' && method === 'POST') {
    return { success: true, data: { dispatched: true, status: 'DELIVERED' } };
  }

  if (pathname === '/webhooks/whatsapp' && method === 'POST') {
    const msg = (state.messages || []).find((m: any) => m.whatsappMessageId === body.whatsappMessageId);
    if (msg && body.status) {
      msg.status = body.status.toUpperCase();
      saveRuntimeState(state);
    }
    return { success: true, data: { processed: true } };
  }

  if (pathname === '/templates' && method === 'GET') {
    let list = state.templates || [];
    const hid = sp.get('hospitalId');
    const lang = sp.get('language');
    if (hid && hid !== 'ALL') list = list.filter((t: any) => t.hospitalId === hid);
    if (lang && lang !== 'ALL') list = list.filter((t: any) => t.language === lang);
    return { success: true, data: list };
  }

  if (pathname === '/templates' && method === 'POST') {
    const text = (body.bodyText || '').toLowerCase();
    const clinicalTerms = ['diagnosis', 'prescription', 'hiv', 'biopsy', 'lab report', 'chemotherapy'];
    const found = clinicalTerms.find((w) => text.includes(w));
    if (found) {
      throw new Error(`Non-Clinical Safeguard Violation: Prohibited clinical term "${found}" detected.`);
    }
    const created = {
      id: `tpl-${Date.now()}`,
      ...body,
      activeVersion: 1,
      approvalStatus: 'APPROVED_DEMO',
      versions: [{ id: `ver-${Date.now()}`, versionNumber: 1, bodyText: body.bodyText, variables: [], interactiveButtons: [] }],
    };
    state.templates.unshift(created);
    saveRuntimeState(state);
    return { success: true, data: created };
  }

  if (pathname.startsWith('/templates/') && pathname.endsWith('/approval') && method === 'PATCH') {
    const id = pathname.split('/')[2];
    const tpl = (state.templates || []).find((t: any) => t.id === id);
    if (tpl) {
      tpl.approvalStatus = body.approvalStatus;
      saveRuntimeState(state);
    }
    return { success: true, data: tpl };
  }

  if (pathname === '/scheduler/jobs' && method === 'GET') {
    let list = state.schedulerJobs || [];
    const hid = sp.get('hospitalId');
    const st = sp.get('status');
    if (hid && hid !== 'ALL') list = list.filter((j: any) => j.hospitalId === hid);
    if (st && st !== 'ALL') list = list.filter((j: any) => j.status === st);
    return { success: true, data: list };
  }

  if (pathname.startsWith('/scheduler/jobs/') && pathname.endsWith('/execute') && method === 'POST') {
    const id = pathname.split('/')[3];
    const job = (state.schedulerJobs || []).find((j: any) => j.id === id);
    if (job) {
      job.status = 'COMPLETED';
      job.executedAt = new Date().toISOString();
      saveRuntimeState(state);
    }
    return { success: true, data: job };
  }

  if (pathname === '/responses' && method === 'GET') {
    let list = state.responses || [];
    const hid = sp.get('hospitalId');
    const act = sp.get('action');
    if (hid && hid !== 'ALL') list = list.filter((r: any) => r.hospitalId === hid);
    if (act && act !== 'ALL') list = list.filter((r: any) => r.mappedAction === act);
    return { success: true, data: list };
  }

  if (pathname === '/responses/capture' && method === 'POST') {
    const appt = (state.appointments || []).find((a: any) => a.id === body.appointmentId);
    const raw = (body.rawResponseText || '').toUpperCase();
    const mappedAction = raw.includes('RESCHEDULE')
      ? 'RESCHEDULE'
      : raw.includes('CANCEL')
      ? 'CANCEL'
      : raw.includes('STOP')
      ? 'STOP'
      : raw.includes('TALK')
      ? 'TALK_TO_US'
      : 'CONFIRM';

    if (appt) {
      if (mappedAction === 'CONFIRM') appt.status = 'CONFIRMED';
      if (mappedAction === 'RESCHEDULE') appt.status = 'RESCHEDULE_REQUESTED';
      if (mappedAction === 'CANCEL') appt.status = 'CANCELLATION_REQUESTED';
      if (mappedAction === 'STOP') appt.consentStatus = 'REVOKED';
    }
    const newResp = {
      id: `resp-${Date.now()}`,
      appointmentId: appt?.id,
      hospitalId: appt?.hospitalId,
      appointment: appt,
      patient: appt?.patient,
      hospital: appt?.hospital,
      rawResponseText: body.rawResponseText,
      mappedAction,
      acknowledgementSent: mappedAction !== 'STOP',
      followUpTriggered: ['RESCHEDULE', 'CANCEL', 'TALK_TO_US'].includes(mappedAction),
      receivedAt: new Date().toISOString(),
    };
    state.responses.unshift(newResp);
    saveRuntimeState(state);
    return { success: true, data: { mappedAction, response: newResp } };
  }

  if (pathname === '/followups' && method === 'GET') {
    let list = state.followups || [];
    const hid = sp.get('hospitalId');
    const st = sp.get('status');
    const tt = sp.get('taskType');
    if (hid && hid !== 'ALL') list = list.filter((t: any) => t.hospitalId === hid);
    if (st && st !== 'ALL') list = list.filter((t: any) => t.status === st);
    if (tt && tt !== 'ALL') list = list.filter((t: any) => t.taskType === tt);
    return { success: true, data: list };
  }

  if (pathname.startsWith('/followups/') && method === 'PATCH') {
    const id = pathname.split('/')[2];
    const task = (state.followups || []).find((t: any) => t.id === id);
    if (task) {
      if (body.status) task.status = body.status;
      if (body.resolutionNotes) task.resolutionNotes = body.resolutionNotes;
      if (body.note) {
        task.internalNotes = [...(task.internalNotes || []), { author: 'Agent', timestamp: new Date().toISOString(), note: body.note }];
      }
      saveRuntimeState(state);
    }
    return { success: true, data: task };
  }

  if (pathname === '/users/agents' && method === 'GET') {
    let list = state.agents || [];
    const hid = sp.get('hospitalId');
    if (hid && hid !== 'ALL') list = list.filter((a: any) => a.hospitalId === hid);
    return { success: true, data: list };
  }

  if (pathname.startsWith('/users/agents/') && pathname.endsWith('/status') && method === 'PATCH') {
    const id = pathname.split('/')[3];
    const agent = (state.agents || []).find((a: any) => a.id === id);
    if (agent) {
      agent.status = body.status;
      saveRuntimeState(state);
    }
    return { success: true, data: agent };
  }

  if (pathname === '/consent' && method === 'GET') {
    let list = state.consent || [];
    const hid = sp.get('hospitalId');
    if (hid && hid !== 'ALL') list = list.filter((c: any) => c.hospitalId === hid);
    return { success: true, data: list };
  }

  if (pathname.startsWith('/consent/') && method === 'PATCH') {
    const id = pathname.split('/')[2];
    const rec = (state.consent || []).find((c: any) => c.id === id);
    if (rec) {
      rec.consentStatus = body.consentStatus;
      rec.optOutStatus = body.consentStatus === 'REVOKED';
      rec.communicationEligible = body.consentStatus === 'GRANTED';
      saveRuntimeState(state);
    }
    return { success: true, data: rec };
  }

  if (pathname === '/attendance' && method === 'GET') {
    return { success: true, data: state.attendance };
  }

  if (pathname === '/attendance/reconcile' && method === 'POST') {
    const appt = (state.appointments || []).find((a: any) => a.bookingId === body.bookingId);
    const matchStatus = appt ? 'MATCHED' : 'UNMATCHED';
    const outcomeStatus = appt ? body.outcomeStatus || 'COMPLETED' : 'UNMATCHED';
    if (appt) {
      appt.attendanceStatus = outcomeStatus;
      if (outcomeStatus === 'COMPLETED') appt.status = 'COMPLETED';
      if (outcomeStatus === 'NO_SHOW') appt.status = 'NO_SHOW';
    }
    const newRec = {
      id: `att-${Date.now()}`,
      externalVisitId: `HIS-VIS-${Date.now().toString().slice(-5)}`,
      bookingId: body.bookingId,
      appointmentId: appt?.id || null,
      hospitalId: body.hospitalId || state.hospitals?.[0]?.id,
      outcomeStatus,
      matchStatus,
      rebookingPromptSent: outcomeStatus === 'NO_SHOW' && matchStatus === 'MATCHED',
      reconciledAt: new Date().toISOString(),
    };
    if (state.attendance?.records) {
      state.attendance.records.unshift(newRec);
    }
    saveRuntimeState(state);
    return {
      success: true,
      data: { matchStatus, outcomeStatus, rebookingPromptSent: newRec.rebookingPromptSent, record: newRec },
    };
  }

  if (pathname === '/integrations' && method === 'GET') {
    let configs = state.integrations?.configs || [];
    let logs = state.integrations?.logs || [];
    const hid = sp.get('hospitalId');
    const it = sp.get('integrationType');
    if (hid && hid !== 'ALL') {
      configs = configs.filter((c: any) => !c.hospitalId || c.hospitalId === hid);
      logs = logs.filter((l: any) => !l.hospitalId || l.hospitalId === hid);
    }
    if (it) {
      configs = configs.filter((c: any) => c.integrationType === it);
      logs = logs.filter((l: any) => l.integrationType === it);
    }
    return { success: true, data: { configs, logs } };
  }

  if (pathname === '/integrations/test' && method === 'POST') {
    return {
      success: true,
      data: {
        status: 'DEMO_SIMULATED',
        message: 'Verified adapter schema & simulated handshake in DEMO mode. Live production endpoint requires ANHVL IT credentials.',
      },
    };
  }

  if (pathname === '/pilot' && method === 'GET') {
    return { success: true, data: state.pilot };
  }

  if (pathname === '/users' && method === 'GET') {
    return { success: true, data: state.users };
  }

  if (pathname === '/users/roles' && method === 'GET') {
    return { success: true, data: state.roles };
  }

  if (pathname === '/audit-logs' && method === 'GET') {
    return { success: true, data: state.auditLogs };
  }

  if (pathname === '/simulator' && method === 'GET') {
    return { success: true, data: state.simulator };
  }

  if (pathname === '/simulator/start' && method === 'POST') {
    const sim = state.simulator;
    const found = (sim.scenarios || []).find((s: any) => s.id === body.scenarioId) || sim.scenarios?.[0];
    sim.currentScenario = found;
    sim.state.activeScenarioId = found.id;
    sim.state.currentStep = 1;
    sim.state.isRunning = true;
    sim.state.isPaused = false;
    sim.state.whatsappHandsetMessages = [
      {
        id: `msg-${Date.now()}`,
        sender: 'SYSTEM',
        text: `[DEMO SIMULATOR] Initialized ${found.title} (${found.hospitalCode}, ${found.language.toUpperCase()})`,
        timestamp: new Date().toISOString(),
      },
      {
        id: `msg-wa-${Date.now()}`,
        sender: 'HOSPITAL',
        text:
          found.language === 'bn'
            ? `নমস্কার, ভাগীরথী নেওটিয়া নিউ টাউন হাসপাতালে আপনার ওপিডি অ্যাপয়েন্টমেন্ট নিশ্চিত করা হয়েছে। অনুগ্রহ করে নিচের বোতামটি বেছে নিন।`
            : found.language === 'hi'
            ? `नमस्कार, नेओटिया भागीरथी रायपुर अस्पताल में आपकी ओपीडी अपॉइंटमेंट बुक हो गई है। कृपया नीचे पुष्टि करें।`
            : `Namaskar, your OPD appointment at ANHVL Hospital is scheduled. Please confirm or manage your visit below.`,
        timestamp: new Date().toISOString(),
        status: 'DELIVERED',
        buttons: [
          { id: 'BTN_CONFIRM', label: 'Confirm Appointment', action: 'CONFIRM' },
          { id: 'BTN_RESCHEDULE', label: 'Reschedule', action: 'RESCHEDULE' },
          { id: 'BTN_CANCEL', label: 'Cancel', action: 'CANCEL' },
          { id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' },
        ],
      },
    ];
    sim.state.eventHistory.unshift({
      step: 1,
      timestamp: new Date().toISOString(),
      module: 'HIS_INGESTION_AND_WHATSAPP',
      summary: `Executed Step 1 of ${found.title}`,
      status: 'COMPLETED',
    });
    saveRuntimeState(state);
    return { success: true, data: sim };
  }

  if (pathname === '/simulator/next-step' && method === 'POST') {
    const sim = state.simulator;
    const scenario = sim.currentScenario || sim.scenarios?.[0];
    if (sim.state.currentStep < scenario.totalSteps) {
      sim.state.currentStep += 1;
      const stepLabel = scenario.steps[sim.state.currentStep - 1] || `Step ${sim.state.currentStep}`;
      sim.state.whatsappHandsetMessages.push({
        id: `step-${Date.now()}`,
        sender: sim.state.currentStep % 2 === 0 ? 'PATIENT' : 'HOSPITAL',
        text: `[Step ${sim.state.currentStep}/${scenario.totalSteps}] ${stepLabel}`,
        timestamp: new Date().toISOString(),
        status: 'READ',
      });
      sim.state.eventHistory.unshift({
        step: sim.state.currentStep,
        timestamp: new Date().toISOString(),
        module: 'WORKFLOW_ORCHESTRATOR',
        summary: stepLabel,
        status: 'COMPLETED',
      });
      saveRuntimeState(state);
    }
    return { success: true, data: sim };
  }

  if (pathname === '/simulator/advance-clock' && method === 'POST') {
    const sim = state.simulator;
    const mins = Number(body.minutes || 60);
    sim.state.simulatedClockIso = new Date(new Date(sim.state.simulatedClockIso).getTime() + mins * 60000).toISOString();
    saveRuntimeState(state);
    return { success: true, data: sim };
  }

  if (pathname === '/simulator/pause' && method === 'POST') {
    state.simulator.state.isPaused = Boolean(body.paused);
    saveRuntimeState(state);
    return { success: true, data: state.simulator };
  }

  if (pathname === '/simulator/reset' && method === 'POST') {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = getRuntimeState();
    return { success: true, data: fresh.simulator };
  }

  return { success: true, data: {} };
}
