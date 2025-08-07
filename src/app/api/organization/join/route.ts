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
 * @requires @/db - Instancia `db` de Drizzle ORM.
 * @requires @/db/schema/organization - Definición de la tabla `organization`.
 * @requires @/db/schema/users - Definición de la tabla `users`.
 * @requires @/app/lib/firebase/server/middleware/authMiddleware - Middleware de autenticación Firebase.
 * @requires zod - Para validación de datos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { organization } from '@/db/schema/organization';
import { users } from '@/db/schema/users';
import { doctors } from '@/db/schema/doctors';
import { assistants } from '@/db/schema/assistants';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import {z} from 'zod';
import { organizationInvitationRequest } from '@/db/schema/organization_invitations_request';

// Credenciales para autenticación básica del webhook
const BASIC_AUTH_USER = 'devUser';
const BASIC_AUTH_PASS = 'Rigjeq-jujgy7-vejqexv';

// Función para enviar correo de invitación
const sendInvitacionEmail = async (
  email: string,
  organizationName: string,
  role: string,
  subject: string,
  message: string
): Promise<boolean> => {
  try {
    const response = await fetch('https://n8n.srv828784.hstgr.cloud/webhook/a91c2a89-22d3-495b-8455-42ad2c5ea860', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`),
      },
      body: JSON.stringify({
        email: email,
        organizationName: organizationName,
        role: role,
        subject: subject,
        message: message
      }),
    });

    if (!response.ok) {
      console.error('Error sending invitation email:', response.statusText);
      return false;
    }

    console.log(`Correo de invitación enviado exitosamente a ${email}`);
    return true;
  } catch (error) {
    console.error('Error enviando correo:', error);
    return false;
  }
};


// Esquema Zod para validar el cuerpo de la petición
const joinOrganizationSchema = z.object({
  invitationCode: z.string().length(6, "Código de invitación debe tener 6 caracteres"),
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
  userInfo: AuthenticatedUserInfo): Promise<NextResponse | Response> => {

  let body;

  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ message: 'Invalid JSON body', error: e }, { status: 400 });
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

  // La información del usuario ya está disponible en userInfo
  const existingUser = userInfo.user;

  if (existingUser.organizationId) {
    return NextResponse.json({ 
      error: 'El usuario ya pertenece a una organización',
      message: 'User already belongs to an organization' 
    }, { status: 400 });
  }

  // Buscar invitación por código de 6 dígitos
  if (!existingUser.email) {
    return NextResponse.json({ message: 'User email not found' }, { status: 400 });
  }
  
  const invitation = await db.query.organizationInvitationRequest.findFirst({
    where: (row) =>
      eq(row.invitationToken, invitationCode) &&
      eq(row.userEmail, existingUser.email!) &&
      eq(row.status, 'pending'),
  });
  
  if (!invitation) {
    return NextResponse.json({ 
      error: 'Código de invitación inválido o no coincide con tu email',
      message: 'Invalid invitation code or email mismatch' 
    }, { status: 404 });
  }
  
  // Buscar la organización asociada a la invitación
  const existingOrganization = await db.query.organization.findFirst({
    where: eq(organization.id, invitation.organizationId),
  });
  
  if (!existingOrganization) {
    return NextResponse.json({ 
      error: 'Organización no encontrada',
      message: 'Organization not found' 
    }, { status: 404 });
  }


  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    // Marcar la invitación como expirada
    await db.update(organizationInvitationRequest).set({
      status: 'expired',
    }).where(
      eq(organizationInvitationRequest.userEmail, existingUser.email!) &&
      eq(organizationInvitationRequest.organizationId, existingOrganization.id) &&
      eq(organizationInvitationRequest.status, 'pending')
    );
    
    return NextResponse.json({ 
      error: 'La invitación ha expirado',
      message: 'Invitation has expired' 
    }, { status: 403 });
  }

  await db.update(users).set({
    organizationId: existingOrganization.id,
    role: role,
  }).where(eq(users.id, existingUser.id));
  
  // Actualizar el estado de la invitación a 'approved'
  await db.update(organizationInvitationRequest).set({
    status: 'approved',
    approvedAt: new Date(),
  }).where(
      eq(organizationInvitationRequest.invitationToken, invitationCode)
  );

  // Crear o actualizar registro en tabla específica según el rol
  if (role === 'medico') {
    try {
      // Usar upsert para crear o actualizar completamente el registro de doctor
      await db.insert(doctors).values({
        userId: existingUser.id,
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
            start: '08:00',
            end: '18:00',
            days: [1, 2, 3, 4, 5],
          },
          autoAcceptMeetings: false,
          defaultMeetingDuration: 30,
        }
      }).onDuplicateKeyUpdate({
        set: {
          speciality: '',
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
      console.log(`Registro de doctor creado/actualizado para usuario ${existingUser.id}`);
    } catch (doctorError) {
      console.error('Error creando/actualizando registro de doctor:', doctorError);
    }
  } else if (role === 'asistente') {
    try {
      // Usar upsert para crear o actualizar completamente el registro de asistente
      await db.insert(assistants).values({
        userId: existingUser.id,
      }).onDuplicateKeyUpdate({
        set: {
          updatedAt: new Date()
        }
      });
      console.log(`Registro de asistente creado/actualizado para usuario ${existingUser.id}`);
    } catch (assistantError) {
      console.error('Error creando/actualizando registro de asistente:', assistantError);
    }
  }

  // Enviar correo de bienvenida al usuario
  try {
    await sendInvitacionEmail(
      existingUser.email!,
      existingOrganization.name,
      role,
      'Bienvenido a la organización',
      `¡Bienvenido a ${existingOrganization.name}! Te has unido exitosamente como ${role}. Ahora puedes acceder a todas las funcionalidades de la plataforma.`
    );
  } catch (emailError) {
    console.error('Error enviando correo de bienvenida:', emailError);
  }

  // Notificar a los administradores sobre el nuevo miembro
  try {
    // Buscar administradores en la base de datos MySQL usando Drizzle
    const admins = await db.select()
      .from(users)
      .where(
        eq(users.organizationId, existingOrganization.id) &&
        eq(users.role, 'admin')
      )

    // Enviar correo a cada administrador
    for (const admin of admins) {
      if (admin.email) {
        try {
          await sendInvitacionEmail(
            admin.email,
            existingOrganization.name,
            'admin',
            'Nuevo miembro se ha unido a la organización',
            `${existingUser.email} se ha unido a ${existingOrganization.name} como ${role}.`
          );
        } catch (emailError) {
          console.error(`Error enviando correo a administrador ${admin.email}:`, emailError);
        }
      }
    }
  } catch (notificationError) {
    console.error('Error notificando administradores:', notificationError);
  }

  return NextResponse.json({
    success: true,
    message: 'Te has unido exitosamente a la organización',
    organizationId: existingOrganization.id,
    organizationName: existingOrganization.name,
    role: role
  }, { status: 200 });
}

export const POST = withOptimizedAuthentication(postOrganizationJoinHandler,
  {
    requiredRoles: ['admin', 'medico', 'asistente', 'N/A'],
    requireOrganization: false,
  }
);