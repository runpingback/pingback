import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseExpression } from 'cron-parser';
import { Job } from '../jobs/job.entity';

interface FunctionMetadata {
  name: string;
  type: 'cron' | 'task';
  schedule?: string;
  options?: {
    retries?: number;
    timeout?: string;
    concurrency?: number;
  };
}

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
  ) {}

  async register(projectId: string, functions: FunctionMetadata[]) {
    const results: Array<{ name: string; status: string }> = [];

    for (const fn of functions) {
      const existing = await this.jobRepo.findOne({
        where: { projectId, name: fn.name },
      });

      const timeoutStr = fn.options?.timeout;
      const timeoutSeconds = timeoutStr
        ? parseInt(timeoutStr.replace('s', ''))
        : 30;

      let nextRunAt: Date | null = null;
      if (fn.type === 'cron' && fn.schedule) {
        try {
          nextRunAt = parseExpression(fn.schedule).next().toDate();
        } catch {
          throw new BadRequestException(
            `Invalid cron expression for "${fn.name}": ${fn.schedule}`,
          );
        }
      }

      if (existing) {
        existing.schedule = (fn.type === 'cron' ? fn.schedule : null) as string;
        existing.status = 'active';
        existing.retries = fn.options?.retries ?? existing.retries;
        existing.timeoutSeconds = timeoutSeconds;
        existing.concurrency = fn.options?.concurrency ?? existing.concurrency;
        if (nextRunAt) existing.nextRunAt = nextRunAt;

        const saved = await this.jobRepo.save(existing);
        results.push({ name: saved.name, status: saved.status });
      } else {
        const jobData: Partial<Job> = {
          projectId,
          name: fn.name,
          schedule: (fn.type === 'cron' ? fn.schedule : null) as string,
          source: 'sdk' as const,
          status: 'active' as const,
          retries: fn.options?.retries ?? 0,
          timeoutSeconds,
          concurrency: fn.options?.concurrency ?? 1,
          nextRunAt: nextRunAt as Date,
        };
        const job = this.jobRepo.create(jobData as any);
        const saved = await this.jobRepo.save(job) as unknown as Job;
        results.push({ name: saved.name, status: saved.status });
      }
    }

    // Deactivate stale SDK jobs not in the incoming list
    const incomingNames = functions.map((f) => f.name);
    await this.jobRepo
      .createQueryBuilder()
      .update(Job)
      .set({ status: 'inactive' })
      .where('project_id = :projectId', { projectId })
      .andWhere('source = :source', { source: 'sdk' })
      .andWhere('name NOT IN (:...names)', { names: incomingNames.length ? incomingNames : ['__none__'] })
      .execute();

    return { jobs: results };
  }
}
