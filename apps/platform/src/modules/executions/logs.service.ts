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
      .leftJoinAndSelect('exec.job', 'job')
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

    qb.orderBy('exec.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [executions, total] = await qb.getManyAndCount();

    const logs = executions.flatMap((exec) =>
      exec.logs.map((log: any) => ({
        executionId: exec.id,
        jobId: exec.jobId,
        jobName: (exec as any).job?.name,
        timestamp: log.timestamp,
        level: log.level || 'info',
        message: log.message,
        ...(log.meta ? { meta: log.meta } : {}),
      })),
    );

    return { items: logs, total, page, limit };
  }

  async getHistogram(projectId: string, hours = 24, buckets = 144) {
    const intervalMs = (hours * 60 * 60 * 1000) / buckets;
    const now = new Date();
    const fromRaw = now.getTime() - hours * 60 * 60 * 1000;
    const from = new Date(Math.floor(fromRaw / intervalMs) * intervalMs);

    const rows = await this.execRepo
      .createQueryBuilder('exec')
      .leftJoin('exec.job', 'job')
      .select('exec.logs', 'logs')
      .addSelect('exec.created_at', 'created_at')
      .where('job.project_id = :projectId', { projectId })
      .andWhere('exec.created_at >= :from', { from: from.toISOString() })
      .andWhere("exec.logs != '[]'::jsonb")
      .getRawMany();

    const result: Array<{ time: string; info: number; warn: number; error: number; debug: number; total: number }> = [];

    for (let i = 0; i < buckets; i++) {
      const bucketStart = new Date(from.getTime() + i * intervalMs);
      const bucketEnd = new Date(bucketStart.getTime() + intervalMs);
      let info = 0, warn = 0, error = 0, debug = 0;

      for (const row of rows) {
        const t = new Date(row.created_at).getTime();
        if (t >= bucketStart.getTime() && t < bucketEnd.getTime()) {
          const logs = row.logs || [];
          for (const log of logs) {
            const level = (log as any).level || 'info';
            if (level === 'error') error++;
            else if (level === 'warn') warn++;
            else if (level === 'debug') debug++;
            else info++;
          }
        }
      }

      result.push({
        time: bucketStart.toISOString(),
        info, warn, error, debug,
        total: info + warn + error + debug,
      });
    }

    return result;
  }
}
