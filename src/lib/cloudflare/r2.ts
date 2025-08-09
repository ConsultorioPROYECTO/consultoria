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