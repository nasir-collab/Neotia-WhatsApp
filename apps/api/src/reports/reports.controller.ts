import { Inject, Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { enforceHospitalScope } from '../common/auth.guard';

@ApiTags('Executive Dashboard & Operational Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Retrieve Executive Dashboard KPIs, hospital comparison, and breakdowns' })
  async getOverview(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const data = await this.reportsService.getOverviewAnalytics({
      hospitalId: scopedHospitalId,
      fromDate,
      toDate,
    });
    return { success: true, data };
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Retrieve attendance conversion & doctor/department reconciliation report' })
  async getAttendanceReport(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const data = await this.reportsService.getOverviewAnalytics({
      hospitalId: scopedHospitalId,
      fromDate,
      toDate,
    });
    return {
      success: true,
      data: {
        kpis: data.kpis,
        denominatorsNote: data.denominatorsNote,
        hospitalComparison: data.hospitalComparison,
        doctorAnalysis: data.doctorAnalysis,
        departmentAnalysis: data.departmentAnalysis,
      },
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'Retrieve WhatsApp messaging delivery, language routing, and failure report' })
  async getMessagesReport(
    @Req() req: any,
    @Query('hospitalId') hospitalId?: string
  ) {
    const scopedHospitalId = enforceHospitalScope(req.user, hospitalId);
    const data = await this.reportsService.getOverviewAnalytics({
      hospitalId: scopedHospitalId,
    });
    return {
      success: true,
      data: {
        kpis: data.kpis,
        languageBreakdown: data.languageBreakdown,
        hospitalComparison: data.hospitalComparison,
      },
    };
  }
}
