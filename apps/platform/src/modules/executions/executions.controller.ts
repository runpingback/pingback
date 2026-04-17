import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { ExecutionsService } from './executions.service';

@UseGuards(ApiKeyGuard)
@Controller('api/v1')
export class ExecutionsApiController {
  constructor(private executionsService: ExecutionsService) {}

  @Get('jobs/:jobId/executions')
  findByJob(
    @Param('jobId') jobId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.executionsService.findByJob(
      jobId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('executions/:id')
  findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects/:projectId')
export class ExecutionsDashboardController {
  constructor(
    private executionsService: ExecutionsService,
    private projectsService: ProjectsService,
  ) {}

  @Get('executions')
  async findByProject(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('jobId') jobId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.executionsService.findByProject(projectId, {
      status,
      jobId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('executions/:id')
  async findOne(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.executionsService.findOne(id);
  }
}
