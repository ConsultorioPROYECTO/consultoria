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
import { organization, plans } from '@rutas/db/schema';
import { withAuthentication } from '@lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';
import { users } from '@rutas/db/schema/users';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateRandomInvitationCode } from '@/lib/organization-utils';

/**
 * Esquema de validación para la creación de organización
 */
const createOrganizationSchema = z.object({
  organizationName: z.string()
    .min(1, 'El nombre de la organización es requerido')
    .max(255, 'El nombre de la organización no puede exceder 255 caracteres')
    .trim(),
  planId: z.string().min(1, 'El ID del plan es requerido') // Cambiado a string
});



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
      
      // Validar el cuerpo de la solicitud con Zod
      const validationResult = createOrganizationSchema.safeParse(body);
      
      if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        
        return NextResponse.json(
          { 
            error: 'Datos de entrada inválidos', 
            details: errorMessages,
            issues: validationResult.error.errors
          },
          { status: 400 }
        );
      }
      
      const { organizationName, planId: planIdentifier } = validationResult.data;

      // Mapeo de identificadores de plan del frontend a nombres en la BD
      const planIdentifierMap: { [key: string]: string } = {
        'basico': 'Básico',
        'profesional': 'Profesional',
        'empresarial': 'Empresarial'
      };

      const planName = planIdentifierMap[planIdentifier];

      if (!planName) {
        return NextResponse.json(
          { error: `El identificador de plan '${planIdentifier}' es inválido.` },
          { status: 400 }
        );
      }

      // 1. Buscar el plan por su nombre
      const plan = await db.query.plans.findFirst({
        where: eq(plans.name, planName)
      });

      if (!plan) {
        return NextResponse.json(
          { error: `El plan con el nombre '${planName}' no fue encontrado.` },
          { status: 404 }
        );
      }

      // 2. Actualizar el rol del usuario a 'admin'
      await db.update(users)
        .set({ role: "admin" })
        .where(eq(users.id, user.id));

      // 3. Generar código de invitación
      const invitacionCode = await generateRandomInvitationCode();
      
      // 4. Crear la organización usando el ID numérico del plan encontrado
      const insertResult = await db.insert(organization).values({
        name: organizationName,
        invitationCode: invitacionCode,
        planId: plan.id, // Usar el ID numérico del plan
      });

      const newOrganizationId = insertResult[0].insertId;

      if (!newOrganizationId) {
        return NextResponse.json(
          { error: 'Error al crear la organización.' },
          { status: 500 }
        );
      }

      // 5. Asociar el usuario a la organización
      await db.update(users)
      .set({ organizationId: newOrganizationId })
      .where(eq(users.id, user.id));

      return NextResponse.json({ 
        message: 'Organización creada correctamente.',
        organizationId: newOrganizationId,
        invitationCode: invitacionCode
      });
    } catch (error) {
      console.error('Error en el servidor:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor.' },
        { status: 500 }
      );
    }
  };
  export const POST = withAuthentication(postUserRoleHandler);
  