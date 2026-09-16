import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RunsService } from './runs.service';

@Controller('runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  create(@Body() body: { limit?: number } = {}) {
    return this.runsService.create(body.limit);
  }

  @Get(':id/errors')
  errors(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ) {
    return this.runsService.findErrors(id, Number(page) || 1, Number(pageSize) || 50);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.runsService.findById(id);
  }
}
