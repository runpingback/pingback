import { Module } from '@nestjs/common';
import { PingbackModule } from '@usepingback/nestjs';
import { HealthCheckService } from './jobs/health-check.service';
import { EmailService } from './jobs/email.service';
import { ReportService } from './jobs/report.service';

@Module({
  imports: [
    PingbackModule.register({
      apiKey: process.env.PINGBACK_API_KEY!,
      cronSecret: process.env.PINGBACK_CRON_SECRET!,
      baseUrl: process.env.APP_URL || 'http://localhost:3002',
    }),
  ],
  providers: [HealthCheckService, EmailService, ReportService],
})
export class AppModule {}
