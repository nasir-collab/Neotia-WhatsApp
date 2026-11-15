export type UserRoleCode =
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'OPS_MANAGER'
  | 'OPS_EXECUTIVE'
  | 'CALL_CENTRE_AGENT'
  | 'MANAGEMENT_VIEWER';

export type SupportedLanguage = 'en' | 'bn' | 'hi';

export type AppointmentStatus =
  | 'RECEIVED'
  | 'VALIDATED'
  | 'CONFIRMATION_PENDING'
  | 'CONFIRMED'
  | 'RESCHEDULE_REQUESTED'
  | 'CANCELLATION_REQUESTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'EXCEPTION';

export type AttendanceStatus =
  | 'PENDING'
  | 'ARRIVED'
  | 'REGISTERED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'CANCELLED'
  | 'UNMATCHED';

export type MessageLifecycleStatus =
  | 'QUEUED'
  | 'SCHEDULED'
  | 'SUBMITTED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'SUPPRESSED'
  | 'CANCELLED';

export type TemplateCategoryCode =
  | 'APPOINTMENT_CONFIRMATION'
  | 'ADVANCE_REMINDER'
  | 'SAMEDAY_REMINDER'
  | 'APPOINTMENT_INSTRUCTIONS'
  | 'DIRECTIONS'
  | 'FIRST_VISIT_ASSISTANCE'
  | 'RESCHEDULE_ACK'
  | 'CANCELLATION_ACK'
  | 'TALK_TO_US_ACK'
  | 'NOSHOW_REBOOKING';

export type PatientResponseAction =
  | 'CONFIRM'
  | 'RESCHEDULE'
  | 'CANCEL'
  | 'TALK_TO_US'
  | 'STOP'
  | 'UNRECOGNIZED';

export type FollowUpTaskType =
  | 'RESCHEDULE_REQUEST'
  | 'CANCELLATION_REVIEW'
  | 'TALK_TO_US_ASSISTANCE'
  | 'UNCONFIRMED_FOLLOWUP'
  | 'DELIVERY_FAILURE_FALLBACK'
  | 'NOSHOW_REBOOKING_ASSIST';

export type FollowUpTaskStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'REOPENED';

export interface ExecutiveKpiOverview {
  appointmentsReceived: number;
  confirmedAppointments: number;
  confirmationPending: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  failedMessages: number;
  rescheduleRequests: number;
  cancellationRequests: number;
  assistanceRequests: number;
  registeredPatients: number;
  completedAppointments: number;
  noShows: number;
  attendanceConversionRate: number;
  deliveryRate: number;
  confirmationRate: number;
  pendingFollowUps: number;
}

