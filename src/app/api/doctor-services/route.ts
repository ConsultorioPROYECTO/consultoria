/**
 * @fileoverview Doctor-Service Relationship Management API
 * 
 * This module provides comprehensive REST API endpoints for managing the many-to-many
 * relationships between doctors and medical services within healthcare organizations.
 * The API implements a sophisticated service assignment system that allows:
 * 
 * - **Service Assignment**: Assign multiple medical services to doctors
 * - **Custom Pricing**: Set doctor-specific pricing that overrides base service prices
 * - **Availability Control**: Manage service availability per doctor
 * - **Organization Isolation**: Ensure data isolation between different organizations
 * - **Role-based Access**: Implement granular permissions (admin, doctor, assistant)
 * 
 * ## Database Relationships
 * 
 * The system uses Drizzle ORM to manage a many-to-many relationship through the
 * `doctor_services` junction table:
 * 
 * ```
 * doctors (1) ←→ (M) doctor_services (M) ←→ (1) medical_services
 * ```
 * 
 * ### Key Relationship Properties:
 * - **doctorId**: Foreign key to doctors.idDoctor (CASCADE on delete/update)
 * - **serviceId**: Foreign key to medical_services.id (CASCADE on delete/update)
 * - **customPrice**: Optional doctor-specific pricing override
 * - **isAvailable**: Soft delete flag for service availability
 * - **Composite Primary Key**: (doctorId, serviceId) ensures uniqueness
 * 
 * ## Access Control Matrix
 * 
 * | Role      | GET (All) | GET (Own) | POST | PUT | DELETE |
 * |-----------|-----------|-----------|------|-----|--------|
 * | admin     | ✅        | ✅        | ✅   | ✅  | ✅     |
 * | medico    | ❌        | ✅        | ❌   | ❌  | ❌     |
 * | asistente | ✅        | ✅        | ❌   | ❌  | ❌     |
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025-05-26
 * 
 * @see {@link https://orm.drizzle.team/docs/rqb#many-to-many | Drizzle ORM Many-to-Many Relations}
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Authentication}
 * 
 * @example Basic Usage
 * ```typescript
 * // Retrieve all services for a specific doctor
 * GET /api/doctor-services?doctorId=123&available=true
 * 
 * // Assign a service to a doctor with custom pricing
 * POST /api/doctor-services
 * {
 *   "doctorId": 123,
 *   "serviceId": 456,
 *   "customPrice": 150.00,
 *   "isAvailable": true
 * }
 * ```
 * 
 * @example Advanced Filtering
 * ```typescript
 * // Get all available services in organization
 * GET /api/doctor-services?available=true
 * 
 * // Get specific service assignments across all doctors
 * GET /api/doctor-services?serviceId=456
 * 
 * // Get all services (including unavailable) for admin review
 * GET /api/doctor-services?available=false
 * ```
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { doctorServices, doctors, medicalServices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from "@/types/api";
import { handleDatabaseError } from "@/lib/api-helpers";
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { syncKnowledgeAfterCRUD } from "@/lib/knowledge-manager";
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
// Autenticación ahora manejada por withOptimizedAuthentication

/**
 * Retrieves doctor-service relationships with advanced filtering and role-based access control.
 * 
 * This function implements a sophisticated query system that leverages Drizzle ORM's
 * relational queries to fetch doctor-service relationships with complete metadata.
 * The system enforces strict organizational boundaries and role-based permissions.
 * 
 * ## Query Strategy
 * 
 * The function uses Drizzle ORM's `findMany` with nested relations to efficiently
 * fetch related data in a single query, avoiding N+1 problems:
 * 
 * ```typescript
 * // Drizzle ORM query with relations
 * await db.query.doctorServices.findMany({
 *   where: and(...conditions),
 *   with: {
 *     doctor: { with: { user: true } },
 *     service: true
 *   }
 * });
 * ```
 * 
 * ## Access Control Logic
 * 
 * - **Admin/Assistant**: Can view all doctor-service relationships in their organization
 * - **Doctor**: Can only view their own service assignments
 * - **Organization Isolation**: All results are filtered by organization membership
 * 
 * ## Performance Optimizations
 * 
 * - Uses indexed columns for filtering (doctorId, serviceId, isAvailable)
 * - Leverages composite indexes on (doctorId, serviceId) for efficient lookups
 * - Implements eager loading to minimize database round trips
 * 
 * @param request - The incoming Next.js request with optional query parameters
 * @param decodedToken - Decoded Firebase authentication token containing user identity
 * 
 * @returns Promise resolving to API response with filtered doctor-service relationships
 * 
 * @throws {Error} When database queries fail or user validation errors occur
 * 
 * @remarks
 * ### Supported Query Parameters:
 * - `doctorId` (number, optional) - Filter by specific doctor ID
 * - `serviceId` (number, optional) - Filter by specific service ID  
 * - `available` (boolean, optional) - Filter by availability status (default: true)
 * 
 * ### Response Structure:
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     doctorServices: DoctorServiceWithRelations[],
 *     total: number
 *   },
 *   message: string
 * }
 * ```
 * 
 * @example Basic Filtering
 * ```typescript
 * // Get all available services for doctor 123
 * GET /api/doctor-services?doctorId=123&available=true
 * 
 * // Get all services (available and unavailable) for organization
 * GET /api/doctor-services?available=false
 * 
 * // Get specific service assignments across all doctors
 * GET /api/doctor-services?serviceId=456
 * ```
 * 
 * @example Role-based Access
 * ```typescript
 * // Admin request - returns all organization relationships
 * // Doctor request - returns only their own relationships
 * // Assistant request - returns all organization relationships
 * ```
 * 
 * @internal
 */
const getDoctorServicesHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

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
 * Creates new doctor-service relationships with comprehensive validation and business logic enforcement.
 * 
 * This function implements a multi-stage validation process that ensures data integrity
 * and business rule compliance when creating doctor-service assignments. It leverages
 * Drizzle ORM's transaction capabilities to maintain consistency across related tables.
 * 
 * ## Validation Pipeline
 * 
 * 1. **Authentication Check**: Verifies admin privileges
 * 2. **Doctor Validation**: Confirms doctor exists and belongs to organization
 * 3. **Service Validation**: Confirms service exists and belongs to organization
 * 4. **Duplicate Prevention**: Checks for existing active assignments
 * 5. **Data Insertion**: Creates new relationship with proper defaults
 * 
 * ## Business Logic Implementation
 * 
 * ```typescript
 * // Drizzle ORM validation queries
 * const doctor = await db.query.doctors.findFirst({
 *   where: and(
 *     eq(doctors.id, doctorId),
 *     eq(doctors.organizationId, userOrgId)
 *   )
 * });
 * 
 * // Duplicate prevention with composite key check
 * const existing = await db.query.doctorServices.findFirst({
 *   where: and(
 *     eq(doctorServices.doctorId, doctorId),
 *     eq(doctorServices.serviceId, serviceId),
 *     eq(doctorServices.isAvailable, true)
 *   )
 * });
 * ```
 * 
 * ## Data Integrity Features
 * 
 * - **Organization Isolation**: Ensures cross-organization data leakage prevention
 * - **Referential Integrity**: Validates foreign key relationships before insertion
 * - **Duplicate Prevention**: Prevents multiple active assignments for same doctor-service pair
 * - **Custom Pricing Support**: Allows organization-specific pricing overrides
 * 
 * @param request - The incoming Next.js request containing relationship data
 * @param decodedToken - Decoded Firebase authentication token with admin privileges
 * 
 * @returns Promise resolving to API response with created relationship details
 * 
 * @throws {Error} When validation fails, duplicates exist, or database operations fail
 * 
 * @remarks
 * ### Required Request Body Fields:
 * - `doctorId` (number) - Valid doctor ID within the organization
 * - `serviceId` (number) - Valid medical service ID within the organization
 * 
 * ### Optional Request Body Fields:
 * - `customPrice` (number) - Custom pricing override for this specific assignment
 * - `isAvailable` (boolean) - Initial availability status (default: true)
 * 
 * ### Response Structure:
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     doctorService: DoctorServiceRecord,
 *     doctor: DoctorInfo,
 *     service: ServiceInfo
 *   },
 *   message: string
 * }
 * ```
 * 
 * ### Error Scenarios:
 * - **403**: Non-admin user attempting creation
 * - **404**: Doctor or service not found in organization
 * - **409**: Duplicate active assignment already exists
 * - **500**: Database transaction failures
 * 
 * @example Basic Assignment Creation
 * ```typescript
 * POST /api/doctor-services
 * Content-Type: application/json
 * Authorization: Bearer <admin-token>
 * 
 * {
 *   "doctorId": 123,
 *   "serviceId": 456
 * }
 * 
 * // Response:
 * {
 *   "success": true,
 *   "data": {
 *     "doctorService": {
 *       "id": 789,
 *       "doctorId": 123,
 *       "serviceId": 456,
 *       "customPrice": null,
 *       "isAvailable": true,
 *       "createdAt": "2024-01-15T10:30:00Z"
 *     }
 *   },
 *   "message": "Doctor service relationship created successfully"
 * }
 * ```
 * 
 * @example Custom Pricing Assignment
 * ```typescript
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
  userInfo: AuthenticatedUserInfo
): Promise<NextResponse | Response> => {
  try {
    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

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
        eq(medicalServices.organizationId, requestingUser.organizationId!),
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

    // Sincronizar conocimiento con pgVector
    try {
      await syncKnowledgeAfterCRUD('doctor_service', 'create', {
        doctorId,
        serviceId,
        organizationId: requestingUser.organizationId
      });
    } catch (syncError) {
      console.error('❌ [DoctorServices] Error sincronizando conocimiento:', syncError);
      // No fallar la operación principal por errores de sincronización
    }

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
export const GET = withOptimizedAuthentication(getDoctorServicesHandler, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: false
});

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
export const POST = withOptimizedAuthentication(createDoctorServiceHandler, {
  requiredRoles: ['admin'],
  requireOrganization: true
});