// src/app/api/users/route.ts

/**
 * @fileoverview API Route para obtener la lista de todos los usuarios con información de doctor y asistente (protegida).
 * @version 1.3.0 // Actualización para incluir información de doctor y asistente mediante LEFT JOIN
 * @author Santiago Prada
 * @date 2025-05-13
 *
 * @description
 * Maneja las solicitudes GET a `/api/users`. Requiere autenticación y que el
 * usuario solicitante tenga el rol de 'admin'.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `users` con LEFT JOIN a las tablas `doctors` y `assistants` para incluir el
 * `idDoctor` cuando el usuario tenga rol 'medico' y el `idAssistant` cuando tenga rol 'asistente'.
 * Devuelve un array de objetos usuario en formato JSON, incluyendo los campos
 * `idDoctor` e `idAssistant` (null para usuarios que no tienen esos roles).
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires ../../../lib/db - Instancia `db` de Drizzle ORM.
 * @requires ../../../lib/db/schema - Definición de la tabla `users`.
 * @requires ../../../lib/db/schema/doctors - Definición de la tabla `doctors`.
 * @requires ../../../lib/db/schema/assistants - Definición de la tabla `assistants`.
 * @requires ../../../lib/server/middleware/authMiddleware - Para `withAuthentication`.
 * @requires firebase-admin/auth - Para el tipo `DecodedIdToken`.
 * @requires drizzle-orm - Para el operador `eq` y funciones de ordenamiento.
 *
 * @returns {Promise<NextResponse | Response>} Una promesa que resuelve a:
 *  - NextResponse con status 401 si la autenticación falla (token faltante/inválido).
 *  - NextResponse con status 403 si el usuario autenticado no tiene el rol 'admin'.
 *  - NextResponse con status 200 y un array de usuarios con idDoctor e idAssistant si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * curl -H "Authorization: Bearer <TOKEN_ID_ADMIN>" http://localhost:3000/api/users
 *
 * @example - Respuesta esperada:
 * [
 *   {
 *     "id": 1,
 *     "firebaseUid": "abc123",
 *     "email": "doctor@example.com",
 *     "role": "medico",
 *     "idDoctor": 5,
 *     "idAssistant": null,
 *     // ... otros campos
 *   },
 *   {
 *     "id": 2,
 *     "email": "assistant@example.com",
 *     "role": "asistente",
 *     "idDoctor": null,
 *     "idAssistant": 3,
 *     // ... otros campos
 *   },
 *   {
 *     "id": 3,
 *     "email": "admin@example.com",
 *     "role": "admin",
 *     "idDoctor": null,
 *     "idAssistant": null,
 *     // ... otros campos
 *   }
 * ]
 *
 * @todo Considerar paginación más robusta si la lista de usuarios es muy grande (más allá del `limit: 100` actual).
 * @todo Considerar añadir filtros por rol para optimizar consultas específicas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db'; // Ajusta la ruta si es diferente
import { users } from '@/db/schema'; // Ajusta la ruta si es diferente
import { doctors } from '@/db/schema/doctors'; // Importar esquema de doctors
import { assistants } from '@/db/schema/assistants'; // Importar esquema de assistants
import { withOptimizedAdminAuth, AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware'; // Middleware optimizado
import { eq, desc } from 'drizzle-orm';

// --- Definición del Manejador GET con Autenticación y Autorización ---

/**
 * Manejador para solicitudes GET a /api/users.
 * Este manejador se ejecuta solo si la autenticación (verificación del token Firebase) es exitosa.
 * Luego, realiza una verificación de autorización (rol de admin).
 *
 * @async
 * @param {NextRequest} request - El objeto de la solicitud entrante (provisto por Next.js).
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado (provisto por `withAuthentication`).
 * @returns {Promise<NextResponse | Response>} La respuesta HTTP.
 */
const getUsersHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo // Información optimizada del usuario autenticado con cache
): Promise<NextResponse | Response> => {
  // El middleware optimizado ya valida que sea admin, no necesitamos verificar aquí
  console.log(`Admin ${userInfo.user.email} consultando usuarios de organización ${userInfo.organizationInfo?.name}`);

  try {
    // --- Lógica principal: Obtener todos los usuarios con información de doctor y asistente si aplica ---
    console.log('[API /api/users] Consultando la base de datos para obtener todos los usuarios con información de doctor y asistente...');

    const allUsers = await db
      .select({
        // Campos de la tabla users
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        emailVerified: users.emailVerified,
        phoneNumber: users.phoneNumber,
        displayName: users.displayName,
        photoURL: users.photoURL,
        providerId: users.providerId,
        role: users.role,
        isActive: users.isActive,
        organizationId: users.organizationId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        // Campos adicionales: idDoctor (solo para usuarios con rol 'medico') e idAssistant (solo para usuarios con rol 'asistente')
        idDoctor: doctors.idDoctor,
        idAssistant: assistants.idAssistant,
      })
      .from(users)
      .leftJoin(doctors, eq(users.id, doctors.userId))
      .leftJoin(assistants, eq(users.id, assistants.userId))
      .where(userInfo.user.organizationId ? eq(users.organizationId, userInfo.user.organizationId) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(100);

    console.log(`[API /api/users] Consulta exitosa. ${allUsers.length} usuarios encontrados.`);
    return NextResponse.json(allUsers, { status: 200 });

  } catch (error) {
    console.error('[API /api/users] Error durante la autorización o la consulta a la base de datos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      {
        error: 'Failed to process request.',
        details: errorMessage, // En desarrollo podría ser útil, en producción considera omitirlo o generalizarlo.
      },
      { status: 500 }
    );
  }
};

// Envolver el manejador con el middleware de autenticación
export const GET = withOptimizedAdminAuth(getUsersHandler);

// Nota: Si necesitaras otros métodos (POST, PUT, etc.) y también quieres protegerlos,
// los envolverías de manera similar:
// export const POST = withAuthentication(async (request, decodedToken) => { /* ... */ });