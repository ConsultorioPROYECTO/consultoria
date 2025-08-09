import { r2 } from '../r2-client';
import { generateR2BucketName, createR2Bucket, uploadToR2, generatePresignedPutUrl, generatePresignedGetUrl, configureR2BucketCorsDefault } from '../r2';
import { /**CreateBucketCommand,*/ PutObjectCommand, GetObjectCommand, PutBucketCorsCommand, type PutBucketCorsCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock r2 client
jest.mock('../r2-client', () => ({
  r2: {
    send: jest.fn(),
  },
}));

// Mock getSignedUrl
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('R2 utilities', () => {
  const mockSend = r2.send as unknown as jest.Mock;
  const mockGetSignedUrl = getSignedUrl as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CLOUDFLARE_R2_CORS_ALLOWED_ORIGINS;
  });

  describe('generateR2BucketName', () => {
    test('generates bucket name with correct format', () => {
      const organizationId = 123;
      const bucketName = generateR2BucketName(organizationId);

      expect(bucketName).toMatch(/^org-123-[a-f0-9-]{36}$/);
    });
  });

  describe('createR2Bucket', () => {
    test('creates bucket successfully', async () => {
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      mockSend.mockResolvedValue(mockResponse);

      const result = await createR2Bucket('test-bucket');

      expect(result.success).toBe(true);
      expect(result.response).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { Bucket: 'test-bucket' },
        })
      );
    });

    test('handles bucket creation error', async () => {
      const mockError = new Error('Bucket creation failed');
      mockSend.mockRejectedValue(mockError);

      const result = await createR2Bucket('test-bucket');

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
    });
  });

  describe('uploadToR2', () => {
    test('uploads object successfully', async () => {
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      mockSend.mockResolvedValue(mockResponse);

      const result = await uploadToR2('bucket', 'key', 'content', {
        contentType: 'text/plain',
        cacheControl: 'public, max-age=3600',
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe(mockResponse);
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    test('handles upload error', async () => {
      const mockError = new Error('Upload failed');
      mockSend.mockRejectedValue(mockError);

      const result = await uploadToR2('bucket', 'key', 'content');

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
    });
  });

  describe('generatePresignedPutUrl', () => {
    test('generates presigned PUT URL successfully', async () => {
      const mockUrl = 'https://bucket.r2.cloudflarestorage.com/key?signed=true';
      mockGetSignedUrl.mockResolvedValue(mockUrl);

      const result = await generatePresignedPutUrl('bucket', 'key', {
        contentType: 'image/jpeg',
        cacheControl: 'no-cache',
        expiresInSeconds: 600,
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        r2,
        expect.any(PutObjectCommand),
        { expiresIn: 600 }
      );
    });

    test('uses default expiration when not provided', async () => {
      const mockUrl = 'https://bucket.r2.cloudflarestorage.com/key?signed=true';
      mockGetSignedUrl.mockResolvedValue(mockUrl);

      await generatePresignedPutUrl('bucket', 'key');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        r2,
        expect.any(PutObjectCommand),
        { expiresIn: 300 }
      );
    });

    test('handles presigned PUT URL generation error', async () => {
      const mockError = new Error('Presign failed');
      mockGetSignedUrl.mockRejectedValue(mockError);

      const result = await generatePresignedPutUrl('bucket', 'key');

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
    });
  });

  describe('generatePresignedGetUrl', () => {
    test('generates presigned GET URL successfully', async () => {
      const mockUrl = 'https://bucket.r2.cloudflarestorage.com/key?signed=true';
      mockGetSignedUrl.mockResolvedValue(mockUrl);

      const result = await generatePresignedGetUrl('bucket', 'key', {
        expiresInSeconds: 1800,
        responseContentType: 'application/pdf',
        responseContentDisposition: 'attachment; filename="document.pdf"',
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        r2,
        expect.any(GetObjectCommand),
        { expiresIn: 1800 }
      );
    });

    test('uses default expiration when not provided', async () => {
      const mockUrl = 'https://bucket.r2.cloudflarestorage.com/key?signed=true';
      mockGetSignedUrl.mockResolvedValue(mockUrl);

      await generatePresignedGetUrl('bucket', 'key');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        r2,
        expect.any(GetObjectCommand),
        { expiresIn: 300 }
      );
    });

    test('handles presigned GET URL generation error', async () => {
      const mockError = new Error('Presign failed');
      mockGetSignedUrl.mockRejectedValue(mockError);

      const result = await generatePresignedGetUrl('bucket', 'key');

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
    });
  });

  describe('configureR2BucketCorsDefault', () => {
    test('configures CORS with default * origin', async () => {
      mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      const res = await configureR2BucketCorsDefault('bucket');

      expect(res.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutBucketCorsCommand));
      const commandArg = mockSend.mock.calls[0][0] as unknown as { input: PutBucketCorsCommandInput };
      expect(commandArg.input.Bucket).toBe('bucket');
      expect(commandArg.input.CORSConfiguration).toBeDefined();
      const allowedOrigins = commandArg.input.CORSConfiguration?.CORSRules?.[0]?.AllowedOrigins;
      expect(allowedOrigins).toEqual(['*']);
    });

    test('configures CORS with custom origins from env', async () => {
      process.env.CLOUDFLARE_R2_CORS_ALLOWED_ORIGINS = 'https://app.example.com,http://localhost:3000';
      mockSend.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });

      const res = await configureR2BucketCorsDefault('bucket');

      expect(res.success).toBe(true);
      const commandArg = mockSend.mock.calls[0][0] as unknown as { input: PutBucketCorsCommandInput };
      expect(commandArg.input.CORSConfiguration).toBeDefined();
      const allowedOrigins = commandArg.input.CORSConfiguration?.CORSRules?.[0]?.AllowedOrigins;
      expect(allowedOrigins).toEqual([
        'https://app.example.com',
        'http://localhost:3000',
      ]);
    });

    test('handles error from PutBucketCorsCommand', async () => {
      const err = new Error('CORS error');
      mockSend.mockRejectedValue(err);

      const res = await configureR2BucketCorsDefault('bucket');

      expect(res.success).toBe(false);
      expect(res.error).toBe(err);
    });
  });
});