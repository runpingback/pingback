import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PingbackModule } from "@usepingback/nestjs";
import configuration from "./config/configuration";
import { User } from "./entities/user.entity";
import { Project } from "./modules/projects/project.entity";
import { ApiKey } from "./modules/api-keys/api-key.entity";
import { Job } from "./modules/jobs/job.entity";
import { Execution } from "./modules/executions/execution.entity";
import { Alert } from "./modules/alerts/alert.entity";
import { AuthModule } from "./modules/auth/auth.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { ExecutionsModule } from "./modules/executions/executions.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { QueueModule } from "./modules/queue/queue.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { WorkerModule } from "./modules/worker/worker.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        url: config.get("database.url"),
        entities: [User, Project, ApiKey, Job, Execution, Alert],
        synchronize: true,
      }),
    }),
    PingbackModule.register({
      apiKey: process.env.PINGBACK_API_KEY || "",
      cronSecret: process.env.PINGBACK_CRON_SECRET || "",
      baseUrl: process.env.PINGBACK_BASE_URL,
      platformUrl: "https://api.pingback.lol",
    }),
    AuthModule,
    ProjectsModule,
    JobsModule,
    ExecutionsModule,
    AlertsModule,
    QueueModule,
    SchedulerModule,
    WorkerModule,
    OnboardingModule,
    SubscriptionModule,
  ],
})
export class AppModule {}
