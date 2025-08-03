import { NextRequest, NextResponse } from 'next/server';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { updateAppointmentEvent, deleteAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { handleDatabaseError } from '@/lib/api-helpers';
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';

/**
 * Interface for updating appointment data
 */
interface UpdateAppointmentRequest {
  doctorId?: number;
  startDateTime?: string;
  endDateTime?: string;
  appointmentStatus?: AppointmentStatus;
  summary?: string;
  description?: string;
  notes?: string;
  patientNotes?: string;
  appointmentPrice?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isFirstTime?: boolean;
  isFollowUp?: boolean;
  followUpOfId?: number;
  durationMinutes?: number;
}

async function handlePatchRequest(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  { params }: { params: { eventId: string } }
): Promise<NextResponse> {
  try {
    const { eventId } = params;
    const user = userInfo.user;
    
    // Validate user permissions
    if (user.role !== 'admin' && user.role !== 'asistente' && user.role !== 'medico') {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'Usuario no tiene permisos para actualizar citas',
        HTTP_STATUS.FORBIDDEN
      );
    }

    const body: UpdateAppointmentRequest = await request.json();
    const { 
      doctorId, 
      startDateTime, 
      endDateTime, 
      appointmentStatus, 
      summary, 
      description,
      notes,
      patientNotes,
      appointmentPrice,
      priority,
      isFirstTime,
      isFollowUp,
      followUpOfId,
      durationMinutes
    } = body;

    // Find the appointment first to verify ownership
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

    // Update calendar event if calendar integration is enabled
     if (doctorId || startDateTime || endDateTime || appointmentStatus || summary || description) {
       await updateAppointmentEvent({
         eventId,
         doctorId: doctorId ? Number(doctorId) : appointment.doctorId,
         ...(startDateTime && { startDateTime: DateTime.fromISO(startDateTime) }),
         ...(endDateTime && { endDateTime: DateTime.fromISO(endDateTime) }),
         ...(appointmentStatus && { appointmentStatus: appointmentStatus as AppointmentStatus }),
         ...(summary && { summary }),
         ...(description && { description }),
       });
     }

    // Update database fields
    const updateData: Partial<typeof appointments.$inferInsert> = {};
    
    if (startDateTime) {
      const startDate = DateTime.fromISO(startDateTime);
      updateData.appointmentDate = startDate.toJSDate();
      updateData.appointmentTime = startDate.toFormat('HH:mm');
    }
    
    if (endDateTime) {
      const endDate = DateTime.fromISO(endDateTime);
      updateData.endTime = endDate.toFormat('HH:mm');
    }
    
    if (durationMinutes !== undefined) updateData.durationMinutes = durationMinutes;
    if (notes !== undefined) updateData.notes = notes;
    if (patientNotes !== undefined) updateData.patientNotes = patientNotes;
    if (appointmentPrice !== undefined) updateData.appointmentPrice = appointmentPrice;
    if (priority !== undefined) updateData.priority = priority;
    if (isFirstTime !== undefined) updateData.isFirstTime = isFirstTime ? 1 : 0;
    if (isFollowUp !== undefined) updateData.isFollowUp = isFollowUp ? 1 : 0;
    if (followUpOfId !== undefined) updateData.followUpOfId = followUpOfId;
    if (appointmentStatus !== undefined) updateData.status = appointmentStatus;
    
    // Update the appointment in database if there are changes
    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db.update(appointments)
        .set(updateData)
        .where(eq(appointments.id, appointment.id));
    }

    return createSuccessResponse(
      { appointmentId: appointment.id, ...updateData },
      'Cita actualizada exitosamente'
    );
  } catch (error) {
    console.error(`Error updating appointment ${params.eventId}:`, error);
    if (error instanceof Error && error.message === 'The selected time slot is no longer available.') {
      return createErrorResponse('APPOINTMENT_SLOT_UNAVAILABLE', error.message, HTTP_STATUS.CONFLICT);
    }
    return handleDatabaseError(error, 'update appointment');
  }
}

async function handleDeleteRequest(
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  { params }: { params: { eventId: string } }
): Promise<NextResponse> {
  try {
    const { eventId } = params;
    const user = userInfo.user;
    
    // Validate user permissions
    if (user.role !== 'admin' && user.role !== 'asistente') {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'Usuario no tiene permisos para eliminar citas',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Find the appointment first to verify ownership
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

    // Delete from Google Calendar
    await deleteAppointmentEvent({
      eventId,
      doctorId: appointment.doctorId,
    });

    // Mark as canceled in database instead of deleting
    await db.update(appointments)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointment.id));

    return createSuccessResponse(
      { appointmentId: appointment.id },
      'Cita cancelada exitosamente',
      HTTP_STATUS.OK
    );
  } catch (error) {
    console.error(`Error deleting appointment ${params.eventId}:`, error);
    return handleDatabaseError(error, 'delete appointment');
  }
}

export const PATCH = withOptimizedAuthentication(async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  ...args: unknown[]
) => {
  const context = args[0] as { params: { eventId: string } };
  return handlePatchRequest(request, userInfo, context);
});

export const DELETE = withOptimizedAuthentication(async (
  request: NextRequest,
  userInfo: AuthenticatedUserInfo,
  ...args: unknown[]
) => {
  const context = args[0] as { params: { eventId: string } };
  return handleDeleteRequest(request, userInfo, context);
});