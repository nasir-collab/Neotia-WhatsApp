import { Inject, Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res,
  BadRequestException, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AppointmentsService } from './appointments.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Appointment Management')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AppointmentsService) private readonly appointmentsService: AppointmentsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List appointments with filtering by hospital, status, attendance, doctor, and search' })
  async listAppointments(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('status') status?: string,
    @Query('attendanceStatus') attendanceStatus?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (status && status !== 'ALL') where.status = status;
    if (attendanceStatus && attendanceStatus !== 'ALL') where.attendanceStatus = attendanceStatus;
    if (search) {
      where.OR = [
        { bookingId: { contains: search, mode: 'insensitive' } },
        { patientName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
        { doctorName: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = Math.max(1, Number(page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(limit || 50)));

    const [total, appointments] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.findMany({
        where,
        include: {
          hospital: { select: { id: true, code: true, name: true, city: true } },
          patient: { select: { id: true, externalPatientId: true, preferredLanguage: true } },
          holdoutAssignment: true,
          scheduledMessages: { select: { id: true, jobType: true, status: true, scheduledForUtc: true, wasQuietHourShifted: true } },
          messageLogs: { select: { id: true, status: true, messageCategory: true, createdAt: true } },
          followUpTasks: { select: { id: true, taskCode: true, taskType: true, status: true, priority: true } },
        },
        orderBy: [{ appointmentDate: 'desc' }, { createdAt: 'desc' }],
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      total,
      page: pageNum,
      limit: pageSize,
      data: appointments,
    };
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export appointments as CSV' })
  async exportCsv(
    @Req() req: any,
    @Res() res: any,
    @Query('hospitalId') hospitalId?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;

    const appointments = await this.prisma.appointment.findMany({
      where,
      include: { hospital: true, holdoutAssignment: true },
      orderBy: { appointmentDate: 'desc' },
    });

    const headers = [
      'BookingID',
      'Hospital',
      'PatientName',
      'MobileNumber',
      'Language',
      'Department',
      'Doctor',
      'AppointmentDate',
      'AppointmentTime',
      'BookingSource',
      'ConsentStatus',
      'AppointmentStatus',
      'AttendanceStatus',
      'PilotCohort',
    ];

    const rows = appointments.map((a) => [
      a.bookingId,
      a.hospital?.name || '',
      a.patientName,
      a.mobileNumber,
      a.preferredLanguage,
      a.department,
      a.doctorName,
      a.appointmentDate.toISOString().split('T')[0],
      a.appointmentTime,
      a.bookingSource,
      a.consentStatus,
      a.status,
      a.attendanceStatus,
      a.holdoutAssignment?.cohortGroup || 'N/A',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="anhvl-appointments.csv"');
    res.status(200).send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full appointment details, event history, messages, responses, and follow-up tasks' })
  async getAppointment(@Param('id') id: string, @Req() req: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        hospital: { include: { configuration: true } },
        patient: { include: { consents: true } },
        events: { orderBy: { createdAt: 'desc' } },
        scheduledMessages: { include: { template: true }, orderBy: { scheduledForUtc: 'asc' } },
        messageLogs: { orderBy: { createdAt: 'desc' } },
        patientResponses: { orderBy: { receivedAt: 'desc' } },
        followUpTasks: {
          include: { assignedAgent: { include: { user: true } } },
          orderBy: { createdAt: 'desc' },
        },
        attendanceRecords: true,
        holdoutAssignment: true,
      },
    });
    if (!appointment) {
      throw new BadRequestException('Appointment record not found.');
    }
    enforceHospitalScope(req.user, appointment.hospitalId);
    return { success: true, data: appointment };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Create / ingest a new appointment and schedule WhatsApp confirmation & reminders' })
  async createAppointment(@Body() body: any, @Req() req: any) {
    enforceHospitalScope(req.user, body.hospitalId);
    const result = await this.appointmentsService.ingestAppointment(body, req.user.email);
    return { success: true, data: result };
  }

  @Post('bulk-import')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Bulk import appointments from HIS JSON or CSV feed with deduplication' })
  async bulkImport(
    @Body() body: { hospitalId: string; records: any[]; source?: string },
    @Req() req: any
  ) {
    enforceHospitalScope(req.user, body.hospitalId);
    const job = await this.appointmentsService.bulkImport(
      body.records || [],
      body.hospitalId,
      body.source || 'CSV_UPLOAD',
      req.user.email
    );
    return { success: true, data: job };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Update appointment details or reschedule time (automatically re-times reminders)' })
  async updateAppointment(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Appointment not found.');
    enforceHospitalScope(req.user, existing.hospitalId);

    const res = await this.appointmentsService.ingestAppointment(
      {
        ...existing,
        ...body,
        bookingId: existing.bookingId,
        hospitalId: existing.hospitalId,
      },
      req.user.email
    );
    return { success: true, data: res };
  }

  @Post(':id/cancel')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Confirm official hospital/HIS cancellation and suppress pending reminders' })
  async cancelAppointment(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: any
  ) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Appointment not found.');
    enforceHospitalScope(req.user, existing.hospitalId);

    const updated = await this.appointmentsService.confirmOfficialCancellation(
      id,
      body?.reason || 'Confirmed cancellation by hospital operations / HIS feed',
      req.user.email
    );
    return { success: true, data: updated };
  }
}
