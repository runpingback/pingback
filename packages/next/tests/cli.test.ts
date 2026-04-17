import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

describe('CLI init', () => {
  const tmpDir = join(__dirname, '__tmp_cli_test__');
  const cliPath = join(__dirname, '..', 'src', 'cli.ts');
  // Use the local ts-node binary to avoid npx caching/resolution issues in CI
  const tsNode = join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'ts-node');

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function runInit() {
    return execSync(`${tsNode} ${cliPath}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      env: { ...process.env, PATH: process.env.PATH },
    });
  }

  it('should create pingback.config.ts', () => {
    runInit();
    const configPath = join(tmpDir, 'pingback.config.ts');
    expect(existsSync(configPath)).toBe(true);
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('defineConfig');
    expect(content).toContain('PINGBACK_API_KEY');
  });

  it('should create next.config.ts if none exists', () => {
    runInit();
    const configPath = join(tmpDir, 'next.config.ts');
    expect(existsSync(configPath)).toBe(true);
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('withPingback');
  });

  it('should wrap existing next.config.ts', () => {
    writeFileSync(
      join(tmpDir, 'next.config.ts'),
      `const nextConfig = {};\nexport default nextConfig;\n`,
    );
    runInit();
    const content = readFileSync(join(tmpDir, 'next.config.ts'), 'utf-8');
    expect(content).toContain('import { withPingback }');
    expect(content).toContain('withPingback(nextConfig)');
  });

  it('should wrap existing next.config.mjs', () => {
    writeFileSync(
      join(tmpDir, 'next.config.mjs'),
      `const nextConfig = {};\nexport default nextConfig;\n`,
    );
    runInit();
    const content = readFileSync(join(tmpDir, 'next.config.mjs'), 'utf-8');
    expect(content).toContain('withPingback(nextConfig)');
  });

  it('should wrap existing next.config.js with require', () => {
    writeFileSync(
      join(tmpDir, 'next.config.js'),
      `const nextConfig = {};\nmodule.exports = nextConfig;\n`,
    );
    runInit();
    const content = readFileSync(join(tmpDir, 'next.config.js'), 'utf-8');
    expect(content).toContain('require("@pingback/next")');
    expect(content).toContain('withPingback(nextConfig)');
  });

  it('should not double-wrap if already configured', () => {
    writeFileSync(
      join(tmpDir, 'next.config.ts'),
      `import { withPingback } from "@pingback/next";\nexport default withPingback({});\n`,
    );
    runInit();
    const content = readFileSync(join(tmpDir, 'next.config.ts'), 'utf-8');
    // Should only contain one withPingback import
    const matches = content.match(/withPingback/g);
    expect(matches!.length).toBe(2); // one import, one usage
  });

  it('should add to .gitignore', () => {
    writeFileSync(join(tmpDir, '.gitignore'), 'node_modules\n');
    runInit();
    const content = readFileSync(join(tmpDir, '.gitignore'), 'utf-8');
    expect(content).toContain('app/api/__pingback');
  });

  it('should create example function', () => {
    runInit();
    const examplePath = join(tmpDir, 'lib', 'pingback', 'example.ts');
    expect(existsSync(examplePath)).toBe(true);
    const content = readFileSync(examplePath, 'utf-8');
    expect(content).toContain('cron(');
    expect(content).toContain('example-job');
  });
});
