// src/app/api/organization/route.ts

/**
 * @fileoverview API Route para obtener la lista de los appointments de un medico por medio de su token (protegida).
 * @version 1.0.0 
 * @author Santiago Prada
 * @date 2025-05-13
 *
 * @description
 * Maneja las solicitudes POST a `src/app/api/organization`. Requiere autenticación y que el
 * usuario solicitante tenga el rol de 'admin'.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `organization` en la base de datos MySQL.
 * Devuelve un un mensaje con el status de la consulta en formato JSON.
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires ../../../lib/db - Instancia `db` de Drizzle ORM.
 * @requires ../../../lib/db/schema - Definición de la tabla `appointments`.
 * @requires ../../../lib/server/middleware/authMiddleware - Para `withAuthentication`.
 * @requires firebase-admin/auth - Para el tipo `DecodedIdToken`.
 * @requires drizzle-orm - Para el operador `eq` y funciones de ordenamiento.
 *
 * @returns {Promise<NextResponse | Response>} Una promesa que resuelve a:
 *  - NextResponse con status 400 si el cuerpo o el rol de la solicitud es inválido.
 *  - NextResponse con status 401 si la autenticación falla (token faltante/inválido).
 *  - NextResponse con status 403 si el usuario autenticado no tiene el rol 'admin'.
 *  - NextResponse con status 201 si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * curl -H "Authorization: Bearer <TOKEN_ID_ADMIN>" http://localhost:3000/api/doctors/dahsboard/appointments
 *
 * @todo 
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db';
import { organization } from '@rutas/db/schema/organization';
import { withAuthentication } from '@lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';
import { users } from '@rutas/db/schema/users';
import { eq } from 'drizzle-orm';

/**
 * Funcion axiliar para la creacion del codigo de invitacion aleatorio de 6 caracteres
 * no solo crea el codigo, tambien verifica que no exista en la base de datos
 * @returns {string} - Codigo de invitacion aleatorio de 6 caracteres
 */
export const generateRandomInvitationCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let invitationCode = '';
  for (let i = 0; i < 6; i++) {
    invitationCode += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  // Verificar si el código de invitación ya existe en la base de datos
  const existingOrganization = await db.select().from(organization).where(eq(organization.invitationCode, invitationCode));
  if (existingOrganization.length != 0) {
    // Si el código de invitación ya existe, generar uno nuevo
    console.log('Codigo de invitacion ya existe, generando uno nuevo');
    console.log(existingOrganization);
    return generateRandomInvitationCode();
  }
  return invitationCode;
};

/**
 * Manejador para solicitudes POST a src/app/api/organization/route.ts.
 * Permite crear una organizacion a un usuario admin.
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
      // Actualizar la validación para incluir planId
      if (!body || typeof body.organizationName !== 'string' || typeof body.planId !== 'string') {
        return NextResponse.json(
          { error: 'Cuerpo de la solicitud inválido. Se requieren los campos "organizationName" y "planId".' },
          { status: 400 }
        );
      }

      await db.update(users)
      .set({ role: "admin" })
      .where(eq(users.id, user.id));

      const invitacionCode = await generateRandomInvitationCode();
      
        const organizationId = await db.insert(organization).values({
        name: body.organizationName,
        invitationCode: invitacionCode,
        planId: body.planId, // Añadir planId al insertar la organización
      }).$returningId();

      if (!organizationId || organizationId.length === 0) { // Comprobar si organizationId es undefined o vacío
        return NextResponse.json(
          { error: 'Error al crear la organización.' },
          { status: 500 }
        );
      }

      // Asociar el usuario a la organización
      await db.update(users)
      .set({ organizationId: organizationId[0].id })
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
  export const POST = withAuthentication(postUserRoleHandler);
  