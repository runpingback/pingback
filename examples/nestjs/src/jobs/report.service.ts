import { Injectable } from '@nestjs/common';
import { Cron, Task, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class ReportService {
  @Cron('daily-report', '0 9 * * *', { retries: 2, timeout: '5m' })
  async generateDaily(ctx: PingbackContext) {
    ctx.log('Starting daily report generation');

    const departments = ['engineering', 'sales', 'support', 'marketing'];

    for (const dept of departments) {
      ctx.task('generate-dept-report', { department: dept });
    }

    ctx.log('Dispatched department reports', { count: departments.length });
    return { departments: departments.length };
  }

  @Task('generate-dept-report', { retries: 1, timeout: '2m' })
  async generateDeptReport(ctx: PingbackContext, payload: { department: string }) {
    ctx.log('Generating report', { department: payload.department });

    // Simulate work
    const startMs = Date.now();
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    const elapsed = Date.now() - startMs;

    const metrics = {
      department: payload.department,
      records: Math.floor(Math.random() * 500) + 100,
      durationMs: elapsed,
    };

    if (elapsed > 120) {
      ctx.log.warn('Slow report generation', metrics);
    }

    ctx.log.debug('Report metrics', metrics);
    ctx.log('Report generated', { department: payload.department });

    return metrics;
  }
}
