// src/app/api/appointments/[eventId]/route.ts
import { withAuthorizedUser } from '@/lib/api/auth';
import { successResponse, invalidRequestResponse } from '@/lib/api/response-helpers';
import { updateAppointmentEvent, deleteAppointmentEvent } from '@/lib/db/repositories/appointments';
import { handleDatabaseError } from '@/lib/api-helpers';
import { DateTime } from 'luxon';
import { AppointmentStatus } from '@/lib/calendar-event-manager';

const patchAppointmentHandler = withAuthorizedUser(async (request, user, { params }) => {
  const { eventId } = params;
  try {
    const body = await request.json();
    const { doctorId, startDateTime, endDateTime, appointmentStatus, summary, description } = body;

    if (!doctorId) {
      return invalidRequestResponse('doctorId is required');
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

    return successResponse(updatedEvent, 'Appointment updated successfully');
  } catch (error) {
    console.error(`Error updating appointment ${eventId}:`, error);
    if (error instanceof Error && error.message === 'The selected time slot is no longer available.') {
        return invalidRequestResponse('The selected time slot is no longer available.');
    }
    return handleDatabaseError(error, 'update appointment');
  }
}, ['admin', 'medico']);

const deleteAppointmentHandler = withAuthorizedUser(async (request, user, { params }) => {
  const { eventId } = params;
  if (typeof eventId !== 'string') {
    return invalidRequestResponse('Event ID must be a string.');
  }
  try {
    const { doctorId } = await request.json();

    if (!doctorId) {
      return invalidRequestResponse('doctorId is required');
    }

    await deleteAppointmentEvent({
      eventId,
      doctorId: Number(doctorId),
    });

    return successResponse(null, 'Appointment deleted successfully');
  } catch (error) {
    console.error(`Error deleting appointment ${eventId}:`, error);
    return handleDatabaseError(error, 'delete appointment');
  }
}, ['admin', 'medico']);

export {
  patchAppointmentHandler as PATCH,
  deleteAppointmentHandler as DELETE,
};
