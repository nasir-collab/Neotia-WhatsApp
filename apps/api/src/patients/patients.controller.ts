import { Inject, Controller, Get, Param, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Patients (Restricted Non-Clinical Profile)')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

  @Get()
  @ApiOperation({ summary: 'List patient service profiles (restricted to non-clinical booking and consent fields)' })
  async listPatients(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('search') search?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { externalPatientId: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const patients = await this.prisma.patient.findMany({
      where,
      include: {
        hospital: { select: { id: true, code: true, name: true, city: true } },
        consents: true,
        _count: {
          select: { appointments: true, responses: true, followUpTasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Mask middle digits of mobile number for Call-Centre Viewer or Management Viewer if needed, while preserving operational visibility
    return {
      success: true,
      restrictedVisibilityNotice:
        'Phase 1 Safeguard: Only non-clinical appointment and communication consent fields are stored and displayed.',
      count: patients.length,
      data: patients,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single patient service profile, consent history, and appointment communication logs' })
  async getPatient(@Param('id') id: string, @Req() req: any) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        hospital: true,
        consents: true,
        appointments: {
          include: {
            messageLogs: true,
            patientResponses: true,
            followUpTasks: true,
          },
          orderBy: { appointmentDate: 'desc' },
        },
      },
    });
    if (!patient) throw new BadRequestException('Patient record not found.');
    enforceHospitalScope(req.user, patient.hospitalId);
    return { success: true, data: patient };
  }
}
