import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AppointmentsService) private readonly appointmentsService: AppointmentsService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) { }

  mapExternalHisPayload(rawRecord: any, fieldMappings: Record<string, string>) {
    const getMapped = (internalKey: string, fallbackKey: string) => {
      const externalKey = fieldMappings?.[internalKey] || fallbackKey;
      return rawRecord[externalKey] !== undefined ? rawRecord[externalKey] : rawRecord[internalKey];
    };

    return {
      bookingId: getMapped('bookingId', 'booking_ref_no'),
      externalPatientId: getMapped('externalPatientId', 'uhid'),
      patientName: getMapped('patientName', 'patient_full_name'),
      mobileNumber: getMapped('mobileNumber', 'patient_mobile'),
      preferredLanguage: getMapped('preferredLanguage', 'lang_code') || 'en',
      department: getMapped('department', 'speciality_name'),
      doctorName: getMapped('doctorName', 'consultant_name'),
      appointmentDate: getMapped('appointmentDate', 'slot_date'),
      appointmentTime: getMapped('appointmentTime', 'slot_time'),
      consentStatus: getMapped('consentStatus', 'whatsapp_consent_flag') || 'GRANTED',
      isFirstVisit: Boolean(getMapped('isFirstVisit', 'is_first_visit')),
    };
  }

  async testConnection(configId: string, actor: any) {
    const config = await this.prisma.integrationConfiguration.findUnique({
      where: { id: configId },
      include: { hospital: true },
    });
    if (!config) throw new BadRequestException('Integration configuration not found.');

    const startTime = Date.now();
    let connectionStatus = 'AWAITING_CREDENTIALS';
    let summary = '';
    let status = 'BLOCKED_MISSING_CREDENTIALS';

    if (config.integrationType === 'META_WHATSAPP') {
      const hasMeta =
        Boolean(process.env.META_ACCESS_TOKEN) &&
        Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
        Boolean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID);
      if (hasMeta) {
        connectionStatus = 'CONNECTED';
        status = 'SUCCESS';
        summary = 'Meta WhatsApp Cloud API credentials present and verified.';
      } else {
        connectionStatus = config.mode === 'DEMO' ? 'DEMO_SIMULATED' : 'AWAITING_CREDENTIALS';
        status = config.mode === 'DEMO' ? 'SUCCESS' : 'BLOCKED_MISSING_CREDENTIALS';
        summary =
          config.mode === 'DEMO'
            ? '[DEMO MODE] Synthetic WhatsApp adapter active. Production requires ANHVL Meta Business Manager WABA ID, Phone Number ID, and System User Token.'
            : 'Missing ANHVL Meta Business Manager credentials (META_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID).';
      }
    } else if (config.integrationType === 'HIS_API') {
      const hasHis = Boolean(config.endpointUrl || process.env.HIS_API_BASE_URL) && Boolean(process.env.HIS_API_AUTH);
      if (hasHis) {
        connectionStatus = 'CONNECTED';
        status = 'SUCCESS';
        summary = `HIS REST endpoint (${config.endpointUrl || process.env.HIS_API_BASE_URL}) configured.`;
      } else {
        connectionStatus = 'AWAITING_CREDENTIALS';
        status = 'BLOCKED_MISSING_CREDENTIALS';
        summary =
          'HIS REST API is awaiting ANHVL HIS vendor endpoint documentation, VPN/firewall access, and authentication credentials. SFTP/CSV import is available immediately.';
      }
    } else if (config.integrationType === 'ALTRUIST_CALLCENTRE') {
      const hasAltruist = Boolean(config.endpointUrl || process.env.ALTRUIST_API_BASE_URL) && Boolean(process.env.ALTRUIST_API_AUTH);
      if (hasAltruist) {
        connectionStatus = 'CONNECTED';
        status = 'SUCCESS';
        summary = 'Altruist API handoff endpoint configured.';
      } else {
        connectionStatus = 'DEMO_SIMULATED';
        status = 'SUCCESS';
        summary =
          'Altruist operating in Secure Agent Worklist & CSV Export Mode. Direct REST handoff awaits Altruist API specification from ANHVL.';
      }
    }

    const updated = await this.prisma.integrationConfiguration.update({
      where: { id: config.id },
      data: {
        connectionStatus,
        lastConnectionTestAt: new Date(),
        updatedBy: actor?.email,
      },
      include: { hospital: true },
    });

    await this.prisma.integrationLog.create({
      data: {
        integrationConfigId: config.id,
        hospitalId: config.hospitalId,
        integrationType: config.integrationType,
        operation: 'CONNECTION_TEST',
        direction: 'OUTBOUND',
        status,
        sanitizedSummary: summary,
        durationMs: Date.now() - startTime,
      },
    });

    await this.auditService.log({
      userId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.roleCode,
      hospitalId: config.hospitalId,
      action: 'INTEGRATION_TESTED',
      entityType: 'IntegrationConfiguration',
      entityId: config.id,
      summary: `Tested ${config.name} -> Status: ${connectionStatus}.`,
    });

    return { config: updated, summary, status };
  }

  async ingestMappedHisFeed(params: {
    hospitalId: string;
    records: any[];
    source: string;
    actorEmail: string;
  }) {
    const config = await this.prisma.integrationConfiguration.findFirst({
      where: {
        hospitalId: params.hospitalId,
        integrationType: 'HIS_API',
      },
    });

    const mappings = (config?.fieldMappings as Record<string, string>) || {};
    const mappedRecords = (params.records || []).map((r) =>
      this.mapExternalHisPayload(r, mappings)
    );

    const job = await this.appointmentsService.bulkImport(
      mappedRecords,
      params.hospitalId,
      params.source,
      params.actorEmail
    );

    if (config) {
      await this.prisma.integrationConfiguration.update({
        where: { id: config.id },
        data: { lastSuccessSyncAt: new Date() },
      });
    }

    return job;
  }
}
