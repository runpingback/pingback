import { Registry, FunctionOptions } from '@usepingback/core';
import type { Context } from '@usepingback/core';

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
