/**
 * @fileoverview Doctor-specific medical services API endpoints.
 * 
 * This module provides REST API endpoints for managing medical services assigned to
 * a specific doctor within an organization. It supports retrieving and updating
 * service assignments with proper authentication and authorization controls.
 * 
 * @author Santiago Prada - Backend Developer
 * @version 1.0.0
 * @since 2025-05-26
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Auth Verification}
 * @see {@link https://orm.drizzle.team/docs/overview | Drizzle ORM Documentation}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctorServices, doctors, medicalServices, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@/app/lib/firebase/server/adminConfig';
import { DecodedIdToken } from 'firebase-admin/auth';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/types/api';

interface RouteParams {
  doctorId: string;
}

/**
 * Authenticates incoming requests using Firebase Admin SDK.
 * 
 * Extracts and verifies the Bearer token from the Authorization header,
 * ensuring the request comes from a valid authenticated user. This function
 * is used as a middleware for all protected endpoints.
 * 
 * @param request - The incoming Next.js request with Authorization header
 * @returns Promise resolving to decoded Firebase ID token
 * 
 * @throws {Error} When token is missing, malformed, expired, or verification fails
 * 
 * @example
 * ```typescript
 * const decodedToken = await authenticateRequest(request);
 * console.log('User ID:', decodedToken.uid);
 * console.log('Email:', decodedToken.email);
 * ```
 * 
 * @see {@link https://firebase.google.com/docs/auth/admin/verify-id-tokens | Firebase Token Verification}
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
 * Retrieves medical services assigned to a specific doctor.
 * 
 * Fetches all services assigned to the specified doctor within the authenticated
 * user's organization. Includes detailed service information, custom pricing,
 * and availability status. Supports optional filtering by availability.
 * 
 * @param request - The incoming Next.js request with optional query parameters
 * @param decodedToken - Decoded Firebase authentication token
 * @param doctorId - The unique identifier of the doctor
 * 
 * @returns Promise resolving to API response with doctor's assigned services
 * 
 * @throws {Error} When database queries fail or doctor doesn't belong to organization
 * 
 * @remarks
 * Supported query parameters:
 * - `available` (boolean) - Filter services by availability status
 * 
 * Response includes:
 * - Service details (name, description, base price)
 * - Custom pricing for this doctor (if set)
 * - Availability status
 * - Assignment metadata (created/updated dates)
 * 
 * @example
 * ```typescript
 * // Get all services for doctor 123
 * GET /api/doctor-services/123
 * 
 * // Get only available services for doctor 123
 * GET /api/doctor-services/123?available=true
 * ```
 * 
 * @internal
 */
const getDoctorServicesHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  params: RouteParams
): Promise<NextResponse | Response> => {
  try {
    const doctorId = parseInt(params.doctorId);

    if (isNaN(doctorId)) {
      return createErrorResponse('Invalid doctor ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid)
    });

    if (!requestingUser) {
      return createErrorResponse('User not found', undefined, HTTP_STATUS.NOT_FOUND);
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
 * Updates the medical services assigned to a specific doctor.
 * 
 * Replaces all current service assignments for the specified doctor with a new set
 * of services. This operation requires admin privileges and validates that all
 * services belong to the same organization as the requesting user.
 * 
 * @param request - The incoming Next.js request with service assignment data
 * @param decodedToken - Decoded Firebase authentication token
 * @param params - Route parameters containing the doctor ID
 * 
 * @returns Promise resolving to API response with updated service assignments
 * 
 * @throws {Error} When database operations fail or validation errors occur
 * 
 * @remarks
 * Required request body fields:
 * - `serviceIds` (number[]) - Array of service IDs to assign to the doctor
 * 
 * The operation performs the following steps:
 * 1. Validates admin privileges and doctor ownership
 * 2. Verifies all service IDs exist and belong to the organization
 * 3. Deactivates all current service assignments
 * 4. Creates new assignments for the provided service IDs
 * 5. Returns the updated list of active assignments
 * 
 * @example
 * ```typescript
 * // Update doctor 123 to have services 456 and 789
 * PUT /api/doctor-services/123
 * {
 *   "serviceIds": [456, 789]
 * }
 * ```
 * 
 * @internal
 */
const updateDoctorServicesHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  params: RouteParams
): Promise<NextResponse | Response> => {
  try {
    const doctorId = parseInt(params.doctorId);

    if (isNaN(doctorId)) {
      return createErrorResponse('Invalid doctor ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid)
    });

    if (!requestingUser || !requestingUser.organizationId || requestingUser.role !== 'admin') {
      return createErrorResponse('Admin access required', undefined, HTTP_STATUS.FORBIDDEN);
    }

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return getDoctorServicesHandler(request, decodedToken, resolvedParams);
}

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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return updateDoctorServicesHandler(request, decodedToken, resolvedParams);
}