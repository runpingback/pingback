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

### 2. Define functions

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

### 3. Environment variables

```
PINGBACK_API_KEY=pb_live_...
PINGBACK_CRON_SECRET=...
```

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
