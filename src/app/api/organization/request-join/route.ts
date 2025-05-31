// @app/src/api/organization/request-join/route.ts
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { organizationJoinRequest } from '@/db/schema/organization_join_request';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm/sql/expressions/conditions';
import { DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest, NextResponse } from 'next/server';


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
    decodedToken: DecodedIdToken): Promise<NextResponse | Response> => {
    const { invitationCode, role, message} = await request.json();
        try {
            // Se obtiene el usuario omitiendo el role, se debe de dejar claro el manejo de los 
            // roles el hacer una solicitud de unirse a una organizacion
            const user = await db.query.users.findFirst({
                where: eq(users.firebaseUid, decodedToken.uid),
                columns: { id: true}
            });
            if (!user) {
                return NextResponse.json(
                    { error: 'Usuario no encontrado en la base de datos local.' },
                    { status: 404 }
                );
            }

            const existingOrganization = await db.query.organization.findFirst({
            where: eq(organization.invitationCode, invitationCode),
            });

            if (!existingOrganization) {
                return NextResponse.json(
                    { error: 'Organización no encontrada.' },
                    { status: 404 }
                );
            }

            // Verificar si ya existe una solicitud pendiente del usuario a la organización
            const existingRequest = await db.query.organizationJoinRequest.findFirst({
                where: eq(organizationJoinRequest.userId, user.id)
            });
            if (existingRequest) {
                return NextResponse.json(
                    { error: 'Ya existe una solicitud pendiente para esta organización.' },
                    { status: 400 }
                );
            }
            // Crear la solicitud de unión a la organización
            await db.insert(organizationJoinRequest).values({
                organizationId: existingOrganization.id,
                userId: user.id,
                role: role || 'N/A', // Asignar un rol por defecto si no se proporciona
                status: 'pending',
                message: message || null,
            });

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

export const POST = withAuthentication(postOrganizationRequestHandler);
