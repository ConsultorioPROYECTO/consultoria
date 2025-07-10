import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { updateAppointmentEvent, deleteAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { handleDatabaseError } from '@/lib/api-helpers';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { DateTime } from 'luxon';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';

async function handlePatchRequest(
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: { eventId: string } }
): Promise<NextResponse> {
  try {
    const { eventId } = params;
    const body = await request.json();
    const { doctorId, startDateTime, endDateTime, appointmentStatus, summary, description } = body;

    if (!doctorId) {
      return createErrorResponse(API_ERRORS.INVALID_REQUEST, 'doctorId is required', HTTP_STATUS.BAD_REQUEST);
    }

    const updatedEvent = await updateAppointmentEvent({
      eventId,
      doctorId: Number(doctorId),
      ...(startDateTime && { startDateTime: DateTime.fromISO(startDateTime) }),
      ...(endDateTime && { endDateTime: DateTime.fromISO(endDateTime) }),
      ...(appointmentStatus && { appointmentStatus: appointmentStatus as AppointmentStatus }),
      ...(summary && { summary }),
      ...(description && { description }),
    });

    return createSuccessResponse(updatedEvent, 'Appointment updated successfully');
  } catch (error) {
    console.error(`Error updating appointment ${params.eventId}:`, error);
    return handleDatabaseError(error, 'update appointment');
  }
}

async function handleDeleteRequest(
  request: NextRequest,
  decodedToken: DecodedIdToken,
  { params }: { params: { eventId: string } }
): Promise<NextResponse> {
  try {
    const { eventId } = params;
    const { doctorId } = await request.json(); // doctorId could also be in query params

    if (!doctorId) {
      return createErrorResponse(API_ERRORS.INVALID_REQUEST, 'doctorId is required', HTTP_STATUS.BAD_REQUEST);
    }

    await deleteAppointmentEvent({
      eventId,
      doctorId: Number(doctorId),
    });

    return createSuccessResponse(null, 'Appointment deleted successfully', HTTP_STATUS.OK);
  } catch (error) {
    console.error(`Error deleting appointment ${params.eventId}:`, error);
    return handleDatabaseError(error, 'delete appointment');
  }
}

export const PATCH = withAuthentication(async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  context: { params: { eventId: string } }
) => {
  return handlePatchRequest(request, decodedToken, context);
});

export const DELETE = withAuthentication(async (
  request: NextRequest,
  decodedToken: DecodedIdToken,
  context: { params: { eventId: string } }
) => {
  return handleDeleteRequest(request, decodedToken, context);
});
