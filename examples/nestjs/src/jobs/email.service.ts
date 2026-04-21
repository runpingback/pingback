import { Injectable } from '@nestjs/common';
import { Cron, Task, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class EmailService {
  @Cron('send-pending-emails', '*/15 * * * *', { retries: 3, timeout: '60s' })
  async sendPending(ctx: PingbackContext) {
    ctx.log('Checking for pending emails...');

    const pendingCount = Math.floor(Math.random() * 20);
    ctx.log(`Found ${pendingCount} pending emails`, { count: pendingCount });

    for (let i = 0; i < pendingCount; i++) {
      ctx.task('send-single-email', { emailId: `email-${i + 1}` });
    }

    ctx.log('Dispatched all emails', { dispatched: pendingCount });
    return { dispatched: pendingCount };
  }

  @Task('send-single-email', { retries: 2, timeout: '15s' })
  async sendSingle(ctx: PingbackContext, payload: { emailId: string }) {
    ctx.log('Sending email', { emailId: payload.emailId });

    // Simulate sending
    await new Promise((r) => setTimeout(r, 10));

    if (Math.random() < 0.05) {
      ctx.log.error('Failed to send', { emailId: payload.emailId });
      throw new Error(`Failed to send ${payload.emailId}`);
    }

    ctx.log('Email sent', { emailId: payload.emailId });
    return { sent: true };
  }
}
