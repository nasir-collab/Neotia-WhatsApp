import { Inject, Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { FollowupsService } from './followups.service';
import { enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Call-Centre Follow-Up & Altruist Handoff')
@ApiBearerAuth()
@Controller('followups')
export class FollowupsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FollowupsService) private readonly followupsService: FollowupsService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List call-centre / Altruist follow-up tasks with filters' })
  async listFollowUps(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('status') status?: string,
    @Query('taskType') taskType?: string,
    @Query('priority') priority?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (status && status !== 'ALL') where.status = status;
    if (taskType && taskType !== 'ALL') where.taskType = taskType;
    if (priority && priority !== 'ALL') where.priority = priority;

    const tasks = await this.prisma.followUpTask.findMany({
      where,
      include: {
        appointment: true,
        patient: {
          select: {
            id: true,
            externalPatientId: true,
            fullName: true,
            mobileNumber: true,
            preferredLanguage: true,
          },
        },
        hospital: { select: { id: true, code: true, name: true, city: true } },
        assignedAgent: {
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return { success: true, count: tasks.length, data: tasks };
  }

  @Post()
  @ApiOperation({ summary: 'Create a call-centre follow-up task manually or from workflow' })
  async createTask(@Body() body: any, @Req() req: any) {
    enforceHospitalScope(req.user, body.hospitalId);
    const created = await this.followupsService.createFollowUpTask({
      appointmentId: body.appointmentId,
      patientId: body.patientId,
      hospitalId: body.hospitalId,
      taskType: body.taskType || 'TALK_TO_US_ASSISTANCE',
      priority: body.priority || 'HIGH',
      triggerReason: body.triggerReason || `Created by ${req.user.fullName}`,
      isSyntheticDemo: body.isSyntheticDemo ?? true,
    });
    return { success: true, data: created };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task status (IN_PROGRESS, ESCALATED, RESOLVED, REOPENED), priority, or notes' })
  async updateTask(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updated = await this.followupsService.updateTask(id, body, req.user);
    return { success: true, data: updated };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign or reassign a follow-up task to a call-centre agent' })
  async assignTask(
    @Param('id') id: string,
    @Body() body: { assignedAgentId: string; note?: string },
    @Req() req: any
  ) {
    const updated = await this.followupsService.updateTask(
      id,
      {
        assignedAgentId: body.assignedAgentId,
        note: body.note || `Assigned to agent ${body.assignedAgentId}`,
      },
      req.user
    );
    return { success: true, data: updated };
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export Altruist call-centre worklist as CSV' })
  async exportCsv(
    @Req() req: any,
    @Res() res: any,
    @Query('hospitalId') hospitalId?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const csv = await this.followupsService.exportWorklistCsv(scopedHospitalId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="altruist-followup-worklist.csv"');
    res.status(200).send(csv);
  }
}
