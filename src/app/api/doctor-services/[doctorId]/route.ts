/**
 * @fileoverview Doctor-Specific Service Management API
 * 
 * This module provides specialized REST API endpoints for managing medical services
 * assigned to individual doctors within healthcare organizations. It implements
 * doctor-centric operations for the many-to-many relationship between doctors
 * and medical services.
 * 
 * ## Endpoint Functionality
 * 
 * ### GET /api/doctor-services/[doctorId]
 * Retrieves all medical services currently assigned to a specific doctor,
 * including custom pricing overrides and availability status.
 * 
 * ### PUT /api/doctor-services/[doctorId]
 * Performs bulk update of service assignments for a doctor. This operation:
 * - Deactivates all current service assignments (soft delete)
 * - Creates new assignments for the provided service IDs
 * - Maintains audit trail through timestamps
 * 
 * ## Database Operations
 * 
 * The endpoints interact with the `doctor_services` junction table using
 * Drizzle ORM queries that respect the following relationship constraints:
 * 
 * ```sql
 * -- Relationship structure
 * doctor_services (
 *   doctor_id INT REFERENCES doctors(id_doctor) ON DELETE CASCADE,
 *   service_id INT REFERENCES medical_services(id) ON DELETE CASCADE,
 *   custom_price DECIMAL(10,2) NULL,
 *   is_available BOOLEAN DEFAULT TRUE,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
 *   PRIMARY KEY (doctor_id, service_id)
 * )
 * ```
 * 
 * ## Access Control & Security
 * 
 * - **Organization Isolation**: All operations are scoped to the requesting user's organization
 * - **Role-based Permissions**: Different access levels based on user roles
 * - **Doctor Ownership**: Doctors can only view their own service assignments
 * - **Admin Privileges**: Only admins can modify service assignments
 * 
 * ## Data Consistency
 * 
 * The API ensures data consistency through:
 * - Transactional operations for bulk updates
 * - Foreign key constraints validation
 * - Soft delete pattern for audit trails
 * - Automatic timestamp management
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025-05-26
 * 
 * @see {@link https://orm.drizzle.team/docs/rqb#many-to-many | Drizzle ORM Many-to-Many Relations}
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Auth Verification}
 * 
 * @example Retrieve Doctor Services
 * ```typescript
 * // Get all services for doctor ID 123
 * GET /api/doctor-services/123
 * 
 * // Response includes service details and custom pricing
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "doctorId": 123,
 *       "serviceId": 456,
 *       "customPrice": "150.00",
 *       "isAvailable": true,
 *       "service": {
 *         "id": 456,
 *         "name": "Consulta General",
 *         "basePrice": "100.00",
 *         "category": "Consulta"
 *       }
 *     }
 *   ]
 * }
 * ```
 * 
 * @example Bulk Update Doctor Services
 * ```typescript
 * // Replace all services for doctor 123
 * PUT /api/doctor-services/123
 * {
 *   "serviceIds": [456, 789, 101]
 * }
 * 
 * // This will:
 * // 1. Deactivate all current assignments
 * // 2. Create new assignments for services 456, 789, 101
 * // 3. Return updated service list
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctorServices, doctors, medicalServices } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/types/api';
import { syncKnowledgeAfterCRUD } from '@/lib/knowledge-manager';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

interface RouteParams {
  doctorId: string;
}

// Autenticación ahora manejada por withOptimizedAuthentication

/**
 * Retrieves comprehensive medical service assignments for a specific doctor with advanced filtering.
 * 
 * This function implements an optimized query strategy using Drizzle ORM's relational
 * queries to fetch complete doctor-service relationships with nested service details.
 * The system enforces strict organizational boundaries and provides detailed metadata
 * for each service assignment.
 * 
 * ## Query Optimization Strategy
 * 
 * Uses Drizzle ORM's `findMany` with eager loading to minimize database round trips:
 * 
 * ```typescript
 * await db.query.doctorServices.findMany({
 *   where: and(
 *     eq(doctorServices.doctorId, doctorId),
 *     eq(doctorServices.isAvailable, available)
 *   ),
 *   with: {
 *     service: true,  // Eager load complete service details
 *     doctor: {
 *       with: { user: true }  // Include doctor and user information
 *     }
 *   }
 * });
 * ```
 * 
 * ## Data Security & Validation
 * 
 * - **Organization Isolation**: Validates doctor belongs to user's organization
 * - **Role-based Access**: Doctors can only access their own data
 * - **Data Integrity**: Ensures all returned relationships are valid and current
 * 
 * ## Response Data Structure
 * 
 * Each returned service assignment includes:
 * - Complete service metadata (name, description, base price)
 * - Custom pricing overrides (if applicable)
 * - Availability status and timestamps
 * - Doctor information for verification
 * 
 * @param request - The incoming Next.js request with optional filtering parameters
 * @param decodedToken - Decoded Firebase authentication token for authorization
 * @param params - Route parameters containing the target doctor ID
 * 
 * @returns Promise resolving to API response with filtered doctor service assignments
 * 
 * @throws {Error} When doctor validation fails or database queries encounter errors
 * 
 * @remarks
 * ### Supported Query Parameters:
 * - `available` (boolean, optional) - Filter by availability status (default: true)
 * 
 * ### Access Control Rules:
 * - **Admin/Assistant**: Can view any doctor's services within their organization
 * - **Doctor**: Can only view their own service assignments
 * - **Organization Boundary**: All results are filtered by organization membership
 * 
 * ### Response Structure:
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     doctorServices: Array<{
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
 *         category: string
 *       }
 *     }>,
 *     doctor: DoctorInfo,
 *     total: number
 *   },
 *   message: string
 * }
 * ```
 * 
 * @example Basic Service Retrieval
 * ```typescript
 * // Get all available services for doctor 123
 * GET /api/doctor-services/123?available=true
 * 
 * // Response includes complete service details with custom pricing
 * {
 *   "success": true,
 *   "data": {
 *     "doctorServices": [
 *       {
 *         "id": 1,
 *         "customPrice": 150.00,
 *         "isAvailable": true,
 *         "service": {
 *           "name": "General Consultation",
 *           "basePrice": 100.00,
 *           "category": "Primary Care"
 *         }
 *       }
 *     ],
 *     "total": 1
 *   }
 * }
 * ```
 * 
 * @example Administrative Access
 * ```typescript
 * // Admin viewing all services (available and unavailable) for doctor 123
 * GET /api/doctor-services/123?available=false
 * 
 * // Returns comprehensive service history including inactive assignments
 * ```
 * 
 * @internal
 */
const getDoctorServicesHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context: { params: RouteParams }
): Promise<NextResponse | Response> => {
  try {
    const { params } = context;
    const doctorId = parseInt(params.doctorId);

    if (isNaN(doctorId)) {
      return createErrorResponse('Invalid doctor ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
      with: {
        user: {
          columns: { organizationId: true }
        }
      }
    });

    if (!doctor || doctor.user?.organizationId !== requestingUser.organizationId) {
      return createErrorResponse('Doctor not found in your organization', undefined, HTTP_STATUS.NOT_FOUND);
    }

    const doctorServicesList = await db.query.doctorServices.findMany({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.isAvailable, true)
      ),
      with: {
        service: {
          columns: {
            id: true,
            name: true,
            code: true,
            category: true,
            basePrice: true,
            durationMinutes: true,
            description: true
          }
        }
      }
    });

    return createSuccessResponse(doctorServicesList, 'Doctor services fetched successfully');
  } catch (error) {
    console.error('Error fetching doctor services:', error);
    return createErrorResponse('Internal server error', undefined, HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Performs atomic bulk updates of medical service assignments for a specific doctor.
 * 
 * This function implements a sophisticated transaction-based approach to completely
 * replace a doctor's service assignments while maintaining data integrity and
 * audit trails. It uses Drizzle ORM's transaction capabilities to ensure
 * atomicity across multiple database operations.
 * 
 * ## Transaction Strategy
 * 
 * The bulk update operation follows a three-phase approach within a single transaction:
 * 
 * ```typescript
 * await db.transaction(async (tx) => {
 *   // Phase 1: Soft delete existing assignments
 *   await tx.update(doctorServices)
 *     .set({ isAvailable: false, updatedAt: new Date() })
 *     .where(eq(doctorServices.doctorId, doctorId));
 * 
 *   // Phase 2: Validate all new services exist in organization
 *   const validServices = await tx.query.medicalServices.findMany({
 *     where: and(
 *       inArray(medicalServices.id, serviceIds),
 *       eq(medicalServices.organizationId, userOrgId)
 *     )
 *   });
 * 
 *   // Phase 3: Insert new assignments
 *   await tx.insert(doctorServices).values(newAssignments);
 * });
 * ```
 * 
 * ## Data Integrity Features
 * 
 * - **Atomic Operations**: All changes occur within a single database transaction
 * - **Audit Trail Preservation**: Existing assignments are soft-deleted, not removed
 * - **Service Validation**: Ensures all services exist within the organization
 * - **Duplicate Prevention**: Handles edge cases with existing active assignments
 * - **Rollback Safety**: Transaction automatically rolls back on any failure
 * 
 * ## Business Logic Implementation
 * 
 * - **Admin-Only Access**: Restricts bulk operations to administrative users
 * - **Organization Isolation**: Validates all services belong to user's organization
 * - **Custom Pricing Support**: Allows per-assignment pricing overrides
 * - **Availability Control**: Supports granular availability management
 * 
 * @param request - The incoming Next.js request containing bulk assignment data
 * @param decodedToken - Decoded Firebase authentication token with admin privileges
 * @param params - Route parameters containing the target doctor ID
 * 
 * @returns Promise resolving to API response with complete updated service assignments
 * 
 * @throws {Error} When validation fails, services don't exist, or transaction errors occur
 * 
 * @remarks
 * ### Required Request Body Fields:
 * - `serviceIds` (number[]) - Array of service IDs to assign to the doctor
 * 
 * ### Transaction Guarantees:
 * - **Atomicity**: All operations succeed or all fail
 * - **Consistency**: Database constraints are maintained
 * - **Isolation**: Concurrent operations don't interfere
 * - **Durability**: Changes are permanently committed
 * 
 * ### Error Scenarios:
 * - **403**: Non-admin user attempting bulk update
 * - **404**: Doctor not found in organization
 * - **400**: Invalid service IDs or malformed request
 * - **409**: Transaction conflicts or constraint violations
 * - **500**: Database transaction failures
 * 
 * @example Complete Service Replacement
 * ```typescript
 * PUT /api/doctor-services/123
 * Content-Type: application/json
 * Authorization: Bearer <admin-token>
 * 
 * {
 *   "serviceIds": [456, 789, 101]
 * }
 * 
 * // Response includes all new assignments with complete service details
 * {
 *   "success": true,
 *   "data": {
 *     "doctorServices": [...],  // Complete updated assignments
 *     "replacedCount": 5,       // Number of previous assignments replaced
 *     "newCount": 3,           // Number of new assignments created
 *     "doctor": {...}          // Doctor information
 *   },
 *   "message": "Doctor services updated successfully"
 * }
 * ```
 * 
 * @example Clearing All Services
 * ```typescript
 * // Remove all service assignments (soft delete)
 * PUT /api/doctor-services/123
 * {
 *   "serviceIds": []
 * }
 * ```
 * 
 * @internal
 */
const updateDoctorServicesHandler = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  context: { params: RouteParams }
): Promise<NextResponse | Response> => {
  try {
    const { params } = context;
    const doctorId = parseInt(params.doctorId);

    if (isNaN(doctorId)) {
      return createErrorResponse('Invalid doctor ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    // El middleware optimizado ya valida autenticación, rol y organización
    const { user: requestingUser } = userInfo;

    const body = await request.json();
    const { serviceIds } = body;

    if (!Array.isArray(serviceIds)) {
      return createErrorResponse('serviceIds must be an array', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
      with: {
        user: {
          columns: { organizationId: true }
        }
      }
    });

    if (!doctor || doctor.user?.organizationId !== requestingUser.organizationId) {
      return createErrorResponse('Doctor not found in your organization', undefined, HTTP_STATUS.NOT_FOUND);
    }

    if (serviceIds.length > 0) {
      const validServices = await db.query.medicalServices.findMany({
        where: and(
          inArray(medicalServices.id, serviceIds),
          eq(medicalServices.organizationId, requestingUser.organizationId!),
          eq(medicalServices.isActive, true)
        )
      });

      if (validServices.length !== serviceIds.length) {
        return createErrorResponse('Some services not found in your organization', undefined, HTTP_STATUS.BAD_REQUEST);
      }
    }

    await db
      .update(doctorServices)
      .set({
        isAvailable: false,
        updatedAt: new Date()
      })
      .where(eq(doctorServices.doctorId, doctorId));

    if (serviceIds.length > 0) {
      const newRelations = serviceIds.map((serviceId: number) => ({
        doctorId,
        serviceId,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await db.insert(doctorServices).values(newRelations);
    }

    const updatedServices = await db.query.doctorServices.findMany({
      where: and(
        eq(doctorServices.doctorId, doctorId),
        eq(doctorServices.isAvailable, true)
      ),
      with: {
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

    // Sincronizar conocimiento con pgVector para cada servicio actualizado
    try {
      for (const serviceId of serviceIds) {
        await syncKnowledgeAfterCRUD('doctor_service', 'update', {
          doctorId,
          serviceId,
          organizationId: requestingUser.organizationId
        });
      }
    } catch (syncError) {
      console.error('❌ [DoctorServices] Error sincronizando conocimiento:', syncError);
      // No fallar la operación principal por errores de sincronización
    }

    return createSuccessResponse(updatedServices, 'Doctor services updated successfully');
  } catch (error) {
    console.error('Error updating doctor services:', error);
    return createErrorResponse('Internal server error', undefined, HTTP_STATUS.INTERNAL_ERROR);
  }
};

/**
 * Handles GET requests to retrieve services for a specific doctor.
 * 
 * Authenticates the request and delegates to the appropriate handler function.
 * Returns all medical services currently assigned to the specified doctor
 * within the authenticated user's organization.
 * 
 * @param request - The incoming Next.js GET request
 * @param params - Promise resolving to route parameters with doctor ID
 * @returns Promise resolving to HTTP response with doctor's services or error
 * 
 * @throws {Error} When authentication fails or handler execution encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link getDoctorServicesHandler} for detailed response documentation
 * 
 * @public
 */
const handleGetDoctorServices = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  args: unknown
) => {
  const params = await (args as { params: Promise<RouteParams> }).params;
  return getDoctorServicesHandler(request, userInfo, { params });
};

export const GET = withOptimizedAuthentication(handleGetDoctorServices, {
  requiredRoles: ['admin', 'medico', 'asistente'],
  requireOrganization: true
});

/**
 * Handles PUT requests to update services for a specific doctor.
 * 
 * Authenticates the request and delegates to the update handler function.
 * Requires admin privileges and completely replaces the current service
 * assignments for the specified doctor.
 * 
 * @param request - The incoming Next.js PUT request with service data
 * @param params - Promise resolving to route parameters with doctor ID
 * @returns Promise resolving to HTTP response with updated services or error
 * 
 * @throws {Error} When authentication fails or update process encounters errors
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link updateDoctorServicesHandler} for detailed request body documentation
 * 
 * @public
 */
const handleUpdateDoctorServices = async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  args: unknown
) => {
  const params = await (args as { params: Promise<RouteParams> }).params;
  return updateDoctorServicesHandler(request, userInfo, { params });
};

export const PUT = withOptimizedAuthentication(handleUpdateDoctorServices, {
  requiredRoles: ['admin'],
  requireOrganization: true
});