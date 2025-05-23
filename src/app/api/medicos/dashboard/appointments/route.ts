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
 *  - NextResponse con status 403 si el usuario autenticado no tiene el rol 'admin'.
 *  - NextResponse con status 200 y un array de usuarios si la consulta es exitosa.
 *  - NextResponse con status 500 y un mensaje de error si ocurre un problema en la BD.
 *
 * @example - Cómo probar la ruta con curl (requiere un token válido de un admin):
 * # Asumiendo que tienes un TOKEN_ID_ADMIN válido
 * curl -H "Authorization: Bearer <TOKEN_ID_ADMIN>" http://localhost:3000/api/doctors/dahsboard/appointments
 *
 * @todo 
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rutas/db'; // Ajusta la ruta si es diferente
import { users, doctors } from '@rutas/db/schema'; // Ajusta la ruta si es diferente
import { withAuthentication } from '@rutas/app/lib/firebase/server/middleware/authMiddleware'; // Ajusta la ruta
import type { DecodedIdToken } from 'firebase-admin/auth';
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
    decodedToken: DecodedIdToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: { params: Record<string, never> } // Para rutas no dinámicas, params es un objeto vacío (Record<string, never>).
  ): Promise<NextResponse | Response> => {
    console.log(`[API /api/medicos/dashboard/appointments] Solicitud GET recibida y autenticada para UID: ${decodedToken.uid}`);
  
    // --- Autorización: Verificar si el usuario autenticado es un administrador ---
    try {
      const requestingUser = await db.query.users.findFirst({
        where: eq(users.firebaseUid, decodedToken.uid),
        columns: { 
            role: true,
            id: true
        }, // Solo necesitamos el rol para la autorización y id para la relacion con la tabla doctors
      });
  
      if (!requestingUser) {
        // Esto sería raro si el token es válido, pero podría pasar si el usuario fue eliminado de tu BD
        // pero no de Firebase Auth inmediatamente.
        console.warn(`[API /api/medicos/dashboard/appointments] Usuario autenticado con UID ${decodedToken.uid} no encontrado en la base de datos local.`);
        return NextResponse.json(
          { error: 'Acceso denegado: No se encontró tu autenticacion de cuenta en el sistema, debes informar a tus superiores..' },
          { status: 403 }
        );
      }
  
      if (requestingUser.role !== 'medico') {
        console.warn(`[API /api/medicos/dashboard/appointments] Acceso denegado: Usuario ${decodedToken.uid} (Rol: ${requestingUser.role}) no es admin.`);
        return NextResponse.json(
          { error: 'Acceso Denegado: No tienes los permisos necesarios, debes ser admin..' },
          { status: 403 }
        );
      }

      const result = await db
      .select()
      .from(doctors, {useIndex : "firebase_uid_idx"})
      .leftJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.userId, requestingUser.id));

      const medico2 = result[0];
      console.log(`[API /api/medicos/dashboard/appointments] objeto medico2: ${JSON.stringify(medico2)}`);

      const medico = await db.query.doctors.findFirst({
        where: eq(doctors.userId, requestingUser.id), //relacion con la tabla doctors
        //where: eq(doctors.idDoctor, 1),  // falta la relacion con la tabla doctors
      });

      console.log(`[API /api/medicos/dashboard/appointments] objeto medico: ${JSON.stringify(medico)}`);

      if (!medico) {
        console.warn(`[API /api/medicos/dashboard/appointments] Medico autenticado con userId ${requestingUser.id} no encontrado en la base de datos local.`);
        return NextResponse.json(
          { error: 'Acceso denegado: No se encontró tu autenticacion de cuenta en el sistema, debes informar a tus superiores..' },
          { status: 403 }
        )
      }
  
      console.log(`[API /api/medicos/dashboard/appointments] Acceso autorizado para Medico: ${decodedToken.uid} (${decodedToken.email})`);
  
      return NextResponse.json(
        [
            { id: "apt1", time: "01:00 PM", patientName: "Sofia Solis", service: medico2.doctors.speciality, status: "Confirmada" },
            { id: "apt2", time: "01:30 PM", patientName: "Roberto Fernández", service: "Revisión", status: "Pendiente" },
            { id: "apt3", time: "02:00 PM", patientName: "Lucía Martínez", service: "Consulta Especializada", status: "Llegó" },
            { id: "apt4", time: "02:30 PM", patientName: "Marcos Alonso", service: "Consulta General", status: "Confirmada" },
            { id: "apt5", time: "03:00 PM", patientName: "Sofía Reyes", service: "Vacunación", status: "Completada" },
            { id: "apt6", time: "11:30 PM", patientName: "Javier Torres", service: "Consulta General", status: "Confirmada" },
        ]
      );
  
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
export const GET = withAuthentication(getUsersHandler);
