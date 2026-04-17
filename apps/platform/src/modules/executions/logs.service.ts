import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Execution } from './execution.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Execution) private execRepo: Repository<Execution>,
  ) {}

  async findByProject(
    projectId: string,
    filters?: {
      jobId?: string;
      dateFrom?: string;
      dateTo?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;

    const qb = this.execRepo
      .createQueryBuilder('exec')
      .innerJoin('exec.job', 'job')
      .select([
        'exec.id',
        'exec.jobId',
        'exec.logs',
        'exec.createdAt',
        'job.name',
      ])
      .where('job.project_id = :projectId', { projectId })
      .andWhere("exec.logs != '[]'::jsonb");

    if (filters?.jobId) {
      qb.andWhere('exec.job_id = :jobId', { jobId: filters.jobId });
    }
    if (filters?.dateFrom) {
      qb.andWhere('exec.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters?.dateTo) {
      qb.andWhere('exec.created_at <= :dateTo', { dateTo: filters.dateTo });
    }
    if (filters?.q) {
      qb.andWhere(
        "EXISTS (SELECT 1 FROM jsonb_array_elements(exec.logs) AS log WHERE log->>'message' ILIKE :q)",
        { q: `%${filters.q}%` },
      );
    }

    qb.orderBy('exec.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [executions, total] = await qb.getManyAndCount();

    const logs = executions.flatMap((exec) =>
      exec.logs.map((log) => ({
        executionId: exec.id,
        jobId: exec.jobId,
        jobName: (exec as any).job?.name,
        timestamp: log.timestamp,
        message: log.message,
      })),
    );

    return { items: logs, total, page, limit };
  }
}
