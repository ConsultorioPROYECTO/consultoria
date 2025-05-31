// @app/api/organization/join/route.ts

/**
 * @fileoverview API Route para unir a un usuario a una organizacion.
 * @version 1.0.1
 * @author Santiago Prada
 * @date 2025-05-24
 *
 * @description
 * Maneja las solicitudes POST a `src/app/api/organization/join`. Requiere autenticación.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `organization` en la base de datos MySQL.
 * Devuelve un un mensaje con el status de la consulta en formato JSON.
 *
 * La autenticación se maneja mediante la validación de Tokens ID de Firebase.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires @rutas/db - Instancia `db` de Drizzle ORM.
 * @requires @rutas/db/schema - Definición de la tabla `appointments`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db';
import { eq } from 'drizzle-orm';
import { organization } from '@rutas/db/schema/organization';
import { users } from '@rutas/db/schema/users';
import { withAuthentication } from '@rutas/app/lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';


/** 
 * Manejador para solicitudes POST a src/app/api/organization/join.
 * 
 * @async
 * @param {NextRequest} request
 * @returns {Promise<NextResponse>}
 */
const postOrganizationJoinHandler = async (
    request: NextRequest,
    decodedToken: DecodedIdToken): Promise<NextResponse | Response> => {
  const { organizationId, role} = await request.json();

  const existingOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });
  if (!existingOrganization) {
    return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
  }
  const existingUser = await db.query.users.findFirst({
    where: eq(users.firebaseUid, decodedToken.uid),
  });
  if (!existingUser) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }
  await db.update(users).set({
    organizationId: existingOrganization.id,
    role: role,
  }).where(eq(users.firebaseUid, decodedToken.uid));
  return NextResponse.json({ message: 'Organization joined successfully' }, { status: 200 });
}

export const POST = withAuthentication(postOrganizationJoinHandler);