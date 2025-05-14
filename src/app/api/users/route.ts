// src/app/api/users/route.ts

/**
 * @fileoverview API Route para obtener la lista de todos los usuarios (protegida).
 * @version 1.1.0 // Actualización de versión por añadir autenticación/autorización
 * @author Santiago Prada
 * @date 2025-05-13
 *
 * @description
 * Maneja las solicitudes GET a `/api/users`. Requiere autenticación y que el
 * usuario solicitante tenga el rol de 'admin'.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `users` en la base de datos MySQL.
 * Devuelve un array de objetos usuario en formato JSON.
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires ../../../lib/db - Instancia `db` de Drizzle ORM.
 * @requires ../../../lib/db/schema - Definición de la tabla `users`.
 * @requires ../../../lib/server/middleware/authMiddleware - Para `withAuthentication`.
 * @requires firebase-admin/auth - Para el tipo `DecodedIdToken`.
 * @requires drizzle-orm - Para el operador `eq` y funciones de ordenamiento.
 *
 * @returns {Promise<NextResponse | Response>} Una promesa que resuelve a:
 *  - NextResponse con status 401 si la autenticación falla (token faltante/inválido).
 *  - NextResponse con status 403 si el usuario autenticado no tiene el rol 'admin'.
 *  - NextResponse con status 200 y un array de usuarios si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * curl -H "Authorization: Bearer <TOKEN_ID_ADMIN>" http://localhost:3000/api/users
 *
 * @todo Considerar paginación más robusta si la lista de usuarios es muy grande (más allá del `limit: 100` actual).
 * @todo Refinar los campos devueltos. Aunque es para admin, ¿necesita todas las columnas siempre?
 *       Se puede ajustar en la opción `columns` de `findMany`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db'; // Ajusta la ruta si es diferente
import { users } from '@rutas/db/schema'; // Ajusta la ruta si es diferente
import { withAuthentication } from '@rutas/app/lib/firebase/server/middleware/authMiddleware'; // Ajusta la ruta
import type { DecodedIdToken } from 'firebase-admin/auth';
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
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  console.log(`[API /api/users] Solicitud GET recibida y autenticada para UID: ${decodedToken.uid}`);

  // --- Autorización: Verificar si el usuario autenticado es un administrador ---
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true }, // Solo necesitamos el rol para la autorización
    });

    if (!requestingUser) {
      // Esto sería raro si el token es válido, pero podría pasar si el usuario fue eliminado de tu BD
      // pero no de Firebase Auth inmediatamente.
      console.warn(`[API /api/users] Usuario autenticado con UID ${decodedToken.uid} no encontrado en la base de datos local.`);
      return NextResponse.json(
        { error: 'Forbidden: Authenticated user not found in local system.' },
        { status: 403 }
      );
    }

    if (requestingUser.role !== 'admin') {
      console.warn(`[API /api/users] Acceso denegado: Usuario ${decodedToken.uid} (Rol: ${requestingUser.role}) no es admin.`);
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions. Admin role required.' },
        { status: 403 }
      );
    }

    console.log(`[API /api/users] Acceso autorizado para admin: ${decodedToken.uid} (${decodedToken.email})`);

    // --- Lógica principal: Obtener todos los usuarios ---
    console.log('[API /api/users] Consultando la base de datos para obtener todos los usuarios...');

    const allUsers = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)], // Ordenar por fecha de creación, más recientes primero
      limit: 100, // Limitar resultados para evitar sobrecarga (implementar paginación para más)
      // Opcional: Excluir campos sensibles si no son necesarios para el admin en esta vista
      // columns: {
      //   id: true,
      //   firebaseUid: true, // Quizás útil para el admin
      //   email: true,
      //   displayName: true,
      //   role: true,
      //   isActive: true,
      //   lastLoginAt: true,
      //   createdAt: true,
      //   // phoneNumber: false, // Ejemplo de exclusión
      //   // photoURL: false,   // Ejemplo de exclusión
      // }
    });

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
export const GET = withAuthentication(getUsersHandler);

// Nota: Si necesitaras otros métodos (POST, PUT, etc.) y también quieres protegerlos,
// los envolverías de manera similar:
// export const POST = withAuthentication(async (request, decodedToken) => { /* ... */ });