import { Inject, Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma.service';
import { ResponsesService } from './responses.service';
import { enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Patient Responses')
@ApiBearerAuth()
@Controller('responses')
export class ResponsesController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ResponsesService) private readonly responsesService: ResponsesService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List captured WhatsApp patient responses across hospitals' })
  async listResponses(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('action') action?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const where: any = {};
    if (scopedHospitalId) where.hospitalId = scopedHospitalId;
    if (action && action !== 'ALL') where.mappedAction = action;

    const responses = await this.prisma.patientResponse.findMany({
      where,
      include: {
        appointment: true,
        patient: {
          select: { id: true, externalPatientId: true, fullName: true, mobileNumber: true },
        },
        hospital: { select: { id: true, code: true, name: true } },
      },
      orderBy: { receivedAt: 'desc' },
    });

    return { success: true, count: responses.length, data: responses };
  }

  @Post('capture')
  @ApiOperation({ summary: 'Capture and process an inbound patient response (Interactive Button or Text Keyword)' })
  async captureResponse(
    @Body()
    body: {
      appointmentId?: string;
      senderMobile?: string;
      rawResponseText: string;
      buttonPayload?: string;
      responseChannel?: string;
    }
  ) {
    const record = await this.responsesService.processInboundResponse(body);
    return { success: true, data: record };
  }
}
