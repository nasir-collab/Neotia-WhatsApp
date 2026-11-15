import { Inject, Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException, } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  private get jwtSecret() {
    return process.env.JWT_SECRET || 'anhvl-local-dev-jwt-secret-key-plan-d-media-2026-non-prod';
  }

  private get refreshSecret() {
    return process.env.JWT_REFRESH_SECRET || 'anhvl-local-dev-refresh-secret-key-plan-d-media-2026-non-prod';
  }

  async login(email: string, password: string, ipAddress = '127.0.0.1') {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        role: { include: { permissions: true } },
        hospital: true,
        agentProfile: true,
      },
    });

    if (!user) {
      await this.auditService.log({
        actorEmail: normalizedEmail,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        summary: `Failed login attempt for unknown account ${normalizedEmail}`,
        ipAddress,
        status: 'FAILED',
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      await this.auditService.log({
        userId: user.id,
        actorEmail: user.email,
        actorRole: user.role.code,
        hospitalId: user.hospitalId,
        action: 'LOGIN_BLOCKED_INACTIVE',
        entityType: 'User',
        entityId: user.id,
        summary: `Blocked login attempt for deactivated account ${user.email}`,
        ipAddress,
        status: 'FAILED',
      });
      throw new ForbiddenException('Account is deactivated or locked. Contact a Super Administrator.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        actorEmail: user.email,
        actorRole: user.role.code,
        hospitalId: user.hospitalId,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        summary: `Invalid password entered for ${user.email}`,
        ipAddress,
        status: 'FAILED',
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roleCode: user.role.code,
      hospitalId: user.hospitalId,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ id: user.id }, this.refreshSecret, { expiresIn: '7d' });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 8);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        refreshTokenHash,
      },
    });

    await this.auditService.log({
      userId: user.id,
      actorEmail: user.email,
      actorRole: user.role.code,
      hospitalId: user.hospitalId,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      summary: `User ${user.fullName} (${user.role.code}) authenticated successfully.`,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 28800,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleCode: user.role.code,
        roleName: user.role.name,
        hospitalId: user.hospitalId,
        hospitalName: user.hospital?.name || 'All ANHVL Hospitals (Kolkata & Raipur)',
        hospitalCode: user.hospital?.code || 'ALL',
        permissions: user.role.permissions.map((p) => `${p.resource}:${p.action}`),
        agentProfile: user.agentProfile,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }
    try {
      const decoded = jwt.verify(refreshToken, this.refreshSecret) as { id: string };
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.id },
        include: { role: { include: { permissions: true } }, hospital: true },
      });
      if (!user || user.status !== 'ACTIVE' || !user.refreshTokenHash) {
        throw new UnauthorizedException('Session invalid or expired.');
      }
      const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!matches) {
        throw new UnauthorizedException('Refresh token invalidated.');
      }
      const payload = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleCode: user.role.code,
        hospitalId: user.hospitalId,
      };
      const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '8h' });
      return { accessToken, expiresIn: 28800 };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async logout(userId: string, actorEmail?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    await this.auditService.log({
      userId,
      actorEmail,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId,
      summary: `User ${actorEmail || userId} logged out and invalidated refresh token.`,
    });
    return { success: true };
  }

  async resetPassword(targetEmail: string, newPassword: string, actor: any) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long.');
    }
    const user = await this.prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) {
      throw new BadRequestException('User account not found.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, refreshTokenHash: null },
    });
    await this.auditService.log({
      userId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.roleCode,
      hospitalId: user.hospitalId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      summary: `Password reset completed for account ${user.email}.`,
    });
    return { success: true, message: `Password updated for ${user.email}` };
  }
}
