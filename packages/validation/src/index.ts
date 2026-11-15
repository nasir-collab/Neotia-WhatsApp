import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const CreateAppointmentSchema = z.object({
  bookingId: z.string().min(3, 'External Booking ID is required'),
  externalPatientId: z.string().min(2, 'External Patient ID is required'),
  patientName: z.string().min(2, 'Patient full name is required'),
  mobileNumber: z.string().regex(/^\+?[0-9]{10,15}$/, 'Valid 10-15 digit mobile number required'),
  preferredLanguage: z.enum(['en', 'bn', 'hi']).default('en'),
  hospitalId: z.string().min(1, 'Hospital ID is required'),
  department: z.string().min(2, 'Department is required'),
  doctorName: z.string().min(2, 'Doctor name is required'),
  doctorCode: z.string().optional(),
  opdLocation: z.string().optional(),
  appointmentDate: z.string().min(8, 'Appointment date (YYYY-MM-DD) is required'),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:mm (24h format)'),
  bookingSource: z.enum(['HIS_API', 'HIS_WEBHOOK', 'SFTP_CSV', 'CALL_CENTRE', 'WALK_IN', 'DEMO_SIMULATOR']).default('HIS_API'),
  consentStatus: z.enum(['GRANTED', 'REVOKED', 'PENDING', 'UNKNOWN']).default('GRANTED'),
  isFirstVisit: z.boolean().default(false),
  isSyntheticDemo: z.boolean().default(false),
});

export const AttendanceReconcileSchema = z.object({
  externalVisitId: z.string().min(2),
  bookingId: z.string().min(2),
  hospitalId: z.string().min(1),
  patientIdentifier: z.string().optional(),
  outcomeStatus: z.enum(['ARRIVED', 'REGISTERED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']),
  checkInTime: z.string().optional(),
  completedTime: z.string().optional(),
  sourceFeed: z.string().default('HIS_OUTCOME_API'),
});

export const NonClinicalContentCheck = (text: string): { valid: boolean; reason?: string } => {
  const prohibitedPatterns = [
    /\b(diagnosis|prescribed|prescription|mg\b|dosage|biopsy|malignancy|hiv|chemotherapy|pathology report)\b/i,
  ];
  for (const pattern of prohibitedPatterns) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reason: 'Prohibited clinical/diagnostic content detected. Phase 1 safeguard restricts WhatsApp messages to non-clinical appointment and service communication.',
      };
    }
  }
  return { valid: true };
};

