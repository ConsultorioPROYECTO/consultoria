/**
 * @fileoverview API endpoint to confirm completed uploads to Cloudflare R2 and persist metadata in DB
 * @route POST /api/attachments/confirm-upload
 * @auth Required - withOptimizedAuthentication
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withOptimizedAuthentication, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/types/api';
import { db } from '@/db';
import { r2Objects, appointments, patients, medicalServices } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// Treat 0, '0', null, and undefined as "absent" for optional FK IDs
const positiveOptionalId = z.preprocess((v) => {
  if (v === 0 || v === '0' || v === null || v === undefined) return undefined;
  return typeof v === 'string' ? Number(v) : v;
}, z.number().int().positive().optional());

const confirmUploadSchema = z.object({
  objectKey: z.string().min(1),
  objectName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  fileHash: z.string().max(64).optional(),
  appointmentId: positiveOptionalId,
  patientId: positiveOptionalId,
  medicalServiceId: positiveOptionalId,
  fileCategory: z.enum(['medical_document', 'patient_photo', 'medical_image', 'appointment_note', 'prescription', 'lab_result', 'other']).default('other'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional().default(false),
  accessLevel: z.enum(['private', 'organization', 'restricted']).optional().default('private'),
});

async function handleConfirmUpload(req: NextRequest, userInfo: AuthenticatedUserInfo): Promise<Response> {
  try {
    const body = await req.json();
    const data = confirmUploadSchema.parse(body);

    // Validate entity ownership by organization, if provided
    const orgId = userInfo.organizationInfo!.id;

    if (data.patientId !== undefined) {
      const patientCheck = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
        .limit(1);
      if (patientCheck.length === 0) {
        return createErrorResponse('Invalid patient', 'Patient not found in your organization', HTTP_STATUS.BAD_REQUEST);
      }
    }

    if (data.appointmentId !== undefined) {
      const appointmentCheck = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(eq(appointments.id, data.appointmentId), eq(appointments.organizationId, orgId)))
        .limit(1);
      if (appointmentCheck.length === 0) {
        return createErrorResponse('Invalid appointment', 'Appointment not found in your organization', HTTP_STATUS.BAD_REQUEST);
      }
    }

    if (data.medicalServiceId !== undefined) {
      const serviceCheck = await db
        .select({ id: medicalServices.id })
        .from(medicalServices)
        .where(and(eq(medicalServices.id, data.medicalServiceId), eq(medicalServices.organizationId, orgId)))
        .limit(1);
      if (serviceCheck.length === 0) {
        return createErrorResponse('Invalid medical service', 'Service not found in your organization', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Persist metadata - coerce optional FKs to null when absent
    const [inserted] = await db.insert(r2Objects).values({
      objectKey: data.objectKey,
      objectName: data.objectName,
      contentType: data.contentType,
      fileSize: data.fileSize,
      fileHash: data.fileHash,
      patientId: data.patientId ?? null,
      appointmentId: data.appointmentId ?? null,
      medicalServiceId: data.medicalServiceId ?? null,
      organizationId: orgId,
      fileCategory: data.fileCategory,
      description: data.description,
      tags: data.tags ?? null,
      isActive: true,
      isPublic: data.isPublic ?? false,
      accessLevel: data.accessLevel ?? 'private',
      uploadedBy: userInfo.user.id,
    }).returning();

    return createSuccessResponse(inserted, 'Attachment metadata saved', HTTP_STATUS.CREATED);
  } catch (error) {
    // Handle duplicate key: return existing record
    const err = error as { code?: string; errno?: number } | undefined;
    if (err && (err.code === 'ER_DUP_ENTRY' || err?.errno === 1062)) {
      try {
        // Attempt to recover by returning the existing record
        const body = await req.json().catch(() => null as unknown);
        const orgId = userInfo.organizationInfo!.id;
        const objectKey = (body as Record<string, unknown> | null)?.objectKey as string | undefined;
        if (objectKey) {
          const [existing] = await db
            .select()
            .from(r2Objects)
            .where(and(eq(r2Objects.objectKey, objectKey), eq(r2Objects.organizationId, orgId)))
            .limit(1);
          if (existing) {
            return createSuccessResponse(existing, 'Attachment metadata already exists', HTTP_STATUS.OK);
          }
        }
      } catch {
        // fallthrough to generic error response
      }
    }

    if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err?.errno === 1452)) {
      return createErrorResponse('Invalid reference', 'One or more foreign keys do not reference existing records', HTTP_STATUS.BAD_REQUEST);
    }

    if (error instanceof z.ZodError) {
      return createErrorResponse('Invalid request data', error.errors.map(e => `${e.path.join('.')}: ${e.message}`), HTTP_STATUS.BAD_REQUEST);
    }
    console.error('Error confirming R2 upload:', error);
    return createErrorResponse('Internal server error', 'Could not save attachment metadata', HTTP_STATUS.INTERNAL_ERROR);
  }
}

export const POST = withOptimizedAuthentication(handleConfirmUpload, { requireOrganization: true });