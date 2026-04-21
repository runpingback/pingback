import { Injectable } from '@nestjs/common';
import { Cron, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class HealthCheckService {
  @Cron('health-check', '*/5 * * * *', { retries: 1, timeout: '10s' })
  async check(ctx: PingbackContext) {
    ctx.log('Running health check...', { service: 'nestjs-example' });

    const checks = {
      database: true,
      cache: true,
      externalApi: Math.random() > 0.1,
    };

    const allHealthy = Object.values(checks).every(Boolean);

    if (!allHealthy) {
      ctx.log.error('Health check failed', checks);
      throw new Error('Health check failed: some services degraded');
    }

    ctx.log('Health: OK', checks);
    return checks;
  }
}
