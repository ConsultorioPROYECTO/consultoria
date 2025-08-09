/**
 * @fileoverview API endpoint for generating presigned PUT URLs for file uploads to Cloudflare R2
 * @author AI Assistant
 * @version 1.0.0
 * @date 2025-01-20
 * 
 * @description
 * This endpoint generates presigned URLs that allow clients to upload files directly
 * to Cloudflare R2 without exposing R2 credentials. It validates file metadata,
 * enforces organization-based access control, and generates secure object keys.
 * 
 * @route POST /api/attachments/presigned-put-url
 * @auth Required - withOptimizedAuthentication
 * @roles All authenticated users with organization
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withOptimizedAuthentication, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/types/api';
import { generatePresignedPutUrl } from '@/lib/cloudflare/r2';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

/**
 * Request schema for presigned PUT URL generation
 */
const presignedPutUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(255, 'File name too long'),
  contentType: z.string().min(1, 'Content type required'),
  fileSize: z.number().min(1, 'File size must be positive').max(100 * 1024 * 1024, 'File too large (max 100MB)'),
  appointmentId: z.number().optional(),
  patientId: z.number().optional(),
  fileCategory: z.enum(['medical_document', 'patient_photo', 'medical_image', 'appointment_note', 'prescription', 'lab_result', 'other']).default('other'),
  description: z.string().optional(),
});

/**
 * Response schema for presigned PUT URL
 */
interface PresignedPutUrlResponse {
  presignedUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

/**
 * Validates file type against content type
 */
function validateFileType(fileName: string, contentType: string): boolean {
  const allowedTypes = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'text/plain': ['.txt'],
  };

  const fileExtension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  const allowedExtensions = allowedTypes[contentType as keyof typeof allowedTypes];
  
  return allowedExtensions ? allowedExtensions.includes(fileExtension) : false;
}

/**
 * Generates a secure object key for R2 storage
 */
function generateObjectKey(
  organizationId: number,
  userId: number,
  fileName: string,
  appointmentId?: number,
  patientId?: number
): string {
  const uuid = randomUUID();
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  let path = `org_${organizationId}/users/${userId}`;
  
  if (appointmentId) {
    path += `/appointments/${appointmentId}`;
  } else if (patientId) {
    path += `/patients/${patientId}`;
  } else {
    path += '/general';
  }
  
  return `${path}/${timestamp}_${uuid}_${sanitizedFileName}`;
}

/**
 * Handles POST requests to generate presigned PUT URLs
 */
async function handlePresignedPutUrl(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = presignedPutUrlRequestSchema.parse(body);

    // Validate file type
    if (!validateFileType(validatedData.fileName, validatedData.contentType)) {
      return createErrorResponse(
        'Invalid file type',
        'File extension does not match content type',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Get organization's R2 bucket name
    const organizationRecord = await db
      .select({ r2BucketName: organization.r2BucketName })
      .from(organization)
      .where(eq(organization.id, userInfo.organizationInfo!.id))
      .limit(1);

    if (!organizationRecord.length || !organizationRecord[0].r2BucketName) {
      return createErrorResponse(
        'Organization R2 bucket not found',
        'Please contact support to configure file storage',
        HTTP_STATUS.NOT_FOUND
      );
    }

    const bucketName = organizationRecord[0].r2BucketName;

    // Generate object key
    const objectKey = generateObjectKey(
      userInfo.organizationInfo!.id,
      userInfo.user.id,
      validatedData.fileName,
      validatedData.appointmentId,
      validatedData.patientId
    );

    // Generate presigned PUT URL (5 minutes expiration)
    const expiresInSeconds = 300;
    const presignedResult = await generatePresignedPutUrl(bucketName, objectKey, {
      contentType: validatedData.contentType,
      expiresInSeconds,
    });

    if (!presignedResult.success || !presignedResult.url) {
      console.error('Failed to generate presigned URL:', presignedResult.error);
      return createErrorResponse(
        'Failed to generate upload URL',
        'Please try again later',
        HTTP_STATUS.INTERNAL_ERROR
      );
    }

    const response: PresignedPutUrlResponse = {
      presignedUrl: presignedResult.url,
      objectKey,
      expiresInSeconds,
    };

    return createSuccessResponse(
      response,
      'Presigned URL generated successfully',
      HTTP_STATUS.OK
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid request data',
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        HTTP_STATUS.BAD_REQUEST
      );
    }

    console.error('Error generating presigned PUT URL:', error);
    return createErrorResponse(
      'Internal server error',
      'Failed to generate upload URL',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
}

export const POST = withOptimizedAuthentication(handlePresignedPutUrl, {
  requireOrganization: true,
});