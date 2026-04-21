import { Context, LogEntry, LogFunction, LogLevel, ExecutionPayload, TaskRequest } from './types';

export interface ContextWithInternals extends Context {
  _getLogs(): LogEntry[];
  _getTasks(): TaskRequest[];
}

export function createContext(payload: ExecutionPayload): ContextWithInternals {
  const logs: LogEntry[] = [];
  const tasks: TaskRequest[] = [];

  function pushLog(level: LogLevel, message: string, meta?: Record<string, any>): void {
    logs.push({
      timestamp: Date.now(),
      level,
      message,
      ...(meta !== undefined ? { meta } : {}),
    });
  }

  const log: LogFunction = Object.assign(
    (message: string, meta?: Record<string, any>) => pushLog('info', message, meta),
    {
      info: (message: string, meta?: Record<string, any>) => pushLog('info', message, meta),
      warn: (message: string, meta?: Record<string, any>) => pushLog('warn', message, meta),
      error: (message: string, meta?: Record<string, any>) => pushLog('error', message, meta),
      debug: (message: string, meta?: Record<string, any>) => pushLog('debug', message, meta),
    },
  );

  return {
    executionId: payload.executionId,
    attempt: payload.attempt,
    scheduledAt: new Date(payload.scheduledAt),
    log,

    async task(name: string, taskPayload: any): Promise<void> {
      tasks.push({ name, payload: taskPayload });
    },

    _getLogs(): LogEntry[] {
      return logs;
    },

    _getTasks(): TaskRequest[] {
      return tasks;
    },
  };
}
