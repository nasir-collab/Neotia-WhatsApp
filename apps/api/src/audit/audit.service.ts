import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string | null;
    actorEmail?: string | null;
    actorRole?: string | null;
    hospitalId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    ipAddress?: string | null;
    metadata?: any;
    status?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        actorEmail: params.actorEmail || 'SYSTEM',
        actorRole: params.actorRole || 'SYSTEM',
        hospitalId: params.hospitalId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        summary: params.summary,
        ipAddress: params.ipAddress || '127.0.0.1',
        metadata: params.metadata || {},
        status: params.status || 'SUCCESS',
      },
    });
  }

  async findAll(filters: { hospitalId?: string; action?: string; search?: string; limit?: number }) {
    const where: any = {};
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;
    if (filters.action && filters.action !== 'ALL') where.action = filters.action;
    if (filters.search) {
      where.OR = [
        { summary: { contains: filters.search, mode: 'insensitive' } },
        { actorEmail: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.auditLog.findMany({
      where,
      include: { hospital: { select: { id: true, code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
    });
  }
}
