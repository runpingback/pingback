import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity';
import { SchedulerService } from './scheduler.service';
import { ExecutionsModule } from '../executions/executions.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Job]), ExecutionsModule, AlertsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
