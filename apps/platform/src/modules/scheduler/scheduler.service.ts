import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Not, IsNull } from 'typeorm';
import { parseExpression } from 'cron-parser';
import { Job } from '../jobs/job.entity';
import { ExecutionsService } from '../executions/executions.service';
import { QueueService } from '../queue/queue.service';
import { AlertsService } from '../alerts/alerts.service';

const TICK_INTERVAL_MS = 10_000;

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private intervalRef: NodeJS.Timeout;
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    private executionsService: ExecutionsService,
    private queueService: QueueService,
    private alertsService: AlertsService,
  ) {}

  onModuleInit() {
    this.intervalRef = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    this.logger.log('Scheduler started (10s tick)');
  }

  onModuleDestroy() {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  async tick() {
    try {
      const dueJobs = await this.jobRepo.find({
        where: {
          status: 'active' as const,
          nextRunAt: LessThanOrEqual(new Date()),
          schedule: Not(IsNull()),
        },
        relations: ['project'],
      });

      for (const job of dueJobs) {
        try {
          const duplicate = await this.executionsService.hasPendingOrRunning(
            job.id,
            job.nextRunAt,
          );
          if (duplicate) continue;

          const execution = await this.executionsService.createPending(
            job.id,
            job.nextRunAt,
          );

          const message = {
            executionId: execution.id,
            jobId: job.id,
            projectId: job.projectId,
            functionName: job.name,
            endpointUrl: job.project.endpointUrl,
            cronSecret: job.project.cronSecret,
            attempt: 1,
            maxRetries: job.retries,
            timeoutSeconds: job.timeoutSeconds,
            scheduledAt: job.nextRunAt.toISOString(),
          };

          await this.queueService.send('pingback-execution', message);

          // Advance next_run_at
          const next = parseExpression(job.schedule).next().toDate();
          job.nextRunAt = next;
          job.lastRunAt = new Date();
          await this.jobRepo.save(job);
        } catch (err) {
          this.logger.error(`Failed to process job ${job.id}: ${(err as Error).message}`);
        }
      }
      // Check for missed runs after processing due jobs
      try {
        await this.alertsService.checkMissedRuns();
      } catch (err) {
        this.logger.error(`Missed run check failed: ${(err as Error).message}`);
      }
    } catch (err) {
      this.logger.error(`Scheduler tick failed: ${(err as Error).message}`);
    }
  }
}
