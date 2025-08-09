import { db } from '@/db';
import {
  organization,
  plans,
  users,
  type NewOrganization,
  type Organization,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateR2BucketName, createR2Bucket } from '@/lib/cloudflare/r2';
import {
  generateRandomInvitationCode,
  generateUniqueInstanceId,
  generateUniqueApiKey,
} from '@/lib/organization-utils';
import { syncKnowledgeAfterCRUD } from '@/lib/knowledge-manager';

/**
 * Creates a new organization and associates the user with it within a transaction.
 * @param organizationName - The name of the new organization.
 * @param planIdentifier - The identifier of the plan for the new organization.
 * @param timezone - The timezone for the new organization.
 * @param currency - The currency for the new organization.
 * @param userId - The ID of the user creating the organization.
 * @returns The newly created organization's ID, invitation code, instance ID, API key, and R2 bucket name.
 * @throws An error if the plan is not found or if the transaction fails.
 */
export const createOrganization = async (
  organizationName: string,
  planIdentifier: string,
  timezone: string | undefined,
  currency: string | undefined,
  userId: string
) => {
  const result = await db.transaction(async (tx) => {
    const planIdentifierMap: { [key: string]: string } = {
      basico: 'Básico',
      profesional: 'Profesional',
      empresarial: 'Empresarial',
    };
    const planName = planIdentifierMap[planIdentifier];

    if (!planName) {
      throw new Error(`Invalid plan identifier: ${planIdentifier}`);
    }

    const plan = await tx.query.plans.findFirst({
      where: eq(plans.name, planName),
    });

    if (!plan) {
      throw new Error(`Plan not found: ${planName}`);
    }

    await tx
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.firebaseUid, userId));

    const invitationCode = await generateRandomInvitationCode();
    const instanceId = await generateUniqueInstanceId();
    const apiKey = await generateUniqueApiKey();

    const insertResult = await tx.insert(organization).values({
      name: organizationName,
      invitationCode,
      planId: plan.id,
      instanceId,
      apiKey,
      timezone,
      currency,
    });

    const newOrganizationId = insertResult[0].insertId;
    if (!newOrganizationId) {
      tx.rollback();
      throw new Error('Failed to create organization');
    }

    const r2BucketName = generateR2BucketName(newOrganizationId);
    await tx
      .update(organization)
      .set({ r2BucketName })
      .where(eq(organization.id, newOrganizationId));
    await tx
      .update(users)
      .set({ organizationId: newOrganizationId })
      .where(eq(users.firebaseUid, userId));

    try {
      await syncKnowledgeAfterCRUD('organization', 'create', {
        id: newOrganizationId,
        organizationId: newOrganizationId,
      });
      console.log(`Knowledge synced for organization ${newOrganizationId}`);
    } catch (syncError) {
      console.error('Error syncing knowledge:', syncError);
    }

    return {
      organizationId: newOrganizationId,
      invitationCode,
      instanceId,
      apiKey,
      r2BucketName,
    };
  });

  // Create R2 bucket after successful organization creation
  // This is done outside the transaction to prevent bucket creation errors from affecting organization creation
  const bucketCreationStatus = {
    bucketCreated: false,
    bucketError: null as string | null
  };

  try {
    const bucketResult = await createR2Bucket(result.r2BucketName);
    if (bucketResult.success) {
      console.log(`R2 bucket created successfully: ${result.r2BucketName}`);
      bucketCreationStatus.bucketCreated = true;
    } else {
      const errorMessage = `Failed to create R2 bucket: ${result.r2BucketName}`;
      console.error(errorMessage, bucketResult.error);
      bucketCreationStatus.bucketError = errorMessage;
    }
  } catch (bucketError) {
    const errorMessage = `Error creating R2 bucket: ${result.r2BucketName}`;
    console.error(errorMessage, bucketError);
    bucketCreationStatus.bucketError = errorMessage;
  }

  return {
    ...result,
    ...bucketCreationStatus
  };
};

/**
 * Updates an organization's details.
 * @param organizationId - The ID of the organization to update.
 * @param updateData - The data to update.
 * @returns The updated organization.
 * @throws An error if the organization is not found or fails to update.
 */
export const updateOrganization = async (
  organizationId: number,
  updateData: Partial<NewOrganization>
): Promise<Organization | undefined> => {
  const updateResult = await db
    .update(organization)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(organization.id, organizationId));

  if (updateResult[0].affectedRows === 0) {
    throw new Error('Organization not found or could not be updated');
  }

  const updatedOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });

  try {
    await syncKnowledgeAfterCRUD('organization', 'update', {
      id: organizationId,
      organizationId: organizationId,
    });
    console.log(`Knowledge synced for organization ${organizationId}`);
  } catch (syncError) {
    console.error('Error syncing knowledge:', syncError);
  }

  return updatedOrganization;
};

/**
 * Retrieves an organization by its ID.
 * @param organizationId - The ID of the organization to retrieve.
 * @returns The organization data.
 */
export const getOrganizationById = async (
  organizationId: number
): Promise<Organization | undefined> => {
  return await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });
};