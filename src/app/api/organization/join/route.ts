// @app/api/organization/join/route.ts

/**
 * @fileoverview API Route para unir a un usuario a una organizacion.
 * @version 1.0.2
 * @author Santiago Prada
 * @date 2025-05-31
 *
 * @description
 * Maneja las solicitudes POST a `src/app/api/organization/join`. Requiere autenticación.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar y actualizar los registros
 * de las tablas `organization` y `users` en la base de datos MySQL.
 * Devuelve un mensaje con el status de la operación en formato JSON.
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * Validación:
 * El cuerpo de la petición se valida usando Zod. Se espera el siguiente formato:
 * {
 *   organizationId: number, // ID de la organización a la que se unirá el usuario
 *   role: 'admin' | 'medico' | 'asistente' | 'N/A' // Rol que tendrá el usuario en la organización
 * }
 * Si la validación falla, se responde con status 400 y detalles del error.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires @rutas/db - Instancia `db` de Drizzle ORM.
 * @requires @rutas/db/schema/organization - Definición de la tabla `organization`.
 * @requires @rutas/db/schema/users - Definición de la tabla `users`.
 * @requires @rutas/app/lib/firebase/server/middleware/authMiddleware - Middleware de autenticación Firebase.
 * @requires zod - Para validación de datos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db';
import { eq } from 'drizzle-orm';
import { organization } from '@rutas/db/schema/organization';
import { users } from '@rutas/db/schema/users';
import { withAuthentication } from '@rutas/app/lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';
import {z} from 'zod';
import { generateRandomInvitationCode } from '../route';
import { organizationInvitationRequest } from '@rutas/db/schema/organization_invitations_request';


// Esquema Zod para validar el cuerpo de la petición
const joinOrganizationSchema = z.object({
  invitationCode: z.string({ invalid_type_error: 'organizationId must be a string' }),
  role: z.enum(['admin', 'medico', 'asistente', 'N/A']),
});

/**
 * Manejador para solicitudes POST a la ruta /api/organization/join.
 * 
 * Este handler:
 * - Valida el cuerpo de la petición usando Zod (organizationId: number, role: enum).
 * - Verifica que la organización y el usuario existan en la base de datos.
 * - Actualiza el usuario para asignarle la organización y el rol especificado.
 * - Devuelve un mensaje de éxito o el error correspondiente en formato JSON.
 * 
 * @param {NextRequest} request - Objeto de la petición HTTP Next.js.
 * @param {DecodedIdToken} decodedToken - Token de usuario autenticado por Firebase.
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con el resultado de la operación.
 * 
 * @throws 400 - Si el cuerpo de la petición es inválido o no cumple el esquema Zod.
 * @throws 404 - Si la organización o el usuario no existen.
 * @throws 200 - Si la operación es exitosa.
 */
const postOrganizationJoinHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken): Promise<NextResponse | Response> => {

  let body;

  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  // Validación del cuerpo de la petición usando Zod
  const parseResult = joinOrganizationSchema.safeParse(body);
  // Si la validación falla, devuelve un error 400 con los detalles
  if (!parseResult.success) {
    return NextResponse.json({
      message: 'Invalid request body',
      errors: parseResult.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  // Extrae los datos validados
  const { invitationCode, role } = parseResult.data;

  // Buscar la organización por invitationCode
  const existingOrganization = await db.query.organization.findFirst({
    where: eq(organization.invitationCode, invitationCode),
  });
  if (!existingOrganization) {
    return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
  }
  // Buscar el usuario autenticado
  const existingUser = await db.query.users.findFirst({
    where: eq(users.firebaseUid, decodedToken.uid),
  });
  if (!existingUser) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  // Buscar invitación pendiente para este usuario y organización
  if (!existingUser.email) {
    return NextResponse.json({ message: 'User email not found' }, { status: 400 });
  }
  const invitation = await db.query.organizationInvitationRequest.findFirst({
    where: (row) =>
      eq(row.userEmail, existingUser.email!) &&
      eq(row.organizationId, existingOrganization.id) &&
      eq(row.status, 'pending'),
  });
  if (!invitation) {
    return NextResponse.json({ message: 'No invitation found for this user and organization' }, { status: 403 });
  }
  if (invitation.status !== 'pending') {
    return NextResponse.json({ message: 'Invitation is not pending' }, { status: 403 });
  }
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    return NextResponse.json({ message: 'Invitation has expired' }, { status: 403 });
  }

  await db.update(users).set({
    organizationId: existingOrganization.id,
    role: invitation.role,
  }).where(eq(users.firebaseUid, decodedToken.uid));
  
  // Actualizar el estado de la invitación a 'accepted'
  await db.update(organizationInvitationRequest).set({
    status: 'approved',
    approvedAt: new Date(),
  }).where(
      eq(organizationInvitationRequest.userEmail, existingUser.email!) &&
      eq(organizationInvitationRequest.organizationId, existingOrganization.id) &&
      eq(organizationInvitationRequest.status, 'pending'
    )
  );

  // crear un nuevo codigo de invitación para la organización
  const code = await generateRandomInvitationCode();
  await db.update(organization).set({
    invitationCode: code,
  }).where(eq(organization.id, existingOrganization.id));

  return NextResponse.json({ message: 'Organization joined successfully' }, { status: 200 });
}

export const POST = withAuthentication(postOrganizationJoinHandler);