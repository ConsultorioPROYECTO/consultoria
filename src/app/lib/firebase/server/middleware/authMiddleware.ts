// src/lib/server/middleware/authMiddleware.ts

/**
 * @fileoverview Middleware de autenticación para API Routes de Next.js
 *               utilizando la verificación de Tokens ID de Firebase.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-05-12
 *
 * @description
 * Este módulo proporciona una función `authenticateRequest` que actúa como un middleware
 * o un decorador para los manejadores de API Routes. Extrae y verifica el Token ID
 * de Firebase desde la cabecera 'Authorization'. Si la autenticación es exitosa,
 * devuelve el token decodificado (información del usuario). Si falla, devuelve
 * una instancia de `NextResponse` con el error apropiado (401 o 403) para ser
 * retornada directamente por la API Route, deteniendo la ejecución posterior.
 *
 * @requires next/server - Para los tipos NextRequest y NextResponse.
 * @requires ../../firebase/adminConfig - Para la función `verifyFirebaseToken`.
 * @requires firebase-admin - Para el tipo `DecodedIdToken`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '../adminConfig';
import type { DecodedIdToken } from 'firebase-admin/auth'; // Para el tipo de retorno

/**
 * @typedef {object} AuthenticatedRequestResult
 * @property {DecodedIdToken} [decodedToken] - El token decodificado si la autenticación es exitosa.
 * @property {NextResponse} [errorResponse] - Una respuesta de error si la autenticación falla.
 */
export interface AuthenticatedRequestResult {
  decodedToken?: DecodedIdToken;
  errorResponse?: NextResponse;
}

/**
 * Autentica una solicitud API validando el Token ID de Firebase.
 * Diseñada para ser llamada al inicio de un manejador de API Route.
 *
 * @async
 * @param {NextRequest} request - El objeto de la solicitud entrante.
 * @returns {Promise<AuthenticatedRequestResult>} Un objeto que contiene `decodedToken`
 *          si la autenticación es exitosa, o `errorResponse` si falla.
 *          Si `errorResponse` está presente, la API Route debería retornarlo inmediatamente.
 *
 * @example
 * // En tu API Route (ej. src/app/api/some-resource/route.ts)
 * export async function GET(request: NextRequest) {
 *   const authResult = await authenticateRequest(request);
 *   if (authResult.errorResponse) {
 *     return authResult.errorResponse; // Termina ejecución si hay error de autenticación
 *   }
 *
 *   const { uid, email } = authResult.decodedToken!; // Accede a los datos del usuario autenticado
 *   // ... procede con tu lógica de API, ahora sabes que el usuario está autenticado.
 *
 *   return NextResponse.json({ message: `Hola usuario ${email} (UID: ${uid})` });
 * }
 */
export const authenticateRequest = async (
  request: NextRequest
): Promise<AuthenticatedRequestResult> => {
  const authorizationHeader = request.headers.get('Authorization');

  if (!authorizationHeader) {
    console.warn('[Auth Middleware] Acceso denegado: Falta la cabecera Authorization.');
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Missing Authorization header' },
        { status: 401 }
      ),
    };
  }

  const tokenParts = authorizationHeader.split('Bearer ');
  if (tokenParts.length !== 2 || !tokenParts[1]) {
    console.warn('[Auth Middleware] Acceso denegado: Formato de token Bearer incorrecto.');
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Invalid token format. Expected Bearer token.' },
        { status: 401 }
      ),
    };
  }

  const idToken = tokenParts[1];
  const decodedToken = await verifyFirebaseToken(idToken);

  if (!decodedToken) {
    console.warn('[Auth Middleware] Acceso denegado: Token ID inválido o expirado.');
    return {
      errorResponse: NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 } // Podría ser 403 si el token es válido pero no tiene permisos, pero aquí es más sobre validez
      ),
    };
  }

  // Autenticación exitosa
  console.log(`[Auth Middleware] Usuario autenticado: ${decodedToken.uid} (${decodedToken.email})`);
  return { decodedToken };
};

/**
 * (Opcional) Función de orden superior (Higher-Order Function - HOF) para envolver manejadores de API.
 * Esto es una forma más "middleware" clásica.
 *
 * @template T - Tipo de los parámetros adicionales del manejador (ej. { params: { id: string } }).
 * @param {(request: NextRequest, decodedToken: DecodedIdToken, context: T) => Promise<NextResponse | Response>} handler - El manejador de API original.
 * @returns {(request: NextRequest, context: T) => Promise<NextResponse | Response>} El manejador envuelto con autenticación.
 *
 * @example
 * // export const GET = withAuthentication(async (request, decodedToken, context) => {
 * //   // tu lógica aquí, decodedToken está disponible
 * //   const userId = decodedToken.uid;
 * //   return NextResponse.json({ message: `Data for user ${userId}` });
 * // });
 */
export function withAuthentication<T extends { params?: Record<string, string | string[]> } = object >(
  handler: (
    request: NextRequest,
    decodedToken: DecodedIdToken,
    context: T // Next.js pasa un segundo argumento `context` con `params` para rutas dinámicas
  ) => Promise<NextResponse | Response> // Permitir también Response para streaming, etc.
) {
  return async (request: NextRequest, context: T): Promise<NextResponse | Response> => {
    const authResult = await authenticateRequest(request);

    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    // Aseguramos que decodedToken no es undefined aquí debido a la verificación anterior
    return handler(request, authResult.decodedToken!, context);
  };
}