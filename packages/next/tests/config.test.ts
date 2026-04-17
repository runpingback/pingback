import { defineConfig, loadConfig } from '../src/config';

describe('config', () => {
  describe('defineConfig', () => {
    it('should return config with defaults applied', () => {
      const config = defineConfig({ apiKey: 'pb_live_test123' });
      expect(config.apiKey).toBe('pb_live_test123');
      expect(config.platformUrl).toBe('https://api.pingback.dev');
      expect(config.routePath).toBe('/api/__pingback');
      expect(config.functionsDir).toBe('lib/pingback/**/*.{ts,js}');
    });

    it('should allow overriding defaults', () => {
      const config = defineConfig({
        apiKey: 'pb_live_test123',
        baseUrl: 'https://myapp.com',
        platformUrl: 'http://localhost:4000',
        routePath: '/api/cron',
        functionsDir: 'src/jobs/**/*.ts',
      });
      expect(config.baseUrl).toBe('https://myapp.com');
      expect(config.platformUrl).toBe('http://localhost:4000');
      expect(config.routePath).toBe('/api/cron');
      expect(config.functionsDir).toBe('src/jobs/**/*.ts');
    });

    it('should throw if apiKey is missing', () => {
      expect(() => defineConfig({ apiKey: '' })).toThrow('apiKey is required');
      expect(() => defineConfig({} as any)).toThrow('apiKey is required');
    });
  });

  describe('loadConfig', () => {
    it('should throw if no config file is found', async () => {
      await expect(loadConfig('/nonexistent/path')).rejects.toThrow(
        'No pingback config file found',
      );
    });
  });
});
