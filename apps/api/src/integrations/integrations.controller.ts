import { Inject, Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { IntegrationsService } from './integrations.service';
import { AuditService } from '../audit/audit.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('HIS, Meta WhatsApp & Altruist Integrations')
@ApiBearerAuth()
@Controller('integrations')
export class IntegrationsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IntegrationsService) private readonly integrationsService: IntegrationsService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List integration configurations, missing ANHVL prerequisites, sync jobs, and logs' })
  async listIntegrations(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('integrationType') integrationType?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (integrationType && integrationType !== 'ALL') where.integrationType = integrationType;

    const [configs, logs, syncJobs] = await Promise.all([
      this.prisma.integrationConfiguration.findMany({
        where,
        include: { hospital: { select: { id: true, code: true, name: true, city: true } } },
        orderBy: { integrationType: 'asc' },
      }),
      this.prisma.integrationLog.findMany({
        where: scopedHospitalId ? { hospitalId: scopedHospitalId } : {},
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),
      this.prisma.syncJob.findMany({
        where: scopedHospitalId ? { hospitalId: scopedHospitalId } : {},
        include: { hospital: { select: { id: true, code: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ]);

    return {
      success: true,
      data: {
        configurations: configs,
        logs,
        syncJobs,
      },
    };
  }

  @Post('test')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER')
  @ApiOperation({ summary: 'Run live connection & prerequisite verification check for an integration adapter' })
  async testIntegration(@Body() body: { configId: string }, @Req() req: any) {
    const result = await this.integrationsService.testConnection(body.configId, req.user);
    return { success: true, data: result };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: 'Update integration endpoint URL, field mappings, retry policy, or mode' })
  async updateIntegration(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any
  ) {
    const updated = await this.prisma.integrationConfiguration.update({
      where: { id },
      data: {
        endpointUrl: body.endpointUrl,
        authType: body.authType,
        fieldMappings: body.fieldMappings,
        retryPolicy: body.retryPolicy,
        mode: body.mode,
        updatedBy: req.user.email,
      },
      include: { hospital: true },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: updated.hospitalId,
      action: 'INTEGRATION_CONFIG_UPDATED',
      entityType: 'IntegrationConfiguration',
      entityId: updated.id,
      summary: `Updated adapter configuration for ${updated.name}.`,
    });

    return { success: true, data: updated };
  }

  @Post('his/sync')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Ingest HIS appointment feed using configured field mappings' })
  async syncHisFeed(
    @Body() body: { hospitalId: string; records: any[]; source?: string },
    @Req() req: any
  ) {
    enforceHospitalScope(req.user, body.hospitalId);
    const job = await this.integrationsService.ingestMappedHisFeed({
      hospitalId: body.hospitalId,
      records: body.records || [],
      source: body.source || 'HIS_REST_FEED',
      actorEmail: req.user.email,
    });
    return { success: true, data: job };
  }
}
