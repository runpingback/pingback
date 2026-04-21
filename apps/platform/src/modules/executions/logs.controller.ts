import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { LogsService } from './logs.service';
import { PaginatedLogsResponse } from './dto/execution-response.dto';

@ApiTags('Logs')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects/:projectId/logs')
export class LogsController {
  constructor(
    private logsService: LogsService,
    private projectsService: ProjectsService,
  ) {}

  @Get('histogram')
  @ApiOperation({ summary: 'Get logs histogram for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getHistogram(
    @Req() req: Request,
    @Param('projectId') projectId: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.logsService.getHistogram(projectId);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list logs for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date filter (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date filter (ISO 8601)' })
  @ApiQuery({ name: 'q', required: false, description: 'Full-text search query' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 50)' })
  @ApiResponse({ status: 200, description: 'Paginated list of logs', type: PaginatedLogsResponse })
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
