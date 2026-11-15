import { Inject, Controller, Get, Post, Param, Body, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { WhatsappService } from './whatsapp.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('WhatsApp Communication & Message Logs')
@ApiBearerAuth()
@Controller('messages')
export class WhatsappController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List outbound and inbound WhatsApp message logs with delivery status' })
  async listMessages(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('status') status?: string,
    @Query('direction') direction?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (status && status !== 'ALL') where.status = status;
    if (direction && direction !== 'ALL') where.direction = direction;

    const messages = await this.prisma.messageLog.findMany({
      where,
      include: {
        appointment: {
          select: {
            id: true,
            bookingId: true,
            patientName: true,
            doctorName: true,
            department: true,
            appointmentDate: true,
            appointmentTime: true,
            status: true,
          },
        },
        hospital: { select: { id: true, code: true, name: true } },
        template: { select: { id: true, code: true, name: true, metaTemplateName: true, language: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    return { success: true, count: messages.length, data: messages };
  }

  @Get('webhooks/history')
  @ApiOperation({ summary: 'List raw Meta WhatsApp webhook events and idempotency status' })
  async listWebhooks() {
    const webhooks = await this.prisma.whatsAppWebhook.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { success: true, count: webhooks.length, data: webhooks };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed WhatsApp message log record' })
  async getMessage(@Param('id') id: string) {
    const message = await this.prisma.messageLog.findUnique({
      where: { id },
      include: {
        appointment: true,
        hospital: true,
        template: true,
        patientResponses: true,
      },
    });
    if (!message) throw new BadRequestException('Message log not found.');
    return { success: true, data: message };
  }

  @Post('test')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  @ApiOperation({ summary: 'Trigger an administrator test template message for an appointment' })
  async sendTestMessage(
    @Body()
    body: {
      appointmentId: string;
      category?: string;
      simulateDeliveryReceiptInDemo?: boolean;
    },
    @Req() req: any
  ) {
    const result = await this.whatsappService.sendAppointmentTemplateMessage({
      appointmentId: body.appointmentId,
      category: body.category || 'APPOINTMENT_CONFIRMATION',
      isAutomatedCampaign: false,
      simulateDeliveryReceiptInDemo: body.simulateDeliveryReceiptInDemo ?? false,
      actorEmail: req.user.email,
    });
    return { success: true, data: result };
  }
}
