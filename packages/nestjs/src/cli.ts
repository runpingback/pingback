#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const cwd = process.cwd();
const command = process.argv[2];

function success(msg: string) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function info(msg: string) {
  console.log(`  \x1b[36mℹ\x1b[0m ${msg}`);
}

function error(msg: string) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
}

function loadEnv(): Record<string, string> {
  const envPath = join(cwd, '.env');
  const vars: Record<string, string> = {};
  if (!existsSync(envPath)) return vars;

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    vars[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }
  return vars;
}

async function runDev() {
  const portArg = process.argv[3];
  const port = portArg ? parseInt(portArg) : 3000;

  console.log('\n  \x1b[1mpingback-nest dev\x1b[0m — local development mode\n');

  // Load .env
  const env = loadEnv();
  const apiKey = process.env.PINGBACK_API_KEY || env.PINGBACK_API_KEY;
  const platformUrl = process.env.PINGBACK_PLATFORM_URL || env.PINGBACK_PLATFORM_URL || 'https://api.pingback.lol';
  const routePath = process.env.PINGBACK_ROUTE_PATH || env.PINGBACK_ROUTE_PATH || '/api/pingback';

  if (!apiKey) {
    error('PINGBACK_API_KEY not set. Add it to your .env file.');
    process.exit(1);
  }

  info(`Platform: ${platformUrl}`);
  info(`Local port: ${port}`);
  info(`Route path: ${routePath}`);

  // Start tunnel
  console.log('');
  info('Starting tunnel...');

  let localtunnel: any;
  try {
    localtunnel = (await import('localtunnel' as any)).default;
  } catch {
    error('Could not load localtunnel. Run: npm install localtunnel');
    process.exit(1);
  }

  let tunnel: any;
  try {
    tunnel = await localtunnel({ port });
  } catch (err) {
    error(`Failed to create tunnel: ${(err as Error).message}`);
    process.exit(1);
  }

  const tunnelUrl = tunnel.url;
  const endpointUrl = `${tunnelUrl}${routePath}`;

  success(`Tunnel active: ${tunnelUrl}`);
  success(`Endpoint: ${endpointUrl}`);

  // Try to register by reading package.json for function metadata
  // Since NestJS registers on startup, we just need to update the endpoint URL
  console.log('');
  info('Updating endpoint URL with platform...');

  try {
    const response = await fetch(`${platformUrl}/api/v1/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        functions: [],
        endpoint_url: endpointUrl,
      }),
    });

    if (response.ok) {
      success('Endpoint URL updated');
    } else {
      const text = await response.text();
      error(`Failed to update endpoint (${response.status}): ${text}`);
      info('Start your NestJS app — it will register functions on boot.');
    }
  } catch (err) {
    error(`Registration error: ${(err as Error).message}`);
    info('Start your NestJS app — it will register functions on boot.');
  }

  console.log('\n  \x1b[32m●\x1b[0m Ready — tunnel is active\n');
  console.log(`  Dashboard:  https://app.pingback.lol`);
  console.log(`  Tunnel:     ${tunnelUrl}`);
  console.log(`  Endpoint:   ${endpointUrl}`);
  console.log('\n  Start your NestJS app in another terminal:');
  console.log(`  \x1b[90m$ APP_URL=${tunnelUrl} npm run start:dev\x1b[0m`);
  console.log('\n  Press \x1b[1mCtrl+C\x1b[0m to stop\n');

  tunnel.on('close', () => {
    console.log('\n  Tunnel closed.');
    process.exit(0);
  });

  tunnel.on('error', (err: Error) => {
    error(`Tunnel error: ${err.message}`);
  });

  process.on('SIGINT', () => {
    console.log('\n  Shutting down...');
    tunnel.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    tunnel.close();
    process.exit(0);
  });
}

function showHelp() {
  console.log(`
  \x1b[1mpingback-nest\x1b[0m — CLI for @usepingback/nestjs

  Usage:
    pingback-nest dev [port]    Start tunnel for local development (default: 3000)
    pingback-nest help          Show this help message
`);
}

async function main() {
  switch (command) {
    case 'dev':
      await runDev();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) error(`Unknown command: ${command}`);
      showHelp();
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
