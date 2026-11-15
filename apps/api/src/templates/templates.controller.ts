import { Inject, Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { TemplatesService } from './templates.service';
import { AuditService } from '../audit/audit.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('WhatsApp Template Management')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TemplatesService) private readonly templatesService: TemplatesService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List WhatsApp utility templates across hospitals, categories, and languages' })
  async listTemplates(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('category') category?: string,
    @Query('language') language?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (category && category !== 'ALL') where.category = category;
    if (language && language !== 'ALL') where.language = language;

    const templates = await this.prisma.messageTemplate.findMany({
      where,
      include: {
        hospital: { select: { id: true, code: true, name: true, city: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
      orderBy: [{ hospitalId: 'asc' }, { category: 'asc' }, { language: 'asc' }],
    });

    return { success: true, count: templates.length, data: templates };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER')
  @ApiOperation({ summary: 'Create a new WhatsApp template or publish a new template version' })
  async createTemplate(@Body() body: any, @Req() req: any) {
    enforceHospitalScope(req.user, body.hospitalId);
    const created = await this.templatesService.createOrVersionTemplate(body, req.user);
    return { success: true, data: created };
  }

  @Patch(':id/approval')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: 'Update Meta template approval status (DRAFT, SUBMITTED, APPROVED, APPROVED_DEMO, REJECTED)' })
  async updateApprovalStatus(
    @Param('id') id: string,
    @Body() body: { approvalStatus: string; rejectionReason?: string },
    @Req() req: any
  ) {
    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: {
        approvalStatus: body.approvalStatus,
      },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (updated.versions[0]) {
      await this.prisma.templateVersion.update({
        where: { id: updated.versions[0].id },
        data: {
          approvalStatus: body.approvalStatus,
          rejectionReason: body.rejectionReason || null,
          approvedAt: ['APPROVED', 'APPROVED_DEMO'].includes(body.approvalStatus) ? new Date() : null,
        },
      });
    }

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: updated.hospitalId,
      action: 'TEMPLATE_APPROVAL_UPDATED',
      entityType: 'MessageTemplate',
      entityId: updated.id,
      summary: `Template ${updated.metaTemplateName} approval status updated to ${body.approvalStatus}.`,
    });

    return { success: true, data: updated };
  }
}
