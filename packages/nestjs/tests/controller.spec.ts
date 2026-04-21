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
    const instance = { myMethod: jest.fn().mockResolvedValue({ ok: true }) };
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
    const instance = { myTask: jest.fn().mockResolvedValue(undefined) };
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
    const instance = { failing: jest.fn().mockRejectedValue(new Error('boom')) };
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
