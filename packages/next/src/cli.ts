#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config as loadEnv } from 'dotenv';

const cwd = process.cwd();

// Load .env.local first (higher priority), then .env
loadEnv({ path: join(cwd, '.env.local') });
loadEnv({ path: join(cwd, '.env') });
const command = process.argv[2];

function success(msg: string) {
  console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
}

function skip(msg: string) {
  console.log(`  \x1b[90m- ${msg}\x1b[0m`);
}

function info(msg: string) {
  console.log(`  \x1b[36mℹ\x1b[0m ${msg}`);
}

function error(msg: string) {
  console.log(`  \x1b[31m✗\x1b[0m ${msg}`);
}

// ─── INIT COMMAND ───

function createPingbackConfig() {
  const configPath = join(cwd, 'pingback.config.ts');
  if (existsSync(configPath)) {
    skip('pingback.config.ts already exists');
    return;
  }

  writeFileSync(
    configPath,
    `import { defineConfig } from "@usepingback/next";

export default defineConfig({
  apiKey: process.env.PINGBACK_API_KEY!,
});
`,
  );
  success('Created pingback.config.ts');
}

function wrapNextConfig() {
  const candidates = ['next.config.ts', 'next.config.mjs', 'next.config.js'];
  let configFile: string | null = null;

  for (const name of candidates) {
    if (existsSync(join(cwd, name))) {
      configFile = name;
      break;
    }
  }

  if (!configFile) {
    writeFileSync(
      join(cwd, 'next.config.ts'),
      `import { withPingback } from "@usepingback/next";

export default withPingback({});
`,
    );
    success('Created next.config.ts with withPingback()');
    return;
  }

  const fullPath = join(cwd, configFile);
  const content = readFileSync(fullPath, 'utf-8');

  if (content.includes('withPingback')) {
    skip(`${configFile} already uses withPingback()`);
    return;
  }

  const importLine = configFile.endsWith('.js')
    ? `const { withPingback } = require("@usepingback/next");\n`
    : `import { withPingback } from "@usepingback/next";\n`;

  let updated = importLine + content;

  updated = updated.replace(
    /export\s+default\s+({[\s\S]*?});?\s*$/m,
    (_match, config) => `export default withPingback(${config});`,
  );

  updated = updated.replace(
    /export\s+default\s+(\w+);?\s*$/m,
    (match, varName) => {
      if (varName === 'withPingback') return match;
      return `export default withPingback(${varName});`;
    },
  );

  updated = updated.replace(
    /module\.exports\s*=\s*({[\s\S]*?});?\s*$/m,
    (_match, config) => `module.exports = withPingback(${config});`,
  );

  updated = updated.replace(
    /module\.exports\s*=\s*(\w+);?\s*$/m,
    (_match, varName) => `module.exports = withPingback(${varName});`,
  );

  writeFileSync(fullPath, updated);
  success(`Wrapped ${configFile} with withPingback()`);
}

function createRouteHandler() {
  const routeDir = join(cwd, 'app', 'api', 'pingback');
  const routeFile = join(routeDir, 'route.ts');

  if (existsSync(routeFile)) {
    skip('app/api/pingback/route.ts already exists');
    return;
  }

  mkdirSync(routeDir, { recursive: true });
  writeFileSync(
    routeFile,
    `import { createRouteHandler } from "@usepingback/next/handler";

// Import all your pingback function files here
import "@/lib/pingback/example";

export const POST = createRouteHandler();
`,
  );
  success('Created app/api/pingback/route.ts');
}

function createExampleFunction() {
  const dir = join(cwd, 'lib', 'pingback');
  const filePath = join(dir, 'example.ts');

  if (existsSync(filePath)) {
    skip('lib/pingback/example.ts already exists');
    return;
  }

  mkdirSync(dir, { recursive: true });
  writeFileSync(
    filePath,
    `import { cron } from "@usepingback/next";

export const exampleJob = cron(
  "example-job",
  "0 * * * *", // every hour
  async (ctx) => {
    ctx.log("Hello from Pingback!");
    return { ok: true };
  },
);
`,
  );
  success('Created lib/pingback/example.ts');
}

function runInit() {
  console.log('\n  Setting up Pingback for your Next.js project...\n');

  createPingbackConfig();
  wrapNextConfig();
  createRouteHandler();
  createExampleFunction();

  console.log('\n  Done! Next steps:\n');
  console.log('  1. Set your environment variables:');
  console.log('     PINGBACK_API_KEY=pb_live_...');
  console.log('     PINGBACK_CRON_SECRET=...\n');
  console.log('  2. Edit lib/pingback/example.ts with your cron jobs\n');
  console.log('  3. Run \x1b[1mpingback dev\x1b[0m to start local development\n');
}

// ─── DEV COMMAND ───

async function runDev() {
  const portArg = process.argv[3];
  const port = portArg ? parseInt(portArg) : 3000;

  console.log('\n  \x1b[1mpingback dev\x1b[0m — local development mode\n');

  // Load config
  let config: any;
  try {
    const { loadConfig } = await import('./config');
    config = await loadConfig(cwd);
  } catch (err) {
    error('Could not load pingback.config.ts. Run \x1b[1mpingback init\x1b[0m first.');
    process.exit(1);
  }

  if (!config.apiKey || config.apiKey === 'undefined') {
    error('PINGBACK_API_KEY is not set. Add it to your .env file.');
    process.exit(1);
  }

  info(`Platform: ${config.platformUrl}`);
  info(`Local port: ${port}`);
  info(`Route path: ${config.routePath}`);

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
  const endpointUrl = `${tunnelUrl}${config.routePath}`;

  success(`Tunnel active: ${tunnelUrl}`);
  success(`Endpoint: ${endpointUrl}`);

  // Register functions
  console.log('');
  info('Registering functions...');

  try {
    const { registry } = await import('./functions');
    // Import user function files to populate the registry
    const { glob } = await import('glob');
    const { createJiti } = await import('jiti');
    const jiti = createJiti(cwd);
    const files = await glob(config.functionsDir, { cwd });
    for (const file of files) {
      try {
        await jiti.import(join(cwd, file), { default: true });
      } catch {
        // Ignore import errors for files that can't be loaded
      }
    }

    const metadata = registry.getMetadata();
    if (metadata.length === 0) {
      info('No functions found. Make sure your function files are imported.');
    } else {
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

      if (response.ok) {
        const result = await response.json();
        const jobs = (result as any).jobs || [];
        success(`Registered ${jobs.length} function${jobs.length !== 1 ? 's' : ''}`);
        for (const job of jobs) {
          console.log(`    ${job.status === 'created' ? '+ ' : '~ '}${job.name}`);
        }
      } else {
        const text = await response.text();
        error(`Registration failed (${response.status}): ${text}`);
      }
    }
  } catch (err) {
    error(`Registration error: ${(err as Error).message}`);
    info('Functions will be registered on next build instead.');
  }

  console.log('\n  \x1b[32m●\x1b[0m Ready — listening for executions\n');
  console.log(`  Dashboard:  https://app.pingback.lol`);
  console.log(`  Tunnel:     ${tunnelUrl}`);
  console.log(`  Endpoint:   ${endpointUrl}`);
  console.log('\n  Press \x1b[1mCtrl+C\x1b[0m to stop\n');

  tunnel.on('close', () => {
    console.log('\n  Tunnel closed.');
    process.exit(0);
  });

  tunnel.on('error', (err: Error) => {
    error(`Tunnel error: ${err.message}`);
  });

  // Keep process alive
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

// ─── MAIN ───

function showHelp() {
  console.log(`
  \x1b[1mpingback\x1b[0m — CLI for @usepingback/next

  Usage:
    pingback init          Set up Pingback in your Next.js project
    pingback dev [port]    Start tunnel for local development (default: 3000)
    pingback help          Show this help message
`);
}

async function main() {
  switch (command) {
    case 'dev':
      await runDev();
      break;
    case 'init':
    case undefined:
      runInit();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
