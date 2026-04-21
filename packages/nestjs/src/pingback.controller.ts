import { Controller, Post, Headers, Body, Inject, HttpCode } from '@nestjs/common';
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
    rawBody?: string,
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
