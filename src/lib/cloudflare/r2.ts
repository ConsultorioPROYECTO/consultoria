import { CreateBucketCommand, CreateBucketCommandOutput, PutObjectCommand, PutObjectCommandOutput, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { r2 } from './r2-client';
import { randomUUID } from 'crypto';

/**
 * Generates a unique R2 bucket name for an organization.
 * The format is `org-[organizationId]-[uuid]`.
 *
 * @param organizationId The ID of the organization.
 * @returns The generated bucket name.
 */
export function generateR2BucketName(organizationId: number): string {
  const uuid = randomUUID();
  return `org-${organizationId}-${uuid}`;
}

/**
 * Creates a new R2 bucket.
 * @param bucketName The name of the bucket to create.
 * @returns A result object indicating success or failure.
 */
export async function createR2Bucket(bucketName: string): Promise<{
  success: boolean;
  response?: CreateBucketCommandOutput;
  error?: unknown;
}> {
  const command = new CreateBucketCommand({
    Bucket: bucketName,
  });

  try {
    const response = await r2.send(command);
    return { success: true, response };
  } catch (error) {
    console.error('Error creating R2 bucket:', error);
    return { success: false, error };
  }
}

/**
 * Uploads an object to an R2 bucket.
 * @param bucketName The name of the target bucket.
 * @param key The object key (path/filename in the bucket).
 * @param body The object content/body to upload.
 * @param options Optional upload options like contentType, cacheControl, and metadata.
 * @returns A result object indicating success or failure.
 */
export async function uploadToR2(
  bucketName: string,
  key: string,
  body: PutObjectCommandInput['Body'],
  options?: { contentType?: string; cacheControl?: string; metadata?: Record<string, string> }
): Promise<{
  success: boolean;
  response?: PutObjectCommandOutput;
  error?: unknown;
}> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: options?.contentType,
    CacheControl: options?.cacheControl,
    Metadata: options?.metadata,
  });

  try {
    const response = await r2.send(command);
    return { success: true, response };
  } catch (error) {
    console.error('Error uploading object to R2:', error);
    return { success: false, error };
  }
}