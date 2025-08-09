import { r2 } from '../r2-client';
import { generateR2BucketName, createR2Bucket, uploadToR2 } from '../r2';
import { CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock the r2 client
jest.mock('../r2-client', () => ({
  r2: {
    send: jest.fn(),
  },
}));

describe('R2 utilities', () => {
  // Mock console.error to avoid noise in test output
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    console.error = jest.fn();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    console.error = originalConsoleError;
  });

  describe('generateR2BucketName', () => {
    it('should generate a valid bucket name', () => {
      const orgId = 123;
      const bucketName = generateR2BucketName(orgId);
      // It should be lowercase, and spaces replaced with hyphens
      expect(bucketName).toMatch(/^[a-z0-9-.]+$/);
      expect(bucketName).toContain('org-123');
    });
  });

  describe('createR2Bucket', () => {
    it('should create a bucket successfully', async () => {
      const bucketName = 'test-bucket';
      (r2.send as jest.Mock).mockResolvedValueOnce({});

      const result = await createR2Bucket(bucketName);

      expect(r2.send).toHaveBeenCalledWith(expect.any(CreateBucketCommand));
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });

    it('should handle bucket creation failure', async () => {
      const bucketName = 'test-bucket';
      const error = new Error('Bucket already exists');
      (r2.send as jest.Mock).mockRejectedValueOnce(error);

      const result = await createR2Bucket(bucketName);

      expect(r2.send).toHaveBeenCalledWith(expect.any(CreateBucketCommand));
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('uploadToR2', () => {
    it('should upload an object successfully', async () => {
      (r2.send as jest.Mock).mockResolvedValueOnce({});

      const result = await uploadToR2(
        'test-bucket',
        'path/file.txt',
        Buffer.from('hello world'),
        { contentType: 'text/plain', cacheControl: 'max-age=60' }
      );

      expect(r2.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
    });

    it('should handle upload failure', async () => {
      const error = new Error('Upload failed');
      (r2.send as jest.Mock).mockRejectedValueOnce(error);

      const result = await uploadToR2('test-bucket', 'x.txt', Buffer.from('x'));

      expect(r2.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });
});