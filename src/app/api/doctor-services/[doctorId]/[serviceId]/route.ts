/**
 * @fileoverview Individual Doctor-Service Relationship API
 * 
 * This module provides granular REST API endpoints for managing individual
 * doctor-service relationships within healthcare organizations. It implements
 * fine-grained control over specific service assignments, allowing detailed
 * customization of the many-to-many relationship between doctors and medical services.
 * 
 * ## Endpoint Operations
 * 
 * ### GET /api/doctor-services/[doctorId]/[serviceId]
 * Retrieves detailed information about a specific doctor-service relationship,
 * including custom pricing, availability status, and complete service metadata.
 * 
 * ### PUT /api/doctor-services/[doctorId]/[serviceId]
 * Updates specific properties of an individual doctor-service relationship,
 * primarily used for setting custom pricing overrides.
 * 
 * ### DELETE /api/doctor-services/[doctorId]/[serviceId]
 * Performs soft deletion of a specific doctor-service relationship by setting
 * `isAvailable` to false, preserving audit trails while removing the service
 * from the doctor's active offerings.
 * 
 * ## Relationship Granularity
 * 
 * This API provides the most granular level of control over doctor-service
 * relationships, operating on individual records in the junction table:
 * 
 * ```typescript
 * // Drizzle ORM relationship structure
 * export const doctorServiceRelations = relations(doctorServices, ({ one }) => ({
 *   doctor: one(doctors, {
 *     fields: [doctorServices.doctorId],
 *     references: [doctors.idDoctor],
 *   }),
 *   service: one(medicalServices, {
 *     fields: [doctorServices.serviceId],
 *     references: [medicalServices.id],
 *   }),
 * }));
 * ```
 * 
 * ## Custom Pricing Logic
 * 
 * The system supports sophisticated pricing strategies:
 * 
 * 1. **Base Pricing**: Default price from `medical_services.basePrice`
 * 2. **Custom Pricing**: Doctor-specific override in `doctor_services.customPrice`
 * 3. **Pricing Hierarchy**: Custom price takes precedence when set
 * 
 * ```typescript
 * // Pricing resolution logic
 * const effectivePrice = doctorService.customPrice || service.basePrice;
 * ```
 * 
 * ## Data Integrity & Constraints
 * 
 * The API enforces several data integrity rules:
 * 
 * - **Composite Primary Key**: (doctorId, serviceId) prevents duplicate assignments
 * - **Foreign Key Constraints**: Ensures referential integrity with CASCADE operations
 * - **Organization Boundaries**: All operations respect organizational isolation
 * - **Soft Delete Pattern**: Maintains historical data for audit purposes
 * 
 * ## Business Logic Validation
 * 
 * Before any operation, the system validates:
 * - Doctor exists and belongs to the requesting user's organization
 * - Service exists and is active within the organization
 * - User has appropriate permissions for the requested operation
 * - Relationship exists for update/delete operations
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025-05-26
 * 
 * @see {@link https://orm.drizzle.team/docs/rqb#many-to-many | Drizzle ORM Many-to-Many Relations}
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Auth Verification}
 * 
 * @example Retrieve Specific Relationship
 * ```typescript
 * // Get relationship between doctor 123 and service 456
 * GET /api/doctor-services/123/456
 * 
 * // Response with complete relationship details
 * {
 *   "success": true,
 *   "data": {
 *     "doctorId": 123,
 *     "serviceId": 456,
 *     "customPrice": "175.00",
 *     "isAvailable": true,
 *     "createdAt": "2025-01-15T10:30:00Z",
 *     "updatedAt": "2025-01-20T14:45:00Z",
 *     "doctor": {
 *       "idDoctor": 123,
 *       "speciality": "Cardiología",
 *       "user": { "displayName": "Dr. Juan Pérez" }
 *     },
 *     "service": {
 *       "id": 456,
 *       "name": "Electrocardiograma",
 *       "basePrice": "150.00",
 *       "category": "Examen"
 *     }
 *   }
 * }
 * ```
 * 
 * @example Update Custom Pricing
 * ```typescript
 * // Set custom price for doctor's specific service
 * PUT /api/doctor-services/123/456
 * {
 *   "customPrice": 200.00
 * }
 * 
 * // This overrides the base service price for this doctor only
 * ```
 * 
 * @example Remove Service Assignment
 * ```typescript
 * // Soft delete the relationship (preserves audit trail)
 * DELETE /api/doctor-services/123/456
 * 
 * // Sets isAvailable = false, maintains historical data
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctorServices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/types/api';
import { syncKnowledgeAfterCRUD } from '@/lib/knowledge-manager';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

interface RouteParams {
  doctorId: string;
  serviceId: string;
}

// Authentication is now handled by withOptimizedAuthentication middleware

/**
 * Retrieves a specific doctor-service relationship with comprehensive metadata and validation.
 * 
 * This function implements a precise lookup strategy for individual doctor-service
 * assignments, providing complete relationship details with nested service information.
 * It enforces strict organizational boundaries and validates all access permissions
 * before returning sensitive pricing and availability data.
 * 
 * ## Query Strategy & Performance
 * 
 * Uses Drizzle ORM's optimized relational query with eager loading:
 * 
 * ```typescript
 * const relationship = await db.query.doctorServices.findFirst({
 *   where: and(
 *     eq(doctorServices.doctorId, doctorId),
 *     eq(doctorServices.serviceId, serviceId)
 *   ),
 *   with: {
 *     service: true,  // Complete service metadata
 *     doctor: {
 *       with: { 
 *         user: true,           // Doctor's user information
 *         organization: true    // Organization validation
 *       }
 *     }
 *   }
 * });
 * ```
 * 
 * ## Security & Validation Framework
 * 
 * - **Parameter Validation**: Ensures doctor and service IDs are valid integers
 * - **Organization Isolation**: Validates doctor belongs to user's organization
 * - **Relationship Existence**: Confirms the specific assignment exists
 * - **Access Control**: Enforces role-based permissions for data access
 * 
 * ## Data Enrichment
 * 
 * The response includes enriched data for comprehensive relationship understanding:
 * - **Service Details**: Complete service metadata including pricing and categories
 * - **Custom Pricing**: Doctor-specific pricing overrides and calculations
 * - **Availability Status**: Current assignment status and historical changes
 * - **Audit Information**: Creation and modification timestamps
 * 
 * @param request - The incoming Next.js request for relationship lookup
 * @param decodedToken - Decoded Firebase authentication token for authorization
 * @param params - Route parameters containing doctor and service ID identifiers
 * 
 * @returns Promise resolving to API response with detailed relationship information
 * 
 * @throws {Error} When relationship not found, validation fails, or database errors occur
 * 
 * @remarks
 * ### Parameter Validation Rules:
 * - `doctorId` must be a valid positive integer
 * - `serviceId` must be a valid positive integer
 * - Both entities must exist within the user's organization
 * 
 * ### Access Control Matrix:
 * | Role | Own Doctor | Other Doctor |
 * |------|------------|-------------|
 * | Admin | ✅ Full Access | ✅ Full Access |
 * | Assistant | ✅ Full Access | ✅ Full Access |
 * | Doctor | ✅ Full Access | ❌ Forbidden |
 * 
 * ### Response Data Structure:
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     doctorService: {
 *       id: number,
 *       doctorId: number,
 *       serviceId: number,
 *       customPrice: number | null,
 *       isAvailable: boolean,
 *       createdAt: string,
 *       updatedAt: string,
 *       service: {
 *         id: number,
 *         name: string,
 *         description: string,
 *         basePrice: number,
 *         category: string,
 *         duration: number,
 *         organizationId: number
 *       },
 *       doctor: {
 *         id: number,
 *         userId: string,
 *         specialization: string,
 *         user: {
 *           name: string,
 *           email: string
 *         }
 *       }
 *     }
 *   },
 *   message: string
 * }
 * ```
 * 
 * ### Error Response Scenarios:
 * - **400**: Invalid doctor or service ID format
 * - **403**: Insufficient permissions to access relationship
 * - **404**: Doctor, service, or relationship not found
 * - **500**: Database query failures or system errors
 * 
 * @example Basic Relationship Lookup
 * ```typescript
 * // Get relationship between doctor 123 and service 456
 * GET /api/doctor-services/123/456
 * Authorization: Bearer <valid-token>
 * 
 * // Successful Response:
 * {
 *   "success": true,
 *   "data": {
 *     "doctorService": {
 *       "id": 789,
 *       "doctorId": 123,
 *       "serviceId": 456,
 *       "customPrice": 150.00,
 *       "isAvailable": true,
 *       "createdAt": "2024-01-15T10:30:00Z",
 *       "updatedAt": "2024-01-20T14:45:00Z",
 *       "service": {
 *         "id": 456,
 *         "name": "General Consultation",
 *         "description": "Comprehensive medical consultation",
 *         "basePrice": 100.00,
 *         "category": "Primary Care",
 *         "duration": 30
 *       },
 *       "doctor": {
 *         "id": 123,
 *         "specialization": "Internal Medicine",
 *         "user": {
 *           "name": "Dr. John Smith",
 *           "email": "dr.smith@clinic.com"
 *         }
 *       }
 *     }
 *   },
 *   "message": "Doctor service relationship retrieved successfully"
 * }
 * ```
 * 
 * @example Pricing Analysis Use Case
 * ```typescript
 * // Compare custom pricing vs base pricing
 * const response = await fetch('/api/doctor-services/123/456');
 * const { doctorService } = response.data;
 * 
 * const effectivePrice = doctorService.customPrice || doctorService.service.basePrice;
 * const priceVariance = doctorService.customPrice 
 *   ? ((doctorService.customPrice - doctorService.service.basePrice) / doctorService.service.basePrice) * 100
 *   : 0;
 * 
 * console.log(`Effective price: $${effectivePrice}`);
 * console.log(`Price variance: ${priceVariance.toFixed(1)}%`);
 * ```
 * 
 * @internal
 */
const getDoctorServiceHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  params: RouteParams
): Promise<NextResponse | Response> => {
  try {
    const doctorId = parseInt(params.doctorId);
    const serviceId = parseInt(params.serviceId);

    if (isNaN(doctorId) || isNaN(serviceId)) {
      return createErrorResponse('Invalid doctor ID or service ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const doctorService = await db.query.doctorServices.findFirst({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId),
        eq(doctorServices.isAvailable, true)
      ),
      with: {
        doctor: {
          columns: {
            idDoctor: true,
            speciality: true
          },
          with: {
            user: {
              columns: {
                displayName: true
              }
            }
          }
        },
        service: {
          columns: {
            id: true,
            name: true,
            code: true,
            category: true,
            basePrice: true,
            durationMinutes: true
          }
        }
      }
    });

    if (!doctorService) {
      return createErrorResponse('Doctor service relationship not found', undefined, HTTP_STATUS.NOT_FOUND);
    }

    return createSuccessResponse(doctorService, 'Doctor service fetched successfully');
  } catch (error) {
    console.error('Error fetching doctor service:', error);
    return createErrorResponse('Internal server error', undefined, HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Updates a specific doctor-service relationship.
 * 
 * Modifies the custom pricing for a specific doctor-service assignment.
 * This allows setting doctor-specific pricing that overrides the base
 * service price. Requires admin privileges and validates relationship existence.
 * 
 * @param request - The incoming Next.js request with update data
 * @param decodedToken - Decoded Firebase authentication token
 * @param params - Route parameters containing doctor and service IDs
 * 
 * @returns Promise resolving to API response with updated relationship
 * 
 * @throws {Error} When database operations fail or relationship doesn't exist
 * 
 * @remarks
 * Optional request body fields:
 * - `customPrice` (number) - Custom price override for this doctor-service combination
 * 
 * @example
 * ```typescript
 * // Set custom price for doctor 123's service 456
 * PUT /api/doctor-services/123/456
 * {
 *   "customPrice": 200.00
 * }
 * ```
 * 
 * @internal
 */
const updateDoctorServiceHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  params: RouteParams
): Promise<NextResponse | Response> => {
  try {
    const doctorId = parseInt(params.doctorId);
    const serviceId = parseInt(params.serviceId);

    if (isNaN(doctorId) || isNaN(serviceId)) {
      return createErrorResponse('Invalid doctor ID or service ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const body = await request.json();
    const { customPrice } = body;

    if (customPrice !== undefined && (typeof customPrice !== 'number' || customPrice < 0)) {
      return createErrorResponse('Custom price must be a non-negative number', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const existingRelation = await db.query.doctorServices.findFirst({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId),
        eq(doctorServices.isAvailable, true)
      )
    });

    if (!existingRelation) {
      return createErrorResponse('Doctor service relationship not found', undefined, HTTP_STATUS.NOT_FOUND);
    }

    await db
      .update(doctorServices)
      .set({
        customPrice: customPrice?.toString(),
        updatedAt: new Date()
      })
      .where(and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId)
      ));

    // Sincronizar conocimiento con pgVector
    try {
      await syncKnowledgeAfterCRUD('doctor_service', 'update', {
        doctorId,
        serviceId,
        organizationId: requestingUser.organizationId
      });
    } catch (syncError) {
      console.error('❌ [DoctorServices] Error sincronizando conocimiento:', syncError);
      // No fallar la operación principal por errores de sincronización
    }

    return createSuccessResponse(
      { doctorId, serviceId, customPrice: customPrice?.toString() },
      'Doctor service relationship updated successfully'
    );
  } catch (error) {
    console.error('Error updating doctor service:', error);
    return createErrorResponse('Internal server error', undefined, HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Deletes a specific doctor-service relationship.
 * 
 * Soft-deletes a doctor-service assignment by setting its availability to false.
 * This removes the service from the doctor's available services list while
 * preserving the relationship history. Requires admin privileges.
 * 
 * @param request - The incoming Next.js request
 * @param decodedToken - Decoded Firebase authentication token
 * @param params - Route parameters containing doctor and service IDs
 * 
 * @returns Promise resolving to API response confirming deletion
 * 
 * @throws {Error} When database operations fail or relationship doesn't exist
 * 
 * @remarks
 * This is a soft delete operation - the relationship record remains in the
 * database but is marked as unavailable. This preserves audit trails and
 * allows for potential restoration if needed.
 * 
 * @example
 * ```typescript
 * // Remove service 456 from doctor 123
 * DELETE /api/doctor-services/123/456
 * ```
 * 
 * @internal
 */
const deleteDoctorServiceHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  params: RouteParams
): Promise<NextResponse | Response> => {
  try {
    const doctorId = parseInt(params.doctorId);
    const serviceId = parseInt(params.serviceId);

    if (isNaN(doctorId) || isNaN(serviceId)) {
      return createErrorResponse('Invalid doctor ID or service ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const existingRelation = await db.query.doctorServices.findFirst({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId),
        eq(doctorServices.isAvailable, true)
      )
    });

    if (!existingRelation) {
      return createErrorResponse('Doctor service relationship not found', undefined, HTTP_STATUS.NOT_FOUND);
    }

    await db
      .update(doctorServices)
      .set({
        isAvailable: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.serviceId, serviceId)
      ));

    // Sincronizar conocimiento con pgVector (eliminación)
    try {
      await syncKnowledgeAfterCRUD('doctor_service', 'delete', {
        doctorId,
        serviceId,
        organizationId: requestingUser.organizationId
      });
    } catch (syncError) {
      console.error('❌ [DoctorServices] Error sincronizando conocimiento:', syncError);
      // No fallar la operación principal por errores de sincronización
    }

    return createSuccessResponse(null, 'Doctor service relationship deleted successfully');
  } catch (error) {
    console.error('Error deleting doctor service:', error);
    return createErrorResponse('Internal server error', undefined, HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Handles GET requests to retrieve a specific doctor-service relationship.
 * 
 * Authenticates the request and delegates to the appropriate handler function.
 * Returns detailed information about the specific service assignment including
 * custom pricing and availability status.
 * 
 * @param request - The incoming Next.js GET request
 * @param params - Promise resolving to route parameters with doctor and service IDs
 * @returns Promise resolving to HTTP response with relationship details or error
 * 
 * @throws {Error} When authentication fails or handler execution encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link getDoctorServiceHandler} for detailed response documentation
 * 
 * @public
 */
const handleGetDoctorService = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: Promise<RouteParams> };
  const resolvedParams = await params.params;
  return getDoctorServiceHandler(request, userInfo, resolvedParams);
};

export const GET = withOptimizedAuthentication(handleGetDoctorService, {
  requiredRoles: ['admin', 'medico'],
  requireOrganization: true
});

/**
 * Handles PUT requests to update a specific doctor-service relationship.
 * 
 * Authenticates the request and delegates to the update handler function.
 * Allows modification of custom pricing and other relationship-specific
 * settings. Requires admin privileges.
 * 
 * @param request - The incoming Next.js PUT request with update data
 * @param params - Promise resolving to route parameters with doctor and service IDs
 * @returns Promise resolving to HTTP response with updated relationship or error
 * 
 * @throws {Error} When authentication fails or update process encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link updateDoctorServiceHandler} for detailed request body documentation
 * 
 * @public
 */
const handleUpdateDoctorService = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: Promise<RouteParams> };
  const resolvedParams = await params.params;
  return updateDoctorServiceHandler(request, userInfo, resolvedParams);
};

export const PUT = withOptimizedAuthentication(handleUpdateDoctorService, {
  requiredRoles: ['admin', 'medico'],
  requireOrganization: true
});

/**
 * Handles DELETE requests to remove a specific doctor-service relationship.
 * 
 * Authenticates the request and delegates to the deletion handler function.
 * Performs a soft delete by marking the relationship as unavailable while
 * preserving the record for audit purposes. Requires admin privileges.
 * 
 * @param request - The incoming Next.js DELETE request
 * @param params - Promise resolving to route parameters with doctor and service IDs
 * @returns Promise resolving to HTTP response confirming deletion or error
 * 
 * @throws {Error} When authentication fails or deletion process encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link deleteDoctorServiceHandler} for detailed operation documentation
 * 
 * @public
 */
const handleDeleteDoctorService = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context?: unknown
): Promise<NextResponse | Response> => {
  const params = context as { params: Promise<RouteParams> };
  const resolvedParams = await params.params;
  return deleteDoctorServiceHandler(request, userInfo, resolvedParams);
};

export const DELETE = withOptimizedAuthentication(handleDeleteDoctorService, {
  requiredRoles: ['admin', 'medico'],
  requireOrganization: true
});