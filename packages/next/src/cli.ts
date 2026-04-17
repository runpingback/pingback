#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

const cwd = process.cwd();

function success(msg: string) {
  console.log(`  [done] ${msg}`);
}

function skip(msg: string) {
  console.log(`  [skip] ${msg}`);
}

function createPingbackConfig() {
  const configPath = join(cwd, 'pingback.config.ts');
  if (existsSync(configPath)) {
    skip('pingback.config.ts already exists');
    return;
  }

  writeFileSync(
    configPath,
    `import { defineConfig } from "@pingback/next";

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
    // Create a new next.config.ts with withPingback
    writeFileSync(
      join(cwd, 'next.config.ts'),
      `import { withPingback } from "@pingback/next";

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
    ? `const { withPingback } = require("@pingback/next");\n`
    : `import { withPingback } from "@pingback/next";\n`;

  let updated = importLine + content;

  // Wrap the default export
  // Handle: export default { ... }
  updated = updated.replace(
    /export\s+default\s+({[\s\S]*?});?\s*$/m,
    (_match, config) => `export default withPingback(${config});`,
  );

  // Handle: export default someVariable
  updated = updated.replace(
    /export\s+default\s+(\w+);?\s*$/m,
    (match, varName) => {
      if (varName === 'withPingback') return match; // already wrapped above
      return `export default withPingback(${varName});`;
    },
  );

  // Handle: module.exports = { ... }
  updated = updated.replace(
    /module\.exports\s*=\s*({[\s\S]*?});?\s*$/m,
    (_match, config) => `module.exports = withPingback(${config});`,
  );

  // Handle: module.exports = someVariable
  updated = updated.replace(
    /module\.exports\s*=\s*(\w+);?\s*$/m,
    (_match, varName) => `module.exports = withPingback(${varName});`,
  );

  writeFileSync(fullPath, updated);
  success(`Wrapped ${configFile} with withPingback()`);
}

function updateGitignore() {
  const gitignorePath = join(cwd, '.gitignore');
  const entry = 'app/api/__pingback';

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (content.includes(entry)) {
      skip('.gitignore already contains app/api/__pingback');
      return;
    }
    appendFileSync(gitignorePath, `\n# Pingback auto-generated route\n${entry}\n`);
  } else {
    writeFileSync(gitignorePath, `# Pingback auto-generated route\n${entry}\n`);
  }
  success('Added app/api/__pingback to .gitignore');
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
    `import { cron } from "@pingback/next";

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

function main() {
  console.log('\nSetting up Pingback for your Next.js project...\n');

  createPingbackConfig();
  wrapNextConfig();
  updateGitignore();
  createExampleFunction();

  console.log('\nDone! Next steps:\n');
  console.log('  1. Set your environment variables:');
  console.log('     PINGBACK_API_KEY=pb_live_...');
  console.log('     PINGBACK_CRON_SECRET=...');
  console.log('');
  console.log('  2. Edit lib/pingback/example.ts with your actual cron job');
  console.log('');
  console.log('  3. Run next build to register your functions\n');
}

main();
