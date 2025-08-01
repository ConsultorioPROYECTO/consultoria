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
import { medicalServices } from "@/db/schema";
import { eq, and, not } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from "@/types/api";
import { handleDatabaseError } from "@/lib/api-helpers";
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
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
  userInfo: AuthenticatedUserInfo,
  params: { id: string }
): Promise<NextResponse | Response> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const { id } = params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const service = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId!),
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
  userInfo: AuthenticatedUserInfo,
  params: { id: string }
): Promise<NextResponse | Response> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const { id } = params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el servicio existe y pertenece a la organización (se busca sin importar el estado isActive)
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId!)
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
          eq(medicalServices.organizationId, requestingUser.organizationId!),
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
  userInfo: AuthenticatedUserInfo,
  params: { id: string }
): Promise<NextResponse | Response> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const { id } = params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return createErrorResponse("ID de servicio inválido", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // Verificar que el servicio existe y pertenece a la organización
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId!),
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
const handleGetMedicalServiceById = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: Promise<{ id: string }> };
  const resolvedParams = await params.params;
  return getMedicalServiceByIdHandler(request, userInfo, resolvedParams);
};

export const GET = withOptimizedAuthentication(handleGetMedicalServiceById, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true
});

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
const handleUpdateMedicalService = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: Promise<{ id: string }> };
  const resolvedParams = await params.params;
  return updateMedicalServiceHandler(request, userInfo, resolvedParams);
};

export const PUT = withOptimizedAuthentication(handleUpdateMedicalService, {
  requiredRoles: ['admin'],
  requireOrganization: true
});

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
const handleDeleteMedicalService = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: Promise<{ id: string }> };
  const resolvedParams = await params.params;
  return deleteMedicalServiceHandler(request, userInfo, resolvedParams);
};

export const DELETE = withOptimizedAuthentication(handleDeleteMedicalService, {
  requiredRoles: ['admin'],
  requireOrganization: true
});