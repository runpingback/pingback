import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Execution } from './execution.entity';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectRepository(Execution) private execRepo: Repository<Execution>,
  ) {}

  async createPending(
    jobId: string,
    scheduledAt: Date,
    attempt = 1,
    options?: { parentId?: string; payload?: any },
  ) {
    const exec = this.execRepo.create({
      jobId,
      status: 'pending' as const,
      scheduledAt,
      attempt,
      ...(options?.parentId ? { parentId: options.parentId } : {}),
      ...(options?.payload !== undefined ? { payload: options.payload } : {}),
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
      parentId?: string;
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
      .leftJoinAndSelect('exec.job', 'job')
      .where('job.project_id = :projectId', { projectId });

    if (filters?.status) {
      qb.andWhere('exec.status = :status', { status: filters.status });
    }
    if (filters?.jobId) {
      qb.andWhere('exec.job_id = :jobId', { jobId: filters.jobId });
    }
    if (filters?.parentId) {
      qb.andWhere('exec.parent_id = :parentId', { parentId: filters.parentId });
    }
    if (filters?.dateFrom) {
      qb.andWhere('exec.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters?.dateTo) {
      qb.andWhere('exec.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    qb.orderBy('exec.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async saveAttemptAndRetry(
    id: string,
    result: {
      status: 'failed';
      httpStatus?: number;
      responseBody?: string;
      errorMessage?: string;
      logs?: Array<{ timestamp: number; message: string }>;
    },
  ) {
    const exec = await this.execRepo.findOne({ where: { id } });
    if (!exec) throw new NotFoundException('Execution not found');

    const completedAt = new Date();
    const durationMs = exec.startedAt
      ? completedAt.getTime() - exec.startedAt.getTime()
      : 0;

    // Save current attempt to history
    const attemptRecord = {
      attempt: exec.attempt,
      status: result.status,
      startedAt: exec.startedAt?.toISOString() || null,
      completedAt: completedAt.toISOString(),
      durationMs,
      httpStatus: result.httpStatus ?? null,
      errorMessage: result.errorMessage ?? null,
      logs: result.logs || [],
    };

    exec.attempts = [...(exec.attempts || []), attemptRecord];
    exec.attempt += 1;
    exec.status = 'pending';
    exec.startedAt = null as any;
    exec.completedAt = null as any;
    exec.durationMs = null as any;
    exec.httpStatus = null as any;
    exec.responseBody = null as any;
    exec.errorMessage = null as any;
    exec.logs = [];

    return this.execRepo.save(exec);
  }

  async getHistogram(
    projectId: string,
    hours = 48,
    buckets = 60,
  ) {
    const now = new Date();
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const intervalMs = (hours * 60 * 60 * 1000) / buckets;

    const rows = await this.execRepo
      .createQueryBuilder('exec')
      .leftJoin('exec.job', 'job')
      .select('exec.status', 'status')
      .addSelect('exec.created_at', 'created_at')
      .where('job.project_id = :projectId', { projectId })
      .andWhere('exec.created_at >= :from', { from: from.toISOString() })
      .getRawMany();

    const result: Array<{
      time: string;
      success: number;
      failed: number;
      total: number;
    }> = [];

    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(from.getTime() + i * intervalMs);
      const bucketEnd = new Date(bucketStart.getTime() + intervalMs);
      let success = 0;
      let failed = 0;

      for (const row of rows) {
        const t = new Date(row.created_at).getTime();
        if (t >= bucketStart.getTime() && t < bucketEnd.getTime()) {
          if (row.status === 'success') success++;
          else if (row.status === 'failed') failed++;
        }
      }

      result.push({
        time: bucketStart.toISOString(),
        success,
        failed,
        total: success + failed,
      });
    }

    return result;
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
