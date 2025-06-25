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
export type AuthenticatedRequestResult =
  | { decodedToken: DecodedIdToken; errorResponse?: never }
  | { decodedToken?: never; errorResponse: NextResponse };

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
// Helper type to check if an object type is empty (like {})
// If T is {}, keyof T is never. Otherwise, keyof T is not never.
// We need to handle P being potentially undefined or a specific record.
// A more robust check for an empty params object:
// If P is exactly {}, then it's for a non-dynamic route.
// If P has specific keys, it's for a dynamic route.
// `Record<string, never>` is a good way to represent an object that must be empty.
// However, Next.js uses `{}` for non-dynamic params.

// Type for the handler function that developers write and pass to withAuthentication
type AuthenticatedHandler<P extends Record<string, string | string[] | undefined>> = (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  context: { params: P } // The developer's handler always receives context
) => Promise<NextResponse | Response>;

// Type for the actual route handler that Next.js will call
// This type changes based on whether P signifies a dynamic route or not.
// If P is {}, it's a non-dynamic route, so context is not part of Next.js's call signature.
// If P is not {}, it's dynamic, and context is part of the call signature.

// We use a trick: if P has no required keys, it's effectively {}. `keyof P extends never` is too strict if P can be `Record<string, string | undefined>`. 
// A simpler way: if P is exactly `{}`, then it's non-dynamic.
// This requires careful generic defaulting and inference.

// Let's define the return type of withAuthentication conditionally.
// If P is the default empty object `{}`, the returned handler should only take `request`.
// Otherwise, it takes `request` and `context`.

// Overload for non-dynamic routes (P is Record<string, never>)
// This signature is chosen when withAuthentication is called with a handler
// whose 'context.params' type is Record<string, never> (effectively an empty params object).
export function withAuthentication(
  handler: AuthenticatedHandler<Record<string, never>>
): (request: NextRequest) => Promise<NextResponse | Response>;

// Overload for dynamic routes (P is some record with actual parameter definitions)
// This signature is chosen when P is inferred as something other than {}.
export function withAuthentication<P extends Record<string, string | string[] | undefined>>(
  handler: AuthenticatedHandler<P>
): (request: NextRequest, context: { params: Promise<P> }) => Promise<NextResponse | Response>;

// Implementation
// The return type is a union of the possible handler signatures based on P.
// This makes the implementation signature more precise than 'any'.
export function withAuthentication<P extends Record<string, string | string[] | undefined>>(
  handler: AuthenticatedHandler<P>
): ((request: NextRequest) => Promise<NextResponse | Response>) | ((request: NextRequest, context: { params: Promise<P> }) => Promise<NextResponse | Response>) {
  // This inner async function is the actual handler Next.js will call.
  // Its 'context' parameter is optional to be compatible with both dynamic and non-dynamic route calls.
  const routeHandler = async (request: NextRequest, context?: { params: Promise<P> | P }): Promise<NextResponse | Response> => {
    const authResult = await authenticateRequest(request);

    if (authResult.errorResponse) {
      return authResult.errorResponse;
    }

    // Aseguramos que decodedToken no es undefined aquí debido a la verificación anterior
    // decodedToken está garantizado aquí por la lógica anterior y el tipo de unión discriminada
    // The original handler always expects a context. If Next.js doesn't pass one (non-dynamic route),
    // we synthesize it based on P (which would be {} by default).
    let params: P;
    if (context?.params) {
      params = context.params instanceof Promise ? await context.params : context.params;
    } else {
      params = {} as P;
    }
    const effectiveContext = { params };
    return handler(request, authResult.decodedToken, effectiveContext);
  };
  return routeHandler;
}