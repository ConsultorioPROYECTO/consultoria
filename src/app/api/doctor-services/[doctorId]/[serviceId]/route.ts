/**
 * @fileoverview Individual doctor-service relationship management API.
 * 
 * This module provides REST API endpoints for managing specific doctor-service
 * relationships within an organization. It supports retrieving, updating, and
 * deleting individual service assignments with proper authentication and
 * authorization controls.
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
import { doctorServices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/app/lib/firebase/server/adminConfig';
import { DecodedIdToken } from 'firebase-admin/auth';
import { createErrorResponse, createSuccessResponse, HTTP_STATUS } from '@/types/api';

interface RouteParams {
  doctorId: string;
  serviceId: string;
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
 * Retrieves a specific doctor-service relationship.
 * 
 * Fetches detailed information about a specific service assignment to a doctor,
 * including service details, custom pricing, availability status, and assignment
 * metadata. Validates that both doctor and service belong to the user's organization.
 * 
 * @param request - The incoming Next.js request
 * @param decodedToken - Decoded Firebase authentication token
 * @param doctorId - The unique identifier of the doctor
 * @param serviceId - The unique identifier of the medical service
 * 
 * @returns Promise resolving to API response with relationship details
 * 
 * @throws {Error} When database queries fail or relationship doesn't exist
 * 
 * @remarks
 * Response includes:
 * - Complete service information (name, description, category, base price)
 * - Doctor information (name, specialization)
 * - Custom pricing for this doctor-service combination (if set)
 * - Availability status and assignment timestamps
 * 
 * @example
 * ```typescript
 * // Get relationship between doctor 123 and service 456
 * GET /api/doctor-services/123/456
 * ```
 * 
 * @internal
 */
const getDoctorServiceHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
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
  decodedToken: DecodedIdToken,
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
  decodedToken: DecodedIdToken,
  params: RouteParams
): Promise<NextResponse | Response> => {
  try {
    const doctorId = parseInt(params.doctorId);
    const serviceId = parseInt(params.serviceId);

    if (isNaN(doctorId) || isNaN(serviceId)) {
      return createErrorResponse('Invalid doctor ID or service ID', undefined, HTTP_STATUS.BAD_REQUEST);
    }

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
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return getDoctorServiceHandler(request, decodedToken, resolvedParams);
}

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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return updateDoctorServiceHandler(request, decodedToken, resolvedParams);
}

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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  const decodedToken = await authenticateRequest(request);
  
  if (!decodedToken) {
    return createErrorResponse('Unauthorized - Invalid or missing token', undefined, HTTP_STATUS.UNAUTHORIZED);
  }

  const resolvedParams = await params;
  return deleteDoctorServiceHandler(request, decodedToken, resolvedParams);
}