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

    return response.json() as Promise<RegistrationResponse>;
  }
}
