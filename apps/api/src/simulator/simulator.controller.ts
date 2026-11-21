import { Inject, Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SimulatorService } from './simulator.service';

@ApiTags('Interactive Live Demo Simulator')
@ApiBearerAuth()
@Controller('simulator')
export class SimulatorController {
  constructor(@Inject(SimulatorService) private readonly simulatorService: SimulatorService) { }

  @Get()
  @ApiOperation({ summary: 'Retrieve current Live Demo Simulator state, scenarios, handset messages, and event history' })
  async getStatus() {
    const data = await this.simulatorService.getSimulatorStatus();
    return { success: true, data };
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a specific simulator scenario (1 through 10)' })
  async startScenario(@Body() body: { scenarioId: string }) {
    const data = await this.simulatorService.startScenario(body.scenarioId);
    return { success: true, data };
  }

  @Post('next-step')
  @ApiOperation({ summary: 'Execute the next event in the active simulator scenario' })
  async nextStep() {
    const data = await this.simulatorService.runNextStep();
    return { success: true, data };
  }

  @Post('advance-clock')
  @ApiOperation({ summary: 'Advance the isolated simulation clock without affecting production jobs' })
  async advanceClock(@Body() body: { minutes?: number }) {
    const data = await this.simulatorService.advanceClock(body?.minutes || 60);
    return { success: true, data };
  }

  @Post('pause')
  @ApiOperation({ summary: 'Pause or resume the simulator' })
  async pauseResume(@Body() body: { paused: boolean }) {
    const data = await this.simulatorService.pauseResume(Boolean(body?.paused));
    return { success: true, data };
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reset the Live Demo Simulator state' })
  async reset() {
    const data = await this.simulatorService.resetSimulator();
    return { success: true, data };
  }
}
