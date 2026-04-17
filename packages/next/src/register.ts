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
