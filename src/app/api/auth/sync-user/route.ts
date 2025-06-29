// src/app/api/auth/sync-user/route.ts
/**
 * @fileoverview API endpoint para sincronizar usuarios de Firebase con la base de datos local.
 * Maneja la creación y actualización de usuarios, incluyendo la asignación automática de calendarios para doctores.
 * 
 * @module api/auth/sync-user
 * @requires NextRequest, NextResponse from 'next/server'
 * @requires db from '@rutas/db'
 * @requires users, NewUser from '@rutas/db/schema/users'
 * @requires eq, sql from 'drizzle-orm'
 * @requires assistants, doctors from '@rutas/db/schema'
 * @requires validateRequestBody, syncUserSchema, ensureDoctorHasCalendar, handleDatabaseError from '@/lib/api-helpers'
 * @requires createSuccessResponse, createErrorResponse, HTTP_STATUS, API_ERRORS from '@/types/api'
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { users, NewUser } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import { assistants, doctors } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { 
  validateRequestBody, 
  syncUserSchema, 
  ensureDoctorHasCalendar,
  handleDatabaseError 
} from '@/lib/api-helpers';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  HTTP_STATUS, 
  API_ERRORS,
  type SyncUserResponse 
} from '@/types/api';

/**
 * Endpoint POST para sincronizar usuarios de Firebase con la base de datos local.
 * 
 * @description
 * Este endpoint maneja la sincronización de usuarios entre Firebase Authentication y la base de datos local.
 * Realiza las siguientes operaciones:
 * - Valida los datos del request usando Zod schema
 * - Crea o actualiza el usuario en la base de datos (upsert)
 * - Crea registros específicos para doctores o asistentes según el rol
 * - Para doctores nuevos, valida y crea automáticamente un calendario de Google Calendar
 * 
 * @param request - Request de Next.js con los datos del usuario de Firebase
 * @returns Promise<NextResponse> - Respuesta estandarizada con información del usuario sincronizado
 * 
 * @throws {400} Cuando los datos del request no son válidos
 * @throws {500} Cuando ocurre un error interno del servidor
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "firebaseUid": "abc123",
 *   "email": "doctor@example.com",
 *   "displayName": "Dr. Juan Pérez",
 *   "emailVerified": true
 * }
 * 
 * // Success response
 * {
 *   "message": "Usuario sincronizado exitosamente",
 *   "data": {
 *     "user": { ... },
 *     "calendarCreated": true,
 *     "calendarId": "calendar123"
 *   }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  try {
    // Validar el cuerpo de la petición
    const validation = await validateRequestBody(request, syncUserSchema);
    
    if (!validation.success) {
      return validation.error;
    }
    
    const userData = validation.data;

    // Prepara los datos para insertar/actualizar
    const newUser: NewUser = {
      firebaseUid: userData.firebaseUid,
      email: userData.email,
      emailVerified: userData.emailVerified || false,
      phoneNumber: userData.phoneNumber,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      providerId: userData.providerId,
      role: 'N/A',
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Upsert: inserta o actualiza si ya existe
    await db
      .insert(users)
      .values(newUser)
      .onDuplicateKeyUpdate({
        set: {
          ...newUser,
          createdAt: sql`${users.createdAt}`, // No sobreescribas createdAt si ya existe
          role: sql`${users.role}`, // No sobreescribas el rol si ya existe
          isActive: sql`${users.isActive}`, // No sobreescribas isActive si ya existe
        },
      });

    // Obtener el usuario actualizado
    const user = await db.query.users.findFirst({ 
      where: eq(users.firebaseUid, userData.firebaseUid) 
    });
    
    if (!user) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        'Usuario no encontrado después de la sincronización',
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
    
    // Variables para tracking de operaciones adicionales
    let calendarCreated = false;
    let calendarId: string | undefined;
    let calendarError: string | undefined;

    // Crear registro en doctors o assistants si corresponde
    if (user.role === 'medico') {
      // Verifica si ya existe registro en doctors
      const doctorExists = await db.query.doctors.findFirst({ 
        where: eq(doctors.userId, user.id) 
      });
      
      if (!doctorExists) {
        // Crear el registro del doctor
        await db.insert(doctors).values({ 
          userId: user.id, 
          speciality: '', 
          calendar_id: null, 
          privatePhone: '', 
          nitId: '', 
          availability: '', 
          tokenGoogleId: '',
          calendar_settings: {
            notifications: {
              email: true,
              popup: true,
              minutesBefore: [15, 60],
            },
            workingHours: {
              start: '08:00',
              end: '18:00',
              days: [1, 2, 3, 4, 5],
            },
            autoAcceptMeetings: false,
            defaultMeetingDuration: 30,
          }
        });
      }
      
      // Obtener el doctor (existente o recién creado)
      const doctor = await db.query.doctors.findFirst({ 
        where: eq(doctors.userId, user.id) 
      });
      
      if (doctor) {
        // Validar y crear calendario si es necesario usando la función centralizada
        try {
          const displayName = user.displayName || 'Doctor';
          const calendarResult = await ensureDoctorHasCalendar(doctor.idDoctor, {
            firstName: displayName.split(' ')[0] || 'Doctor',
            lastName: displayName.split(' ').slice(1).join(' ') || '',
            email: user.email || undefined,
            timezone: 'America/Bogota'
          });
          
          if (calendarResult.success) {
            calendarCreated = calendarResult.created || false;
            calendarId = calendarResult.calendarId;
            console.log(
              `Calendar ${calendarCreated ? 'created' : 'validated'} for doctor ${doctor.idDoctor}: ${calendarId}`
            );
          } else {
            calendarError = calendarResult.error;
            console.error(`Failed to ensure calendar for doctor ${doctor.idDoctor}: ${calendarError}`);
          }
        } catch (error) {
          calendarError = error instanceof Error ? error.message : 'Unknown calendar error';
          console.error('Error ensuring doctor has calendar:', error);
        }
      }
    } else if (user.role === 'asistente') {
      // Verifica si ya existe registro en assistants
      const assistantExists = await db.query.assistants.findFirst({ 
        where: eq(assistants.userId, user.id) 
      });
      if (!assistantExists) {
        await db.insert(assistants).values({ userId: user.id });
      }
    }

    // Preparar datos de respuesta
    const responseData: SyncUserResponse & {
      calendarCreated?: boolean;
      calendarId?: string;
      calendarError?: string;
    } = {
      message: 'Usuario sincronizado exitosamente',
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email || undefined,
        role: user.role,
        displayName: user.displayName || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    // Agregar información del calendario si es un doctor
    if (user.role === 'medico') {
      responseData.calendarCreated = calendarCreated;
      if (calendarId) {
        responseData.calendarId = calendarId;
      }
      if (calendarError) {
        responseData.calendarError = calendarError;
      }
    }

    return createSuccessResponse(
      responseData,
      'Usuario sincronizado exitosamente',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error('Error in sync-user endpoint:', error);
    return handleDatabaseError(error, 'sincronizar usuario');
  }
}