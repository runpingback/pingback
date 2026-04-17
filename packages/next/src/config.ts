import { existsSync } from 'fs';
import { join } from 'path';

export interface PingbackConfig {
  apiKey: string;
  baseUrl?: string;
  platformUrl: string;
  routePath: string;
  functionsDir: string;
}

interface PingbackUserConfig {
  apiKey: string;
  baseUrl?: string;
  platformUrl?: string;
  routePath?: string;
  functionsDir?: string;
}

const DEFAULTS = {
  platformUrl: 'https://api.pingback.dev',
  routePath: '/api/__pingback',
  functionsDir: 'lib/pingback/**/*.{ts,js}',
};

export function defineConfig(userConfig: PingbackUserConfig): PingbackConfig {
  if (!userConfig.apiKey) {
    throw new Error('apiKey is required in pingback config');
  }
  return {
    apiKey: userConfig.apiKey,
    baseUrl: userConfig.baseUrl,
    platformUrl: userConfig.platformUrl || DEFAULTS.platformUrl,
    routePath: userConfig.routePath || DEFAULTS.routePath,
    functionsDir: userConfig.functionsDir || DEFAULTS.functionsDir,
  };
}

export async function loadConfig(projectRoot: string): Promise<PingbackConfig> {
  const candidates = [
    join(projectRoot, 'pingback.config.ts'),
    join(projectRoot, 'pingback.config.js'),
  ];
  for (const configPath of candidates) {
    if (existsSync(configPath)) {
      const mod = await import(configPath);
      return mod.default || mod;
    }
  }
  throw new Error(
    'No pingback config file found. Create pingback.config.ts in your project root.',
  );
}
