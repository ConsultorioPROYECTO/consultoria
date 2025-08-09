//import { env } from '../../../env';
import { ZodError } from 'zod';

// Mocking process.env
const originalEnv = process.env;

describe('env', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should correctly validate and export environment variables', async () => {
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account-id';
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key';
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.CLOUDFLARE_R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';

    const { env } = await import('../../../env');

    expect(env.CLOUDFLARE_API_TOKEN).toBe('test-token');
    expect(env.CLOUDFLARE_ACCOUNT_ID).toBe('test-account-id');
    expect(env.CLOUDFLARE_R2_ACCESS_KEY_ID).toBe('test-access-key');
    expect(env.CLOUDFLARE_R2_SECRET_ACCESS_KEY).toBe('test-secret-key');
    expect(env.CLOUDFLARE_R2_ENDPOINT).toBe('https://test.r2.cloudflarestorage.com');
  });

  it('should throw an error if required environment variables are missing', async () => {
    // Clear all the required env vars
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    delete process.env.CLOUDFLARE_R2_ENDPOINT;

    try {
      await import('../../../env');
      // If it doesn't throw, fail the test
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ZodError);
      const zodError = error as ZodError;
      const issues = zodError.issues.map((issue) => issue.path[0]);
      expect(issues).toContain('CLOUDFLARE_API_TOKEN');
      expect(issues).toContain('CLOUDFLARE_ACCOUNT_ID');
      expect(issues).toContain('CLOUDFLARE_R2_ACCESS_KEY_ID');
      expect(issues).toContain('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
      expect(issues).toContain('CLOUDFLARE_R2_ENDPOINT');
    }
  });
});