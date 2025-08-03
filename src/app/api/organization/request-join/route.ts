// @app/src/api/organization/request-join/route.ts
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { organizationInvitationRequest, organizationInvitationRequestInsert } from '@/db/schema/organization_invitations_request';

import { eq } from 'drizzle-orm/sql/expressions/conditions';
import { NextRequest, NextResponse } from 'next/server';

// Cambia estos valores por tus credenciales reales
const BASIC_AUTH_USER = 'devUser';
const BASIC_AUTH_PASS = 'Rigjeq-jujgy7-vejqexv';

const sendInvitacionEmail = async (
    email: string,
    organizationName: string,
    role: string,
    subject: string,
    url: string,
    invitacionCode: string,
    emailFrom: string,
    displayName: string,
    imgFrom : string
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
          url: url,
          invitacionCode : invitacionCode,
          emailFrom : emailFrom,
          displayName : displayName,
          imgFrom : imgFrom
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


/**
 * @typedef {Object} PostOrganizationRequestHandler
 * @property {NextRequest} request - The incoming request object.
 * @property {DecodedIdToken} decodedToken - The decoded Firebase ID token of the authenticated user.
 * @returns {Promise<NextResponse | Response>} - A promise that resolves to a NextResponse or Response object.
 *
 * @description Handles the POST request to join an organization by processing the user's request
 * and storing it in the database.
 */
const postOrganizationRequestHandler  = async (
    request: NextRequest,
    userInfo: AuthenticatedUserInfo): Promise<NextResponse | Response> => {
    const { email, role, message} = await request.json();
        try {
            // La información del usuario ya está disponible en userInfo
            const user = userInfo.user;

            const organizacion = await db.query.organization.findFirst({
                where: eq(organization.id, user.organizationId as number),
                columns: { id: true, name: true, invitationCode: true },
            });
            if (!organizacion) {
                return NextResponse.json(
                    { error: 'Organización no encontrada en la base de datos local.' },
                    { status: 404 }
                );
            }
            /** 
            // Verificar si ya existe una solicitud pendiente del usuario a la organización
            const existingRequest = await db.query.organizationInvitationRequest.findFirst({
                where: eq(organizationInvitationRequest.userEmail, email),
            });
            // Verificar si la organización existe
            
            if (existingRequest) {
                return NextResponse.json(
                    { error: 'Ya existe una solicitud pendiente para esta organización.' },
                    { status: 400 }
                );
            }*/

            const subject = `invitacion al grupo de ${organizacion.name}`
            const url = `http://irina.makilacloud.com:3000/signup?invitacionCode=${organizacion.invitationCode}&role=${role}`;

            const invitacionEmail = await sendInvitacionEmail(email, organizacion.name, role, subject,url,organizacion.invitationCode, user.email as string, user.displayName as string, '' );
            
            if (!invitacionEmail) {
                return NextResponse.json(
                    { error: 'Error al enviar el correo de invitación.' },
                    { status: 500 }
                );
            }

            const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos desde ahora

            const newRequest: organizationInvitationRequestInsert = {
                organizationId: user.organizationId as number,
                userEmail: email,
                role: role,
                status: 'pending',
                message: message || null,
                createdAt: new Date(),
                approvedAt: null,
                rejectedAt: null,
                cancelledAt: null,
                isDeleted: false,
                expiresAt, // nuevo campo para expiración
            };

            await db.insert(organizationInvitationRequest).values(newRequest);


    return NextResponse.json(
            { message: 'Solicitud de unión a la organización procesada correctamente.' },
            { status: 200 }
        );
        } catch (error) {
            console.error('Error processing organization join request:', error);
            return NextResponse.json(
                { error: 'Error processing organization join request.' },
                { status: 500 }
            );
        }
    };

export const POST = withOptimizedAuthentication(postOrganizationRequestHandler,
  {
    requiredRoles: ['admin', 'medico', 'asistente', 'N/A'],
    requireOrganization: false,
  }
);
