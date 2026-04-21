# @usepingback/nestjs Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NestJS adapter for Pingback with decorator-based function definitions, auto-registered controller, and startup-time registration.

**Architecture:** Dynamic NestJS module using `@Cron`/`@Task` method decorators with `Reflect.defineMetadata`. On boot, scans all providers via `DiscoveryService`, builds a registry, registers with the platform, and exposes a POST endpoint for execution dispatch.

**Tech Stack:** NestJS 10+, TypeScript, `@usepingback/core`, `reflect-metadata`, Jest for testing.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/nestjs/package.json` | Create | Package manifest with deps and peer deps |
| `packages/nestjs/tsconfig.json` | Create | TypeScript config |
| `packages/nestjs/src/decorators.ts` | Create | `@Cron()` and `@Task()` method decorators |
| `packages/nestjs/src/pingback.module.ts` | Create | `PingbackModule.register()`, provider scanning, platform registration |
| `packages/nestjs/src/pingback.controller.ts` | Create | POST endpoint with HMAC verification and handler dispatch |
| `packages/nestjs/src/index.ts` | Create | Public API exports |
| `packages/nestjs/tests/decorators.spec.ts` | Create | Decorator metadata tests |
| `packages/nestjs/tests/controller.spec.ts` | Create | Controller request handling tests |
| `packages/nestjs/README.md` | Create | Package documentation |

---

### Task 1: Package scaffold

**Files:**
- Create: `packages/nestjs/package.json`
- Create: `packages/nestjs/tsconfig.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@usepingback/nestjs",
  "version": "0.1.0",
  "description": "NestJS adapter for Pingback — reliable cron jobs and background tasks",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "keywords": [
    "pingback",
    "nestjs",
    "cron",
    "scheduled-jobs",
    "background-tasks"
  ],
  "author": "Pingback",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/champ3oy/pingback",
    "directory": "packages/nestjs"
  },
  "homepage": "https://pingback.lol/docs/nestjs",
  "bugs": {
    "url": "https://github.com/champ3oy/pingback/issues"
  },
  "dependencies": {
    "@usepingback/core": "0.2.0"
  },
  "peerDependencies": {
    "@nestjs/common": ">=10",
    "@nestjs/core": ">=10",
    "reflect-metadata": ">=0.1",
    "rxjs": ">=7"
  },
  "devDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src"],
  "exclude": ["dist", "tests", "node_modules"]
}
```

- [ ] **Step 3: Create jest.config.js**

Create `packages/nestjs/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
};
```

- [ ] **Step 4: Install dependencies**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback && npm install`
Expected: Dependencies install successfully

- [ ] **Step 5: Verify build**

Run: `mkdir -p packages/nestjs/src && echo "export {};" > packages/nestjs/src/index.ts && cd packages/nestjs && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/nestjs/package.json packages/nestjs/tsconfig.json packages/nestjs/jest.config.js packages/nestjs/src/index.ts
git commit -m "chore: scaffold @usepingback/nestjs package"
```

---

### Task 2: Decorators

**Files:**
- Create: `packages/nestjs/src/decorators.ts`
- Create: `packages/nestjs/tests/decorators.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/nestjs/tests/decorators.spec.ts`:

```typescript
import 'reflect-metadata';
import { Cron, Task, PINGBACK_FUNCTION_METADATA, PingbackFunctionMetadata } from '../src/decorators';

class TestService {
  @Cron('daily-sync', '0 0 * * *', { retries: 3, timeout: '60s' })
  async dailySync() {}

  @Cron('simple-job', '* * * * *')
  async simpleJob() {}

  @Task('send-email', { retries: 2, timeout: '15s' })
  async sendEmail() {}

  @Task('simple-task')
  async simpleTask() {}

  async noDecorator() {}
}

describe('Cron decorator', () => {
  it('should store cron metadata on the method', () => {
    const meta: PingbackFunctionMetadata = Reflect.getMetadata(
      PINGBACK_FUNCTION_METADATA,
      TestService.prototype,
      'dailySync',
    );
    expect(meta).toEqual({
      name: 'daily-sync',
      type: 'cron',
      schedule: '0 0 * * *',
      options: { retries: 3, timeout: '60s' },
    });
  });

  it('should default options to empty object', () => {
    const meta: PingbackFunctionMetadata = Reflect.getMetadata(
      PINGBACK_FUNCTION_METADATA,
      TestService.prototype,
      'simpleJob',
    );
    expect(meta).toEqual({
      name: 'simple-job',
      type: 'cron',
      schedule: '* * * * *',
      options: {},
    });
  });
});

describe('Task decorator', () => {
  it('should store task metadata on the method', () => {
    const meta: PingbackFunctionMetadata = Reflect.getMetadata(
      PINGBACK_FUNCTION_METADATA,
      TestService.prototype,
      'sendEmail',
    );
    expect(meta).toEqual({
      name: 'send-email',
      type: 'task',
      options: { retries: 2, timeout: '15s' },
    });
  });

  it('should default options to empty object', () => {
    const meta: PingbackFunctionMetadata = Reflect.getMetadata(
      PINGBACK_FUNCTION_METADATA,
      TestService.prototype,
      'simpleTask',
    );
    expect(meta).toEqual({
      name: 'simple-task',
      type: 'task',
      options: {},
    });
  });
});

describe('No decorator', () => {
  it('should not have metadata on undecorated methods', () => {
    const meta = Reflect.getMetadata(
      PINGBACK_FUNCTION_METADATA,
      TestService.prototype,
      'noDecorator',
    );
    expect(meta).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/nestjs && npx jest --no-cache 2>&1 | head -20`
Expected: Errors about missing module `../src/decorators`

- [ ] **Step 3: Implement decorators**

Create `packages/nestjs/src/decorators.ts`:

```typescript
import 'reflect-metadata';

export const PINGBACK_FUNCTION_METADATA = 'pingback:function';

export interface PingbackFunctionMetadata {
  name: string;
  type: 'cron' | 'task';
  schedule?: string;
  options: {
    retries?: number;
    timeout?: string;
    concurrency?: number;
  };
}

export function Cron(
  name: string,
  schedule: string,
  options?: PingbackFunctionMetadata['options'],
): MethodDecorator {
  return (target, propertyKey) => {
    const meta: PingbackFunctionMetadata = {
      name,
      type: 'cron',
      schedule,
      options: options || {},
    };
    Reflect.defineMetadata(PINGBACK_FUNCTION_METADATA, meta, target, propertyKey);
  };
}

export function Task(
  name: string,
  options?: PingbackFunctionMetadata['options'],
): MethodDecorator {
  return (target, propertyKey) => {
    const meta: PingbackFunctionMetadata = {
      name,
      type: 'task',
      options: options || {},
    };
    Reflect.defineMetadata(PINGBACK_FUNCTION_METADATA, meta, target, propertyKey);
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/nestjs && npx jest --no-cache`
Expected: All 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/nestjs/src/decorators.ts packages/nestjs/tests/decorators.spec.ts
git commit -m "feat(nestjs): add @Cron and @Task method decorators"
```

---

### Task 3: Controller

**Files:**
- Create: `packages/nestjs/src/pingback.controller.ts`
- Create: `packages/nestjs/tests/controller.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/nestjs/tests/controller.spec.ts`:

```typescript
import 'reflect-metadata';
import { PingbackController, PINGBACK_REGISTRY, PINGBACK_OPTIONS } from '../src/pingback.controller';
import { createHmac } from 'crypto';
import type { PingbackFunctionMetadata } from '../src/decorators';

function makeSignature(body: string, secret: string): { signature: string; timestamp: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return { signature, timestamp };
}

describe('PingbackController', () => {
  const secret = 'test-secret';
  let controller: PingbackController;
  let registry: Map<string, { instance: any; methodName: string; metadata: PingbackFunctionMetadata }>;

  beforeEach(() => {
    registry = new Map();
    controller = new PingbackController(
      { apiKey: 'key', cronSecret: secret } as any,
      registry,
    );
  });

  it('should return 401 for invalid signature', async () => {
    const body = JSON.stringify({ function: 'test', executionId: 'e1', attempt: 1, scheduledAt: new Date().toISOString() });
    const result = await controller.handleExecution(
      { 'x-pingback-signature': 'invalid', 'x-pingback-timestamp': '0' } as any,
      JSON.parse(body),
      body,
    );
    expect(result.status).toBe('error');
    expect(result.statusCode).toBe(401);
  });

  it('should return 404 for unknown function', async () => {
    const body = JSON.stringify({ function: 'unknown', executionId: 'e1', attempt: 1, scheduledAt: new Date().toISOString() });
    const { signature, timestamp } = makeSignature(body, secret);
    const result = await controller.handleExecution(
      { 'x-pingback-signature': signature, 'x-pingback-timestamp': timestamp } as any,
      JSON.parse(body),
      body,
    );
    expect(result.status).toBe('error');
    expect(result.statusCode).toBe(404);
  });

  it('should execute a registered handler and return success', async () => {
    const instance = {
      myMethod: jest.fn().mockResolvedValue({ ok: true }),
    };
    registry.set('test-fn', {
      instance,
      methodName: 'myMethod',
      metadata: { name: 'test-fn', type: 'cron', schedule: '* * * * *', options: {} },
    });

    const body = JSON.stringify({ function: 'test-fn', executionId: 'e1', attempt: 1, scheduledAt: new Date().toISOString() });
    const { signature, timestamp } = makeSignature(body, secret);
    const result = await controller.handleExecution(
      { 'x-pingback-signature': signature, 'x-pingback-timestamp': timestamp } as any,
      JSON.parse(body),
      body,
    );
    expect(result.status).toBe('success');
    expect(result.result).toEqual({ ok: true });
    expect(result.logs).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(instance.myMethod).toHaveBeenCalledTimes(1);
  });

  it('should pass payload to task handlers', async () => {
    const instance = {
      myTask: jest.fn().mockResolvedValue(undefined),
    };
    registry.set('my-task', {
      instance,
      methodName: 'myTask',
      metadata: { name: 'my-task', type: 'task', options: {} },
    });

    const payload = { userId: 'u123' };
    const body = JSON.stringify({ function: 'my-task', executionId: 'e2', attempt: 1, scheduledAt: new Date().toISOString(), payload });
    const { signature, timestamp } = makeSignature(body, secret);
    const result = await controller.handleExecution(
      { 'x-pingback-signature': signature, 'x-pingback-timestamp': timestamp } as any,
      JSON.parse(body),
      body,
    );
    expect(result.status).toBe('success');
    expect(instance.myTask).toHaveBeenCalledWith(expect.anything(), payload);
  });

  it('should return error when handler throws', async () => {
    const instance = {
      failing: jest.fn().mockRejectedValue(new Error('boom')),
    };
    registry.set('fail-fn', {
      instance,
      methodName: 'failing',
      metadata: { name: 'fail-fn', type: 'cron', schedule: '* * * * *', options: {} },
    });

    const body = JSON.stringify({ function: 'fail-fn', executionId: 'e3', attempt: 1, scheduledAt: new Date().toISOString() });
    const { signature, timestamp } = makeSignature(body, secret);
    const result = await controller.handleExecution(
      { 'x-pingback-signature': signature, 'x-pingback-timestamp': timestamp } as any,
      JSON.parse(body),
      body,
    );
    expect(result.status).toBe('error');
    expect(result.error).toBe('boom');
    expect(result.statusCode).toBe(500);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/nestjs && npx jest tests/controller.spec.ts --no-cache 2>&1 | head -20`
Expected: Errors about missing module `../src/pingback.controller`

- [ ] **Step 3: Implement controller**

Create `packages/nestjs/src/pingback.controller.ts`:

```typescript
import { Controller, Post, Headers, Body, Inject, HttpCode, RawBody } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { createContext } from '@usepingback/core';
import type { ContextWithInternals, ExecutionPayload } from '@usepingback/core';
import type { PingbackFunctionMetadata } from './decorators';

export const PINGBACK_OPTIONS = 'PINGBACK_OPTIONS';
export const PINGBACK_REGISTRY = 'PINGBACK_REGISTRY';

export interface PingbackModuleOptions {
  apiKey: string;
  cronSecret: string;
  baseUrl?: string;
  routePath?: string;
  platformUrl?: string;
}

interface HandlerEntry {
  instance: any;
  methodName: string;
  metadata: PingbackFunctionMetadata;
}

function verifySignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const age = Date.now() - parseInt(timestamp) * 1000;
  if (age > 5 * 60 * 1000) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

@Controller()
export class PingbackController {
  constructor(
    @Inject(PINGBACK_OPTIONS) private options: PingbackModuleOptions,
    @Inject(PINGBACK_REGISTRY) private registry: Map<string, HandlerEntry>,
  ) {}

  @Post()
  @HttpCode(200)
  async handleExecution(
    @Headers() headers: Record<string, string>,
    @Body() payload: ExecutionPayload,
    @Body() rawBody?: string,
  ): Promise<any> {
    const signature = headers['x-pingback-signature'] || '';
    const timestamp = headers['x-pingback-timestamp'] || '';
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(payload);

    if (!verifySignature(bodyStr, signature, timestamp, this.options.cronSecret)) {
      return { status: 'error', error: 'Invalid signature', statusCode: 401 };
    }

    const entry = this.registry.get(payload.function);
    if (!entry) {
      return { status: 'error', error: `Function "${payload.function}" not found`, statusCode: 404 };
    }

    const ctx = createContext(payload) as ContextWithInternals;
    const start = Date.now();

    try {
      const result = entry.metadata.type === 'task'
        ? await entry.instance[entry.methodName](ctx, payload.payload)
        : await entry.instance[entry.methodName](ctx);
      const durationMs = Date.now() - start;

      return {
        status: 'success',
        result,
        logs: ctx._getLogs(),
        tasks: ctx._getTasks(),
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - start;

      return {
        status: 'error',
        error: (err as Error).message,
        logs: ctx._getLogs(),
        tasks: ctx._getTasks(),
        durationMs,
        statusCode: 500,
      };
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/nestjs && npx jest tests/controller.spec.ts --no-cache`
Expected: All 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/nestjs/src/pingback.controller.ts packages/nestjs/tests/controller.spec.ts
git commit -m "feat(nestjs): add execution controller with HMAC verification"
```

---

### Task 4: Module

**Files:**
- Create: `packages/nestjs/src/pingback.module.ts`

- [ ] **Step 1: Implement the module**

Create `packages/nestjs/src/pingback.module.ts`:

```typescript
import {
  DynamicModule,
  Logger,
  Module,
  OnModuleInit,
  Inject,
} from '@nestjs/common';
import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { PINGBACK_FUNCTION_METADATA, PingbackFunctionMetadata } from './decorators';
import {
  PingbackController,
  PingbackModuleOptions,
  PINGBACK_OPTIONS,
  PINGBACK_REGISTRY,
} from './pingback.controller';

@Module({})
export class PingbackModule implements OnModuleInit {
  private readonly logger = new Logger(PingbackModule.name);

  constructor(
    @Inject(PINGBACK_OPTIONS) private options: PingbackModuleOptions,
    @Inject(PINGBACK_REGISTRY)
    private registry: Map<
      string,
      { instance: any; methodName: string; metadata: PingbackFunctionMetadata }
    >,
    private discovery: DiscoveryService,
  ) {}

  static register(options: PingbackModuleOptions): DynamicModule {
    const registry = new Map<
      string,
      { instance: any; methodName: string; metadata: PingbackFunctionMetadata }
    >();

    return {
      module: PingbackModule,
      imports: [DiscoveryModule],
      controllers: [PingbackController],
      providers: [
        { provide: PINGBACK_OPTIONS, useValue: options },
        { provide: PINGBACK_REGISTRY, useValue: registry },
      ],
      exports: [PINGBACK_OPTIONS, PINGBACK_REGISTRY],
      global: true,
    };
  }

  async onModuleInit() {
    this.scanProviders();
    await this.registerWithPlatform();
  }

  private scanProviders() {
    const providers = this.discovery.getProviders();

    for (const wrapper of providers) {
      const instance = wrapper.instance;
      if (!instance || !instance.constructor) continue;

      const proto = Object.getPrototypeOf(instance);
      if (!proto) continue;

      const methodNames = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== 'constructor' && typeof proto[name] === 'function',
      );

      for (const methodName of methodNames) {
        const meta: PingbackFunctionMetadata | undefined =
          Reflect.getMetadata(PINGBACK_FUNCTION_METADATA, proto, methodName);

        if (meta) {
          this.registry.set(meta.name, { instance, methodName, metadata: meta });
          this.logger.log(`Registered ${meta.type}: ${meta.name}`);
        }
      }
    }

    if (this.registry.size === 0) {
      this.logger.warn('No @Cron or @Task functions found');
    }
  }

  private async registerWithPlatform() {
    if (this.registry.size === 0) return;

    const platformUrl = this.options.platformUrl || 'https://api.pingback.lol';
    const baseUrl = this.options.baseUrl;
    const routePath = this.options.routePath || '/api/pingback';

    if (!baseUrl) {
      this.logger.warn(
        'baseUrl not set — skipping registration. Set baseUrl in PingbackModule.register() or functions will register on first request.',
      );
      return;
    }

    const endpointUrl = `${baseUrl}${routePath}`;
    const functions = Array.from(this.registry.values()).map((entry) => ({
      name: entry.metadata.name,
      type: entry.metadata.type,
      schedule: entry.metadata.schedule,
      options: entry.metadata.options,
    }));

    try {
      const response = await fetch(`${platformUrl}/api/v1/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({ functions, endpoint_url: endpointUrl }),
      });

      if (response.ok) {
        this.logger.log(
          `Registered ${functions.length} function(s) with Pingback`,
        );
      } else {
        const text = await response.text();
        this.logger.error(`Registration failed (${response.status}): ${text}`);
      }
    } catch (err) {
      this.logger.error(
        `Registration error: ${(err as Error).message}`,
      );
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd packages/nestjs && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/nestjs/src/pingback.module.ts
git commit -m "feat(nestjs): add PingbackModule with provider scanning and platform registration"
```

---

### Task 5: Public API and build

**Files:**
- Modify: `packages/nestjs/src/index.ts`

- [ ] **Step 1: Write the public API**

Replace `packages/nestjs/src/index.ts` with:

```typescript
export { PingbackModule } from './pingback.module';
export { Cron, Task } from './decorators';
export type { PingbackFunctionMetadata } from './decorators';
export { PINGBACK_OPTIONS, PINGBACK_REGISTRY } from './pingback.controller';
export type { PingbackModuleOptions } from './pingback.controller';

// Re-export context type from core
export type { Context as PingbackContext } from '@usepingback/core';
```

- [ ] **Step 2: Build the package**

Run: `cd packages/nestjs && npx tsc`
Expected: Compiles without errors, `dist/` directory created

- [ ] **Step 3: Run all tests**

Run: `cd packages/nestjs && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/nestjs/src/index.ts packages/nestjs/dist
git commit -m "feat(nestjs): add public API exports and verify build"
```

---

### Task 6: README

**Files:**
- Create: `packages/nestjs/README.md`

- [ ] **Step 1: Write the README**

Create `packages/nestjs/README.md`:

```markdown
# @usepingback/nestjs

NestJS adapter for [Pingback](https://pingback.lol) — reliable cron jobs and background tasks.

## Installation

```bash
npm install @usepingback/nestjs
```

## Setup

### 1. Import the module

```typescript
// app.module.ts
import { PingbackModule } from '@usepingback/nestjs';

@Module({
  imports: [
    PingbackModule.register({
      apiKey: process.env.PINGBACK_API_KEY,
      cronSecret: process.env.PINGBACK_CRON_SECRET,
      baseUrl: process.env.APP_URL, // e.g. https://myapi.com
    }),
  ],
})
export class AppModule {}
```

### 2. Define functions

```typescript
// jobs/email.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, Task, PingbackContext } from '@usepingback/nestjs';

@Injectable()
export class EmailService {
  constructor(private mailer: MailerService) {}

  @Cron('send-emails', '*/15 * * * *', { retries: 3, timeout: '60s' })
  async sendEmails(ctx: PingbackContext) {
    const pending = await this.getPending();
    for (const email of pending) {
      ctx.task('send-email', { id: email.id });
    }
    ctx.log('Dispatched emails', { count: pending.length });
  }

  @Task('send-email', { retries: 2, timeout: '15s' })
  async sendEmail(ctx: PingbackContext, payload: { id: string }) {
    await this.mailer.send(payload.id);
    ctx.log('Sent email', { id: payload.id });
  }
}
```

### 3. Set environment variables

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
  apiKey: string;          // Required — Pingback API key
  cronSecret: string;      // Required — HMAC signing secret
  baseUrl?: string;        // Your app's public URL
  routePath?: string;      // Endpoint path (default: /api/pingback)
  platformUrl?: string;    // Pingback API (default: https://api.pingback.lol)
})
```

## How It Works

1. On app startup, `PingbackModule` scans all providers for `@Cron` and `@Task` decorators
2. Collects function metadata and registers them with the Pingback platform
3. Auto-registers a POST endpoint at `/api/pingback`
4. The platform sends signed execution requests to your endpoint
5. The controller verifies the HMAC signature, executes the handler, and returns results

## Cron Expressions

| Expression | Description |
|-----------|-------------|
| `* * * * *` | Every minute |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Daily at 9 AM UTC |
| `0 9 * * 1` | Every Monday at 9 AM UTC |
| `0 0 1 * *` | First of every month |
```

- [ ] **Step 2: Commit**

```bash
git add packages/nestjs/README.md
git commit -m "docs: add @usepingback/nestjs README"
```

---

### Task 7: Copy LICENSE and final verification

**Files:**
- Create: `packages/nestjs/LICENSE`

- [ ] **Step 1: Copy LICENSE from root**

Run: `cp LICENSE packages/nestjs/LICENSE`

- [ ] **Step 2: Full build and test**

Run: `cd packages/nestjs && npx tsc && npx jest --no-cache`
Expected: Build succeeds and all tests pass

- [ ] **Step 3: Add .gitignore for dist**

Create `packages/nestjs/.gitignore`:

```
dist/
```

- [ ] **Step 4: Final commit**

```bash
git add packages/nestjs/LICENSE packages/nestjs/.gitignore
git commit -m "chore: add LICENSE and .gitignore to @usepingback/nestjs"
```
