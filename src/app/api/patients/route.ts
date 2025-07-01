/**
 * @fileoverview API Route para gestión de pacientes en el sistema de consultoría médica.
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-20
 * @since 1.0.0
 * @module PatientsAPI
 *
 * @description
 * Esta API permite la gestión completa de pacientes dentro de una organización médica.
 * Incluye operaciones para obtener la lista de pacientes y crear nuevos pacientes.
 * Todos los endpoints requieren autenticación con Firebase Auth y validación de roles.
 *
 * @example
 * ```typescript
 * // Ejemplo de uso desde el cliente
 * const response = await fetch('/api/patients', {
 *   method: 'GET',
 *   headers: {
 *     'Authorization': 'Bearer <firebase-token>',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * 
 * const data = await response.json();
 * console.log(data.data); // Array de pacientes
 * ```
 *
 * @requires next/server - Para NextRequest y NextResponse
 * @requires @/db - Para conexión a base de datos con Drizzle ORM
 * @requires @/db/schema - Para esquemas de tablas (patients, users)
 * @requires @/app/lib/firebase/server/adminConfig - Para autenticación Firebase
 * @requires @/types/api - Para tipos de respuesta estandarizados
 * @requires @/lib/api-helpers - Para helpers de validación y manejo de errores
 * @requires drizzle-orm - Para operaciones de base de datos
 * @requires firebase-admin/auth - Para tipos de token decodificado
 *
 * @see {@link https://orm.drizzle.team/docs/overview | Drizzle ORM Documentation}
 * @see {@link https://firebase.google.com/docs/auth | Firebase Authentication}
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewPatient } from "@/db/schema";

/**
 * @function getPatientsHandler
 * @description Maneja las peticiones GET para obtener todos los pacientes de la organización del usuario.
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante de Next.js
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase Authentication
 * @param {string} decodedToken.uid - UID único del usuario en Firebase
 * 
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con la lista de pacientes o error
 * 
 * @throws {Error} Error de base de datos si falla la consulta
 * 
 * @example
 * ```typescript
 * // Respuesta exitosa
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "firstName": "Juan",
 *       "lastName": "Pérez",
 *       "identificationType": "CC",
 *       "identificationNumber": "12345678",
 *       "appointments": [...]
 *     }
 *   ],
 *   "message": "5 pacientes encontrados"
 * }
 * ```
 * 
 * @security
 * - Requiere autenticación con Firebase Auth
 * - Roles permitidos: admin, medico, asistente
 * - Solo retorna pacientes de la misma organización del usuario
 * 
 * @apiEndpoint GET /api/patients
 * @apiSuccess {boolean} success - Indica si la operación fue exitosa
 * @apiSuccess {Array} data - Array de pacientes con sus citas asociadas
 * @apiSuccess {string} message - Mensaje descriptivo del resultado
 * 
 * @apiError (401) UNAUTHORIZED Token de autenticación inválido o ausente
 * @apiError (403) FORBIDDEN Usuario sin permisos o sin organización
 * @apiError (500) INTERNAL_ERROR Error interno del servidor
 */
const getPatientsHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Validar que el usuario tenga permisos para ver pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    // Obtener pacientes de la misma organización
    const organizationPatients = await db.query.patients.findMany({
      where: eq(patients.organizationId, requestingUser.organizationId),
      with: {
        appointments: {
          columns: { id: true, date: true, time: true, status: true },
          //where: eq(patients.isActive, true),
          //limit: 5,
          orderBy: (appointments, { desc }) => [desc(appointments.date)]
        }
      },
      orderBy: (patients, { desc }) => [desc(patients.createdAt)]
    });

    return createSuccessResponse(organizationPatients, `${organizationPatients.length} pacientes encontrados`);
  } catch (error) {
    return handleDatabaseError(error, "obtener pacientes");
  }
};

/**
 * @function createPatientHandler
 * @description Maneja las peticiones POST para crear un nuevo paciente en la organización.
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante de Next.js con datos del paciente
 * @param {DecodedIdToken} decodedToken - Token JWT decodificado de Firebase Authentication
 * @param {string} decodedToken.uid - UID único del usuario en Firebase
 * 
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con el paciente creado o error
 * 
 * @throws {Error} Error de base de datos si falla la inserción
 * 
 * @example
 * ```typescript
 * // Cuerpo de la petición
 * {
 *   "firstName": "María",
 *   "lastName": "García",
 *   "identificationType": "CC",
 *   "identificationNumber": "87654321",
 *   "gender": "F",
 *   "birthDate": "1990-05-15",
 *   "phone": "+57300123456",
 *   "email": "maria@email.com"
 * }
 * 
 * // Respuesta exitosa
 * {
 *   "success": true,
 *   "data": {
 *     "id": 123,
 *     "patientCode": "PAT-1642781234567-A1B2"
 *   },
 *   "message": "Paciente creado exitosamente"
 * }
 * ```
 * 
 * @security
 * - Requiere autenticación con Firebase Auth
 * - Roles permitidos: admin, asistente
 * - Valida unicidad de identificación dentro de la organización
 * 
 * @apiEndpoint POST /api/patients
 * @apiParam {string} firstName - Nombre del paciente (requerido)
 * @apiParam {string} lastName - Apellido del paciente (requerido)
 * @apiParam {string} identificationType - Tipo de identificación (requerido)
 * @apiParam {string} identificationNumber - Número de identificación (requerido)
 * @apiParam {string} gender - Género del paciente (requerido)
 * @apiParam {string} [birthDate] - Fecha de nacimiento (opcional)
 * @apiParam {string} [phone] - Teléfono (opcional)
 * @apiParam {string} [email] - Email (opcional)
 * @apiParam {string} [address] - Dirección (opcional)
 * @apiParam {string} [emergencyContactName] - Nombre contacto emergencia (opcional)
 * @apiParam {string} [emergencyContactPhone] - Teléfono contacto emergencia (opcional)
 * @apiParam {string} [emergencyContactRelation] - Relación contacto emergencia (opcional)
 * @apiParam {string} [medicalHistory] - Historia médica (opcional)
 * @apiParam {string} [allergies] - Alergias (opcional)
 * @apiParam {string} [currentMedications] - Medicamentos actuales (opcional)
 * @apiParam {string} [bloodType] - Tipo de sangre (opcional)
 * 
 * @apiSuccess {boolean} success - Indica si la operación fue exitosa
 * @apiSuccess {Object} data - Datos del paciente creado
 * @apiSuccess {number} data.id - ID del paciente creado
 * @apiSuccess {string} data.patientCode - Código único del paciente
 * @apiSuccess {string} message - Mensaje descriptivo del resultado
 * 
 * @apiError (400) BAD_REQUEST Campos requeridos faltantes o datos inválidos
 * @apiError (401) UNAUTHORIZED Token de autenticación inválido o ausente
 * @apiError (403) FORBIDDEN Usuario sin permisos o sin organización
 * @apiError (409) CONFLICT Paciente con misma identificación ya existe
 * @apiError (500) INTERNAL_ERROR Error interno del servidor
 */
const createPatientHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(API_ERRORS.USER_NOT_FOUND, undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins y asistentes pueden crear pacientes
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const body = await request.json();
    
    // Validar campos requeridos
    const requiredFields = ['firstName', 'lastName', 'identificationType', 'identificationNumber', 'gender'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse(`Campo requerido: ${field}`, undefined, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Generar código único de paciente
    const patientCode = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Verificar que no exista un paciente con la misma identificación en la organización
    const existingPatient = await db.query.patients.findFirst({
      where: and(
        eq(patients.organizationId, requestingUser.organizationId),
        eq(patients.identificationType, body.identificationType),
        eq(patients.identificationNumber, body.identificationNumber),
        eq(patients.isActive, true)
      )
    });

    if (existingPatient) {
      return createErrorResponse(
        "Ya existe un paciente con esta identificación en la organización", 
        undefined, 
        HTTP_STATUS.CONFLICT
      );
    }

    const newPatientData: NewPatient = {
      firstName: body.firstName,
      lastName: body.lastName,
      identificationType: body.identificationType,
      identificationNumber: body.identificationNumber,
      birthDate: body.birthDate || null,
      gender: body.gender,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      emergencyContactName: body.emergencyContactName || null,
      emergencyContactPhone: body.emergencyContactPhone || null,
      emergencyContactRelation: body.emergencyContactRelation || null,
      medicalHistory: body.medicalHistory || null,
      allergies: body.allergies || null,
      currentMedications: body.currentMedications || null,
      bloodType: body.bloodType || null,
      organizationId: requestingUser.organizationId
    };

    const [createdPatient] = await db.insert(patients).values(newPatientData);

    return createSuccessResponse(
      { id: createdPatient.insertId, patientCode },
      "Paciente creado exitosamente",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return handleDatabaseError(error, "crear paciente");
  }
};

/**
 * @function authenticateRequest
 * @description Autentica una petición HTTP verificando el token de Firebase Auth.
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante
 * @returns {Promise<DecodedIdToken | null>} Token decodificado si es válido, null si no
 * 
 * @example
 * ```typescript
 * const decodedToken = await authenticateRequest(request);
 * if (!decodedToken) {
 *   return createErrorResponse('Unauthorized', undefined, HTTP_STATUS.UNAUTHORIZED);
 * }
 * ```
 * 
 * @throws {Error} Error de verificación del token
 * 
 * @security
 * - Extrae el token del header Authorization
 * - Verifica el formato "Bearer <token>"
 * - Valida el token con Firebase Auth
 */
async function authenticateRequest(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await auth.verifyIdToken(token);
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * @function GET
 * @description Endpoint HTTP GET para obtener la lista de pacientes de la organización.
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante
 * @returns {Promise<NextResponse | Response>} Respuesta con lista de pacientes o error
 * 
 * @example
 * ```bash
 * curl -H "Authorization: Bearer <firebase-token>" \
 *      -H "Content-Type: application/json" \
 *      https://api.example.com/api/patients
 * ```
 * 
 * @route GET /api/patients
 * @middleware authenticateRequest - Valida autenticación con Firebase Auth
 * 
 * @see {@link getPatientsHandler} - Función principal que maneja la lógica de negocio
 * @see {@link authenticateRequest} - Función de autenticación
 */
export async function GET(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getPatientsHandler(request, decodedToken);
}

/**
 * @function POST
 * @description Endpoint HTTP POST para crear un nuevo paciente en la organización.
 * 
 * @async
 * @param {NextRequest} request - La petición HTTP entrante con datos del paciente
 * @returns {Promise<NextResponse | Response>} Respuesta con paciente creado o error
 * 
 * @example
 * ```bash
 * curl -X POST \
 *      -H "Authorization: Bearer <firebase-token>" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "firstName": "Juan",
 *        "lastName": "Pérez",
 *        "identificationType": "CC",
 *        "identificationNumber": "12345678",
 *        "gender": "M"
 *      }' \
 *      https://api.example.com/api/patients
 * ```
 * 
 * @route POST /api/patients
 * @middleware authenticateRequest - Valida autenticación con Firebase Auth
 * 
 * @see {@link createPatientHandler} - Función principal que maneja la lógica de negocio
 * @see {@link authenticateRequest} - Función de autenticación
 */
export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return createPatientHandler(request, decodedToken);
}