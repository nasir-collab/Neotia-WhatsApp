-- ANHVL WhatsApp Patient Engagement Platform
-- Initial PostgreSQL Schema Migration (24 Normalized Entities)

-- 1. roles
CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "roles_code_key" ON "roles"("code");

-- 2. permissions
CREATE TABLE IF NOT EXISTS "permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_role_id_resource_action_key" ON "permissions"("role_id", "resource", "action");
CREATE INDEX IF NOT EXISTS "permissions_role_id_idx" ON "permissions"("role_id");

-- 3. hospitals
CREATE TABLE IF NOT EXISTS "hospitals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "is_demo_data" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "hospitals_code_key" ON "hospitals"("code");
CREATE INDEX IF NOT EXISTS "hospitals_code_idx" ON "hospitals"("code");
CREATE INDEX IF NOT EXISTS "hospitals_status_idx" ON "hospitals"("status");

-- 4. hospital_configurations
CREATE TABLE IF NOT EXISTS "hospital_configurations" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "map_location_url" TEXT NOT NULL,
    "helpline" TEXT NOT NULL,
    "opd_timings" TEXT NOT NULL,
    "entrance_guidance" TEXT NOT NULL,
    "parking_guidance" TEXT NOT NULL,
    "opd_floor_desk" TEXT NOT NULL,
    "items_to_carry" TEXT NOT NULL,
    "first_visit_instructions" TEXT NOT NULL,
    "supported_languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "default_language" TEXT NOT NULL DEFAULT 'en',
    "advance_reminder_hours" INTEGER NOT NULL DEFAULT 24,
    "pre_visit_reminder_hours" INTEGER NOT NULL DEFAULT 3,
    "quiet_hours_start" TEXT NOT NULL DEFAULT '21:00',
    "quiet_hours_end" TEXT NOT NULL DEFAULT '08:00',
    "allow_morning_exception" BOOLEAN NOT NULL DEFAULT true,
    "morning_cutoff_time" TEXT NOT NULL DEFAULT '10:30',
    "pilot_holdout_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pilot_holdout_percentage" INTEGER NOT NULL DEFAULT 20,
    "department_doctor_mappings" JSONB NOT NULL DEFAULT '[]',
    "communication_preferences" JSONB NOT NULL DEFAULT '{}',
    "data_verification_label" TEXT NOT NULL DEFAULT 'DEMONSTRATION DATA — PENDING ANHVL VERIFICATION',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hospital_configurations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hospital_configurations_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_configurations_hospital_id_key" ON "hospital_configurations"("hospital_id");

-- 5. users
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "hospital_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "refresh_token_hash" TEXT,
    "reset_token_hash" TEXT,
    "reset_token_expires_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "users_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_id_idx" ON "users"("role_id");
CREATE INDEX IF NOT EXISTS "users_hospital_id_idx" ON "users"("hospital_id");

-- 6. patients
CREATE TABLE IF NOT EXISTS "patients" (
    "id" TEXT NOT NULL,
    "external_patient_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patients_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "patients_hospital_id_external_patient_id_key" ON "patients"("hospital_id", "external_patient_id");
CREATE INDEX IF NOT EXISTS "patients_mobile_number_idx" ON "patients"("mobile_number");
CREATE INDEX IF NOT EXISTS "patients_hospital_id_idx" ON "patients"("hospital_id");

-- 7. patient_consents
CREATE TABLE IF NOT EXISTS "patient_consents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "consent_status" TEXT NOT NULL DEFAULT 'GRANTED',
    "consent_source" TEXT NOT NULL DEFAULT 'HIS_BOOKING_FEED',
    "consent_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opt_out_status" BOOLEAN NOT NULL DEFAULT false,
    "opt_out_timestamp" TIMESTAMP(3),
    "opt_out_reason" TEXT,
    "communication_eligible" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patient_consents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_consents_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "patient_consents_patient_id_hospital_id_key" ON "patient_consents"("patient_id", "hospital_id");
CREATE INDEX IF NOT EXISTS "patient_consents_hospital_id_communication_eligible_idx" ON "patient_consents"("hospital_id", "communication_eligible");

-- 8. appointments
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "preferred_language" TEXT NOT NULL DEFAULT 'en',
    "department" TEXT NOT NULL,
    "doctor_name" TEXT NOT NULL,
    "doctor_code" TEXT,
    "opd_location" TEXT,
    "appointment_date" TIMESTAMP(3) NOT NULL,
    "appointment_time" TEXT NOT NULL,
    "scheduled_at_utc" TIMESTAMP(3) NOT NULL,
    "booking_source" TEXT NOT NULL DEFAULT 'HIS_API',
    "consent_status" TEXT NOT NULL DEFAULT 'GRANTED',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "attendance_status" TEXT NOT NULL DEFAULT 'PENDING',
    "integration_source" TEXT NOT NULL DEFAULT 'HIS_REST',
    "is_first_visit" BOOLEAN NOT NULL DEFAULT false,
    "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT false,
    "validation_errors" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_hospital_id_booking_id_key" ON "appointments"("hospital_id", "booking_id");
CREATE INDEX IF NOT EXISTS "appointments_hospital_id_status_idx" ON "appointments"("hospital_id", "status");
CREATE INDEX IF NOT EXISTS "appointments_hospital_id_appointment_date_idx" ON "appointments"("hospital_id", "appointment_date");
CREATE INDEX IF NOT EXISTS "appointments_mobile_number_idx" ON "appointments"("mobile_number");
CREATE INDEX IF NOT EXISTS "appointments_doctor_name_idx" ON "appointments"("doctor_name");

-- 9. appointment_events
CREATE TABLE IF NOT EXISTS "appointment_events" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "triggered_by" TEXT NOT NULL DEFAULT 'SYSTEM',
    "status" TEXT NOT NULL DEFAULT 'RECORDED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointment_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointment_events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointment_events_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "appointment_events_appointment_id_idx" ON "appointment_events"("appointment_id");
CREATE INDEX IF NOT EXISTS "appointment_events_hospital_id_created_at_idx" ON "appointment_events"("hospital_id", "created_at");

-- 10. message_templates
CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "meta_template_name" TEXT NOT NULL,
    "meta_category" TEXT NOT NULL DEFAULT 'UTILITY',
    "active_version" INTEGER NOT NULL DEFAULT 1,
    "approval_status" TEXT NOT NULL DEFAULT 'APPROVED_DEMO',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_templates_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "message_templates_hospital_id_code_language_key" ON "message_templates"("hospital_id", "code", "language");
CREATE INDEX IF NOT EXISTS "message_templates_hospital_id_category_language_idx" ON "message_templates"("hospital_id", "category", "language");

-- 11. template_versions
CREATE TABLE IF NOT EXISTS "template_versions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "header_text" TEXT,
    "body_text" TEXT NOT NULL,
    "footer_text" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interactive_buttons" JSONB NOT NULL DEFAULT '[]',
    "approval_status" TEXT NOT NULL DEFAULT 'APPROVED_DEMO',
    "meta_template_id" TEXT,
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "template_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "template_versions_template_id_version_number_key" ON "template_versions"("template_id", "version_number");

-- 12. scheduled_messages
CREATE TABLE IF NOT EXISTS "scheduled_messages" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "scheduled_for_utc" TIMESTAMP(3) NOT NULL,
    "original_target_utc" TIMESTAMP(3) NOT NULL,
    "was_quiet_hour_shifted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "suppression_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "executed_at" TIMESTAMP(3),
    "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "scheduled_messages_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "scheduled_messages_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "scheduled_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "scheduled_messages_idempotency_key_key" ON "scheduled_messages"("idempotency_key");
CREATE INDEX IF NOT EXISTS "scheduled_messages_hospital_id_status_scheduled_for_utc_idx" ON "scheduled_messages"("hospital_id", "status", "scheduled_for_utc");
CREATE INDEX IF NOT EXISTS "scheduled_messages_appointment_id_idx" ON "scheduled_messages"("appointment_id");

-- 13. message_logs
CREATE TABLE IF NOT EXISTS "message_logs" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "hospital_id" TEXT NOT NULL,
    "template_id" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "recipient_mobile" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "message_category" TEXT NOT NULL,
    "rendered_content" TEXT NOT NULL,
    "whatsapp_message_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider_mode" TEXT NOT NULL DEFAULT 'DEMO',
    "submitted_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "message_logs_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "message_logs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "message_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "message_logs_whatsapp_message_id_key" ON "message_logs"("whatsapp_message_id");
CREATE INDEX IF NOT EXISTS "message_logs_hospital_id_status_idx" ON "message_logs"("hospital_id", "status");
CREATE INDEX IF NOT EXISTS "message_logs_appointment_id_idx" ON "message_logs"("appointment_id");
CREATE INDEX IF NOT EXISTS "message_logs_whatsapp_message_id_idx" ON "message_logs"("whatsapp_message_id");

-- 14. whatsapp_webhooks
CREATE TABLE IF NOT EXISTS "whatsapp_webhooks" (
    "id" TEXT NOT NULL,
    "event_idempotency_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "whatsapp_message_id" TEXT,
    "sender_mobile" TEXT,
    "signature_valid" BOOLEAN NOT NULL DEFAULT false,
    "raw_payload" JSONB NOT NULL,
    "processing_status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_webhooks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_webhooks_event_idempotency_key_key" ON "whatsapp_webhooks"("event_idempotency_key");
CREATE INDEX IF NOT EXISTS "whatsapp_webhooks_whatsapp_message_id_idx" ON "whatsapp_webhooks"("whatsapp_message_id");
CREATE INDEX IF NOT EXISTS "whatsapp_webhooks_event_type_processing_status_idx" ON "whatsapp_webhooks"("event_type", "processing_status");

-- 15. patient_responses
CREATE TABLE IF NOT EXISTS "patient_responses" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "message_log_id" TEXT,
    "raw_response_text" TEXT NOT NULL,
    "button_payload" TEXT,
    "mapped_action" TEXT NOT NULL,
    "response_channel" TEXT NOT NULL DEFAULT 'WHATSAPP_INTERACTIVE',
    "acknowledgement_sent" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_triggered" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_responses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "patient_responses_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "patient_responses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "patient_responses_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "patient_responses_message_log_id_fkey" FOREIGN KEY ("message_log_id") REFERENCES "message_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "patient_responses_hospital_id_mapped_action_idx" ON "patient_responses"("hospital_id", "mapped_action");
CREATE INDEX IF NOT EXISTS "patient_responses_appointment_id_idx" ON "patient_responses"("appointment_id");

-- 16. agents
CREATE TABLE IF NOT EXISTS "agents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "agent_code" TEXT NOT NULL,
    "team_name" TEXT NOT NULL DEFAULT 'Altruist Call-Centre',
    "languages_spoken" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "active_queue_count" INTEGER NOT NULL DEFAULT 0,
    "resolved_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "agents_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "agents_user_id_key" ON "agents"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agents_agent_code_key" ON "agents"("agent_code");
CREATE INDEX IF NOT EXISTS "agents_hospital_id_status_idx" ON "agents"("hospital_id", "status");

-- 17. follow_up_tasks
CREATE TABLE IF NOT EXISTS "follow_up_tasks" (
    "id" TEXT NOT NULL,
    "task_code" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "assigned_agent_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "trigger_reason" TEXT NOT NULL,
    "internal_notes" JSONB NOT NULL DEFAULT '[]',
    "resolution_notes" TEXT,
    "altruist_sync_status" TEXT NOT NULL DEFAULT 'PENDING_EXPORT',
    "altruist_external_id" TEXT,
    "escalated_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "follow_up_tasks_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "follow_up_tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "follow_up_tasks_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "follow_up_tasks_assigned_agent_id_fkey" FOREIGN KEY ("assigned_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "follow_up_tasks_task_code_key" ON "follow_up_tasks"("task_code");
CREATE INDEX IF NOT EXISTS "follow_up_tasks_hospital_id_status_priority_idx" ON "follow_up_tasks"("hospital_id", "status", "priority");
CREATE INDEX IF NOT EXISTS "follow_up_tasks_assigned_agent_id_idx" ON "follow_up_tasks"("assigned_agent_id");
CREATE INDEX IF NOT EXISTS "follow_up_tasks_appointment_id_idx" ON "follow_up_tasks"("appointment_id");

-- 18. attendance_records
CREATE TABLE IF NOT EXISTS "attendance_records" (
    "id" TEXT NOT NULL,
    "external_visit_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "hospital_id" TEXT NOT NULL,
    "patient_identifier" TEXT,
    "outcome_status" TEXT NOT NULL,
    "match_status" TEXT NOT NULL DEFAULT 'MATCHED',
    "check_in_time" TIMESTAMP(3),
    "completed_time" TIMESTAMP(3),
    "rebooking_prompt_eligible" BOOLEAN NOT NULL DEFAULT false,
    "rebooking_prompt_sent" BOOLEAN NOT NULL DEFAULT false,
    "source_feed" TEXT NOT NULL DEFAULT 'HIS_OUTCOME_API',
    "status" TEXT NOT NULL DEFAULT 'RECONCILED',
    "reconciled_by" TEXT,
    "reconciled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attendance_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_external_visit_id_key" ON "attendance_records"("external_visit_id");
CREATE INDEX IF NOT EXISTS "attendance_records_hospital_id_outcome_status_idx" ON "attendance_records"("hospital_id", "outcome_status");
CREATE INDEX IF NOT EXISTS "attendance_records_booking_id_idx" ON "attendance_records"("booking_id");

-- 19. integration_configurations
CREATE TABLE IF NOT EXISTS "integration_configurations" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT,
    "integration_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'DEMO',
    "endpoint_url" TEXT,
    "auth_type" TEXT NOT NULL DEFAULT 'BEARER_TOKEN',
    "credentials_configured" BOOLEAN NOT NULL DEFAULT false,
    "field_mappings" JSONB NOT NULL DEFAULT '{}',
    "retry_policy" JSONB NOT NULL DEFAULT '{"maxRetries":3,"backoffSeconds":60}',
    "connection_status" TEXT NOT NULL DEFAULT 'AWAITING_CREDENTIALS',
    "last_connection_test_at" TIMESTAMP(3),
    "last_success_sync_at" TIMESTAMP(3),
    "missing_prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_configurations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_configurations_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "integration_configurations_integration_type_hospital_id_key" ON "integration_configurations"("integration_type", "hospital_id");

-- 20. integration_logs
CREATE TABLE IF NOT EXISTS "integration_logs" (
    "id" TEXT NOT NULL,
    "integration_config_id" TEXT,
    "hospital_id" TEXT,
    "integration_type" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "status" TEXT NOT NULL,
    "http_status_code" INTEGER,
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "sanitized_summary" TEXT NOT NULL,
    "error_details" TEXT,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "integration_logs_integration_config_id_fkey" FOREIGN KEY ("integration_config_id") REFERENCES "integration_configurations"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "integration_logs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "integration_logs_integration_type_status_created_at_idx" ON "integration_logs"("integration_type", "status", "created_at");

-- 21. sync_jobs
CREATE TABLE IF NOT EXISTS "sync_jobs" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT,
    "job_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "inserted_records" INTEGER NOT NULL DEFAULT 0,
    "updated_records" INTEGER NOT NULL DEFAULT 0,
    "duplicate_skipped" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "failed_details" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "triggered_by" TEXT NOT NULL DEFAULT 'SYSTEM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sync_jobs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "sync_jobs_hospital_id_job_type_created_at_idx" ON "sync_jobs"("hospital_id", "job_type", "created_at");

-- 22. holdout_assignments
CREATE TABLE IF NOT EXISTS "holdout_assignments" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "cohort_group" TEXT NOT NULL,
    "assignment_rule" TEXT NOT NULL DEFAULT 'DETERMINISTIC_HASH_80_20',
    "deterministic_hash" TEXT NOT NULL,
    "campaigns_suppressed" BOOLEAN NOT NULL DEFAULT false,
    "is_synthetic_demo" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "holdout_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "holdout_assignments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "holdout_assignments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "holdout_assignments_appointment_id_key" ON "holdout_assignments"("appointment_id");
CREATE INDEX IF NOT EXISTS "holdout_assignments_hospital_id_cohort_group_idx" ON "holdout_assignments"("hospital_id", "cohort_group");

-- 23. audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "hospital_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT NOT NULL,
    "ip_address" TEXT,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "audit_logs_hospital_id_action_created_at_idx" ON "audit_logs"("hospital_id", "action", "created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- 24. system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OPERATIONS',
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");

