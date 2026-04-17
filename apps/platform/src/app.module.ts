import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { User } from './entities/user.entity';
import { Project } from './modules/projects/project.entity';
import { ApiKey } from './modules/api-keys/api-key.entity';
import { Job } from './modules/jobs/job.entity';
import { Execution } from './modules/executions/execution.entity';
import { Alert } from './modules/alerts/alert.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('database.url'),
        entities: [User, Project, ApiKey, Job, Execution, Alert],
        synchronize: true,
      }),
    }),
  ],
})
export class AppModule {}
