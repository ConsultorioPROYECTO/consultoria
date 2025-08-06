import { NextRequest, NextResponse } from 'next/server';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { updateAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { handleDatabaseError } from '@/lib/api-helpers';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { APPOINTMENT_STATUS } from '@/types/appointment-status';

/**
 * Interface for attending appointment request
 */
interface AttendAppointmentRequest {
  notes?: string;
  patientNotes?: string;
  appointmentPrice?: string;
  durationMinutes?: number;
}

/**
 * Handles POST request to mark an appointment as attended.
 * Updates both the database and Google Calendar event.
 * 
 * @param request - The incoming request
 * @param userInfo - Authenticated user information
 * @param params - Route parameters containing eventId
 * @returns NextResponse with success or error
 */
async function handlePostRequest(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  { params }: { params: { eventId: string } }
): Promise<NextResponse> {
  try {
    const { eventId } = params;
    const user = userInfo.user;
    
    // Validate user permissions - doctors, assistants and admins can mark appointments as attended
    if (user.role !== 'admin' && user.role !== 'asistente' && user.role !== 'medico') {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'Usuario no tiene permisos para marcar citas como atendidas',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const body: AttendAppointmentRequest = await request.json();
    const { notes, patientNotes, appointmentPrice, durationMinutes } = body;

    // Find the appointment first to verify ownership and current status
    const appointment = await db.query.appointments.findFirst({
      where: eq(appointments.google_event_id, eventId),
      with: {
        doctor: {
          with: {
            user: true
          }
        }
      }
    });

    if (!appointment) {
      return createErrorResponse(
        'Cita no encontrada',
        `No se encontró una cita con ID ${eventId}`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Verify organization ownership
    if (appointment.doctor?.user?.organizationId !== user.organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'La cita no pertenece a su organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Check if appointment is already attended
    if (appointment.status === APPOINTMENT_STATUS.ATTENDED) {
      return createErrorResponse(
        API_ERRORS.CONFLICT,
        'La cita ya ha sido marcada como atendida',
        HTTP_STATUS.CONFLICT
      );
    }

    // Check if appointment can be attended (must be accepted or pending)
    if (appointment.status !== APPOINTMENT_STATUS.ACCEPTED && appointment.status !== APPOINTMENT_STATUS.PENDING) {
      return createErrorResponse(
        API_ERRORS.BAD_REQUEST,
        `No se puede marcar como atendida una cita con estado: ${appointment.status}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Update Google Calendar event status to attended
    await updateAppointmentEvent({
      eventId,
      doctorId: appointment.doctorId,
      appointmentStatus: AppointmentStatus.Attended,
    });

    // Prepare database update data
    const updateData: Partial<typeof appointments.$inferInsert> = {
      status: APPOINTMENT_STATUS.ATTENDED,
      attendedAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add optional fields if provided
    if (notes !== undefined) updateData.notes = notes;
    if (patientNotes !== undefined) updateData.patientNotes = patientNotes;
    if (appointmentPrice !== undefined) updateData.appointmentPrice = appointmentPrice;
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;

    // Update the appointment in database
    await db.update(appointments)
      .set(updateData)
      .where(eq(appointments.id, appointment.id));

    return createSuccessResponse(
      { 
        appointmentId: appointment.id, 
        status: APPOINTMENT_STATUS.ATTENDED,
        attendedAt: updateData.attendedAt,
        ...updateData 
      },
      'Cita marcada como atendida exitosamente',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error(`Error marking appointment ${params.eventId} as attended:`, error);
    return handleDatabaseError(error, 'mark appointment as attended');
  }
}

/**
 * POST endpoint to mark an appointment as attended.
 * Requires authentication and appropriate permissions.
 */
export const POST = withOptimizedAuthentication(async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  ...args: unknown[]
) => {
  const context = args[0] as { params: { eventId: string } };
  return handlePostRequest(request, userInfo, context);
});