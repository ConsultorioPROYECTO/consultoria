/**
 * API endpoint for marking appointments as attended.
 * Handles PATCH requests to update appointment status to 'attended',
 * updates Google Calendar, and adds local notes.
 * 
 * @route PATCH /api/appointments/[eventId]/attend
 * @author Santiago Prada
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { db } from '@/db';
import { appointments } from '@/db/schema/appointments';
import { eq } from 'drizzle-orm';
import { updateAppointmentEvent } from '@/lib/calendar-event-manager';
import { AppointmentStatus } from '@/lib/calendar-event-manager';
import { APPOINTMENT_STATUS } from '@/types/appointment-status';
import { 
  AttendAppointmentRequest, 
  AttendAppointmentResponse,
  AttendAppointmentRequestSchema,
  AttendAppointmentResponseSchema
} from '@/types/attend-appointment';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { withOptimizedDoctorAuth } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';

/**
 * PATCH /api/appointments/[eventId]/attend
 * 
 * Marks an appointment as attended by:
 * 1. Validating the request and authentication
 * 2. Finding the appointment by Google event ID
 * 3. Checking if the appointment can be marked as attended
 * 4. Updating the appointment status in Google Calendar
 * 5. Updating the appointment in the database with attended status and notes
 * 
 * @param request - Next.js request object
 * @param params - Route parameters containing eventId
 * @returns JSON response with updated appointment data or error
 */
async function handlePatchRequest(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  ...args: unknown[]
) {
  const context = args[0] as { params: Promise<{ eventId: string }> };
  const { params } = context;
  try {
    // 1. Extract and validate request data
    const { eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Event ID is required'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Parse and validate request body with Zod
    let requestBody: AttendAppointmentRequest;
    try {
      const rawBody = await request.json();
      // Add eventId from params to the body for validation
      const bodyWithEventId = { ...rawBody, eventId };
      requestBody = AttendAppointmentRequestSchema.parse(bodyWithEventId);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.errors.map((err) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return NextResponse.json(
          createErrorResponse(API_ERRORS.VALIDATION_ERROR, `Validation failed: ${errorMessage}`),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
      return NextResponse.json(
        createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Invalid JSON in request body'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 2. Find the appointment by Google event ID
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.google_event_id, eventId),
      with: {
        doctor: {
          with: {
            user: true
          }
        },
        patient: true,
        service: true,
        organization: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Appointment not found'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // 3. Check authorization - user must be the doctor or belong to the same organization
    const userBelongsToOrganization = appointment.doctor?.user?.organizationId === userInfo.organizationInfo?.id;
    const isAppointmentDoctor = appointment.doctor?.user?.firebaseUid === userInfo.decodedToken.uid;
    
    if (!isAppointmentDoctor && !userBelongsToOrganization) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.FORBIDDEN, 'You do not have permission to attend this appointment'),
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // 4. Validate that appointment can be marked as attended
    const validStatesForAttendance = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.ACCEPTED] as const;
    if (!validStatesForAttendance.includes(appointment.status as typeof validStatesForAttendance[number])) {
      const statusMessages: Record<string, string> = {
        [APPOINTMENT_STATUS.ATTENDED]: 'La cita ya ha sido marcada como atendida',
        [APPOINTMENT_STATUS.CANCELED]: 'No se puede marcar como atendida una cita cancelada',
        [APPOINTMENT_STATUS.REJECTED]: 'No se puede marcar como atendida una cita rechazada'
      };
      
      const message = statusMessages[appointment.status] || 
                     'El estado actual de la cita no permite marcarla como atendida';
      
      return NextResponse.json(
        createErrorResponse(API_ERRORS.VALIDATION_ERROR, message),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // 5. Update appointment status in Google Calendar
    try {
      await updateAppointmentEvent({
        eventId: eventId,
        doctorId: appointment.doctorId,
        appointmentStatus: AppointmentStatus.Attended
      });
    } catch {
      console.error('Error updating Google Calendar event');
      // Continue with database update even if calendar update fails
      // We'll mark sync_status as failed
    }

    // 6. Update appointment in database
    const attendedAt = new Date();
    const updateData = {
      status: APPOINTMENT_STATUS.ATTENDED,
      attendedAt: attendedAt,
      updatedAt: new Date(),
      sync_status: 'synced' as const,
      ...(requestBody.notes && requestBody.notes.trim() && { notes: requestBody.notes.trim() })
    };

    await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointment.id));
    
    // Get the updated appointment
    const updatedAppointment = await db.query.appointments.findFirst({
      where: eq(appointments.id, appointment.id)
    });

    if (!updatedAppointment) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Failed to update appointment in database'),
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    // 7. Prepare and validate response data with Zod
    const responseData: AttendAppointmentResponse = {
      appointmentId: updatedAppointment.id,
      eventId: eventId,
      status: updatedAppointment.status,
      attendedAt: attendedAt.toISOString(),
      notes: updatedAppointment.notes || undefined,
      syncStatus: updatedAppointment.sync_status
    };

    // Validate response data with Zod schema
    try {
      const validatedResponse = AttendAppointmentResponseSchema.parse(responseData);
      return NextResponse.json(
        createSuccessResponse(validatedResponse, 'Appointment marked as attended successfully'),
        { status: HTTP_STATUS.OK }
      );
    } catch (validationError) {
      console.error('Response validation error:', validationError);
      return NextResponse.json(
        createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Response validation failed'),
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

  } catch (error) {
    console.error('Error in attend appointment API:', error);
    return NextResponse.json(
      createErrorResponse(
        API_ERRORS.INTERNAL_ERROR,
        'An unexpected error occurred while marking appointment as attended'
      ),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

// Export the authenticated PATCH handler
export const PATCH = withOptimizedDoctorAuth(handlePatchRequest);

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    createErrorResponse(API_ERRORS.METHOD_NOT_ALLOWED, 'Method not allowed'),
    { status: HTTP_STATUS.METHOD_NOT_ALLOWED }
  );
}

export async function POST() {
  return NextResponse.json(
    createErrorResponse(API_ERRORS.METHOD_NOT_ALLOWED, 'Method not allowed'),
    { status: HTTP_STATUS.METHOD_NOT_ALLOWED }
  );
}

export async function PUT() {
  return NextResponse.json(
    createErrorResponse(API_ERRORS.METHOD_NOT_ALLOWED, 'Method not allowed'),
    { status: HTTP_STATUS.METHOD_NOT_ALLOWED }
  );
}

export async function DELETE() {
  return NextResponse.json(
    createErrorResponse(API_ERRORS.METHOD_NOT_ALLOWED, 'Method not allowed'),
    { status: HTTP_STATUS.METHOD_NOT_ALLOWED }
  );
}