# @pingback/next Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `@pingback/next` package — a Next.js adapter that lets developers define cron/task functions, auto-generates a route handler, and registers with the Pingback platform at build time.

**Architecture:** Thin adapter over `@pingback/core`. Shared `Registry` instance populated by `cron()`/`task()` calls. `withPingback()` config wrapper handles build-time file discovery, route generation, and API registration. `createRouteHandler()` handles runtime HMAC verification and function dispatch.

**Tech Stack:** TypeScript, `@pingback/core`, `glob` (file discovery), `next` (peer dep)

---

## File Map

### New files

**Task 1 — Package scaffold:**
- `packages/next/package.json`
- `packages/next/tsconfig.json`
- `packages/next/jest.config.js`

**Task 2 — Functions (cron/task wrappers):**
- `packages/next/src/functions.ts`
- `packages/next/tests/functions.test.ts`

**Task 3 — Config:**
- `packages/next/src/config.ts`
- `packages/next/tests/config.test.ts`

**Task 4 — Route handler:**
- `packages/next/src/handler.ts`
- `packages/next/tests/handler.test.ts`

**Task 5 — Build-time registration:**
- `packages/next/src/register.ts`
- `packages/next/tests/register.test.ts`

**Task 6 — Plugin (withPingback):**
- `packages/next/src/plugin.ts`
- `packages/next/tests/plugin.test.ts`

**Task 7 — Public API (index.ts):**
- `packages/next/src/index.ts`

**Task 8 — Platform changes (optional project_id):**
- Modify: `packages/core/src/registration.ts`
- Modify: `apps/platform/src/modules/projects/dto/register.dto.ts`
- Modify: `apps/platform/src/modules/projects/registration.controller.ts`
- Modify: `apps/platform/src/modules/projects/registration.service.spec.ts`

---

## Task 1: Package Scaffold

**Files:**
- Create: `packages/next/package.json`
- Create: `packages/next/tsconfig.json`
- Create: `packages/next/jest.config.js`

- [ ] **Step 1: Create package.json**

Create `packages/next/package.json`:
```json
{
  "name": "@pingback/next",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./handler": {
      "types": "./dist/handler.d.ts",
      "default": "./dist/handler.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  },
  "dependencies": {
    "@pingback/core": "0.0.1",
    "glob": "^11.0.0"
  },
  "peerDependencies": {
    "next": ">=14"
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

- [ ] **Step 2: Create tsconfig.json**

Create `packages/next/tsconfig.json`:
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

- [ ] **Step 3: Create jest.config.js**

Create `packages/next/jest.config.js`:
```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
```

- [ ] **Step 4: Install dependencies**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback && npm install`
Expected: Clean install, `@pingback/next` workspace resolved

- [ ] **Step 5: Commit**

```bash
git add packages/next/package.json packages/next/tsconfig.json packages/next/jest.config.js package-lock.json
git commit -m "chore: scaffold @pingback/next package"
```

---

## Task 2: Functions (cron/task Wrappers)

**Files:**
- Create: `packages/next/src/functions.ts`
- Create: `packages/next/tests/functions.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/next/tests/functions.test.ts`:
```typescript
import { cron, task, registry } from '../src/functions';

describe('functions', () => {
  beforeEach(() => {
    // Reset registry between tests by clearing its internal map
    // We access it through the public API
    (registry as any).functions = new Map();
  });

  describe('cron', () => {
    it('should register a cron function in the shared registry', () => {
      const handler = async () => ({ done: true });
      const result = cron('send-emails', '*/15 * * * *', handler, { retries: 3 });

      expect(result).toEqual({ name: 'send-emails', type: 'cron' });

      const registered = registry.get('send-emails');
      expect(registered).toBeDefined();
      expect(registered!.type).toBe('cron');
      expect(registered!.schedule).toBe('*/15 * * * *');
      expect(registered!.options.retries).toBe(3);
      expect(registered!.handler).toBe(handler);
    });

    it('should work with default options', () => {
      cron('simple-job', '0 * * * *', async () => {});

      const registered = registry.get('simple-job');
      expect(registered).toBeDefined();
      expect(registered!.options).toEqual({});
    });
  });

  describe('task', () => {
    it('should register a task function in the shared registry', () => {
      const handler = async () => ({ sent: true });
      const result = task('send-single-email', handler, { retries: 2, timeout: '15s' });

      expect(result).toEqual({ name: 'send-single-email', type: 'task' });

      const registered = registry.get('send-single-email');
      expect(registered).toBeDefined();
      expect(registered!.type).toBe('task');
      expect(registered!.schedule).toBeUndefined();
      expect(registered!.options.retries).toBe(2);
      expect(registered!.options.timeout).toBe('15s');
    });
  });

  describe('shared registry', () => {
    it('should accumulate functions across multiple calls', () => {
      cron('job-a', '* * * * *', async () => {});
      cron('job-b', '0 * * * *', async () => {});
      task('task-c', async () => {});

      const all = registry.getAll();
      expect(all).toHaveLength(3);
    });

    it('should expose metadata without handlers', () => {
      cron('my-cron', '*/5 * * * *', async () => {}, { retries: 1 });

      const metadata = registry.getMetadata();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toEqual({
        name: 'my-cron',
        type: 'cron',
        schedule: '*/5 * * * *',
        options: { retries: 1 },
      });
      expect(metadata[0]).not.toHaveProperty('handler');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/functions.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../src/functions'`

- [ ] **Step 3: Implement functions.ts**

Create `packages/next/src/functions.ts`:
```typescript
import { Registry, FunctionOptions } from '@pingback/core';
import type { Context } from '@pingback/core';

export const registry = new Registry();

type Handler = (ctx: Context, payload?: any) => Promise<unknown>;

export function cron(
  name: string,
  schedule: string,
  handler: Handler,
  options: FunctionOptions = {},
) {
  return registry.cron(name, schedule, handler, options);
}

export function task(
  name: string,
  handler: Handler,
  options: FunctionOptions = {},
) {
  return registry.task(name, handler, options);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/functions.test.ts --no-cache`
Expected: All 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/next/src/functions.ts packages/next/tests/functions.test.ts
git commit -m "feat(next): add cron() and task() wrapper functions with shared registry"
```

---

## Task 3: Config

**Files:**
- Create: `packages/next/src/config.ts`
- Create: `packages/next/tests/config.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/next/tests/config.test.ts`:
```typescript
import { defineConfig, loadConfig, PingbackConfig } from '../src/config';

describe('config', () => {
  describe('defineConfig', () => {
    it('should return config with defaults applied', () => {
      const config = defineConfig({ apiKey: 'pb_live_test123' });

      expect(config.apiKey).toBe('pb_live_test123');
      expect(config.platformUrl).toBe('https://api.pingback.dev');
      expect(config.routePath).toBe('/api/__pingback');
      expect(config.functionsDir).toBe('lib/pingback/**/*.{ts,js}');
    });

    it('should allow overriding defaults', () => {
      const config = defineConfig({
        apiKey: 'pb_live_test123',
        baseUrl: 'https://myapp.com',
        platformUrl: 'http://localhost:4000',
        routePath: '/api/cron',
        functionsDir: 'src/jobs/**/*.ts',
      });

      expect(config.baseUrl).toBe('https://myapp.com');
      expect(config.platformUrl).toBe('http://localhost:4000');
      expect(config.routePath).toBe('/api/cron');
      expect(config.functionsDir).toBe('src/jobs/**/*.ts');
    });

    it('should throw if apiKey is missing', () => {
      expect(() => defineConfig({ apiKey: '' })).toThrow('apiKey is required');
      expect(() => defineConfig({} as any)).toThrow('apiKey is required');
    });
  });

  describe('loadConfig', () => {
    it('should throw if no config file is found', async () => {
      await expect(loadConfig('/nonexistent/path')).rejects.toThrow(
        'No pingback config file found',
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/config.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../src/config'`

- [ ] **Step 3: Implement config.ts**

Create `packages/next/src/config.ts`:
```typescript
import { existsSync } from 'fs';
import { join } from 'path';

export interface PingbackConfig {
  apiKey: string;
  baseUrl?: string;
  platformUrl: string;
  routePath: string;
  functionsDir: string;
}

interface PingbackUserConfig {
  apiKey: string;
  baseUrl?: string;
  platformUrl?: string;
  routePath?: string;
  functionsDir?: string;
}

const DEFAULTS = {
  platformUrl: 'https://api.pingback.dev',
  routePath: '/api/__pingback',
  functionsDir: 'lib/pingback/**/*.{ts,js}',
};

export function defineConfig(userConfig: PingbackUserConfig): PingbackConfig {
  if (!userConfig.apiKey) {
    throw new Error('apiKey is required in pingback config');
  }

  return {
    apiKey: userConfig.apiKey,
    baseUrl: userConfig.baseUrl,
    platformUrl: userConfig.platformUrl || DEFAULTS.platformUrl,
    routePath: userConfig.routePath || DEFAULTS.routePath,
    functionsDir: userConfig.functionsDir || DEFAULTS.functionsDir,
  };
}

export async function loadConfig(projectRoot: string): Promise<PingbackConfig> {
  const candidates = [
    join(projectRoot, 'pingback.config.ts'),
    join(projectRoot, 'pingback.config.js'),
  ];

  for (const configPath of candidates) {
    if (existsSync(configPath)) {
      const mod = await import(configPath);
      return mod.default || mod;
    }
  }

  throw new Error(
    'No pingback config file found. Create pingback.config.ts in your project root.',
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/config.test.ts --no-cache`
Expected: All 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/next/src/config.ts packages/next/tests/config.test.ts
git commit -m "feat(next): add defineConfig and loadConfig with defaults"
```

---

## Task 4: Route Handler

**Files:**
- Create: `packages/next/src/handler.ts`
- Create: `packages/next/tests/handler.test.ts`

**Important context:** The platform worker signs requests with `createHmac('sha256', cronSecret).update(`${timestamp}.${body}`).digest('hex')` — it concatenates timestamp + "." + body. The core's `verifySignature` uses a different format (signs just the payload without timestamp prefix). The handler must match the **worker's** signing format, so we implement verification directly rather than using core's `verifySignature`.

- [ ] **Step 1: Write failing tests**

Create `packages/next/tests/handler.test.ts`:
```typescript
import { createHmac } from 'crypto';
import { createRouteHandler } from '../src/handler';
import { registry } from '../src/functions';

// Helper to create a signed request matching the worker's format
function signBody(body: string, timestamp: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}

// Helper to create a mock Request
function mockRequest(body: object, secret: string): Request {
  const bodyStr = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBody(bodyStr, timestamp, secret);

  return new Request('http://localhost/api/__pingback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pingback-Signature': signature,
      'X-Pingback-Timestamp': timestamp,
    },
    body: bodyStr,
  });
}

describe('createRouteHandler', () => {
  const TEST_SECRET = 'test-cron-secret-123';

  beforeEach(() => {
    (registry as any).functions = new Map();
    process.env.PINGBACK_CRON_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    delete process.env.PINGBACK_CRON_SECRET;
  });

  it('should return 200 with success result for a valid request', async () => {
    registry.cron('send-emails', '*/15 * * * *', async (ctx) => {
      ctx.log('processing');
      return { processed: 5 };
    });

    const handler = createRouteHandler();
    const req = mockRequest(
      {
        function: 'send-emails',
        executionId: 'exec-1',
        attempt: 1,
        scheduledAt: '2026-04-17T12:00:00.000Z',
      },
      TEST_SECRET,
    );

    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('success');
    expect(data.result).toEqual({ processed: 5 });
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].message).toBe('processing');
    expect(data.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should return 500 with error when handler throws', async () => {
    registry.cron('failing-job', '* * * * *', async () => {
      throw new Error('Something broke');
    });

    const handler = createRouteHandler();
    const req = mockRequest(
      {
        function: 'failing-job',
        executionId: 'exec-2',
        attempt: 1,
        scheduledAt: '2026-04-17T12:00:00.000Z',
      },
      TEST_SECRET,
    );

    const res = await handler(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.status).toBe('error');
    expect(data.error).toBe('Something broke');
  });

  it('should return 401 for invalid signature', async () => {
    registry.cron('my-job', '* * * * *', async () => {});

    const handler = createRouteHandler();
    const bodyStr = JSON.stringify({
      function: 'my-job',
      executionId: 'exec-3',
      attempt: 1,
      scheduledAt: '2026-04-17T12:00:00.000Z',
    });

    const req = new Request('http://localhost/api/__pingback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pingback-Signature': 'invalid-signature',
        'X-Pingback-Timestamp': Math.floor(Date.now() / 1000).toString(),
      },
      body: bodyStr,
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('should return 404 for unknown function', async () => {
    const handler = createRouteHandler();
    const req = mockRequest(
      {
        function: 'nonexistent',
        executionId: 'exec-4',
        attempt: 1,
        scheduledAt: '2026-04-17T12:00:00.000Z',
      },
      TEST_SECRET,
    );

    const res = await handler(req);
    expect(res.status).toBe(404);
  });

  it('should return 401 when PINGBACK_CRON_SECRET is not set', async () => {
    delete process.env.PINGBACK_CRON_SECRET;
    registry.cron('my-job', '* * * * *', async () => {});

    const handler = createRouteHandler();
    const req = mockRequest(
      {
        function: 'my-job',
        executionId: 'exec-5',
        attempt: 1,
        scheduledAt: '2026-04-17T12:00:00.000Z',
      },
      TEST_SECRET,
    );

    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('should return 401 for expired timestamp', async () => {
    registry.cron('my-job', '* * * * *', async () => {});

    const handler = createRouteHandler();
    const bodyStr = JSON.stringify({
      function: 'my-job',
      executionId: 'exec-6',
      attempt: 1,
      scheduledAt: '2026-04-17T12:00:00.000Z',
    });
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 min ago
    const signature = signBody(bodyStr, oldTimestamp, TEST_SECRET);

    const req = new Request('http://localhost/api/__pingback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pingback-Signature': signature,
        'X-Pingback-Timestamp': oldTimestamp,
      },
      body: bodyStr,
    });

    const res = await handler(req);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/handler.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../src/handler'`

- [ ] **Step 3: Implement handler.ts**

Create `packages/next/src/handler.ts`:
```typescript
import { createHmac, timingSafeEqual } from 'crypto';
import { createContext } from '@pingback/core';
import type { ContextWithLogs, ExecutionPayload } from '@pingback/core';
import { registry } from './functions';

function verifyWorkerSignature(
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

export function createRouteHandler() {
  return async function POST(request: Request): Promise<Response> {
    const secret = process.env.PINGBACK_CRON_SECRET;
    if (!secret) {
      return Response.json(
        { error: 'PINGBACK_CRON_SECRET not configured' },
        { status: 401 },
      );
    }

    const body = await request.text();
    const signature = request.headers.get('X-Pingback-Signature') || '';
    const timestamp = request.headers.get('X-Pingback-Timestamp') || '';

    if (!verifyWorkerSignature(body, signature, timestamp, secret)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: ExecutionPayload = JSON.parse(body);
    const definition = registry.get(payload.function);

    if (!definition) {
      return Response.json(
        { error: `Function "${payload.function}" not found` },
        { status: 404 },
      );
    }

    const ctx = createContext(payload) as ContextWithLogs;
    const start = Date.now();

    try {
      const result = await definition.handler(ctx);
      const durationMs = Date.now() - start;

      return Response.json({
        status: 'success',
        result,
        logs: ctx._getLogs(),
        durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - start;

      return Response.json(
        {
          status: 'error',
          error: (err as Error).message,
          logs: ctx._getLogs(),
          durationMs,
        },
        { status: 500 },
      );
    }
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/handler.test.ts --no-cache`
Expected: All 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/next/src/handler.ts packages/next/tests/handler.test.ts
git commit -m "feat(next): add route handler with HMAC verification and function dispatch"
```

---

## Task 5: Build-time Registration

**Files:**
- Create: `packages/next/src/register.ts`
- Create: `packages/next/tests/register.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/next/tests/register.test.ts`:
```typescript
import { registerFunctions } from '../src/register';
import { registry } from '../src/functions';
import type { PingbackConfig } from '../src/config';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('registerFunctions', () => {
  const baseConfig: PingbackConfig = {
    apiKey: 'pb_live_test123',
    platformUrl: 'http://localhost:4000',
    routePath: '/api/__pingback',
    functionsDir: 'lib/pingback/**/*.{ts,js}',
  };

  beforeEach(() => {
    (registry as any).functions = new Map();
    mockFetch.mockReset();
  });

  it('should call the registration API with collected metadata', async () => {
    // Pre-populate registry (simulating what happens when function files are evaluated)
    registry.cron('send-emails', '*/15 * * * *', async () => {}, { retries: 3 });
    registry.task('send-single', async () => {}, { retries: 2, timeout: '15s' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        jobs: [
          { name: 'send-emails', status: 'active' },
          { name: 'send-single', status: 'active' },
        ],
      }),
    });

    const result = await registerFunctions(baseConfig);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/v1/register');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer pb_live_test123');

    const body = JSON.parse(options.body);
    expect(body.functions).toHaveLength(2);
    expect(body.functions[0].name).toBe('send-emails');
    expect(body.functions[0].type).toBe('cron');
    expect(body.functions[0].schedule).toBe('*/15 * * * *');
    expect(body.functions[1].name).toBe('send-single');
    expect(body.functions[1].type).toBe('task');

    expect(result.jobs).toHaveLength(2);
  });

  it('should include endpoint URL from baseUrl config', async () => {
    registry.cron('job-1', '* * * * *', async () => {});

    const config = { ...baseConfig, baseUrl: 'https://myapp.vercel.app' };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [{ name: 'job-1', status: 'active' }] }),
    });

    await registerFunctions(config);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.endpoint_url).toBe('https://myapp.vercel.app/api/__pingback');
  });

  it('should infer baseUrl from VERCEL_URL env var', async () => {
    process.env.VERCEL_URL = 'my-app-abc123.vercel.app';
    registry.cron('job-1', '* * * * *', async () => {});

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [{ name: 'job-1', status: 'active' }] }),
    });

    await registerFunctions(baseConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.endpoint_url).toBe('https://my-app-abc123.vercel.app/api/__pingback');

    delete process.env.VERCEL_URL;
  });

  it('should throw on registration failure', async () => {
    registry.cron('job-1', '* * * * *', async () => {});

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(registerFunctions(baseConfig)).rejects.toThrow(
      'Registration failed (401)',
    );
  });

  it('should skip registration if no functions are registered', async () => {
    const result = await registerFunctions(baseConfig);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.jobs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/register.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../src/register'`

- [ ] **Step 3: Implement register.ts**

Create `packages/next/src/register.ts`:
```typescript
import { registry } from './functions';
import type { PingbackConfig } from './config';

interface RegistrationResult {
  jobs: Array<{ name: string; status: string }>;
}

export async function registerFunctions(
  config: PingbackConfig,
): Promise<RegistrationResult> {
  const metadata = registry.getMetadata();

  if (metadata.length === 0) {
    return { jobs: [] };
  }

  const baseUrl =
    config.baseUrl ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    'http://localhost:3000';

  const endpointUrl = `${baseUrl}${config.routePath}`;

  const response = await fetch(`${config.platformUrl}/api/v1/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      functions: metadata,
      endpoint_url: endpointUrl,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Registration failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<RegistrationResult>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/register.test.ts --no-cache`
Expected: All 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/next/src/register.ts packages/next/tests/register.test.ts
git commit -m "feat(next): add build-time registration with platform API"
```

---

## Task 6: Plugin (withPingback)

**Files:**
- Create: `packages/next/src/plugin.ts`
- Create: `packages/next/tests/plugin.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/next/tests/plugin.test.ts`:
```typescript
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { generateRouteFile, discoverFunctionFiles } from '../src/plugin';

describe('plugin', () => {
  const tmpDir = join(__dirname, '__tmp_plugin_test__');

  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('discoverFunctionFiles', () => {
    it('should find .ts files matching the glob pattern', async () => {
      const pingbackDir = join(tmpDir, 'lib', 'pingback');
      mkdirSync(pingbackDir, { recursive: true });
      writeFileSync(
        join(pingbackDir, 'emails.ts'),
        'import { cron } from "@pingback/next";\nexport const job = cron("x", "* * * * *", async () => {});',
      );
      writeFileSync(
        join(pingbackDir, 'sync.ts'),
        'import { task } from "@pingback/next";\nexport const t = task("y", async () => {});',
      );
      // This file doesn't import @pingback/next — should be excluded
      writeFileSync(
        join(pingbackDir, 'utils.ts'),
        'export function helper() { return 1; }',
      );

      const files = await discoverFunctionFiles(tmpDir, 'lib/pingback/**/*.{ts,js}');

      expect(files).toHaveLength(2);
      expect(files.map((f) => f.replace(tmpDir + '/', ''))).toEqual(
        expect.arrayContaining(['lib/pingback/emails.ts', 'lib/pingback/sync.ts']),
      );
    });

    it('should return empty array if no files match', async () => {
      const files = await discoverFunctionFiles(tmpDir, 'lib/pingback/**/*.{ts,js}');
      expect(files).toEqual([]);
    });
  });

  describe('generateRouteFile', () => {
    it('should create the route file with correct imports', () => {
      const appDir = join(tmpDir, 'app');
      mkdirSync(appDir, { recursive: true });

      const functionFiles = [
        join(tmpDir, 'lib', 'pingback', 'emails.ts'),
        join(tmpDir, 'lib', 'pingback', 'sync.ts'),
      ];

      generateRouteFile(tmpDir, '/api/__pingback', functionFiles);

      const routePath = join(tmpDir, 'app', 'api', '__pingback', 'route.ts');
      expect(existsSync(routePath)).toBe(true);

      const content = readFileSync(routePath, 'utf-8');
      expect(content).toContain('AUTO-GENERATED BY @pingback/next');
      expect(content).toContain('import { createRouteHandler } from "@pingback/next/handler"');
      expect(content).toContain('export const POST = createRouteHandler()');
      // Should have relative imports to the function files
      expect(content).toContain('lib/pingback/emails');
      expect(content).toContain('lib/pingback/sync');
    });

    it('should handle custom route paths', () => {
      const appDir = join(tmpDir, 'app');
      mkdirSync(appDir, { recursive: true });

      generateRouteFile(tmpDir, '/api/cron', []);

      const routePath = join(tmpDir, 'app', 'api', 'cron', 'route.ts');
      expect(existsSync(routePath)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/plugin.test.ts --no-cache`
Expected: FAIL — `Cannot find module '../src/plugin'`

- [ ] **Step 3: Implement plugin.ts**

Create `packages/next/src/plugin.ts`:
```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { glob } from 'glob';
import { loadConfig } from './config';
import { registerFunctions } from './register';

export async function discoverFunctionFiles(
  projectRoot: string,
  pattern: string,
): Promise<string[]> {
  const files = await glob(pattern, { cwd: projectRoot, absolute: true });

  return files.filter((file) => {
    const content = readFileSync(file, 'utf-8');
    return content.includes('@pingback/next');
  });
}

export function generateRouteFile(
  projectRoot: string,
  routePath: string,
  functionFiles: string[],
): void {
  // Convert /api/__pingback to app/api/__pingback/route.ts
  const routeDir = join(projectRoot, 'app', ...routePath.split('/').filter(Boolean));
  mkdirSync(routeDir, { recursive: true });

  const routeFilePath = join(routeDir, 'route.ts');
  const relativeToRoute = (absPath: string) => {
    const rel = relative(routeDir, absPath);
    // Remove .ts/.js extension for imports
    return rel.replace(/\.(ts|js)$/, '');
  };

  const imports = functionFiles
    .map((f) => `import "${relativeToRoute(f)}";`)
    .join('\n');

  const content = `// AUTO-GENERATED BY @pingback/next — do not edit
import { createRouteHandler } from "@pingback/next/handler";
${imports}

export const POST = createRouteHandler();
`;

  writeFileSync(routeFilePath, content);
}

export function withPingback(nextConfig: any = {}): any {
  const originalWebpack = nextConfig.webpack;

  return {
    ...nextConfig,
    webpack(config: any, context: any) {
      // Only run during server build, not client
      if (context.isServer && !context.dev) {
        // Run as a side effect during build — webpack hook gives us the right timing
        runPingbackBuild(context.dir).catch((err) => {
          console.error('[pingback] Build failed:', err.message);
        });
      }

      if (originalWebpack) {
        return originalWebpack(config, context);
      }
      return config;
    },
  };
}

async function runPingbackBuild(projectRoot: string): Promise<void> {
  const config = await loadConfig(projectRoot);
  const files = await discoverFunctionFiles(projectRoot, config.functionsDir);

  console.log(`[pingback] Found ${files.length} function file(s)`);

  // Generate route handler file
  generateRouteFile(projectRoot, config.routePath, files);
  console.log(`[pingback] Generated route handler at app${config.routePath}/route.ts`);

  // Check gitignore
  const routeDir = `app${config.routePath}`;
  const gitignorePath = join(projectRoot, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes(routeDir)) {
      console.warn(
        `[pingback] Warning: Add "${routeDir}" to your .gitignore — it's auto-generated.`,
      );
    }
  }

  // Register functions with platform
  if (files.length > 0) {
    // Import function files to populate registry
    for (const file of files) {
      try {
        await import(file);
      } catch {
        // Files may have dependencies that aren't available at build time
        // The metadata is already in the registry from the webpack compilation
      }
    }

    const result = await registerFunctions(config);
    console.log(`[pingback] Registered ${result.jobs.length} function(s) with platform`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest tests/plugin.test.ts --no-cache`
Expected: All 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/next/src/plugin.ts packages/next/tests/plugin.test.ts
git commit -m "feat(next): add withPingback() config wrapper with file discovery and route generation"
```

---

## Task 7: Public API (index.ts)

**Files:**
- Create: `packages/next/src/index.ts`

- [ ] **Step 1: Create index.ts**

Create `packages/next/src/index.ts`:
```typescript
export { cron, task } from './functions';
export { defineConfig } from './config';
export type { PingbackConfig } from './config';
export { withPingback } from './plugin';
export { createRouteHandler } from './handler';
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/next && npx jest --no-cache`
Expected: All tests pass across all test files

- [ ] **Step 4: Commit**

```bash
git add packages/next/src/index.ts
git commit -m "feat(next): add public API exports — cron, task, defineConfig, withPingback, createRouteHandler"
```

---

## Task 8: Platform Changes (Optional project_id)

The SDK registration sends the API key but no `project_id`. The platform needs to infer the project from the API key. Also the registration needs to accept `endpoint_url` to update the project's endpoint.

**Files:**
- Modify: `packages/core/src/registration.ts`
- Modify: `apps/platform/src/modules/projects/dto/register.dto.ts`
- Modify: `apps/platform/src/modules/projects/registration.controller.ts`
- Modify: `apps/platform/src/modules/projects/registration.service.ts`
- Modify: `apps/platform/src/modules/projects/registration.service.spec.ts`

- [ ] **Step 1: Make project_id optional in core's RegistrationClient**

In `packages/core/src/registration.ts`, change the `register` method:

From:
```typescript
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
```

To:
```typescript
async register(
  functions: FunctionMetadata[],
  options?: { projectId?: string; endpointUrl?: string },
): Promise<RegistrationResponse> {
  const body: Record<string, unknown> = { functions };
  if (options?.projectId) body.project_id = options.projectId;
  if (options?.endpointUrl) body.endpoint_url = options.endpointUrl;

  const response = await fetch(`${this.baseUrl}/api/v1/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    },
    body: JSON.stringify(body),
  });
```

- [ ] **Step 2: Update core's registration tests**

In `packages/core/tests/registration.test.ts`, update the test calls from `client.register('proj-1', functions)` to `client.register(functions, { projectId: 'proj-1' })`.

- [ ] **Step 3: Run core tests**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/packages/core && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 4: Make project_id optional in platform DTO**

In `apps/platform/src/modules/projects/dto/register.dto.ts`, change:

From:
```typescript
@ApiProperty({ description: 'Project ID to register functions for', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
@IsUUID()
project_id: string;
```

To:
```typescript
@ApiPropertyOptional({ description: 'Project ID — inferred from API key if omitted', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
@IsUUID()
@IsOptional()
project_id?: string;

@ApiPropertyOptional({ description: 'Endpoint URL for the route handler', example: 'https://myapp.vercel.app/api/__pingback' })
@IsString()
@IsOptional()
endpoint_url?: string;
```

- [ ] **Step 5: Update registration controller to infer project_id**

In `apps/platform/src/modules/projects/registration.controller.ts`, change:

From:
```typescript
register(@Req() req: Request, @Body() dto: SdkRegisterDto) {
  const { project } = req.user as any;
  if (project.id !== dto.project_id) {
    throw new ForbiddenException('API key does not belong to this project');
  }
  return this.registrationService.register(dto.project_id, dto.functions);
}
```

To:
```typescript
register(@Req() req: Request, @Body() dto: SdkRegisterDto) {
  const { project } = req.user as any;
  const projectId = dto.project_id || project.id;
  if (projectId !== project.id) {
    throw new ForbiddenException('API key does not belong to this project');
  }
  return this.registrationService.register(projectId, dto.functions, dto.endpoint_url);
}
```

- [ ] **Step 6: Update registration service to accept endpoint_url**

In `apps/platform/src/modules/projects/registration.service.ts`, update the `register` method signature:

From:
```typescript
async register(projectId: string, functions: FunctionMetadata[]) {
```

To:
```typescript
async register(projectId: string, functions: FunctionMetadata[], endpointUrl?: string) {
```

And add at the top of the method, after `const results`:
```typescript
// Update project endpoint URL if provided
if (endpointUrl) {
  await this.jobRepo.manager
    .getRepository('Project')
    .update(projectId, { endpointUrl });
}
```

Actually, cleaner to inject the Project repo. Change constructor to also accept the Project repository:

In the service file, add import and inject:
```typescript
import { Project } from './project.entity';

constructor(
  @InjectRepository(Job) private jobRepo: Repository<Job>,
  @InjectRepository(Project) private projectRepo: Repository<Project>,
) {}
```

Then use:
```typescript
if (endpointUrl) {
  await this.projectRepo.update(projectId, { endpointUrl });
}
```

- [ ] **Step 7: Update registration service tests**

In `apps/platform/src/modules/projects/registration.service.spec.ts`, add the Project repository mock:

Add to the beforeEach:
```typescript
let projectRepo: Record<string, jest.Mock>;

// Inside beforeEach:
projectRepo = {
  update: jest.fn().mockResolvedValue({}),
};

// In the providers array:
{ provide: getRepositoryToken(Project), useValue: projectRepo },
```

Add import for Project:
```typescript
import { Project } from './project.entity';
```

- [ ] **Step 8: Run platform tests**

Run: `cd /Users/cirx/Desktop/projects/personal/pingback/apps/platform && npx jest --no-cache`
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add packages/core/src/registration.ts packages/core/tests/registration.test.ts apps/platform/src/modules/projects/
git commit -m "feat: make project_id optional in registration, support endpoint_url update"
```
