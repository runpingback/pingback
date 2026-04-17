import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Execution } from './execution.entity';
import { ExecutionsService } from './executions.service';
import { LogsService } from './logs.service';
import { ExecutionsApiController, ExecutionsDashboardController } from './executions.controller';
import { LogsController } from './logs.controller';
import { ProjectsModule } from '../projects/projects.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Execution]),
    ProjectsModule,
    AuthModule,
  ],
  controllers: [ExecutionsApiController, ExecutionsDashboardController, LogsController],
  providers: [ExecutionsService, LogsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
