import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaService } from './common/prisma.service';
import { JwtRbacGuard } from './common/auth.guard';
import { GlobalHttpExceptionFilter } from './common/http-exception.filter';
import { AuditService } from './audit/audit.service';
import { AuditController } from './audit/audit.controller';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { HospitalsController } from './hospitals/hospitals.controller';
import { ConsentService } from './consent/consent.service';
import { ConsentController } from './consent/consent.controller';
import { TemplatesService } from './templates/templates.service';
import { TemplatesController } from './templates/templates.controller';
import { FollowupsService } from './followups/followups.service';
import { FollowupsController } from './followups/followups.controller';
import { WhatsappService } from './whatsapp/whatsapp.service';
import { WhatsappController } from './whatsapp/whatsapp.controller';
import { WhatsappWebhooksController } from './whatsapp/webhooks.controller';
import { ResponsesService } from './responses/responses.service';
import { ResponsesController } from './responses/responses.controller';
import { SchedulerService } from './scheduler/scheduler.service';
import { SchedulerController } from './scheduler/scheduler.controller';
import { PilotService } from './pilot/pilot.service';
import { PilotController } from './pilot/pilot.controller';
import { AppointmentsService } from './appointments/appointments.service';
import { AppointmentsController } from './appointments/appointments.controller';
import { PatientsController } from './patients/patients.controller';
import { AttendanceService } from './attendance/attendance.service';
import { AttendanceController } from './attendance/attendance.controller';
import { IntegrationsService } from './integrations/integrations.service';
import { IntegrationsController } from './integrations/integrations.controller';
import { ReportsService } from './reports/reports.service';
import { ReportsController } from './reports/reports.controller';
import { SimulatorService } from './simulator/simulator.service';
import { SimulatorController } from './simulator/simulator.controller';
import { SettingsController } from './settings/settings.controller';
import { CampaignsService } from './campaigns/campaigns.service';
import { CampaignsController } from './campaigns/campaigns.controller';

@Module({
  controllers: [
    AuthController,
    UsersController,
    HospitalsController,
    AppointmentsController,
    PatientsController,
    ConsentController,
    TemplatesController,
    WhatsappController,
    WhatsappWebhooksController,
    SchedulerController,
    ResponsesController,
    FollowupsController,
    AttendanceController,
    IntegrationsController,
    PilotController,
    ReportsController,
    AuditController,
    SimulatorController,
    SettingsController,
    CampaignsController,
  ],
  providers: [
    PrismaService,
    AuditService,
    AuthService,
    ConsentService,
    TemplatesService,
    FollowupsService,
    WhatsappService,
    ResponsesService,
    SchedulerService,
    PilotService,
    AppointmentsService,
    AttendanceService,
    IntegrationsService,
    ReportsService,
    SimulatorService,
    CampaignsService,
    {
      provide: APP_GUARD,
      useClass: JwtRbacGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
  ],
  exports: [
    PrismaService,
    AuditService,
    AuthService,
    ConsentService,
    TemplatesService,
    FollowupsService,
    WhatsappService,
    ResponsesService,
    SchedulerService,
    PilotService,
    AppointmentsService,
    AttendanceService,
    IntegrationsService,
    ReportsService,
    SimulatorService,
  ],
})
export class AppModule {}

