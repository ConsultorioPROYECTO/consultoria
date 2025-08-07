// src/app/api/doctors/dahsboard/appointments/route.ts

/**
 * @fileoverview API Route para obtener la lista de los appointments de un medico por medio de su token (protegida).
 * @version 1.0.0 
 * @author Santiago Prada
 * @date 2025-05-13
 *
 * @description
 * Maneja las solicitudes GET a `api/doctors/dahsboard/appointments`. Requiere autenticación y que el
 * usuario solicitante tenga el rol de 'medico'.
 * Utiliza la instancia de Drizzle ORM (`db`) para consultar todos los registros
 * de la tabla `appointments` en la base de datos MySQL.
 * Devuelve un array de objetos usuario en formato JSON.
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
 *  - NextResponse con status 401 si la autenticación falla (token faltante/inválido).
 *  - NextResponse con status 403 si el usuario autenticado no tiene el rol 'medico'.
 *  - NextResponse con status 200 y un array de appointments del doctor si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * curl -H "Authorization: Bearer <TOKEN_ID_ADMIN>" http://localhost:3000/api/doctors/dahsboard/appointments
 *
 * @todo 
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db'; // Ajusta la ruta si es diferente
import { doctors } from '@/db/schema'; // Ajusta la ruta si es diferente
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { eq } from 'drizzle-orm';

// --- Definición del Manejador GET con Autenticación y Autorización ---

/**
 * Manejador para solicitudes GET a /api/medicos/dashboard/appointment.
 * Este manejador se ejecuta solo si la autenticación (verificación del token Firebase) es exitosa.
 * Luego, realiza una verificación de autorización (rol de medico).
 *
 * @async
 * @param {NextRequest} request - El objeto de la solicitud entrante (provisto por Next.js).
 * @param {DecodedIdToken} decodedToken - El token decodificado del usuario autenticado (provisto por `withAuthentication`).
 * @returns {Promise<NextResponse | Response>} La respuesta HTTP.
 */
const getUsersHandler = async (
    request: NextRequest,
    userInfo: AuthenticatedUserInfo
  ): Promise<NextResponse | Response> => {
    console.log(`[API /api/medicos/dashboard/appointments] Solicitud GET recibida y autenticada para UID: ${userInfo.decodedToken.uid}`);
  
    // --- Autorización: Verificar si el usuario autenticado es un médico ---
    try {
      // La información del usuario ya está disponible en userInfo
      const requestingUser = userInfo.user;
  
      if (requestingUser.role !== 'medico') {
        console.warn(`[API /api/medicos/dashboard/appointments] Acceso denegado: Usuario ${userInfo.decodedToken.uid} (Rol: ${requestingUser.role}) no es medico.`);
        return NextResponse.json(
          { error: 'Acceso Denegado: No tienes los permisos necesarios, debes ser medico..' },
          { status: 403 }
        );
      }

      const doctorRequested = await db.query.doctors.findFirst({
        where: eq(doctors.userId, requestingUser.id), //relacion con la tabla doctors
      })

      if (!doctorRequested) {
        console.warn(`[API /api/medicos/dashboard/appointments] Doctor autenticado con userId ${requestingUser.id} no encontrado en la base de datos local.`);
        return NextResponse.json(
          { error: 'Acceso denegado: No se encontró tu autenticacion de cuenta en el sistema, debes informar a tus superiores..' },
          { status: 403 }
        )
      }

      const doctorWithAppointments = await db.query.doctors.findFirst({
        where: eq(doctors.idDoctor, doctorRequested.idDoctor),
        with: {
          appointments: {
            with: {
              patient: true,
              service: true,
            },
          },
        },
      });

      console.log("Doctor obtenido",doctorWithAppointments);

      if (!doctorWithAppointments) {
        // Esto podría ocurrir si el doctor fue eliminado después de la verificación inicial
        console.warn(`[API /api/medicos/dashboard/appointments] No se encontró el doctor con id ${doctorRequested.idDoctor} y sus citas, a pesar de que el usuario ${requestingUser.id} está vinculado a él.`);
        return NextResponse.json(
          { error: 'No se pudo recuperar la información del médico y sus citas.' },
          { status: 404 } // Not Found, ya que el recurso específico (doctor con citas) no se encontró
        );
      }
  
      console.log(`[API /api/medicos/dashboard/appointments] Acceso autorizado para Medico: ${userInfo.decodedToken.uid} (${userInfo.decodedToken.email})`);
  
      // Devolver las citas del médico o un array vacío si no tiene
      return NextResponse.json(doctorWithAppointments.appointments || []);
  
    } catch (error) {
      console.error('[API /api/medicos/dashboard/appointments] Error durante la autorización o la consulta a la base de datos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
      return NextResponse.json(
        {
          error: 'Failed to process request.',
          details: errorMessage, // En desarrollo podría ser útil, en producción considera omitirlo o generalizarlo.
        },
        { status: 500 }
      );
    }
  };


// Envolver el manejador con el middleware de autenticación
export const GET = withOptimizedAuthentication(getUsersHandler);
