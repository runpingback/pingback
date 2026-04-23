import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { JobsService } from './jobs.service';
import { JobsApiController, JobsDashboardController } from './jobs.controller';
import { ProjectsModule } from '../projects/projects.module';
import { ExecutionsModule } from '../executions/executions.module';
import { QueueModule } from '../queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, User]),
    ProjectsModule,
    ExecutionsModule,
    QueueModule,
    forwardRef(() => AuthModule),
    SubscriptionModule,
  ],
  controllers: [JobsApiController, JobsDashboardController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
