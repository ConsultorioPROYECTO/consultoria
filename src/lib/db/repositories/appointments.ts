// src/lib/db/repositories/appointments.ts
import { db } from '@/db';
import { appointments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { googleCalendarService } from '@/lib/google-calendar';
import { AppointmentStatus } from '@/lib/calendar-event-manager';

interface AppointmentEventData {
  eventId: string;
  doctorId: number;
  startDateTime?: DateTime;
  endDateTime?: DateTime;
  appointmentStatus?: AppointmentStatus;
  summary?: string;
  description?: string;
}

export async function updateAppointmentEvent(data: AppointmentEventData) {
  const { eventId, startDateTime, endDateTime, appointmentStatus, summary, description } = data;

  const event = await googleCalendarService.calendar.events.patch({
    calendarId: 'primary',
    eventId: eventId,
    requestBody: {
      ...(startDateTime && { start: { dateTime: startDateTime.toISO() } }),
      ...(endDateTime && { end: { dateTime: endDateTime.toISO() } }),
      ...(summary && { summary }),
      ...(description && { description }),
      ...(appointmentStatus && { extendedProperties: { private: { appointmentStatus } } }),
    },
  });

  return event.data;
}

export async function deleteAppointmentEvent(data: { eventId: string; doctorId: number }) {
  const { eventId } = data;

  await googleCalendarService.calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId,
  });

  // Also update the database to reflect the cancellation
  await db.update(appointments)
    .set({ status: 'cancelled' })
    .where(eq(appointments.google_event_id, eventId));

  return { success: true };
}