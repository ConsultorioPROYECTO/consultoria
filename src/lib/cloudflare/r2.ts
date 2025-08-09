import { CreateBucketCommand } from '@aws-sdk/client-s3';
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
 * @returns The result of the bucket creation operation.
 */
export async function createR2Bucket(bucketName: string) {
  const command = new CreateBucketCommand({
    Bucket: bucketName,
  });

  try {
    const response = await r2.send(command);
    return response;
  } catch (error) {
    console.error('Error creating R2 bucket:', error);
    throw error;
  }
}