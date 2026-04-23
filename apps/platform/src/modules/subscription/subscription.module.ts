import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Project } from '../projects/project.entity';
import { Job } from '../jobs/job.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { WebhookController } from './webhook.controller';
import { PlanLimitsService } from './plan-limits.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Project, Job])],
  controllers: [SubscriptionController, WebhookController],
  providers: [SubscriptionService, PlanLimitsService],
  exports: [SubscriptionService, PlanLimitsService],
})
export class SubscriptionModule {}
