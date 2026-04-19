import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { ExecutionsModule } from '../executions/executions.module';
import { AlertsModule } from '../alerts/alerts.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [ExecutionsModule, AlertsModule, JobsModule],
  providers: [WorkerService],
})
export class WorkerModule {}
