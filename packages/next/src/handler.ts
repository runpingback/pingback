import { createHmac, timingSafeEqual } from 'crypto';
import { createContext } from '@pingback/core';
import type { ContextWithInternals, ExecutionPayload } from '@pingback/core';
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

    const ctx = createContext(payload) as ContextWithInternals;
    const start = Date.now();

    try {
      const result = await definition.handler(ctx, payload.payload);
      const durationMs = Date.now() - start;

      return Response.json({
        status: 'success',
        result,
        logs: ctx._getLogs(),
        tasks: ctx._getTasks(),
        durationMs,
      });
    } catch (err) {
      const durationMs = Date.now() - start;

      return Response.json(
        {
          status: 'error',
          error: (err as Error).message,
          logs: ctx._getLogs(),
          tasks: ctx._getTasks(),
          durationMs,
        },
        { status: 500 },
      );
    }
  };
}
