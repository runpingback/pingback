import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { Job } from '../jobs/job.entity';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Job]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ProjectsController, RegistrationController],
  providers: [ProjectsService, RegistrationService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
