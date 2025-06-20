// src/app/api/users/rol/route.ts

/**
 * @fileoverview API Route para cambiar el rol de un usuario por medio de su token (protegida).
 * @version 1.0.0 
 * @author Santiago Prada
 * @date 2025-05-13
 *
 * @description
 * @GET Maneja las solicitudes GET a `src/app/api/users/rol/route.ts`. Requiere autenticación.
 * @POST Maneja las solicitudes POST a `src/app/api/users/rol/route.ts`. Requiere autenticación y cuerpo.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `users` en la base de datos MySQL.
 * Devuelve el rol del usuario en formato JSON.
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
 *  - NextResponse con status 403 si el usuario ya cuenta con el rol pasado en el cuerpo.
 *  - NextResponse con status 404 si el usuario no se encuentra en la base de datos local.
 *  - NextResponse con status 405 si el método de la solicitud no es GET o POST.
 *  - NextResponse con status 400 si el cuerpo de la solicitud no es válido.
 *  - NextResponse con status 200 y un array de appointments del doctor si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * @example
 * const token = await getFirebaseAuthToken();
 *
    if (!token) {
      console.error('No se pudo obtener el token de autenticación.');
      return [];
    }

    const response = await fetch('/api/users/rol',{
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });
    const data = await response.json();
    console.log(data);
 *
 * @todo 
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db'; // Ajusta la ruta si es diferente
import { users } from '@rutas/db/schema'; // Ajusta la ruta si es diferente
import { withAuthentication } from '@rutas/app/lib/firebase/server/middleware/authMiddleware'; // Ajusta la ruta
import type { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';

/**
 * Manejador para solicitudes GET a src/app/api/users/rol/route.ts.
 * Devuelve el rol del usuario autenticado.
 * @async
 * @param {NextRequest} request
 * @param {DecodedIdToken} decodedToken
 * @returns {Promise<NextResponse | Response>}
 */
const getUserRoleHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken): Promise<NextResponse | Response> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, organizationId: true }
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos local.' },
        { status: 404 }
      );
    }
    return NextResponse.json({ 
      role: user.role, 
      organizationId: user.organizationId 
    });
  } catch (error) {
    console.error('Error en el servidor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor. ' },
      { status: 500 }
    );
  }
};

/**
 * Manejador para solicitudes POST a src/app/api/users/rol/route.ts.
 * Permite cambiar el rol del usuario autenticado.
 * @async
 * @param {NextRequest} request
 * @param {DecodedIdToken} decodedToken
 * @returns {Promise<NextResponse | Response>}
 */
const postUserRoleHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken): Promise<NextResponse | Response> => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { id: true, role: true }
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos local.' },
        { status: 404 }
      );
    }
    const body = await request.json();
    if (!body || typeof body.role !== 'string') {
      return NextResponse.json(
        { error: 'Cuerpo de la solicitud inválido. Se requiere un campo "role".' },
        { status: 400 }
      );
    }
    if (user.role === body.role) {
      return NextResponse.json(
        { error: 'El usuario ya tiene el rol especificado.' },
        { status: 403 }
      );
    }
    // Validar que el rol sea uno permitido
    const allowedRoles = ['admin', 'medico', 'asistente', 'N/A'];
    if (!allowedRoles.includes(body.role)) {
      return NextResponse.json(
        { error: 'Rol no permitido.' },
        { status: 400 }
      );
    }
    await db.update(users)
      .set({ role: body.role })
      .where(eq(users.id, user.id));
    return NextResponse.json({ message: 'Rol actualizado correctamente.', role: body.role });
  } catch (error) {
    console.error('Error en el servidor:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
};

export const GET = withAuthentication(getUserRoleHandler);
export const POST = withAuthentication(postUserRoleHandler);
