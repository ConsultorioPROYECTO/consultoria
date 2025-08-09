import { CreateBucketCommand, CreateBucketCommandOutput, PutObjectCommand, PutObjectCommandOutput, PutObjectCommandInput, GetObjectCommand } from '@aws-sdk/client-s3';
import { r2 } from './r2-client';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

/**
 * Generates a presigned URL for uploading an object to R2 (PutObject).
 * Enforces short expiration and allows constraints like content-type and cache-control.
 */
export async function generatePresignedPutUrl(
  bucketName: string,
  key: string,
  options?: { contentType?: string; cacheControl?: string; metadata?: Record<string, string>; expiresInSeconds?: number }
): Promise<{ success: boolean; url?: string; error?: unknown }> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: options?.contentType,
    CacheControl: options?.cacheControl,
    Metadata: options?.metadata,
  });

  const expiresIn = options?.expiresInSeconds ?? 300; // default 5 minutes

  try {
    const url = await getSignedUrl(r2, command, { expiresIn });
    return { success: true, url };
  } catch (error) {
    console.error('Error generating presigned PUT URL:', error);
    return { success: false, error };
  }
}

/**
 * Generates a presigned URL for downloading/viewing an object from R2 (GetObject).
 * Uses short expiration and supports response content headers.
 */
export async function generatePresignedGetUrl(
  bucketName: string,
  key: string,
  options?: { expiresInSeconds?: number; responseContentType?: string; responseContentDisposition?: string }
): Promise<{ success: boolean; url?: string; error?: unknown }> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
    ResponseContentType: options?.responseContentType,
    ResponseContentDisposition: options?.responseContentDisposition,
  });

  const expiresIn = options?.expiresInSeconds ?? 300; // default 5 minutes

  try {
    const url = await getSignedUrl(r2, command, { expiresIn });
    return { success: true, url };
  } catch (error) {
    console.error('Error generating presigned GET URL:', error);
    return { success: false, error };
  }
}