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