
import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@rutas/app/lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';
import {z} from 'zod';


// Esquema Zod para validar el cuerpo de la petición
const joinOrganizationSchema = z.object({
  RequestJoinId: z.number({ invalid_type_error: 'organizationId must be a number' }),
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

  // Si RequestJoinId viene como string, intenta convertirlo a número
  if (typeof body.RequestJoinId === 'string') {
    body.RequestJoinId = Number(body.RequestJoinId);
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
  const { RequestJoinId } = parseResult.data;


  return NextResponse.json({ message: 'Organization joined successfully' }, { status: 200 });
}

export const POST = withAuthentication(postOrganizationJoinHandler);