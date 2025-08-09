import Cloudflare from 'cloudflare';
import { cloudflare } from '../client';

// Mock the Cloudflare constructor
jest.mock('cloudflare', () => {
  return jest.fn().mockImplementation(() => {
    return { mock: 'cloudflare-client' };
  });
});

describe('Cloudflare Client', () => {
  it('should create a Cloudflare client instance', () => {
    expect(Cloudflare).toHaveBeenCalledWith({
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
    });
    expect(cloudflare).toBeDefined();
  });
});