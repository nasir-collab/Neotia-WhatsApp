import { Inject, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PilotService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) { }

  computeDeterministicCohort(bookingId: string, holdoutPercentage = 20): {
    cohortGroup: 'TREATMENT' | 'CONTROL';
    deterministicHash: string;
    bucket: number;
  } {
    const hash = crypto.createHash('sha256').update(bookingId).digest('hex');
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    const cohortGroup = bucket < holdoutPercentage ? 'CONTROL' : 'TREATMENT';
    return { cohortGroup, deterministicHash: hash.slice(0, 16), bucket };
  }

  async assignCohortIfApplicable(appointmentId: string, forceCohort?: 'TREATMENT' | 'CONTROL') {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { hospital: { include: { configuration: true } } },
    });
    if (!appt) return null;

    const config = appt.hospital.configuration;
    if (!config?.pilotHoldoutEnabled && !forceCohort) {
      return null;
    }

    const computed = this.computeDeterministicCohort(
      appt.bookingId,
      config?.pilotHoldoutPercentage ?? 20
    );
    const cohort = forceCohort || computed.cohortGroup;

    return this.prisma.holdoutAssignment.upsert({
      where: { appointmentId: appt.id },
      update: {
        cohortGroup: cohort,
        campaignsSuppressed: cohort === 'CONTROL',
      },
      create: {
        appointmentId: appt.id,
        hospitalId: appt.hospitalId,
        bookingId: appt.bookingId,
        cohortGroup: cohort,
        assignmentRule: `DETERMINISTIC_HASH_${100 - (config?.pilotHoldoutPercentage ?? 20)}_${config?.pilotHoldoutPercentage ?? 20}`,
        deterministicHash: computed.deterministicHash,
        campaignsSuppressed: cohort === 'CONTROL',
        isSyntheticDemo: appt.isSyntheticDemo,
      },
    });
  }

  async getPilotComparisonMetrics(hospitalId?: string) {
    const where: any = {};
    if (hospitalId) where.hospitalId = hospitalId;

    const assignments = await this.prisma.holdoutAssignment.findMany({
      where,
      include: {
        appointment: true,
        hospital: { select: { id: true, code: true, name: true } },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const calcGroupStats = (group: 'TREATMENT' | 'CONTROL') => {
      const items = assignments.filter((a) => a.cohortGroup === group);
      const total = items.length;
      const confirmed = items.filter((a) => a.appointment.status === 'CONFIRMED' || a.appointment.status === 'COMPLETED').length;
      const attended = items.filter((a) =>
        ['ARRIVED', 'REGISTERED', 'COMPLETED'].includes(a.appointment.attendanceStatus)
      ).length;
      const noShows = items.filter((a) => a.appointment.attendanceStatus === 'NO_SHOW').length;
      const arrivalRate = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
      const noShowRate = total > 0 ? Number(((noShows / total) * 100).toFixed(1)) : 0;
      return { total, confirmed, attended, noShows, arrivalRate, noShowRate };
    };

    const treatment = calcGroupStats('TREATMENT');
    const control = calcGroupStats('CONTROL');
    const liftPercentagePoints = Number((treatment.arrivalRate - control.arrivalRate).toFixed(1));

    return {
      isSyntheticDemoData: true,
      dataLabel: 'SYNTHETIC DEMONSTRATION DATA — NEW TOWN PILOT HOLDOUT MEASUREMENT',
      treatment,
      control,
      liftPercentagePoints,
      assignments,
    };
  }
}
