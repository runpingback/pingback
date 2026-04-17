import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { LogsService } from './logs.service';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects/:projectId/logs')
export class LogsController {
  constructor(
    private logsService: LogsService,
    private projectsService: ProjectsService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('jobId') jobId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.logsService.findByProject(projectId, {
      jobId,
      dateFrom,
      dateTo,
      q,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }
}
