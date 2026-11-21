import { Controller, Get, Post, Body, Query, Req, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { Roles } from '../common/auth.guard';

@ApiTags('Doctor Disruptions & Patient Re-Targeting')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(
    @Inject(CampaignsService) private readonly campaignsService: CampaignsService
  ) {}

  @Get('doctor-disruptions/doctors')
  async getDoctors(@Query('hospitalId') hospitalId?: string) {
    const data = await this.campaignsService.getDoctorsForDisruption(hospitalId);
    return { success: true, data };
  }

  @Get('doctor-disruptions/preview')
  async previewDisruption(
    @Query('hospitalId') hospitalId?: string,
    @Query('doctorName') doctorName?: string,
    @Query('date') date?: string
  ) {
    const data = await this.campaignsService.previewDoctorDisruption({
      hospitalId,
      doctorName: doctorName || '',
      date,
    });
    return { success: true, data };
  }

  @Post('doctor-disruptions/execute')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER', 'OPS_EXECUTIVE')
  async executeDisruption(@Body() body: any, @Req() req: any) {
    const data = await this.campaignsService.executeDoctorDisruption(
      body,
      req.user?.email || 'admin@anhvl-demo.in'
    );
    return { success: true, data };
  }

  @Get('retargeting/cohorts')
  async getRetargetingCohorts(@Query('hospitalId') hospitalId?: string) {
    const data = await this.campaignsService.getRetargetingCohorts(hospitalId);
    return { success: true, data };
  }

  @Post('retargeting/launch')
  @Roles('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'OPS_MANAGER')
  async launchRetargeting(@Body() body: any, @Req() req: any) {
    const data = await this.campaignsService.launchRetargetingCampaign(
      body,
      req.user?.email || 'admin@anhvl-demo.in'
    );
    return { success: true, data };
  }
}
