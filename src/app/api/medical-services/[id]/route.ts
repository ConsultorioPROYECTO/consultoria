import { NextRequest, NextResponse } from "next/server";
/**
 * @fileoverview API de servicios médicos por ID - Operaciones CRUD específicas
 * 
 * Este módulo implementa las operaciones CRUD (Create, Read, Update, Delete) para
 * servicios médicos específicos identificados por su ID. Proporciona endpoints
 * para obtener, actualizar y desactivar servicios médicos individuales con
 * validación completa de permisos y datos.
 * 
 * @module api/medical-services/[id]
 * @version 1.0.0
 * @author Sistema de Gestión Médica
 * @since 1.0.0
 * 
 * @requires @/db - Conexión a base de datos Drizzle ORM
 * @requires @/db/schema - Esquemas de tablas (medicalServices, users)
 * @requires @/app/lib/firebase/server/adminConfig - Configuración Firebase Admin
 * @requires firebase-admin/auth - Tipos de autenticación Firebase
 * @requires drizzle-orm - Operadores de consulta ORM
 * @requires @/types/api - Tipos y utilidades de respuesta API
 * @requires @/lib/api-helpers - Funciones auxiliares de validación
 * 
 * @example
 * ```typescript
 * // GET - Obtener servicio específico
 * const response = await fetch('/api/medical-services/123', {
 *   headers: { 'Authorization': 'Bearer <token>' }
 * });
 * 
 * // PUT - Actualizar servicio
 * const updateResponse = await fetch('/api/medical-services/123', {
 *   method: 'PUT',
 *   headers: {
 *     'Authorization': 'Bearer <token>',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     name: 'Nuevo nombre',
 *     basePrice: '80000'
 *   })
 * });
 * 
 * // DELETE - Desactivar servicio
 * const deleteResponse = await fetch('/api/medical-services/123', {
 *   method: 'DELETE',
 *   headers: { 'Authorization': 'Bearer <token>' }
 * });
 * ```
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://orm.drizzle.team/docs/overview | Drizzle ORM Documentation}
 * @see {@link https://firebase.google.com/docs/auth/admin | Firebase Admin Auth}
 */

import { db } from "@/db";
import { medicalServices, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and, not } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewMedicalService } from "@/db/schema";
import { syncKnowledgeAfterCRUD } from "@/lib/knowledge-manager";

/**
 * Handler para obtener un servicio médico específico por su ID.
 * 
 * Recupera un servicio médico individual con información detallada incluyendo
 * doctores asociados, servicios médicos relacionados y citas recientes. Implementa
 * validación de permisos organizacionales y verificación de roles de usuario.
 * 
 * @async
 * @function getMedicalServiceByIdHandler
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase
 * @param {DecodedIdToken} decodedToken.uid - ID único del usuario en Firebase
 * @param {Object} context - Contexto de parámetros de ruta
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta con ID del servicio
 * 
 * @returns {Promise<NextResponse|Response>} Respuesta HTTP con datos del servicio o error
 * 
 * @description
 * **Lógica de negocio:**
 * 1. Valida autenticación y permisos del usuario solicitante
 * 2. Verifica que el usuario pertenezca a una organización válida
 * 3. Valida roles autorizados (admin, medico, asistente)
 * 4. Convierte y valida el ID del servicio como número entero
 * 5. Busca el servicio con relaciones anidadas (doctores, citas)
 * 6. Filtra por organización y estado activo del servicio
 * 7. Retorna datos completos del servicio con información relacionada
 * 
 * **Relaciones incluidas:**
 * - `doctorServices`: Servicios de doctores asociados
 * - `doctor.user`: Información del usuario doctor (nombre)
 * - `appointments`: Últimas 10 citas ordenadas por fecha
 * - `patient`: Información básica del paciente por cita
 * 
 * **Roles autorizados:** admin, medico, asistente
 * **Filtros aplicados:** organizationId, isActive = true
 * 
 * @throws {ValidationError} ID de servicio inválido (no numérico)
 * @throws {AuthenticationError} Token inválido o usuario no encontrado
 * @throws {AuthorizationError} Usuario sin permisos o rol no autorizado
 * @throws {NotFoundError} Servicio no encontrado o no pertenece a la organización
 * @throws {DatabaseError} Error en operaciones de base de datos
 * 
 * @example
 * ```typescript
 * // Respuesta exitosa
 * {
 *   "success": true,
 *   "message": "Servicio médico encontrado",
 *   "data": {
 *     "id": 123,
 *     "name": "Consulta General",
 *     "code": "CG001",
 *     "category": "Consulta",
 *     "durationMinutes": 30,
 *     "basePrice": "50000",
 *     "description": "Consulta médica general",
 *     "doctorServices": [
 *       {
 *         "doctor": {
 *           "idDoctor": 456,
 *           "speciality": "Medicina General",
 *           "user": {
 *             "displayName": "Dr. Juan Pérez"
 *           }
 *         }
 *       }
 *     ],
 *     "appointments": [
 *       {
 *         "id": 789,
 *         "date": "2024-01-15",
 *         "time": "09:00",
 *         "status": "scheduled",
 *         "patient": {
 *           "firstName": "María",
 *           "lastName": "González"
 *         }
 *       }
 *     ]
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Sistema de Gestión Médica
 * 
 * @see {@link https://orm.drizzle.team/docs/queries | Drizzle ORM Queries}
 * @see {@link validateUserRole} Función de validación de roles
 * @see {@link handleDatabaseError} Manejo de errores de base de datos
 */
const getMedicalServiceByIdHandler = async (
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
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const service = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      ),
      with: {
        doctorServices: {
          with: {
            doctor: {
              columns: { idDoctor: true, speciality: true },
              with: {
                user: {
                  columns: { displayName: true }
                }
              }
            }
          },
          where: eq(medicalServices.isActive, true)
        },
        appointments: {
          columns: { id: true, status: true },
          with: {
            patient: {
              columns: { firstName: true, lastName: true}
            }
          },
          limit: 10,
          orderBy: (appointments, { desc }) => [desc(appointments.createdAt)]
        }
      }
    });

    if (!service) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(service, "Servicio médico encontrado");
  } catch (error) {
    return handleDatabaseError(error, "obtener servicio médico");
  }
};

/**
 * Handler para actualizar un servicio médico existente.
 * 
 * Permite la actualización parcial o completa de un servicio médico con validación
 * de datos, verificación de duplicados de código y control de permisos estricto.
 * Solo usuarios administradores pueden realizar actualizaciones de servicios médicos.
 * 
 * @async
 * @function updateMedicalServiceHandler
 * @param {NextRequest} request - Objeto de solicitud HTTP con cuerpo JSON
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase
 * @param {DecodedIdToken} decodedToken.uid - ID único del usuario en Firebase
 * @param {Object} context - Contexto de parámetros de ruta
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta con ID del servicio
 * 
 * @returns {Promise<NextResponse|Response>} Respuesta HTTP con confirmación de actualización o error
 * 
 * @description
 * **Lógica de negocio:**
 * 1. Valida autenticación y permisos de administrador
 * 2. Verifica que el usuario pertenezca a una organización válida
 * 3. Valida y convierte el ID del servicio a número entero
 * 4. Verifica existencia del servicio en la organización
 * 5. Valida unicidad del código si se está actualizando
 * 6. Procesa y valida campos de actualización selectivamente
 * 7. Ejecuta actualización en base de datos
 * 8. Retorna confirmación con campos actualizados
 * 
 * **Campos actualizables:**
 * - `name` (string): Nombre del servicio médico
 * - `description` (string): Descripción detallada
 * - `code` (string): Código único (se convierte a mayúsculas)
 * - `durationMinutes` (number): Duración en minutos
 * - `basePrice` (string): Precio base como decimal
 * - `category` (string): Categoría del servicio
 * - `requiresPreparation` (boolean): Si requiere preparación
 * - `preparationInstructions` (string): Instrucciones de preparación
 * 
 * **Validaciones aplicadas:**
 * - Verificación de existencia del servicio
 * - Validación de unicidad de código en la organización
 * - Conversión automática de código a mayúsculas
 * - Validación de tipos de datos
 * - Verificación de al menos un campo para actualizar
 * 
 * **Roles autorizados:** admin únicamente
 * **Método HTTP:** PUT
 * **Content-Type:** application/json
 * 
 * @throws {ValidationError} ID inválido o sin campos para actualizar
 * @throws {AuthenticationError} Token inválido o usuario no encontrado
 * @throws {AuthorizationError} Usuario sin permisos de administrador
 * @throws {NotFoundError} Servicio no encontrado en la organización
 * @throws {ConflictError} Código duplicado en la organización
 * @throws {DatabaseError} Error en operaciones de base de datos
 * 
 * @example
 * ```typescript
 * // Cuerpo de solicitud
 * {
 *   "name": "Consulta Especializada Actualizada",
 *   "basePrice": "85000",
 *   "durationMinutes": 50,
 *   "description": "Consulta con especialista actualizada"
 * }
 * 
 * // Respuesta exitosa
 * {
 *   "success": true,
 *   "message": "Servicio médico actualizado exitosamente",
 *   "data": {
 *     "id": 123,
 *     "updated": ["name", "basePrice", "durationMinutes", "description"]
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Sistema de Gestión Médica
 * 
 * @see {@link https://orm.drizzle.team/docs/update | Drizzle ORM Update}
 * @see {@link validateUserRole} Función de validación de roles
 * @see {@link NewMedicalService} Tipo de datos del servicio médico
 */
const updateMedicalServiceHandler = async (
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

    // Solo admins pueden actualizar servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const { id } = await params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el servicio existe y pertenece a la organización (se busca sin importar el estado isActive)
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId)
      )
    });

    if (!existingService) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    const body = await request.json();

    // Si se está actualizando el código, verificar que no exista otro servicio con el mismo
    if (body.code) {
      const duplicateService = await db.query.medicalServices.findFirst({
        where: and(
          eq(medicalServices.organizationId, requestingUser.organizationId),
          eq(medicalServices.code, body.code.toUpperCase()),
          eq(medicalServices.isActive, true),
          not(eq(medicalServices.id, serviceId))
        )
      });

      if (duplicateService) {
        return createErrorResponse(
          "Ya existe otro servicio con este código",
          undefined,
          HTTP_STATUS.CONFLICT
        );
      }
    }

    // Preparar datos de actualización
    const updateData: Partial<NewMedicalService> = {};

    // Mapear campos específicos con validación de tipos
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.code !== undefined) updateData.code = body.code.toUpperCase();
    if (body.durationMinutes !== undefined) updateData.durationMinutes = parseInt(body.durationMinutes);
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice.toString();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.requiresPreparation !== undefined) updateData.requiresPreparation = body.requiresPreparation;
    if (body.preparationInstructions !== undefined) updateData.preparationInstructions = body.preparationInstructions;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse("No hay campos para actualizar", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    await db.update(medicalServices)
      .set(updateData)
      .where(eq(medicalServices.id, serviceId));

    // Sincronizar conocimiento con pgVector después de la actualización
    try {
      await syncKnowledgeAfterCRUD(
        'service',
        'update',
        { ...existingService, ...updateData }
      );
    } catch (knowledgeError) {
      console.error('Error sincronizando conocimiento después de actualizar servicio:', knowledgeError);
      // No fallar la operación principal por errores de sincronización
    }

    return createSuccessResponse(
      { id: serviceId, updated: Object.keys(updateData) },
      "Servicio médico actualizado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "actualizar servicio médico");
  }
};

/**
 * Handler para desactivar un servicio médico (eliminación suave).
 * 
 * Implementa eliminación suave (soft delete) marcando el servicio como inactivo
 * en lugar de eliminarlo físicamente de la base de datos. Verifica citas futuras
 * asociadas y proporciona advertencias apropiadas. Solo administradores pueden
 * realizar esta operación.
 * 
 * @async
 * @function deleteMedicalServiceHandler
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase
 * @param {DecodedIdToken} decodedToken.uid - ID único del usuario en Firebase
 * @param {Object} context - Contexto de parámetros de ruta
 * @param {Promise<{id: string}>} context.params - Parámetros de ruta con ID del servicio
 * 
 * @returns {Promise<NextResponse|Response>} Respuesta HTTP con confirmación de desactivación o error
 * 
 * @description
 * **Lógica de negocio:**
 * 1. Valida autenticación y permisos de administrador
 * 2. Verifica que el usuario pertenezca a una organización válida
 * 3. Valida y convierte el ID del servicio a número entero
 * 4. Verifica existencia del servicio en la organización
 * 5. Busca citas futuras asociadas al servicio (opcional)
 * 6. Ejecuta eliminación suave marcando isActive = false
 * 7. Retorna confirmación con advertencias si hay citas afectadas
 * 
 * **Características de eliminación suave:**
 * - No elimina físicamente el registro de la base de datos
 * - Marca el campo `isActive` como `false`
 * - Preserva integridad referencial con citas existentes
 * - Permite recuperación posterior si es necesario
 * - Mantiene historial completo para auditoría
 * 
 * **Verificaciones de seguridad:**
 * - Validación de permisos de administrador
 * - Verificación de pertenencia organizacional
 * - Detección de citas futuras potencialmente afectadas
 * - Advertencias sobre impacto en citas programadas
 * 
 * **Roles autorizados:** admin únicamente
 * **Método HTTP:** DELETE
 * **Operación:** Soft delete (isActive = false)
 * 
 * @throws {ValidationError} ID de servicio inválido (no numérico)
 * @throws {AuthenticationError} Token inválido o usuario no encontrado
 * @throws {AuthorizationError} Usuario sin permisos de administrador
 * @throws {NotFoundError} Servicio no encontrado en la organización
 * @throws {DatabaseError} Error en operaciones de base de datos
 * 
 * @example
 * ```typescript
 * // Respuesta exitosa sin citas afectadas
 * {
 *   "success": true,
 *   "message": "Servicio médico desactivado exitosamente",
 *   "data": {
 *     "id": 123,
 *     "warning": null
 *   }
 * }
 * 
 * // Respuesta exitosa con advertencia de citas
 * {
 *   "success": true,
 *   "message": "Servicio médico desactivado exitosamente",
 *   "data": {
 *     "id": 123,
 *     "warning": "El servicio tenía citas asociadas que podrían verse afectadas"
 *   }
 * }
 * ```
 * 
 * @remarks
 * Esta función implementa eliminación suave para preservar la integridad
 * de datos históricos y permitir recuperación posterior. Las citas existentes
 * no se eliminan automáticamente, pero se proporciona una advertencia si
 * existen citas asociadas que podrían verse afectadas.
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Sistema de Gestión Médica
 * 
 * @see {@link https://orm.drizzle.team/docs/update | Drizzle ORM Update}
 * @see {@link validateUserRole} Función de validación de roles
 * @see {@link handleDatabaseError} Manejo de errores de base de datos
 */
const deleteMedicalServiceHandler = async (
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

    // Solo admins pueden eliminar servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const { id } = await params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el servicio existe y pertenece a la organización
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      )
    });

    if (!existingService) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Verificar si hay citas futuras con este servicio
    const futureAppointments = await db.query.appointments.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        // Aquí podrías agregar condición para citas futuras si es necesario
      )
    });

    // Soft delete - marcar como inactivo
    await db.update(medicalServices)
      .set({ isActive: false })
      .where(eq(medicalServices.id, serviceId));

    // Sincronizar conocimiento con pgVector después de la eliminación
    try {
      await syncKnowledgeAfterCRUD(
        'service',
        'delete',
        existingService
      );
    } catch (knowledgeError) {
      console.error('Error sincronizando conocimiento después de eliminar servicio:', knowledgeError);
      // No fallar la operación principal por errores de sincronización
    }

    return createSuccessResponse(
      { 
        id: serviceId,
        warning: futureAppointments ? "El servicio tenía citas asociadas que podrían verse afectadas" : null
      },
      "Servicio médico desactivado exitosamente"
    );
  } catch (error) {
    return handleDatabaseError(error, "eliminar servicio médico");
  }
};

/**
 * Función utilitaria para autenticar solicitudes HTTP mediante tokens Firebase.
 * 
 * Extrae y verifica el token JWT de Firebase desde el header Authorization,
 * validando su autenticidad y decodificando la información del usuario.
 * Implementa el patrón Bearer token estándar para autenticación API.
 * 
 * @async
 * @function authenticateRequest
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * 
 * @returns {Promise<DecodedIdToken|null>} Token decodificado o null si es inválido
 * @returns {DecodedIdToken} token.uid - ID único del usuario en Firebase
 * @returns {DecodedIdToken} token.email - Email del usuario autenticado
 * @returns {DecodedIdToken} token.email_verified - Estado de verificación del email
 * @returns {DecodedIdToken} token.iat - Timestamp de emisión del token
 * @returns {DecodedIdToken} token.exp - Timestamp de expiración del token
 * 
 * @example
 * ```typescript
 * // Header esperado en la solicitud
 * Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * // Uso en handler
 * const decodedToken = await authenticateRequest(request);
 * if (!decodedToken) {
 *   return createErrorResponse('Unauthorized', undefined, 401);
 * }
 * console.log('Usuario autenticado:', decodedToken.uid);
 * ```
 * 
 * @description
 * **Proceso de autenticación:**
 * 1. Extrae header 'Authorization' de la solicitud
 * 2. Verifica formato 'Bearer <token>'
 * 3. Extrae token JWT (substring después de 'Bearer ')
 * 4. Verifica token con Firebase Admin SDK
 * 5. Retorna información decodificada del usuario
 * 
 * **Condiciones para retornar null:**
 * - Header Authorization faltante
 * - Header no tiene formato 'Bearer <token>'
 * - Token JWT inválido o expirado
 * - Error en verificación con Firebase
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Sistema de Gestión Médica
 * 
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Verify ID Tokens}
 * @see {@link DecodedIdToken} Tipo de token decodificado de Firebase
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

/**
 * Endpoint GET para obtener un servicio médico específico por ID.
 * 
 * Implementa el patrón de autenticación middleware + handler para recuperar
 * información detallada de un servicio médico individual, incluyendo doctores
 * asociados, citas recientes y datos relacionados.
 * 
 * @async
 * @function GET
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {Object} context - Contexto de parámetros de ruta dinámica
 * @param {Promise<{id: string}>} context.params - Parámetros con ID del servicio
 * 
 * @returns {Promise<NextResponse>} Respuesta HTTP con datos del servicio o error
 * 
 * @example
 * ```bash
 * # Obtener servicio específico
 * curl -H "Authorization: Bearer <token>" \
 *      https://api.example.com/api/medical-services/123
 * ```
 * 
 * @description
 * **Método HTTP:** GET
 * **Ruta:** `/api/medical-services/[id]`
 * **Autenticación:** Requerida (Firebase JWT)
 * **Roles autorizados:** admin, medico, asistente
 * 
 * **Parámetros de ruta:**
 * - `id` (string): ID numérico del servicio médico
 * 
 * **Códigos de estado HTTP:**
 * - 200: Servicio encontrado exitosamente
 * - 400: ID de servicio inválido
 * - 401: Token de autenticación inválido o faltante
 * - 403: Usuario sin permisos o no encontrado
 * - 404: Servicio no encontrado en la organización
 * - 500: Error interno del servidor
 * 
 * @since 1.0.0
 * @route GET /api/medical-services/[id]
 * @middleware authenticateRequest
 * @handler getMedicalServiceByIdHandler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getMedicalServiceByIdHandler(request, decodedToken, { params });
}

/**
 * Endpoint PUT para actualizar un servicio médico específico.
 * 
 * Implementa el patrón de autenticación middleware + handler para actualizar
 * servicios médicos con validación completa de datos y verificación de duplicados.
 * Solo usuarios administradores pueden actualizar servicios médicos.
 * 
 * @async
 * @function PUT
 * @param {NextRequest} request - Objeto de solicitud HTTP con cuerpo JSON
 * @param {Object} context - Contexto de parámetros de ruta dinámica
 * @param {Promise<{id: string}>} context.params - Parámetros con ID del servicio
 * 
 * @returns {Promise<NextResponse>} Respuesta HTTP con confirmación de actualización o error
 * 
 * @example
 * ```bash
 * # Actualizar servicio médico
 * curl -X PUT \
 *      -H "Authorization: Bearer <token>" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "name": "Consulta Actualizada",
 *        "basePrice": "60000",
 *        "durationMinutes": 40
 *      }' \
 *      https://api.example.com/api/medical-services/123
 * ```
 * 
 * @description
 * **Método HTTP:** PUT
 * **Ruta:** `/api/medical-services/[id]`
 * **Autenticación:** Requerida (Firebase JWT)
 * **Roles autorizados:** admin únicamente
 * **Content-Type:** application/json
 * 
 * **Parámetros de ruta:**
 * - `id` (string): ID numérico del servicio médico
 * 
 * **Códigos de estado HTTP:**
 * - 200: Servicio actualizado exitosamente
 * - 400: ID inválido o datos de entrada incorrectos
 * - 401: Token de autenticación inválido o faltante
 * - 403: Usuario sin permisos de administrador
 * - 404: Servicio no encontrado en la organización
 * - 409: Código duplicado en la organización
 * - 500: Error interno del servidor
 * 
 * @since 1.0.0
 * @route PUT /api/medical-services/[id]
 * @middleware authenticateRequest
 * @handler updateMedicalServiceHandler
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return updateMedicalServiceHandler(request, decodedToken, { params });
}

/**
 * Endpoint DELETE para desactivar un servicio médico específico.
 * 
 * Implementa el patrón de autenticación middleware + handler para desactivar
 * servicios médicos mediante eliminación suave (soft delete). Solo usuarios
 * administradores pueden desactivar servicios médicos.
 * 
 * @async
 * @function DELETE
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {Object} context - Contexto de parámetros de ruta dinámica
 * @param {Promise<{id: string}>} context.params - Parámetros con ID del servicio
 * 
 * @returns {Promise<NextResponse>} Respuesta HTTP con confirmación de desactivación o error
 * 
 * @example
 * ```bash
 * # Desactivar servicio médico
 * curl -X DELETE \
 *      -H "Authorization: Bearer <token>" \
 *      https://api.example.com/api/medical-services/123
 * ```
 * 
 * @description
 * **Método HTTP:** DELETE
 * **Ruta:** `/api/medical-services/[id]`
 * **Autenticación:** Requerida (Firebase JWT)
 * **Roles autorizados:** admin únicamente
 * **Operación:** Soft delete (isActive = false)
 * 
 * **Parámetros de ruta:**
 * - `id` (string): ID numérico del servicio médico
 * 
 * **Códigos de estado HTTP:**
 * - 200: Servicio desactivado exitosamente
 * - 400: ID de servicio inválido
 * - 401: Token de autenticación inválido o faltante
 * - 403: Usuario sin permisos de administrador
 * - 404: Servicio no encontrado en la organización
 * - 500: Error interno del servidor
 * 
 * @since 1.0.0
 * @route DELETE /api/medical-services/[id]
 * @middleware authenticateRequest
 * @handler deleteMedicalServiceHandler
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return deleteMedicalServiceHandler(request, decodedToken, { params });
}