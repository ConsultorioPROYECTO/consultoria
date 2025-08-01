import { db } from "@/db";
/**
 * @fileoverview API endpoint para desvincular usuarios de organizaciones.
 * Este endpoint permite a administradores desvincular usuarios de su organización.
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025 - 06 - 24
 */

import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse, HTTP_STATUS, API_ERRORS } from "@/types/api";
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

/**
 * Desvincula un usuario de su organización actual.
 * 
 * Esta función permite a un administrador desvincular a otro usuario de la organización,
 * estableciendo su organizationId como null y su rol como 'N/A'.
 * 
 * @async
 * @function unlinkOrganization
 * 
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {DecodedIdToken} decodedToken - Token decodificado de Firebase Auth que contiene la información del usuario autenticado
 * @param {Object} context - Contexto de la ruta dinámica
 * @param {Object} context.params - Parámetros de la URL
 * @param {string} context.params.id - ID del usuario a desvincular de la organización
 * 
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con el resultado de la operación
 * 
 * @throws {Error} Error interno del servidor si falla la operación de base de datos
 * 
 * @example
 * // Solicitud GET a /api/users/unlik-organization/123
 * // Headers: Authorization: Bearer <firebase-token>
 * // Respuesta exitosa:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": 123,
 *     "previousRole": "doctor",
 *     "previousOrganizationId": 456,
 *     "newRole": "N/A",
 *     "newOrganizationId": null
 *   },
 *   "message": "Usuario con ID 123 desvinculado exitosamente de la organización"
 * }
 * 
 * @example
 * // Respuesta de error - Usuario no encontrado:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "USER_NOT_FOUND",
 *     "message": "Usuario objetivo no encontrado en la base de datos."
 *   }
 * }
 * 
 * @security
 * - Requiere autenticación con Firebase Auth
 * - Solo usuarios con rol 'admin' pueden ejecutar esta operación
 * - Solo se pueden desvincular usuarios de la misma organización
 * 
 * @apiEndpoint GET /api/users/unlik-organization/[id]
 * @apiParam {string} id - ID numérico del usuario a desvincular
 * @apiSuccess {boolean} success - Indica si la operación fue exitosa
 * @apiSuccess {Object} data - Datos del usuario desvinculado
 * @apiSuccess {number} data.userId - ID del usuario desvinculado
 * @apiSuccess {string} data.previousRole - Rol anterior del usuario
 * @apiSuccess {number|null} data.previousOrganizationId - ID de la organización anterior
 * @apiSuccess {string} data.newRole - Nuevo rol del usuario (siempre 'N/A')
 * @apiSuccess {null} data.newOrganizationId - Nueva organización (siempre null)
 * @apiSuccess {string} message - Mensaje descriptivo del resultado
 * 
 * @apiError (400) INVALID_REQUEST ID de usuario inválido o usuario ya desvinculado
 * @apiError (401) UNAUTHORIZED Token de autenticación inválido o ausente
 * @apiError (403) FORBIDDEN Usuario sin permisos o no pertenece a organización
 * @apiError (404) USER_NOT_FOUND Usuario autenticado o objetivo no encontrado
 * @apiError (500) INTERNAL_ERROR Error interno del servidor
 */
const unlinkOrganization = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context: { params: { id: string } }
): Promise<NextResponse | Response> => {
  try {
    const { id } = context.params;
    const targetUserId = parseInt(id);
    
    if (isNaN(targetUserId)) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'ID de usuario inválido',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: authenticatedUser } = userInfo;

    // Obtener información del usuario objetivo
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { id: true, organizationId: true, role: true, firebaseUid: true }
    });
    
    if (!targetUser) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        'Usuario objetivo no encontrado en la base de datos.',
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Verificar que ambos usuarios pertenezcan a la misma organización
    if (targetUser.organizationId !== authenticatedUser.organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'No tienes permisos para desvincular a este usuario. Solo puedes desvincular usuarios de tu misma organización.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Verificar que el usuario objetivo tenga una organización asignada
    if (!targetUser.organizationId) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'El usuario objetivo no está vinculado a ninguna organización.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Desvincular al usuario objetivo de la organización
    await db.update(users)
      .set({ organizationId: null, role: 'N/A' })
      .where(eq(users.id, targetUserId));

    return createSuccessResponse(
      { 
        userId: targetUser.id,
        previousRole: targetUser.role, 
        previousOrganizationId: targetUser.organizationId,
        newRole: 'N/A',
        newOrganizationId: null
      },
      `Usuario con ID ${targetUserId} desvinculado exitosamente de la organización`
    );
  } catch (error) {
    console.error('Error al desvincular organización:', error);
    return createErrorResponse(
      API_ERRORS.INTERNAL_ERROR,
      'Error al desvincular la organización del usuario',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
};

/**
 * Endpoint HTTP GET para desvincular un usuario de su organización.
 * 
 * @description
 * Este endpoint está protegido por autenticación y permite a administradores
 * desvincular usuarios de su organización. El middleware `withAuthentication`
 * se encarga de validar el token de Firebase y extraer la información del usuario.
 * 
 * @route GET /api/users/unlik-organization/[id]
 * @middleware withAuthentication - Valida autenticación con Firebase Auth
 * 
 * @see {@link unlinkOrganization} - Función principal que maneja la lógica de negocio
 * @see {@link withAuthentication} - Middleware de autenticación
 * 
 * @example
 * // Uso desde el cliente:
 * const response = await fetch('/api/users/unlik-organization/123', {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': `Bearer ${firebaseToken}`
 *   }
 * });
 * 
 * const result = await response.json();
 * if (result.success) {
 *   console.log('Usuario desvinculado:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
const handleUnlinkOrganization = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: { id: string } };
  return unlinkOrganization(request, userInfo, params);
};

export const GET = withOptimizedAuthentication(handleUnlinkOrganization, {
  requiredRoles: ['admin'],
  requireOrganization: true
});
