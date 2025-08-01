/**
 * @fileoverview API endpoint para gestionar asignaciones de doctores a asistentes.
 * Esta API permite crear y obtener relaciones entre doctores y asistentes.
 * Solo usuarios con rol de administrador pueden acceder a esta funcionalidad.
 * 
 * @module api/master/doctor-assign-to-assistant
 * @requires NextRequest, NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires assistantDoctor from '@/db/schema/assistant_doctor'
 * @requires doctors, assistants, users from '@/db/schema'
 * @requires eq, and from 'drizzle-orm'
 * @requires requireAdmin from '@/lib/auth-middleware'
 * @requires validateRequestBody, createDoctorAssistantAssignmentSchema, getDoctorAssistantAssignmentsSchema, handleDatabaseError from '@/lib/api-helpers'
 * @requires createSuccessResponse, createErrorResponse, HTTP_STATUS, API_ERRORS from '@/types/api'
 * @author Santiago Prada
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assistantDoctor } from '@/db/schema/assistant_doctor';
import { doctors, assistants, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  validateRequestBody,
  createDoctorAssistantAssignmentSchema,
  handleDatabaseError,
} from '@/lib/api-helpers';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  HTTP_STATUS, 
  API_ERRORS,
  type CreateDoctorAssistantAssignmentRequest,
  type GetDoctorAssistantAssignmentsRequest,
  type DoctorAssistantAssignmentResponse,
  type DoctorAssistantAssignmentsResponse,
  type DeleteDoctorAssistantAssignmentRequest
} from '@/types/api';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

/**
 * Endpoint GET para obtener asignaciones de doctores a asistentes.
 * 
 * @description
 * Este endpoint permite obtener todas las asignaciones existentes entre doctores y asistentes,
 * con la opción de filtrar por doctorId o assistantId mediante query parameters.
 * Solo usuarios con rol de administrador pueden acceder.
 * 
 * @param request - Request de Next.js con query parameters opcionales
 * @returns Promise<NextResponse> - Lista de asignaciones con información detallada
 * 
 * @throws {401} Cuando el usuario no está autenticado
 * @throws {403} Cuando el usuario no tiene rol de administrador
 * @throws {500} Cuando ocurre un error interno del servidor
 * 
 * @example
 * ```typescript
 * // GET /api/master/doctor-assign-to-assistant
 * // GET /api/master/doctor-assign-to-assistant?doctorId=1
 * // GET /api/master/doctor-assign-to-assistant?assistantId=2
 * 
 * // Success response
 * {
 *   "message": "Asignaciones obtenidas exitosamente",
 *   "data": [
 *     {
 *       "doctorId": 1,
 *       "assistantId": 2,
 *       "doctor": {
 *         "idDoctor": 1,
 *         "speciality": "Cardiología",
 *         "user": {
 *           "id": 1,
 *           "displayName": "Dr. Juan Pérez",
 *           "email": "doctor@example.com"
 *         }
 *       },
 *       "assistant": {
 *         "idAssistant": 2,
 *         "user": {
 *           "id": 2,
 *           "displayName": "María García",
 *           "email": "assistant@example.com"
 *         }
 *       }
 *     }
 *   ]
 * }
 * ```
 */
const getHandler = async (request: NextRequest, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userInfo: AuthenticatedUserInfo): Promise<NextResponse> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { searchParams } = new URL(request.url);
    const doctorIdParam = searchParams.get('doctorId');
    const assistantIdParam = searchParams.get('assistantId');
    const queryData: GetDoctorAssistantAssignmentsRequest = {};
    if (doctorIdParam) {
      const doctorId = parseInt(doctorIdParam, 10);
      if (isNaN(doctorId) || doctorId <= 0) {
        return createErrorResponse(
          API_ERRORS.INVALID_REQUEST,
          'doctorId debe ser un número entero positivo',
          HTTP_STATUS.BAD_REQUEST
        );
      }
      queryData.doctorId = doctorId;
    }
    if (assistantIdParam) {
      const assistantId = parseInt(assistantIdParam, 10);
      if (isNaN(assistantId) || assistantId <= 0) {
        return createErrorResponse(
          API_ERRORS.INVALID_REQUEST,
          'assistantId debe ser un número entero positivo',
          HTTP_STATUS.BAD_REQUEST
        );
      }
      queryData.assistantId = assistantId;
    }
    const conditions = [];
    if (queryData.doctorId) {
      conditions.push(eq(assistantDoctor.doctorId, queryData.doctorId));
    }
    if (queryData.assistantId) {
      conditions.push(eq(assistantDoctor.assistantId, queryData.assistantId));
    }
    const queryBuilder = db
      .select({
        doctorId: assistantDoctor.doctorId,
        assistantId: assistantDoctor.assistantId,
      })
      .from(assistantDoctor);
    const assignments = conditions.length > 0 
      ? await queryBuilder.where(and(...conditions))
      : await queryBuilder;
    const formattedAssignments: DoctorAssistantAssignmentsResponse = [];
    for (const assignment of assignments) {
      const doctor = await db.query.doctors.findFirst({
        where: eq(doctors.idDoctor, assignment.doctorId),
        with: {
          user: {
            columns: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });
      const assistant = await db
        .select({
          idAssistant: assistants.idAssistant,
          userId: assistants.userId,
          userDisplayName: users.displayName,
          userEmail: users.email,
        })
        .from(assistants)
        .innerJoin(users, eq(assistants.userId, users.id))
        .where(eq(assistants.idAssistant, assignment.assistantId))
        .limit(1);
      if (doctor && assistant && assistant.length > 0) {
        const assistantData = assistant[0];
        formattedAssignments.push({
          doctorId: assignment.doctorId,
          assistantId: assignment.assistantId,
          doctor: {
            idDoctor: doctor.idDoctor,
            speciality: doctor.speciality,
            user: {
              id: doctor.user.id,
              displayName: doctor.user.displayName,
              email: doctor.user.email,
            },
          },
          assistant: {
            idAssistant: assistantData.idAssistant,
            user: {
              id: assistantData.userId,
              displayName: assistantData.userDisplayName,
              email: assistantData.userEmail,
            },
          },
        });
      }
    }
    return createSuccessResponse(
      formattedAssignments,
      'Asignaciones obtenidas exitosamente',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error('Error in GET doctor-assign-to-assistant endpoint:', error);
    return handleDatabaseError(error, 'obtener asignaciones');
  }
};
export const GET = withOptimizedAuthentication(getHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true
});

/**
 * Endpoint POST para crear una nueva asignación de doctor a asistente.
 * 
 * @description
 * Este endpoint permite crear una nueva relación entre un doctor y un asistente.
 * Valida que tanto el doctor como el asistente existan antes de crear la asignación.
 * Previene la creación de asignaciones duplicadas.
 * Solo usuarios con rol de administrador pueden acceder.
 * 
 * @param request - Request de Next.js con los datos de la asignación
 * @returns Promise<NextResponse> - Información de la asignación creada
 * 
 * @throws {400} Cuando los datos del request no son válidos
 * @throws {401} Cuando el usuario no está autenticado
 * @throws {403} Cuando el usuario no tiene rol de administrador
 * @throws {404} Cuando el doctor o asistente no existe
 * @throws {409} Cuando la asignación ya existe
 * @throws {500} Cuando ocurre un error interno del servidor
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "doctorId": 1,
 *   "assistantId": 2
 * }
 * 
 * // Success response
 * {
 *   "message": "Asignación creada exitosamente",
 *   "data": {
 *     "doctorId": 1,
 *     "assistantId": 2,
 *     "doctor": {
 *       "idDoctor": 1,
 *       "speciality": "Cardiología",
 *       "user": {
 *         "id": 1,
 *         "displayName": "Dr. Juan Pérez",
 *         "email": "doctor@example.com"
 *       }
 *     },
 *     "assistant": {
 *       "idAssistant": 2,
 *       "user": {
 *         "id": 2,
 *         "displayName": "María García",
 *         "email": "assistant@example.com"
 *       }
 *     }
 *   }
 * }
 * ```
 */
const postHandler = async (request: NextRequest, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userInfo: AuthenticatedUserInfo): Promise<NextResponse> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const validation = await validateRequestBody(request, createDoctorAssistantAssignmentSchema);
    if (!validation.success) {
      return validation.error;
    }
    const assignmentData: CreateDoctorAssistantAssignmentRequest = validation.data;
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, assignmentData.doctorId),
      with: {
        user: {
          columns: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
    if (!doctor) {
      return createErrorResponse(
        API_ERRORS.DOCTOR_NOT_FOUND,
        `Doctor con ID ${assignmentData.doctorId} no encontrado`,
        HTTP_STATUS.NOT_FOUND
      );
    }
    const assistant = await db
      .select({
        idAssistant: assistants.idAssistant,
        userId: assistants.userId,
        userDisplayName: users.displayName,
        userEmail: users.email,
      })
      .from(assistants)
      .innerJoin(users, eq(assistants.userId, users.id))
      .where(eq(assistants.idAssistant, assignmentData.assistantId))
      .limit(1);
    if (!assistant || assistant.length === 0) {
      return createErrorResponse(
        API_ERRORS.ASSISTANT_NOT_FOUND,
        `Asistente con ID ${assignmentData.assistantId} no encontrado`,
        HTTP_STATUS.NOT_FOUND
      );
    }
    const assistantData = assistant[0];
    const existingAssignment = await db.query.assistantDoctor.findFirst({
      where: and(
        eq(assistantDoctor.doctorId, assignmentData.doctorId),
        eq(assistantDoctor.assistantId, assignmentData.assistantId)
      ),
    });
    if (existingAssignment) {
      return createErrorResponse(
        API_ERRORS.ASSIGNMENT_ALREADY_EXISTS,
        `La asignación entre el doctor ${assignmentData.doctorId} y el asistente ${assignmentData.assistantId} ya existe`,
        HTTP_STATUS.CONFLICT
      );
    }
    await db.insert(assistantDoctor).values({
      doctorId: assignmentData.doctorId,
      assistantId: assignmentData.assistantId,
    });
    const responseData: DoctorAssistantAssignmentResponse = {
      doctorId: assignmentData.doctorId,
      assistantId: assignmentData.assistantId,
      doctor: {
        idDoctor: doctor.idDoctor,
        speciality: doctor.speciality,
        user: {
          id: doctor.user.id,
          displayName: doctor.user.displayName,
          email: doctor.user.email,
        },
      },
      assistant: {
        idAssistant: assistantData.idAssistant,
        user: {
          id: assistantData.userId,
          displayName: assistantData.userDisplayName,
          email: assistantData.userEmail,
        },
      },
    };
    return createSuccessResponse(
      responseData,
      'Asignación creada exitosamente',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error('Error in POST doctor-assign-to-assistant endpoint:', error);
    return handleDatabaseError(error, 'crear asignación');
  }
};
export const POST = withOptimizedAuthentication(postHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true
});

/**
 * Endpoint DELETE para eliminar una asignación de doctor a asistente.
 * 
 * @description
 * Este endpoint permite eliminar una relación existente entre un doctor y un asistente.
 * Requiere los parámetros doctorId y assistantId como query parameters.
 * Valida que la asignación exista antes de eliminarla.
 * Solo usuarios con rol de administrador pueden acceder.
 * 
 * @param request - Request de Next.js con query parameters doctorId y assistantId
 * @returns Promise<NextResponse> - Confirmación de eliminación exitosa
 * 
 * @throws {400} Cuando faltan parámetros requeridos o son inválidos
 * @throws {401} Cuando el usuario no está autenticado
 * @throws {403} Cuando el usuario no tiene rol de administrador
 * @throws {404} Cuando la asignación no existe
 * @throws {500} Cuando ocurre un error interno del servidor
 * 
 * @example
 * ```typescript
 * // DELETE /api/master/doctor-assign-to-assistant?doctorId=1&assistantId=2
 * 
 * // Success response
 * {
 *   "message": "Asignación eliminada exitosamente",
 *   "data": {
 *     "doctorId": 1,
 *     "assistantId": 2
 *   }
 * }
 * ```
 */
const deleteHandler = async (request: NextRequest, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userInfo: AuthenticatedUserInfo): Promise<NextResponse> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    
    // Obtener y validar parámetros de query
    const { searchParams } = new URL(request.url);
    const doctorIdParam = searchParams.get('doctorId');
    const assistantIdParam = searchParams.get('assistantId');

    // Validar que ambos parámetros estén presentes
    if (!doctorIdParam || !assistantIdParam) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Se requieren los parámetros doctorId y assistantId',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Validar que sean números enteros positivos
    const doctorId = parseInt(doctorIdParam, 10);
    const assistantId = parseInt(assistantIdParam, 10);

    if (isNaN(doctorId) || doctorId <= 0) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'doctorId debe ser un número entero positivo',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    if (isNaN(assistantId) || assistantId <= 0) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'assistantId debe ser un número entero positivo',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Verificar que la asignación existe
    const existingAssignment = await db.query.assistantDoctor.findFirst({
      where: and(
        eq(assistantDoctor.doctorId, doctorId),
        eq(assistantDoctor.assistantId, assistantId)
      ),
    });

    if (!existingAssignment) {
      return createErrorResponse(
        API_ERRORS.ASSIGNMENT_NOT_FOUND,
        `No se encontró una asignación entre el doctor ${doctorId} y el asistente ${assistantId}`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Eliminar la asignación
    await db
      .delete(assistantDoctor)
      .where(
        and(
          eq(assistantDoctor.doctorId, doctorId),
          eq(assistantDoctor.assistantId, assistantId)
        )
      );

    const responseData: DeleteDoctorAssistantAssignmentRequest = {
      doctorId,
      assistantId
    };

    return createSuccessResponse(
      responseData,
      'Asignación eliminada exitosamente',
      HTTP_STATUS.OK
    );

  } catch (error) {
    console.error('Error in DELETE doctor-assign-to-assistant endpoint:', error);
    return handleDatabaseError(error, 'eliminar asignación');
  }
};

export const DELETE = withOptimizedAuthentication(deleteHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true
});