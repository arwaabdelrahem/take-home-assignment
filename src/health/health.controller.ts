import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.check();
    res.status(result.status === 'ok' ? 200 : 503);
    return result;
  }
}
