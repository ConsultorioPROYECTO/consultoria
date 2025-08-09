import { S3Client } from '@aws-sdk/client-s3';
import { r2 } from '../r2-client';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => {
      return { mock: 's3-client' };
    }),
  };
});

describe('R2 Client', () => {
  it('should create an S3 client instance for R2', () => {
    expect(S3Client).toHaveBeenCalledWith({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      },
    });
    expect(r2).toBeDefined();
  });
});