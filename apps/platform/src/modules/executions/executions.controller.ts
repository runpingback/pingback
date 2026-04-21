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
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { ExecutionsService } from './executions.service';
import { ExecutionResponse, PaginatedExecutionsResponse } from './dto/execution-response.dto';

@ApiTags('Executions')
@ApiBearerAuth('api-key')
@UseGuards(ApiKeyGuard)
@Controller('api/v1')
export class ExecutionsApiController {
  constructor(private executionsService: ExecutionsService) {}

  @Get('jobs/:jobId/executions')
  @ApiOperation({ summary: 'List executions for a job' })
  @ApiParam({ name: 'jobId', description: 'Job UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of executions', type: PaginatedExecutionsResponse })
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
  @ApiOperation({ summary: 'Get a single execution by ID' })
  @ApiParam({ name: 'id', description: 'Execution UUID' })
  @ApiResponse({ status: 200, description: 'Execution details', type: ExecutionResponse })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }
}

@ApiTags('Executions (Dashboard)')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects/:projectId')
export class ExecutionsDashboardController {
  constructor(
    private executionsService: ExecutionsService,
    private projectsService: ProjectsService,
  ) {}

  @Get('executions')
  @ApiOperation({ summary: 'List executions for a project (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date filter (ISO 8601)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date filter (ISO 8601)' })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent execution ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default 20)' })
  @ApiResponse({ status: 200, description: 'Paginated list of executions', type: PaginatedExecutionsResponse })
  async findByProject(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('jobId') jobId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.executionsService.findByProject(projectId, {
      status,
      jobId,
      parentId,
      dateFrom,
      dateTo,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('executions/histogram')
  @ApiOperation({ summary: 'Get execution histogram for a project (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'hours', required: false, description: 'Lookback hours (default 48)' })
  @ApiQuery({ name: 'buckets', required: false, description: 'Number of buckets (default 60)' })
  async getHistogram(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('hours') hours?: string,
    @Query('buckets') buckets?: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.executionsService.getHistogram(
      projectId,
      hours ? parseInt(hours) : 48,
      buckets ? parseInt(buckets) : 60,
    );
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Get a single execution by ID (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Execution UUID' })
  @ApiResponse({ status: 200, description: 'Execution details', type: ExecutionResponse })
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
