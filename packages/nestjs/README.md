# @usepingback/nestjs

NestJS adapter for [Pingback](https://pingback.lol) — reliable cron jobs and background tasks.

## Installation

```bash
npm install @usepingback/nestjs
```

## Setup

### 1. Import the module

```typescript
import { PingbackModule } from '@usepingback/nestjs';

@Module({
  imports: [
    PingbackModule.register({
      apiKey: process.env.PINGBACK_API_KEY,
      cronSecret: process.env.PINGBACK_CRON_SECRET,
      baseUrl: process.env.APP_URL,
    }),
  ],
})
export class AppModule {}
```

### 2. Enable raw body

Pingback verifies requests with an HMAC signature over the raw body. Enable `rawBody` in your bootstrap so the signature check works correctly:

```typescript
// main.ts
const app = await NestFactory.create(AppModule, { rawBody: true });
```

### 3. Define functions

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, Task, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class EmailService {
  @Cron('send-emails', '*/15 * * * *', { retries: 3, timeout: '60s' })
  async sendEmails(ctx: PingbackContext) {
    ctx.log('Dispatched emails', { count: 42 });
  }

  @Task('send-email', { retries: 2, timeout: '15s' })
  async sendEmail(ctx: PingbackContext, payload: { id: string }) {
    ctx.log('Sent email', { id: payload.id });
  }
}
```

### 4. Environment variables

```
PINGBACK_API_KEY=pb_live_...
PINGBACK_CRON_SECRET=...
```

## Workflows (Task Chaining)

Tasks can call `ctx.task()` to chain into multi-step workflows with branching:

```typescript
@Injectable()
export class OrderService {
  @Task('validate-order', { retries: 2 })
  async validateOrder(ctx: PingbackContext, payload: { orderId: string; amount: number }) {
    ctx.log('Validating', { orderId: payload.orderId });

    if (payload.amount <= 0) {
      ctx.task('notify-failure', { orderId: payload.orderId, reason: 'Invalid amount' });
      return { valid: false };
    }

    ctx.task('charge-payment', payload);
    return { valid: true };
  }

  @Task('charge-payment', { retries: 3 })
  async chargePayment(ctx: PingbackContext, payload: { orderId: string; amount: number }) {
    const charge = await this.stripe.charge(payload.amount);
    ctx.log('Charged', { chargeId: charge.id });
    ctx.task('send-confirmation', payload);
  }

  @Task('send-confirmation', { retries: 2 })
  async sendConfirmation(ctx: PingbackContext, payload: { orderId: string }) {
    await this.mailer.send(payload.orderId);
    ctx.log('Confirmation sent');
  }
}
```

Each step runs as its own execution with independent retries and logging. The workflow graph in your dashboard visualizes the full chain.

## Programmatic Triggering

Use `PingbackClient` to trigger tasks from anywhere in your application — no cron schedule or fan-out needed. It's an injectable service:

```typescript
import { Injectable } from '@nestjs/common';
import { PingbackClient } from '@usepingback/nestjs';

@Injectable()
export class AuthService {
  constructor(private readonly pingback: PingbackClient) {}

  async register(email: string, password: string) {
    const user = await this.createUser(email, password);

    const { executionId } = await this.pingback.trigger(
      'send-onboarding-email',
      { userId: user.id },
    );

    return user;
  }
}
```

`trigger()` returns an `{ executionId }` you can use for tracking. The task must already be registered in your project (defined with `@Task()` and deployed).

## Structured Logging

```typescript
ctx.log('message');                          // info
ctx.log('message', { key: 'value' });        // info with metadata
ctx.log.warn('slow query', { ms: 2500 });    // warning
ctx.log.error('failed', { code: 'E001' });   // error
ctx.log.debug('cache stats', { hits: 847 }); // debug
```

## Configuration

```typescript
PingbackModule.register({
  apiKey: string;          // Required
  cronSecret: string;      // Required
  baseUrl?: string;        // Your app's public URL
  routePath?: string;      // default: /api/pingback
  platformUrl?: string;    // default: https://api.pingback.lol
})
```

## How It Works

1. On startup, scans all providers for @Cron and @Task decorators
2. Registers functions with the Pingback platform
3. Auto-registers a POST endpoint at /api/pingback
4. Platform sends signed execution requests to your endpoint
5. Controller verifies HMAC, executes handler, returns results
