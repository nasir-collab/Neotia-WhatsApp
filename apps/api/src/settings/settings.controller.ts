import { Inject, Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  BadRequestException, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { AuditService } from '../audit/audit.service';
import { Public, Roles } from '../common/auth.guard';

@ApiTags('System Settings & Health Monitoring')
@Controller('settings')
export class SettingsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService,
    @Inject(SchedulerService) private readonly schedulerService: SchedulerService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Platform health check endpoint (Database, Scheduler, Operating Mode, Integration Readiness)' })
  async healthCheck() {
    const mode = await this.whatsappService.getOperatingMode();
    const metaCreds = this.whatsappService.hasProductionCredentials();
    const hospitalsCount = await this.prisma.hospital.count();
    const appointmentsCount = await this.prisma.appointment.count();

    return {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      platform: 'ANHVL WhatsApp Patient Engagement Platform',
      developer: 'Plan D Media',
      operatingMode: mode,
      database: {
        status: 'CONNECTED',
        engine: this.prisma.engineMode,
        hospitalsCount,
        appointmentsCount,
      },
      scheduler: {
        status: 'ACTIVE',
        backend: this.schedulerService.queueBackendMode,
      },
      productionReadiness: {
        metaWhatsAppReady: metaCreds.ready,
        missingMetaCredentials: metaCreds.missing,
        hisApiReady: Boolean(process.env.HIS_API_BASE_URL && process.env.HIS_API_AUTH),
        altruistApiReady: Boolean(process.env.ALTRUIST_API_BASE_URL && process.env.ALTRUIST_API_AUTH),
      },
    };
  }

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Retrieve system settings, operating mode, and data retention policies' })
  async listSettings() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    const mode = await this.whatsappService.getOperatingMode();
    const metaCreds = this.whatsappService.hasProductionCredentials();

    return {
      success: true,
      operatingMode: mode,
      productionCredentialsReady: metaCreds.ready,
      missingProductionPrerequisites: [
        ...metaCreds.missing,
        ...(!process.env.HIS_API_BASE_URL ? ['HIS_API_BASE_URL', 'HIS_API_AUTH'] : []),
      ],
      data: settings,
    };
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @Post('mode')
  @ApiOperation({ summary: 'Switch platform operating mode between DEMO and PRODUCTION (with strict prerequisite enforcement)' })
  async switchOperatingMode(
    @Body() body: { mode: 'DEMO' | 'PRODUCTION'; allowUnconfiguredProductionForTesting?: boolean },
    @Req() req: any
  ) {
    const metaCreds = this.whatsappService.hasProductionCredentials();
    if (
      body.mode === 'PRODUCTION' &&
      !metaCreds.ready &&
      !body.allowUnconfiguredProductionForTesting
    ) {
      throw new BadRequestException(
        `Cannot activate live PRODUCTION mode: Missing verified ANHVL credentials (${metaCreds.missing.join(', ')}). Production mode never silently falls back to simulated messaging.`
      );
    }

    const updated = await this.prisma.systemSetting.upsert({
      where: { key: 'OPERATING_MODE' },
      update: {
        value: {
          mode: body.mode,
          allowProductionSwitchOnlyWhenVerified: true,
          switchedAt: new Date().toISOString(),
          switchedBy: req.user.email,
        },
        updatedBy: req.user.email,
      },
      create: {
        key: 'OPERATING_MODE',
        value: { mode: body.mode, allowProductionSwitchOnlyWhenVerified: true },
        category: 'OPERATIONS',
        description: 'Controls whether the platform operates in isolated Synthetic Demo Mode or Live Production Mode.',
        updatedBy: req.user.email,
      },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      action: 'MODE_CHANGED',
      entityType: 'SystemSetting',
      entityId: updated.id,
      summary: `Switched platform operating mode to ${body.mode}.`,
    });

    return { success: true, operatingMode: body.mode, data: updated };
  }

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @Patch(':key')
  @ApiOperation({ summary: 'Update a system setting (quiet hours, retention policy, alert thresholds)' })
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: any; description?: string },
    @Req() req: any
  ) {
    const updated = await this.prisma.systemSetting.update({
      where: { key },
      data: {
        value: body.value,
        description: body.description || undefined,
        updatedBy: req.user.email,
      },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      action: 'SYSTEM_SETTING_UPDATED',
      entityType: 'SystemSetting',
      entityId: updated.id,
      summary: `Updated system setting ${key}.`,
    });

    return { success: true, data: updated };
  }
}
