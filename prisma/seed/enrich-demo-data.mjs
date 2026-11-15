import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export async function enrichDemoDataset(prisma) {
  const existingLogs = await prisma.integrationLog.count();
  if (existingLogs >= 10) {
    return;
  }

  console.log('[Seed Enrich] Populating rich operational dummy data across all 24 tables...');

  const newTown = await prisma.hospital.findUnique({ where: { code: 'ANHVL-NTK' } });
  const raipur = await prisma.hospital.findUnique({ where: { code: 'ANHVL-RPR' } });
  if (!newTown || !raipur) return;

  const callRole = await prisma.role.findUnique({ where: { code: 'CALL_CENTRE_AGENT' } });
  const superAdmin = await prisma.user.findUnique({ where: { email: 'superadmin@anhvl-demo.in' } });
  const ntkAdmin = await prisma.user.findUnique({ where: { email: 'admin.newtown@anhvl-demo.in' } });
  const rprAdmin = await prisma.user.findUnique({ where: { email: 'admin.raipur@anhvl-demo.in' } });
  const opsManager = await prisma.user.findUnique({ where: { email: 'ops.manager@anhvl-demo.in' } });

  const templates = await prisma.messageTemplate.findMany();
  const tplMap = {};
  for (const t of templates) {
    tplMap[`${t.hospitalId}:${t.code}:${t.language}`] = t;
  }

  // 1. Additional Altruist Call-Centre Agents
  const passwordHash = await bcrypt.hash('Anhvl@2026!', 10);
  const extraAgentSpecs = [
    {
      email: 'agent.sourav@altruist-demo.in',
      fullName: 'Sourav Bhattacharjee (Altruist Desk — Kolkata)',
      hospitalId: newTown.id,
      agentCode: 'ALT-NTK-102',
      teamName: 'Altruist Maternal Care Desk — Kolkata',
      languagesSpoken: ['bn', 'en'],
      activeQueueCount: 4,
      resolvedCount: 28,
      status: 'AVAILABLE',
    },
    {
      email: 'agent.tanushree@altruist-demo.in',
      fullName: 'Tanushree Dutta (Altruist Desk — Kolkata)',
      hospitalId: newTown.id,
      agentCode: 'ALT-NTK-103',
      teamName: 'Altruist Pediatrics Desk — Kolkata',
      languagesSpoken: ['bn', 'en', 'hi'],
      activeQueueCount: 2,
      resolvedCount: 31,
      status: 'BUSY',
    },
    {
      email: 'agent.priya@altruist-demo.in',
      fullName: 'Priya Deshmukh (Altruist Desk — Raipur)',
      hospitalId: raipur.id,
      agentCode: 'ALT-RPR-202',
      teamName: 'Altruist First-Visit Navigator — Raipur',
      languagesSpoken: ['hi', 'en'],
      activeQueueCount: 3,
      resolvedCount: 22,
      status: 'AVAILABLE',
    },
    {
      email: 'agent.vikash@altruist-demo.in',
      fullName: 'Vikash Kashyap (Altruist Desk — Raipur)',
      hospitalId: raipur.id,
      agentCode: 'ALT-RPR-203',
      teamName: 'Altruist Escalation Desk — Raipur',
      languagesSpoken: ['hi', 'en'],
      activeQueueCount: 1,
      resolvedCount: 19,
      status: 'AVAILABLE',
    },
  ];

  for (const spec of extraAgentSpecs) {
    let user = await prisma.user.findUnique({ where: { email: spec.email } });
    if (!user && callRole) {
      user = await prisma.user.create({
        data: {
          email: spec.email,
          fullName: spec.fullName,
          passwordHash,
          roleId: callRole.id,
          hospitalId: spec.hospitalId,
          status: 'ACTIVE',
          lastLoginAt: new Date(Date.now() - Math.floor(Math.random() * 7200000)),
        },
      });
    }
    if (user) {
      const existingAgent = await prisma.agent.findUnique({ where: { agentCode: spec.agentCode } });
      if (!existingAgent) {
        await prisma.agent.create({
          data: {
            userId: user.id,
            hospitalId: spec.hospitalId,
            agentCode: spec.agentCode,
            teamName: spec.teamName,
            languagesSpoken: spec.languagesSpoken,
            activeQueueCount: spec.activeQueueCount,
            resolvedCount: spec.resolvedCount,
            status: spec.status,
          },
        });
      }
    }
  }

  const allAgents = await prisma.agent.findMany();
  const ntkAgents = allAgents.filter((a) => a.hospitalId === newTown.id);
  const rprAgents = allAgents.filter((a) => a.hospitalId === raipur.id);

  // 2. Rich Multi-Day Appointments across New Town & Raipur
  const now = Date.now();
  const dayMs = 24 * 3600 * 1000;
  const dMinus3 = new Date(now - 3 * dayMs);
  const dMinus2 = new Date(now - 2 * dayMs);
  const dMinus1 = new Date(now - 1 * dayMs);
  const dToday = new Date(now);
  const dPlus1 = new Date(now + 1 * dayMs);
  const dPlus2 = new Date(now + 2 * dayMs);

  const extraAppointments = [
    // --- NEW TOWN, KOLKATA (ANHVL-NTK) ---
    {
      bookingId: 'NTK-BK-2026-1008',
      uhid: 'UHID-NTK-508',
      name: 'Rituparna Sengupta (SYNTHETIC)',
      mobile: '+919830010008',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ananya Chatterjee',
      date: dToday,
      time: '11:00',
      source: 'HIS_API',
      status: 'CONFIRMED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1009',
      uhid: 'UHID-NTK-509',
      name: 'Arnab Bandyopadhyay (SYNTHETIC)',
      mobile: '+919830010009',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Kaushik Banerjee',
      date: dToday,
      time: '12:15',
      source: 'HIS_WEBHOOK',
      status: 'CONFIRMED',
      attendance: 'REGISTERED',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1010',
      uhid: 'UHID-NTK-510',
      name: 'Aparajita Basu (SYNTHETIC)',
      mobile: '+919830010010',
      lang: 'bn',
      hospital: newTown,
      dept: 'Fetal Medicine',
      doctor: 'Dr. Debashis Roy',
      date: dToday,
      time: '14:30',
      source: 'HIS_API',
      status: 'CONFIRMED',
      attendance: 'ARRIVED',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'হ্যাঁ, আমি আসব (Confirm)',
    },
    {
      bookingId: 'NTK-BK-2026-1011',
      uhid: 'UHID-NTK-511',
      name: 'Nabanita Guha (SYNTHETIC)',
      mobile: '+919830010011',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Subrata Mukherjee',
      date: dPlus1,
      time: '09:30',
      source: 'HIS_API',
      status: 'CONFIRMED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1012',
      uhid: 'UHID-NTK-512',
      name: 'Sayantan Maitra (SYNTHETIC)',
      mobile: '+919830010012',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Priyanka Dasgupta',
      date: dPlus1,
      time: '16:15',
      source: 'HIS_WEBHOOK',
      status: 'RESCHEDULE_REQUESTED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'RESCHEDULE',
      responseText: 'Need to shift slot to evening after 6 PM',
      taskType: 'RESCHEDULE_REQUEST',
      taskPriority: 'HIGH',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'NTK-BK-2026-1013',
      uhid: 'UHID-NTK-513',
      name: 'moumita.kar — Moumita Kar (SYNTHETIC)',
      mobile: '+919830010013',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ritu Sen',
      date: dPlus1,
      time: '13:00',
      source: 'HIS_API',
      status: 'CONFIRMATION_PENDING',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'TALK_TO_US',
      responseText: 'নমস্কার, পার্কিং এবং প্রথমবার রেজিস্ট্রেশন ডেস্ক কোথায় একটু জানাবেন?',
      taskType: 'TALK_TO_US_ASSISTANCE',
      taskPriority: 'MEDIUM',
      taskStatus: 'IN_PROGRESS',
    },
    {
      bookingId: 'NTK-BK-2026-1014',
      uhid: 'UHID-NTK-514',
      name: 'Indrani Paul (SYNTHETIC)',
      mobile: '+919830010014',
      lang: 'en',
      hospital: newTown,
      dept: 'Fetal Medicine',
      doctor: 'Dr. Debashis Roy',
      date: dMinus1,
      time: '10:00',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1015',
      uhid: 'UHID-NTK-515',
      name: 'Paramita Dutta (SYNTHETIC)',
      mobile: '+919830010015',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ananya Chatterjee',
      date: dMinus1,
      time: '11:30',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1016',
      uhid: 'UHID-NTK-516',
      name: 'Tathagata Lahiri (SYNTHETIC)',
      mobile: '+919830010016',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Kaushik Banerjee',
      date: dMinus2,
      time: '15:30',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1017',
      uhid: 'UHID-NTK-517',
      name: 'Koyel Majumdar (SYNTHETIC)',
      mobile: '+919830010017',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Subrata Mukherjee',
      date: dMinus2,
      time: '17:00',
      source: 'SFTP_CSV',
      status: 'CANCELLED',
      attendance: 'CANCELLED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CANCEL',
      responseText: 'Cancel',
      taskType: 'CANCELLATION_REVIEW',
      taskPriority: 'HIGH',
      taskStatus: 'RESOLVED',
      resolutionNotes: 'Confirmed cancellation in HIS after speaking with patient; freed OPD slot for waitlist.',
    },
    {
      bookingId: 'NTK-BK-2026-1018',
      uhid: 'UHID-NTK-518',
      name: 'Chandrima Bhowmik (SYNTHETIC — CONTROL HOLDOUT)',
      mobile: '+919830010018',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ritu Sen',
      date: dMinus2,
      time: '10:30',
      source: 'HIS_API',
      status: 'NO_SHOW',
      attendance: 'NO_SHOW',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'CONTROL',
      msgStatus: 'SUPPRESSED',
    },
    {
      bookingId: 'NTK-BK-2026-1019',
      uhid: 'UHID-NTK-519',
      name: 'Sharmistha Sarkar (SYNTHETIC — CONTROL HOLDOUT)',
      mobile: '+919830010019',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Priyanka Dasgupta',
      date: dMinus3,
      time: '11:00',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'CONTROL',
      msgStatus: 'SUPPRESSED',
    },
    {
      bookingId: 'NTK-BK-2026-1020',
      uhid: 'UHID-NTK-520',
      name: 'GargiGanguly — Gargi Ganguly (SYNTHETIC)',
      mobile: '+919830010020',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ananya Chatterjee',
      date: dMinus3,
      time: '16:30',
      source: 'HIS_API',
      status: 'NO_SHOW',
      attendance: 'NO_SHOW',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      taskType: 'NOSHOW_REBOOKING_ASSIST',
      taskPriority: 'MEDIUM',
      taskStatus: 'RESOLVED',
      resolutionNotes: 'Patient responded to WhatsApp No-Show Rebooking Prompt; rebooked for next Tuesday morning OPD.',
    },
    {
      bookingId: 'NTK-BK-2026-1021',
      uhid: 'UHID-NTK-521',
      name: 'Dipankar Nandi (SYNTHETIC)',
      mobile: '+919830010021',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Kaushik Banerjee',
      date: dPlus2,
      time: '10:00',
      source: 'HIS_API',
      status: 'CONFIRMATION_PENDING',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'DELIVERED',
    },

    // --- RAIPUR (ANHVL-RPR) ---
    {
      bookingId: 'RPR-BK-2026-2005',
      uhid: 'UHID-RPR-805',
      name: 'Anjali Baghel (SYNTHETIC)',
      mobile: '+919752020005',
      lang: 'hi',
      hospital: raipur,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Vandana Sharma',
      date: dToday,
      time: '10:30',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'RPR-BK-2026-2006',
      uhid: 'UHID-RPR-806',
      name: 'Mahendra Kumar Dewangan (SYNTHETIC)',
      mobile: '+919752020006',
      lang: 'hi',
      hospital: raipur,
      dept: 'Paediatrics & Child Care',
      doctor: 'Dr. Rajesh Tiwari',
      date: dToday,
      time: '11:45',
      source: 'HIS_WEBHOOK',
      status: 'CONFIRMED',
      attendance: 'ARRIVED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'हाँ, हम समय पर पहुँच रहे हैं',
    },
    {
      bookingId: 'RPR-BK-2026-2007',
      uhid: 'UHID-RPR-807',
      name: 'Rekha Chandrakar (SYNTHETIC)',
      mobile: '+919752020007',
      lang: 'hi',
      hospital: raipur,
      dept: 'Fertility & Reproductive Medicine',
      doctor: 'Dr. Pooja Agrawal',
      date: dPlus1,
      time: '10:15',
      source: 'HIS_API',
      status: 'RESCHEDULE_REQUESTED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'RESCHEDULE',
      responseText: 'कृपया मेरी अपॉइंटमेंट दोपहर 2 बजे के बाद कर दें',
      taskType: 'RESCHEDULE_REQUEST',
      taskPriority: 'HIGH',
      taskStatus: 'IN_PROGRESS',
    },
    {
      bookingId: 'RPR-BK-2026-2008',
      uhid: 'UHID-RPR-808',
      name: 'Shruti Khandelwal (SYNTHETIC)',
      mobile: '+919752020008',
      lang: 'en',
      hospital: raipur,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Neha Verma',
      date: dPlus1,
      time: '13:30',
      source: 'HIS_API',
      status: 'CONFIRMED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'RPR-BK-2026-2009',
      uhid: 'UHID-RPR-809',
      name: 'Harishankar Netam (SYNTHETIC)',
      mobile: '+919752020009',
      lang: 'hi',
      hospital: raipur,
      dept: 'Paediatrics & Child Care',
      doctor: 'Dr. Amitabh Shukla',
      date: dMinus1,
      time: '15:00',
      source: 'SFTP_CSV',
      status: 'NO_SHOW',
      attendance: 'NO_SHOW',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: null,
      msgStatus: 'DELIVERED',
      taskType: 'NOSHOW_REBOOKING_ASSIST',
      taskPriority: 'HIGH',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'RPR-BK-2026-2010',
      uhid: 'UHID-RPR-810',
      name: 'Pallavi Sonkar (SYNTHETIC)',
      mobile: '+919752020010',
      lang: 'hi',
      hospital: raipur,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Vandana Sharma',
      date: dMinus1,
      time: '12:00',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'RPR-BK-2026-2011',
      uhid: 'UHID-RPR-811',
      name: 'Rameshwar Yadav (SYNTHETIC)',
      mobile: '+919752020011',
      lang: 'hi',
      hospital: raipur,
      dept: 'Paediatrics & Child Care',
      doctor: 'Dr. Rajesh Tiwari',
      date: dPlus2,
      time: '11:30',
      source: 'HIS_API',
      status: 'CANCELLATION_REQUESTED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      firstVisit: false,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CANCEL',
      responseText: 'Cancel',
      taskType: 'CANCELLATION_REVIEW',
      taskPriority: 'HIGH',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'RPR-BK-2026-2012',
      uhid: 'UHID-RPR-812',
      name: 'Nidhi Jaiswal (SYNTHETIC)',
      mobile: '+919752020012',
      lang: 'en',
      hospital: raipur,
      dept: 'Fertility & Reproductive Medicine',
      doctor: 'Dr. Pooja Agrawal',
      date: dMinus2,
      time: '16:00',
      source: 'HIS_API',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      firstVisit: true,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
  ];

  let taskIdx = 200;
  for (let i = 0; i < extraAppointments.length; i++) {
    const item = extraAppointments[i];
    const existingAppt = await prisma.appointment.findUnique({
      where: {
        hospitalId_bookingId: {
          hospitalId: item.hospital.id,
          bookingId: item.bookingId,
        },
      },
    });
    if (existingAppt) continue;

    const patient = await prisma.patient.create({
      data: {
        externalPatientId: item.uhid,
        hospitalId: item.hospital.id,
        fullName: item.name,
        mobileNumber: item.mobile,
        preferredLanguage: item.lang,
        isSyntheticDemo: true,
        createdBy: 'SYSTEM_SEED',
      },
    });

    await prisma.patientConsent.create({
      data: {
        patientId: patient.id,
        hospitalId: item.hospital.id,
        consentStatus: item.consent,
        consentSource: 'HIS_BOOKING_FEED',
        optOutStatus: false,
        communicationEligible: true,
      },
    });

    const apptDateStr = item.date.toISOString().split('T')[0];
    const scheduledAtUtc = new Date(`${apptDateStr}T${item.time}:00+05:30`);

    const appt = await prisma.appointment.create({
      data: {
        bookingId: item.bookingId,
        patientId: patient.id,
        hospitalId: item.hospital.id,
        patientName: item.name,
        mobileNumber: item.mobile,
        preferredLanguage: item.lang,
        department: item.dept,
        doctorName: item.doctor,
        doctorCode: `DOC-${100 + i}`,
        opdLocation: item.hospital.code === 'ANHVL-NTK' ? 'OPD Wing A — 1st Floor' : 'Main Maternal & Child OPD Block',
        appointmentDate: new Date(`${apptDateStr}T00:00:00.000Z`),
        appointmentTime: item.time,
        scheduledAtUtc,
        bookingSource: item.source,
        consentStatus: item.consent,
        status: item.status,
        attendanceStatus: item.attendance,
        integrationSource: item.source === 'SFTP_CSV' ? 'HIS_SFTP_CSV' : 'HIS_REST',
        isFirstVisit: item.firstVisit,
        isSyntheticDemo: true,
        createdBy: 'SYSTEM_SEED',
      },
    });

    await prisma.appointmentEvent.create({
      data: {
        appointmentId: appt.id,
        hospitalId: item.hospital.id,
        eventType: 'INGESTED',
        previousStatus: null,
        newStatus: item.status,
        description: `Appointment ${item.bookingId} ingested via ${item.source} (${item.lang.toUpperCase()} channel).`,
        triggeredBy: 'HIS_SYNC_ENGINE',
      },
    });

    if (item.cohort) {
      await prisma.holdoutAssignment.create({
        data: {
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          bookingId: item.bookingId,
          cohortGroup: item.cohort,
          assignmentRule: 'DETERMINISTIC_HASH_80_20',
          deterministicHash: crypto.createHash('sha256').update(item.bookingId).digest('hex').slice(0, 16),
          campaignsSuppressed: item.cohort === 'CONTROL',
          isSyntheticDemo: true,
        },
      });
    }

    const tpl = tplMap[`${item.hospital.id}:appt_confirmation:${item.lang}`];
    const rem24Tpl = tplMap[`${item.hospital.id}:advance_reminder_24h:${item.lang}`];
    const rem3Tpl = tplMap[`${item.hospital.id}:sameday_reminder_3h:${item.lang}`];
    const fvTpl = tplMap[`${item.hospital.id}:first_visit_help:${item.lang}`];

    if (tpl) {
      await prisma.scheduledMessage.create({
        data: {
          idempotencyKey: `${appt.id}:CONFIRMATION`,
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          templateId: tpl.id,
          jobType: 'CONFIRMATION',
          scheduledForUtc: new Date(now - 3600 * 1000 * 6),
          originalTargetUtc: new Date(now - 3600 * 1000 * 6),
          status: item.msgStatus === 'SUPPRESSED' ? 'SUPPRESSED' : 'COMPLETED',
          suppressionReason: item.cohort === 'CONTROL' ? 'PILOT_CONTROL_GROUP_HOLDOUT' : null,
          executedAt: new Date(now - 3600 * 1000 * 6),
          isSyntheticDemo: true,
        },
      });

      const renderedBody =
        item.lang === 'bn'
          ? `নমস্কার ${item.name}, ${item.hospital.name}-এ ${item.doctor}-এর সাথে আপনার ওপিডি অ্যাপয়েন্টমেন্ট ${apptDateStr} তারিখ ${item.time}-এ নির্ধারিত হয়েছে। অনুগ্রহ করে নিচের বোতামটি বেছে নিন।`
          : item.lang === 'hi'
          ? `नमस्कार ${item.name}, ${item.hospital.name} में ${item.doctor} के साथ आपकी ओपीडी अपॉइंटमेंट ${apptDateStr} को ${item.time} बजे बुक है। कृपया नीचे अपनी उपस्थिति की पुष्टि करें।`
          : `Namaskar ${item.name}, your OPD appointment with ${item.doctor} at ${item.hospital.name} is booked for ${apptDateStr} at ${item.time}. Please confirm or manage your visit below.`;

      const wamid = item.msgStatus === 'SUPPRESSED' ? null : `wamid.DEMO.${item.bookingId}.001`;
      const msgLog = await prisma.messageLog.create({
        data: {
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          templateId: tpl.id,
          direction: 'OUTBOUND',
          recipientMobile: item.mobile,
          language: item.lang,
          messageCategory: 'APPOINTMENT_CONFIRMATION',
          renderedContent: renderedBody,
          whatsappMessageId: wamid,
          status: item.msgStatus,
          providerMode: 'DEMO',
          submittedAt: item.msgStatus !== 'SUPPRESSED' ? new Date(now - 3600 * 1000 * 6) : null,
          sentAt: ['SENT', 'DELIVERED', 'READ'].includes(item.msgStatus) ? new Date(now - 3600 * 1000 * 6 + 1500) : null,
          deliveredAt: ['DELIVERED', 'READ'].includes(item.msgStatus) ? new Date(now - 3600 * 1000 * 6 + 4000) : null,
          readAt: item.msgStatus === 'READ' ? new Date(now - 3600 * 1000 * 6 + 19000) : null,
          isSyntheticDemo: true,
        },
      });

      if (wamid) {
        await prisma.whatsAppWebhook.create({
          data: {
            eventIdempotencyKey: `wh-status-${item.bookingId}`,
            eventType: 'MESSAGE_STATUS',
            whatsappMessageId: wamid,
            senderMobile: item.mobile,
            signatureValid: true,
            rawPayload: {
              object: 'whatsapp_business_account',
              entry: [{ changes: [{ value: { statuses: [{ id: wamid, status: item.msgStatus.toLowerCase(), recipient_id: item.mobile }] } }] }],
            },
            processingStatus: 'PROCESSED',
            processedAt: new Date(now - 3600 * 1000 * 5),
          },
        });
      }

      if (item.responseAction) {
        await prisma.patientResponse.create({
          data: {
            appointmentId: appt.id,
            patientId: patient.id,
            hospitalId: item.hospital.id,
            messageLogId: msgLog.id,
            rawResponseText: item.responseText,
            buttonPayload: `BTN_${item.responseAction}`,
            mappedAction: item.responseAction,
            responseChannel: 'WHATSAPP_INTERACTIVE',
            acknowledgementSent: true,
            followUpTriggered: Boolean(item.taskType),
          },
        });

        await prisma.whatsAppWebhook.create({
          data: {
            eventIdempotencyKey: `wh-inbound-${item.bookingId}`,
            eventType: 'INBOUND_MESSAGE',
            whatsappMessageId: `wamid.INBOUND.${item.bookingId}`,
            senderMobile: item.mobile,
            signatureValid: true,
            rawPayload: {
              object: 'whatsapp_business_account',
              entry: [{ changes: [{ value: { messages: [{ from: item.mobile, type: 'interactive', text: item.responseText, action: item.responseAction }] } }] }],
            },
            processingStatus: 'PROCESSED',
            processedAt: new Date(now - 3600 * 1000 * 4),
          },
        });
      }
    }

    if (rem24Tpl) {
      const target24 = new Date(scheduledAtUtc.getTime() - 24 * 3600 * 1000);
      await prisma.scheduledMessage.create({
        data: {
          idempotencyKey: `${appt.id}:REMINDER_24H`,
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          templateId: rem24Tpl.id,
          jobType: 'REMINDER_24H',
          scheduledForUtc: target24,
          originalTargetUtc: target24,
          status:
            item.cohort === 'CONTROL'
              ? 'SUPPRESSED'
              : item.status === 'CANCELLED'
              ? 'CANCELLED'
              : target24.getTime() < now
              ? 'COMPLETED'
              : 'SCHEDULED',
          suppressionReason:
            item.cohort === 'CONTROL'
              ? 'PILOT_CONTROL_GROUP_HOLDOUT'
              : item.status === 'CANCELLED'
              ? 'APPOINTMENT_CANCELLED_IN_HIS'
              : null,
          executedAt: target24.getTime() < now && item.cohort !== 'CONTROL' ? target24 : null,
          isSyntheticDemo: true,
        },
      });
    }

    if (rem3Tpl) {
      const target3 = new Date(scheduledAtUtc.getTime() - 3 * 3600 * 1000);
      await prisma.scheduledMessage.create({
        data: {
          idempotencyKey: `${appt.id}:REMINDER_3H`,
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          templateId: rem3Tpl.id,
          jobType: 'REMINDER_3H',
          scheduledForUtc: target3,
          originalTargetUtc: target3,
          status:
            item.cohort === 'CONTROL'
              ? 'SUPPRESSED'
              : item.status === 'CANCELLED'
              ? 'CANCELLED'
              : target3.getTime() < now
              ? 'COMPLETED'
              : 'SCHEDULED',
          suppressionReason:
            item.cohort === 'CONTROL'
              ? 'PILOT_CONTROL_GROUP_HOLDOUT'
              : item.status === 'CANCELLED'
              ? 'APPOINTMENT_CANCELLED_IN_HIS'
              : null,
          executedAt: target3.getTime() < now && item.cohort !== 'CONTROL' ? target3 : null,
          isSyntheticDemo: true,
        },
      });
    }

    if (item.firstVisit && fvTpl && item.cohort !== 'CONTROL') {
      await prisma.scheduledMessage.create({
        data: {
          idempotencyKey: `${appt.id}:FIRST_VISIT`,
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          templateId: fvTpl.id,
          jobType: 'FIRST_VISIT',
          scheduledForUtc: new Date(now - 3600 * 1000 * 5),
          originalTargetUtc: new Date(now - 3600 * 1000 * 5),
          status: 'COMPLETED',
          executedAt: new Date(now - 3600 * 1000 * 5),
          isSyntheticDemo: true,
        },
      });
    }

    if (item.taskType) {
      taskIdx += 1;
      const pool = item.hospital.code === 'ANHVL-NTK' ? ntkAgents : rprAgents;
      const agent = pool[taskIdx % pool.length];
      await prisma.followUpTask.create({
        data: {
          taskCode: `TSK-2026-${taskIdx}`,
          appointmentId: appt.id,
          patientId: patient.id,
          hospitalId: item.hospital.id,
          taskType: item.taskType,
          priority: item.taskPriority || 'MEDIUM',
          assignedAgentId: agent?.id || null,
          status: item.taskStatus || 'OPEN',
          triggerReason: `Automated escalation (${item.taskType}) for booking ${item.bookingId} (${item.name})`,
          internalNotes: [
            {
              author: 'Workflow Engine',
              timestamp: new Date(now - 3600 * 1000 * 3).toISOString(),
              note: `Patient replied "${item.responseText || item.taskType}" on WhatsApp (${item.lang.toUpperCase()}). Assigned to ${agent?.agentCode || 'Altruist Queue'}.`,
            },
          ],
          resolutionNotes: item.resolutionNotes || null,
          resolvedAt: item.taskStatus === 'RESOLVED' ? new Date(now - 3600 * 1000) : null,
          resolvedBy: item.taskStatus === 'RESOLVED' ? agent?.agentCode || 'ALT-AGENT' : null,
          altruistSyncStatus: item.taskStatus === 'RESOLVED' ? 'EXPORTED_CSV' : 'PENDING_EXPORT',
          isSyntheticDemo: true,
        },
      });
    }

    if (['COMPLETED', 'REGISTERED', 'ARRIVED', 'NO_SHOW', 'CANCELLED'].includes(item.attendance)) {
      await prisma.attendanceRecord.create({
        data: {
          externalVisitId: `HIS-VIS-${item.bookingId}`,
          bookingId: item.bookingId,
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          patientIdentifier: item.uhid,
          outcomeStatus: item.attendance,
          matchStatus: 'MATCHED',
          checkInTime: ['COMPLETED', 'REGISTERED', 'ARRIVED'].includes(item.attendance) ? new Date(now - 3600 * 1000 * 3) : null,
          completedTime: item.attendance === 'COMPLETED' ? new Date(now - 3600 * 1000 * 2) : null,
          rebookingPromptEligible: item.attendance === 'NO_SHOW' && item.cohort !== 'CONTROL',
          rebookingPromptSent: item.attendance === 'NO_SHOW' && item.cohort !== 'CONTROL',
          sourceFeed: 'HIS_OUTCOME_API',
          reconciledBy: 'SYSTEM_RECONCILER',
        },
      });
    }
  }

  // 3. Add a second UNMATCHED attendance record for Raipur
  const rprUnmatched = await prisma.attendanceRecord.findUnique({
    where: { externalVisitId: 'HIS-VIS-UNMATCHED-9902' },
  });
  if (!rprUnmatched) {
    await prisma.attendanceRecord.create({
      data: {
        externalVisitId: 'HIS-VIS-UNMATCHED-9902',
        bookingId: 'HIS-WALKIN-RPR-9902',
        appointmentId: null,
        hospitalId: raipur.id,
        patientIdentifier: 'UHID-RPR-WALKIN-44',
        outcomeStatus: 'UNMATCHED',
        matchStatus: 'UNMATCHED',
        checkInTime: new Date(now - 5400 * 1000),
        rebookingPromptEligible: false,
        rebookingPromptSent: false,
        sourceFeed: 'HIS_OUTCOME_API',
        reconciledBy: 'SYSTEM_RECONCILER',
      },
    });
  }

  // 4. Integration Logs across New Town & Raipur
  const configs = await prisma.integrationConfiguration.findMany();
  const cfgMap = {};
  for (const c of configs) {
    cfgMap[`${c.integrationType}:${c.hospitalId}`] = c;
  }

  await prisma.integrationLog.createMany({
    data: [
      {
        integrationConfigId: cfgMap[`HIS_API:${newTown.id}`]?.id,
        hospitalId: newTown.id,
        integrationType: 'HIS_API',
        operation: 'APPOINTMENT_IMPORT',
        direction: 'INBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 21,
        recordsFailed: 0,
        sanitizedSummary: 'Ingested 21 New Town OPD appointments from HIS feed; deduplicated 0 records; assigned 80/20 Pilot Cohort hashes.',
        durationMs: 342,
      },
      {
        integrationConfigId: cfgMap[`HIS_API:${raipur.id}`]?.id,
        hospitalId: raipur.id,
        integrationType: 'HIS_API',
        operation: 'APPOINTMENT_IMPORT',
        direction: 'INBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 12,
        recordsFailed: 0,
        sanitizedSummary: 'Ingested 12 Raipur OPD appointments from HIS feed; routed Hindi (HI) & English (EN) confirmation templates.',
        durationMs: 289,
      },
      {
        integrationConfigId: cfgMap[`META_WHATSAPP:${newTown.id}`]?.id,
        hospitalId: newTown.id,
        integrationType: 'META_WHATSAPP',
        operation: 'WHATSAPP_SEND',
        direction: 'OUTBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 18,
        recordsFailed: 0,
        sanitizedSummary: '[DEMO SIMULATION] Dispatched 18 Bengali & English utility templates (Confirmation + First-Visit Guide); 3 Control Holdout bookings suppressed.',
        durationMs: 410,
      },
      {
        integrationConfigId: cfgMap[`META_WHATSAPP:${raipur.id}`]?.id,
        hospitalId: raipur.id,
        integrationType: 'META_WHATSAPP',
        operation: 'WHATSAPP_SEND',
        direction: 'OUTBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 11,
        recordsFailed: 1,
        sanitizedSummary: '[DEMO SIMULATION] Dispatched 11 Hindi & English utility templates; 1 recipient undeliverable (Meta code 131026 -> escalated to Altruist callback queue).',
        errorDetails: 'Meta Error 131026 on +919752020003: Fallback call-centre task TSK-2026-105 created.',
        durationMs: 515,
      },
      {
        integrationConfigId: cfgMap[`META_WHATSAPP:${newTown.id}`]?.id,
        hospitalId: newTown.id,
        integrationType: 'META_WHATSAPP',
        operation: 'WEBHOOK_RECEIVE',
        direction: 'INBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 24,
        recordsFailed: 0,
        sanitizedSummary: 'Processed 24 signed Meta webhook events (DELIVERED/READ receipts + interactive button replies CONFIRM, RESCHEDULE, CANCEL, STOP).',
        durationMs: 118,
      },
      {
        integrationConfigId: cfgMap[`HIS_API:${newTown.id}`]?.id,
        hospitalId: newTown.id,
        integrationType: 'HIS_API',
        operation: 'ATTENDANCE_SYNC',
        direction: 'INBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 10,
        recordsFailed: 0,
        sanitizedSummary: 'Reconciled 9 matched OPD outcomes and flagged 1 walk-in visit (HIS-WALKIN-UNKNOWN-9901) as UNMATCHED for manual review.',
        durationMs: 264,
      },
      {
        integrationConfigId: cfgMap[`HIS_API:${raipur.id}`]?.id,
        hospitalId: raipur.id,
        integrationType: 'HIS_API',
        operation: 'ATTENDANCE_SYNC',
        direction: 'INBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 6,
        recordsFailed: 0,
        sanitizedSummary: 'Reconciled 5 matched Raipur OPD visits and flagged 1 walk-in visit (HIS-WALKIN-RPR-9902) as UNMATCHED.',
        durationMs: 195,
      },
      {
        integrationConfigId: cfgMap[`ALTRUIST_CALLCENTRE:${newTown.id}`]?.id,
        hospitalId: newTown.id,
        integrationType: 'ALTRUIST_CALLCENTRE',
        operation: 'ALTRUIST_HANDOFF',
        direction: 'OUTBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 6,
        recordsFailed: 0,
        sanitizedSummary: 'Synchronized 6 New Town patient follow-up tasks (Reschedule, Cancellation Review, Talk-to-Us, No-Show Recovery) to Altruist Kolkata desk.',
        durationMs: 152,
      },
      {
        integrationConfigId: cfgMap[`ALTRUIST_CALLCENTRE:${raipur.id}`]?.id,
        hospitalId: raipur.id,
        integrationType: 'ALTRUIST_CALLCENTRE',
        operation: 'ALTRUIST_HANDOFF',
        direction: 'OUTBOUND',
        status: 'SUCCESS',
        httpStatusCode: 200,
        recordsProcessed: 5,
        recordsFailed: 0,
        sanitizedSummary: 'Synchronized 5 Raipur patient follow-up tasks (including Critical Delivery Failure Fallback) to Altruist Raipur desk.',
        durationMs: 144,
      },
      {
        integrationConfigId: cfgMap[`HIS_API:${newTown.id}`]?.id,
        hospitalId: newTown.id,
        integrationType: 'HIS_API',
        operation: 'CONNECTION_TEST',
        direction: 'OUTBOUND',
        status: 'BLOCKED_MISSING_CREDENTIALS',
        httpStatusCode: 400,
        recordsProcessed: 0,
        recordsFailed: 0,
        sanitizedSummary: 'Production connection check blocked: HIS vendor endpoint URL and Bearer token pending from ANHVL IT team (Operating safely in DEMO mode).',
        durationMs: 45,
      },
    ],
  });

  // 5. Additional SyncJobs
  await prisma.syncJob.createMany({
    data: [
      {
        hospitalId: newTown.id,
        jobType: 'HIS_APPOINTMENT_POLL',
        source: 'SCHEDULED_CRON',
        status: 'COMPLETED',
        totalRecords: 14,
        insertedRecords: 13,
        updatedRecords: 1,
        duplicateSkipped: 0,
        failedRecords: 0,
        startedAt: new Date(now - 3600 * 1000 * 5),
        completedAt: new Date(now - 3600 * 1000 * 5 + 3500),
        triggeredBy: 'CRON_SCHEDULER',
      },
      {
        hospitalId: raipur.id,
        jobType: 'HIS_APPOINTMENT_POLL',
        source: 'SCHEDULED_CRON',
        status: 'COMPLETED',
        totalRecords: 12,
        insertedRecords: 12,
        updatedRecords: 0,
        duplicateSkipped: 0,
        failedRecords: 0,
        startedAt: new Date(now - 3600 * 1000 * 4),
        completedAt: new Date(now - 3600 * 1000 * 4 + 2800),
        triggeredBy: 'CRON_SCHEDULER',
      },
      {
        hospitalId: newTown.id,
        jobType: 'HIS_CSV_IMPORT',
        source: 'CSV_UPLOAD',
        status: 'PARTIAL_FAILURE',
        totalRecords: 15,
        insertedRecords: 12,
        updatedRecords: 1,
        duplicateSkipped: 1,
        failedRecords: 1,
        failedDetails: [{ row: 14, bookingId: 'NTK-BK-ERR-99', reason: 'Invalid E.164 mobile number (+91-12345)' }],
        startedAt: new Date(now - 3600 * 1000 * 3),
        completedAt: new Date(now - 3600 * 1000 * 3 + 1900),
        triggeredBy: 'ops.exec@anhvl-demo.in',
      },
      {
        hospitalId: newTown.id,
        jobType: 'HIS_ATTENDANCE_RECONCILE',
        source: 'API',
        status: 'COMPLETED',
        totalRecords: 10,
        insertedRecords: 10,
        updatedRecords: 0,
        duplicateSkipped: 0,
        failedRecords: 0,
        startedAt: new Date(now - 3600 * 1000 * 2),
        completedAt: new Date(now - 3600 * 1000 * 2 + 2100),
        triggeredBy: 'SYSTEM_RECONCILER',
      },
      {
        hospitalId: raipur.id,
        jobType: 'ALTRUIST_WORKLIST_EXPORT',
        source: 'API',
        status: 'COMPLETED',
        totalRecords: 5,
        insertedRecords: 5,
        updatedRecords: 0,
        duplicateSkipped: 0,
        failedRecords: 0,
        startedAt: new Date(now - 3600 * 1000),
        completedAt: new Date(now - 3600 * 1000 + 950),
        triggeredBy: 'agent.raipur@altruist-demo.in',
      },
    ],
  });

  // 6. Rich Audit Trail
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin?.id,
        actorEmail: 'superadmin@anhvl-demo.in',
        actorRole: 'SUPER_ADMIN',
        hospitalId: newTown.id,
        action: 'HOSPITAL_CONFIG_VERIFIED',
        entityType: 'HospitalConfiguration',
        entityId: newTown.id,
        summary: 'Configured New Town (ANHVL-NTK) Bengali/English routing, 24h & 3h reminder offsets, and 20% Pilot Holdout cohort.',
        ipAddress: '10.20.14.11',
      },
      {
        userId: rprAdmin?.id,
        actorEmail: 'admin.raipur@anhvl-demo.in',
        actorRole: 'HOSPITAL_ADMIN',
        hospitalId: raipur.id,
        action: 'HOSPITAL_CONFIG_VERIFIED',
        entityType: 'HospitalConfiguration',
        entityId: raipur.id,
        summary: 'Configured Raipur (ANHVL-RPR) Hindi/English routing and First-Visit Patient Navigator instructions.',
        ipAddress: '10.24.18.42',
      },
      {
        userId: ntkAdmin?.id,
        actorEmail: 'admin.newtown@anhvl-demo.in',
        actorRole: 'HOSPITAL_ADMIN',
        hospitalId: newTown.id,
        action: 'TEMPLATE_UPDATED',
        entityType: 'MessageTemplate',
        entityId: 'appt_confirmation:bn',
        summary: 'Verified non-clinical compliance on Bengali Appointment Confirmation template v1 (APPROVED_DEMO).',
        ipAddress: '10.20.14.29',
      },
      {
        userId: opsManager?.id,
        actorEmail: 'ops.manager@anhvl-demo.in',
        actorRole: 'OPS_MANAGER',
        hospitalId: newTown.id,
        action: 'STOP_OPTOUT_PROCESSED',
        entityType: 'PatientConsent',
        entityId: 'NTK-BK-2026-1007',
        summary: 'Processed instant STOP opt-out for +919830010007; revoked consent and suppressed pending 24h & 3h reminders.',
        ipAddress: '127.0.0.1',
      },
      {
        userId: opsManager?.id,
        actorEmail: 'ops.manager@anhvl-demo.in',
        actorRole: 'OPS_MANAGER',
        hospitalId: newTown.id,
        action: 'CANCELLED_BY_HIS',
        entityType: 'Appointment',
        entityId: 'NTK-BK-2026-1017',
        summary: 'Confirmed HIS cancellation for booking NTK-BK-2026-1017 after Altruist review; cancelled all future reminders.',
        ipAddress: '10.20.14.55',
      },
      {
        userId: opsManager?.id,
        actorEmail: 'ops.manager@anhvl-demo.in',
        actorRole: 'OPS_MANAGER',
        hospitalId: newTown.id,
        action: 'ATTENDANCE_RECONCILED',
        entityType: 'AttendanceRecord',
        entityId: 'HIS-VIS-UNMATCHED-9901',
        summary: 'Flagged walk-in HIS record HIS-WALKIN-UNKNOWN-9901 as UNMATCHED without auto-classifying as arrived or no-show.',
        ipAddress: '10.20.14.55',
      },
    ],
  });

  console.log('[Seed Enrich] Rich operational dataset populated successfully.');
}
