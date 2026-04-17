import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Execution } from './execution.entity';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectRepository(Execution) private execRepo: Repository<Execution>,
  ) {}

  async createPending(jobId: string, scheduledAt: Date, attempt = 1) {
    const exec = this.execRepo.create({
      jobId,
      status: 'pending' as const,
      scheduledAt,
      attempt,
    });
    return this.execRepo.save(exec);
  }

  async markRunning(id: string) {
    const exec = await this.execRepo.findOne({ where: { id } });
    if (!exec) throw new NotFoundException('Execution not found');
    exec.status = 'running';
    exec.startedAt = new Date();
    return this.execRepo.save(exec);
  }

  async markCompleted(
    id: string,
    result: {
      status: 'success' | 'failed';
      httpStatus?: number;
      responseBody?: string;
      errorMessage?: string;
      logs?: Array<{ timestamp: number; message: string }>;
    },
  ) {
    const exec = await this.execRepo.findOne({ where: { id } });
    if (!exec) throw new NotFoundException('Execution not found');

    exec.status = result.status;
    exec.completedAt = new Date();
    exec.durationMs = exec.startedAt
      ? exec.completedAt.getTime() - exec.startedAt.getTime()
      : 0;
    if (result.httpStatus !== undefined) exec.httpStatus = result.httpStatus;
    if (result.responseBody) exec.responseBody = result.responseBody.substring(0, 10240);
    if (result.errorMessage) exec.errorMessage = result.errorMessage;
    if (result.logs) exec.logs = result.logs;

    return this.execRepo.save(exec);
  }

  async findOne(id: string) {
    const exec = await this.execRepo.findOne({
      where: { id },
      relations: ['job'],
    });
    if (!exec) throw new NotFoundException('Execution not found');
    return exec;
  }

  async findByJob(jobId: string, page = 1, limit = 20) {
    const [items, total] = await this.execRepo.findAndCount({
      where: { jobId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findByProject(
    projectId: string,
    filters?: {
      status?: string;
      jobId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    const qb = this.execRepo
      .createQueryBuilder('exec')
      .innerJoin('exec.job', 'job')
      .where('job.project_id = :projectId', { projectId });

    if (filters?.status) {
      qb.andWhere('exec.status = :status', { status: filters.status });
    }
    if (filters?.jobId) {
      qb.andWhere('exec.job_id = :jobId', { jobId: filters.jobId });
    }
    if (filters?.dateFrom) {
      qb.andWhere('exec.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters?.dateTo) {
      qb.andWhere('exec.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    qb.orderBy('exec.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async hasPendingOrRunning(jobId: string, scheduledAt: Date): Promise<boolean> {
    const count = await this.execRepo.count({
      where: [
        { jobId, scheduledAt, status: 'pending' as const },
        { jobId, scheduledAt, status: 'running' as const },
      ],
    });
    return count > 0;
  }
}
