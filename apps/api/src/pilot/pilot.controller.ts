import { Inject, Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PilotService } from './pilot.service';
import { Roles, enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Pilot & Control Group Measurement')
@ApiBearerAuth()
@Controller('pilot')
export class PilotController {
  constructor(@Inject(PilotService) private readonly pilotService: PilotService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve New Town Pilot Treatment vs Control group comparison metrics' })
  async getPilotMetrics(@Req() req: any, @Query('hospitalId') hospitalId?: string) {
    const scopedId = enforceHospitalScope(req.user, hospitalId);
    const metrics = await this.pilotService.getPilotComparisonMetrics(scopedId);
    return { success: true, data: metrics };
  }

  @Post('assign')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER')
  @ApiOperation({ summary: 'Assign or override Treatment/Control cohort for an appointment' })
  async assignCohort(
    @Body() body: { appointmentId: string; cohortGroup?: 'TREATMENT' | 'CONTROL' }
  ) {
    const res = await this.pilotService.assignCohortIfApplicable(
      body.appointmentId,
      body.cohortGroup
    );
    return { success: true, data: res };
  }
}
