# Pingback Platform & SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pingback platform (scheduler, API, worker) and SDK (`@pingback/core`, `@pingback/next`) so developers can define cron functions in their Next.js code and have Pingback execute them reliably.

**Architecture:** npm workspaces monorepo. NestJS platform app (API + scheduler) and separate NestJS worker app consume from a Redis/BullMQ queue. The SDK is split into a framework-agnostic core and a Next.js adapter with a build plugin that auto-generates a route handler.

**Tech Stack:** TypeScript, NestJS, TypeORM, PostgreSQL, Redis, BullMQ, Next.js 15, cron-parser, bcrypt, Resend

**Spec:** `docs/superpowers/specs/2026-04-14-platform-and-sdk-design.md`

---

## File Structure

```
pingback/
├── package.json
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── registry.ts
│   │   │   ├── context.ts
│   │   │   ├── signing.ts
│   │   │   └── registration.ts
│   │   └── tests/
│   │       ├── registry.test.ts
│   │       ├── context.test.ts
│   │       ├── signing.test.ts
│   │       └── registration.test.ts
│   └── next/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── plugin.ts
│       │   └── handler.ts
│       └── tests/
│           ├── handler.test.ts
│           └── plugin.test.ts
├── shared/
│   └── types/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
├── apps/
│   ├── platform/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   ├── common/
│   │   │   │   ├── guards/
│   │   │   │   │   └── auth.guard.ts
│   │   │   │   ├── decorators/
│   │   │   │   │   └── current-user.decorator.ts
│   │   │   │   └── encryption.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   │   └── github.strategy.ts
│   │   │   │   │   └── api-key.guard.ts
│   │   │   │   ├── projects/
│   │   │   │   │   ├── projects.module.ts
│   │   │   │   │   ├── projects.controller.ts
│   │   │   │   │   ├── projects.service.ts
│   │   │   │   │   └── project.entity.ts
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── jobs.module.ts
│   │   │   │   │   ├── jobs.controller.ts
│   │   │   │   │   ├── jobs.service.ts
│   │   │   │   │   └── job.entity.ts
│   │   │   │   ├── executions/
│   │   │   │   │   ├── executions.module.ts
│   │   │   │   │   ├── executions.controller.ts
│   │   │   │   │   ├── executions.service.ts
│   │   │   │   │   └── execution.entity.ts
│   │   │   │   ├── api-keys/
│   │   │   │   │   ├── api-keys.module.ts
│   │   │   │   │   ├── api-keys.controller.ts
│   │   │   │   │   ├── api-keys.service.ts
│   │   │   │   │   └── api-key.entity.ts
│   │   │   │   ├── registration/
│   │   │   │   │   ├── registration.module.ts
│   │   │   │   │   ├── registration.controller.ts
│   │   │   │   │   └── registration.service.ts
│   │   │   │   ├── scheduler/
│   │   │   │   │   ├── scheduler.module.ts
│   │   │   │   │   └── scheduler.service.ts
│   │   │   │   └── alerts/
│   │   │   │       ├── alerts.module.ts
│   │   │   │       ├── alerts.controller.ts
│   │   │   │       ├── alerts.service.ts
│   │   │   │       └── alert.entity.ts
│   │   │   └── entities/
│   │   │       └── user.entity.ts
│   │   └── test/
│   │       ├── auth.e2e-spec.ts
│   │       ├── projects.e2e-spec.ts
│   │       ├── api-keys.e2e-spec.ts
│   │       ├── jobs.e2e-spec.ts
│   │       ├── executions.e2e-spec.ts
│   │       ├── registration.e2e-spec.ts
│   │       ├── scheduler.e2e-spec.ts
│   │       └── alerts.e2e-spec.ts
│   ├── worker/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── dispatcher.service.ts
│   │   │   └── signer.ts
│   │   └── test/
│   │       ├── dispatcher.e2e-spec.ts
│   │       └── signer.test.ts
│   └── dashboard/                    # stubbed, not implemented in this plan
│       ├── package.json
│       └── tsconfig.json
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `shared/types/package.json`
- Create: `shared/types/tsconfig.json`
- Create: `shared/types/src/index.ts`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/cirx/Desktop/projects/personal/pingback
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "pingback",
  "private": true,
  "workspaces": [
    "packages/*",
    "shared/*",
    "apps/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
*.js.map
*.d.ts
!shared/types/src/**/*.d.ts
coverage/
.turbo/
```

- [ ] **Step 5: Create .env.example**

```bash
# Platform (apps/platform)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pingback
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-byte-hex-encryption-key-here
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
RESEND_API_KEY=your-resend-api-key
DASHBOARD_URL=http://localhost:3000

# Worker (apps/worker)
# DATABASE_URL and REDIS_URL same as above
# RESEND_API_KEY same as above

# Dashboard (apps/dashboard)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

- [ ] **Step 6: Create shared/types package**

`shared/types/package.json`:
```json
{
  "name": "@pingback/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

`shared/types/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`shared/types/src/index.ts`:
```ts
export enum JobStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  INACTIVE = 'inactive',
}

export enum JobSource {
  SDK = 'sdk',
  MANUAL = 'manual',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export enum AlertChannel {
  EMAIL = 'email',
}

export enum AlertTriggerType {
  CONSECUTIVE_FAILURES = 'consecutive_failures',
  DURATION_EXCEEDED = 'duration_exceeded',
  MISSED_RUN = 'missed_run',
}

export interface QueueMessage {
  executionId: string;
  jobId: string;
  projectId: string;
  functionName: string;
  endpointUrl: string;
  cronSecret: string;
  attempt: number;
  maxRetries: number;
  timeoutSeconds: number;
  scheduledAt: string;
}

export interface ExecutionResponse {
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  logs: Array<{ timestamp: number; message: string }>;
  durationMs: number;
}
```

- [ ] **Step 7: Verify workspace setup**

Run: `npm install`
Expected: no errors, node_modules created

- [ ] **Step 8: Build shared types**

Run: `npm run build --workspace=shared/types`
Expected: `shared/types/dist/index.js` and `shared/types/dist/index.d.ts` created

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.base.json .gitignore .env.example shared/
git commit -m "chore: scaffold monorepo with npm workspaces and shared types"
```

---

## Task 2: @pingback/core — Types & Registry

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/registry.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/tests/registry.test.ts`

- [ ] **Step 1: Create core package scaffolding**

`packages/core/package.json`:
```json
{
  "name": "@pingback/core",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "@types/jest": "^29.5.0",
    "typescript": "^5.5.0"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Create `packages/core/jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
```

- [ ] **Step 2: Create types**

`packages/core/src/types.ts`:
```ts
export interface FunctionOptions {
  retries?: number;
  timeout?: string;
  concurrency?: number;
}

export interface FunctionDefinition {
  name: string;
  type: 'cron' | 'task';
  schedule?: string;
  handler: (ctx: Context, payload?: any) => Promise<unknown>;
  options: FunctionOptions;
}

export interface LogEntry {
  timestamp: number;
  message: string;
}

export interface Context {
  executionId: string;
  attempt: number;
  scheduledAt: Date;
  log(message: string): void;
  task(name: string, payload: any): Promise<void>;
}

export interface ExecutionPayload {
  function: string;
  executionId: string;
  attempt: number;
  scheduledAt: string;
}

export interface ExecutionResult {
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  logs: LogEntry[];
  durationMs: number;
}
```

- [ ] **Step 3: Write failing test for registry**

`packages/core/tests/registry.test.ts`:
```ts
import { Registry } from '../src/registry';

describe('Registry', () => {
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  test('registers a cron function', () => {
    const handler = async () => ({ done: true });
    registry.cron('my-job', '*/15 * * * *', handler, { retries: 3 });

    const fn = registry.get('my-job');
    expect(fn).toBeDefined();
    expect(fn!.name).toBe('my-job');
    expect(fn!.type).toBe('cron');
    expect(fn!.schedule).toBe('*/15 * * * *');
    expect(fn!.options.retries).toBe(3);
  });

  test('registers a task function', () => {
    const handler = async () => ({ sent: true });
    registry.task('send-email', handler, { retries: 2, timeout: '15s' });

    const fn = registry.get('send-email');
    expect(fn).toBeDefined();
    expect(fn!.name).toBe('send-email');
    expect(fn!.type).toBe('task');
    expect(fn!.schedule).toBeUndefined();
  });

  test('returns undefined for unregistered function', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  test('lists all registered functions', () => {
    registry.cron('job-a', '* * * * *', async () => {});
    registry.task('task-b', async () => {});

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all.map(f => f.name).sort()).toEqual(['job-a', 'task-b']);
  });

  test('overwrites function with same name', () => {
    registry.cron('my-job', '*/5 * * * *', async () => {});
    registry.cron('my-job', '*/10 * * * *', async () => {});

    const fn = registry.get('my-job');
    expect(fn!.schedule).toBe('*/10 * * * *');
    expect(registry.getAll()).toHaveLength(1);
  });

  test('getMetadata returns definitions without handlers', () => {
    registry.cron('my-job', '*/15 * * * *', async () => {}, { retries: 3, timeout: '60s', concurrency: 1 });

    const meta = registry.getMetadata();
    expect(meta).toHaveLength(1);
    expect(meta[0]).toEqual({
      name: 'my-job',
      type: 'cron',
      schedule: '*/15 * * * *',
      options: { retries: 3, timeout: '60s', concurrency: 1 },
    });
    expect((meta[0] as any).handler).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd packages/core && npx jest tests/registry.test.ts`
Expected: FAIL — cannot find `../src/registry`

- [ ] **Step 5: Implement registry**

`packages/core/src/registry.ts`:
```ts
import { FunctionDefinition, FunctionOptions } from './types';

export class Registry {
  private functions = new Map<string, FunctionDefinition>();

  cron(
    name: string,
    schedule: string,
    handler: FunctionDefinition['handler'],
    options: FunctionOptions = {},
  ): { name: string; type: 'cron' } {
    this.functions.set(name, { name, type: 'cron', schedule, handler, options });
    return { name, type: 'cron' };
  }

  task(
    name: string,
    handler: FunctionDefinition['handler'],
    options: FunctionOptions = {},
  ): { name: string; type: 'task' } {
    this.functions.set(name, { name, type: 'task', handler, options });
    return { name, type: 'task' };
  }

  get(name: string): FunctionDefinition | undefined {
    return this.functions.get(name);
  }

  getAll(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  getMetadata(): Array<Omit<FunctionDefinition, 'handler'>> {
    return this.getAll().map(({ handler, ...rest }) => rest);
  }
}
```

- [ ] **Step 6: Create index.ts**

`packages/core/src/index.ts`:
```ts
export { Registry } from './registry';
export type {
  FunctionDefinition,
  FunctionOptions,
  Context,
  LogEntry,
  ExecutionPayload,
  ExecutionResult,
} from './types';
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd packages/core && npx jest tests/registry.test.ts`
Expected: all 6 tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/core/
git commit -m "feat(core): add function registry with cron/task registration"
```

---

## Task 3: @pingback/core — Context Object

**Files:**
- Create: `packages/core/src/context.ts`
- Create: `packages/core/tests/context.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing test**

`packages/core/tests/context.test.ts`:
```ts
import { createContext } from '../src/context';

describe('createContext', () => {
  const payload = {
    function: 'my-job',
    executionId: 'exec_123',
    attempt: 1,
    scheduledAt: '2026-04-14T10:30:00Z',
  };

  test('creates context with correct fields', () => {
    const ctx = createContext(payload);
    expect(ctx.executionId).toBe('exec_123');
    expect(ctx.attempt).toBe(1);
    expect(ctx.scheduledAt).toEqual(new Date('2026-04-14T10:30:00Z'));
  });

  test('ctx.log() collects log entries', () => {
    const ctx = createContext(payload);
    ctx.log('Starting');
    ctx.log('Done');

    const logs = ctx._getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe('Starting');
    expect(logs[1].message).toBe('Done');
    expect(typeof logs[0].timestamp).toBe('number');
  });

  test('ctx.task() throws with post-MVP message', async () => {
    const ctx = createContext(payload);
    await expect(ctx.task('sub-task', { id: 1 })).rejects.toThrow(
      'ctx.task() is not available',
    );
  });

  test('logs start empty', () => {
    const ctx = createContext(payload);
    expect(ctx._getLogs()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx jest tests/context.test.ts`
Expected: FAIL — cannot find `../src/context`

- [ ] **Step 3: Implement context**

`packages/core/src/context.ts`:
```ts
import { Context, LogEntry, ExecutionPayload } from './types';

export interface ContextWithLogs extends Context {
  _getLogs(): LogEntry[];
}

export function createContext(payload: ExecutionPayload): ContextWithLogs {
  const logs: LogEntry[] = [];

  return {
    executionId: payload.executionId,
    attempt: payload.attempt,
    scheduledAt: new Date(payload.scheduledAt),

    log(message: string): void {
      logs.push({ timestamp: Date.now(), message });
    },

    async task(_name: string, _payload: any): Promise<void> {
      throw new Error(
        'ctx.task() is not available in the current plan. Upgrade to Pro for fan-out tasks.',
      );
    },

    _getLogs(): LogEntry[] {
      return logs;
    },
  };
}
```

- [ ] **Step 4: Update index.ts**

Add to `packages/core/src/index.ts`:
```ts
export { createContext } from './context';
export type { ContextWithLogs } from './context';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && npx jest tests/context.test.ts`
Expected: all 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/context.ts packages/core/tests/context.test.ts packages/core/src/index.ts
git commit -m "feat(core): add execution context with log collection and task stub"
```

---

## Task 4: @pingback/core — HMAC Signing & Verification

**Files:**
- Create: `packages/core/src/signing.ts`
- Create: `packages/core/tests/signing.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing test**

`packages/core/tests/signing.test.ts`:
```ts
import { signPayload, verifySignature } from '../src/signing';

describe('signing', () => {
  const secret = 'test-secret-key-256-bits-long-ok';
  const payload = {
    function: 'my-job',
    executionId: 'exec_123',
    attempt: 1,
    scheduledAt: '2026-04-14T10:30:00Z',
  };

  test('signPayload returns a hex string', () => {
    const signature = signPayload(payload, secret);
    expect(typeof signature).toBe('string');
    expect(signature).toMatch(/^[a-f0-9]+$/);
  });

  test('verifySignature returns true for valid signature', () => {
    const now = Date.now();
    const signature = signPayload(payload, secret);
    expect(verifySignature(payload, signature, now, secret)).toBe(true);
  });

  test('verifySignature returns false for wrong signature', () => {
    const now = Date.now();
    expect(verifySignature(payload, 'bad-signature', now, secret)).toBe(false);
  });

  test('verifySignature returns false for wrong secret', () => {
    const now = Date.now();
    const signature = signPayload(payload, secret);
    expect(verifySignature(payload, signature, now, 'wrong-secret')).toBe(false);
  });

  test('verifySignature returns false for expired timestamp (>5 min)', () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 - 1;
    const signature = signPayload(payload, secret);
    expect(verifySignature(payload, signature, fiveMinutesAgo, secret)).toBe(false);
  });

  test('verifySignature returns true for timestamp within 5 min', () => {
    const fourMinutesAgo = Date.now() - 4 * 60 * 1000;
    const signature = signPayload(payload, secret);
    expect(verifySignature(payload, signature, fourMinutesAgo, secret)).toBe(true);
  });

  test('different payloads produce different signatures', () => {
    const sig1 = signPayload(payload, secret);
    const sig2 = signPayload({ ...payload, attempt: 2 }, secret);
    expect(sig1).not.toBe(sig2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx jest tests/signing.test.ts`
Expected: FAIL — cannot find `../src/signing`

- [ ] **Step 3: Implement signing**

`packages/core/src/signing.ts`:
```ts
import { createHmac, timingSafeEqual } from 'crypto';

export function signPayload(payload: Record<string, unknown>, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export function verifySignature(
  payload: Record<string, unknown>,
  signature: string,
  timestamp: number,
  secret: string,
): boolean {
  const age = Date.now() - timestamp;
  if (age > 5 * 60 * 1000) {
    return false;
  }

  const expected = signPayload(payload, secret);

  if (expected.length !== signature.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Update index.ts**

Add to `packages/core/src/index.ts`:
```ts
export { signPayload, verifySignature } from './signing';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && npx jest tests/signing.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/signing.ts packages/core/tests/signing.test.ts packages/core/src/index.ts
git commit -m "feat(core): add HMAC-SHA256 signing and verification with replay protection"
```

---

## Task 5: @pingback/core — Registration Client

**Files:**
- Create: `packages/core/src/registration.ts`
- Create: `packages/core/tests/registration.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing test**

`packages/core/tests/registration.test.ts`:
```ts
import { RegistrationClient } from '../src/registration';

describe('RegistrationClient', () => {
  let client: RegistrationClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    client = new RegistrationClient('https://api.pingback.dev', 'pk_test_key');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('sends registration request with correct payload', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [] }),
    });

    await client.register('proj_123', [
      {
        name: 'send-emails',
        type: 'cron' as const,
        schedule: '*/15 * * * *',
        options: { retries: 3, timeout: '60s', concurrency: 1 },
      },
    ]);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.pingback.dev/api/v1/register',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer pk_test_key',
        },
        body: JSON.stringify({
          project_id: 'proj_123',
          functions: [
            {
              name: 'send-emails',
              type: 'cron',
              schedule: '*/15 * * * *',
              options: { retries: 3, timeout: '60s', concurrency: 1 },
            },
          ],
        }),
      },
    );
  });

  test('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(
      client.register('proj_123', []),
    ).rejects.toThrow('Registration failed (401): Unauthorized');
  });

  test('returns response data on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [{ name: 'send-emails', status: 'active' }] }),
    });

    const result = await client.register('proj_123', [
      { name: 'send-emails', type: 'cron' as const, schedule: '* * * * *', options: {} },
    ]);

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].name).toBe('send-emails');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/core && npx jest tests/registration.test.ts`
Expected: FAIL — cannot find `../src/registration`

- [ ] **Step 3: Implement registration client**

`packages/core/src/registration.ts`:
```ts
import { FunctionOptions } from './types';

export interface FunctionMetadata {
  name: string;
  type: 'cron' | 'task';
  schedule?: string;
  options: FunctionOptions;
}

export interface RegistrationResponse {
  jobs: Array<{ name: string; status: string }>;
}

export class RegistrationClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async register(
    projectId: string,
    functions: FunctionMetadata[],
  ): Promise<RegistrationResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        functions,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Registration failed (${response.status}): ${text}`);
    }

    return response.json();
  }
}
```

- [ ] **Step 4: Update index.ts**

Add to `packages/core/src/index.ts`:
```ts
export { RegistrationClient } from './registration';
export type { FunctionMetadata, RegistrationResponse } from './registration';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/core && npx jest tests/registration.test.ts`
Expected: all 3 tests PASS

- [ ] **Step 6: Run all core tests**

Run: `cd packages/core && npx jest`
Expected: all tests PASS (registry: 6, context: 4, signing: 7, registration: 3 = 20 total)

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/registration.ts packages/core/tests/registration.test.ts packages/core/src/index.ts
git commit -m "feat(core): add registration client for SDK-to-platform communication"
```

---

## Task 6: Platform App Scaffolding + TypeORM Entities

**Files:**
- Create: `apps/platform/package.json`
- Create: `apps/platform/tsconfig.json`
- Create: `apps/platform/nest-cli.json`
- Create: `apps/platform/src/main.ts`
- Create: `apps/platform/src/app.module.ts`
- Create: `apps/platform/src/config/configuration.ts`
- Create: `apps/platform/src/entities/user.entity.ts`
- Create: `apps/platform/src/modules/projects/project.entity.ts`
- Create: `apps/platform/src/modules/api-keys/api-key.entity.ts`
- Create: `apps/platform/src/modules/jobs/job.entity.ts`
- Create: `apps/platform/src/modules/executions/execution.entity.ts`
- Create: `apps/platform/src/modules/alerts/alert.entity.ts`

- [ ] **Step 1: Create platform package.json**

`apps/platform/package.json`:
```json
{
  "name": "@pingback/platform",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/bullmq": "^10.2.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.0",
    "passport-github2": "^0.1.12",
    "typeorm": "^0.3.20",
    "pg": "^8.12.0",
    "bullmq": "^5.12.0",
    "ioredis": "^5.4.0",
    "bcrypt": "^5.1.0",
    "cron-parser": "^4.9.0",
    "resend": "^4.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.4.0",
    "@types/bcrypt": "^5.0.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/passport-github2": "^1.2.0",
    "@types/express": "^4.17.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.5.0",
    "ts-node": "^10.9.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json and nest-cli.json**

`apps/platform/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

`apps/platform/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

Create `apps/platform/jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

- [ ] **Step 3: Create configuration**

`apps/platform/src/config/configuration.ts`:
```ts
export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
});
```

- [ ] **Step 4: Create encryption utility**

`apps/platform/src/common/encryption.ts`:
```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

- [ ] **Step 5: Create User entity**

`apps/platform/src/entities/user.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'text', nullable: true, unique: true, name: 'github_id' })
  githubId: string;

  @Column({ type: 'text', nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 6: Create Project entity**

`apps/platform/src/modules/projects/project.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../entities/user.entity';

@Entity('projects')
@Unique(['userId', 'name'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  domain: string;

  @Column({ type: 'text', name: 'cron_secret' })
  cronSecret: string;

  @Column({ type: 'text', name: 'endpoint_url' })
  endpointUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 7: Create ApiKey entity**

`apps/platform/src/modules/api-keys/api-key.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'text' })
  name: string;

  @Index()
  @Column({ type: 'text', name: 'key_hash' })
  keyHash: string;

  @Column({ type: 'text', name: 'key_prefix' })
  keyPrefix: string;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 8: Create Job entity**

`apps/platform/src/modules/jobs/job.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('jobs')
@Unique(['projectId', 'name'])
@Index(['status', 'nextRunAt'])
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  schedule: string;

  @Column({ type: 'enum', enum: ['active', 'paused', 'inactive'], default: 'active' })
  status: 'active' | 'paused' | 'inactive';

  @Column({ type: 'timestamp', nullable: true, name: 'next_run_at' })
  nextRunAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'last_run_at' })
  lastRunAt: Date;

  @Column({ type: 'int', default: 0 })
  retries: number;

  @Column({ type: 'int', default: 30, name: 'timeout_seconds' })
  timeoutSeconds: number;

  @Column({ type: 'int', default: 1 })
  concurrency: number;

  @Column({ type: 'enum', enum: ['sdk', 'manual'], default: 'sdk' })
  source: 'sdk' | 'manual';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 9: Create Execution entity**

`apps/platform/src/modules/executions/execution.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Job } from '../jobs/job.entity';

@Entity('executions')
@Index(['jobId', 'createdAt'])
@Index(['status'])
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'enum', enum: ['pending', 'running', 'success', 'failed'], default: 'pending' })
  status: 'pending' | 'running' | 'success' | 'failed';

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'timestamp', name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'int', nullable: true, name: 'http_status' })
  httpStatus: number;

  @Column({ type: 'text', nullable: true, name: 'response_body' })
  responseBody: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'jsonb', default: '[]' })
  logs: Array<{ timestamp: number; message: string }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 10: Create Alert entity**

`apps/platform/src/modules/alerts/alert.entity.ts`:
```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { Job } from '../jobs/job.entity';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ type: 'uuid', nullable: true, name: 'job_id' })
  jobId: string;

  @ManyToOne(() => Job, { nullable: true })
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @Column({ type: 'enum', enum: ['email'], default: 'email' })
  channel: 'email';

  @Column({ type: 'text' })
  target: string;

  @Column({ type: 'enum', enum: ['consecutive_failures', 'duration_exceeded', 'missed_run'], name: 'trigger_type' })
  triggerType: 'consecutive_failures' | 'duration_exceeded' | 'missed_run';

  @Column({ type: 'int', name: 'trigger_value' })
  triggerValue: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_fired_at' })
  lastFiredAt: Date;

  @Column({ type: 'int', default: 3600, name: 'cooldown_seconds' })
  cooldownSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 11: Create AppModule**

`apps/platform/src/app.module.ts`:
```ts
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
        synchronize: true, // dev only — replace with migrations before production
      }),
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 12: Create main.ts**

`apps/platform/src/main.ts`:
```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.DASHBOARD_URL, credentials: true });
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
```

- [ ] **Step 13: Install dependencies and verify build**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback && npm install`
Run: `npm run build --workspace=apps/platform`
Expected: compiles without errors

- [ ] **Step 14: Commit**

```bash
git add apps/platform/
git commit -m "feat(platform): scaffold NestJS app with TypeORM entities for all tables"
```

---

## Task 7: Auth Module — JWT + Email/Password

**Files:**
- Create: `apps/platform/src/modules/auth/auth.module.ts`
- Create: `apps/platform/src/modules/auth/auth.controller.ts`
- Create: `apps/platform/src/modules/auth/auth.service.ts`
- Create: `apps/platform/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/platform/src/modules/auth/api-key.guard.ts`
- Create: `apps/platform/src/common/guards/auth.guard.ts`
- Create: `apps/platform/src/common/decorators/current-user.decorator.ts`
- Create: `apps/platform/test/auth.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/auth.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates a new user and returns JWT cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'StrongPass123!', name: 'Test User' })
        .expect(201);

      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.id).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('token=');
    });

    it('rejects duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dupe@example.com', password: 'StrongPass123!', name: 'User' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dupe@example.com', password: 'StrongPass123!', name: 'User2' })
        .expect(409);
    });

    it('rejects missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'StrongPass123!' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns JWT cookie for valid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'login@example.com', password: 'StrongPass123!', name: 'Login User' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'StrongPass123!' })
        .expect(200);

      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');
    });

    it('rejects wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPass!' })
        .expect(401);
    });

    it('rejects unknown email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'unknown@example.com', password: 'StrongPass123!' })
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('clears the JWT cookie', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'logout@example.com', password: 'StrongPass123!', name: 'Logout' });

      const cookie = registerRes.headers['set-cookie'][0];

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      expect(res.headers['set-cookie'][0]).toContain('token=;');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/auth.e2e-spec.ts`
Expected: FAIL — routes do not exist

- [ ] **Step 3: Create auth DTOs**

`apps/platform/src/modules/auth/dto.ts`:
```ts
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
```

- [ ] **Step 4: Create AuthService**

`apps/platform/src/modules/auth/auth.service.ts`:
```ts
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name?: string): Promise<{ user: User; token: string }> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ email, passwordHash, name });
    await this.userRepo.save(user);

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { user, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { user, token };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findOrCreateGithubUser(profile: {
    githubId: string;
    email: string;
    name: string;
    avatarUrl: string;
  }): Promise<{ user: User; token: string }> {
    let user = await this.userRepo.findOne({ where: { githubId: profile.githubId } });

    if (!user) {
      user = await this.userRepo.findOne({ where: { email: profile.email } });
      if (user) {
        user.githubId = profile.githubId;
        user.avatarUrl = profile.avatarUrl;
        await this.userRepo.save(user);
      } else {
        user = this.userRepo.create({
          email: profile.email,
          name: profile.name,
          githubId: profile.githubId,
          avatarUrl: profile.avatarUrl,
        });
        await this.userRepo.save(user);
      }
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { user, token };
  }
}
```

- [ ] **Step 5: Create JWT strategy**

`apps/platform/src/modules/auth/strategies/jwt.strategy.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

function extractFromCookie(req: Request): string | null {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.get('jwt.secret'),
    });
  }

  async validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 6: Create ApiKey guard**

`apps/platform/src/modules/auth/api-key.guard.ts`:
```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ApiKey } from '../api-keys/api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const rawKey = authHeader.slice(7);
    const keys = await this.apiKeyRepo.find({
      where: { keyPrefix: rawKey.slice(0, 8) },
      relations: ['project'],
    });

    for (const key of keys) {
      const match = await bcrypt.compare(rawKey, key.keyHash);
      if (match) {
        key.lastUsedAt = new Date();
        await this.apiKeyRepo.save(key);
        request.project = key.project;
        request.apiKey = key;
        return true;
      }
    }

    return false;
  }
}
```

- [ ] **Step 7: Create combined auth guard**

`apps/platform/src/common/guards/auth.guard.ts`:
```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { ApiKeyGuard } from '../../modules/auth/api-key.guard';

@Injectable()
export class CombinedAuthGuard implements CanActivate {
  constructor(private readonly apiKeyGuard: ApiKeyGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Try API key first (Bearer token that isn't a JWT)
    if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.includes('.')) {
      return this.apiKeyGuard.canActivate(context);
    }

    // Fall back to JWT (cookie or Authorization header)
    const jwtGuard = new (PassportAuthGuard('jwt'))();
    try {
      return (await jwtGuard.canActivate(context)) as boolean;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 8: Create CurrentUser decorator**

`apps/platform/src/common/decorators/current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentProject = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.project;
  },
);
```

- [ ] **Step 9: Create AuthController**

`apps/platform/src/modules/auth/auth.controller.ts`:
```ts
import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.register(dto.email, dto.password, dto.name);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(dto.email, dto.password);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token');
    return { ok: true };
  }
}
```

- [ ] **Step 10: Create GitHub OAuth strategy**

`apps/platform/src/modules/auth/strategies/github.strategy.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.get('github.clientId'),
      clientSecret: config.get('github.clientSecret'),
      callbackURL: `${config.get('dashboardUrl')}/api/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const email = profile.emails?.[0]?.value;
    const { user, token } = await this.authService.findOrCreateGithubUser({
      githubId: profile.id,
      email,
      name: profile.displayName || profile.username,
      avatarUrl: profile.photos?.[0]?.value,
    });
    return { user, token };
  }
}
```

Add GitHub OAuth routes to `AuthController`:
```ts
@Get('github')
@UseGuards(AuthGuard('github'))
async githubAuth() {
  // Passport redirects to GitHub
}

@Get('github/callback')
@UseGuards(AuthGuard('github'))
async githubCallback(@Req() req: any, @Res({ passthrough: true }) res: Response) {
  const { token } = req.user;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect(process.env.DASHBOARD_URL || '/');
}
```

- [ ] **Step 11: Create AuthModule**

`apps/platform/src/modules/auth/auth.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { ApiKey } from '../api-keys/api-key.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GithubStrategy, ApiKeyGuard],
  exports: [AuthService, ApiKeyGuard],
})
export class AuthModule {}
```

- [ ] **Step 12: Update AppModule to import AuthModule**

Add to `apps/platform/src/app.module.ts` imports array:
```ts
import { AuthModule } from './modules/auth/auth.module';

// In the @Module imports array, add:
AuthModule,
```

Also add `cookie-parser` middleware in `main.ts`:
```ts
import * as cookieParser from 'cookie-parser';

// After creating app:
app.use(cookieParser());
```

Add `cookie-parser` to platform dependencies:
```bash
cd apps/platform && npm install cookie-parser && npm install -D @types/cookie-parser
```

- [ ] **Step 13: Run e2e test (requires running Postgres)**

Run: `cd apps/platform && npx jest test/auth.e2e-spec.ts`
Expected: all 7 tests PASS

- [ ] **Step 14: Commit**

```bash
git add apps/platform/src/modules/auth/ apps/platform/src/common/ apps/platform/src/app.module.ts apps/platform/src/main.ts apps/platform/test/auth.e2e-spec.ts apps/platform/package.json
git commit -m "feat(platform): add auth module with JWT, email/password, and API key guard"
```

---

## Task 8: Projects Module

**Files:**
- Create: `apps/platform/src/modules/projects/projects.module.ts`
- Create: `apps/platform/src/modules/projects/projects.controller.ts`
- Create: `apps/platform/src/modules/projects/projects.service.ts`
- Create: `apps/platform/test/projects.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/projects.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let cookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'proj-test@example.com', password: 'StrongPass123!', name: 'Proj Test' });
    cookie = res.headers['set-cookie'][0];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/projects', () => {
    it('creates a project and returns cron_secret once', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ name: 'my-saas', endpointUrl: 'https://my-saas.vercel.app/api/__pingback' })
        .expect(201);

      expect(res.body.name).toBe('my-saas');
      expect(res.body.cronSecret).toBeDefined();
      expect(typeof res.body.cronSecret).toBe('string');
      expect(res.body.id).toBeDefined();
    });

    it('rejects duplicate project name for same user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ name: 'dupe-proj', endpointUrl: 'https://example.com/api/__pingback' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ name: 'dupe-proj', endpointUrl: 'https://example.com/api/__pingback' })
        .expect(409);
    });
  });

  describe('GET /api/v1/projects', () => {
    it('lists user projects', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Cookie', cookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      // cron_secret should NOT be in list response
      expect(res.body[0].cronSecret).toBeUndefined();
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('returns project detail without cron_secret', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ name: 'detail-proj', endpointUrl: 'https://example.com/api/__pingback' });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.name).toBe('detail-proj');
      expect(res.body.cronSecret).toBeUndefined();
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('updates project name', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ name: 'update-proj', endpointUrl: 'https://example.com/api/__pingback' });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${createRes.body.id}`)
        .set('Cookie', cookie)
        .send({ name: 'updated-proj' })
        .expect(200);

      expect(res.body.name).toBe('updated-proj');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('deletes the project', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Cookie', cookie)
        .send({ name: 'delete-proj', endpointUrl: 'https://example.com/api/__pingback' });

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/projects/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(404);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/projects.e2e-spec.ts`
Expected: FAIL — routes do not exist

- [ ] **Step 3: Create ProjectsService**

`apps/platform/src/modules/projects/projects.service.ts`:
```ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Project } from './project.entity';
import { encrypt } from '../../common/encryption';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly config: ConfigService,
  ) {}

  async create(userId: string, name: string, endpointUrl: string, domain?: string): Promise<Project & { rawSecret: string }> {
    const existing = await this.projectRepo.findOne({ where: { userId, name } });
    if (existing) {
      throw new ConflictException('Project with this name already exists');
    }

    const rawSecret = randomBytes(32).toString('hex');
    const encryptionKey = this.config.get<string>('encryption.key');
    const encryptedSecret = encrypt(rawSecret, encryptionKey);

    const project = this.projectRepo.create({
      userId,
      name,
      domain,
      cronSecret: encryptedSecret,
      endpointUrl,
    });
    await this.projectRepo.save(project);

    return Object.assign(project, { rawSecret });
  }

  async findAllByUser(userId: string): Promise<Project[]> {
    return this.projectRepo.find({ where: { userId } });
  }

  async findById(id: string, userId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id, userId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(id: string, userId: string, data: Partial<Pick<Project, 'name' | 'domain' | 'endpointUrl'>>): Promise<Project> {
    const project = await this.findById(id, userId);
    Object.assign(project, data);
    return this.projectRepo.save(project);
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.findById(id, userId);
    await this.projectRepo.remove(project);
  }
}
```

- [ ] **Step 4: Create ProjectsController**

`apps/platform/src/modules/projects/projects.controller.ts`:
```ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsUrl } from 'class-validator';

class CreateProjectDto {
  @IsString()
  name: string;

  @IsUrl()
  endpointUrl: string;

  @IsString()
  @IsOptional()
  domain?: string;
}

class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsUrl()
  @IsOptional()
  endpointUrl?: string;
}

@Controller('api/v1/projects')
@UseGuards(AuthGuard('jwt'))
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProjectDto,
  ) {
    const project = await this.projectsService.create(user.id, dto.name, dto.endpointUrl, dto.domain);
    return {
      id: project.id,
      name: project.name,
      domain: project.domain,
      endpointUrl: project.endpointUrl,
      cronSecret: project.rawSecret,
      createdAt: project.createdAt,
    };
  }

  @Get()
  async findAll(@CurrentUser() user: { id: string }) {
    const projects = await this.projectsService.findAllByUser(user.id);
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      domain: p.domain,
      endpointUrl: p.endpointUrl,
      createdAt: p.createdAt,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const project = await this.projectsService.findById(id, user.id);
    return {
      id: project.id,
      name: project.name,
      domain: project.domain,
      endpointUrl: project.endpointUrl,
      createdAt: project.createdAt,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(id, user.id, dto);
    return {
      id: project.id,
      name: project.name,
      domain: project.domain,
      endpointUrl: project.endpointUrl,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.projectsService.delete(id, user.id);
    return { ok: true };
  }
}
```

- [ ] **Step 5: Create ProjectsModule and wire into AppModule**

`apps/platform/src/modules/projects/projects.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

Add `ProjectsModule` to `AppModule` imports.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/projects.e2e-spec.ts`
Expected: all 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/platform/src/modules/projects/ apps/platform/src/app.module.ts apps/platform/test/projects.e2e-spec.ts
git commit -m "feat(platform): add projects CRUD with encrypted cron secrets"
```

---

## Task 9: API Keys Module

**Files:**
- Create: `apps/platform/src/modules/api-keys/api-keys.module.ts`
- Create: `apps/platform/src/modules/api-keys/api-keys.controller.ts`
- Create: `apps/platform/src/modules/api-keys/api-keys.service.ts`
- Create: `apps/platform/test/api-keys.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/api-keys.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('API Keys (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'apikey-test@example.com', password: 'StrongPass123!', name: 'Key Test' });
    cookie = authRes.headers['set-cookie'][0];

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookie)
      .send({ name: 'key-proj', endpointUrl: 'https://example.com/api/__pingback' });
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/projects/:id/keys', () => {
    it('creates API key and returns raw key once', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/keys`)
        .set('Cookie', cookie)
        .send({ name: 'production' })
        .expect(201);

      expect(res.body.rawKey).toBeDefined();
      expect(res.body.rawKey.length).toBeGreaterThan(20);
      expect(res.body.name).toBe('production');
      expect(res.body.keyPrefix).toBe(res.body.rawKey.slice(0, 8));
    });
  });

  describe('GET /api/v1/projects/:id/keys', () => {
    it('lists keys without raw key', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectId}/keys`)
        .set('Cookie', cookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].rawKey).toBeUndefined();
      expect(res.body[0].keyHash).toBeUndefined();
      expect(res.body[0].keyPrefix).toBeDefined();
      expect(res.body[0].name).toBeDefined();
    });
  });

  describe('API key authentication', () => {
    it('can authenticate API requests with the raw key', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/keys`)
        .set('Cookie', cookie)
        .send({ name: 'auth-test-key' });

      const rawKey = createRes.body.rawKey;

      // Use the API key to list projects
      const res = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${rawKey}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('DELETE /api/v1/projects/:id/keys/:keyId', () => {
    it('revokes the key', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectId}/keys`)
        .set('Cookie', cookie)
        .send({ name: 'to-delete' });

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectId}/keys/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(200);

      // Verify the key no longer works
      await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${createRes.body.rawKey}`)
        .expect(401);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/api-keys.e2e-spec.ts`
Expected: FAIL — routes do not exist

- [ ] **Step 3: Create ApiKeysService**

`apps/platform/src/modules/api-keys/api-keys.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { ApiKey } from './api-key.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async create(projectId: string, name: string): Promise<ApiKey & { rawKey: string }> {
    const rawKey = `pk_${randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);
    const keyPrefix = rawKey.slice(0, 8);

    const apiKey = this.apiKeyRepo.create({
      projectId,
      name,
      keyHash,
      keyPrefix,
    });
    await this.apiKeyRepo.save(apiKey);

    return Object.assign(apiKey, { rawKey });
  }

  async findAllByProject(projectId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({ where: { projectId } });
  }

  async delete(keyId: string, projectId: string): Promise<void> {
    const key = await this.apiKeyRepo.findOne({ where: { id: keyId, projectId } });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    await this.apiKeyRepo.remove(key);
  }
}
```

- [ ] **Step 4: Create ApiKeysController**

`apps/platform/src/modules/api-keys/api-keys.controller.ts`:
```ts
import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeysService } from './api-keys.service';
import { IsString } from 'class-validator';

class CreateApiKeyDto {
  @IsString()
  name: string;
}

@Controller('api/v1/projects/:projectId/keys')
@UseGuards(AuthGuard('jwt'))
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async create(@Param('projectId') projectId: string, @Body() dto: CreateApiKeyDto) {
    const key = await this.apiKeysService.create(projectId, dto.name);
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      rawKey: key.rawKey,
      createdAt: key.createdAt,
    };
  }

  @Get()
  async findAll(@Param('projectId') projectId: string) {
    const keys = await this.apiKeysService.findAllByProject(projectId);
    return keys.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  @Delete(':keyId')
  async remove(@Param('projectId') projectId: string, @Param('keyId') keyId: string) {
    await this.apiKeysService.delete(keyId, projectId);
    return { ok: true };
  }
}
```

- [ ] **Step 5: Create ApiKeysModule and wire into AppModule**

`apps/platform/src/modules/api-keys/api-keys.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './api-key.entity';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
```

Add `ApiKeysModule` to `AppModule` imports.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/api-keys.e2e-spec.ts`
Expected: all 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/platform/src/modules/api-keys/ apps/platform/src/app.module.ts apps/platform/test/api-keys.e2e-spec.ts
git commit -m "feat(platform): add API keys CRUD with bcrypt hashing"
```

---

## Task 10: Jobs Module

**Files:**
- Create: `apps/platform/src/modules/jobs/jobs.module.ts`
- Create: `apps/platform/src/modules/jobs/jobs.controller.ts`
- Create: `apps/platform/src/modules/jobs/jobs.service.ts`
- Create: `apps/platform/test/jobs.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/jobs.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Jobs (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'jobs-test@example.com', password: 'StrongPass123!', name: 'Jobs Test' });
    cookie = authRes.headers['set-cookie'][0];

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookie)
      .send({ name: 'jobs-proj', endpointUrl: 'https://example.com/api/__pingback' });
    projectId = projRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/jobs', () => {
    it('creates a manual job with next_run_at calculated', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Cookie', cookie)
        .send({
          projectId,
          name: 'manual-job',
          schedule: '*/15 * * * *',
          retries: 3,
          timeoutSeconds: 60,
        })
        .expect(201);

      expect(res.body.name).toBe('manual-job');
      expect(res.body.schedule).toBe('*/15 * * * *');
      expect(res.body.status).toBe('active');
      expect(res.body.source).toBe('manual');
      expect(res.body.nextRunAt).toBeDefined();
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('lists jobs filtered by project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/jobs?projectId=${projectId}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/v1/jobs/:id', () => {
    it('updates job schedule and recalculates next_run_at', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Cookie', cookie)
        .send({ projectId, name: 'update-job', schedule: '*/5 * * * *' });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/jobs/${createRes.body.id}`)
        .set('Cookie', cookie)
        .send({ schedule: '*/30 * * * *' })
        .expect(200);

      expect(res.body.schedule).toBe('*/30 * * * *');
    });
  });

  describe('POST /api/v1/jobs/:id/pause', () => {
    it('pauses the job', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Cookie', cookie)
        .send({ projectId, name: 'pause-job', schedule: '* * * * *' });

      const res = await request(app.getHttpServer())
        .post(`/api/v1/jobs/${createRes.body.id}/pause`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.status).toBe('paused');
    });
  });

  describe('POST /api/v1/jobs/:id/resume', () => {
    it('resumes a paused job and recalculates next_run_at', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Cookie', cookie)
        .send({ projectId, name: 'resume-job', schedule: '* * * * *' });

      await request(app.getHttpServer())
        .post(`/api/v1/jobs/${createRes.body.id}/pause`)
        .set('Cookie', cookie);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/jobs/${createRes.body.id}/resume`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.status).toBe('active');
      expect(res.body.nextRunAt).toBeDefined();
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('deletes the job', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/jobs')
        .set('Cookie', cookie)
        .send({ projectId, name: 'delete-job', schedule: '* * * * *' });

      await request(app.getHttpServer())
        .delete(`/api/v1/jobs/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/v1/jobs/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(404);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/jobs.e2e-spec.ts`
Expected: FAIL — routes do not exist

- [ ] **Step 3: Create JobsService**

`apps/platform/src/modules/jobs/jobs.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as cronParser from 'cron-parser';
import { Job } from './job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  private calculateNextRun(schedule: string): Date {
    const interval = cronParser.parseExpression(schedule);
    return interval.next().toDate();
  }

  async create(data: {
    projectId: string;
    name: string;
    schedule: string;
    source?: 'sdk' | 'manual';
    retries?: number;
    timeoutSeconds?: number;
    concurrency?: number;
  }): Promise<Job> {
    const nextRunAt = this.calculateNextRun(data.schedule);
    const job = this.jobRepo.create({
      projectId: data.projectId,
      name: data.name,
      schedule: data.schedule,
      source: data.source || 'manual',
      retries: data.retries ?? 0,
      timeoutSeconds: data.timeoutSeconds ?? 30,
      concurrency: data.concurrency ?? 1,
      nextRunAt,
    });
    return this.jobRepo.save(job);
  }

  async findAll(filters: { projectId?: string; status?: string }): Promise<Job[]> {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.status) where.status = filters.status;
    return this.jobRepo.find({ where });
  }

  async findById(id: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, data: Partial<Pick<Job, 'schedule' | 'retries' | 'timeoutSeconds' | 'concurrency'>>): Promise<Job> {
    const job = await this.findById(id);
    Object.assign(job, data);
    if (data.schedule) {
      job.nextRunAt = this.calculateNextRun(data.schedule);
    }
    return this.jobRepo.save(job);
  }

  async pause(id: string): Promise<Job> {
    const job = await this.findById(id);
    job.status = 'paused';
    job.nextRunAt = null;
    return this.jobRepo.save(job);
  }

  async resume(id: string): Promise<Job> {
    const job = await this.findById(id);
    job.status = 'active';
    job.nextRunAt = this.calculateNextRun(job.schedule);
    return this.jobRepo.save(job);
  }

  async delete(id: string): Promise<void> {
    const job = await this.findById(id);
    await this.jobRepo.remove(job);
  }
}
```

- [ ] **Step 4: Create JobsController**

`apps/platform/src/modules/jobs/jobs.controller.ts`:
```ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JobsService } from './jobs.service';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

class CreateJobDto {
  @IsString()
  projectId: string;

  @IsString()
  name: string;

  @IsString()
  schedule: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(10)
  retries?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(300)
  timeoutSeconds?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  concurrency?: number;
}

class UpdateJobDto {
  @IsString()
  @IsOptional()
  schedule?: string;

  @IsInt()
  @IsOptional()
  retries?: number;

  @IsInt()
  @IsOptional()
  timeoutSeconds?: number;

  @IsInt()
  @IsOptional()
  concurrency?: number;
}

@Controller('api/v1/jobs')
@UseGuards(AuthGuard('jwt'))
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() dto: CreateJobDto) {
    return this.jobsService.create({ ...dto, source: 'manual' });
  }

  @Get()
  async findAll(@Query('projectId') projectId?: string, @Query('status') status?: string) {
    return this.jobsService.findAll({ projectId, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.jobsService.findById(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, dto);
  }

  @Post(':id/pause')
  async pause(@Param('id') id: string) {
    return this.jobsService.pause(id);
  }

  @Post(':id/resume')
  async resume(@Param('id') id: string) {
    return this.jobsService.resume(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.jobsService.delete(id);
    return { ok: true };
  }
}
```

- [ ] **Step 5: Create JobsModule and wire into AppModule**

`apps/platform/src/modules/jobs/jobs.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job])],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
```

Add `JobsModule` to `AppModule` imports.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/jobs.e2e-spec.ts`
Expected: all 6 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/platform/src/modules/jobs/ apps/platform/src/app.module.ts apps/platform/test/jobs.e2e-spec.ts
git commit -m "feat(platform): add jobs CRUD with cron parsing and pause/resume"
```

---

## Task 11: Executions Module

**Files:**
- Create: `apps/platform/src/modules/executions/executions.module.ts`
- Create: `apps/platform/src/modules/executions/executions.controller.ts`
- Create: `apps/platform/src/modules/executions/executions.service.ts`
- Create: `apps/platform/test/executions.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/executions.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Execution } from '../src/modules/executions/execution.entity';

describe('Executions (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let jobId: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'exec-test@example.com', password: 'StrongPass123!', name: 'Exec Test' });
    cookie = authRes.headers['set-cookie'][0];

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookie)
      .send({ name: 'exec-proj', endpointUrl: 'https://example.com/api/__pingback' });

    const jobRes = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set('Cookie', cookie)
      .send({ projectId: projRes.body.id, name: 'exec-job', schedule: '* * * * *' });
    jobId = jobRes.body.id;

    // Seed some executions directly
    const execRepo = dataSource.getRepository(Execution);
    await execRepo.save([
      {
        jobId,
        status: 'success' as const,
        attempt: 1,
        scheduledAt: new Date('2026-04-14T10:00:00Z'),
        startedAt: new Date('2026-04-14T10:00:01Z'),
        completedAt: new Date('2026-04-14T10:00:03Z'),
        durationMs: 2000,
        httpStatus: 200,
        responseBody: '{"processed":5}',
        logs: [{ timestamp: 1713091200000, message: 'Done' }],
      },
      {
        jobId,
        status: 'failed' as const,
        attempt: 1,
        scheduledAt: new Date('2026-04-14T10:15:00Z'),
        startedAt: new Date('2026-04-14T10:15:01Z'),
        completedAt: new Date('2026-04-14T10:15:05Z'),
        durationMs: 4000,
        httpStatus: 500,
        errorMessage: 'Internal server error',
        logs: [],
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/jobs/:id/executions', () => {
    it('lists executions for a job, newest first', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/executions`)
        .set('Cookie', cookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Newest first
      expect(res.body[0].status).toBe('failed');
      expect(res.body[1].status).toBe('success');
    });
  });

  describe('GET /api/v1/executions/:id', () => {
    it('returns execution detail with logs', async () => {
      const listRes = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/executions`)
        .set('Cookie', cookie);

      const execId = listRes.body[1].id; // the success one
      const res = await request(app.getHttpServer())
        .get(`/api/v1/executions/${execId}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].message).toBe('Done');
      expect(res.body.durationMs).toBe(2000);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/executions.e2e-spec.ts`
Expected: FAIL — routes do not exist

- [ ] **Step 3: Create ExecutionsService**

`apps/platform/src/modules/executions/executions.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Execution } from './execution.entity';

@Injectable()
export class ExecutionsService {
  constructor(
    @InjectRepository(Execution)
    private readonly execRepo: Repository<Execution>,
  ) {}

  async findByJob(jobId: string, limit = 50, offset = 0): Promise<Execution[]> {
    return this.execRepo.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async findById(id: string): Promise<Execution> {
    const exec = await this.execRepo.findOne({ where: { id } });
    if (!exec) throw new NotFoundException('Execution not found');
    return exec;
  }

  async create(data: Partial<Execution>): Promise<Execution> {
    const exec = this.execRepo.create(data);
    return this.execRepo.save(exec);
  }

  async update(id: string, data: Partial<Execution>): Promise<Execution> {
    const exec = await this.findById(id);
    Object.assign(exec, data);
    return this.execRepo.save(exec);
  }

  async countActive(jobId: string): Promise<number> {
    return this.execRepo.count({
      where: [
        { jobId, status: 'pending' },
        { jobId, status: 'running' },
      ],
    });
  }
}
```

- [ ] **Step 4: Create ExecutionsController**

`apps/platform/src/modules/executions/executions.controller.ts`:
```ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionsService } from './executions.service';

@Controller('api/v1')
@UseGuards(AuthGuard('jwt'))
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get('jobs/:jobId/executions')
  async findByJob(
    @Param('jobId') jobId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.executionsService.findByJob(
      jobId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('executions/:id')
  async findOne(@Param('id') id: string) {
    return this.executionsService.findById(id);
  }
}
```

- [ ] **Step 5: Create ExecutionsModule and wire into AppModule**

`apps/platform/src/modules/executions/executions.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Execution } from './execution.entity';
import { ExecutionsController } from './executions.controller';
import { ExecutionsService } from './executions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Execution])],
  controllers: [ExecutionsController],
  providers: [ExecutionsService],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
```

Add `ExecutionsModule` to `AppModule` imports.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/executions.e2e-spec.ts`
Expected: all 2 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/platform/src/modules/executions/ apps/platform/src/app.module.ts apps/platform/test/executions.e2e-spec.ts
git commit -m "feat(platform): add executions module with listing and detail endpoints"
```

---

## Task 12: Registration Endpoint

**Files:**
- Create: `apps/platform/src/modules/registration/registration.module.ts`
- Create: `apps/platform/src/modules/registration/registration.controller.ts`
- Create: `apps/platform/src/modules/registration/registration.service.ts`
- Create: `apps/platform/test/registration.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/registration.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Registration (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let projectId: string;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'reg-test@example.com', password: 'StrongPass123!', name: 'Reg Test' });
    cookie = authRes.headers['set-cookie'][0];

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookie)
      .send({ name: 'reg-proj', endpointUrl: 'https://example.com/api/__pingback' });
    projectId = projRes.body.id;

    const keyRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/keys`)
      .set('Cookie', cookie)
      .send({ name: 'sdk-key' });
    apiKey = keyRes.body.rawKey;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/register', () => {
    it('registers new functions as jobs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/register')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          project_id: projectId,
          functions: [
            {
              name: 'send-emails',
              type: 'cron',
              schedule: '*/15 * * * *',
              options: { retries: 3, timeout: '60s', concurrency: 1 },
            },
            {
              name: 'sync-data',
              type: 'cron',
              schedule: '0 * * * *',
              options: {},
            },
          ],
        })
        .expect(200);

      expect(res.body.jobs).toHaveLength(2);
      expect(res.body.jobs.map((j: any) => j.name).sort()).toEqual(['send-emails', 'sync-data']);
      expect(res.body.jobs.every((j: any) => j.status === 'active')).toBe(true);
    });

    it('updates existing jobs on re-registration', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/register')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          project_id: projectId,
          functions: [
            {
              name: 'send-emails',
              type: 'cron',
              schedule: '*/5 * * * *',
              options: { retries: 5 },
            },
            {
              name: 'sync-data',
              type: 'cron',
              schedule: '0 * * * *',
              options: {},
            },
          ],
        })
        .expect(200);

      const sendEmails = res.body.jobs.find((j: any) => j.name === 'send-emails');
      expect(sendEmails.schedule).toBe('*/5 * * * *');
    });

    it('deactivates removed functions', async () => {
      // Register only send-emails, removing sync-data
      const res = await request(app.getHttpServer())
        .post('/api/v1/register')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          project_id: projectId,
          functions: [
            {
              name: 'send-emails',
              type: 'cron',
              schedule: '*/5 * * * *',
              options: {},
            },
          ],
        })
        .expect(200);

      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.jobs[0].name).toBe('send-emails');

      // Verify sync-data is now inactive
      const jobsRes = await request(app.getHttpServer())
        .get(`/api/v1/jobs?projectId=${projectId}&status=inactive`)
        .set('Cookie', cookie)
        .expect(200);

      expect(jobsRes.body.some((j: any) => j.name === 'sync-data')).toBe(true);
    });

    it('rejects unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/register')
        .send({ project_id: projectId, functions: [] })
        .expect(401);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/registration.e2e-spec.ts`
Expected: FAIL — route does not exist

- [ ] **Step 3: Create RegistrationService**

`apps/platform/src/modules/registration/registration.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import * as cronParser from 'cron-parser';
import { Job } from '../jobs/job.entity';

interface FunctionDef {
  name: string;
  type: 'cron' | 'task';
  schedule?: string;
  options: {
    retries?: number;
    timeout?: string;
    concurrency?: number;
  };
}

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
  ) {}

  private parseTimeout(timeout?: string): number {
    if (!timeout) return 30;
    const match = timeout.match(/^(\d+)s$/);
    return match ? parseInt(match[1], 10) : 30;
  }

  async register(projectId: string, functions: FunctionDef[]) {
    const functionNames = functions.map(f => f.name);

    // Deactivate SDK jobs no longer in the list
    if (functionNames.length > 0) {
      await this.jobRepo
        .createQueryBuilder()
        .update(Job)
        .set({ status: 'inactive', nextRunAt: null })
        .where({
          projectId,
          source: 'sdk',
          name: Not(In(functionNames)),
          status: Not('inactive'),
        })
        .execute();
    } else {
      // All SDK jobs removed
      await this.jobRepo
        .createQueryBuilder()
        .update(Job)
        .set({ status: 'inactive', nextRunAt: null })
        .where({ projectId, source: 'sdk', status: Not('inactive') })
        .execute();
    }

    // Upsert each function
    const results = [];
    for (const fn of functions) {
      let job = await this.jobRepo.findOne({
        where: { projectId, name: fn.name },
      });

      const nextRunAt = fn.schedule
        ? cronParser.parseExpression(fn.schedule).next().toDate()
        : null;

      if (job) {
        job.schedule = fn.schedule || job.schedule;
        job.retries = fn.options.retries ?? job.retries;
        job.timeoutSeconds = this.parseTimeout(fn.options.timeout);
        job.concurrency = fn.options.concurrency ?? job.concurrency;
        job.status = 'active';
        job.nextRunAt = nextRunAt;
        job.source = 'sdk';
        await this.jobRepo.save(job);
      } else {
        job = this.jobRepo.create({
          projectId,
          name: fn.name,
          schedule: fn.schedule || '* * * * *',
          source: 'sdk',
          retries: fn.options.retries ?? 0,
          timeoutSeconds: this.parseTimeout(fn.options.timeout),
          concurrency: fn.options.concurrency ?? 1,
          nextRunAt,
        });
        await this.jobRepo.save(job);
      }

      results.push({ name: job.name, status: job.status, schedule: job.schedule });
    }

    return { jobs: results };
  }
}
```

- [ ] **Step 4: Create RegistrationController**

`apps/platform/src/modules/registration/registration.controller.ts`:
```ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('api/v1/register')
@UseGuards(ApiKeyGuard)
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  async register(@Body() body: { project_id: string; functions: any[] }) {
    return this.registrationService.register(body.project_id, body.functions);
  }
}
```

- [ ] **Step 5: Create RegistrationModule and wire into AppModule**

`apps/platform/src/modules/registration/registration.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../jobs/job.entity';
import { ApiKey } from '../api-keys/api-key.entity';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Job, ApiKey])],
  controllers: [RegistrationController],
  providers: [RegistrationService, ApiKeyGuard],
})
export class RegistrationModule {}
```

Add `RegistrationModule` to `AppModule` imports.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/registration.e2e-spec.ts`
Expected: all 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/platform/src/modules/registration/ apps/platform/src/app.module.ts apps/platform/test/registration.e2e-spec.ts
git commit -m "feat(platform): add SDK registration endpoint with upsert and auto-deactivation"
```

---

## Task 13: Job Trigger Endpoint

**Files:**
- Modify: `apps/platform/src/modules/jobs/jobs.controller.ts`
- Modify: `apps/platform/src/modules/jobs/jobs.service.ts`
- Modify: `apps/platform/src/modules/jobs/jobs.module.ts`
- Modify: `apps/platform/test/jobs.e2e-spec.ts`

- [ ] **Step 1: Add failing test for immediate trigger**

Add to `apps/platform/test/jobs.e2e-spec.ts`:
```ts
describe('POST /api/v1/jobs/:id/trigger', () => {
  it('creates a pending execution and returns it', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set('Cookie', cookie)
      .send({ projectId, name: 'trigger-job', schedule: '0 0 * * *' });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${createRes.body.id}/trigger`)
      .set('Cookie', cookie)
      .expect(201);

    expect(res.body.status).toBe('pending');
    expect(res.body.jobId).toBe(createRes.body.id);
    expect(res.body.scheduledAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/jobs.e2e-spec.ts`
Expected: the trigger test FAILS

- [ ] **Step 3: Add trigger method to JobsService**

Add to `apps/platform/src/modules/jobs/jobs.service.ts`:
```ts
import { Execution } from '../executions/execution.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { decrypt } from '../../common/encryption';
import { Project } from '../projects/project.entity';

// Add to constructor:
// @InjectRepository(Execution) private readonly execRepo: Repository<Execution>,
// @InjectRepository(Project) private readonly projectRepo: Repository<Project>,
// @InjectQueue('jobs') private readonly jobQueue: Queue,
// private readonly config: ConfigService,

async trigger(id: string): Promise<Execution> {
  const job = await this.findById(id);
  const project = await this.projectRepo.findOne({ where: { id: job.projectId } });
  const encryptionKey = this.config.get<string>('encryption.key');
  const cronSecret = decrypt(project.cronSecret, encryptionKey);

  const activeCount = await this.execRepo.count({
    where: [
      { jobId: id, status: 'pending' },
      { jobId: id, status: 'running' },
    ],
  });

  if (activeCount >= job.concurrency) {
    throw new ConflictException('Job concurrency limit reached');
  }

  const execution = this.execRepo.create({
    jobId: id,
    status: 'pending',
    attempt: 1,
    scheduledAt: new Date(),
  });
  await this.execRepo.save(execution);

  await this.jobQueue.add('dispatch', {
    executionId: execution.id,
    jobId: job.id,
    projectId: job.projectId,
    functionName: job.name,
    endpointUrl: project.endpointUrl,
    cronSecret,
    attempt: 1,
    maxRetries: job.retries,
    timeoutSeconds: job.timeoutSeconds,
    scheduledAt: execution.scheduledAt.toISOString(),
  });

  return execution;
}
```

Update `JobsModule` to import `TypeOrmModule.forFeature([Job, Execution, Project])` and `BullModule.registerQueue({ name: 'jobs' })`.

Update `AppModule` to add BullMQ:
```ts
import { BullModule } from '@nestjs/bullmq';

// Add to imports:
BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    connection: { url: config.get('redis.url') },
  }),
}),
```

- [ ] **Step 4: Add trigger route to JobsController**

```ts
@Post(':id/trigger')
async trigger(@Param('id') id: string) {
  return this.jobsService.trigger(id);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/jobs.e2e-spec.ts`
Expected: all 7 tests PASS (including the new trigger test)

- [ ] **Step 6: Commit**

```bash
git add apps/platform/src/modules/jobs/ apps/platform/src/app.module.ts apps/platform/test/jobs.e2e-spec.ts
git commit -m "feat(platform): add immediate job trigger with BullMQ enqueue"
```

---

## Task 14: Scheduler Service

**Files:**
- Create: `apps/platform/src/modules/scheduler/scheduler.module.ts`
- Create: `apps/platform/src/modules/scheduler/scheduler.service.ts`
- Create: `apps/platform/test/scheduler.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/scheduler.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { SchedulerService } from '../src/modules/scheduler/scheduler.service';
import { DataSource } from 'typeorm';
import { Job } from '../src/modules/jobs/job.entity';
import { Execution } from '../src/modules/executions/execution.entity';
import { Project } from '../src/modules/projects/project.entity';
import { User } from '../src/entities/user.entity';
import { encrypt } from '../src/common/encryption';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';

describe('SchedulerService', () => {
  let scheduler: SchedulerService;
  let dataSource: DataSource;
  let jobQueue: Queue;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    scheduler = moduleFixture.get(SchedulerService);
    dataSource = moduleFixture.get(DataSource);
    jobQueue = moduleFixture.get(getQueueToken('jobs'));

    // Seed user + project
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.save(userRepo.create({
      email: 'scheduler-test@example.com',
      name: 'Scheduler',
    }));

    const projectRepo = dataSource.getRepository(Project);
    const encryptionKey = process.env.ENCRYPTION_KEY || '0'.repeat(64);
    const project = await projectRepo.save(projectRepo.create({
      userId: user.id,
      name: 'sched-proj',
      cronSecret: encrypt('test-secret', encryptionKey),
      endpointUrl: 'https://example.com/api/__pingback',
    }));
    projectId = project.id;
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  test('tick enqueues due jobs and updates next_run_at', async () => {
    const jobRepo = dataSource.getRepository(Job);
    const job = await jobRepo.save(jobRepo.create({
      projectId,
      name: 'tick-test-job',
      schedule: '* * * * *',
      status: 'active',
      nextRunAt: new Date(Date.now() - 60000), // 1 min in the past
      source: 'sdk',
    }));

    await scheduler.tick();

    // Execution should be created
    const execRepo = dataSource.getRepository(Execution);
    const execs = await execRepo.find({ where: { jobId: job.id } });
    expect(execs).toHaveLength(1);
    expect(execs[0].status).toBe('pending');

    // next_run_at should be updated to the future
    const updatedJob = await jobRepo.findOne({ where: { id: job.id } });
    expect(updatedJob.nextRunAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('tick skips paused jobs', async () => {
    const jobRepo = dataSource.getRepository(Job);
    const job = await jobRepo.save(jobRepo.create({
      projectId,
      name: 'paused-job',
      schedule: '* * * * *',
      status: 'paused',
      nextRunAt: new Date(Date.now() - 60000),
      source: 'sdk',
    }));

    await scheduler.tick();

    const execRepo = dataSource.getRepository(Execution);
    const execs = await execRepo.find({ where: { jobId: job.id } });
    expect(execs).toHaveLength(0);
  });

  test('tick respects concurrency limit', async () => {
    const jobRepo = dataSource.getRepository(Job);
    const job = await jobRepo.save(jobRepo.create({
      projectId,
      name: 'concurrent-job',
      schedule: '* * * * *',
      status: 'active',
      nextRunAt: new Date(Date.now() - 60000),
      concurrency: 1,
      source: 'sdk',
    }));

    // Create an existing pending execution
    const execRepo = dataSource.getRepository(Execution);
    await execRepo.save(execRepo.create({
      jobId: job.id,
      status: 'running',
      attempt: 1,
      scheduledAt: new Date(),
    }));

    await scheduler.tick();

    // Should not create another execution
    const execs = await execRepo.find({ where: { jobId: job.id } });
    expect(execs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/scheduler.e2e-spec.ts`
Expected: FAIL — cannot find SchedulerService

- [ ] **Step 3: Implement SchedulerService**

`apps/platform/src/modules/scheduler/scheduler.service.ts`:
```ts
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as cronParser from 'cron-parser';
import { Job } from '../jobs/job.entity';
import { Execution } from '../executions/execution.entity';
import { Project } from '../projects/project.entity';
import { decrypt } from '../../common/encryption';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private intervalId: NodeJS.Timeout;

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Execution)
    private readonly execRepo: Repository<Execution>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectQueue('jobs')
    private readonly jobQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.intervalId = setInterval(() => this.tick().catch(err => {
      this.logger.error('Tick failed', err.stack);
    }), 10_000);
    this.logger.log('Scheduler started (10s tick interval)');
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async tick(): Promise<void> {
    const now = new Date();

    // Use raw query for FOR UPDATE SKIP LOCKED
    const dueJobs = await this.jobRepo
      .createQueryBuilder('job')
      .setLock('pessimistic_write', undefined, ['job'])
      .where('job.status = :status', { status: 'active' })
      .andWhere('job.next_run_at <= :now', { now })
      .getMany();

    for (const job of dueJobs) {
      try {
        await this.processJob(job, now);
      } catch (err) {
        this.logger.error(`Failed to process job ${job.id}: ${err.message}`);
      }
    }
  }

  private async processJob(job: Job, now: Date): Promise<void> {
    // Check concurrency
    const activeCount = await this.execRepo.count({
      where: [
        { jobId: job.id, status: 'pending' },
        { jobId: job.id, status: 'running' },
      ],
    });

    if (activeCount >= job.concurrency) {
      this.logger.debug(`Job ${job.name} skipped: concurrency limit (${activeCount}/${job.concurrency})`);
      return;
    }

    // Get project for endpoint + secret
    const project = await this.projectRepo.findOne({ where: { id: job.projectId } });
    if (!project) {
      this.logger.error(`Project ${job.projectId} not found for job ${job.name}`);
      return;
    }

    const encryptionKey = this.config.get<string>('encryption.key');
    const cronSecret = decrypt(project.cronSecret, encryptionKey);

    // Create execution
    const execution = this.execRepo.create({
      jobId: job.id,
      status: 'pending',
      attempt: 1,
      scheduledAt: job.nextRunAt,
    });
    await this.execRepo.save(execution);

    // Enqueue
    await this.jobQueue.add('dispatch', {
      executionId: execution.id,
      jobId: job.id,
      projectId: job.projectId,
      functionName: job.name,
      endpointUrl: project.endpointUrl,
      cronSecret,
      attempt: 1,
      maxRetries: job.retries,
      timeoutSeconds: job.timeoutSeconds,
      scheduledAt: execution.scheduledAt.toISOString(),
    });

    // Advance next_run_at
    try {
      const interval = cronParser.parseExpression(job.schedule, { currentDate: now });
      job.nextRunAt = interval.next().toDate();
    } catch {
      this.logger.error(`Invalid cron expression for job ${job.name}: ${job.schedule}`);
      job.status = 'paused';
      job.nextRunAt = null;
    }
    job.lastRunAt = now;
    await this.jobRepo.save(job);
  }

  private async checkMissedRunAlerts(now: Date): Promise<void> {
    const alerts = await this.alertRepo.find({
      where: { triggerType: 'missed_run', enabled: true },
    });

    for (const alert of alerts) {
      if (alert.lastFiredAt) {
        const elapsed = now.getTime() - alert.lastFiredAt.getTime();
        if (elapsed < alert.cooldownSeconds * 1000) continue;
      }

      const job = await this.jobRepo.findOne({ where: { id: alert.jobId || undefined } });
      if (!job || job.status !== 'active' || !job.nextRunAt) continue;

      const missedBy = (now.getTime() - job.nextRunAt.getTime()) / 1000;
      if (missedBy > alert.triggerValue) {
        const hasRecentExec = await this.execRepo.count({
          where: {
            jobId: job.id,
            scheduledAt: job.nextRunAt,
          },
        });

        if (hasRecentExec === 0) {
          // Fire missed run alert
          const project = await this.projectRepo.findOne({ where: { id: job.projectId } });
          this.logger.warn(`Missed run alert for job ${job.name} in project ${project?.name}`);
          alert.lastFiredAt = now;
          await this.alertRepo.save(alert);
          // Email sending handled by AlertsService (injected similarly to worker)
        }
      }
    }
  }
}
```

The `tick()` method should also call `this.checkMissedRunAlerts(now)` at the end. Add `@InjectRepository(Alert) private readonly alertRepo: Repository<Alert>` to the constructor and import the Alert entity.

- [ ] **Step 4: Create SchedulerModule and wire into AppModule**

`apps/platform/src/modules/scheduler/scheduler.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Job } from '../jobs/job.entity';
import { Execution } from '../executions/execution.entity';
import { Project } from '../projects/project.entity';
import { Alert } from '../alerts/alert.entity';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Execution, Project, Alert]),
    BullModule.registerQueue({ name: 'jobs' }),
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
```

Add `SchedulerModule` to `AppModule` imports.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/scheduler.e2e-spec.ts`
Expected: all 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add apps/platform/src/modules/scheduler/ apps/platform/src/app.module.ts apps/platform/test/scheduler.e2e-spec.ts
git commit -m "feat(platform): add scheduler with 10s tick loop, concurrency check, and cron parsing"
```

---

## Task 15: Alerts Module

**Files:**
- Create: `apps/platform/src/modules/alerts/alerts.module.ts`
- Create: `apps/platform/src/modules/alerts/alerts.controller.ts`
- Create: `apps/platform/src/modules/alerts/alerts.service.ts`
- Create: `apps/platform/test/alerts.e2e-spec.ts`
- Modify: `apps/platform/src/app.module.ts`

- [ ] **Step 1: Write failing e2e test**

`apps/platform/test/alerts.e2e-spec.ts`:
```ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('Alerts (e2e)', () => {
  let app: INestApplication;
  let cookie: string;
  let projectId: string;
  let jobId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'alerts-test@example.com', password: 'StrongPass123!', name: 'Alerts Test' });
    cookie = authRes.headers['set-cookie'][0];

    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookie)
      .send({ name: 'alerts-proj', endpointUrl: 'https://example.com/api/__pingback' });
    projectId = projRes.body.id;

    const jobRes = await request(app.getHttpServer())
      .post('/api/v1/jobs')
      .set('Cookie', cookie)
      .send({ projectId, name: 'alerts-job', schedule: '* * * * *' });
    jobId = jobRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/alerts', () => {
    it('creates an alert', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/alerts')
        .set('Cookie', cookie)
        .send({
          projectId,
          jobId,
          channel: 'email',
          target: 'alerts@example.com',
          triggerType: 'consecutive_failures',
          triggerValue: 3,
        })
        .expect(201);

      expect(res.body.triggerType).toBe('consecutive_failures');
      expect(res.body.triggerValue).toBe(3);
      expect(res.body.enabled).toBe(true);
    });
  });

  describe('GET /api/v1/alerts', () => {
    it('lists alerts filtered by project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/alerts?projectId=${projectId}`)
        .set('Cookie', cookie)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/v1/alerts/:id', () => {
    it('updates alert', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/alerts')
        .set('Cookie', cookie)
        .send({
          projectId,
          channel: 'email',
          target: 'update@example.com',
          triggerType: 'duration_exceeded',
          triggerValue: 5000,
        });

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alerts/${createRes.body.id}`)
        .set('Cookie', cookie)
        .send({ enabled: false })
        .expect(200);

      expect(res.body.enabled).toBe(false);
    });
  });

  describe('DELETE /api/v1/alerts/:id', () => {
    it('deletes alert', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/alerts')
        .set('Cookie', cookie)
        .send({
          projectId,
          channel: 'email',
          target: 'delete@example.com',
          triggerType: 'missed_run',
          triggerValue: 120,
        });

      await request(app.getHttpServer())
        .delete(`/api/v1/alerts/${createRes.body.id}`)
        .set('Cookie', cookie)
        .expect(200);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/platform && npx jest test/alerts.e2e-spec.ts`
Expected: FAIL — routes do not exist

- [ ] **Step 3: Create AlertsService**

`apps/platform/src/modules/alerts/alerts.service.ts`:
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Alert } from './alert.entity';
import { Execution } from '../executions/execution.entity';
import { Job } from '../jobs/job.entity';
import { Project } from '../projects/project.entity';

@Injectable()
export class AlertsService {
  private resend: Resend;

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Execution)
    private readonly execRepo: Repository<Execution>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly config: ConfigService,
  ) {
    this.resend = new Resend(this.config.get('resend.apiKey'));
  }

  async create(data: Partial<Alert>): Promise<Alert> {
    const alert = this.alertRepo.create(data);
    return this.alertRepo.save(alert);
  }

  async findAll(filters: { projectId?: string; jobId?: string }): Promise<Alert[]> {
    const where: any = {};
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.jobId) where.jobId = filters.jobId;
    return this.alertRepo.find({ where });
  }

  async update(id: string, data: Partial<Alert>): Promise<Alert> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    Object.assign(alert, data);
    return this.alertRepo.save(alert);
  }

  async delete(id: string): Promise<void> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    await this.alertRepo.remove(alert);
  }

  async evaluateForExecution(execution: Execution): Promise<void> {
    const job = await this.jobRepo.findOne({ where: { id: execution.jobId } });
    if (!job) return;

    const alerts = await this.alertRepo.find({
      where: [
        { jobId: job.id, enabled: true },
        { projectId: job.projectId, jobId: null as any, enabled: true },
      ],
    });

    for (const alert of alerts) {
      if (this.isInCooldown(alert)) continue;

      let shouldFire = false;

      if (alert.triggerType === 'consecutive_failures' && execution.status === 'failed') {
        const recentFails = await this.execRepo
          .createQueryBuilder('e')
          .where('e.job_id = :jobId', { jobId: job.id })
          .andWhere('e.status = :status', { status: 'failed' })
          .orderBy('e.created_at', 'DESC')
          .limit(alert.triggerValue)
          .getMany();

        shouldFire = recentFails.length >= alert.triggerValue &&
          recentFails.every(e => e.status === 'failed');
      }

      if (alert.triggerType === 'duration_exceeded' && execution.durationMs) {
        shouldFire = execution.durationMs > alert.triggerValue;
      }

      if (shouldFire) {
        await this.fireAlert(alert, job, execution);
      }
    }
  }

  private isInCooldown(alert: Alert): boolean {
    if (!alert.lastFiredAt) return false;
    const elapsed = Date.now() - alert.lastFiredAt.getTime();
    return elapsed < alert.cooldownSeconds * 1000;
  }

  private async fireAlert(alert: Alert, job: Job, execution: Execution): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: job.projectId } });
    const dashboardUrl = this.config.get('dashboardUrl');

    try {
      await this.resend.emails.send({
        from: 'Pingback <alerts@pingback.dev>',
        to: alert.target,
        subject: `[Pingback] Job "${job.name}" alert in ${project?.name || 'unknown project'}`,
        text: `Job "${job.name}" in project "${project?.name}" triggered a ${alert.triggerType} alert.\n\nLast error: ${execution.errorMessage || 'N/A'}\n\nView in dashboard: ${dashboardUrl}/projects/${job.projectId}/jobs/${job.id}`,
      });
    } catch (err) {
      // Log but don't throw — alert failure shouldn't break execution flow
    }

    alert.lastFiredAt = new Date();
    await this.alertRepo.save(alert);
  }
}
```

- [ ] **Step 4: Create AlertsController**

`apps/platform/src/modules/alerts/alerts.controller.ts`:
```ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertsService } from './alerts.service';
import { IsString, IsOptional, IsEnum, IsInt, IsBoolean, IsEmail } from 'class-validator';

class CreateAlertDto {
  @IsString()
  projectId: string;

  @IsString()
  @IsOptional()
  jobId?: string;

  @IsEnum(['email'])
  channel: 'email';

  @IsEmail()
  target: string;

  @IsEnum(['consecutive_failures', 'duration_exceeded', 'missed_run'])
  triggerType: 'consecutive_failures' | 'duration_exceeded' | 'missed_run';

  @IsInt()
  triggerValue: number;
}

class UpdateAlertDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEmail()
  @IsOptional()
  target?: string;

  @IsInt()
  @IsOptional()
  triggerValue?: number;
}

@Controller('api/v1/alerts')
@UseGuards(AuthGuard('jwt'))
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@Body() dto: CreateAlertDto) {
    return this.alertsService.create(dto);
  }

  @Get()
  async findAll(@Query('projectId') projectId?: string, @Query('jobId') jobId?: string) {
    return this.alertsService.findAll({ projectId, jobId });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.alertsService.delete(id);
    return { ok: true };
  }
}
```

- [ ] **Step 5: Create AlertsModule and wire into AppModule**

`apps/platform/src/modules/alerts/alerts.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './alert.entity';
import { Execution } from '../executions/execution.entity';
import { Job } from '../jobs/job.entity';
import { Project } from '../projects/project.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, Execution, Job, Project])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
```

Add `AlertsModule` to `AppModule` imports.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd apps/platform && npx jest test/alerts.e2e-spec.ts`
Expected: all 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/platform/src/modules/alerts/ apps/platform/src/app.module.ts apps/platform/test/alerts.e2e-spec.ts
git commit -m "feat(platform): add alerts CRUD with evaluation engine and Resend integration"
```

---

## Task 16: Worker App

**Files:**
- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/nest-cli.json`
- Create: `apps/worker/src/main.ts`
- Create: `apps/worker/src/app.module.ts`
- Create: `apps/worker/src/signer.ts`
- Create: `apps/worker/src/dispatcher.service.ts`
- Create: `apps/worker/test/signer.test.ts`
- Create: `apps/worker/test/dispatcher.e2e-spec.ts`

- [ ] **Step 1: Create worker package scaffolding**

`apps/worker/package.json`:
```json
{
  "name": "@pingback/worker",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/bullmq": "^10.2.0",
    "typeorm": "^0.3.20",
    "pg": "^8.12.0",
    "bullmq": "^5.12.0",
    "ioredis": "^5.4.0",
    "resend": "^4.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.4.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "typescript": "^5.5.0",
    "ts-node": "^10.9.0"
  }
}
```

`apps/worker/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
```

`apps/worker/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

`apps/worker/jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
};
```

- [ ] **Step 2: Write failing signer test**

`apps/worker/test/signer.test.ts`:
```ts
import { signRequest } from '../src/signer';

describe('signRequest', () => {
  const secret = 'test-secret';

  test('returns signature and timestamp', () => {
    const payload = { function: 'my-job', executionId: 'exec_1', attempt: 1, scheduledAt: '2026-04-14T10:00:00Z' };
    const result = signRequest(payload, secret);

    expect(result.signature).toMatch(/^[a-f0-9]+$/);
    expect(typeof result.timestamp).toBe('number');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  test('same payload and secret produce consistent signatures', () => {
    const payload = { function: 'my-job', executionId: 'exec_1', attempt: 1, scheduledAt: '2026-04-14T10:00:00Z' };
    const r1 = signRequest(payload, secret);
    const r2 = signRequest(payload, secret);
    expect(r1.signature).toBe(r2.signature);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/worker && npx jest test/signer.test.ts`
Expected: FAIL — cannot find `../src/signer`

- [ ] **Step 4: Implement signer**

`apps/worker/src/signer.ts`:
```ts
import { createHmac } from 'crypto';

export function signRequest(
  payload: Record<string, unknown>,
  secret: string,
): { signature: string; timestamp: number } {
  const timestamp = Date.now();
  const hmac = createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return {
    signature: hmac.digest('hex'),
    timestamp,
  };
}
```

- [ ] **Step 5: Run signer test to verify it passes**

Run: `cd apps/worker && npx jest test/signer.test.ts`
Expected: all 2 tests PASS

- [ ] **Step 6: Implement DispatcherService**

`apps/worker/src/dispatcher.service.ts`:
```ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { signRequest } from './signer';
import { Execution } from './entities/execution.entity';
import { AlertsService } from './alerts.service';

const NON_RETRYABLE_STATUSES = [401, 404];

@Processor('jobs')
export class DispatcherService extends WorkerHost {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    @InjectRepository(Execution)
    private readonly execRepo: Repository<Execution>,
    @InjectQueue('jobs')
    private readonly jobQueue: Queue,
    private readonly alertsService: AlertsService,
  ) {
    super();
  }

  async process(bullJob: BullJob): Promise<void> {
    const msg = bullJob.data;
    const { executionId, functionName, endpointUrl, cronSecret, attempt, maxRetries, timeoutSeconds, scheduledAt } = msg;

    // Idempotency check
    const existing = await this.execRepo.findOne({ where: { id: executionId } });
    if (!existing || existing.status === 'running' || existing.status === 'success') {
      this.logger.debug(`Skipping execution ${executionId}: already ${existing?.status}`);
      return;
    }

    // Mark running
    existing.status = 'running';
    existing.startedAt = new Date();
    await this.execRepo.save(existing);

    const requestPayload = {
      function: functionName,
      executionId,
      attempt,
      scheduledAt,
    };

    const { signature, timestamp } = signRequest(requestPayload, cronSecret);

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pingback-Signature': signature,
          'X-Pingback-Timestamp': timestamp.toString(),
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const durationMs = Date.now() - startTime;

      let responseBody = '';
      try {
        responseBody = await response.text();
        if (responseBody.length > 10240) {
          responseBody = responseBody.slice(0, 10240);
        }
      } catch {}

      if (response.ok) {
        // Parse logs from response
        let logs: Array<{ timestamp: number; message: string }> = [];
        try {
          const parsed = JSON.parse(responseBody);
          logs = parsed.logs || [];
        } catch {}

        existing.status = 'success';
        existing.completedAt = new Date();
        existing.durationMs = durationMs;
        existing.httpStatus = response.status;
        existing.responseBody = responseBody;
        existing.logs = logs;
        await this.execRepo.save(existing);
      } else {
        await this.handleFailure(existing, msg, durationMs, response.status, responseBody);
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err.name === 'AbortError'
        ? `Request timed out after ${timeoutSeconds}s`
        : err.message;
      await this.handleFailure(existing, msg, durationMs, null, null, errorMessage);
    }

    // Evaluate alerts
    const updated = await this.execRepo.findOne({ where: { id: executionId } });
    await this.alertsService.evaluateForExecution(updated);
  }

  private async handleFailure(
    execution: Execution,
    msg: any,
    durationMs: number,
    httpStatus: number | null,
    responseBody: string | null,
    errorMessage?: string,
  ): Promise<void> {
    execution.status = 'failed';
    execution.completedAt = new Date();
    execution.durationMs = durationMs;
    execution.httpStatus = httpStatus;
    execution.responseBody = responseBody;
    execution.errorMessage = errorMessage || this.getErrorMessage(httpStatus);
    await this.execRepo.save(execution);

    // Check if retryable
    if (httpStatus && NON_RETRYABLE_STATUSES.includes(httpStatus)) {
      this.logger.warn(`Non-retryable failure for ${msg.functionName}: ${httpStatus}`);
      return;
    }

    // Retry if attempts remaining
    if (msg.attempt < msg.maxRetries + 1) {
      const nextAttempt = msg.attempt + 1;
      const delay = Math.min(Math.pow(2, msg.attempt) * 1000, 300000);

      const retryExec = this.execRepo.create({
        jobId: msg.jobId,
        status: 'pending',
        attempt: nextAttempt,
        scheduledAt: execution.scheduledAt,
      });
      await this.execRepo.save(retryExec);

      await this.jobQueue.add('dispatch', {
        ...msg,
        executionId: retryExec.id,
        attempt: nextAttempt,
      }, { delay });

      this.logger.log(`Retrying ${msg.functionName} attempt ${nextAttempt} in ${delay}ms`);
    }
  }

  private getErrorMessage(httpStatus: number | null): string {
    if (httpStatus === 401) return 'Signature verification failed. Check your PINGBACK_SIGNING_SECRET.';
    if (httpStatus === 404) return 'Route /api/__pingback not found. Ensure withPingback() is configured.';
    return `HTTP ${httpStatus || 'unknown'}`;
  }
}
```

- [ ] **Step 7: Create worker entities (copies for TypeORM)**

The worker needs its own entity references. Create symlinks or duplicate the entities.

`apps/worker/src/entities/execution.entity.ts`: Copy from `apps/platform/src/modules/executions/execution.entity.ts` but remove the Job import relation (worker only needs the execution table):

```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('executions')
@Index(['jobId', 'createdAt'])
@Index(['status'])
export class Execution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId: string;

  @Column({ type: 'enum', enum: ['pending', 'running', 'success', 'failed'], default: 'pending' })
  status: 'pending' | 'running' | 'success' | 'failed';

  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'timestamp', name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'int', nullable: true, name: 'duration_ms' })
  durationMs: number;

  @Column({ type: 'int', nullable: true, name: 'http_status' })
  httpStatus: number;

  @Column({ type: 'text', nullable: true, name: 'response_body' })
  responseBody: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'jsonb', default: '[]' })
  logs: Array<{ timestamp: number; message: string }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 8: Create worker AlertsService (simplified)**

`apps/worker/src/alerts.service.ts`:
```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Execution } from './entities/execution.entity';
import { Alert } from './entities/alert.entity';
import { Job } from './entities/job.entity';
import { Project } from './entities/project.entity';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  private resend: Resend;

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Execution)
    private readonly execRepo: Repository<Execution>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly config: ConfigService,
  ) {
    this.resend = new Resend(this.config.get('resend.apiKey'));
  }

  async evaluateForExecution(execution: Execution): Promise<void> {
    if (!execution) return;

    const job = await this.jobRepo.findOne({ where: { id: execution.jobId } });
    if (!job) return;

    const alerts = await this.alertRepo.find({
      where: [
        { jobId: job.id, enabled: true },
        { projectId: job.projectId, enabled: true },
      ],
    });

    for (const alert of alerts) {
      if (alert.jobId && alert.jobId !== job.id) continue;
      if (alert.lastFiredAt) {
        const elapsed = Date.now() - alert.lastFiredAt.getTime();
        if (elapsed < alert.cooldownSeconds * 1000) continue;
      }

      let shouldFire = false;

      if (alert.triggerType === 'consecutive_failures' && execution.status === 'failed') {
        const recentExecs = await this.execRepo
          .createQueryBuilder('e')
          .where('e.job_id = :jobId', { jobId: job.id })
          .orderBy('e.created_at', 'DESC')
          .limit(alert.triggerValue)
          .getMany();

        shouldFire = recentExecs.length >= alert.triggerValue &&
          recentExecs.every(e => e.status === 'failed');
      }

      if (alert.triggerType === 'duration_exceeded' && execution.durationMs) {
        shouldFire = execution.durationMs > alert.triggerValue;
      }

      if (shouldFire) {
        const project = await this.projectRepo.findOne({ where: { id: job.projectId } });
        try {
          await this.resend.emails.send({
            from: 'Pingback <alerts@pingback.dev>',
            to: alert.target,
            subject: `[Pingback] Alert: "${job.name}" in ${project?.name}`,
            text: `Job "${job.name}" triggered: ${alert.triggerType}.\nError: ${execution.errorMessage || 'N/A'}`,
          });
        } catch (err) {
          this.logger.error(`Failed to send alert email: ${err.message}`);
        }

        alert.lastFiredAt = new Date();
        await this.alertRepo.save(alert);
      }
    }
  }
}
```

Create minimal entity stubs for the worker (alert, job, project) in `apps/worker/src/entities/` — same structure as platform entities but without relations:

`apps/worker/src/entities/alert.entity.ts`:
```ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'uuid', nullable: true, name: 'job_id' })
  jobId: string;

  @Column({ type: 'enum', enum: ['email'], default: 'email' })
  channel: 'email';

  @Column({ type: 'text' })
  target: string;

  @Column({ type: 'enum', enum: ['consecutive_failures', 'duration_exceeded', 'missed_run'], name: 'trigger_type' })
  triggerType: 'consecutive_failures' | 'duration_exceeded' | 'missed_run';

  @Column({ type: 'int', name: 'trigger_value' })
  triggerValue: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_fired_at' })
  lastFiredAt: Date;

  @Column({ type: 'int', default: 3600, name: 'cooldown_seconds' })
  cooldownSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

`apps/worker/src/entities/job.entity.ts`:
```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Column({ type: 'text' })
  name: string;
}
```

`apps/worker/src/entities/project.entity.ts`:
```ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;
}
```

- [ ] **Step 9: Create worker AppModule and main.ts**

`apps/worker/src/app.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Execution } from './entities/execution.entity';
import { Alert } from './entities/alert.entity';
import { Job } from './entities/job.entity';
import { Project } from './entities/project.entity';
import { DispatcherService } from './dispatcher.service';
import { AlertsService } from './alerts.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [Execution, Alert, Job, Project],
        synchronize: false, // platform handles migrations
      }),
    }),
    TypeOrmModule.forFeature([Execution, Alert, Job, Project]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue({ name: 'jobs' }),
  ],
  providers: [DispatcherService, AlertsService],
})
export class AppModule {}
```

`apps/worker/src/main.ts`:
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();
  console.log('Worker started, listening for jobs...');
}
bootstrap();
```

- [ ] **Step 10: Install dependencies and verify build**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback && npm install`
Run: `npm run build --workspace=apps/worker`
Expected: compiles without errors

- [ ] **Step 11: Commit**

```bash
git add apps/worker/
git commit -m "feat(worker): add BullMQ worker with HTTP dispatch, HMAC signing, retries, and alert evaluation"
```

---

## Task 17: @pingback/next — Handler

**Files:**
- Create: `packages/next/package.json`
- Create: `packages/next/tsconfig.json`
- Create: `packages/next/src/index.ts`
- Create: `packages/next/src/handler.ts`
- Create: `packages/next/tests/handler.test.ts`

- [ ] **Step 1: Create package scaffolding**

`packages/next/package.json`:
```json
{
  "name": "@pingback/next",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./plugin": "./dist/plugin.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "dependencies": {
    "@pingback/core": "^0.0.1"
  },
  "peerDependencies": {
    "next": ">=14.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "@types/jest": "^29.5.0",
    "typescript": "^5.5.0",
    "next": "^15.0.0"
  }
}
```

`packages/next/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/next/jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
```

- [ ] **Step 2: Write failing handler test**

`packages/next/tests/handler.test.ts`:
```ts
import { createHandler } from '../src/handler';
import { Registry, signPayload } from '@pingback/core';

describe('createHandler', () => {
  const secret = 'test-signing-secret';
  let registry: Registry;

  beforeEach(() => {
    registry = new Registry();
  });

  function makeRequest(payload: any, signingSecret = secret) {
    const signature = signPayload(payload, signingSecret);
    const timestamp = Date.now();
    return {
      body: payload,
      headers: {
        'x-pingback-signature': signature,
        'x-pingback-timestamp': timestamp.toString(),
      },
    };
  }

  test('executes a registered function and returns result', async () => {
    registry.cron('my-job', '* * * * *', async (ctx) => {
      ctx.log('hello');
      return { count: 42 };
    });

    const handler = createHandler(registry, secret);
    const payload = { function: 'my-job', executionId: 'exec_1', attempt: 1, scheduledAt: '2026-04-14T10:00:00Z' };
    const req = makeRequest(payload);

    const result = await handler(req.body, req.headers);

    expect(result.status).toBe('success');
    expect(result.result).toEqual({ count: 42 });
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].message).toBe('hello');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  test('returns error for unknown function', async () => {
    const handler = createHandler(registry, secret);
    const payload = { function: 'unknown', executionId: 'exec_2', attempt: 1, scheduledAt: '2026-04-14T10:00:00Z' };
    const req = makeRequest(payload);

    const result = await handler(req.body, req.headers);

    expect(result.statusCode).toBe(404);
    expect(result.error).toContain('Function not found');
  });

  test('returns 401 for invalid signature', async () => {
    registry.cron('my-job', '* * * * *', async () => ({}));

    const handler = createHandler(registry, secret);
    const payload = { function: 'my-job', executionId: 'exec_3', attempt: 1, scheduledAt: '2026-04-14T10:00:00Z' };
    const req = makeRequest(payload, 'wrong-secret');

    const result = await handler(req.body, req.headers);

    expect(result.statusCode).toBe(401);
    expect(result.error).toContain('Invalid signature');
  });

  test('returns error when function throws', async () => {
    registry.cron('failing-job', '* * * * *', async () => {
      throw new Error('Something broke');
    });

    const handler = createHandler(registry, secret);
    const payload = { function: 'failing-job', executionId: 'exec_4', attempt: 1, scheduledAt: '2026-04-14T10:00:00Z' };
    const req = makeRequest(payload);

    const result = await handler(req.body, req.headers);

    expect(result.status).toBe('error');
    expect(result.error).toBe('Something broke');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/next && npx jest tests/handler.test.ts`
Expected: FAIL — cannot find `../src/handler`

- [ ] **Step 4: Implement handler**

`packages/next/src/handler.ts`:
```ts
import { Registry, verifySignature, createContext, ExecutionResult } from '@pingback/core';

interface HandlerResponse extends Partial<ExecutionResult> {
  statusCode?: number;
  error?: string;
}

export function createHandler(
  registry: Registry,
  signingSecret: string,
): (body: any, headers: Record<string, string>) => Promise<HandlerResponse> {
  return async (body, headers): Promise<HandlerResponse> => {
    const signature = headers['x-pingback-signature'];
    const timestamp = parseInt(headers['x-pingback-timestamp'], 10);

    if (!signature || !timestamp || !verifySignature(body, signature, timestamp, signingSecret)) {
      return { statusCode: 401, error: 'Invalid signature' };
    }

    const fn = registry.get(body.function);
    if (!fn) {
      return { statusCode: 404, error: `Function not found: ${body.function}` };
    }

    const ctx = createContext(body);
    const startTime = Date.now();

    try {
      const result = await fn.handler(ctx);
      const durationMs = Date.now() - startTime;
      return {
        status: 'success',
        result,
        logs: ctx._getLogs(),
        durationMs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        logs: ctx._getLogs(),
        durationMs,
      };
    }
  };
}
```

- [ ] **Step 5: Create index.ts**

`packages/next/src/index.ts`:
```ts
// Re-export core functions for users
export { Registry } from '@pingback/core';
export type { Context, FunctionOptions } from '@pingback/core';

import { Registry } from '@pingback/core';

// Global registry instance
const globalRegistry = new Registry();

export function cron(
  name: string,
  schedule: string,
  handler: Parameters<Registry['cron']>[2],
  options?: Parameters<Registry['cron']>[3],
) {
  return globalRegistry.cron(name, schedule, handler, options);
}

export function task(
  name: string,
  handler: Parameters<Registry['task']>[1],
  options?: Parameters<Registry['task']>[2],
) {
  return globalRegistry.task(name, handler, options);
}

export function defineConfig(config: {
  apiKey: string;
  signingSecret: string;
}) {
  return config;
}

export { globalRegistry as _registry };
export { createHandler } from './handler';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/next && npx jest tests/handler.test.ts`
Expected: all 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/next/
git commit -m "feat(next): add route handler with signature verification and function dispatch"
```

---

## Task 18: @pingback/next — Build Plugin

**Files:**
- Create: `packages/next/src/plugin.ts`
- Create: `packages/next/tests/plugin.test.ts`

- [ ] **Step 1: Write failing test**

`packages/next/tests/plugin.test.ts`:
```ts
import { extractFunctions } from '../src/plugin';

describe('extractFunctions', () => {
  test('extracts cron function metadata from source', () => {
    const source = `
      import { cron } from "@pingback/next";
      export const sendEmails = cron("send-emails", "*/15 * * * *", async (ctx) => {
        return { done: true };
      }, { retries: 3, timeout: "60s", concurrency: 1 });
    `;

    const functions = extractFunctions(source);
    expect(functions).toHaveLength(1);
    expect(functions[0]).toEqual({
      name: 'send-emails',
      type: 'cron',
      schedule: '*/15 * * * *',
      options: { retries: 3, timeout: '60s', concurrency: 1 },
    });
  });

  test('extracts task function metadata', () => {
    const source = `
      import { task } from "@pingback/next";
      export const sendEmail = task("send-email", async (ctx, payload) => {
        return { sent: true };
      }, { retries: 2, timeout: "15s" });
    `;

    const functions = extractFunctions(source);
    expect(functions).toHaveLength(1);
    expect(functions[0]).toEqual({
      name: 'send-email',
      type: 'task',
      schedule: undefined,
      options: { retries: 2, timeout: '15s' },
    });
  });

  test('extracts multiple functions from one file', () => {
    const source = `
      import { cron, task } from "@pingback/next";
      export const job1 = cron("job-1", "* * * * *", async () => {});
      export const job2 = cron("job-2", "0 * * * *", async () => {}, { retries: 1 });
    `;

    const functions = extractFunctions(source);
    expect(functions).toHaveLength(2);
  });

  test('skips non-string-literal names', () => {
    const source = `
      import { cron } from "@pingback/next";
      const name = "dynamic";
      export const job = cron(name, "* * * * *", async () => {});
    `;

    const functions = extractFunctions(source);
    expect(functions).toHaveLength(0);
  });

  test('returns empty for files without pingback imports', () => {
    const source = `
      export function hello() { return "world"; }
    `;

    const functions = extractFunctions(source);
    expect(functions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/next && npx jest tests/plugin.test.ts`
Expected: FAIL — cannot find `../src/plugin`

- [ ] **Step 3: Implement plugin**

`packages/next/src/plugin.ts`:
```ts
import type { FunctionOptions } from '@pingback/core';

interface ExtractedFunction {
  name: string;
  type: 'cron' | 'task';
  schedule?: string;
  options: FunctionOptions;
}

export function extractFunctions(source: string): ExtractedFunction[] {
  const results: ExtractedFunction[] = [];

  // Check if file imports from @pingback/next
  if (!source.includes('@pingback/next')) {
    return results;
  }

  // Match cron("name", "schedule", handler, options?)
  const cronRegex = /cron\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}(?:\s*,\s*(\{[^}]*\}))?\s*\)/g;
  let match;

  while ((match = cronRegex.exec(source)) !== null) {
    const options = match[3] ? parseOptions(match[3]) : {};
    results.push({
      name: match[1],
      type: 'cron',
      schedule: match[2],
      options,
    });
  }

  // Match task("name", handler, options?)
  const taskRegex = /task\(\s*"([^"]+)"\s*,\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}(?:\s*,\s*(\{[^}]*\}))?\s*\)/g;

  while ((match = taskRegex.exec(source)) !== null) {
    const options = match[2] ? parseOptions(match[2]) : {};
    results.push({
      name: match[1],
      type: 'task',
      schedule: undefined,
      options,
    });
  }

  return results;
}

function parseOptions(optStr: string): FunctionOptions {
  try {
    // Simple JSON-like parsing for static objects
    const normalized = optStr
      .replace(/(\w+)\s*:/g, '"$1":')
      .replace(/'/g, '"');
    return JSON.parse(normalized);
  } catch {
    return {};
  }
}

export function withPingback(nextConfig: any = {}): any {
  return {
    ...nextConfig,
    webpack(config: any, options: any) {
      // TODO: Add webpack plugin for AST scanning and route generation
      // For MVP, the plugin will:
      // 1. Scan source files for cron()/task() calls
      // 2. Call POST /api/v1/register at build time
      // 3. Generate the /api/__pingback route handler

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }
      return config;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/next && npx jest tests/plugin.test.ts`
Expected: all 5 tests PASS

- [ ] **Step 5: Run all @pingback/next tests**

Run: `cd packages/next && npx jest`
Expected: all 9 tests PASS (handler: 4, plugin: 5)

- [ ] **Step 6: Commit**

```bash
git add packages/next/src/plugin.ts packages/next/tests/plugin.test.ts
git commit -m "feat(next): add build plugin with static analysis for cron/task extraction"
```

---

## Task 19: Dashboard Stub

**Files:**
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/tsconfig.json`

- [ ] **Step 1: Create dashboard stub**

`apps/dashboard/package.json`:
```json
{
  "name": "@pingback/dashboard",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^19.0.0"
  }
}
```

`apps/dashboard/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "plugins": [{ "name": "next" }]
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/
git commit -m "chore: stub dashboard package (Phase 3)"
```

---

## Task 20: Integration Smoke Test

**Files:**
- Create: `test/integration/smoke.test.ts`

This test verifies the full flow: register functions → scheduler enqueues → worker dispatches → execution recorded.

- [ ] **Step 1: Write integration test**

`test/integration/smoke.test.ts`:
```ts
/**
 * Integration smoke test.
 * Requires: PostgreSQL running on DATABASE_URL, Redis running on REDIS_URL.
 *
 * Tests the full flow:
 * 1. Create user + project + API key
 * 2. Register a function via SDK endpoint
 * 3. Trigger an immediate run
 * 4. Verify execution is created
 */
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';

// This test imports the platform app module
// Worker is tested separately
describe('Smoke: Full Registration + Trigger Flow', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Dynamically import to avoid workspace issues
    const { AppModule } = require('../../apps/platform/src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes the full registration → trigger → execution flow', async () => {
    // 1. Register user
    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'smoke@example.com', password: 'StrongPass123!', name: 'Smoke' })
      .expect(201);
    const cookie = authRes.headers['set-cookie'][0];

    // 2. Create project
    const projRes = await request(app.getHttpServer())
      .post('/api/v1/projects')
      .set('Cookie', cookie)
      .send({ name: 'smoke-proj', endpointUrl: 'https://example.com/api/__pingback' })
      .expect(201);
    expect(projRes.body.cronSecret).toBeDefined();

    // 3. Create API key
    const keyRes = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projRes.body.id}/keys`)
      .set('Cookie', cookie)
      .send({ name: 'smoke-key' })
      .expect(201);

    // 4. Register functions via SDK endpoint
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/register')
      .set('Authorization', `Bearer ${keyRes.body.rawKey}`)
      .send({
        project_id: projRes.body.id,
        functions: [{
          name: 'smoke-job',
          type: 'cron',
          schedule: '*/15 * * * *',
          options: { retries: 1, timeout: '30s' },
        }],
      })
      .expect(200);
    expect(regRes.body.jobs).toHaveLength(1);
    expect(regRes.body.jobs[0].status).toBe('active');

    // 5. Verify job exists
    const jobsRes = await request(app.getHttpServer())
      .get(`/api/v1/jobs?projectId=${projRes.body.id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(jobsRes.body).toHaveLength(1);
    const jobId = jobsRes.body[0].id;

    // 6. Trigger immediate run
    const triggerRes = await request(app.getHttpServer())
      .post(`/api/v1/jobs/${jobId}/trigger`)
      .set('Cookie', cookie)
      .expect(201);
    expect(triggerRes.body.status).toBe('pending');

    // 7. Verify execution exists
    const execRes = await request(app.getHttpServer())
      .get(`/api/v1/jobs/${jobId}/executions`)
      .set('Cookie', cookie)
      .expect(200);
    expect(execRes.body.length).toBeGreaterThanOrEqual(1);
    expect(execRes.body[0].status).toBe('pending');
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npx jest test/integration/smoke.test.ts`
Expected: PASS — full flow works end to end

- [ ] **Step 3: Commit**

```bash
git add test/
git commit -m "test: add integration smoke test for full registration → trigger flow"
```

---

## Summary

| Task | Component | What it delivers |
|------|-----------|-----------------|
| 1 | Monorepo | npm workspaces, shared types, git repo |
| 2 | @pingback/core | Function registry |
| 3 | @pingback/core | Context object with log + task stub |
| 4 | @pingback/core | HMAC signing + verification |
| 5 | @pingback/core | Registration API client |
| 6 | Platform | NestJS scaffold + all TypeORM entities |
| 7 | Platform | Auth (JWT + email/password + API key guard) |
| 8 | Platform | Projects CRUD |
| 9 | Platform | API Keys CRUD |
| 10 | Platform | Jobs CRUD with cron parsing |
| 11 | Platform | Executions listing + detail |
| 12 | Platform | SDK registration endpoint |
| 13 | Platform | Immediate job trigger |
| 14 | Platform | Scheduler (10s tick loop) |
| 15 | Platform | Alerts CRUD + evaluation |
| 16 | Worker | BullMQ dispatcher + signing + retries + alerts |
| 17 | @pingback/next | Route handler |
| 18 | @pingback/next | Build plugin (AST extraction) |
| 19 | Dashboard | Stub package |
| 20 | Integration | Smoke test for full flow |
