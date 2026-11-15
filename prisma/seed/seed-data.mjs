import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { enrichDemoDataset } from './enrich-demo-data.mjs';

export async function seedDatabase(prisma) {
  const existingHospitals = await prisma.hospital.count();
  if (existingHospitals > 0) {
    console.log('[Seed] Database already contains seeded data. Checking enrichment...');
    await enrichDemoDataset(prisma);
    return;
  }

  console.log('[Seed] Seeding ANHVL WhatsApp Patient Engagement Platform (Synthetic Demo Dataset)...');

  // 1. Roles & Permissions
  const rolesData = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Full cross-hospital platform, security, integration, and mode administration.',
      permissions: [
        ['appointments', 'manage'], ['patients', 'manage'], ['messages', 'manage'],
        ['templates', 'manage'], ['followups', 'manage'], ['attendance', 'manage'],
        ['integrations', 'manage'], ['hospitals', 'manage'], ['users', 'manage'],
        ['reports', 'manage'], ['audit', 'read'], ['settings', 'manage'], ['pilot', 'manage'],
      ],
    },
    {
      code: 'HOSPITAL_ADMIN',
      name: 'Hospital Administrator',
      description: 'Hospital-scoped configuration, template management, user administration, and reporting.',
      permissions: [
        ['appointments', 'manage'], ['patients', 'read'], ['messages', 'manage'],
        ['templates', 'manage'], ['followups', 'manage'], ['attendance', 'manage'],
        ['integrations', 'read'], ['hospitals', 'manage'], ['users', 'read'],
        ['reports', 'export'], ['audit', 'read'], ['pilot', 'read'],
      ],
    },
    {
      code: 'OPS_MANAGER',
      name: 'Operations Manager',
      description: 'Cross-hospital operational oversight, scheduling, reconciliation, and analytics.',
      permissions: [
        ['appointments', 'manage'], ['patients', 'read'], ['messages', 'manage'],
        ['templates', 'read'], ['followups', 'manage'], ['attendance', 'manage'],
        ['integrations', 'read'], ['reports', 'export'], ['audit', 'read'], ['pilot', 'manage'],
      ],
    },
    {
      code: 'OPS_EXECUTIVE',
      name: 'Operations Executive',
      description: 'Day-to-day appointment import, exception handling, and attendance reconciliation.',
      permissions: [
        ['appointments', 'write'], ['patients', 'read'], ['messages', 'read'],
        ['templates', 'read'], ['followups', 'write'], ['attendance', 'write'], ['reports', 'read'],
      ],
    },
    {
      code: 'CALL_CENTRE_AGENT',
      name: 'Call-Centre Agent (Altruist)',
      description: 'Manages patient follow-up worklist, reschedule/cancellation callbacks, and task resolution.',
      permissions: [
        ['appointments', 'read'], ['patients', 'read'], ['messages', 'read'],
        ['followups', 'write'], ['followups', 'export'],
      ],
    },
    {
      code: 'MANAGEMENT_VIEWER',
      name: 'Management / Read-only Viewer',
      description: 'Executive read-only access to dashboards, pilot metrics, and operational reports.',
      permissions: [
        ['appointments', 'read'], ['messages', 'read'], ['templates', 'read'],
        ['followups', 'read'], ['attendance', 'read'], ['reports', 'read'], ['pilot', 'read'],
      ],
    },
  ];

  const roleMap = {};
  for (const r of rolesData) {
    const createdRole = await prisma.role.create({
      data: {
        code: r.code,
        name: r.name,
        description: r.description,
        permissions: {
          create: r.permissions.map(([resource, action]) => ({ resource, action })),
        },
      },
    });
    roleMap[r.code] = createdRole;
  }

  // 2. Hospitals & Configurations
  const newTown = await prisma.hospital.create({
    data: {
      code: 'ANHVL-NTK',
      name: 'Bhagirathi Neotia Woman & Child Care Centre, New Town',
      city: 'New Town, Kolkata',
      state: 'West Bengal',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      isDemoData: true,
      createdBy: 'SYSTEM_SEED',
      configuration: {
        create: {
          address: '[DEMO DATA — PENDING ANHVL VERIFICATION] Street No. 327, Action Area ID, New Town, Kolkata, West Bengal 700156',
          mapLocationUrl: 'https://maps.google.com/?q=New+Town+Kolkata+ANHVL+Demo',
          helpline: '+91-33-0000-1001 (DEMO HELPLINE)',
          opdTimings: 'Mon–Sat: 08:00 AM – 08:00 PM | Sun: 09:00 AM – 02:00 PM (Demo Schedule)',
          entranceGuidance: 'Gate 2 — Main OPD Drop-off & Wheelchair Assisted Entry',
          parkingGuidance: 'Basement Level B1 Visitor Parking via Gate 3; Valet desk at OPD Canopy',
          opdFloorDesk: 'Ground Floor Registration Desk A (Pediatrics) & 1st Floor Desk B (OB-GYN)',
          itemsToCarry: 'Previous OPD card/prescription, valid Photo ID, and booking confirmation message',
          firstVisitInstructions: 'First-time visitors please report 20 minutes prior to appointment time at Ground Floor Registration Counter 1 for UHID generation.',
          supportedLanguages: ['en', 'bn'],
          defaultLanguage: 'en',
          advanceReminderHours: 24,
          preVisitReminderHours: 3,
          quietHoursStart: '21:00',
          quietHoursEnd: '08:00',
          allowMorningException: true,
          morningCutoffTime: '10:30',
          pilotHoldoutEnabled: true,
          pilotHoldoutPercentage: 20,
          departmentDoctorMappings: [
            { department: 'Obstetrics & Gynaecology', doctors: ['Dr. Ananya Chatterjee', 'Dr. Subrata Mukherjee', 'Dr. Ritu Sen'] },
            { department: 'Paediatrics & Neonatology', doctors: ['Dr. Kaushik Banerjee', 'Dr. Priyanka Dasgupta'] },
            { department: 'Fetal Medicine', doctors: ['Dr. Debashis Roy'] },
          ],
          communicationPreferences: {
            sendDirectionsOnConfirmation: true,
            sendFirstVisitGuide: true,
            cancellationRequiresHisConfirmation: true,
          },
          dataVerificationLabel: 'DEMONSTRATION DATA — PENDING ANHVL VERIFICATION',
        },
      },
    },
  });

  const raipur = await prisma.hospital.create({
    data: {
      code: 'ANHVL-RPR',
      name: 'Neotia Bhagirathi Woman & Child Care Centre, Raipur',
      city: 'Raipur',
      state: 'Chhattisgarh',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      isDemoData: true,
      createdBy: 'SYSTEM_SEED',
      configuration: {
        create: {
          address: '[DEMO DATA — PENDING ANHVL VERIFICATION] Sector 24, Atal Nagar / Civil Lines Zone, Raipur, Chhattisgarh 492001',
          mapLocationUrl: 'https://maps.google.com/?q=Raipur+ANHVL+Demo',
          helpline: '+91-771-000-2002 (DEMO HELPLINE)',
          opdTimings: 'Mon–Sat: 08:30 AM – 07:30 PM | Sun: 09:30 AM – 01:30 PM (Demo Schedule)',
          entranceGuidance: 'Main East Gate — Dedicated Maternal & Child OPD Entrance',
          parkingGuidance: 'Surface Visitor Parking Lot P1 adjacent to East Gate',
          opdFloorDesk: 'Atrium Help Point & OPD Registration Wing (Ground Floor)',
          itemsToCarry: 'Valid Government ID, prior consultation records (if any), and WhatsApp booking ID',
          firstVisitInstructions: 'Raipur First-Visit Assistance: Dedicated Patient Navigator available at the Hospital Help Point near Main East Gate. Please arrive 20 minutes early.',
          supportedLanguages: ['hi', 'en'],
          defaultLanguage: 'hi',
          advanceReminderHours: 24,
          preVisitReminderHours: 3,
          quietHoursStart: '21:00',
          quietHoursEnd: '08:00',
          allowMorningException: true,
          morningCutoffTime: '10:30',
          pilotHoldoutEnabled: false,
          pilotHoldoutPercentage: 0,
          departmentDoctorMappings: [
            { department: 'Obstetrics & Gynaecology', doctors: ['Dr. Vandana Sharma', 'Dr. Neha Verma'] },
            { department: 'Paediatrics & Child Care', doctors: ['Dr. Rajesh Tiwari', 'Dr. Amitabh Shukla'] },
            { department: 'Fertility & Reproductive Medicine', doctors: ['Dr. Pooja Agrawal'] },
          ],
          communicationPreferences: {
            sendDirectionsOnConfirmation: true,
            sendFirstVisitGuide: true,
            enhancedFirstVisitAssistance: true,
            cancellationRequiresHisConfirmation: true,
          },
          dataVerificationLabel: 'DEMONSTRATION DATA — PENDING ANHVL VERIFICATION',
        },
      },
    },
  });

  // 3. Users & Call-Centre Agents
  const passwordHash = await bcrypt.hash('AnhvlDemo@2026', 10);
  const usersToCreate = [
    { email: 'superadmin@anhvl-demo.in', fullName: 'Arindam Sen (Plan D / ANHVL Super Admin)', roleCode: 'SUPER_ADMIN', hospitalId: null },
    { email: 'admin.newtown@anhvl-demo.in', fullName: 'Saurav Ghosh (New Town Hospital Admin)', roleCode: 'HOSPITAL_ADMIN', hospitalId: newTown.id },
    { email: 'admin.raipur@anhvl-demo.in', fullName: 'Pradeep Mishra (Raipur Hospital Admin)', roleCode: 'HOSPITAL_ADMIN', hospitalId: raipur.id },
    { email: 'ops.manager@anhvl-demo.in', fullName: 'Rituparna Roy (Group Operations Manager)', roleCode: 'OPS_MANAGER', hospitalId: null },
    { email: 'ops.exec@anhvl-demo.in', fullName: 'Soumyajit Bose (New Town Ops Executive)', roleCode: 'OPS_EXECUTIVE', hospitalId: newTown.id },
    { email: 'agent.kolkata@altruist-demo.in', fullName: 'Moumita Halder (Altruist Desk — Kolkata)', roleCode: 'CALL_CENTRE_AGENT', hospitalId: newTown.id },
    { email: 'agent.raipur@altruist-demo.in', fullName: 'Deepak साहू / Sahu (Altruist Desk — Raipur)', roleCode: 'CALL_CENTRE_AGENT', hospitalId: raipur.id },
    { email: 'management@anhvl-demo.in', fullName: 'ANHVL Leadership Viewer', roleCode: 'MANAGEMENT_VIEWER', hospitalId: null },
  ];

  const createdUsers = {};
  for (const u of usersToCreate) {
    createdUsers[u.email] = await prisma.user.create({
      data: {
        email: u.email,
        fullName: u.fullName,
        passwordHash,
        roleId: roleMap[u.roleCode].id,
        hospitalId: u.hospitalId,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      },
    });
  }

  const agentKolkata = await prisma.agent.create({
    data: {
      userId: createdUsers['agent.kolkata@altruist-demo.in'].id,
      hospitalId: newTown.id,
      agentCode: 'ALT-NTK-101',
      teamName: 'Altruist Patient Desk — Kolkata',
      languagesSpoken: ['en', 'bn'],
      activeQueueCount: 3,
      resolvedCount: 14,
      status: 'AVAILABLE',
    },
  });

  const agentRaipur = await prisma.agent.create({
    data: {
      userId: createdUsers['agent.raipur@altruist-demo.in'].id,
      hospitalId: raipur.id,
      agentCode: 'ALT-RPR-201',
      teamName: 'Altruist Patient Desk — Raipur',
      languagesSpoken: ['hi', 'en'],
      activeQueueCount: 2,
      resolvedCount: 9,
      status: 'AVAILABLE',
    },
  });

  // 4. WhatsApp Message Templates (All 10 Categories across English, Bengali, Hindi)
  const templateDefinitions = [
    {
      code: 'appt_confirmation',
      name: 'Appointment Confirmation',
      category: 'APPOINTMENT_CONFIRMATION',
      buttons: [
        { id: 'BTN_CONFIRM', label: 'Confirm Appointment', action: 'CONFIRM' },
        { id: 'BTN_RESCHEDULE', label: 'Reschedule', action: 'RESCHEDULE' },
        { id: 'BTN_CANCEL', label: 'Cancel', action: 'CANCEL' },
      ],
      bodies: {
        en: 'Namaskar {{patient_name}}, your OPD appointment with {{doctor_name}} at {{hospital_name}} is booked for {{appointment_date}} at {{appointment_time}}. Address: {{hospital_address}}. Helpline: {{helpline}}. Please confirm or manage your visit below. Reply STOP to opt out.',
        bn: 'নমস্কার {{patient_name}}, {{hospital_name}}-এ {{doctor_name}}-এর সাথে আপনার ওপিডি অ্যাপয়েন্টমেন্ট {{appointment_date}} তারিখ {{appointment_time}}-এ নির্ধারিত হয়েছে। ঠিকানা: {{hospital_address}}। হেল্পলাইন: {{helpline}}। অনুগ্রহ করে নিচের বোতামটি বেছে নিন।',
        hi: 'नमस्कार {{patient_name}}, {{hospital_name}} में {{doctor_name}} के साथ आपकी ओपीडी अपॉइंटमेंट {{appointment_date}} को {{appointment_time}} बजे बुक है। पता: {{hospital_address}}। हेल्पलाइन: {{helpline}}। कृपया नीचे अपनी उपस्थिति की पुष्टि करें।',
      },
    },
    {
      code: 'advance_reminder_24h',
      name: 'Advance Reminder (24-Hour)',
      category: 'ADVANCE_REMINDER',
      buttons: [
        { id: 'BTN_CONFIRM', label: 'Confirm Visit', action: 'CONFIRM' },
        { id: 'BTN_RESCHEDULE', label: 'Need Reschedule', action: 'RESCHEDULE' },
        { id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' },
      ],
      bodies: {
        en: 'Reminder for tomorrow: Dear {{patient_name}}, your appointment with {{doctor_name}} at {{hospital_name}} is scheduled for {{appointment_date}} at {{appointment_time}}. Helpline: {{helpline}}. Please confirm if you are attending.',
        bn: 'আগামীকালের অ্যাপয়েন্টমেন্ট রিমাইন্ডার: প্রিয় {{patient_name}}, আগামীকাল {{appointment_date}} তারিখ {{appointment_time}}-এ {{hospital_name}}-এ {{doctor_name}}-এর সাথে আপনার ভিজিট রয়েছে। হেল্পলাইন: {{helpline}}।',
        hi: 'कल के अपॉइंटमेंट का रिमाइंडर: प्रिय {{patient_name}}, {{hospital_name}} में {{doctor_name}} के साथ आपकी अपॉइंटमेंट कल {{appointment_date}} को {{appointment_time}} बजे है। सहायता: {{helpline}}।',
      },
    },
    {
      code: 'sameday_reminder_3h',
      name: 'Same-Day Reminder (2-3 Hour)',
      category: 'SAMEDAY_REMINDER',
      buttons: [
        { id: 'BTN_CONFIRM', label: 'On My Way / Confirm', action: 'CONFIRM' },
        { id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' },
      ],
      bodies: {
        en: 'Same-Day Reminder: Dear {{patient_name}}, your visit with {{doctor_name}} at {{hospital_name}} is today ({{appointment_date}}) at {{appointment_time}}. Please arrive 15 mins early. Helpline: {{helpline}}.',
        bn: 'আজকের অ্যাপয়েন্টমেন্ট রিমাইন্ডার: প্রিয় {{patient_name}}, আজ {{appointment_time}}-এ {{hospital_name}}-এ {{doctor_name}}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট রয়েছে। অনুগ্রহ করে ১৫ মিনিট আগে পৌঁছান।',
        hi: 'आज की अपॉइंटमेंट रिमाइंडर: प्रिय {{patient_name}}, आज {{appointment_time}} बजे {{hospital_name}} में {{doctor_name}} के साथ आपकी विज़िट है। कृपया 15 मिनट पहले पधारें। हेल्पलाइन: {{helpline}}।',
      },
    },
    {
      code: 'appt_instructions',
      name: 'Appointment Instructions',
      category: 'APPOINTMENT_INSTRUCTIONS',
      buttons: [{ id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' }],
      bodies: {
        en: 'Visit Preparation for {{patient_name}} ({{appointment_date}} {{appointment_time}} at {{hospital_name}}): Please carry valid Photo ID and prior OPD registration card. Do not share clinical reports over WhatsApp. Helpline: {{helpline}}.',
        bn: 'ভিজিট নির্দেশিকা ({{patient_name}}): অনুগ্রহ করে বৈধ ফটো আইডি এবং পূর্ববর্তী ওপিডি কার্ড সাথে রাখুন। হেল্পলাইন: {{helpline}}।',
        hi: 'अपॉइंटमेंट निर्देश ({{patient_name}}): कृपया वैध फोटो पहचान पत्र और पिछला ओपीडी कार्ड साथ लाएं। हेल्पलाइन: {{helpline}}।',
      },
    },
    {
      code: 'directions_guide',
      name: 'Directions & Parking Guide',
      category: 'DIRECTIONS',
      buttons: [{ id: 'BTN_TALK', label: 'Need Navigation Help', action: 'TALK_TO_US' }],
      bodies: {
        en: 'Directions to {{hospital_name}} for {{patient_name}}: Address: {{hospital_address}}. Report to OPD Registration Desk before {{appointment_time}} for {{doctor_name}}. Helpline: {{helpline}}.',
        bn: '{{hospital_name}}-এ পৌঁছানোর নির্দেশিকা: ঠিকানা: {{hospital_address}}। {{doctor_name}}-এর অ্যাপয়েন্টমেন্টের জন্য {{appointment_time}}-এর আগে ওপিডি ডেস্কে যোগাযোগ করুন।',
        hi: '{{hospital_name}} पहुंचने का मार्ग: पता: {{hospital_address}}। {{doctor_name}} से परामर्श हेतु {{appointment_time}} से पहले ओपीडी पंजीकरण डेस्क पर संपर्क करें।',
      },
    },
    {
      code: 'first_visit_help',
      name: 'First-Visit Assistance',
      category: 'FIRST_VISIT_ASSISTANCE',
      buttons: [{ id: 'BTN_TALK', label: 'Request Help Desk', action: 'TALK_TO_US' }],
      bodies: {
        en: 'Welcome to {{hospital_name}}, {{patient_name}}! Since this is your first visit on {{appointment_date}} at {{appointment_time}} ({{doctor_name}}), please visit our Hospital Help Point 20 minutes early for quick UHID registration. Helpline: {{helpline}}.',
        bn: '{{hospital_name}}-এ স্বাগতম {{patient_name}}! এটি আপনার প্রথম ভিজিট হওয়ায় অনুগ্রহ করে {{appointment_time}}-এর ২০ মিনিট আগে হেল্প ডেস্কে আসুন। হেল্পলাইন: {{helpline}}।',
        hi: '{{hospital_name}} में आपका स्वागत है, {{patient_name}}! आपकी पहली विज़िट ({{appointment_date}}, {{appointment_time}}) को सुगम बनाने के लिए कृपया 20 मिनट पहले हॉस्पिटल हेल्प पॉइंट पर पधारें। हेल्पलाइन: {{helpline}}।',
      },
    },
    {
      code: 'reschedule_ack',
      name: 'Reschedule Acknowledgement',
      category: 'RESCHEDULE_ACK',
      buttons: [],
      bodies: {
        en: 'Dear {{patient_name}}, we have recorded your request to reschedule your appointment ({{appointment_date}} {{appointment_time}} with {{doctor_name}} at {{hospital_name}}). Our call-centre team will contact you shortly to assist with a new slot. Helpline: {{helpline}}.',
        bn: 'প্রিয় {{patient_name}}, {{doctor_name}}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট পুনরায় নির্ধারণের অনুরোধ গৃহীত হয়েছে। আমাদের কল-সেন্টার টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।',
        hi: 'प्रिय {{patient_name}}, {{doctor_name}} ({{hospital_name}}) के साथ आपकी अपॉइंटमेंट को रीशेड्यूल करने का अनुरोध दर्ज कर लिया गया है। हमारी कॉल-सेंटर टीम नए समय के लिए शीघ्र ही आपसे संपर्क करेगी।',
      },
    },
    {
      code: 'cancel_ack',
      name: 'Cancellation Acknowledgement',
      category: 'CANCELLATION_ACK',
      buttons: [{ id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' }],
      bodies: {
        en: 'Dear {{patient_name}}, we have received your cancellation request for the appointment with {{doctor_name}} on {{appointment_date}} at {{appointment_time}} ({{hospital_name}}). Our team will process this with the hospital registration desk. Helpline: {{helpline}}.',
        bn: 'প্রিয় {{patient_name}}, {{appointment_date}} তারিখে {{doctor_name}}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট বাতিলের অনুরোধ গৃহীত হয়েছে। হেল্পলাইন: {{helpline}}।',
        hi: 'प्रिय {{patient_name}}, {{appointment_date}} को {{doctor_name}} के साथ आपकी अपॉइंटमेंट रद्द करने का अनुरोध प्राप्त हुआ है। हमारी टीम इसे अस्पताल प्रणाली में अपडेट करेगी।',
      },
    },
    {
      code: 'talk_to_us_ack',
      name: 'Talk-to-Us Acknowledgement',
      category: 'TALK_TO_US_ACK',
      buttons: [],
      bodies: {
        en: 'Dear {{patient_name}}, our patient support & Altruist call-centre team at {{hospital_name}} has received your assistance request regarding your visit with {{doctor_name}} ({{appointment_date}} {{appointment_time}}). An executive will call you shortly, or you may reach us at {{helpline}}.',
        bn: 'প্রিয় {{patient_name}}, আপনার সহায়তার অনুরোধ আমাদের কল-সেন্টার টিমের কাছে পৌঁছেছে। শীঘ্রই আমাদের প্রতিনিধি আপনাকে কল করবেন অথবা {{helpline}}-এ যোগাযোগ করুন।',
        hi: 'प्रिय {{patient_name}}, आपकी सहायता का अनुरोध हमारी कॉल-सेंटर टीम को प्राप्त हो गया है। हमारे प्रतिनिधि शीघ्र ही आपसे संपर्क करेंगे, या आप {{helpline}} पर कॉल कर सकते हैं।',
      },
    },
    {
      code: 'noshow_rebooking',
      name: 'No-Show Rebooking Prompt',
      category: 'NOSHOW_REBOOKING',
      buttons: [
        { id: 'BTN_RESCHEDULE', label: 'Request Rebooking Call', action: 'RESCHEDULE' },
        { id: 'BTN_TALK', label: 'Talk to Us', action: 'TALK_TO_US' },
      ],
      bodies: {
        en: 'Dear {{patient_name}}, we noticed you could not attend your scheduled OPD visit with {{doctor_name}} at {{hospital_name}} on {{appointment_date}} ({{appointment_time}}). Would you like our team to help rebook your appointment? Reply below or call {{helpline}}.',
        bn: 'প্রিয় {{patient_name}}, {{appointment_date}} তারিখে {{doctor_name}}-এর সাথে আপনার ওপিডি ভিজিটে আপনাকে আমরা মিস করেছি। আপনি কি পুনরায় বুকিং করতে চান? নিচে জানান বা {{helpline}}-এ কল করুন।',
        hi: 'प्रिय {{patient_name}}, हमने देखा कि आप {{appointment_date}} को {{hospital_name}} में {{doctor_name}} के साथ अपनी ओपीडी विज़िट में उपस्थित नहीं हो सके। क्या आप दोबारा अपॉइंटमेंट बुक करना चाहेंगे? नीचे चुनें या {{helpline}} पर कॉल करें।',
      },
    },
  ];

  const variablesList = [
    'patient_name',
    'appointment_date',
    'appointment_time',
    'doctor_name',
    'hospital_name',
    'hospital_address',
    'helpline',
  ];

  const createdTemplates = {}; // key: `${hospitalId}:${code}:${lang}`
  for (const def of templateDefinitions) {
    // New Town: en, bn
    for (const lang of ['en', 'bn']) {
      const tpl = await prisma.messageTemplate.create({
        data: {
          hospitalId: newTown.id,
          code: def.code,
          name: `${def.name} (${lang.toUpperCase()} — New Town)`,
          category: def.category,
          language: lang,
          metaTemplateName: `anhvl_ntk_${def.code}_${lang}_v1`,
          metaCategory: 'UTILITY',
          activeVersion: 1,
          approvalStatus: 'APPROVED_DEMO',
          status: 'ACTIVE',
          createdBy: 'SYSTEM_SEED',
          versions: {
            create: {
              versionNumber: 1,
              headerText: 'ANHVL Patient Service Notification',
              bodyText: def.bodies[lang],
              footerText: 'Non-clinical appointment service message • Reply STOP to opt out',
              variables: variablesList,
              interactiveButtons: def.buttons,
              approvalStatus: 'APPROVED_DEMO',
              metaTemplateId: `META_DEMO_NTK_${def.code.toUpperCase()}_${lang.toUpperCase()}`,
              submittedAt: new Date(Date.now() - 86400000 * 5),
              approvedAt: new Date(Date.now() - 86400000 * 4),
              createdBy: 'SYSTEM_SEED',
            },
          },
        },
      });
      createdTemplates[`${newTown.id}:${def.code}:${lang}`] = tpl;
    }

    // Raipur: hi, en
    for (const lang of ['hi', 'en']) {
      const tpl = await prisma.messageTemplate.create({
        data: {
          hospitalId: raipur.id,
          code: def.code,
          name: `${def.name} (${lang.toUpperCase()} — Raipur)`,
          category: def.category,
          language: lang,
          metaTemplateName: `anhvl_rpr_${def.code}_${lang}_v1`,
          metaCategory: 'UTILITY',
          activeVersion: 1,
          approvalStatus: 'APPROVED_DEMO',
          status: 'ACTIVE',
          createdBy: 'SYSTEM_SEED',
          versions: {
            create: {
              versionNumber: 1,
              headerText: 'ANHVL Raipur Patient Desk',
              bodyText: def.bodies[lang],
              footerText: 'Non-clinical appointment service message • Reply STOP to opt out',
              variables: variablesList,
              interactiveButtons: def.buttons,
              approvalStatus: 'APPROVED_DEMO',
              metaTemplateId: `META_DEMO_RPR_${def.code.toUpperCase()}_${lang.toUpperCase()}`,
              submittedAt: new Date(Date.now() - 86400000 * 5),
              approvedAt: new Date(Date.now() - 86400000 * 4),
              createdBy: 'SYSTEM_SEED',
            },
          },
        },
      });
      createdTemplates[`${raipur.id}:${def.code}:${lang}`] = tpl;
    }
  }

  // 5. Integration Configurations
  await prisma.integrationConfiguration.createMany({
    data: [
      {
        hospitalId: newTown.id,
        integrationType: 'META_WHATSAPP',
        name: 'Meta WhatsApp Business Cloud API — New Town (WABA)',
        mode: 'DEMO',
        endpointUrl: 'https://graph.facebook.com/v21.0',
        authType: 'BEARER_TOKEN',
        credentialsConfigured: false,
        fieldMappings: { wabaId: 'PENDING_ANHVL', phoneNumberId: 'PENDING_ANHVL' },
        connectionStatus: 'DEMO_SIMULATED',
        missingPrerequisites: [
          'ANHVL Meta Business Manager WABA ID',
          'Dedicated Sender Phone Number ID',
          'Permanent System User Access Token',
          'Meta Live Utility Template Approval Sign-off',
        ],
      },
      {
        hospitalId: raipur.id,
        integrationType: 'META_WHATSAPP',
        name: 'Meta WhatsApp Business Cloud API — Raipur (WABA)',
        mode: 'DEMO',
        endpointUrl: 'https://graph.facebook.com/v21.0',
        authType: 'BEARER_TOKEN',
        credentialsConfigured: false,
        fieldMappings: { wabaId: 'PENDING_ANHVL', phoneNumberId: 'PENDING_ANHVL' },
        connectionStatus: 'DEMO_SIMULATED',
        missingPrerequisites: [
          'ANHVL Meta Business Manager WABA ID',
          'Raipur Sender Phone Number ID',
          'Permanent System User Access Token',
          'Meta Hindi/English Template Approval Sign-off',
        ],
      },
      {
        hospitalId: newTown.id,
        integrationType: 'HIS_API',
        name: 'HIS Inbound Appointment & Attendance REST Connector — New Town',
        mode: 'DEMO',
        endpointUrl: '',
        authType: 'BEARER_TOKEN',
        credentialsConfigured: false,
        fieldMappings: {
          bookingId: 'booking_ref_no',
          externalPatientId: 'uhid',
          patientName: 'patient_full_name',
          mobileNumber: 'patient_mobile',
          preferredLanguage: 'lang_code',
          department: 'speciality_name',
          doctorName: 'consultant_name',
          appointmentDate: 'slot_date',
          appointmentTime: 'slot_time',
          consentStatus: 'whatsapp_consent_flag',
        },
        connectionStatus: 'AWAITING_CREDENTIALS',
        missingPrerequisites: [
          'HIS Vendor API Endpoint URL & VPN/Firewall Whitelisting',
          'HIS API Authentication Credentials',
          'Confirmed Cancellation/Reschedule Event Payload Schema',
        ],
      },
      {
        hospitalId: raipur.id,
        integrationType: 'HIS_API',
        name: 'HIS Inbound Appointment & Attendance REST Connector — Raipur',
        mode: 'DEMO',
        endpointUrl: '',
        authType: 'BEARER_TOKEN',
        credentialsConfigured: false,
        fieldMappings: {
          bookingId: 'booking_ref_no',
          externalPatientId: 'uhid',
          patientName: 'patient_full_name',
          mobileNumber: 'patient_mobile',
          preferredLanguage: 'lang_code',
          department: 'speciality_name',
          doctorName: 'consultant_name',
          appointmentDate: 'slot_date',
          appointmentTime: 'slot_time',
          consentStatus: 'whatsapp_consent_flag',
        },
        connectionStatus: 'AWAITING_CREDENTIALS',
        missingPrerequisites: [
          'Raipur HIS API Endpoint URL & Credentials',
          'Attendance Registration Outcome Feed Key Mapping',
        ],
      },
      {
        hospitalId: newTown.id,
        integrationType: 'ALTRUIST_CALLCENTRE',
        name: 'Altruist Call-Centre Handoff Adapter — New Town',
        mode: 'DEMO',
        endpointUrl: '',
        authType: 'API_KEY',
        credentialsConfigured: false,
        fieldMappings: { handoffMethod: 'WORKLIST_CSV_AND_DASHBOARD' },
        connectionStatus: 'DEMO_SIMULATED',
        missingPrerequisites: [
          'Altruist CRM API Documentation & Auth Token (Currently operating via secure Agent Worklist & CSV Handoff)',
        ],
      },
      {
        hospitalId: raipur.id,
        integrationType: 'ALTRUIST_CALLCENTRE',
        name: 'Altruist Call-Centre Handoff Adapter — Raipur',
        mode: 'DEMO',
        endpointUrl: '',
        authType: 'API_KEY',
        credentialsConfigured: false,
        fieldMappings: { handoffMethod: 'WORKLIST_CSV_AND_DASHBOARD' },
        connectionStatus: 'DEMO_SIMULATED',
        missingPrerequisites: [
          'Altruist CRM API Documentation & Auth Token (Currently operating via secure Agent Worklist & CSV Handoff)',
        ],
      },
    ],
  });

  // 6. Synthetic Patients, Consents, Appointments, Messages, Responses, Tasks, Attendance, Pilot Holdouts
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);

  const syntheticRecords = [
    {
      bookingId: 'NTK-BK-2026-1001',
      uhid: 'UHID-NTK-501',
      name: 'Sohini Mukhopadhyay (SYNTHETIC)',
      mobile: '+919830010001',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ananya Chatterjee',
      date: tomorrow,
      time: '10:30',
      status: 'CONFIRMED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1002',
      uhid: 'UHID-NTK-502',
      name: 'Debabrata Sen (SYNTHETIC)',
      mobile: '+919830010002',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Kaushik Banerjee',
      date: tomorrow,
      time: '11:30',
      status: 'RESCHEDULE_REQUESTED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: true,
      cohort: 'TREATMENT',
      msgStatus: 'DELIVERED',
      responseAction: 'RESCHEDULE',
      responseText: 'Reschedule',
      taskType: 'RESCHEDULE_REQUEST',
      taskPriority: 'HIGH',
      taskStatus: 'IN_PROGRESS',
    },
    {
      bookingId: 'NTK-BK-2026-1003',
      uhid: 'UHID-NTK-503',
      name: 'Madhumita Das (SYNTHETIC)',
      mobile: '+919830010003',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Subrata Mukherjee',
      date: tomorrow,
      time: '14:00',
      status: 'CANCELLATION_REQUESTED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CANCEL',
      responseText: 'Cancel',
      taskType: 'CANCELLATION_REVIEW',
      taskPriority: 'HIGH',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'NTK-BK-2026-1004',
      uhid: 'UHID-NTK-504',
      name: 'Poulami Chakraborty (SYNTHETIC)',
      mobile: '+919830010004',
      lang: 'en',
      hospital: newTown,
      dept: 'Fetal Medicine',
      doctor: 'Dr. Debashis Roy',
      date: today,
      time: '09:30',
      status: 'COMPLETED',
      attendance: 'COMPLETED',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'NTK-BK-2026-1005',
      uhid: 'UHID-NTK-505',
      name: 'Anirban Ghosh (SYNTHETIC)',
      mobile: '+919830010005',
      lang: 'bn',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Priyanka Dasgupta',
      date: yesterday,
      time: '16:00',
      status: 'NO_SHOW',
      attendance: 'NO_SHOW',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'DELIVERED',
      taskType: 'NOSHOW_REBOOKING_ASSIST',
      taskPriority: 'MEDIUM',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'NTK-BK-2026-1006',
      uhid: 'UHID-NTK-506',
      name: 'Sutapa Roychowdhury (SYNTHETIC — CONTROL HOLDOUT)',
      mobile: '+919830010006',
      lang: 'bn',
      hospital: newTown,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Ritu Sen',
      date: yesterday,
      time: '12:00',
      status: 'NO_SHOW',
      attendance: 'NO_SHOW',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: 'CONTROL',
      msgStatus: 'SUPPRESSED',
    },
    {
      bookingId: 'NTK-BK-2026-1007',
      uhid: 'UHID-NTK-507',
      name: 'Subhajit Mondal (SYNTHETIC — OPTED OUT)',
      mobile: '+919830010007',
      lang: 'en',
      hospital: newTown,
      dept: 'Paediatrics & Neonatology',
      doctor: 'Dr. Kaushik Banerjee',
      date: tomorrow,
      time: '17:00',
      status: 'CONFIRMATION_PENDING',
      attendance: 'PENDING',
      consent: 'REVOKED',
      optOut: true,
      firstVisit: false,
      cohort: 'TREATMENT',
      msgStatus: 'DELIVERED',
      responseAction: 'STOP',
      responseText: 'STOP',
    },
    {
      bookingId: 'RPR-BK-2026-2001',
      uhid: 'UHID-RPR-801',
      name: 'Kavita Verma (SYNTHETIC)',
      mobile: '+919752020001',
      lang: 'hi',
      hospital: raipur,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Vandana Sharma',
      date: tomorrow,
      time: '11:00',
      status: 'CONFIRMED',
      attendance: 'PENDING',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: true,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
    {
      bookingId: 'RPR-BK-2026-2002',
      uhid: 'UHID-RPR-802',
      name: 'Rajendra Prasad Tiwari (SYNTHETIC)',
      mobile: '+919752020002',
      lang: 'hi',
      hospital: raipur,
      dept: 'Paediatrics & Child Care',
      doctor: 'Dr. Rajesh Tiwari',
      date: tomorrow,
      time: '12:30',
      status: 'CONFIRMATION_PENDING',
      attendance: 'PENDING',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: true,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'TALK_TO_US',
      responseText: 'Talk to Us — Need parking & first visit help',
      taskType: 'TALK_TO_US_ASSISTANCE',
      taskPriority: 'HIGH',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'RPR-BK-2026-2003',
      uhid: 'UHID-RPR-803',
      name: 'Sunita Agrawal (SYNTHETIC)',
      mobile: '+919752020003',
      lang: 'en',
      hospital: raipur,
      dept: 'Fertility & Reproductive Medicine',
      doctor: 'Dr. Pooja Agrawal',
      date: tomorrow,
      time: '15:00',
      status: 'CONFIRMATION_PENDING',
      attendance: 'PENDING',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: null,
      msgStatus: 'FAILED',
      taskType: 'DELIVERY_FAILURE_FALLBACK',
      taskPriority: 'CRITICAL',
      taskStatus: 'OPEN',
    },
    {
      bookingId: 'RPR-BK-2026-2004',
      uhid: 'UHID-RPR-804',
      name: 'Meenakshi Sahu (SYNTHETIC)',
      mobile: '+919752020004',
      lang: 'hi',
      hospital: raipur,
      dept: 'Obstetrics & Gynaecology',
      doctor: 'Dr. Neha Verma',
      date: today,
      time: '10:00',
      status: 'COMPLETED',
      attendance: 'REGISTERED',
      consent: 'GRANTED',
      optOut: false,
      firstVisit: false,
      cohort: null,
      msgStatus: 'READ',
      responseAction: 'CONFIRM',
      responseText: 'Confirm Appointment',
    },
  ];

  let taskCounter = 100;
  for (const item of syntheticRecords) {
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
        consentSource: item.optOut ? 'WHATSAPP_STOP' : 'HIS_BOOKING_FEED',
        optOutStatus: item.optOut,
        optOutTimestamp: item.optOut ? new Date() : null,
        optOutReason: item.optOut ? 'Patient replied STOP via WhatsApp' : null,
        communicationEligible: !item.optOut,
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
        opdLocation: item.hospital.code === 'ANHVL-NTK' ? 'OPD Wing A' : 'Main OPD Block',
        appointmentDate: new Date(`${apptDateStr}T00:00:00.000Z`),
        appointmentTime: item.time,
        scheduledAtUtc,
        bookingSource: 'HIS_API',
        consentStatus: item.consent,
        status: item.status,
        attendanceStatus: item.attendance,
        integrationSource: 'HIS_REST',
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
        description: `Appointment ${item.bookingId} ingested and validated (${item.lang.toUpperCase()} routing).`,
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

    const tpl = createdTemplates[`${item.hospital.id}:appt_confirmation:${item.lang}`];
    const remTpl = createdTemplates[`${item.hospital.id}:advance_reminder_24h:${item.lang}`];

    // Scheduled Messages
    await prisma.scheduledMessage.create({
      data: {
        idempotencyKey: `${appt.id}:CONFIRMATION`,
        appointmentId: appt.id,
        hospitalId: item.hospital.id,
        templateId: tpl.id,
        jobType: 'CONFIRMATION',
        scheduledForUtc: new Date(Date.now() - 3600 * 1000 * 4),
        originalTargetUtc: new Date(Date.now() - 3600 * 1000 * 4),
        status: item.msgStatus === 'SUPPRESSED' ? 'SUPPRESSED' : item.msgStatus === 'FAILED' ? 'FAILED' : 'COMPLETED',
        suppressionReason: item.cohort === 'CONTROL' ? 'PILOT_CONTROL_GROUP_HOLDOUT' : null,
        retryCount: item.msgStatus === 'FAILED' ? 3 : 0,
        lastError: item.msgStatus === 'FAILED' ? 'Meta Cloud API Error 131026: Message undeliverable (recipient incapable of receiving message)' : null,
        executedAt: new Date(Date.now() - 3600 * 1000 * 4),
        isSyntheticDemo: true,
      },
    });

    await prisma.scheduledMessage.create({
      data: {
        idempotencyKey: `${appt.id}:REMINDER_24H`,
        appointmentId: appt.id,
        hospitalId: item.hospital.id,
        templateId: remTpl.id,
        jobType: 'REMINDER_24H',
        scheduledForUtc: new Date(scheduledAtUtc.getTime() - 24 * 3600 * 1000),
        originalTargetUtc: new Date(scheduledAtUtc.getTime() - 24 * 3600 * 1000),
        status: item.optOut || item.cohort === 'CONTROL' ? 'SUPPRESSED' : 'SCHEDULED',
        suppressionReason: item.optOut ? 'PATIENT_OPTED_OUT_STOP' : item.cohort === 'CONTROL' ? 'PILOT_CONTROL_GROUP_HOLDOUT' : null,
        isSyntheticDemo: true,
      },
    });

    const msgLog = await prisma.messageLog.create({
      data: {
        appointmentId: appt.id,
        hospitalId: item.hospital.id,
        templateId: tpl.id,
        direction: 'OUTBOUND',
        recipientMobile: item.mobile,
        language: item.lang,
        messageCategory: 'APPOINTMENT_CONFIRMATION',
        renderedContent: `[DEMO] Appointment Confirmation for ${item.name} with ${item.doctor} on ${apptDateStr} at ${item.time} (${item.hospital.name}).`,
        whatsappMessageId: item.msgStatus === 'SUPPRESSED' ? null : `wamid.DEMO.${item.bookingId}.001`,
        status: item.msgStatus,
        providerMode: 'DEMO',
        submittedAt: item.msgStatus !== 'SUPPRESSED' ? new Date(Date.now() - 3600 * 1000 * 4) : null,
        sentAt: ['SENT', 'DELIVERED', 'READ'].includes(item.msgStatus) ? new Date(Date.now() - 3600 * 1000 * 4 + 2000) : null,
        deliveredAt: ['DELIVERED', 'READ'].includes(item.msgStatus) ? new Date(Date.now() - 3600 * 1000 * 4 + 5000) : null,
        readAt: item.msgStatus === 'READ' ? new Date(Date.now() - 3600 * 1000 * 4 + 25000) : null,
        failedAt: item.msgStatus === 'FAILED' ? new Date(Date.now() - 3600 * 1000 * 4 + 4000) : null,
        failureCode: item.msgStatus === 'FAILED' ? '131026' : null,
        failureReason: item.msgStatus === 'FAILED' ? 'Recipient phone number not registered on WhatsApp or blocked' : null,
        retryCount: item.msgStatus === 'FAILED' ? 3 : 0,
        isSyntheticDemo: true,
      },
    });

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
    }

    if (item.taskType) {
      taskCounter += 1;
      const assignedAgent = item.hospital.code === 'ANHVL-NTK' ? agentKolkata : agentRaipur;
      await prisma.followUpTask.create({
        data: {
          taskCode: `TSK-2026-${taskCounter}`,
          appointmentId: appt.id,
          patientId: patient.id,
          hospitalId: item.hospital.id,
          taskType: item.taskType,
          priority: item.taskPriority || 'MEDIUM',
          assignedAgentId: assignedAgent.id,
          status: item.taskStatus || 'OPEN',
          triggerReason: `Automated workflow escalation for ${item.taskType} on booking ${item.bookingId}`,
          internalNotes: [
            {
              author: 'System Workflow Engine',
              timestamp: new Date().toISOString(),
              note: `Task automatically created from patient/message event (${item.taskType}).`,
            },
          ],
          altruistSyncStatus: 'PENDING_EXPORT',
          isSyntheticDemo: true,
        },
      });
    }

    if (['COMPLETED', 'REGISTERED', 'NO_SHOW'].includes(item.attendance)) {
      await prisma.attendanceRecord.create({
        data: {
          externalVisitId: `HIS-VIS-${item.bookingId}`,
          bookingId: item.bookingId,
          appointmentId: appt.id,
          hospitalId: item.hospital.id,
          patientIdentifier: item.uhid,
          outcomeStatus: item.attendance,
          matchStatus: 'MATCHED',
          checkInTime: item.attendance !== 'NO_SHOW' ? new Date(Date.now() - 3600 * 1000 * 2) : null,
          completedTime: item.attendance === 'COMPLETED' ? new Date(Date.now() - 3600 * 1000) : null,
          rebookingPromptEligible: item.attendance === 'NO_SHOW' && item.cohort !== 'CONTROL',
          rebookingPromptSent: item.attendance === 'NO_SHOW' && item.cohort !== 'CONTROL',
          sourceFeed: 'HIS_OUTCOME_API',
          reconciledBy: 'SYSTEM_RECONCILER',
        },
      });
    }
  }

  // Also create 1 UNMATCHED Attendance Record to demonstrate strict rule:
  // "Do not automatically classify unmatched records as arrived or no-show."
  await prisma.attendanceRecord.create({
    data: {
      externalVisitId: 'HIS-VIS-UNMATCHED-9901',
      bookingId: 'HIS-WALKIN-UNKNOWN-9901',
      appointmentId: null,
      hospitalId: newTown.id,
      patientIdentifier: 'UHID-NTK-WALKIN-99',
      outcomeStatus: 'UNMATCHED',
      matchStatus: 'UNMATCHED',
      checkInTime: new Date(),
      rebookingPromptEligible: false,
      rebookingPromptSent: false,
      sourceFeed: 'HIS_OUTCOME_CSV',
      reconciledBy: 'SYSTEM_RECONCILER',
    },
  });

  // 7. System Settings
  await prisma.systemSetting.createMany({
    data: [
      {
        key: 'OPERATING_MODE',
        value: { mode: 'DEMO', allowProductionSwitchOnlyWhenVerified: true },
        category: 'OPERATIONS',
        description: 'Controls whether the platform operates in isolated Synthetic Demo Mode or Live Production Mode.',
      },
      {
        key: 'QUIET_HOURS_POLICY',
        value: { startLocal: '21:00', endLocal: '08:00', allowMorningExceptionBefore: '10:30' },
        category: 'OPERATIONS',
        description: 'Restricts routine WhatsApp reminders to 8:00 AM – 9:00 PM hospital local time with morning-visit exception.',
      },
      {
        key: 'DATA_RETENTION_POLICY',
        value: { messageLogsDays: 180, webhookPayloadsDays: 90, auditLogsDays: 365, clinicalContentProhibited: true },
        category: 'SECURITY',
        description: 'Data protection and non-clinical communication safeguard configuration.',
      },
      {
        key: 'SIMULATOR_CLOCK',
        value: { simulatedIsoTime: new Date().toISOString(), activeScenario: null, isRunning: false },
        category: 'SIMULATOR',
        description: 'Controllable simulation clock for the isolated Live Demo Simulator.',
      },
    ],
  });

  // 8. Initial SyncJob & AuditLog
  await prisma.syncJob.create({
    data: {
      hospitalId: newTown.id,
      jobType: 'HIS_APPOINTMENT_POLL',
      source: 'API',
      status: 'COMPLETED',
      totalRecords: 11,
      insertedRecords: 11,
      updatedRecords: 0,
      duplicateSkipped: 0,
      failedRecords: 0,
      completedAt: new Date(),
      triggeredBy: 'SYSTEM_SEED',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: createdUsers['superadmin@anhvl-demo.in'].id,
      actorEmail: 'superadmin@anhvl-demo.in',
      actorRole: 'SUPER_ADMIN',
      hospitalId: null,
      action: 'PLATFORM_INITIALIZED',
      entityType: 'SystemSetting',
      entityId: 'OPERATING_MODE',
      summary: 'Initialized ANHVL WhatsApp Patient Engagement Platform in DEMO MODE with synthetic New Town & Raipur datasets.',
      ipAddress: '127.0.0.1',
    },
  });

  await enrichDemoDataset(prisma);
  console.log('[Seed] Completed seeding all 24 entities successfully.');
}

