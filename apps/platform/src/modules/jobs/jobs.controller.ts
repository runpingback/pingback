import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
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
import { ExecutionsService } from '../executions/executions.service';
import { QueueService } from '../queue/queue.service';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobResponse } from './dto/job-response.dto';

@ApiTags('Jobs')
@ApiBearerAuth('api-key')
@UseGuards(ApiKeyGuard)
@Controller('api/v1/jobs')
export class JobsApiController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job' })
  @ApiResponse({ status: 201, description: 'Job created', type: JobResponse })
  create(@Req() req: Request, @Body() dto: CreateJobDto) {
    const { project } = req.user as any;
    return this.jobsService.create(project.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all jobs for the project' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active, paused)' })
  @ApiResponse({ status: 200, description: 'List of jobs', type: [JobResponse] })
  findAll(@Req() req: Request, @Query('status') status?: string) {
    const { project } = req.user as any;
    return this.jobsService.findAllByProject(project.id, { status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, description: 'Job details', type: JobResponse })
  @ApiResponse({ status: 404, description: 'Job not found' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    const { project } = req.user as any;
    return this.jobsService.findOne(id, project.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, description: 'Job updated', type: JobResponse })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    const { project } = req.user as any;
    return this.jobsService.update(id, project.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, description: 'Job deleted' })
  remove(@Req() req: Request, @Param('id') id: string) {
    const { project } = req.user as any;
    return this.jobsService.remove(id, project.id);
  }
}

@ApiTags('Jobs (Dashboard)')
@ApiBearerAuth('jwt')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/projects/:projectId/jobs')
export class JobsDashboardController {
  constructor(
    private jobsService: JobsService,
    private projectsService: ProjectsService,
    private executionsService: ExecutionsService,
    private queueService: QueueService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all jobs for a project (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type (cron, task)' })
  @ApiResponse({ status: 200, description: 'List of jobs', type: [JobResponse] })
  async findAll(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.jobsService.findAllByProject(projectId, { status, type });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a job by ID (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, description: 'Job details', type: JobResponse })
  async findOne(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.jobsService.findOne(id, projectId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a job (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, description: 'Job updated', type: JobResponse })
  async update(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.jobsService.update(id, projectId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job (dashboard)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, description: 'Job deleted' })
  async remove(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string };
    await this.projectsService.findOneByUser(projectId, user.id);
    return this.jobsService.remove(id, projectId);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Manually trigger a job run' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 201, description: 'Run triggered' })
  async triggerRun(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    const user = req.user as { id: string };
    const project = await this.projectsService.findOneByUser(projectId, user.id);
    const job = await this.jobsService.findOne(id, projectId);

    const execution = await this.executionsService.createPending(
      job.id,
      new Date(),
      1,
    );

    await this.queueService.send('pingback-execution', {
      executionId: execution.id,
      jobId: job.id,
      projectId,
      functionName: job.name,
      endpointUrl: project.endpointUrl,
      cronSecret: project.cronSecret,
      attempt: 1,
      maxRetries: job.retries,
      timeoutSeconds: job.timeoutSeconds,
      scheduledAt: new Date().toISOString(),
    });

    return { message: 'Run triggered', executionId: execution.id, jobId: job.id };
  }
}
