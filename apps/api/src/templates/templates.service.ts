import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NonClinicalContentCheck } from '../../../../packages/validation/src';

@Injectable()
export class TemplatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async resolveHospitalLanguage(hospitalId: string, preferredLanguage?: string): Promise<string> {
    const config = await this.prisma.hospitalConfiguration.findUnique({
      where: { hospitalId },
    });
    if (!config) return preferredLanguage || 'en';
    const reqLang = (preferredLanguage || '').toLowerCase();
    if (config.supportedLanguages.includes(reqLang)) {
      return reqLang;
    }
    return config.defaultLanguage || 'en';
  }

  async resolveTemplateForAppointment(params: {
    hospitalId: string;
    category: string;
    preferredLanguage?: string;
    operatingMode: 'DEMO' | 'PRODUCTION';
  }) {
    const resolvedLanguage = await this.resolveHospitalLanguage(
      params.hospitalId,
      params.preferredLanguage
    );

    let template = await this.prisma.messageTemplate.findFirst({
      where: {
        hospitalId: params.hospitalId,
        category: params.category,
        language: resolvedLanguage,
        status: 'ACTIVE',
      },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    // Fallback to English if hospital default language template is missing
    if (!template && resolvedLanguage !== 'en') {
      template = await this.prisma.messageTemplate.findFirst({
        where: {
          hospitalId: params.hospitalId,
          category: params.category,
          language: 'en',
          status: 'ACTIVE',
        },
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });
    }

    if (!template) {
      throw new BadRequestException(
        `No active template found for category ${params.category} at hospital ${params.hospitalId}`
      );
    }

    if (params.operatingMode === 'PRODUCTION' && template.approvalStatus !== 'APPROVED') {
      throw new BadRequestException(
        `Template '${template.metaTemplateName}' has status '${template.approvalStatus}'. Production mode strictly requires Meta 'APPROVED' status.`
      );
    }

    if (
      params.operatingMode === 'DEMO' &&
      !['APPROVED', 'APPROVED_DEMO'].includes(template.approvalStatus)
    ) {
      throw new BadRequestException(
        `Template '${template.metaTemplateName}' is not approved (${template.approvalStatus}).`
      );
    }

    return { template, version: template.versions[0], resolvedLanguage };
  }

  renderTemplateBody(
    bodyText: string,
    variables: {
      patient_name: string;
      appointment_date: string;
      appointment_time: string;
      doctor_name: string;
      hospital_name: string;
      hospital_address: string;
      helpline: string;
    }
  ): string {
    let rendered = bodyText;
    for (const [key, val] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, val || '');
    }
    return rendered;
  }

  async createOrVersionTemplate(body: any, actor: any) {
    const check = NonClinicalContentCheck(body.bodyText || '');
    if (!check.valid) {
      throw new BadRequestException(check.reason);
    }

    const existing = await this.prisma.messageTemplate.findUnique({
      where: {
        hospitalId_code_language: {
          hospitalId: body.hospitalId,
          code: body.code,
          language: body.language,
        },
      },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (existing) {
      const nextVersion = (existing.versions[0]?.versionNumber || 1) + 1;
      const updated = await this.prisma.messageTemplate.update({
        where: { id: existing.id },
        data: {
          activeVersion: nextVersion,
          approvalStatus: body.approvalStatus || 'SUBMITTED',
          versions: {
            create: {
              versionNumber: nextVersion,
              headerText: body.headerText || 'ANHVL Patient Service Notification',
              bodyText: body.bodyText,
              footerText: body.footerText || 'Non-clinical appointment service message • Reply STOP to opt out',
              variables: [
                'patient_name',
                'appointment_date',
                'appointment_time',
                'doctor_name',
                'hospital_name',
                'hospital_address',
                'helpline',
              ],
              interactiveButtons: body.interactiveButtons || [],
              approvalStatus: body.approvalStatus || 'SUBMITTED',
              submittedAt: new Date(),
              createdBy: actor?.email,
            },
          },
        },
        include: { versions: { orderBy: { versionNumber: 'desc' } }, hospital: true },
      });

      await this.auditService.log({
        userId: actor?.id,
        actorEmail: actor?.email,
        actorRole: actor?.roleCode,
        hospitalId: body.hospitalId,
        action: 'TEMPLATE_VERSION_CREATED',
        entityType: 'MessageTemplate',
        entityId: updated.id,
        summary: `Created version v${nextVersion} for template ${updated.metaTemplateName} (${updated.language}).`,
      });

      return updated;
    }

    const created = await this.prisma.messageTemplate.create({
      data: {
        hospitalId: body.hospitalId,
        code: body.code,
        name: body.name,
        category: body.category,
        language: body.language,
        metaTemplateName: body.metaTemplateName || `anhvl_${body.code}_${body.language}_v1`,
        metaCategory: 'UTILITY',
        activeVersion: 1,
        approvalStatus: body.approvalStatus || 'SUBMITTED',
        createdBy: actor?.email,
        versions: {
          create: {
            versionNumber: 1,
            headerText: body.headerText || 'ANHVL Patient Service Notification',
            bodyText: body.bodyText,
            footerText: body.footerText || 'Non-clinical appointment service message • Reply STOP to opt out',
            variables: [
              'patient_name',
              'appointment_date',
              'appointment_time',
              'doctor_name',
              'hospital_name',
              'hospital_address',
              'helpline',
            ],
            interactiveButtons: body.interactiveButtons || [],
            approvalStatus: body.approvalStatus || 'SUBMITTED',
            submittedAt: new Date(),
            createdBy: actor?.email,
          },
        },
      },
      include: { versions: true, hospital: true },
    });

    await this.auditService.log({
      userId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.roleCode,
      hospitalId: body.hospitalId,
      action: 'TEMPLATE_CREATED',
      entityType: 'MessageTemplate',
      entityId: created.id,
      summary: `Created template ${created.metaTemplateName} (${created.category}, ${created.language}).`,
    });

    return created;
  }
}
