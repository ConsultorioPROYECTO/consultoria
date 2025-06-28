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
export function validateUserRole(userRole: string, requiredRoles: string | string[]) {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  if (!roles.includes(userRole)) {
    const errorMessage = roles.includes('admin') ? API_ERRORS.ADMIN_ONLY : API_ERRORS.ASSISTANT_ONLY;
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
  phoneNumber: z.string().nullable().optional(),
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

// === Doctor Calendar Management Helpers ===

/**
 * Valida y crea un calendario para un doctor si no tiene uno asignado.
 * Esta función centraliza la lógica de validación y creación de calendarios.
 * 
 * @param doctorId - ID del doctor
 * @param doctorData - Datos del doctor para crear el calendario
 * @returns Promise con el resultado de la operación
 */
export async function ensureDoctorHasCalendar(
  doctorId: number,
  doctorData: {
    firstName: string;
    lastName: string;
    email?: string;
    timezone?: string;
  }
): Promise<{
  success: boolean;
  calendarId?: string;
  error?: string;
  created?: boolean;
}> {
  try {
    const { doctorCalendarService } = await import('@/lib/doctor-calendar');
    
    // Verificar si el doctor ya tiene un calendario
    const calendarSettings = await doctorCalendarService.getDoctorCalendarSettings(doctorId);
    
    if (calendarSettings.success && calendarSettings.calendarInfo?.calendarId) {
      // El doctor ya tiene un calendario
      return {
        success: true,
        calendarId: calendarSettings.calendarInfo.calendarId,
        created: false
      };
    }
    
    // El doctor no tiene calendario, crear uno nuevo
    const calendarName = `Dr. ${doctorData.firstName} ${doctorData.lastName} - Consultas`;
    
    const createResult = await doctorCalendarService.createDoctorCalendar({
      doctorId,
      calendarName,
      timezone: doctorData.timezone || 'America/Bogota',
      syncEnabled: true
    });
    
    if (createResult.success) {
      return {
        success: true,
        calendarId: createResult.calendarId,
        created: true
      };
    } else {
      return {
        success: false,
        error: createResult.error || 'Failed to create calendar'
      };
    }
  } catch (error) {
    console.error('Error ensuring doctor has calendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating calendar'
    };
  }
}

/**
 * Valida que un doctor tenga un calendario asignado y lo crea si es necesario.
 * Función de conveniencia que maneja errores de forma más simple.
 * 
 * @param doctorId - ID del doctor
 * @param doctorData - Datos del doctor
 * @returns Promise<boolean> - true si el doctor tiene calendario (existente o creado)
 */
export async function validateDoctorCalendar(
  doctorId: number,
  doctorData: {
    firstName: string;
    lastName: string;
    email?: string;
    timezone?: string;
  }
): Promise<boolean> {
  const result = await ensureDoctorHasCalendar(doctorId, doctorData);
  return result.success;
}