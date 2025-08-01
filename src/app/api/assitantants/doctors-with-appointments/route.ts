/**
 * @fileoverview API endpoint para obtener doctores con sus citas asociadas para asistentes.
 * Esta API permite a los asistentes obtener información de los doctores que tienen asignados
 * junto con todas las citas programadas de cada doctor.
 * 
 * @module api/assistants/doctors-with-appointments
 * @requires NextRequest, NextResponse from 'next/server'
 * @requires db from '@rutas/db'
 * @requires users, assistants, assistantDoctor, doctors from '@rutas/db/schema'
 * @requires withAuthentication from '@rutas/app/lib/firebase/server/middleware/authMiddleware'
 * @requires DecodedIdToken from 'firebase-admin/auth'
 * @requires eq, inArray from 'drizzle-orm'
 * @requires createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS, DoctorsWithAppointmentsResponse from '@/types/api'
 * @requires validateUserRole, handleDatabaseError from '@/lib/api-helpers'
 * @author Santiago Prada
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@rutas/db";
import { assistants, assistantDoctor, doctors } from "@rutas/db/schema";
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { eq, inArray } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, HTTP_STATUS, type DoctorsWithAppointmentsResponse } from "@/types/api";
import { handleDatabaseError } from "@/lib/api-helpers";

/**
 * Manejador para obtener doctores con sus citas asociadas para asistentes.
 * 
 * @description
 * Este endpoint permite a los asistentes obtener una lista de todos los doctores
 * que tienen asignados, junto con las citas programadas de cada doctor.
 * Solo usuarios con rol de 'asistente' o 'medico' pueden acceder a este endpoint.
 * 
 * @param request - Request de Next.js (no se utilizan parámetros adicionales)
 * @param decodedToken - Token decodificado de Firebase Auth que contiene la información del usuario autenticado
 * @returns Promise<NextResponse | Response> - Lista de doctores con sus citas asociadas
 * 
 * @throws {401} Cuando el usuario no está autenticado
 * @throws {403} Cuando el usuario no tiene rol de asistente o médico
 * @throws {404} Cuando no se encuentra el registro de asistente para el usuario
 * @throws {500} Cuando ocurre un error interno del servidor
 * 
 * @example
 * ```typescript
 * // GET /api/assistants/doctors-with-appointments
 * // Headers: { Authorization: 'Bearer <firebase-token>' }
 * 
 * // Success response
 * {
 *   "message": "Doctors with appointments retrieved successfully",
 *   "data": [
 *     {
 *       "idDoctor": 1,
 *       "speciality": "Cardiología",
 *       "userId": 5,
 *       "appointments": [
 *         {
 *           "id": 10,
 *           "doctorId": 1,
 *           "patientId": 3,
 *           "status": "scheduled",
 *           "patient": {
 *             "id": 3,
 *             "firstName": "Juan",
 *             "lastName": "Pérez"
 *           }
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 * 
 * @remarks
 * - El endpoint utiliza autenticación Firebase para validar el usuario
 * - Solo asistentes y médicos pueden acceder a esta funcionalidad
 * - Se obtienen todos los doctores asignados al asistente autenticado
 * - Cada doctor incluye sus citas con información básica del paciente
 * - Si el asistente no tiene doctores asignados, retorna un array vacío
 * 
 * @privateRemarks
 * - La consulta utiliza relaciones de Drizzle ORM para optimizar las consultas
 * - Se implementa validación de roles para seguridad
 * - Los logs de consola están habilitados para debugging
 */
const getDoctorsWithAppointmentsHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;
    // Buscar el registro de asistente asociado al usuario autenticado
    const assistant = await db.query.assistants.findFirst({
      where: eq(assistants.userId, requestingUser.id),
      columns: { idAssistant: true },
    });
    // Validar que existe un registro de asistente para el usuario
    if (!assistant) {
      return createErrorResponse("Assistant not found", undefined, HTTP_STATUS.NOT_FOUND);
    }
    const assistantIdNum = assistant.idAssistant;
    
    // Obtener todos los doctores asignados al asistente
    const assistantDoctors = await db.query.assistantDoctor.findMany({
      where: eq(assistantDoctor.assistantId, assistantIdNum),
      columns: { doctorId: true },
    });
    // Extraer los IDs de los doctores asignados
    const doctorIds = assistantDoctors.map((ad) => ad.doctorId);
    
    // Si no hay doctores asignados, retornar array vacío
    if (doctorIds.length === 0) {
      return createSuccessResponse([] as DoctorsWithAppointmentsResponse, "No doctors found for this assistant");
    }
    // Obtener doctores con sus citas y información de pacientes
    const doctorsWithAppointments = await db.query.doctors.findMany({
      where: inArray(doctors.idDoctor, doctorIds),
      with: {
        user: {
          columns: {
            displayName: true,
            email: true
          },
        }, // Incluir información del usuario del doctor
        // Incluir citas programadas del doctor
        appointments: {
          with: {
            patient: true, // Incluir información del paciente en cada cita
          },
        },
      },
    });

    // Log para debugging (remover en producción)
    console.log("Doctors with appointments:", doctorsWithAppointments);

    // Retornar respuesta exitosa con los datos obtenidos
    return createSuccessResponse(doctorsWithAppointments  as DoctorsWithAppointmentsResponse, "Doctors with appointments retrieved successfully");
  } catch (error) {
    return handleDatabaseError(error, "retrieve doctors with appointments");
  }
};

/**
 * Endpoint GET para obtener doctores con citas asociadas.
 * 
 * @description
 * Endpoint HTTP GET que maneja las solicitudes para obtener la lista de doctores
 * asignados a un asistente junto con sus citas programadas.
 * 
 * @route GET /api/assistants/doctors-with-appointments
 * @access Requiere autenticación Firebase
 * @roles asistente, medico
 * 
 * @example
 * ```bash
 * curl -X GET \
 *   'https://your-domain.com/api/assistants/doctors-with-appointments' \
 *   -H 'Authorization: Bearer <firebase-token>' \
 *   -H 'Content-Type: application/json'
 * ```
 */
export const GET = withOptimizedAuthentication(getDoctorsWithAppointmentsHandler, {
  requiredRoles: ['asistente', 'medico'],
  requireOrganization: true
});