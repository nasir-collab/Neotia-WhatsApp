import {
  Inject, Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Users, Roles & Agents')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) { }

  @Get()
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'MANAGEMENT_VIEWER')
  @ApiOperation({ summary: 'List users with role and hospital scope' })
  async listUsers(@Req() req: any, @Query('hospitalId') hospitalId?: string) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) {
      where.OR = [{ hospitalId: scopedHospitalId }, { hospitalId: null }];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        role: { include: { permissions: true } },
        hospital: true,
        agentProfile: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        roleCode: u.role.code,
        roleName: u.role.name,
        hospitalId: u.hospitalId,
        hospitalName: u.hospital?.name || 'All Hospitals (Group Scope)',
        agentProfile: u.agentProfile,
      })),
    };
  }

  @Get('roles')
  @ApiOperation({ summary: 'List all RBAC roles and permissions' })
  async listRoles() {
    const roles = await this.prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });
    return { success: true, data: roles };
  }

  @Get('agents')
  @ApiOperation({ summary: 'List call-centre agents and workload metrics' })
  async listAgents(@Req() req: any, @Query('hospitalId') hospitalId?: string) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;

    const agents = await this.prisma.agent.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, status: true } },
        hospital: { select: { id: true, code: true, name: true, city: true } },
        assignedTasks: {
          select: { id: true, status: true, priority: true, taskType: true },
        },
      },
      orderBy: { agentCode: 'asc' },
    });

    return { success: true, data: agents };
  }

  @Post()
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: 'Create a new platform user with role and hospital assignment' })
  async createUser(
    @Body()
    body: {
      email: string;
      fullName: string;
      password: string;
      roleCode: string;
      hospitalId?: string | null;
      createAgentProfile?: boolean;
      languagesSpoken?: string[];
    },
    @Req() req: any
  ) {
    if (!body.email || !body.fullName || !body.password || !body.roleCode) {
      throw new BadRequestException('Email, full name, password, and roleCode are required.');
    }

    const role = await this.prisma.role.findUnique({ where: { code: body.roleCode } });
    if (!role) {
      throw new BadRequestException(`Unknown role code: ${body.roleCode}`);
    }

    const targetHospitalId = req.user.hospitalId || body.hospitalId || null;
    const passwordHash = await bcrypt.hash(body.password, 10);

    const created = await this.prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        fullName: body.fullName.trim(),
        passwordHash,
        roleId: role.id,
        hospitalId: targetHospitalId,
        status: 'ACTIVE',
        createdBy: req.user.email,
      },
      include: { role: true, hospital: true },
    });

    if (body.roleCode === 'CALL_CENTRE_AGENT' && targetHospitalId) {
      await this.prisma.agent.create({
        data: {
          userId: created.id,
          hospitalId: targetHospitalId,
          agentCode: `ALT-${Date.now().toString().slice(-5)}`,
          teamName: 'Altruist Patient Desk',
          languagesSpoken: body.languagesSpoken || ['en', 'bn', 'hi'],
          status: 'AVAILABLE',
        },
      });
    }

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: targetHospitalId,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: created.id,
      summary: `Created user ${created.email} with role ${created.role.code}.`,
    });

    return {
      success: true,
      data: {
        id: created.id,
        email: created.email,
        fullName: created.fullName,
        roleCode: created.role.code,
        status: created.status,
      },
    };
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' },
    @Req() req: any
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: body.status,
        refreshTokenHash: body.status !== 'ACTIVE' ? null : undefined,
      },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: updated.hospitalId,
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: updated.id,
      summary: `Changed status of user ${updated.email} to ${body.status}.`,
    });

    return { success: true, data: { id: updated.id, email: updated.email, status: updated.status } };
  }

  @Patch('agents/:id/status')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'CALL_CENTRE_AGENT')
  @ApiOperation({ summary: 'Update call-centre agent availability status' })
  async updateAgentStatus(
    @Param('id') id: string,
    @Body() body: { status: 'AVAILABLE' | 'BUSY' | 'OFFLINE'; languagesSpoken?: string[] },
    @Req() req: any
  ) {
    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        status: body.status,
        languagesSpoken: body.languagesSpoken || undefined,
      },
    });

    await this.auditService.log({
      userId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.roleCode,
      hospitalId: agent.hospitalId,
      action: 'AGENT_STATUS_UPDATED',
      entityType: 'Agent',
      entityId: agent.id,
      summary: `Updated agent ${agent.agentCode} status to ${body.status}.`,
    });

    return { success: true, data: agent };
  }
}
