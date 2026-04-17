import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseExpression } from 'cron-parser';
import { Job } from '../jobs/job.entity';
import { Project } from './project.entity';

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
    @InjectRepository(Project) private projectRepo: Repository<Project>,
  ) {}

  async register(projectId: string, functions: FunctionMetadata[], endpointUrl?: string) {
    const results: Array<{ name: string; status: string }> = [];

    if (endpointUrl) {
      await this.projectRepo.update(projectId, { endpointUrl });
    }

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

      const jobData: Partial<Job> = {
        projectId,
        name: fn.name,
        schedule: (fn.type === 'cron' ? fn.schedule : null) as string,
        source: 'sdk' as const,
        status: 'active' as const,
        retries: fn.options?.retries ?? (existing?.retries ?? 0),
        timeoutSeconds,
        concurrency: fn.options?.concurrency ?? (existing?.concurrency ?? 1),
      };
      if (nextRunAt) jobData.nextRunAt = nextRunAt;
      if (existing) jobData.id = existing.id;

      const saved = await this.jobRepo.save(this.jobRepo.create(jobData as any)) as unknown as Job;
      results.push({ name: saved.name, status: saved.status });
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
