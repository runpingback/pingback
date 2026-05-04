import { Controller, Post, Headers, Body, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
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

@Controller('api/pingback')
export class PingbackController {
  constructor(
    @Inject(PINGBACK_OPTIONS) private options: PingbackModuleOptions,
    @Inject(PINGBACK_REGISTRY) private registry: Map<string, HandlerEntry>,
  ) {}

  @Post()
  async handleExecution(
    @Headers() headers: Record<string, string>,
    @Body() payload: ExecutionPayload,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const signature = headers['x-pingback-signature'] || '';
    const timestamp = headers['x-pingback-timestamp'] || '';
    const bodyStr = (req as any).rawBody
      ? (req as any).rawBody.toString()
      : JSON.stringify(payload);

    if (!verifySignature(bodyStr, signature, timestamp, this.options.cronSecret)) {
      res.status(401).json({ status: 'error', error: 'Invalid signature' });
      return;
    }

    const entry = this.registry.get(payload.function);
    if (!entry) {
      res.status(404).json({ status: 'error', error: `Function "${payload.function}" not found` });
      return;
    }

    const ctx = createContext(payload) as ContextWithInternals;
    const start = Date.now();

    try {
      const result = entry.metadata.type === 'task'
        ? await entry.instance[entry.methodName](ctx, payload.payload)
        : await entry.instance[entry.methodName](ctx);
      const durationMs = Date.now() - start;

      res.status(200).json({
        status: 'success',
        result,
        logs: ctx._getLogs(),
        tasks: ctx._getTasks(),
        durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - start;

      res.status(500).json({
        status: 'error',
        error: (err as Error).message,
        logs: ctx._getLogs(),
        tasks: ctx._getTasks(),
        durationMs,
      });
    }
  }
}
