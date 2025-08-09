/**
 * @fileoverview API endpoint for generating presigned GET URLs for Cloudflare R2 objects
 * @route POST /api/attachments/presigned-get-url
 * @auth Required - withOptimizedAuthentication
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withOptimizedAuthentication, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/types/api';
import { db } from '@/db';
import { r2Objects } from '@/db/schema';
import { organization } from '@/db/schema/organization';
import { and, eq } from 'drizzle-orm';
import { generatePresignedGetUrl } from '@/lib/cloudflare/r2';

const presignedGetUrlSchema = z.object({
  id: z.number().int().optional(),
  objectKey: z.string().min(1).optional(),
  expiresInSeconds: z.number().int().min(60).max(3600).optional(), // 1-60 minutes
  disposition: z.enum(['inline', 'attachment']).optional().default('inline'),
  fileName: z.string().max(255).optional(),
});

async function handlePresignedGetUrl(req: NextRequest, userInfo: AuthenticatedUserInfo): Promise<Response> {
  try {
    const body = await req.json();
    const data = presignedGetUrlSchema.parse(body);

    if (!data.id && !data.objectKey) {
      return createErrorResponse('Missing identifier', 'Provide id or objectKey', HTTP_STATUS.BAD_REQUEST);
    }

    const orgId = userInfo.organizationInfo!.id;

    // Find object within user's organization
    const [obj] = await db
      .select()
      .from(r2Objects)
      .where(
        and(
          eq(r2Objects.organizationId, orgId),
          data.id ? eq(r2Objects.id, data.id) : eq(r2Objects.objectKey, data.objectKey!)
        )
      )
      .limit(1);

    if (!obj) {
      return createErrorResponse('Object not found', 'Attachment does not exist in your organization', HTTP_STATUS.NOT_FOUND);
    }

    if (obj.isActive === false) {
      return createErrorResponse('Inactive object', 'Attachment is not available', HTTP_STATUS.BAD_REQUEST);
    }

    // Get organization's R2 bucket name
    const [org] = await db
      .select({ r2BucketName: organization.r2BucketName })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1);

    if (!org || !org.r2BucketName) {
      return createErrorResponse('Organization R2 bucket not found', 'Please contact support to configure file storage', HTTP_STATUS.NOT_FOUND);
    }

    const expiresInSeconds = data.expiresInSeconds ?? 300;

    // Build content disposition
    const safeName = (data.fileName ?? obj.objectName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const responseContentDisposition = `${data.disposition ?? 'inline'}; filename="${safeName}"`;

    const presign = await generatePresignedGetUrl(org.r2BucketName, obj.objectKey, {
      expiresInSeconds,
      responseContentType: obj.contentType ?? undefined,
      responseContentDisposition,
    });

    if (!presign.success || !presign.url) {
      return createErrorResponse('Failed to generate URL', 'Please try again later', HTTP_STATUS.INTERNAL_ERROR);
    }

    // Update cache fields on record (best-effort)
    try {
      await db
        .update(r2Objects)
        .set({
          lastPresignedUrl: presign.url,
          presignedUrlExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        })
        .where(and(eq(r2Objects.id, obj.id), eq(r2Objects.organizationId, orgId)));
    } catch (e) {
      console.warn('Failed to update presigned URL cache on r2_objects:', e);
    }

    return createSuccessResponse(
      { presignedUrl: presign.url, expiresInSeconds },
      'Presigned GET URL generated',
      HTTP_STATUS.OK
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid request data', error.errors.map(e => `${e.path.join('.')}: ${e.message}`), HTTP_STATUS.BAD_REQUEST);
    }
    console.error('Error generating presigned GET URL:', error);
    return createErrorResponse('Internal server error', 'Could not generate download URL', HTTP_STATUS.INTERNAL_ERROR);
  }
}

export const POST = withOptimizedAuthentication(handlePresignedGetUrl, { requireOrganization: true });