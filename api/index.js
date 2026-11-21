const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SNAPSHOT_PATH = path.join(__dirname, 'db-snapshot.json');
const TMP_STATE_PATH = path.join(os.tmpdir(), 'anhvl-vercel-runtime-state-v1.json');

let memoryState = null;

function getState() {
  if (memoryState) return memoryState;
  try {
    if (fs.existsSync(TMP_STATE_PATH)) {
      memoryState = JSON.parse(fs.readFileSync(TMP_STATE_PATH, 'utf8'));
      return memoryState;
    }
  } catch {
    // ignore
  }
  memoryState = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  return memoryState;
}

function saveState(state) {
  memoryState = state;
  try {
    fs.writeFileSync(TMP_STATE_PATH, JSON.stringify(state));
  } catch {
    // ignore tmp write errors
  }
}

function computeOverview(state, hospitalId, fromDate, toDate) {
  const hid = hospitalId && hospitalId !== 'ALL' ? hospitalId : null;
  let appointments = state.appointments || [];
  let messages = (state.messages || []).filter((m) => m.direction === 'OUTBOUND');
  let tasks = state.followups || [];
  let responses = state.responses || [];
  let attendanceRecords = state.attendance?.records || [];
  const hospitals = state.hospitals || [];

  if (hid) {
    appointments = appointments.filter((a) => a.hospitalId === hid);
    messages = messages.filter((m) => m.hospitalId === hid);
    tasks = tasks.filter((t) => t.hospitalId === hid);
    responses = responses.filter((r) => r.hospitalId === hid);
    attendanceRecords = attendanceRecords.filter((r) => r.hospitalId === hid);
  }

  if (fromDate) {
    appointments = appointments.filter((a) => new Date(a.appointmentDate) >= new Date(fromDate));
  }
  if (toDate) {
    appointments = appointments.filter((a) => new Date(a.appointmentDate) <= new Date(toDate));
  }

  const appointmentsReceived = appointments.length;
  const confirmedAppointments = appointments.filter((a) => ['CONFIRMED', 'COMPLETED'].includes(a.status)).length;
  const confirmationPending = appointments.filter((a) => ['CONFIRMATION_PENDING', 'VALIDATED'].includes(a.status)).length;

  const messagesSent = messages.filter((m) => ['SUBMITTED', 'SENT', 'DELIVERED', 'READ'].includes(m.status)).length;
  const messagesDelivered = messages.filter((m) => ['DELIVERED', 'READ'].includes(m.status)).length;
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
  const unmatchedAttendance = attendanceRecords.filter((r) => r.matchStatus === 'UNMATCHED').length;

  const pendingFollowUps = tasks.filter((t) =>
    ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'REOPENED'].includes(t.status)
  ).length;

  const deliveryRate = messagesSent > 0 ? Number(((messagesDelivered / messagesSent) * 100).toFixed(1)) : 0;
  const readRate = messagesDelivered > 0 ? Number(((messagesRead / messagesDelivered) * 100).toFixed(1)) : 0;
  const confirmationRate =
    appointmentsReceived > 0 ? Number(((confirmedAppointments / appointmentsReceived) * 100).toFixed(1)) : 0;
  const reconciledDenominator = registeredPatients + noShows;
  const attendanceConversionRate =
    reconciledDenominator > 0 ? Number(((registeredPatients / reconciledDenominator) * 100).toFixed(1)) : 0;

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

  const doctorMap = {};
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

  const deptMap = {};
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

  const languageColors = { bn: '#0d9488', hi: '#6366f1', en: '#0284c7' };
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

  const sourceColors = {
    HIS_API: '#0f766e',
    HIS_WEBHOOK: '#0284c7',
    SFTP_CSV: '#7c3aed',
    DEMO_SIMULATOR: '#f59e0b',
    CALL_CENTRE: '#ec4899',
  };
  const sourceMap = {};
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
    { name: 'Confirmed', value: appointments.filter((a) => a.status === 'CONFIRMED').length, color: '#10b981' },
    { name: 'Completed (OPD)', value: appointments.filter((a) => a.status === 'COMPLETED').length, color: '#0d9488' },
    {
      name: 'Confirmation Pending',
      value: appointments.filter((a) => ['CONFIRMATION_PENDING', 'VALIDATED', 'RECEIVED'].includes(a.status)).length,
      color: '#f59e0b',
    },
    { name: 'Reschedule Requested', value: appointments.filter((a) => a.status === 'RESCHEDULE_REQUESTED').length, color: '#f97316' },
    {
      name: 'Cancellation Req / Cancelled',
      value: appointments.filter((a) => ['CANCELLATION_REQUESTED', 'CANCELLED'].includes(a.status)).length,
      color: '#ef4444',
    },
    { name: 'Verified No-Show', value: appointments.filter((a) => a.status === 'NO_SHOW').length, color: '#991b1b' },
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
    { name: 'Confirm Visit', value: responses.filter((r) => r.mappedAction === 'CONFIRM').length, color: '#10b981' },
    { name: 'Reschedule Request', value: responses.filter((r) => r.mappedAction === 'RESCHEDULE').length, color: '#f97316' },
    { name: 'Cancel Request', value: responses.filter((r) => r.mappedAction === 'CANCEL').length, color: '#ef4444' },
    { name: 'Talk to Us / Help', value: responses.filter((r) => r.mappedAction === 'TALK_TO_US').length, color: '#8b5cf6' },
    { name: 'STOP / Opt-Out', value: responses.filter((r) => r.mappedAction === 'STOP').length, color: '#64748b' },
  ].filter((item) => item.value > 0);

  const attendanceOutcomePie = [
    { name: 'Completed Consultation', value: appointments.filter((a) => a.attendanceStatus === 'COMPLETED').length, color: '#0d9488' },
    { name: 'Arrived / Registered', value: appointments.filter((a) => ['ARRIVED', 'REGISTERED'].includes(a.attendanceStatus)).length, color: '#10b981' },
    { name: 'Upcoming / Pending', value: appointments.filter((a) => a.attendanceStatus === 'PENDING').length, color: '#3b82f6' },
    { name: 'Verified No-Show', value: appointments.filter((a) => a.attendanceStatus === 'NO_SHOW').length, color: '#ef4444' },
    { name: 'Unmatched Walk-In', value: unmatchedAttendance, color: '#a855f7' },
  ].filter((item) => item.value > 0);

  const followUpTaskPie = [
    { name: 'Reschedule Callback', value: tasks.filter((t) => t.taskType === 'RESCHEDULE_REQUEST').length, color: '#f97316' },
    { name: 'Cancellation Review', value: tasks.filter((t) => t.taskType === 'CANCELLATION_REVIEW').length, color: '#ef4444' },
    { name: 'No-Show Rebooking', value: tasks.filter((t) => t.taskType === 'NOSHOW_REBOOKING_ASSIST').length, color: '#eab308' },
    { name: 'Patient Help (Talk to Us)', value: tasks.filter((t) => t.taskType === 'TALK_TO_US_ASSISTANCE').length, color: '#8b5cf6' },
    { name: 'Delivery Failure Fallback', value: tasks.filter((t) => t.taskType === 'DELIVERY_FAILURE_FALLBACK').length, color: '#dc2626' },
  ].filter((item) => item.value > 0);

  const dateGroups = {};
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const state = getState();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/^\/api\/v1/, '').replace(/\/+$/, '') || '/';
  const sp = parsedUrl.searchParams;
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  // 1. Auth
  if (pathname === '/auth/login' && req.method === 'POST') {
    const email = (body.email || 'superadmin@anhvl-demo.in').toLowerCase().trim();
    const matchedUser =
      (state.users || []).find((u) => u.email.toLowerCase() === email) ||
      state.users?.[0];

    const roleCode = matchedUser?.role?.code || 'SUPER_ADMIN';
    const hospital = (state.hospitals || []).find((h) => h.id === matchedUser?.hospitalId);
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

    return res.status(200).json({
      success: true,
      data: {
        accessToken: `vercel-jwt-${sessionUser.id}-${Date.now()}`,
        refreshToken: `vercel-refresh-${sessionUser.id}`,
        expiresIn: 28800,
        user: sessionUser,
      },
    });
  }

  if (pathname === '/auth/refresh' && req.method === 'POST') {
    return res.status(200).json({
      success: true,
      data: { accessToken: `vercel-jwt-refreshed-${Date.now()}` },
    });
  }

  if (pathname === '/auth/logout' && req.method === 'POST') {
    return res.status(200).json({ success: true, data: { loggedOut: true } });
  }

  // 2. Settings & Health
  if (pathname === '/settings/health') {
    return res.status(200).json({
      ...state.health,
      timestamp: new Date().toISOString(),
      database: {
        ...state.health?.database,
        appointmentsCount: (state.appointments || []).length,
      },
    });
  }

  if (pathname === '/settings' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.settings });
  }

  if (pathname === '/settings/mode' && req.method === 'POST') {
    if (body.mode === 'PRODUCTION') {
      return res.status(400).json({
        success: false,
        message: 'Cannot switch to PRODUCTION mode while Meta WhatsApp, HIS, and Altruist credentials are unverified.',
      });
    }
    return res.status(200).json({ success: true, data: { mode: 'DEMO' } });
  }

  // 3. Hospitals
  if (pathname === '/hospitals' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.hospitals });
  }

  if (pathname.startsWith('/hospitals/') && req.method === 'PATCH') {
    const id = pathname.split('/')[2];
    const hosp = (state.hospitals || []).find((h) => h.id === id);
    if (hosp && hosp.configuration) {
      Object.assign(hosp.configuration, body);
      saveState(state);
    }
    return res.status(200).json({ success: true, data: hosp });
  }

  // 4. Reports Overview
  if (pathname === '/reports/overview' && req.method === 'GET') {
    const data = computeOverview(
      state,
      sp.get('hospitalId'),
      sp.get('fromDate'),
      sp.get('toDate')
    );
    return res.status(200).json({ success: true, data });
  }

  // 5. Appointments & CSV Export
  if (pathname === '/appointments/export/csv' && req.method === 'GET') {
    const hid = sp.get('hospitalId');
    let list = state.appointments || [];
    if (hid && hid !== 'ALL') list = list.filter((a) => a.hospitalId === hid);
    const header = 'BookingID,PatientName,Mobile,Language,Hospital,Department,Doctor,Date,Time,Status,Attendance\n';
    const rows = list
      .map((a) =>
        [
          a.bookingId,
          `"${a.patientName}"`,
          a.mobileNumber,
          a.preferredLanguage,
          `"${a.hospital?.city || ''}"`,
          `"${a.department}"`,
          `"${a.doctorName}"`,
          new Date(a.appointmentDate).toISOString().split('T')[0],
          a.appointmentTime,
          a.status,
          a.attendanceStatus,
        ].join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="anhvl-appointments.csv"');
    return res.status(200).send(header + rows);
  }

  if (pathname === '/appointments' && req.method === 'GET') {
    let list = [...(state.appointments || [])];
    const hid = sp.get('hospitalId');
    const status = sp.get('status');
    const attendanceStatus = sp.get('attendanceStatus');
    const search = (sp.get('search') || '').toLowerCase();

    if (hid && hid !== 'ALL') list = list.filter((a) => a.hospitalId === hid);
    if (status && status !== 'ALL') list = list.filter((a) => a.status === status);
    if (attendanceStatus && attendanceStatus !== 'ALL') list = list.filter((a) => a.attendanceStatus === attendanceStatus);
    if (search) {
      list = list.filter(
        (a) =>
          a.bookingId?.toLowerCase().includes(search) ||
          a.patientName?.toLowerCase().includes(search) ||
          a.mobileNumber?.toLowerCase().includes(search) ||
          a.doctorName?.toLowerCase().includes(search)
      );
    }
    return res.status(200).json({ success: true, data: list, meta: { total: list.length } });
  }

  if (pathname === '/appointments' && req.method === 'POST') {
    const hosp = (state.hospitals || []).find((h) => h.id === body.hospitalId) || state.hospitals[0];
    const existing = (state.appointments || []).find(
      (a) => a.hospitalId === hosp.id && a.bookingId === body.bookingId
    );
    if (existing) {
      return res.status(200).json({
        success: true,
        data: { deduplicated: true, action: 'UPDATED_EXISTING', appointment: existing },
      });
    }
    const newId = crypto.randomUUID();
    const newAppt = {
      id: newId,
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
          id: crypto.randomUUID(),
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
    saveState(state);
    return res.status(201).json({
      success: true,
      data: { deduplicated: false, action: 'CREATED_NEW', appointment: newAppt },
    });
  }

  if (pathname === '/appointments/bulk-import' && req.method === 'POST') {
    const records = body.records || [];
    return res.status(200).json({
      success: true,
      data: {
        totalRecords: records.length,
        insertedRecords: records.length,
        updatedRecords: 0,
        failedRecords: 0,
      },
    });
  }

  if (pathname.startsWith('/appointments/') && pathname.endsWith('/cancel') && req.method === 'POST') {
    const id = pathname.split('/')[2];
    const appt = (state.appointments || []).find((a) => a.id === id);
    if (appt) {
      appt.status = 'CANCELLED';
      appt.attendanceStatus = 'CANCELLED';
      for (const sm of appt.scheduledMessages || []) {
        if (sm.status === 'SCHEDULED') {
          sm.status = 'CANCELLED';
          sm.suppressionReason = 'CANCELLED_BY_HIS';
        }
      }
      saveState(state);
    }
    return res.status(200).json({ success: true, data: appt });
  }

  if (pathname.startsWith('/appointments/') && req.method === 'GET') {
    const id = pathname.split('/')[2];
    const appt = (state.appointments || []).find((a) => a.id === id) || state.appointments?.[0];
    return res.status(200).json({ success: true, data: appt });
  }

  // 6. Patients
  if (pathname === '/patients' && req.method === 'GET') {
    let list = state.patients || [];
    const hid = sp.get('hospitalId');
    if (hid && hid !== 'ALL') list = list.filter((p) => p.hospitalId === hid);
    return res.status(200).json({ success: true, data: list });
  }

  // 7. Messages & Webhooks
  if (pathname === '/messages' && req.method === 'GET') {
    let list = state.messages || [];
    const hid = sp.get('hospitalId');
    const st = sp.get('status');
    if (hid && hid !== 'ALL') list = list.filter((m) => m.hospitalId === hid);
    if (st && st !== 'ALL') list = list.filter((m) => m.status === st);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname === '/messages/test' && req.method === 'POST') {
    return res.status(200).json({
      success: true,
      data: { dispatched: true, status: 'DELIVERED' },
    });
  }

  if (pathname === '/webhooks/whatsapp' && req.method === 'POST') {
    const msg = (state.messages || []).find((m) => m.whatsappMessageId === body.whatsappMessageId);
    if (msg && body.status) {
      msg.status = body.status.toUpperCase();
      saveState(state);
    }
    return res.status(200).json({ success: true, data: { processed: true } });
  }

  // 8. Templates
  if (pathname === '/templates' && req.method === 'GET') {
    let list = state.templates || [];
    const hid = sp.get('hospitalId');
    const lang = sp.get('language');
    if (hid && hid !== 'ALL') list = list.filter((t) => t.hospitalId === hid);
    if (lang && lang !== 'ALL') list = list.filter((t) => t.language === lang);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname === '/templates' && req.method === 'POST') {
    const text = (body.bodyText || '').toLowerCase();
    const clinicalTerms = ['diagnosis', 'prescription', 'hiv', 'biopsy', 'lab report', 'chemotherapy'];
    const found = clinicalTerms.find((w) => text.includes(w));
    if (found) {
      return res.status(400).json({
        success: false,
        message: `Non-Clinical Safeguard Violation: Prohibited clinical term "${found}" detected.`,
      });
    }
    const created = {
      id: crypto.randomUUID(),
      ...body,
      activeVersion: 1,
      approvalStatus: 'APPROVED_DEMO',
      versions: [{ id: crypto.randomUUID(), versionNumber: 1, bodyText: body.bodyText, variables: [], interactiveButtons: [] }],
    };
    state.templates.unshift(created);
    saveState(state);
    return res.status(201).json({ success: true, data: created });
  }

  if (pathname.startsWith('/templates/') && pathname.endsWith('/approval') && req.method === 'PATCH') {
    const id = pathname.split('/')[2];
    const tpl = (state.templates || []).find((t) => t.id === id);
    if (tpl) {
      tpl.approvalStatus = body.approvalStatus;
      saveState(state);
    }
    return res.status(200).json({ success: true, data: tpl });
  }

  // 9. Scheduler
  if (pathname === '/scheduler/jobs' && req.method === 'GET') {
    let list = state.schedulerJobs || [];
    const hid = sp.get('hospitalId');
    const st = sp.get('status');
    if (hid && hid !== 'ALL') list = list.filter((j) => j.hospitalId === hid);
    if (st && st !== 'ALL') list = list.filter((j) => j.status === st);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname.startsWith('/scheduler/jobs/') && pathname.endsWith('/execute') && req.method === 'POST') {
    const id = pathname.split('/')[3];
    const job = (state.schedulerJobs || []).find((j) => j.id === id);
    if (job) {
      job.status = 'COMPLETED';
      job.executedAt = new Date().toISOString();
      saveState(state);
    }
    return res.status(200).json({ success: true, data: job });
  }

  // 10. Responses
  if (pathname === '/responses' && req.method === 'GET') {
    let list = state.responses || [];
    const hid = sp.get('hospitalId');
    const act = sp.get('action');
    if (hid && hid !== 'ALL') list = list.filter((r) => r.hospitalId === hid);
    if (act && act !== 'ALL') list = list.filter((r) => r.mappedAction === act);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname === '/responses/capture' && req.method === 'POST') {
    const appt = (state.appointments || []).find((a) => a.id === body.appointmentId);
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
      id: crypto.randomUUID(),
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
    saveState(state);
    return res.status(200).json({ success: true, data: { mappedAction, response: newResp } });
  }

  // 11. Follow-Ups & Agents
  if (pathname === '/followups/export/csv' && req.method === 'GET') {
    const list = state.followups || [];
    const header = 'TaskCode,TaskType,Priority,Status,BookingID,PatientName,Mobile,Hospital,TriggerReason\n';
    const rows = list
      .map((t) =>
        [
          t.taskCode,
          t.taskType,
          t.priority,
          t.status,
          t.appointment?.bookingId || '',
          `"${t.patient?.fullName || ''}"`,
          t.patient?.mobileNumber || '',
          `"${t.hospital?.city || ''}"`,
          `"${t.triggerReason || ''}"`,
        ].join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="anhvl-followups.csv"');
    return res.status(200).send(header + rows);
  }

  if (pathname === '/followups' && req.method === 'GET') {
    let list = state.followups || [];
    const hid = sp.get('hospitalId');
    const st = sp.get('status');
    const tt = sp.get('taskType');
    if (hid && hid !== 'ALL') list = list.filter((t) => t.hospitalId === hid);
    if (st && st !== 'ALL') list = list.filter((t) => t.status === st);
    if (tt && tt !== 'ALL') list = list.filter((t) => t.taskType === tt);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname.startsWith('/followups/') && req.method === 'PATCH') {
    const id = pathname.split('/')[2];
    const task = (state.followups || []).find((t) => t.id === id);
    if (task) {
      if (body.status) task.status = body.status;
      if (body.resolutionNotes) task.resolutionNotes = body.resolutionNotes;
      if (body.note) {
        task.internalNotes = [...(task.internalNotes || []), { author: 'Agent', timestamp: new Date().toISOString(), note: body.note }];
      }
      saveState(state);
    }
    return res.status(200).json({ success: true, data: task });
  }

  if (pathname === '/users/agents' && req.method === 'GET') {
    let list = state.agents || [];
    const hid = sp.get('hospitalId');
    if (hid && hid !== 'ALL') list = list.filter((a) => a.hospitalId === hid);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname.startsWith('/users/agents/') && pathname.endsWith('/status') && req.method === 'PATCH') {
    const id = pathname.split('/')[3];
    const agent = (state.agents || []).find((a) => a.id === id);
    if (agent) {
      agent.status = body.status;
      saveState(state);
    }
    return res.status(200).json({ success: true, data: agent });
  }

  // 12. Consent
  if (pathname === '/consent' && req.method === 'GET') {
    let list = state.consent || [];
    const hid = sp.get('hospitalId');
    if (hid && hid !== 'ALL') list = list.filter((c) => c.hospitalId === hid);
    return res.status(200).json({ success: true, data: list });
  }

  if (pathname.startsWith('/consent/') && req.method === 'PATCH') {
    const id = pathname.split('/')[2];
    const rec = (state.consent || []).find((c) => c.id === id);
    if (rec) {
      rec.consentStatus = body.consentStatus;
      rec.optOutStatus = body.consentStatus === 'REVOKED';
      rec.communicationEligible = body.consentStatus === 'GRANTED';
      saveState(state);
    }
    return res.status(200).json({ success: true, data: rec });
  }

  // 13. Attendance
  if (pathname === '/attendance' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.attendance });
  }

  if (pathname === '/attendance/reconcile' && req.method === 'POST') {
    const appt = (state.appointments || []).find((a) => a.bookingId === body.bookingId);
    const matchStatus = appt ? 'MATCHED' : 'UNMATCHED';
    const outcomeStatus = appt ? body.outcomeStatus || 'COMPLETED' : 'UNMATCHED';
    if (appt) {
      appt.attendanceStatus = outcomeStatus;
      if (outcomeStatus === 'COMPLETED') appt.status = 'COMPLETED';
      if (outcomeStatus === 'NO_SHOW') appt.status = 'NO_SHOW';
    }
    const newRec = {
      id: crypto.randomUUID(),
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
    saveState(state);
    return res.status(200).json({
      success: true,
      data: {
        matchStatus,
        outcomeStatus,
        rebookingPromptSent: newRec.rebookingPromptSent,
        record: newRec,
      },
    });
  }

  // 14. Integrations & Pilot
  if (pathname === '/integrations' && req.method === 'GET') {
    let configs = state.integrations?.configs || [];
    let logs = state.integrations?.logs || [];
    const hid = sp.get('hospitalId');
    const it = sp.get('integrationType');
    if (hid && hid !== 'ALL') {
      configs = configs.filter((c) => !c.hospitalId || c.hospitalId === hid);
      logs = logs.filter((l) => !l.hospitalId || l.hospitalId === hid);
    }
    if (it) {
      configs = configs.filter((c) => c.integrationType === it);
      logs = logs.filter((l) => l.integrationType === it);
    }
    return res.status(200).json({ success: true, data: { configs, logs } });
  }

  if (pathname === '/integrations/test' && req.method === 'POST') {
    return res.status(200).json({
      success: true,
      data: {
        status: 'DEMO_SIMULATED',
        message: 'Verified adapter schema & simulated handshake in DEMO mode. Live production endpoint requires ANHVL IT credentials.',
      },
    });
  }

  if (pathname.startsWith('/integrations/') && req.method === 'PATCH') {
    return res.status(200).json({ success: true, data: { updated: true } });
  }

  if (pathname === '/pilot' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.pilot });
  }

  // 15. Users, Roles & Audit Logs
  if (pathname === '/users' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.users });
  }

  if (pathname === '/users/roles' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.roles });
  }

  if (pathname === '/users' && req.method === 'POST') {
    const newUser = {
      id: crypto.randomUUID(),
      email: body.email,
      fullName: body.fullName,
      status: 'ACTIVE',
      role: (state.roles || []).find((r) => r.code === body.roleCode) || state.roles?.[0],
      hospital: (state.hospitals || []).find((h) => h.id === body.hospitalId) || null,
    };
    state.users.push(newUser);
    saveState(state);
    return res.status(201).json({ success: true, data: newUser });
  }

  if (pathname.startsWith('/users/') && pathname.endsWith('/status') && req.method === 'PATCH') {
    const id = pathname.split('/')[2];
    const u = (state.users || []).find((x) => x.id === id);
    if (u) {
      u.status = body.status;
      saveState(state);
    }
    return res.status(200).json({ success: true, data: u });
  }

  if (pathname === '/audit-logs' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.auditLogs });
  }

  // 16. Simulator
  if (pathname === '/simulator' && req.method === 'GET') {
    return res.status(200).json({ success: true, data: state.simulator });
  }

  if (pathname === '/simulator/start' && req.method === 'POST') {
    const sim = state.simulator;
    const found = (sim.scenarios || []).find((s) => s.id === body.scenarioId) || sim.scenarios?.[0];
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
            ? `नमस्कार, नेओटिया भागীরथी रायपुर अस्पताल में आपकी ओपीडी अपॉइंटमेंट बुक हो गई है। कृपया नीचे पुष्टि करें।`
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
    saveState(state);
    return res.status(200).json({ success: true, data: sim });
  }

  if (pathname === '/simulator/next-step' && req.method === 'POST') {
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
      saveState(state);
    }
    return res.status(200).json({ success: true, data: sim });
  }

  if (pathname === '/simulator/advance-clock' && req.method === 'POST') {
    const sim = state.simulator;
    const mins = Number(body.minutes || 60);
    sim.state.simulatedClockIso = new Date(new Date(sim.state.simulatedClockIso).getTime() + mins * 60000).toISOString();
    sim.state.eventHistory.unshift({
      step: sim.state.currentStep,
      timestamp: new Date().toISOString(),
      module: 'SIMULATOR_CLOCK',
      summary: `Advanced simulation clock by +${mins} minutes.`,
      status: 'CLOCK_SHIFTED',
    });
    saveState(state);
    return res.status(200).json({ success: true, data: sim });
  }

  if (pathname === '/simulator/pause' && req.method === 'POST') {
    state.simulator.state.isPaused = Boolean(body.paused);
    saveState(state);
    return res.status(200).json({ success: true, data: state.simulator });
  }

  if (pathname === '/simulator/reset' && req.method === 'POST') {
    memoryState = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    saveState(memoryState);
    return res.status(200).json({ success: true, data: memoryState.simulator });
  }

  // 17. Doctor Disruptions & Multi-Segment Re-Targeting
  if (!state.disruptionHistory) state.disruptionHistory = [];
  if (!state.retargetingHistory) state.retargetingHistory = [];
  if (!state.formLeads) {
    state.formLeads = [
      { id: 'lead-ntk-01', leadCode: 'WEB-NTK-901', fullName: 'Barnali Sengupta (Web Form Lead)', mobileNumber: '+919830088001', hospitalCode: 'ANHVL-NTK', hospitalCity: 'New Town, Kolkata', departmentInterest: 'Obstetrics & Gynaecology', preferredLanguage: 'bn', formSource: 'Website OPD Enquiry Form', submittedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(), marketingOptIn: true, optOutStatus: false, nudgesSentLast14d: 0 },
      { id: 'lead-ntk-02', leadCode: 'WEB-NTK-902', fullName: 'Sagnik Chowdhury (Web Form Lead)', mobileNumber: '+919830088002', hospitalCode: 'ANHVL-NTK', hospitalCity: 'New Town, Kolkata', departmentInterest: 'Paediatrics & Neonatology', preferredLanguage: 'en', formSource: 'Meta Click-to-Form Ad (Paediatrics)', submittedAt: new Date(Date.now() - 52 * 3600 * 1000).toISOString(), marketingOptIn: true, optOutStatus: false, nudgesSentLast14d: 1 },
      { id: 'lead-ntk-03', leadCode: 'WEB-NTK-903', fullName: 'Roshni Banerjee (No Marketing Opt-In)', mobileNumber: '+919830088003', hospitalCode: 'ANHVL-NTK', hospitalCity: 'New Town, Kolkata', departmentInterest: 'Fetal Medicine', preferredLanguage: 'bn', formSource: 'Website Callback Widget (Unchecked)', submittedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(), marketingOptIn: false, optOutStatus: false, nudgesSentLast14d: 0 },
      { id: 'lead-rpr-01', leadCode: 'WEB-RPR-904', fullName: 'Komal Deshmukh (Web Form Lead)', mobileNumber: '+919752088004', hospitalCode: 'ANHVL-RPR', hospitalCity: 'Raipur', departmentInterest: 'Fertility & Reproductive Medicine', preferredLanguage: 'hi', formSource: 'Raipur Maternity Landing Page', submittedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), marketingOptIn: true, optOutStatus: false, nudgesSentLast14d: 0 },
      { id: 'lead-rpr-02', leadCode: 'WEB-RPR-905', fullName: 'Sandeep Tiwari (Web Form Lead)', mobileNumber: '+919752088005', hospitalCode: 'ANHVL-RPR', hospitalCity: 'Raipur', departmentInterest: 'Paediatrics & Child Care', preferredLanguage: 'hi', formSource: 'Google Search OPD Form', submittedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(), marketingOptIn: true, optOutStatus: false, nudgesSentLast14d: 0 },
      { id: 'lead-rpr-03', leadCode: 'WEB-RPR-906', fullName: 'Neha Agrawal (Opted Out — STOP)', mobileNumber: '+919752088006', hospitalCode: 'ANHVL-RPR', hospitalCity: 'Raipur', departmentInterest: 'Obstetrics & Gynaecology', preferredLanguage: 'en', formSource: 'Website OPD Enquiry Form', submittedAt: new Date(Date.now() - 90 * 3600 * 1000).toISOString(), marketingOptIn: true, optOutStatus: true, nudgesSentLast14d: 1 },
    ];
  }

  if (pathname === '/campaigns/doctor-disruptions/doctors' && req.method === 'GET') {
    const hid = sp.get('hospitalId');
    let appts = state.appointments || [];
    if (hid && hid !== 'ALL') appts = appts.filter((a) => a.hospitalId === hid);
    const map = {};
    for (const a of appts) {
      const k = `${a.hospitalId}:${a.doctorName}`;
      if (!map[k]) {
        map[k] = { doctorName: a.doctorName, department: a.department, hospitalId: a.hospitalId, hospitalCity: a.hospital?.city, activeBookingsCount: 0, dates: new Set() };
      }
      if (!['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)) map[k].activeBookingsCount += 1;
      map[k].dates.add(new Date(a.appointmentDate).toISOString().split('T')[0]);
    }
    return res.status(200).json({
      success: true,
      data: {
        doctors: Object.values(map).map((d) => ({ ...d, dates: Array.from(d.dates).sort() })),
        disruptionHistory: state.disruptionHistory,
      },
    });
  }

  if (pathname === '/campaigns/doctor-disruptions/preview' && req.method === 'GET') {
    const hid = sp.get('hospitalId');
    const doc = sp.get('doctorName');
    const dt = sp.get('date');
    const todayStr = new Date().toISOString().split('T')[0];
    let appts = (state.appointments || []).filter(
      (a) => a.doctorName === doc && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
    );
    if (hid && hid !== 'ALL') appts = appts.filter((a) => a.hospitalId === hid);
    if (dt && dt !== 'ALL_UPCOMING') appts = appts.filter((a) => new Date(a.appointmentDate).toISOString().split('T')[0] === dt);

    const affectedPatients = appts.map((a) => {
      const apptDateStr = new Date(a.appointmentDate).toISOString().split('T')[0];
      const isSameDay = apptDateStr <= todayStr;
      const pendingRemindersToStop = (a.scheduledMessages || []).filter((m) => ['SCHEDULED', 'QUEUED'].includes(m.status)).length;
      const whatsappEligible = a.consentStatus === 'GRANTED';
      return {
        appointmentId: a.id, bookingId: a.bookingId, patientName: a.patientName, mobileNumber: a.mobileNumber,
        preferredLanguage: a.preferredLanguage, hospitalCity: a.hospital?.city, department: a.department,
        appointmentDate: apptDateStr, appointmentTime: a.appointmentTime, currentStatus: a.status,
        pendingRemindersToStop, isSameDay, whatsappEligible, altruistCallbackRequired: isSameDay || !whatsappEligible,
      };
    });
    return res.status(200).json({
      success: true,
      data: {
        doctorName: doc, date: dt || 'ALL_UPCOMING', totalAffected: affectedPatients.length,
        totalPendingRemindersToStop: affectedPatients.reduce((acc, x) => acc + x.pendingRemindersToStop, 0),
        sameDayAltruistEscalations: affectedPatients.filter((x) => x.altruistCallbackRequired).length,
        whatsappEligibleCount: affectedPatients.filter((x) => x.whatsappEligible).length,
        affectedPatients,
      },
    });
  }

  if (pathname === '/campaigns/doctor-disruptions/execute' && req.method === 'POST') {
    let appts = (state.appointments || []).filter(
      (a) => a.doctorName === body.doctorName && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
    );
    if (body.hospitalId && body.hospitalId !== 'ALL') appts = appts.filter((a) => a.hospitalId === body.hospitalId);
    if (body.date && body.date !== 'ALL_UPCOMING') appts = appts.filter((a) => new Date(a.appointmentDate).toISOString().split('T')[0] === body.date);

    let remindersStopped = 0;
    let messagesSent = 0;
    let altruistTasksCreated = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    for (const appt of appts) {
      appt.status = 'RESCHEDULE_REQUESTED';
      for (const sm of appt.scheduledMessages || []) {
        if (['SCHEDULED', 'QUEUED'].includes(sm.status)) {
          sm.status = 'CANCELLED';
          sm.suppressionReason = `${body.disruptionType}_ADMIN_OVERRIDE`;
          remindersStopped += 1;
        }
      }
      if (appt.consentStatus === 'GRANTED') messagesSent += 1;
      if (new Date(appt.appointmentDate).toISOString().split('T')[0] <= todayStr || appt.consentStatus !== 'GRANTED') {
        altruistTasksCreated += 1;
      }
    }
    const rec = {
      id: `disr-${Date.now()}`, executedAt: new Date().toISOString(), doctorName: body.doctorName,
      disruptionType: body.disruptionType, affectedCount: appts.length, remindersStopped, messagesSent, altruistTasksCreated,
    };
    state.disruptionHistory.unshift(rec);
    saveState(state);
    return res.status(200).json({ success: true, data: rec });
  }

  if (pathname === '/campaigns/retargeting/cohorts' && req.method === 'GET') {
    const hid = sp.get('hospitalId');
    let appts = state.appointments || [];
    const selHosp = (state.hospitals || []).find((h) => h.id === hid);
    if (hid && hid !== 'ALL') appts = appts.filter((a) => a.hospitalId === hid);

    const noShows = appts
      .filter((a) => a.status === 'NO_SHOW' || a.attendanceStatus === 'NO_SHOW')
      .map((a) => {
        const isControl = a.holdoutAssignment?.cohortGroup === 'CONTROL';
        const eligible = a.consentStatus === 'GRANTED' && !isControl;
        return {
          id: a.id, referenceCode: a.bookingId, patientName: a.patientName, mobileNumber: a.mobileNumber,
          hospitalCity: a.hospital?.city, department: a.department, doctorName: a.doctorName, preferredLanguage: a.preferredLanguage,
          eventDate: new Date(a.appointmentDate).toISOString().split('T')[0], metaCategory: 'UTILITY',
          consentRequired: 'Appointment Service Consent', eligible, blockReason: isControl ? 'New Town Pilot CONTROL Holdout' : !eligible ? 'Opted Out (STOP)' : null,
        };
      });

    const cancelled = appts
      .filter((a) => ['CANCELLED', 'CANCELLATION_REQUESTED'].includes(a.status))
      .map((a, idx) => {
        const hasMkt = idx % 3 !== 2;
        const eligible = a.consentStatus === 'GRANTED' && hasMkt;
        return {
          id: a.id, referenceCode: a.bookingId, patientName: a.patientName, mobileNumber: a.mobileNumber,
          hospitalCity: a.hospital?.city, department: a.department, doctorName: a.doctorName, preferredLanguage: a.preferredLanguage,
          eventDate: new Date(a.appointmentDate).toISOString().split('T')[0], metaCategory: 'MARKETING',
          consentRequired: 'Explicit Marketing Opt-In', eligible, blockReason: !hasMkt ? 'Missing Explicit Marketing Opt-In' : null,
        };
      });

    const leads = (state.formLeads || [])
      .filter((l) => !selHosp || l.hospitalCode === selHosp.code)
      .map((l) => {
        const eligible = l.marketingOptIn && !l.optOutStatus && l.nudgesSentLast14d < 2;
        return {
          id: l.id, referenceCode: l.leadCode, patientName: l.fullName, mobileNumber: l.mobileNumber,
          hospitalCity: l.hospitalCity, department: l.departmentInterest, doctorName: l.formSource, preferredLanguage: l.preferredLanguage,
          eventDate: l.submittedAt.split('T')[0], metaCategory: 'MARKETING',
          consentRequired: 'Web-Form Marketing Checkbox Opt-In', eligible,
          blockReason: l.optOutStatus ? 'Opted Out (STOP)' : !l.marketingOptIn ? 'Web Form Marketing Checkbox Unchecked' : l.nudgesSentLast14d >= 2 ? '14-Day Frequency Cap Reached' : null,
        };
      });

    return res.status(200).json({
      success: true,
      data: {
        segments: {
          NO_SHOW_UNREBOOKED: { key: 'NO_SHOW_UNREBOOKED', title: '1. Verified No-Shows Who Didn’t Rebook', metaCategoryRule: 'UTILITY (≤72h tied to missed booking) / MARKETING (>72h follow-up)', consentRule: 'Active Service Consent + Not in Pilot Control Holdout', total: noShows.length, eligibleCount: noShows.filter((x) => x.eligible).length, blockedCount: noShows.filter((x) => !x.eligible).length, records: noShows },
          CANCELLED_NO_SLOT: { key: 'CANCELLED_NO_SLOT', title: '2. Cancelled Patients Without a New Slot', metaCategoryRule: 'MARKETING (Meta prohibits re-soliciting cancelled bookings as Utility)', consentRule: 'Separate Explicit Marketing Opt-In required + Instant STOP', total: cancelled.length, eligibleCount: cancelled.filter((x) => x.eligible).length, blockedCount: cancelled.filter((x) => !x.eligible).length, records: cancelled },
          UNCONVERTED_FORM_LEADS: { key: 'UNCONVERTED_FORM_LEADS', title: '3. Website / Ad Form-Fillers Who Never Booked', metaCategoryRule: 'MARKETING (Strict — no confirmed clinical transaction exists)', consentRule: 'Explicit Form Checkbox Opt-In + Max 2 nudges per 14 days', total: leads.length, eligibleCount: leads.filter((x) => x.eligible).length, blockedCount: leads.filter((x) => !x.eligible).length, records: leads },
        },
        campaignHistory: state.retargetingHistory,
      },
    });
  }

  if (pathname === '/campaigns/retargeting/launch' && req.method === 'POST') {
    const cmp = {
      id: `cmp-${Date.now()}`, launchedAt: new Date().toISOString(), segment: body.segment,
      segmentTitle: body.segment, metaCategory: body.segment === 'NO_SHOW_UNREBOOKED' ? 'UTILITY / MARKETING' : 'MARKETING',
      dispatchedCount: 3, suppressedCount: 2,
    };
    state.retargetingHistory.unshift(cmp);
    saveState(state);
    return res.status(200).json({ success: true, data: cmp });
  }

  return res.status(200).json({ success: true, data: {} });
};
