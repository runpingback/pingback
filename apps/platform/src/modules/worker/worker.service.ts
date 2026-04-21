import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ExecutionsService } from '../executions/executions.service';
import { QueueService } from '../queue/queue.service';
import { AlertsService } from '../alerts/alerts.service';
import { JobsService } from '../jobs/jobs.service';

interface QueueMessage {
  executionId: string;
  jobId: string;
  projectId: string;
  functionName: string;
  endpointUrl: string;
  cronSecret: string;
  attempt: number;
  maxRetries: number;
  timeoutSeconds: number;
  scheduledAt: string;
  payload?: any;
}

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private executionsService: ExecutionsService,
    private queueService: QueueService,
    private alertsService: AlertsService,
    private jobsService: JobsService,
  ) {}

  onModuleInit() {
    this.queueService.work('pingback-execution', (jobs: any) => {
      // pgboss v10 passes an array of jobs to the handler
      const jobList = Array.isArray(jobs) ? jobs : [jobs];
      return Promise.all(jobList.map((j: any) => this.processJob(j)));
    });
    this.logger.log('Worker subscribed to pingback-execution queue');
  }

  async processJob(job: any) {
    const msg: QueueMessage = job.data || job;
    this.logger.log(`Processing execution ${msg.executionId} for ${msg.functionName}`);

    try {
      await this.executionsService.markRunning(msg.executionId);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({
        function: msg.functionName,
        executionId: msg.executionId,
        attempt: msg.attempt,
        scheduledAt: msg.scheduledAt,
        ...(msg.payload !== undefined ? { payload: msg.payload } : {}),
      });

      const signature = createHmac('sha256', msg.cronSecret)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        msg.timeoutSeconds * 1000,
      );

      try {
        const response = await fetch(msg.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Pingback-Signature': signature,
            'X-Pingback-Timestamp': timestamp,
          },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const responseText = await response.text();

        if (response.ok) {
          let logs: Array<{ timestamp: number; message: string }> = [];
          let tasks: Array<{ name: string; payload: any }> = [];
          try {
            const parsed = JSON.parse(responseText);
            logs = parsed.logs || [];
            tasks = parsed.tasks || [];
          } catch {}

          await this.executionsService.markCompleted(msg.executionId, {
            status: 'success',
            httpStatus: response.status,
            responseBody: responseText,
            logs,
          });

          // Fan-out: dispatch child tasks
          for (const task of tasks) {
            try {
              const taskJob = await this.jobsService.findByName(
                msg.projectId,
                task.name,
              );
              if (!taskJob) {
                this.logger.warn(
                  `Fan-out: task function "${task.name}" not registered, skipping`,
                );
                continue;
              }

              const childExec = await this.executionsService.createPending(
                taskJob.id,
                new Date(),
                1,
                { parentId: msg.executionId, payload: task.payload },
              );

              await this.queueService.send('pingback-execution', {
                executionId: childExec.id,
                jobId: taskJob.id,
                projectId: msg.projectId,
                functionName: task.name,
                endpointUrl: msg.endpointUrl,
                cronSecret: msg.cronSecret,
                attempt: 1,
                maxRetries: taskJob.retries,
                timeoutSeconds: taskJob.timeoutSeconds,
                scheduledAt: new Date().toISOString(),
                payload: task.payload,
              });
            } catch (err) {
              this.logger.error(
                `Fan-out error for task "${task.name}": ${(err as Error).message}`,
              );
            }
          }
        } else {
          let failLogs: Array<{ timestamp: number; message: string }> = [];
          try {
            const parsed = JSON.parse(responseText);
            failLogs = parsed.logs || [];
          } catch {}

          const failResult = {
            httpStatus: response.status,
            errorMessage: `HTTP ${response.status}`,
            logs: failLogs,
          };

          if (msg.attempt <= msg.maxRetries) {
            await this.handleFailure(msg, failResult);
          } else {
            await this.executionsService.markCompleted(msg.executionId, {
              status: 'failed',
              httpStatus: response.status,
              responseBody: responseText,
              errorMessage: `HTTP ${response.status}`,
              logs: failLogs,
            });
            await this.handleFailure(msg, failResult);
          }
        }
      } catch (err) {
        clearTimeout(timeout);
        const errResult = {
          errorMessage: (err as Error).message,
          logs: [] as Array<{ timestamp: number; message: string }>,
        };

        if (msg.attempt <= msg.maxRetries) {
          await this.handleFailure(msg, errResult);
        } else {
          await this.executionsService.markCompleted(msg.executionId, {
            status: 'failed',
            errorMessage: (err as Error).message,
          });
          await this.handleFailure(msg, errResult);
        }
      }
    } catch (err) {
      this.logger.error(
        `Worker error for execution ${msg.executionId}: ${(err as Error).message}`,
      );
    }
  }

  private async handleFailure(
    msg: QueueMessage,
    result: {
      httpStatus?: number;
      errorMessage?: string;
      logs?: Array<{ timestamp: number; message: string }>;
    },
  ) {
    if (msg.attempt <= msg.maxRetries) {
      // Save failed attempt and reset execution for retry
      await this.executionsService.saveAttemptAndRetry(msg.executionId, {
        status: 'failed',
        httpStatus: result.httpStatus,
        errorMessage: result.errorMessage,
        logs: result.logs,
      });

      const backoffSeconds = Math.min(Math.pow(2, msg.attempt), 60);
      await this.queueService.send(
        'pingback-execution',
        { ...msg, attempt: msg.attempt + 1 },
        { startAfter: backoffSeconds },
      );
    } else {
      await this.alertsService.evaluate(msg.jobId, msg.executionId);
    }
  }
}
