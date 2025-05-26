// src/lib/api-helpers.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createErrorResponse, HTTP_STATUS, API_ERRORS } from '@/types/api';

// === Request Validation Helpers ===
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ReturnType<typeof createErrorResponse> }> {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: createErrorResponse(
          API_ERRORS.INVALID_REQUEST,
          `Validation failed: ${error.errors.map(e => e.message).join(', ')}`,
          HTTP_STATUS.BAD_REQUEST
        )
      };
    }
    return {
      success: false,
      error: createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Invalid JSON format',
        HTTP_STATUS.BAD_REQUEST
      )
    };
  }
}

// === Role Validation Helpers ===
export function validateUserRole(userRole: string, requiredRole: string) {
  if (userRole !== requiredRole) {
    const errorMessage = requiredRole === 'admin' ? API_ERRORS.ADMIN_ONLY : API_ERRORS.ASSISTANT_ONLY;
    return createErrorResponse(errorMessage, undefined, HTTP_STATUS.FORBIDDEN);
  }
  return null;
}

// === Common Database Query Helpers ===
export function handleDatabaseError(error: unknown, operation: string) {
  console.error(`Database error during ${operation}:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  return createErrorResponse(
    API_ERRORS.INTERNAL_ERROR,
    `Failed to ${operation}: ${errorMessage}`,
    HTTP_STATUS.INTERNAL_ERROR
  );
}

// === Request Schemas ===
export const syncUserSchema = z.object({
  firebaseUid: z.string().min(1, 'Firebase UID is required'),
  email: z.string().email().optional(),
  emailVerified: z.boolean().optional(),
  phoneNumber: z.string().optional(),
  displayName: z.string().optional(),
  photoURL: z.string().url().optional(),
  providerId: z.string().optional(),
});

export const createOrganizationSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'medico', 'asistente', 'N/A'], {
    errorMap: () => ({ message: 'Role must be one of: admin, medico, asistente, N/A' })
  }),
});