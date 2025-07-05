
/**
 * @fileoverview API endpoint para cambiar roles de usuarios.
 * Este endpoint permite a administradores cambiar el rol de usuarios de su organización.
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025 - 06 - 24
 */

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { doctors } from "@/db/schema/doctors";
import { assistants } from "@/db/schema/assistants";
import { eq } from "drizzle-orm";
import { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest, NextResponse } from "next/server";
import { createSuccessResponse, createErrorResponse, HTTP_STATUS, API_ERRORS } from "@/types/api";
import { withAuthentication } from "@/app/lib/firebase/server/middleware/authMiddleware";
import { validateUserRole } from "@/lib/api-helpers";
import { z } from "zod";

const changeRolSchema = z.object({
  rol: z.enum(["admin", "medico", "asistente"]),
});

/**
 * Cambia el rol de un usuario dentro de la organización.
 * 
 * @description
 * Esta función permite a un administrador cambiar el rol de otro usuario dentro de la misma organización.
 * Además de actualizar el rol en la tabla `users`, automáticamente crea o actualiza registros correspondientes
 * en las tablas `doctors` o `assistants` según el nuevo rol asignado.
 * 
 * - Si el nuevo rol es 'medico': Se crea o actualiza completamente el registro en la tabla `doctors` con valores por defecto
 * - Si el nuevo rol es 'asistente': Se crea o actualiza completamente el registro en la tabla `assistants`
 * - Utiliza operaciones upsert que sobrescriben completamente los registros existentes
 * 
 * @async
 * @function changeUserRole
 * 
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {DecodedIdToken} decodedToken - Token decodificado de Firebase Auth que contiene la información del usuario autenticado
 * @param {Object} context - Contexto de la ruta dinámica
 * @param {Object} context.params - Parámetros de la URL
 * @param {string} context.params.id - ID del usuario al que cambiar el rol
   * @param {string} context.params.rol - Nuevo rol a asignar al usuario (admin, medico, asistente)
 * 
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con el resultado de la operación
 * 
 * @throws {Error} Error interno del servidor si falla la operación de base de datos
 * 
 * @example
   * // Solicitud GET a /api/users/rol/change-rol/123/medico
   * // Headers: Authorization: Bearer <firebase-token>
   * // Respuesta exitosa (también crea registro en tabla doctors):
   * {
   *   "success": true,
   *   "data": {
   *     "userId": 123,
   *     "previousRole": "asistente",
   *     "previousOrganizationId": 456,
   *     "newRole": "medico",
   *     "newOrganizationId": 456
   *   },
   *   "message": "Rol del usuario con ID 123 cambiado exitosamente a medico"
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
   * - Solo se pueden cambiar roles de usuarios de la misma organización
   * - No se puede cambiar el rol a uno idéntico al actual
   * - Crea automáticamente o actualiza registros en tablas específicas (doctors/assistants) según el nuevo rol
   * - Utiliza operaciones upsert que garantizan un único registro por usuario en cada tabla específica
   * 
   * @apiEndpoint GET /api/users/rol/change-rol/[id]/[rol]
   * @apiParam {string} id - ID numérico del usuario al que cambiar el rol
   * @apiParam {string} rol - Nuevo rol a asignar (admin, medico, asistente)
 * @apiSuccess {boolean} success - Indica si la operación fue exitosa
 * @apiSuccess {Object} data - Datos del cambio de rol
   * @apiSuccess {number} data.userId - ID del usuario al que se cambió el rol
   * @apiSuccess {string} data.previousRole - Rol anterior del usuario
   * @apiSuccess {number|null} data.previousOrganizationId - ID de la organización (sin cambios)
   * @apiSuccess {string} data.newRole - Nuevo rol asignado al usuario
   * @apiSuccess {number|null} data.newOrganizationId - ID de la organización (sin cambios)
 * @apiSuccess {string} message - Mensaje descriptivo del resultado
 * 
 * @apiError (400) INVALID_REQUEST ID de usuario inválido, rol inválido o rol sin cambios
 * @apiError (401) UNAUTHORIZED Token de autenticación inválido o ausente
 * @apiError (403) FORBIDDEN Usuario sin permisos o no pertenece a organización
 * @apiError (404) USER_NOT_FOUND Usuario autenticado o objetivo no encontrado
 * @apiError (500) INTERNAL_ERROR Error interno del servidor
 */
const changeUserRole = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  context: { params: { rol: string; id: string } }
): Promise<NextResponse | Response> => {
  try {
    const { id, rol } = context.params;
    const targetUserId = parseInt(id);
    
    if (isNaN(targetUserId)) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'ID de usuario inválido',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const parsedRol = changeRolSchema.parse({ rol });

    // Obtener información del usuario autenticado
    const authenticatedUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { id: true, organizationId: true, role: true }
    });
    
    if (!authenticatedUser) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        'Usuario autenticado no encontrado en la base de datos local.',
        HTTP_STATUS.NOT_FOUND
      );
    }

    if (!authenticatedUser.organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El usuario autenticado no pertenece a ninguna organización.',
        HTTP_STATUS.FORBIDDEN
      );
    }

    

    const roleValidationError = validateUserRole(authenticatedUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

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

    if (parsedRol.rol === targetUser.role) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'El rol del usuario no ha cambiado.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Verificar que ambos usuarios pertenezcan a la misma organización
    if (targetUser.organizationId !== authenticatedUser.organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'No tienes permisos para cambiar el rol de este usuario. Solo puedes cambiar roles de usuarios de tu misma organización.',
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

    // Cambiar el rol del usuario objetivo
    await db.update(users)
      .set({ role: parsedRol.rol })
      .where(eq(users.id, targetUserId));

    // Crear o actualizar registro en tabla específica según el nuevo rol
    // y eliminar registro de la tabla del rol opuesto si existe
    if (parsedRol.rol === 'medico') {
      try {
        // Primero eliminar registro de asistente si existe
        await db.delete(assistants).where(eq(assistants.userId, targetUserId));
        console.log(`Registro de asistente eliminado para usuario ${targetUserId} (si existía)`);
        
        // Usar upsert para crear o actualizar completamente el registro de doctor
        await db.insert(doctors).values({
          userId: targetUserId,
          speciality: 'General', // Valor por defecto, se puede actualizar después
          calendar_id: '', // Se puede configurar después
          privatePhone: '', // Se puede configurar después
          nitId: '', // Se puede configurar después
          tokenGoogleId: '', // Se puede configurar después
          calendar_settings: {
            notifications: {
              email: true,
              popup: true,
              minutesBefore: [15, 60],
            },
            workingHours: {
            },
            autoAcceptMeetings: false,
            defaultMeetingDuration: 30,
          }
        }).onDuplicateKeyUpdate({
          set: {
            speciality: 'General',
            calendar_id: '',
            privatePhone: '',
            nitId: '',
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
            },
            updatedAt: new Date()
          }
        });
        console.log(`Registro de doctor creado/actualizado para usuario ${targetUserId}`);
      } catch (doctorError) {
        console.error('Error creando/actualizando registro de doctor:', doctorError);
        // No fallar la operación principal si falla la creación del registro específico
      }
    } else if (parsedRol.rol === 'asistente') {
      try {
        // Primero eliminar registro de doctor si existe
        await db.delete(doctors).where(eq(doctors.userId, targetUserId));
        console.log(`Registro de doctor eliminado para usuario ${targetUserId} (si existía)`);
        
        // Usar upsert para crear o actualizar completamente el registro de asistente
        await db.insert(assistants).values({
          userId: targetUserId,
        }).onDuplicateKeyUpdate({
          set: {
            updatedAt: new Date()
          }
        });
        console.log(`Registro de asistente creado/actualizado para usuario ${targetUserId}`);
      } catch (assistantError) {
        console.error('Error creando/actualizando registro de asistente:', assistantError);
        // No fallar la operación principal si falla la creación del registro específico
      }
    }

    return createSuccessResponse(
      { 
        userId: targetUser.id,
        previousRole: targetUser.role, 
        previousOrganizationId: targetUser.organizationId,
        newRole: parsedRol.rol,
        newOrganizationId: targetUser.organizationId
      },
      `Rol del usuario con ID ${targetUserId} cambiado exitosamente a ${parsedRol.rol}`
    );
  } catch (error) {
    console.error('Error al cambiar rol del usuario:', error);
    return createErrorResponse(
      API_ERRORS.INTERNAL_ERROR,
      'Error al cambiar el rol del usuario',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
};

/**
 * Endpoint HTTP GET para cambiar el rol de un usuario.
 * 
 * @description
 * Este endpoint está protegido por autenticación y permite a administradores
 * cambiar el rol de usuarios de su organización. El middleware `withAuthentication`
 * se encarga de validar el token de Firebase y extraer la información del usuario.
 * 
 * @route GET /api/users/rol/change-rol/[id]/[rol]
 * @middleware withAuthentication - Valida autenticación con Firebase Auth
 * 
 * @see {@link changeUserRole} - Función principal que maneja la lógica de negocio
 * @see {@link withAuthentication} - Middleware de autenticación
 * 
 * @example
 * // Uso desde el cliente:
 * const response = await fetch('/api/users/rol/change-rol/123/medico', {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': `Bearer ${firebaseToken}`
 *   }
 * });
 * 
 * const result = await response.json();
 * if (result.success) {
 *   console.log('Rol cambiado:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export const GET = withAuthentication(changeUserRole);
