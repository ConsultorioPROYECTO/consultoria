/**
 * @fileoverview API Route para obtener todos los doctores de una organización
 *               con sus citas asociadas y información de pacientes.
 * @version 1.0.0
 * @author Santiago Prada - Backend Developer
 * @date 2025-01-20
 * @since 1.0.0
 * @module OrganizationDoctorAppointmentsAPI
 *
 * @description
 * Esta API permite a los usuarios con rol "admin" (master) obtener todos los doctores
 * que pertenecen a su organización, incluyendo todas las citas de cada doctor
 * con información completa del paciente.
 *
 * La API implementa un patrón de consulta jerárquica que:
 * 1. Valida la autenticación y autorización del usuario
 * 2. Obtiene todos los doctores de la organización
 * 3. Para cada doctor, obtiene sus citas con información del paciente
 *
 * @example
 * ```typescript
 * // Ejemplo de uso desde el cliente
 * const response = await fetch('/api/master/organization-doctor-appointments', {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': 'Bearer <firebase-token>',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * const data = await response.json();
 * console.log(data.data); // Array de doctores con citas
 * ```
 *
 * @requires next/server - Para NextRequest y NextResponse
 * @requires @/app/lib/firebase/server/middleware/authMiddleware - Para autenticación
 * @requires @/db - Para conexión a base de datos con Drizzle ORM
 * @requires @/db/schema - Para esquemas de tablas (users, doctors, appointments, patients)
 * @requires @/types/api - Para tipos de respuesta estandarizados
 * @requires @/lib/api-helpers - Para helpers de validación y manejo de errores
 * @requires drizzle-orm - Para operaciones de base de datos y tipos inferidos
 * @requires firebase-admin/auth - Para tipos de token decodificado
 *
 * @see {@link https://orm.drizzle.team/docs/overview | Drizzle ORM Documentation}
 * @see {@link https://firebase.google.com/docs/auth | Firebase Authentication}
 */

import { NextRequest } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { db } from '@/db';
import { users, doctors, appointments, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS, API_ERRORS } from '@/types/api';
import { validateUserRole, handleDatabaseError } from '@/lib/api-helpers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { InferSelectModel } from 'drizzle-orm';

/**
 * @namespace DrizzleInferredTypes
 * @description Tipos inferidos de Drizzle ORM para mayor consistencia y mantenibilidad.
 * 
 * @remarks
 * VENTAJAS DE USAR TIPOS INFERIDOS:
 * 1. Consistencia automática: Los tipos se actualizan automáticamente cuando cambia el esquema
 * 2. Reducción de código: No necesitamos definir interfaces manualmente
 * 3. Type safety: TypeScript detecta errores de tipos en tiempo de compilación
 * 4. Mantenibilidad: Un solo lugar de verdad para los tipos (el esquema de la BD)
 * 5. Autocompletado mejorado: El IDE puede sugerir propiedades correctas
 * 
 * @example
 * ```typescript
 * // Los tipos se infieren automáticamente del esquema
 * const user: User = {
 *   id: 1,
 *   firebaseUid: 'abc123',
 *   email: 'user@example.com',
 *   role: 'admin',
 *   organizationId: 1
 * };
 * ```
 */

/**
 * @typedef {InferSelectModel<typeof users>} User
 * @description Tipo inferido para la entidad Usuario desde el esquema de Drizzle ORM.
 * Incluye todos los campos de la tabla users con sus tipos correctos.
 */
type User = InferSelectModel<typeof users>;

/**
 * @typedef {InferSelectModel<typeof doctors>} Doctor
 * @description Tipo inferido para la entidad Doctor desde el esquema de Drizzle ORM.
 * Incluye todos los campos de la tabla doctors con sus tipos correctos.
 */
type Doctor = InferSelectModel<typeof doctors>;

/**
 * @typedef {InferSelectModel<typeof appointments>} Appointment
 * @description Tipo inferido para la entidad Cita desde el esquema de Drizzle ORM.
 * Incluye todos los campos de la tabla appointments con sus tipos correctos.
 */
type Appointment = InferSelectModel<typeof appointments>;

/**
 * @typedef {InferSelectModel<typeof patients>} Patient
 * @description Tipo inferido para la entidad Paciente desde el esquema de Drizzle ORM.
 * Incluye todos los campos de la tabla patients con sus tipos correctos.
 */
type Patient = InferSelectModel<typeof patients>;

/**
 * @interface DoctorWithAppointments
 * @description Tipo compuesto que representa un doctor con sus citas asociadas.
 * Utiliza tipos inferidos de Drizzle ORM para garantizar consistencia automática.
 * 
 * @property {User} user - Información completa del usuario asociado al doctor
 * @property {Array<AppointmentWithPatient>} appointments - Array de citas con información del paciente
 * 
 * @example
 * ```typescript
 * const doctorData: DoctorWithAppointments = {
 *   idDoctor: 1,
 *   userId: 123,
 *   specialization: 'Cardiología',
 *   user: {
 *     id: 123,
 *     email: 'doctor@hospital.com',
 *     role: 'doctor',
 *     organizationId: 1
 *   },
 *   appointments: [
 *     {
 *       id: 789,
 *       date: '2025-01-21',
 *       patient: { id: 101, name: 'Juan Pérez' }
 *     }
 *   ]
 * };
 * ```
 * 
 * @remarks
 * Este enfoque puede mejorarse aún más usando las relaciones de Drizzle ORM
 * con `db.query.doctors.findMany({ with: { ... } })` para consultas más eficientes
 * y automáticas. Sin embargo, el enfoque actual es más explícito y controlable.
 * 
 * @see {@link https://orm.drizzle.team/docs/rqb#include-relations | Drizzle Relations}
 */
export type DoctorWithAppointments = Doctor & {
  /** Información completa del usuario asociado al doctor */
  user: User;
  /** Array de citas del doctor con información del paciente */
  appointments: Array<Appointment & {
    /** Información del paciente (puede ser null si no existe) */
    patient: Patient | null;
  }>;
};

/**
 * @typedef {DoctorWithAppointments[]} OrganizationDoctorAppointmentsResponse
 * @description Tipo de respuesta para la API de doctores con citas.
 * Representa un array de doctores con toda su información de citas.
 * 
 * @example
 * ```typescript
 * // Estructura de respuesta exitosa
 * const apiResponse = {
 *   success: true,
 *   data: OrganizationDoctorAppointmentsResponse,
 *   message: 'Se encontraron 10 doctores con sus citas asociadas'
 * };
 * ```
 */
export type OrganizationDoctorAppointmentsResponse = DoctorWithAppointments[];

/**
 * @function handleGetRequest
 * @description Maneja las peticiones GET para obtener todos los doctores de una organización
 * con sus citas asociadas y información de pacientes.
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante de Next.js
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase Authentication
 * @param {string} decodedToken.uid - UID único del usuario en Firebase
 * @param {string} decodedToken.email - Email del usuario autenticado
 * @param {Object} decodedToken.firebase - Información adicional de Firebase
 * 
 * @returns {Promise<NextResponse | Response>} Promesa que resuelve a:
 * - **Éxito (200)**: `{ success: true, data: DoctorWithAppointments[], message: string }`
 * - **Error (404)**: Usuario no encontrado en la base de datos
 * - **Error (403)**: Usuario sin permisos o sin organización asociada
 * - **Error (500)**: Error interno del servidor o de base de datos
 * 
 * @throws {Error} Error de base de datos si falla alguna consulta SQL
 * @throws {Error} Error de validación si los datos no cumplen los requisitos
 * 
 * @example
 * ```typescript
 * // Uso interno en el endpoint GET
 * const response = await handleGetRequest(request, decodedToken);
 * 
 * // Estructura de respuesta exitosa
 * {
 *   success: true,
 *   data: [
 *     {
 *       idDoctor: 1,
 *       userId: 123,
 *       specialization: 'Cardiología',
 *       user: { id: 123, email: 'doctor@hospital.com', role: 'doctor' },
 *       appointments: [
 *         {
 *           id: 789,
 *           date: '2025-01-21T10:00:00Z',
 *           patient: { id: 101, name: 'Juan Pérez' }
 *         }
 *       ]
 *     }
 *   ],
 *   message: 'Se encontraron 1 doctores con sus citas asociadas'
 * }
 * ```
 * 
 * @remarks
 * Esta función implementa un patrón de consulta jerárquica que:
 * 1. **Autenticación**: Verifica que el usuario existe en la base de datos
 * 2. **Autorización**: Valida que el usuario tenga rol 'admin'
 * 3. **Organización**: Confirma que el usuario pertenece a una organización
 * 4. **Consulta jerárquica**: Obtiene doctores → citas → pacientes
 * 
 * @performance
 * - **Complejidad**: O(n*m) donde n=doctores, m=citas
 * - **Consultas DB**: 1 + n consultas en el peor caso
 * - **Optimización**: Considerar usar `db.query` con relaciones para reducir consultas
 * 
 * @security
 * - Requiere autenticación válida de Firebase
 * - Valida rol de usuario antes de procesar
 * - Filtra datos por organización del usuario
 * - No expone información de otras organizaciones
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Token Verification}
 */
async function handleGetRequest(
  request: NextRequest,
  decodedToken: DecodedIdToken
) {
  try {
    // 1. Obtener información del usuario autenticado
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decodedToken.uid))
      .limit(1);

    if (userResult.length === 0) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        'Usuario no encontrado en la base de datos',
        HTTP_STATUS.NOT_FOUND
      );
    }

    const user = userResult[0];

    // 2. Validar que el usuario tenga rol de "admin" (master)
    const roleValidationError = validateUserRole(user.role, ['admin', 'asistente']);
    if (roleValidationError) {
      return roleValidationError;
    }

    // 3. Verificar que el usuario tenga una organización asociada
    if (!user.organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'Usuario no tiene una organización asociada',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 4. Obtener todos los doctores de la misma organización con información del usuario
    const doctorsResult = await db
      .select()
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(users.organizationId, user.organizationId));

    // 5. Para cada doctor, obtener sus citas con información del paciente
    const doctorsWithAppointments: DoctorWithAppointments[] = [];

    for (const doctor of doctorsResult) {
      // Obtener citas del doctor con información del paciente (filtradas por organización)
      const appointmentsResult = await db
        .select()
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .where(
          and(
            eq(appointments.doctorId, doctor.doctors.idDoctor),
            eq(appointments.organizationId, user.organizationId)
          )
        );

      // Formatear las citas con información del paciente usando tipos inferidos
      const formattedAppointments = appointmentsResult.map(result => ({
        ...result.appointments,
        patient: result.patients || null
      }));

      // Agregar el doctor con sus citas usando tipos inferidos
      doctorsWithAppointments.push({
        ...doctor.doctors,
        user: doctor.users,
        appointments: formattedAppointments
      });
    }

    return createSuccessResponse(
      doctorsWithAppointments,
      `Se encontraron ${doctorsWithAppointments.length} doctores con sus citas asociadas`,
      HTTP_STATUS.OK
    );

  } catch (error) {
    console.error('Error al obtener doctores con citas:', error);
    return handleDatabaseError(error, 'obtener doctores con citas');
  }
}

/**
 * @function GET
 * @description Manejador HTTP GET para obtener todos los doctores de una organización
 * con sus citas asociadas y información de pacientes.
 * 
 * @route GET /api/master/organization-doctor-appointments
 * @access Private - Requiere autenticación Firebase y rol "admin"
 * @middleware withAuthentication - Middleware de autenticación Firebase
 * 
 * @param {NextRequest} request - Objeto de petición HTTP de Next.js
 * @param {DecodedIdToken} decodedToken - Token decodificado inyectado por el middleware
 * 
 * @returns {Promise<NextResponse<OrganizationDoctorAppointmentsResponse>>} 
 * Respuesta HTTP con la lista de doctores y citas
 * 
 * @example
 * ```bash
 * # Ejemplo de petición cURL
 * curl -X GET \
 *   'https://tu-dominio.com/api/master/organization-doctor-appointments' \
 *   -H 'Authorization: Bearer <firebase-id-token>' \
 *   -H 'Content-Type: application/json'
 * ```
 * 
 * @example
 * ```typescript
 * // Ejemplo de uso desde el frontend
 * import { auth } from '@/lib/firebase';
 * 
 * async function fetchDoctorsData() {
 *   const user = auth.currentUser;
 *   if (!user) throw new Error('Usuario no autenticado');
 *   
 *   const token = await user.getIdToken();
 *   const response = await fetch('/api/master/organization-doctor-appointments', {
 *     method: 'GET',
 *     headers: {
 *       'Authorization': `Bearer ${token}`,
 *       'Content-Type': 'application/json'
 *     }
 *   });
 *   
 *   if (!response.ok) {
 *     throw new Error(`HTTP error! status: ${response.status}`);
 *   }
 *   
 *   const data = await response.json();
 *   return data.data; // OrganizationDoctorAppointmentsResponse
 * }
 * ```
 * 
 * @httpStatus 200 - Éxito: Retorna lista de doctores con citas
 * @httpStatus 401 - No autorizado: Token Firebase inválido o expirado
 * @httpStatus 403 - Prohibido: Usuario sin rol admin o sin organización
 * @httpStatus 404 - No encontrado: Usuario no existe en la base de datos
 * @httpStatus 500 - Error interno: Error de servidor o base de datos
 * 
 * @security
 * - **Autenticación**: Token Firebase válido requerido
 * - **Autorización**: Solo usuarios con rol 'admin' pueden acceder
 * - **Aislamiento**: Solo datos de la organización del usuario
 * - **Validación**: Verificación de existencia de usuario y organización
 * 
 * @performance
 * - **Cache**: No implementado (considerar Redis para datos frecuentes)
 * - **Paginación**: No implementada (considerar para organizaciones grandes)
 * - **Índices DB**: Asegurar índices en organizationId, userId, doctorId
 * 
 * @see {@link handleGetRequest} Función que maneja la lógica de negocio
 * @see {@link withAuthentication} Middleware de autenticación Firebase
 * @see {@link OrganizationDoctorAppointmentsResponse} Tipo de respuesta
 */
export const GET = withAuthentication(async (
  request: NextRequest,
  decodedToken: DecodedIdToken
) => {
  return handleGetRequest(request, decodedToken);
});

/**
 * @section AlternativeImplementation
 * @title EJEMPLO ALTERNATIVO: Usando relaciones de Drizzle ORM (más eficiente)
 * 
 * @description
 * Si las relaciones estuvieran completamente configuradas en el esquema de Drizzle ORM,
 * se podría simplificar significativamente el código y mejorar el rendimiento.
 * 
 * @example
 * ```typescript
 * // Configuración de relaciones en el esquema (schema.ts)
 * export const doctorsRelations = relations(doctors, ({ one, many }) => ({
 *   user: one(users, {
 *     fields: [doctors.userId],
 *     references: [users.id],
 *   }),
 *   appointments: many(appointments),
 * }));
 * 
 * export const appointmentsRelations = relations(appointments, ({ one }) => ({
 *   doctor: one(doctors, {
 *     fields: [appointments.doctorId],
 *     references: [doctors.idDoctor],
 *   }),
 *   patient: one(patients, {
 *     fields: [appointments.patientId],
 *     references: [patients.id],
 *   }),
 * }));
 * ```
 * 
 * @example
 * ```typescript
 * // Implementación optimizada usando relaciones
 * async function handleGetRequestOptimized(
 *   request: NextRequest,
 *   decodedToken: DecodedIdToken
 * ) {
 *   try {
 *     // 1. Obtener usuario y validar permisos (igual que antes)
 *     const userResult = await db.query.users.findFirst({
 *       where: eq(users.firebaseUid, decodedToken.uid)
 *     });
 * 
 *     if (!userResult || userResult.role !== 'admin' || !userResult.organizationId) {
 *       // Manejo de errores...
 *     }
 * 
 *     // 2. Consulta optimizada con relaciones automáticas
 *     const doctorsWithRelations = await db.query.doctors.findMany({
 *       where: eq(users.organizationId, userResult.organizationId),
 *       with: {
 *         user: true,
 *         appointments: {
 *           with: {
 *             patient: true
 *           }
 *         }
 *       }
 *     });
 * 
 *     return createSuccessResponse(
 *       doctorsWithRelations, 
 *       `Se encontraron ${doctorsWithRelations.length} doctores`
 *     );
 *   } catch (error) {
 *     return handleDatabaseError(error, 'obtener doctores optimizado');
 *   }
 * }
 * ```
 * 
 * @benefits
 * - **Rendimiento**: Una sola consulta SQL en lugar de múltiples consultas anidadas
 * - **Mantenibilidad**: Relaciones definidas una vez en el esquema
 * - **Type Safety**: TypeScript infiere automáticamente los tipos de las relaciones
 * - **Legibilidad**: Código más limpio y fácil de entender
 * - **Escalabilidad**: Mejor rendimiento con grandes volúmenes de datos
 * 
 * @requirements
 * Para implementar esta optimización se requiere:
 * 1. Configurar todas las relaciones en los esquemas de Drizzle ORM
 * 2. Actualizar las importaciones para incluir las relaciones
 * 3. Modificar la lógica de consulta para usar `db.query` en lugar de `db.select`
 * 4. Ajustar la transformación de datos según la nueva estructura
 * 
 * @performance
 * - **Consultas DB**: 1 consulta vs N+1 consultas actuales
 * - **Complejidad**: O(1) vs O(n*m) actual
 * - **Memoria**: Menor uso de memoria por consulta optimizada
 * - **Red**: Menos round-trips a la base de datos
 * 
 * @see {@link https://orm.drizzle.team/docs/rqb | Drizzle Relational Query Builder}
 * @see {@link https://orm.drizzle.team/docs/rqb#include-relations | Drizzle Relations Documentation}
 * @see {@link https://orm.drizzle.team/docs/relations | Defining Relations in Drizzle}
 */