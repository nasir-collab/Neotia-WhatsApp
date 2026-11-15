import { Inject, Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Hospitals & Multi-Hospital Configuration')
@ApiBearerAuth()
@Controller('hospitals')
export class HospitalsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List hospitals and their operational configurations (New Town Kolkata & Raipur)' })
  async listHospitals(@Req() req: any) {
    const scopedId = enforceHospitalScope(req.user);
    const where: any = {};
    if (scopedId) where.id = scopedId;

    const hospitals = await this.prisma.hospital.findMany({
      where,
      include: {
        configuration: true,
        _count: {
          select: {
            appointments: true,
            patients: true,
            templates: true,
            followUpTasks: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return { success: true, data: hospitals };
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new hospital unit and initial configuration' })
  async createHospital(@Body() body: any, @Req() req: any) {
    const hospital = await this.prisma.hospital.create({
      data: {
        code: body.code,
        name: body.name,
        city: body.city,
        state: body.state,
        timezone: body.timezone || 'Asia/Kolkata',
        isDemoData: body.isDemoData ?? true,
        createdBy: req.user.email,
        configuration: {
          create: {
            address: body.address || '[DEMO DATA — PENDING ANHVL VERIFICATION]',
            mapLocationUrl: body.mapLocationUrl || 'https://maps.google.com',
            helpline: body.helpline || '+91-000-0000000 (DEMO)',
            opdTimings: body.opdTimings || 'Mon–Sat: 08:00 AM – 08:00 PM',
            entranceGuidance: body.entranceGuidance || 'Main OPD Entrance',
            parkingGuidance: body.parkingGuidance || 'Visitor Parking Zone',
            opdFloorDesk: body.opdFloorDesk || 'Ground Floor Registration Desk',
            itemsToCarry: body.itemsToCarry || 'Photo ID and prior OPD card',
            firstVisitInstructions: body.firstVisitInstructions || 'Arrive 20 minutes early at Registration Counter.',
            supportedLanguages: body.supportedLanguages || ['en'],
            defaultLanguage: body.defaultLanguage || 'en',
            advanceReminderHours: Number(body.advanceReminderHours || 24),
            preVisitReminderHours: Number(body.preVisitReminderHours || 3),
            quietHoursStart: body.quietHoursStart || '21:00',
            quietHoursEnd: body.quietHoursEnd || '08:00',
            allowMorningException: body.allowMorningException ?? true,
            morningCutoffTime: body.morningCutoffTime || '10:30',
            pilotHoldoutEnabled: body.pilotHoldoutEnabled ?? false,
            pilotHoldoutPercentage: Number(body.pilotHoldoutPercentage || 20),
            departmentDoctorMappings: body.departmentDoctorMappings || [],
            communicationPreferences: body.communicationPreferences || {},
            updatedBy: req.user.email,
          },
        },
      },
      include: { configuration: true },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: hospital.id,
      action: 'HOSPITAL_CREATED',
      entityType: 'Hospital',
      entityId: hospital.id,
      summary: `Created hospital configuration for ${hospital.name} (${hospital.code}).`,
    });

    return { success: true, data: hospital };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER')
  @ApiOperation({ summary: 'Update hospital settings, OPD guidance, languages, quiet hours, and mappings' })
  async updateHospital(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any
  ) {
    enforceHospitalScope(req.user, id);

    const updatedHospital = await this.prisma.hospital.update({
      where: { id },
      data: {
        name: body.name,
        timezone: body.timezone,
        status: body.status,
        configuration: {
          update: {
            address: body.address,
            mapLocationUrl: body.mapLocationUrl,
            helpline: body.helpline,
            opdTimings: body.opdTimings,
            entranceGuidance: body.entranceGuidance,
            parkingGuidance: body.parkingGuidance,
            opdFloorDesk: body.opdFloorDesk,
            itemsToCarry: body.itemsToCarry,
            firstVisitInstructions: body.firstVisitInstructions,
            supportedLanguages: body.supportedLanguages,
            defaultLanguage: body.defaultLanguage,
            advanceReminderHours: body.advanceReminderHours !== undefined ? Number(body.advanceReminderHours) : undefined,
            preVisitReminderHours: body.preVisitReminderHours !== undefined ? Number(body.preVisitReminderHours) : undefined,
            quietHoursStart: body.quietHoursStart,
            quietHoursEnd: body.quietHoursEnd,
            allowMorningException: body.allowMorningException,
            morningCutoffTime: body.morningCutoffTime,
            pilotHoldoutEnabled: body.pilotHoldoutEnabled,
            pilotHoldoutPercentage: body.pilotHoldoutPercentage !== undefined ? Number(body.pilotHoldoutPercentage) : undefined,
            departmentDoctorMappings: body.departmentDoctorMappings,
            communicationPreferences: body.communicationPreferences,
            dataVerificationLabel: body.dataVerificationLabel,
            updatedBy: req.user.email,
          },
        },
      },
      include: { configuration: true },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: id,
      action: 'HOSPITAL_CONFIG_UPDATED',
      entityType: 'Hospital',
      entityId: id,
      summary: `Updated configuration for ${updatedHospital.name}.`,
    });

    return { success: true, data: updatedHospital };
  }
}
