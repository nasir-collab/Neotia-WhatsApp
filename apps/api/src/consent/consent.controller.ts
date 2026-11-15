import { Inject, Controller, Get, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { ConsentService } from './consent.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Consent & Data Protection')
@ApiBearerAuth()
@Controller('consent')
export class ConsentController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConsentService) private readonly consentService: ConsentService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List patient consent & opt-out status records' })
  async listConsents(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('status') status?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (status && status !== 'ALL') {
      if (status === 'OPTED_OUT') where.optOutStatus = true;
      else if (status === 'ELIGIBLE') where.communicationEligible = true;
      else where.consentStatus = status;
    }

    const consents = await this.prisma.patientConsent.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            externalPatientId: true,
            fullName: true,
            mobileNumber: true,
            preferredLanguage: true,
            isSyntheticDemo: true,
          },
        },
        hospital: { select: { id: true, code: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { success: true, data: consents };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Update patient consent or process opt-out/opt-in' })
  async updateConsent(
    @Param('id') id: string,
    @Body()
    body: {
      consentStatus: 'GRANTED' | 'REVOKED';
      consentSource?: string;
      reason?: string;
    },
    @Req() req: any
  ) {
    const updated = await this.consentService.updateConsentStatus({
      id,
      consentStatus: body.consentStatus,
      consentSource: body.consentSource || 'ADMIN_OVERRIDE',
      reason: body.reason,
      actor: req.user,
    });
    return { success: true, data: updated };
  }
}
