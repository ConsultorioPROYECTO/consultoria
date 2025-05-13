// src/app/api/users/route.ts

/**
 * @fileoverview API Route para obtener la lista de todos los usuarios.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-11
 *
 * @description
 * Maneja las solicitudes GET a `/api/users`.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `users` en la base de datos MySQL.
 * Devuelve un array de objetos usuario en formato JSON.
 *
 * ¡¡¡ADVERTENCIA DE SEGURIDAD!!!
 * Este endpoint, tal como está, devuelve TODOS los usuarios sin ninguna restricción.
 * En una aplicación real, esto representa un RIESGO DE SEGURIDAD SIGNIFICATIVO.
 * DEBES implementar autenticación y autorización para asegurarte de que solo
 * los usuarios con los permisos adecuados (ej. administradores) puedan acceder
 * a esta información.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires ../../../lib/db - Instancia `db` de Drizzle ORM.
 * @requires ../../../lib/db/schema - Definición de la tabla `users`.
 * @requires drizzle-orm - Para operadores y funciones de consulta (si fueran necesarios, aunque aquí no).
 *
 * @returns {Promise<NextResponse>} Una promesa que resuelve a:
 *  - Un NextResponse con status 200 y un array de usuarios si la consulta es exitosa.
 *  - Un NextResponse con status 500 y un mensaje de error si ocurre un problema.
 *
 * @example - Cómo probar la ruta con curl:
 * # GET (Obtener todos los usuarios - ¡Solo si tienes la seguridad implementada!)
 * curl http://localhost:3000/api/users
 * # (Asegúrate de incluir encabezados de autenticación/autorización si los implementaste)
 *
 * @todo ¡CRÍTICO! Implementar lógica de AUTENTICACIÓN y AUTORIZACIÓN.
 *       Verificar que el solicitante esté autenticado (ej. validar token Firebase ID).
 *       Verificar que el usuario autenticado tenga el ROL adecuado (ej. 'admin')
 *       para acceder a esta lista completa de usuarios.
 * @todo Considerar paginación y filtrado si la lista de usuarios puede crecer mucho.
 *       Devolver todos los usuarios puede ser ineficiente y sobrecargar el servidor/cliente.
 * @todo Refinar los campos devueltos. ¿Realmente necesitas devolver *toda* la información
 *       de cada usuario (incluyendo `firebaseUid`, etc.) en una lista pública (incluso para admins)?
 *       Considera usar `db.select({ ...campos deseados... }).from(users)`.
 */

import {  NextResponse } from 'next/server';
import { db } from '../../../db/index'; // Importa la instancia configurada de Drizzle
// import { eq } from 'drizzle-orm'; // Importar si necesitas filtros (no usado aquí)

export async function GET() {
  console.log(`[API /api/users] Solicitud GET recibida.`);

  // -------------------------------------------------------------------------
  // --- ¡¡¡INICIO: ZONA CRÍTICA DE SEGURIDAD!!! ---
  // -------------------------------------------------------------------------
  // TODO: Implementar autenticación (¿quién hace la solicitud?)
  // Ejemplo conceptual (necesita implementación real con firebase-admin u otro método):
  // const userToken = request.headers.get('Authorization')?.split('Bearer ')[1];
  // if (!userToken) {
  //   console.warn('[API /api/users] Acceso denegado: Sin token.');
  //   return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
  // }
  // const decodedToken = await verifyFirebaseToken(userToken); // Necesitas implementar verifyFirebaseToken
  // if (!decodedToken) {
  //   console.warn('[API /api/users] Acceso denegado: Token inválido.');
  //   return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
  // }

  // TODO: Implementar autorización (¿tiene permiso esta persona?)
  // Ejemplo conceptual (necesita buscar el rol del usuario en TU BD):
  // const requestingUser = await db.query.users.findFirst({
  //   where: eq(users.firebaseUid, decodedToken.uid),
  //   columns: { role: true } // Solo necesitamos el rol para verificar
  // });
  // if (!requestingUser || requestingUser.role !== 'admin') { // Asume que solo 'admin' puede ver todos
  //   console.warn(`[API /api/users] Acceso denegado: Usuario ${decodedToken.uid} no es admin.`);
  //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  // }
  // console.log(`[API /api/users] Acceso autorizado para admin: ${decodedToken.uid}`);
  // -------------------------------------------------------------------------
  // --- ¡¡¡FIN: ZONA CRÍTICA DE SEGURIDAD!!! ---
  // -------------------------------------------------------------------------

  try {
    console.log('[API /api/users] Consultando la base de datos...');

    // Utiliza Drizzle para obtener todos los usuarios y todas sus columnas
    const allUsers = await db.query.users.findMany(
        // Opcional: Puedes añadir opciones aquí como `orderBy`, `limit`, `offset`, `columns`
        // Ejemplo para ordenar por fecha de creación descendente:
         { orderBy: (users, { desc }) => [desc(users.createdAt)], limit: 100 },
        // Ejemplo para seleccionar columnas específicas:
        // { columns: { id: true, email: true, displayName: true, role: true } }
    );

    /* Alternativa con db.select() - útil si quieres renombrar o transformar columnas */
    // const allUsers = await db.select().from(users);

    console.log(`[API /api/users] Consulta exitosa. ${allUsers.length} usuarios encontrados.`);

    // Devuelve la lista de usuarios como JSON
    return NextResponse.json(allUsers, { status: 200 });

  } catch (error) {
    console.error('[API /api/users] Error al consultar la base de datos:', error);

    // Devuelve un error genérico en caso de fallo
    // Evita filtrar detalles internos del error al cliente
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json(
        {
            error: errorMessage,
            // Puedes incluir detalles adicionales si son seguros para exponer
            // details: errorMessage
        },
        { status: 500 }
    );
  }
}

// Nota: No se implementan POST, PUT, DELETE aquí ya que la solicitud era solo para GET.
// Si los necesitaras, añadirías `export async function POST(...)`, etc.