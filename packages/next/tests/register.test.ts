import { registerFunctions } from '../src/register';
import { registry } from '../src/functions';
import type { PingbackConfig } from '../src/config';

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('registerFunctions', () => {
  const baseConfig: PingbackConfig = {
    apiKey: 'pb_live_test123',
    platformUrl: 'http://localhost:4000',
    routePath: '/api/__pingback',
    functionsDir: 'lib/pingback/**/*.{ts,js}',
  };

  beforeEach(() => {
    (registry as any).functions = new Map();
    mockFetch.mockReset();
  });

  it('should call the registration API with collected metadata', async () => {
    registry.cron('send-emails', '*/15 * * * *', async () => {}, { retries: 3 });
    registry.task('send-single', async () => {}, { retries: 2, timeout: '15s' });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        jobs: [
          { name: 'send-emails', status: 'active' },
          { name: 'send-single', status: 'active' },
        ],
      }),
    });

    const result = await registerFunctions(baseConfig);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/v1/register');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer pb_live_test123');

    const body = JSON.parse(options.body);
    expect(body.functions).toHaveLength(2);
    expect(body.functions[0].name).toBe('send-emails');
    expect(body.functions[1].name).toBe('send-single');
    expect(result.jobs).toHaveLength(2);
  });

  it('should include endpoint URL from baseUrl config', async () => {
    registry.cron('job-1', '* * * * *', async () => {});
    const config = { ...baseConfig, baseUrl: 'https://myapp.vercel.app' };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [{ name: 'job-1', status: 'active' }] }),
    });

    await registerFunctions(config);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.endpoint_url).toBe('https://myapp.vercel.app/api/__pingback');
  });

  it('should infer baseUrl from VERCEL_URL env var', async () => {
    process.env.VERCEL_URL = 'my-app-abc123.vercel.app';
    registry.cron('job-1', '* * * * *', async () => {});

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jobs: [{ name: 'job-1', status: 'active' }] }),
    });

    await registerFunctions(baseConfig);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.endpoint_url).toBe('https://my-app-abc123.vercel.app/api/__pingback');
    delete process.env.VERCEL_URL;
  });

  it('should throw on registration failure', async () => {
    registry.cron('job-1', '* * * * *', async () => {});

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    });

    await expect(registerFunctions(baseConfig)).rejects.toThrow('Registration failed (401)');
  });

  it('should skip registration if no functions are registered', async () => {
    const result = await registerFunctions(baseConfig);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.jobs).toEqual([]);
  });
});
