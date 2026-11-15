import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class FollowupsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  async createFollowUpTask(params: {
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    taskType: string;
    priority?: string;
    triggerReason: string;
    isSyntheticDemo?: boolean;
  }) {
    // Check if an open/in-progress task of the same type already exists for this appointment
    const existing = await this.prisma.followUpTask.findFirst({
      where: {
        appointmentId: params.appointmentId,
        taskType: params.taskType,
        status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] },
      },
    });
    if (existing) return existing;

    // Auto-assign to available hospital call-centre agent with lowest active queue
    const agent = await this.prisma.agent.findFirst({
      where: {
        hospitalId: params.hospitalId,
        status: 'AVAILABLE',
      },
      orderBy: { activeQueueCount: 'asc' },
    });

    const taskCode = `TSK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 90 + 10)}`;

    const created = await this.prisma.followUpTask.create({
      data: {
        taskCode,
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        hospitalId: params.hospitalId,
        taskType: params.taskType,
        priority: params.priority || 'HIGH',
        assignedAgentId: agent?.id || null,
        status: 'OPEN',
        triggerReason: params.triggerReason,
        internalNotes: [
          {
            author: 'Workflow Engine',
            timestamp: new Date().toISOString(),
            note: params.triggerReason,
          },
        ],
        altruistSyncStatus:
          process.env.ALTRUIST_API_BASE_URL && process.env.ALTRUIST_API_AUTH
            ? 'SYNCED_API'
            : 'PENDING_EXPORT',
        isSyntheticDemo: Boolean(params.isSyntheticDemo),
      },
      include: {
        appointment: true,
        patient: true,
        hospital: true,
        assignedAgent: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });

    if (agent) {
      await this.prisma.agent.update({
        where: { id: agent.id },
        data: { activeQueueCount: { increment: 1 } },
      });
    }

    return created;
  }

  async updateTask(
    id: string,
    body: {
      status?: string;
      priority?: string;
      assignedAgentId?: string;
      note?: string;
      resolutionNotes?: string;
    },
    actor: any
  ) {
    const task = await this.prisma.followUpTask.findUnique({ where: { id } });
    if (!task) throw new BadRequestException('Follow-up task not found.');

    const notes = Array.isArray(task.internalNotes) ? [...(task.internalNotes as any[])] : [];
    if (body.note) {
      notes.push({
        author: actor?.fullName || actor?.email || 'Agent',
        timestamp: new Date().toISOString(),
        note: body.note,
      });
    }

    const nextStatus = body.status || task.status;
    const isResolving = nextStatus === 'RESOLVED' && task.status !== 'RESOLVED';
    const isReopening = nextStatus === 'REOPENED' && task.status === 'RESOLVED';

    const updated = await this.prisma.followUpTask.update({
      where: { id },
      data: {
        status: nextStatus,
        priority: body.priority || task.priority,
        assignedAgentId: body.assignedAgentId !== undefined ? body.assignedAgentId : task.assignedAgentId,
        internalNotes: notes,
        resolutionNotes: body.resolutionNotes !== undefined ? body.resolutionNotes : task.resolutionNotes,
        escalatedAt: nextStatus === 'ESCALATED' ? new Date() : task.escalatedAt,
        resolvedAt: isResolving ? new Date() : isReopening ? null : task.resolvedAt,
        resolvedBy: isResolving ? actor?.email : task.resolvedBy,
      },
      include: {
        appointment: true,
        patient: true,
        hospital: true,
        assignedAgent: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });

    if (isResolving && task.assignedAgentId) {
      await this.prisma.agent.update({
        where: { id: task.assignedAgentId },
        data: {
          activeQueueCount: { decrement: 1 },
          resolvedCount: { increment: 1 },
        },
      });
    }

    await this.auditService.log({
      userId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.roleCode,
      hospitalId: task.hospitalId,
      action: `TASK_${nextStatus}`,
      entityType: 'FollowUpTask',
      entityId: task.id,
      summary: `Follow-up task ${task.taskCode} (${task.taskType}) updated to ${nextStatus}.`,
    });

    return updated;
  }

  async exportWorklistCsv(hospitalId?: string): Promise<string> {
    const where: any = {};
    if (hospitalId) where.hospitalId = hospitalId;

    const tasks = await this.prisma.followUpTask.findMany({
      where,
      include: {
        appointment: true,
        patient: true,
        hospital: true,
        assignedAgent: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'TaskCode',
      'Hospital',
      'BookingID',
      'PatientName',
      'MobileNumber',
      'Language',
      'Doctor',
      'AppointmentDate',
      'AppointmentTime',
      'TaskType',
      'Priority',
      'Status',
      'AssignedAgent',
      'TriggerReason',
      'ResolutionNotes',
      'CreatedAtUTC',
    ];

    const rows = tasks.map((t) => [
      t.taskCode,
      t.hospital?.name || '',
      t.appointment?.bookingId || '',
      t.patient?.fullName || '',
      t.patient?.mobileNumber || '',
      t.appointment?.preferredLanguage || 'en',
      t.appointment?.doctorName || '',
      t.appointment?.appointmentDate ? t.appointment.appointmentDate.toISOString().split('T')[0] : '',
      t.appointment?.appointmentTime || '',
      t.taskType,
      t.priority,
      t.status,
      t.assignedAgent?.user?.fullName || 'Unassigned',
      (t.triggerReason || '').replace(/,/g, ';'),
      (t.resolutionNotes || '').replace(/,/g, ';'),
      t.createdAt.toISOString(),
    ]);

    // Mark exported tasks
    const ids = tasks.map((t) => t.id);
    if (ids.length > 0) {
      await this.prisma.followUpTask.updateMany({
        where: { id: { in: ids }, altruistSyncStatus: 'PENDING_EXPORT' },
        data: { altruistSyncStatus: 'EXPORTED_CSV' },
      });
    }

    return [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
  }
}
