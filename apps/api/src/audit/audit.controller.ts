import { Inject, Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve security and operational audit logs' })
  async getAuditLogs(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const logs = await this.auditService.findAll({
      hospitalId: scopedHospitalId,
      action,
      search,
      limit: limit ? Number(limit) : 100,
    });
    return { success: true, count: logs.length, data: logs };
  }
}
