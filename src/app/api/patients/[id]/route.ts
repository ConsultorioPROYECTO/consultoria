// src/app/api/patients/[id]/route.ts

/**
 * @fileoverview API Route para gestión individual de pacientes (protegida).
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-13
 *
 * @description
 * Maneja las solicitudes GET, PUT y DELETE a `/api/patients/[id]`. Requiere autenticación
 * y permisos específicos según el método HTTP:
 * - GET: Requiere rol 'admin', 'medico' o 'asistente'
 * - PUT: Requiere rol 'admin' o 'asistente'
 * - DELETE: Requiere rol 'admin'
 * 
 * Utiliza la instancia de Drizzle ORM (`db`) para operaciones CRUD sobre la tabla `patients`.
 * Implementa soft delete para la eliminación de pacientes.
 * Todas las operaciones están limitadas por organización para garantizar aislamiento de datos.
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires @/db - Instancia `db` de Drizzle ORM.
 * @requires @/db/schema - Definición de las tablas `patients` y `users`.
 * @requires @/app/lib/firebase/server/adminConfig - Para autenticación Firebase.
 * @requires firebase-admin/auth - Para el tipo `DecodedIdToken`.
 * @requires drizzle-orm - Para operadores de consulta.
 * @requires @/types/api - Para tipos de respuesta API.
 * @requires @/lib/api-helpers - Para funciones de validación y manejo de errores.
 *
 * @returns {Promise<NextResponse | Response>} Una promesa que resuelve a:
 *  - NextResponse con status 401 si la autenticación falla.
 *  - NextResponse con status 403 si el usuario no tiene permisos.
 *  - NextResponse con status 404 si el paciente no se encuentra.
 *  - NextResponse con status 200 y datos del paciente para GET exitoso.
 *  - NextResponse con status 200 y confirmación para PUT/DELETE exitosos.
 *  - NextResponse con status 500 para errores del servidor.
 *
 * @example - Cómo probar las rutas con curl:
 * # Obtener paciente por ID
 * curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/patients/123
 *
 * # Actualizar paciente
 * curl -X PUT -H "Authorization: Bearer <TOKEN>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"firstName":"Juan","lastName":"Pérez"}' \
 *   http://localhost:3000/api/patients/123
 *
 * # Eliminar paciente (soft delete)
 * curl -X DELETE -H "Authorization: Bearer <TOKEN>" \
 *   http://localhost:3000/api/patients/123
 *
 * @example - Respuesta esperada para GET:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 123,
 *     "firstName": "Juan",
 *     "lastName": "Pérez",
 *     "appointments": [...]
 *   },
 *   "message": "Paciente encontrado"
 * }
 *
 * @todo Implementar validación de esquema con Zod para datos de entrada.
 * @todo Considerar implementar versionado de API.
 * @todo Añadir logging más detallado para auditoría.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and, not } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewPatient } from "@/db/schema";

// --- Definición de Manejadores de Métodos HTTP ---

/**
 * Manejador para solicitudes GET a /api/patients/[id].
 * Obtiene un paciente específico por su ID con información relacionada.
 *
 * @async
 * @param {NextRequest} request - El objeto de la solicitud entrante.
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado.
 * @param {Object} params - Parámetros de la ruta dinámica.
 * @param {Promise<{id: string}>} params.params - Promesa que resuelve a los parámetros de ruta.
 * @returns {Promise<NextResponse | Response>} La respuesta HTTP con los datos del paciente.
 * 
 * @description
 * - Verifica que el usuario tenga rol 'admin', 'medico' o 'asistente'
 * - Valida que el ID del paciente sea un número válido
 * - Busca el paciente en la organización del usuario autenticado
 * - Incluye información de citas relacionadas con doctor y servicio
 * - Solo retorna pacientes activos (isActive: true)
 */
const getPatientByIdHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const { id } = await params;
    const patientId = parseInt(id);
    if (isNaN(patientId)) {
      return createErrorResponse("ID de paciente inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.isActive, true)
      ),
      with: {
        appointments: {
          with: {
            doctor: {
              columns: { speciality: true }
            },
            service: {
              columns: { name: true, category: true }
            }
          },
          orderBy: (appointments, { desc }) => [ desc(appointments.id)]
        }
      }
    });

    if (!patient) {
      return createErrorResponse("Paciente no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(patient, "Paciente encontrado");
  } catch (error) {
    return handleDatabaseError(error, "obtener paciente");
  }
};

/**
 * Manejador para solicitudes PUT a /api/patients/[id].
 * Actualiza los datos de un paciente existente.
 *
 * @async
 * @param {NextRequest} request - El objeto de la solicitud entrante con datos de actualización.
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado.
 * @param {Object} params - Parámetros de la ruta dinámica.
 * @param {Promise<{id: string}>} params.params - Promesa que resuelve a los parámetros de ruta.
 * @returns {Promise<NextResponse | Response>} La respuesta HTTP con confirmación de actualización.
 * 
 * @description
 * - Verifica que el usuario tenga rol 'admin' o 'asistente'
 * - Valida que el paciente exista y pertenezca a la organización
 * - Verifica unicidad de identificación si se actualiza
 * - Actualiza solo los campos proporcionados en el cuerpo de la solicitud
 * - Mantiene integridad referencial y validaciones de negocio
 */
const updatePatientHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins y asistentes pueden actualizar pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const { id } = await params;
    const patientId = parseInt(id);
    if (isNaN(patientId)) {
      return createErrorResponse("ID de paciente inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el paciente existe y pertenece a la organización
    const existingPatient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.isActive, true)
      )
    });

    if (!existingPatient) {
      return createErrorResponse("Paciente no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    const body = await request.json();

    // Si se está actualizando la identificación, verificar que no exista otro paciente con la misma
    if (body.identificationType && body.identificationNumber) {
      const duplicatePatient = await db.query.patients.findFirst({
        where: and(
          eq(patients.organizationId, requestingUser.organizationId),
          eq(patients.identificationType, body.identificationType),
          eq(patients.identificationNumber, body.identificationNumber),
          eq(patients.isActive, true),
          // Excluir el paciente actual de la búsqueda
          not(eq(patients.id, patientId))
        )
      });

      if (duplicatePatient) {
        return createErrorResponse(
          "Ya existe otro paciente con esta identificación", 
          undefined, 
          HTTP_STATUS.CONFLICT
        );
      }
    }

    // Preparar datos de actualización (solo campos que se envían)
    const updateData: Partial<NewPatient> = {};
    
    // Mapear campos específicos con validación de tipos
    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.identificationType !== undefined) updateData.identificationType = body.identificationType;
    if (body.identificationNumber !== undefined) updateData.identificationNumber = body.identificationNumber;
    if (body.birthDate !== undefined) updateData.birthDate = new Date(body.birthDate);
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.emergencyContactName !== undefined) updateData.emergencyContactName = body.emergencyContactName;
    if (body.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = body.emergencyContactPhone;
    if (body.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = body.emergencyContactRelation;
    if (body.medicalHistory !== undefined) updateData.medicalHistory = body.medicalHistory;
    if (body.allergies !== undefined) updateData.allergies = body.allergies;
    if (body.currentMedications !== undefined) updateData.currentMedications = body.currentMedications;
    if (body.bloodType !== undefined) updateData.bloodType = body.bloodType;

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse("No hay campos para actualizar", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    await db.update(patients)
      .set(updateData)
      .where(eq(patients.id, patientId));

    return createSuccessResponse(
      { id: patientId, updated: Object.keys(updateData) },
      "Paciente actualizado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "actualizar paciente");
  }
};

/**
 * Manejador para solicitudes DELETE a /api/patients/[id].
 * Realiza eliminación lógica (soft delete) de un paciente.
 *
 * @async
 * @param {NextRequest} request - El objeto de la solicitud entrante.
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado.
 * @param {Object} params - Parámetros de la ruta dinámica.
 * @param {Promise<{id: string}>} params.params - Promesa que resuelve a los parámetros de ruta.
 * @returns {Promise<NextResponse | Response>} La respuesta HTTP con confirmación de eliminación.
 * 
 * @description
 * - Verifica que el usuario tenga rol 'admin' (solo administradores pueden eliminar)
 * - Valida que el paciente exista y pertenezca a la organización
 * - Realiza soft delete marcando isActive como false
 * - Preserva datos históricos y relaciones para auditoría
 * - No elimina físicamente el registro de la base de datos
 */
const deletePatientHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins pueden eliminar pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const { id } = await params;
    const patientId = parseInt(id);
    if (isNaN(patientId)) {
      return createErrorResponse("ID de paciente inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el paciente existe y pertenece a la organización
    const existingPatient = await db.query.patients.findFirst({
      where: and(
        eq(patients.id, patientId),
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.isActive, true)
      )
    });

    if (!existingPatient) {
      return createErrorResponse("Paciente no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Soft delete - marcar como inactivo
    await db.update(patients)
      .set({ isActive: false })
      .where(eq(patients.id, patientId));

    return createSuccessResponse(
      { id: patientId },
      "Paciente desactivado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "eliminar paciente");
  }
};

// --- Función de Autenticación ---

/**
 * Autentica una solicitud HTTP verificando el token Firebase ID.
 *
 * @async
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @returns {Promise<DecodedIdToken | null>} El token decodificado si es válido, null en caso contrario.
 * 
 * @description
 * Extrae y verifica el token de autorización del header 'Authorization'.
 * Espera el formato 'Bearer <token>' y utiliza Firebase Admin SDK para la verificación.
 * 
 * @example
 * const token = await authenticateRequest(request);
 * if (!token) {
 *   return createErrorResponse('Unauthorized', undefined, HTTP_STATUS.UNAUTHORIZED);
 * }
 */
async function authenticateRequest(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// --- Exportación de Métodos HTTP ---

/**
 * Maneja solicitudes GET para obtener un paciente específico por ID.
 * 
 * @async
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {Object} context - Contexto de la ruta con parámetros dinámicos.
 * @param {Promise<{id: string}>} context.params - Parámetros de la ruta dinámica.
 * @returns {Promise<NextResponse | Response>} Respuesta con datos del paciente o error.
 * 
 * @example
 * GET /api/patients/123
 * Authorization: Bearer <firebase-id-token>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getPatientByIdHandler(request, decodedToken, { params });
}

/**
 * Maneja solicitudes PUT para actualizar un paciente existente.
 * 
 * @async
 * @param {NextRequest} request - La solicitud HTTP entrante con datos de actualización.
 * @param {Object} context - Contexto de la ruta con parámetros dinámicos.
 * @param {Promise<{id: string}>} context.params - Parámetros de la ruta dinámica.
 * @returns {Promise<NextResponse | Response>} Respuesta con confirmación de actualización o error.
 * 
 * @example
 * PUT /api/patients/123
 * Authorization: Bearer <firebase-id-token>
 * Content-Type: application/json
 * 
 * {
 *   "firstName": "Juan",
 *   "lastName": "Pérez",
 *   "phone": "+57 300 123 4567"
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return updatePatientHandler(request, decodedToken, { params });
}

/**
 * Maneja solicitudes DELETE para eliminar lógicamente un paciente.
 * 
 * @async
 * @param {NextRequest} request - La solicitud HTTP entrante.
 * @param {Object} context - Contexto de la ruta con parámetros dinámicos.
 * @param {Promise<{id: string}>} context.params - Parámetros de la ruta dinámica.
 * @returns {Promise<NextResponse | Response>} Respuesta con confirmación de eliminación o error.
 * 
 * @example
 * DELETE /api/patients/123
 * Authorization: Bearer <firebase-id-token>
 * 
 * @note
 * Esta operación realiza un "soft delete" marcando el paciente como inactivo.
 * Solo usuarios con rol 'admin' pueden realizar esta operación.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return deletePatientHandler(request, decodedToken, { params });
}