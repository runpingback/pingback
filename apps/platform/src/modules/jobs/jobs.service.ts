import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseExpression } from 'cron-parser';
import { Job } from './job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { PlanLimitsService } from '../subscription/plan-limits.service';
import { User } from '../../entities/user.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private planLimitsService: PlanLimitsService,
  ) {}

  computeNextRunAt(schedule: string): Date {
    try {
      const interval = parseExpression(schedule);
      return interval.next().toDate();
    } catch {
      throw new BadRequestException(`Invalid cron expression: ${schedule}`);
    }
  }

  async create(projectId: string, dto: CreateJobDto, userId?: string) {
    if (userId) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user) {
        const jobCheck = await this.planLimitsService.canCreateJob(user, projectId);
        if (!jobCheck.allowed) {
          throw new ForbiddenException(jobCheck.message);
        }
        if (dto.retries !== undefined) {
          dto.retries = this.planLimitsService.capRetries(user, dto.retries);
        }
      }
    }

    const nextRunAt = this.computeNextRunAt(dto.schedule);
    const job = this.jobRepo.create({
      projectId,
      name: dto.name,
      schedule: dto.schedule,
      retries: dto.retries ?? 0,
      timeoutSeconds: dto.timeoutSeconds ?? 30,
      concurrency: dto.concurrency ?? 1,
      source: 'manual' as const,
      nextRunAt,
    });
    return this.jobRepo.save(job);
  }

  async findAllByProject(
    projectId: string,
    filters?: { status?: string; type?: string },
  ) {
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .where('job.project_id = :projectId', { projectId });

    if (filters?.status) {
      qb.andWhere('job.status = :status', { status: filters.status });
    }
    if (filters?.type === 'cron') {
      qb.andWhere('job.schedule IS NOT NULL');
    } else if (filters?.type === 'task') {
      qb.andWhere('job.schedule IS NULL');
    }

    return qb.orderBy('job.created_at', 'DESC').getMany();
  }

  async findByName(projectId: string, name: string): Promise<Job | null> {
    return this.jobRepo.findOne({ where: { projectId, name } });
  }

  async findOne(id: string, projectId: string) {
    const job = await this.jobRepo.findOne({
      where: { id, projectId },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, projectId: string, dto: UpdateJobDto) {
    const job = await this.findOne(id, projectId);

    if (dto.schedule) {
      job.schedule = dto.schedule;
      job.nextRunAt = this.computeNextRunAt(dto.schedule);
    }
    if (dto.status) job.status = dto.status;
    if (dto.retries !== undefined) job.retries = dto.retries;
    if (dto.timeoutSeconds !== undefined) job.timeoutSeconds = dto.timeoutSeconds;
    if (dto.concurrency !== undefined) job.concurrency = dto.concurrency;

    return this.jobRepo.save(job);
  }

  async remove(id: string, projectId: string) {
    const job = await this.findOne(id, projectId);
    if (job.source === 'sdk') {
      job.status = 'inactive';
      return this.jobRepo.save(job);
    }
    await this.jobRepo.delete(id);
  }
}
