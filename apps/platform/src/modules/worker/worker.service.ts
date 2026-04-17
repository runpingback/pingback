import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ExecutionsService } from '../executions/executions.service';
import { QueueService } from '../queue/queue.service';
import { AlertsService } from '../alerts/alerts.service';

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
}

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private executionsService: ExecutionsService,
    private queueService: QueueService,
    private alertsService: AlertsService,
  ) {}

  onModuleInit() {
    this.queueService.work('pingback-execution', (job: any) =>
      this.processJob(job),
    );
    this.logger.log('Worker subscribed to pingback-execution queue');
  }

  async processJob(job: any) {
    // pgboss v10 passes data directly on the job object, or under .data
    const msg: QueueMessage = job.data || job;

    try {
      await this.executionsService.markRunning(msg.executionId);

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = JSON.stringify({
        function: msg.functionName,
        executionId: msg.executionId,
        attempt: msg.attempt,
        scheduledAt: msg.scheduledAt,
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
          try {
            const parsed = JSON.parse(responseText);
            logs = parsed.logs || [];
          } catch {}

          await this.executionsService.markCompleted(msg.executionId, {
            status: 'success',
            httpStatus: response.status,
            responseBody: responseText,
            logs,
          });
        } else {
          await this.executionsService.markCompleted(msg.executionId, {
            status: 'failed',
            httpStatus: response.status,
            responseBody: responseText,
            errorMessage: `HTTP ${response.status}`,
          });

          await this.handleFailure(msg);
        }
      } catch (err) {
        clearTimeout(timeout);
        await this.executionsService.markCompleted(msg.executionId, {
          status: 'failed',
          errorMessage: (err as Error).message,
        });

        await this.handleFailure(msg);
      }
    } catch (err) {
      this.logger.error(
        `Worker error for execution ${msg.executionId}: ${(err as Error).message}`,
      );
    }
  }

  private async handleFailure(msg: QueueMessage) {
    if (msg.attempt < msg.maxRetries) {
      // Create a new execution for the retry attempt
      const retryExecution = await this.executionsService.createPending(
        msg.jobId,
        new Date(msg.scheduledAt),
        msg.attempt + 1,
      );

      const backoffSeconds = Math.min(Math.pow(2, msg.attempt), 60);
      await this.queueService.send(
        'pingback-execution',
        { ...msg, executionId: retryExecution.id, attempt: msg.attempt + 1 },
        { startAfter: backoffSeconds },
      );
    }

    await this.alertsService.evaluate(msg.jobId, msg.executionId);
  }
}
