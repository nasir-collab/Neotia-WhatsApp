import { Inject, Controller, Get, Post, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { SchedulerService } from './scheduler.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Automated Reminder Scheduler & Queue Jobs')
@ApiBearerAuth()
@Controller('scheduler')
export class SchedulerController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SchedulerService) private readonly schedulerService: SchedulerService
  ) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List scheduled reminder jobs, quiet-hour shifts, and suppression status' })
  async listJobs(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('status') status?: string,
    @Query('jobType') jobType?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (status && status !== 'ALL') where.status = status;
    if (jobType && jobType !== 'ALL') where.jobType = jobType;

    const jobs = await this.prisma.scheduledMessage.findMany({
      where,
      include: {
        appointment: {
          select: {
            id: true,
            bookingId: true,
            patientName: true,
            mobileNumber: true,
            doctorName: true,
            appointmentDate: true,
            appointmentTime: true,
            status: true,
          },
        },
        hospital: { select: { id: true, code: true, name: true } },
        template: { select: { id: true, code: true, name: true, language: true } },
      },
      orderBy: { scheduledForUtc: 'asc' },
      take: 150,
    });

    return {
      success: true,
      queueBackendMode: this.schedulerService.queueBackendMode,
      count: jobs.length,
      data: jobs,
    };
  }

  @Post('jobs/:id/execute')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Manually trigger or retry a scheduled reminder job' })
  async executeJob(@Param('id') id: string) {
    const res = await this.schedulerService.executeScheduledJobById(id);
    return { success: true, data: res };
  }
}
