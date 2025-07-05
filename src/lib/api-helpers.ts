// src/lib/api-helpers.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createErrorResponse, HTTP_STATUS, API_ERRORS } from '@/types/api';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq } from 'drizzle-orm';
import { googleCalendarService } from './google-calendar';

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
  displayName: z.string().nullable().optional(),
  photoURL: z.string().url().nullable().optional(),
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
    // 1. Obtener la información del doctor de la base de datos
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
    });

    if (!doctor) {
      return {
        success: false,
        error: `Doctor with ID ${doctorId} not found.`,
      };
    }

    // 2. Verificar si el doctor ya tiene un calendar_id asignado
    if (doctor.calendar_id) {
      return {
        success: true,
        calendarId: doctor.calendar_id,
        created: false,
      };
    }

    // 3. Si no tiene calendar_id, crear uno nuevo en Google Calendar
    const calendarName = `Dr. ${doctorData.firstName} ${doctorData.lastName} - Consultas`;
    const calendarTimezone = doctorData.timezone || 'America/Bogota';

    const newCalendar = await googleCalendarService.calendar.calendars.insert({
      requestBody: {
        summary: calendarName,
        timeZone: calendarTimezone,
      },
    });

    const newCalendarId = newCalendar.data.id;

    if (!newCalendarId) {
      return {
        success: false,
        error: 'Failed to create Google Calendar: No ID returned.',
      };
    }

    // 4. Actualizar el registro del doctor en la base de datos con el nuevo calendar_id
    await db.update(doctors)
      .set({
        calendar_id: newCalendarId,
        calendar_timezone: calendarTimezone,
      })
      .where(eq(doctors.idDoctor, doctorId));

    return {
      success: true,
      calendarId: newCalendarId,
      created: true,
    };
  } catch (error) {
    console.error('Error ensuring doctor has calendar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating calendar',
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