import { Inject, Controller, Post, Get, Body, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public, Roles } from '../common/auth.guard';
import { PrismaService } from '../common/prisma.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate user and issue JWT access & refresh tokens' })
  async login(@Body() body: { email: string; password: string }, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const result = await this.authService.login(body.email, body.password, ip);
    return { success: true, data: result };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate access token using valid refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    const result = await this.authService.refresh(body.refreshToken);
    return { success: true, data: result };
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invalidate session refresh token and record logout audit' })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.id, req.user.email);
    return { success: true, message: 'Logged out successfully.' };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Return current authenticated user profile and RBAC permissions' })
  async me(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: { include: { permissions: true } },
        hospital: true,
        agentProfile: true,
      },
    });
    return {
      success: true,
      data: {
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

  @ApiBearerAuth()
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN')
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Administrator-authorized password reset workflow' })
  async resetPassword(
    @Body() body: { email: string; newPassword: string },
    @Req() req: any
  ) {
    const res = await this.authService.resetPassword(body.email, body.newPassword, req.user);
    return res;
  }
}
