/**
 * @fileoverview API endpoints para la gestión de servicios médicos
 * 
 * Este módulo proporciona endpoints REST para la gestión completa de servicios médicos
 * dentro de una organización. Incluye operaciones CRUD con autenticación Firebase,
 * validación de roles y manejo robusto de errores.
 * 
 * @module MedicalServicesAPI
 * @version 1.0.0
 * @author Santiago Prada - Backend Developer
 * @since 2025-01-26
 * @requires next/server
 * @requires drizzle-orm
 * @requires firebase-admin/auth
 * 
 * @example
 * ```typescript
 * // GET - Obtener servicios médicos
 * const response = await fetch('/api/medical-services', {
 *   headers: {
 *     'Authorization': 'Bearer <firebase-token>'
 *   }
 * });
 * 
 * // POST - Crear nuevo servicio médico
 * const newService = await fetch('/api/medical-services', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer <firebase-token>',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     name: 'Consulta General',
 *     code: 'CG001',
 *     category: 'Consulta',
 *     durationMinutes: 30,
 *     basePrice: '50000'
 *   })
 * });
 * ```
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://orm.drizzle.team/docs/overview | Drizzle ORM Documentation}
 * @see {@link https://firebase.google.com/docs/auth/admin | Firebase Admin Auth}
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { medicalServices, users } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type { NewMedicalService } from "@/db/schema";
import { syncKnowledgeAfterCRUD } from "@/lib/knowledge-manager";

/**
 * Manejador para obtener servicios médicos de la organización del usuario autenticado.
 * 
 * Esta función implementa la lógica de negocio para recuperar servicios médicos
 * con capacidades de filtrado avanzado y relaciones anidadas. Incluye validación
 * de autenticación, autorización por roles y optimización de consultas.
 * 
 * @async
 * @function getMedicalServicesHandler
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {DecodedIdToken} decodedToken - Token decodificado de Firebase Auth
 * @param {string} decodedToken.uid - ID único del usuario en Firebase
 * @param {string} [decodedToken.email] - Email del usuario autenticado
 * 
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con los datos o error
 * @returns {Object} response.data - Datos de respuesta exitosa
 * @returns {Array<MedicalService>} response.data.services - Lista de servicios médicos
 * @returns {Array<string>} response.data.categories - Categorías disponibles
 * @returns {number} response.data.total - Total de servicios encontrados
 * 
 * @throws {Error} Error de base de datos durante la consulta
 * @throws {AuthenticationError} Token inválido o expirado
 * @throws {AuthorizationError} Usuario sin permisos suficientes
 * 
 * @example
 * ```typescript
 * // Obtener todos los servicios activos
 * const response = await getMedicalServicesHandler(request, decodedToken);
 * 
 * // Respuesta exitosa:
 * {
 *   success: true,
 *   data: {
 *     services: [
 *       {
 *         id: 1,
 *         name: 'Consulta General',
 *         code: 'CG001',
 *         category: 'Consulta',
 *         durationMinutes: 30,
 *         basePrice: '50000',
 *         doctorServices: [...]
 *       }
 *     ],
 *     categories: ['Consulta', 'Procedimiento'],
 *     total: 15
 *   },
 *   message: '15 servicios encontrados'
 * }
 * ```
 * 
 * @description
 * **Parámetros de consulta soportados:**
 * - `category` (string, opcional): Filtra por categoría específica
 * - `active` (boolean, opcional): Filtra por estado activo (default: true)
 * 
 * **Roles autorizados:** admin, medico, asistente
 * 
 * **Relaciones incluidas:**
 * - doctorServices.doctor.user (información del médico)
 * 
 * **Ordenamiento:** Por categoría y nombre (ascendente)
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Santiago Prada
 * 
 * @see {@link https://orm.drizzle.team/docs/rqb#find-many | Drizzle findMany}
 * @see {@link validateUserRole} Validación de roles
 * @see {@link handleDatabaseError} Manejo de errores de BD
 */
const getMedicalServicesHandler = async (
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

    // Todos los roles pueden ver servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    // Obtener parámetros de query
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const activeOnly = url.searchParams.get('active') !== 'false'; // Por defecto true

    // Construir condiciones de filtro
    let whereConditions = and(
      eq(medicalServices.organizationId, requestingUser.organizationId)
    );

    // Si se solicita solo servicios activos
    // Filtra los servicios médicos para que solo se muestren aquellos que están activos.
    if (activeOnly) {
      whereConditions = and(whereConditions, eq(medicalServices.isActive, true));
    }

    if (category) {
      whereConditions = and(whereConditions, eq(medicalServices.category, category));
    }

    const organizationServices = await db.query.medicalServices.findMany({
      where: whereConditions,
      with: {
        doctorServices: {
          with: {
            doctor: {
              columns: { idDoctor: true, speciality: true },
              with: {
                user: {
                  columns: { displayName: true }
                }
              }
            }
          },
        }
      },
      orderBy: (medicalServices, { asc }) => [asc(medicalServices.category), asc(medicalServices.name)]
    });

    // Obtener categorías disponibles para filtros
    const categories = await db.selectDistinct({ category: medicalServices.category })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      ));

    return createSuccessResponse({
      services: organizationServices,
      categories: categories.map(c => c.category),
      total: organizationServices.length
    }, `${organizationServices.length} servicios encontrados`);
  } catch (error) {
    return handleDatabaseError(error, "obtener servicios médicos");
  }
};

/**
 * Manejador para crear un nuevo servicio médico en la organización del usuario autenticado.
 * 
 * Esta función implementa la lógica de negocio para crear servicios médicos con
 * validación completa de datos, verificación de duplicados y normalización de campos.
 * Solo usuarios con rol de administrador pueden ejecutar esta operación.
 * 
 * @async
 * @function createMedicalServiceHandler
 * @param {NextRequest} request - Objeto de solicitud HTTP con el cuerpo JSON
 * @param {DecodedIdToken} decodedToken - Token decodificado de Firebase Auth
 * @param {string} decodedToken.uid - ID único del usuario en Firebase
 * @param {string} [decodedToken.email] - Email del usuario autenticado
 * 
 * @returns {Promise<NextResponse | Response>} Respuesta HTTP con el servicio creado o error
 * @returns {Object} response.data - Datos de respuesta exitosa
 * @returns {number} response.data.id - ID del servicio médico creado
 * @returns {string} response.data.code - Código normalizado del servicio
 * 
 * @throws {ValidationError} Campos requeridos faltantes o inválidos
 * @throws {ConflictError} Servicio con código duplicado en la organización
 * @throws {AuthenticationError} Token inválido o expirado
 * @throws {AuthorizationError} Usuario sin permisos de administrador
 * @throws {DatabaseError} Error durante la inserción en base de datos
 * 
 * @example
 * ```typescript
 * // Crear un nuevo servicio médico
 * const requestBody = {
 *   name: 'Consulta Especializada',
 *   code: 'CE001',
 *   category: 'Consulta',
 *   durationMinutes: 45,
 *   basePrice: '75000',
 *   description: 'Consulta con especialista',
 *   requiresPreparation: false
 * };
 * 
 * const response = await createMedicalServiceHandler(request, decodedToken);
 * 
 * // Respuesta exitosa:
 * {
 *   success: true,
 *   data: {
 *     id: 123,
 *     code: 'CE001'
 *   },
 *   message: 'Servicio médico creado exitosamente'
 * }
 * ```
 * 
 * @description
 * **Campos requeridos en el cuerpo de la solicitud:**
 * - `name` (string): Nombre del servicio médico
 * - `code` (string): Código único del servicio (se normaliza a mayúsculas)
 * - `category` (string): Categoría del servicio
 * - `durationMinutes` (number): Duración en minutos
 * - `basePrice` (string): Precio base como string decimal
 * 
 * **Campos opcionales:**
 * - `description` (string): Descripción detallada
 * - `requiresPreparation` (boolean): Si requiere preparación previa
 * - `preparationInstructions` (string): Instrucciones de preparación
 * 
 * **Validaciones aplicadas:**
 * - Verificación de campos requeridos
 * - Normalización de código a mayúsculas
 * - Verificación de duplicados por código en la organización
 * - Conversión de tipos (durationMinutes a int, basePrice a string)
 * 
 * **Roles autorizados:** admin únicamente
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Santiago Prada
 * 
 * @see {@link https://orm.drizzle.team/docs/insert | Drizzle Insert}
 * @see {@link NewMedicalService} Tipo de datos para nuevo servicio
 * @see {@link validateUserRole} Validación de roles
 */
const createMedicalServiceHandler = async (
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

    // Solo admins pueden crear servicios médicos
    const roleValidationError = validateUserRole(requestingUser.role, ["admin"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    const body = await request.json();
    
    // Validar campos requeridos
    const requiredFields = ['name', 'code', 'category', 'durationMinutes', 'basePrice'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return createErrorResponse(`Campo requerido: ${field}`, undefined, HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Verificar que no exista un servicio con el mismo código en la organización
    const existingService = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.code, body.code),
        eq(medicalServices.isActive, true)
      )
    });

    if (existingService) {
      return createErrorResponse(
        "Ya existe un servicio con este código en la organización", 
        undefined, 
        HTTP_STATUS.CONFLICT
      );
    }

    const newServiceData: NewMedicalService = {
      name: body.name,
      description: body.description || null,
      code: body.code.toUpperCase(), // Normalizar código a mayúsculas
      durationMinutes: parseInt(body.durationMinutes),
      basePrice: body.basePrice.toString(), // Convertir a string para decimal
      category: body.category,
      requiresPreparation: body.requiresPreparation || false,
      preparationInstructions: body.preparationInstructions || null,
      organizationId: requestingUser.organizationId,
    };

    const [createdService] = await db.insert(medicalServices).values(newServiceData);

    // Sincronizar conocimiento con pgVector
    try {
      await syncKnowledgeAfterCRUD(
        'service',
        'create',
        {
          id: createdService.insertId,
          ...newServiceData
        }
      );
      console.log('✅ [API] Conocimiento sincronizado con pgVector exitosamente');
    } catch (syncError) {
      console.error('❌ [API] Error sincronizando conocimiento con pgVector:', syncError);
      // No fallar la operación principal por errores de sincronización
    }

    return createSuccessResponse(
      { id: createdService.insertId, code: newServiceData.code },
      "Servicio médico creado exitosamente",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return handleDatabaseError(error, "crear servicio médico");
  }
};

/**
 * Función utilitaria para autenticar solicitudes HTTP usando Firebase Auth.
 * 
 * Extrae y verifica el token JWT de Firebase del header Authorization,
 * validando su autenticidad y vigencia contra el proyecto Firebase configurado.
 * 
 * @async
 * @function authenticateRequest
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * @param {Headers} request.headers - Headers HTTP de la solicitud
 * 
 * @returns {Promise<DecodedIdToken | null>} Token decodificado o null si es inválido
 * @returns {string} DecodedIdToken.uid - ID único del usuario en Firebase
 * @returns {string} DecodedIdToken.email - Email del usuario autenticado
 * @returns {number} DecodedIdToken.exp - Timestamp de expiración del token
 * @returns {number} DecodedIdToken.iat - Timestamp de emisión del token
 * 
 * @example
 * ```typescript
 * // Header requerido en la solicitud:
 * // Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * const decodedToken = await authenticateRequest(request);
 * if (decodedToken) {
 *   console.log('Usuario autenticado:', decodedToken.uid);
 * } else {
 *   console.log('Token inválido o faltante');
 * }
 * ```
 * 
 * @description
 * **Formato esperado del header:**
 * ```
 * Authorization: Bearer <firebase-jwt-token>
 * ```
 * 
 * **Casos de retorno null:**
 * - Header Authorization faltante
 * - Header no comienza con "Bearer "
 * - Token JWT inválido o expirado
 * - Token no pertenece al proyecto Firebase configurado
 * - Error de red al verificar con Firebase
 * 
 * @since 1.0.0
 * @version 1.0.0
 * @author Santiago Prada
 * 
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Verify ID Tokens}
 * @see {@link auth} Instancia de Firebase Admin Auth
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
 * Endpoint GET para obtener servicios médicos de la organización.
 * 
 * Implementa el patrón de autenticación middleware + handler para recuperar
 * servicios médicos con capacidades de filtrado. Soporta parámetros de consulta
 * para filtrar por categoría y estado activo.
 * 
 * @async
 * @function GET
 * @param {NextRequest} request - Objeto de solicitud HTTP de Next.js
 * 
 * @returns {Promise<NextResponse>} Respuesta HTTP con servicios médicos o error
 * 
 * @example
 * ```bash
 * # Obtener todos los servicios activos
 * curl -H "Authorization: Bearer <token>" \
 *      https://api.example.com/api/medical-services
 * 
 * # Filtrar por categoría
 * curl -H "Authorization: Bearer <token>" \
 *      "https://api.example.com/api/medical-services?category=Consulta"
 * 
 * # Incluir servicios inactivos
 * curl -H "Authorization: Bearer <token>" \
 *      "https://api.example.com/api/medical-services?active=false"
 * ```
 * 
 * @description
 * **Método HTTP:** GET
 * **Ruta:** `/api/medical-services`
 * **Autenticación:** Requerida (Firebase JWT)
 * **Roles autorizados:** admin, medico, asistente
 * 
 * **Parámetros de consulta:**
 * - `category` (string, opcional): Filtra por categoría específica
 * - `active` (boolean, opcional): Incluye solo servicios activos (default: true)
 * 
 * **Códigos de estado HTTP:**
 * - 200: Servicios obtenidos exitosamente
 * - 401: Token de autenticación inválido o faltante
 * - 403: Usuario sin permisos o no encontrado
 * - 500: Error interno del servidor
 * 
 * @since 1.0.0
 * @route GET /api/medical-services
 * @middleware authenticateRequest
 * @handler getMedicalServicesHandler
 */
export async function GET(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getMedicalServicesHandler(request, decodedToken);
}

/**
 * Endpoint POST para crear un nuevo servicio médico.
 * 
 * Implementa el patrón de autenticación middleware + handler para crear
 * servicios médicos con validación completa de datos y verificación de duplicados.
 * Solo usuarios administradores pueden crear servicios médicos.
 * 
 * @async
 * @function POST
 * @param {NextRequest} request - Objeto de solicitud HTTP con cuerpo JSON
 * 
 * @returns {Promise<NextResponse>} Respuesta HTTP con servicio creado o error
 * 
 * @example
 * ```bash
 * # Crear un nuevo servicio médico
 * curl -X POST \
 *      -H "Authorization: Bearer <token>" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "name": "Consulta Especializada",
 *        "code": "CE001",
 *        "category": "Consulta",
 *        "durationMinutes": 45,
 *        "basePrice": "75000",
 *        "description": "Consulta con especialista",
 *        "requiresPreparation": false
 *      }' \
 *      https://api.example.com/api/medical-services
 * ```
 * 
 * @description
 * **Método HTTP:** POST
 * **Ruta:** `/api/medical-services`
 * **Autenticación:** Requerida (Firebase JWT)
 * **Roles autorizados:** admin únicamente
 * **Content-Type:** application/json
 * 
 * **Campos requeridos en el cuerpo:**
 * - `name` (string): Nombre del servicio médico
 * - `code` (string): Código único del servicio
 * - `category` (string): Categoría del servicio
 * - `durationMinutes` (number): Duración en minutos
 * - `basePrice` (string): Precio base como decimal
 * 
 * **Campos opcionales:**
 * - `description` (string): Descripción detallada
 * - `requiresPreparation` (boolean): Si requiere preparación
 * - `preparationInstructions` (string): Instrucciones de preparación
 * 
 * **Códigos de estado HTTP:**
 * - 201: Servicio médico creado exitosamente
 * - 400: Datos de entrada inválidos o campos faltantes
 * - 401: Token de autenticación inválido o faltante
 * - 403: Usuario sin permisos de administrador
 * - 409: Servicio con código duplicado en la organización
 * - 500: Error interno del servidor
 * 
 * @since 1.0.0
 * @route POST /api/medical-services
 * @middleware authenticateRequest
 * @handler createMedicalServiceHandler
 */
export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return createMedicalServiceHandler(request, decodedToken);
}