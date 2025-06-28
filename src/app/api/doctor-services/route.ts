/**
 * @fileoverview API endpoints for managing doctor-service relationships
 * 
 * This module provides REST API endpoints to handle the relationships between doctors
 * and medical services within an organization. It supports operations for retrieving,
 * creating, and managing service assignments to doctors with proper authentication
 * and authorization controls.
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025-05-26
 * 
 * @example
 * ```typescript
 * // GET /api/doctor-services?doctorId=123&available=true
 * // POST /api/doctor-services { doctorId: 123, serviceId: 456 }
 * ```
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctorServices, users, doctors, medicalServices } from "@/db/schema";
import { auth } from "@/app/lib/firebase/server/adminConfig";
import type { DecodedIdToken } from "firebase-admin/auth";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from "@/types/api";
import { validateUserRole, handleDatabaseError } from "@/lib/api-helpers";
import type {  NewDoctorService } from "@/db/schema";

/**
 * Authenticates incoming requests by verifying Firebase ID tokens.
 * 
 * Extracts the Bearer token from the Authorization header and validates it
 * using Firebase Admin SDK. Returns the decoded token if valid, null otherwise.
 * 
 * @param request - The incoming Next.js request object
 * @returns Promise resolving to decoded token on success, null on failure
 * 
 * @throws {Error} When token verification fails due to network or Firebase errors
 * 
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase ID Token Verification}
 * 
 * @internal
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
 * Retrieves doctor-service relationships for the authenticated user's organization.
 * 
 * Supports filtering by doctor ID, service ID, and availability status. Access control
 * is enforced based on user roles: doctors can only view their own services, while
 * admins and assistants can view all organization services.
 * 
 * @param request - The incoming Next.js request with optional query parameters
 * @param decodedToken - Decoded Firebase authentication token
 * 
 * @returns Promise resolving to API response with doctor-service relationships
 * 
 * @throws {Error} When database queries fail or user validation errors occur
 * 
 * @remarks
 * Query parameters:
 * - `doctorId` (optional) - Filter by specific doctor ID
 * - `serviceId` (optional) - Filter by specific service ID  
 * - `available` (optional) - Filter by availability status (default: true)
 * 
 * @example
 * ```typescript
 * // Get all available services for doctor 123
 * GET /api/doctor-services?doctorId=123&available=true
 * 
 * // Get all services (available and unavailable) for organization
 * GET /api/doctor-services?available=false
 * ```
 * 
 * @internal
 */
const getDoctorServicesHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse('User not found', undefined, HTTP_STATUS.FORBIDDEN);
    }

    const roleValidationError = validateUserRole(requestingUser.role, ["admin", "medico", "asistente"]);
    if (roleValidationError) {
      return roleValidationError;
    }

    // Obtener parámetros de query
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId');
    const serviceId = url.searchParams.get('serviceId');
    const availableOnly = url.searchParams.get('available') !== 'false'; // Por defecto true

    // Para médicos, solo pueden ver sus propios servicios
    let targetDoctorId: number | null = null;
    if (requestingUser.role === 'medico') {
      const doctorRecord = await db.query.doctors.findFirst({
        where: eq(doctors.userId, requestingUser.id),
        columns: { idDoctor: true }
      });
      
      if (!doctorRecord) {
        return createErrorResponse("Registro de doctor no encontrado", undefined, HTTP_STATUS.FORBIDDEN);
      }
      targetDoctorId = doctorRecord.idDoctor;
    } else if (doctorId) {
      targetDoctorId = parseInt(doctorId);
    }

    // Construir query para obtener doctor-services de la organización
    const organizationDoctorServices = await db.query.doctorServices.findMany({
      where: and(
        targetDoctorId ? eq(doctorServices.doctorId, targetDoctorId) : undefined,
        serviceId ? eq(doctorServices.serviceId, parseInt(serviceId)) : undefined,
        availableOnly ? eq(doctorServices.isAvailable, true) : undefined
      ),
      with: {
        doctor: {
          columns: { idDoctor: true, speciality: true, userId: true },
          with: {
            user: {
              columns: { displayName: true, organizationId: true }
            }
          }
        },
        service: {
          columns: { id: true, name: true, code: true, category: true, basePrice: true, durationMinutes: true }
        }
      }
    });

    // Filtrar resultados que pertenezcan a la organización (doble verificación)
    const filteredResults = organizationDoctorServices.filter(
      ds => ds.doctor?.user?.organizationId === requestingUser.organizationId
    );

    return createSuccessResponse({
      doctorServices: filteredResults,
      total: filteredResults.length
    }, `${filteredResults.length} relaciones doctor-servicio encontradas`);
  } catch (error) {
    return handleDatabaseError(error, "obtener relaciones doctor-servicio");
  }
};

/**
 * Creates a new doctor-service relationship within the authenticated user's organization.
 * 
 * Validates that both the doctor and service exist within the organization, checks for
 * existing relationships to prevent duplicates, and creates the assignment with optional
 * custom pricing. Only admin users can create these relationships.
 * 
 * @param request - The incoming Next.js request containing assignment data
 * @param decodedToken - Decoded Firebase authentication token
 * 
 * @returns Promise resolving to API response with created relationship details
 * 
 * @throws {Error} When database operations fail or validation errors occur
 * 
 * @remarks
 * Required request body fields:
 * - `doctorId` (number) - ID of the doctor to assign service to
 * - `serviceId` (number) - ID of the medical service to assign
 * 
 * Optional request body fields:
 * - `customPrice` (number) - Custom price override for this doctor-service combination
 * - `isAvailable` (boolean) - Availability status (default: true)
 * 
 * @example
 * ```typescript
 * // Assign service 456 to doctor 123 with custom pricing
 * POST /api/doctor-services
 * {
 *   "doctorId": 123,
 *   "serviceId": 456,
 *   "customPrice": 150.00,
 *   "isAvailable": true
 * }
 * ```
 * 
 * @internal
 */
const createDoctorServiceHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse('User not found', undefined, HTTP_STATUS.FORBIDDEN);
    }

    // Solo admins pueden asignar servicios a doctores
    const roleValidationError = validateUserRole(requestingUser.role, "admin");
    if (roleValidationError) {
      return roleValidationError;
    }

    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.doctorId || !body.serviceId) {
      return createErrorResponse("doctorId y serviceId son requeridos", undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const doctorId = parseInt(body.doctorId);
    const serviceId = parseInt(body.serviceId);

    // Verificar que el doctor existe y pertenece a la organización
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
      with: {
        user: {
          columns: { organizationId: true }
        }
      }
    });

    if (!doctor || doctor.user?.organizationId !== requestingUser.organizationId) {
      return createErrorResponse("Doctor no encontrado o no pertenece a la organización", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Verificar que el servicio existe y pertenece a la organización
    const service = await db.query.medicalServices.findFirst({
      where: and(
        eq(medicalServices.id, serviceId),
        eq(medicalServices.organizationId, requestingUser.organizationId),
        eq(medicalServices.isActive, true)
      )
    });

    if (!service) {
      return createErrorResponse("Servicio médico no encontrado", undefined, HTTP_STATUS.NOT_FOUND);
    }

    // Verificar que no exista ya esta relación
    const existingRelation = await db.query.doctorServices.findFirst({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId)
      )
    });

    if (existingRelation) {
      return createErrorResponse(
        "El doctor ya tiene asignado este servicio", 
        undefined, 
        HTTP_STATUS.CONFLICT
      );
    }

    const newDoctorServiceData: NewDoctorService = {
      doctorId,
      serviceId,
      customPrice: body.customPrice ? body.customPrice.toString() : null,
      isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
    };

    await db.insert(doctorServices).values(newDoctorServiceData);

    return createSuccessResponse(
      { doctorId, serviceId },
      "Servicio asignado al doctor exitosamente",
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    return handleDatabaseError(error, "asignar servicio a doctor");
  }
};

/**
 * Handles GET requests to retrieve doctor-service relationships.
 * 
 * Authenticates the request and delegates to the appropriate handler function.
 * Supports filtering by doctor ID, service ID, and availability status through
 * query parameters.
 * 
 * @param request - The incoming Next.js GET request
 * @returns Promise resolving to HTTP response with doctor-service data or error
 * 
 * @throws {Error} When authentication fails or handler execution encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link getDoctorServicesHandler} for detailed parameter documentation
 * 
 * @public
 */
export async function GET(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return getDoctorServicesHandler(request, decodedToken);
}

/**
 * Handles POST requests to create new doctor-service relationships.
 * 
 * Authenticates the request and delegates to the creation handler function.
 * Requires admin privileges and validates all input data before creating
 * the relationship in the database.
 * 
 * @param request - The incoming Next.js POST request with relationship data
 * @returns Promise resolving to HTTP response with created relationship or error
 * 
 * @throws {Error} When authentication fails or creation process encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link createDoctorServiceHandler} for detailed request body documentation
 * 
 * @public
 */
export async function POST(request: NextRequest) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  return createDoctorServiceHandler(request, decodedToken);
}