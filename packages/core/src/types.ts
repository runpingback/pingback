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
  payload?: any;
}

export interface TaskRequest {
  name: string;
  payload: any;
}

export interface ExecutionResult {
  status: 'success' | 'error';
  result?: unknown;
  error?: string;
  logs: LogEntry[];
  tasks: TaskRequest[];
  durationMs: number;
}
