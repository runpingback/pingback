import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { loadConfig } from './config';
import { registerFunctions } from './register';

export function discoverFunctionFilesSync(
  projectRoot: string,
  pattern: string,
): string[] {
  const files = globSync(pattern, { cwd: projectRoot, absolute: true });

  return files.filter((file) => {
    const content = readFileSync(file, 'utf-8');
    return content.includes('@usepingback/next');
  });
}

// Keep async version for tests
export async function discoverFunctionFiles(
  projectRoot: string,
  pattern: string,
): Promise<string[]> {
  return discoverFunctionFilesSync(projectRoot, pattern);
}

// Keep for backward compatibility / tests
export { generateRouteFile } from './generate';

export function withPingback(nextConfig: any = {}): any {
  const originalWebpack = nextConfig.webpack;
  let registrationPromise: Promise<void> | null = null;

  return {
    ...nextConfig,
    webpack(config: any, context: any) {
      // Only register with platform during production server builds
      if (context.isServer && !context.dev && !registrationPromise) {
        registrationPromise = runRegistration(context.dir).catch((err: Error) => {
          console.error(`[pingback] Registration failed: ${err.message}`);
        });

        config.plugins.push({
          apply(compiler: any) {
            compiler.hooks.afterEmit.tapPromise('PingbackRegistration', async () => {
              if (registrationPromise) await registrationPromise;
            });
          },
        });
      }

      if (originalWebpack) {
        return originalWebpack(config, context);
      }
      return config;
    },
  };
}

async function runRegistration(projectRoot: string): Promise<void> {
  const config = await loadConfig(projectRoot);
  const files = discoverFunctionFilesSync(projectRoot, config.functionsDir);

  console.log(`[pingback] Found ${files.length} function file(s)`);

  if (files.length === 0) return;

  for (const file of files) {
    try { await import(file); } catch (err) {
      console.warn(`[pingback] Could not import ${file}: ${(err as Error).message}`);
    }
  }

  const result = await registerFunctions(config);
  console.log(`[pingback] Registered ${result.jobs.length} function(s) with platform`);
}
