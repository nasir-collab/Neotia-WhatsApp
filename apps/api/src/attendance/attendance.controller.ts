import { Inject, Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { AttendanceService } from './attendance.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('HIS Attendance Reconciliation & No-Show Engine')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AttendanceService) private readonly attendanceService: AttendanceService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List HIS attendance reconciliation records and unmatched records' })
  async listAttendance(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('outcomeStatus') outcomeStatus?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (outcomeStatus && outcomeStatus !== 'ALL') where.outcomeStatus = outcomeStatus;

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        appointment: true,
        hospital: { select: { id: true, code: true, name: true, city: true } },
      },
      orderBy: { reconciledAt: 'desc' },
    });

    return { success: true, count: records.length, data: records };
  }

  @Post('reconcile')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Reconcile an HIS registration/attendance outcome and trigger No-Show workflow if applicable' })
  async reconcileOutcome(@Body() body: any, @Req() req: any) {
    enforceHospitalScope(req.user, body.hospitalId);
    const res = await this.attendanceService.reconcileAttendanceOutcome({
      ...body,
      actorEmail: req.user.email,
    });
    return { success: true, data: res };
  }
}
