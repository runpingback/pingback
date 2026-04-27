export class PingbackClient {
  private platformUrl: string;
  private apiKey: string;

  constructor(options: { apiKey: string; platformUrl?: string }) {
    this.apiKey = options.apiKey;
    this.platformUrl = options.platformUrl || 'https://api.pingback.lol';
  }

  async trigger(
    taskName: string,
    payload?: any,
    options?: { delay?: number | string },
  ): Promise<{ executionId: string; scheduledAt: string }> {
    const body: Record<string, any> = { task: taskName };
    if (payload !== undefined) {
      body.payload = payload;
    }
    if (options?.delay !== undefined) {
      body.delay = options.delay;
    }

    const response = await fetch(`${this.platformUrl}/api/v1/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to trigger task "${taskName}" (${response.status}): ${text}`);
    }

    return response.json() as Promise<{ executionId: string; scheduledAt: string }>;
  }
}
