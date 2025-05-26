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

async function authenticateRequest(request: NextRequest): Promise<DecodedIdToken | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    return await auth().verifyIdToken(token);
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

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