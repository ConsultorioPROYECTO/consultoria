import { googleCalendarService } from './google-calendar';
import { DateTime, Interval } from 'luxon';
import type { calendar_v3 } from 'googleapis';
import {BreakTimeType } from '../types/google-calendar';
import { db } from '../db';
import { doctors } from '../db/schema/doctors';
import { eq } from 'drizzle-orm';
import { getDoctorAvailability } from './calendar-event-retriever';
import { appointments } from '@/db/schema/appointments';


/**
 * Enum for appointment status.
 */
export enum AppointmentStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Attended = 'attended',
  Rejected = 'rejected',
  Canceled = 'canceled',
}

// Removed OutOfOfficeStatus enum as we no longer use 'outOfOffice' event types
// Break time events are now created as regular events with custom properties

/**
 * Creates a new appointment event in Google Calendar.
 * First checks availability, then creates the event with extended properties.
 *
 * @param data - The appointment event data including doctorId, patientId, startDateTime, etc.
 * @returns Object with google_event_id and google_calendar_id.
 * @throws Error if doctor not found, slot unavailable, or creation fails.
 */
export async function createAppointmentEvent(data: {
  doctorId: number;
  patientId: number;
  serviceId: number;
  organizationId: number;
  startDateTime: DateTime;
  endDateTime: DateTime;
  summary: string;
  description?: string;
  location?: string;
  meetingLink?: string;
  appointmentStatus: AppointmentStatus;
}) {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, data.doctorId),
    });

    if (!doctor) {
      throw new Error(`Doctor with ID ${data.doctorId} not found.`);
    }

    const calendarId = doctor.calendar_id;
    const doctorTimezone = doctor.calendar_timezone;

    if (!calendarId) {
      throw new Error(`Calendar ID not found for doctor with ID ${data.doctorId}.`);
    }

    // 1. Check for availability before creating the event
    const availableSlots = await getDoctorAvailability(
      data.doctorId,
      data.startDateTime,
      data.endDateTime
    );
    console.log('Doctor ID:', data.doctorId);
    console.log('Doctor Timezone:', doctorTimezone);
    console.log('Requested Start:', data.startDateTime.toISO());
    console.log('Requested End:', data.endDateTime.toISO());
    console.log('Available Slots:', availableSlots.map(slot => ({ start: slot.start?.toISO() ?? 'null', end: slot.end?.toISO() ?? 'null' })));

    const requestedSlot = Interval.fromDateTimes(
      data.startDateTime.setZone(doctorTimezone),
      data.endDateTime.setZone(doctorTimezone)
    );
    console.log('Requested Slot:', { start: requestedSlot.start?.toISO() ?? 'null', end: requestedSlot.end?.toISO() ?? 'null' });

    const isAvailable = availableSlots.some(slot =>
      slot.engulfs(requestedSlot)
    );
    console.log('Is Available:', isAvailable);

    if (!isAvailable) {
      console.log('Availability check failed. Throwing error.');
      throw new Error('The selected time slot is no longer available.');
    }

    // 2. If available, proceed to create the event
    const eventBody: calendar_v3.Schema$Event = {
      summary: data.summary,
      description: data.description,
      location: data.location,
      eventType: 'default', // Explicitly set eventType for appointments
      start: {
        dateTime: data.startDateTime.setZone(doctorTimezone).toISO() || undefined,
        timeZone: doctorTimezone,
      },
      end: {
        dateTime: data.endDateTime.setZone(doctorTimezone).toISO() || undefined,
        timeZone: doctorTimezone,
      },
      extendedProperties: {
        private: {
          patientId: data.patientId.toString(),
          serviceId: data.serviceId.toString(),
          organizationId: data.organizationId.toString(),
          appointmentStatus: data.appointmentStatus,
        },
      },
      conferenceData: data.meetingLink ? { createRequest: { requestId: 'meeting' } } : undefined,
    };

    const response = await googleCalendarService.calendar.events.insert({
      calendarId: calendarId,
      requestBody: eventBody,
      conferenceDataVersion: 1, // Required for meeting links
    });

    if (!response.data.id) {
      throw new Error('Failed to create Google Calendar event: Missing event ID.');
    }

    return {
      google_event_id: response.data.id,
      google_calendar_id: calendarId,
    };
  } catch (error) {
    console.error('Error creating appointment event:', error);
    throw error;
  }
}

/**
 * Creates a new break time event in Google Calendar to mark unavailable time.
 * Uses regular event with custom properties.
 *
 * @param data - The break time event data including doctorId, startDateTime, breakTimeType, etc.
 * @returns Object with google_event_id and google_calendar_id.
 * @throws Error if doctor not found or creation fails.
 */
export async function createBreakTimeEvent(data: {
  doctorId: number;
  startDateTime: DateTime;
  endDateTime: DateTime;
  breakTimeType: BreakTimeType;
  summary?: string;
}) {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, data.doctorId),
    });

    if (!doctor) {
      throw new Error(`Doctor with ID ${data.doctorId} not found.`);
    }

    const calendarId = doctor.calendar_id;
    const doctorTimezone = doctor.calendar_timezone;

    if (!calendarId) {
      throw new Error(`Calendar ID not found for doctor with ID ${data.doctorId}.`);
    }

    const eventBody: calendar_v3.Schema$Event = {
      summary: data.summary || 'Break Time',
      // Removed eventType: 'outOfOffice' as it can only be created on primary calendars
      // Using a regular event with custom properties to identify break times
      start: {
        dateTime: data.startDateTime.setZone(doctorTimezone).toISO() || undefined,
        timeZone: doctorTimezone,
      },
      end: {
        dateTime: data.endDateTime.setZone(doctorTimezone).toISO() || undefined,
        timeZone: doctorTimezone,
      },
      extendedProperties: {
        private: {
          eventType: 'break', // Custom property to identify break time events
          isBreakTime: 'true',
          breakTimeType: data.breakTimeType,
        },
      },
      // Mark the event as busy to block the time slot
      transparency: 'opaque',
    };

    const response = await googleCalendarService.calendar.events.insert({
      calendarId: calendarId,
      requestBody: eventBody,
    });

    if (!response.data.id) {
      throw new Error('Failed to create Google Calendar break time event: Missing event ID.');
    }

    return {
      google_event_id: response.data.id,
      google_calendar_id: calendarId,
    };
    } catch (error) {
    console.error('Error creating break time event:', error);
    throw error;
  }
}

/**
 * Updates an existing appointment event in Google Calendar and local DB.
 * Checks availability if dates change, ignoring current event.
 * Merges existing extended properties.
 *
 * @param data - Update data including eventId, doctorId, optional startDateTime, appointmentStatus, etc.
 * @returns The updated Google event data.
 * @throws Error if doctor not found, slot unavailable, or update fails.
 */
export async function updateAppointmentEvent(data: {
  eventId: string;
  doctorId: number;
  startDateTime?: DateTime;
  endDateTime?: DateTime;
  appointmentStatus?: AppointmentStatus;
  summary?: string;
  description?: string;
}) {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, data.doctorId),
    });

    if (!doctor || !doctor.calendar_id) {
      throw new Error(`Doctor or calendar not found for ID ${data.doctorId}.`);
    }

    const { calendar_id: calendarId, calendar_timezone: doctorTimezone } = doctor;

    // First, get the existing event to merge extended properties
    const existingEvent = await googleCalendarService.calendar.events.get({
      calendarId,
      eventId: data.eventId,
    });

    if (!existingEvent.data) {
      throw new Error(`Event with ID ${data.eventId} not found.`);
    }

    // Verificar disponibilidad si se cambian fechas
    if (data.startDateTime || data.endDateTime) {
      const newStart = data.startDateTime || DateTime.fromISO(existingEvent.data.start?.dateTime || '', { zone: doctorTimezone });
      const newEnd = data.endDateTime || DateTime.fromISO(existingEvent.data.end?.dateTime || '', { zone: doctorTimezone });
      const availableSlots = await getDoctorAvailability(
        data.doctorId,
        newStart,
        newEnd,
        { ignoreEventId: data.eventId }
      );
      const requestedSlot = Interval.fromDateTimes(newStart, newEnd);
      const isAvailable = availableSlots.some(slot => slot.engulfs(requestedSlot));
      if (!isAvailable) {
        throw new Error('The selected time slot is no longer available.');
      }
    }

    const privateProperties = existingEvent.data.extendedProperties?.private || {};

    // Prepare the update payload
    const eventBody: calendar_v3.Schema$Event = {
      summary: data.summary,
      description: data.description,
      start: data.startDateTime
        ? { dateTime: data.startDateTime.setZone(doctorTimezone).toISO(), timeZone: doctorTimezone }
        : undefined,
      end: data.endDateTime
        ? { dateTime: data.endDateTime.setZone(doctorTimezone).toISO(), timeZone: doctorTimezone }
        : undefined,
      extendedProperties: {
        private: {
          ...privateProperties,
          ...(data.appointmentStatus && { appointmentStatus: data.appointmentStatus }),
        },
      },
    };

    // Patch the event in Google Calendar
    const response = await googleCalendarService.calendar.events.patch({
      calendarId,
      eventId: data.eventId,
      requestBody: eventBody,
    });

    // If the calendar update is successful, update the local database
    if (response.data && data.appointmentStatus) {
      await db
        .update(appointments)
        .set({ status: data.appointmentStatus, updatedAt: new Date() })
        .where(eq(appointments.google_event_id, data.eventId));
    }

    return response.data;
  } catch (error) {
    console.error('Error updating appointment event:', error);
    throw error;
  }
}

/**
 * Deletes an appointment event from Google Calendar and local DB.
 *
 * @param data - Deletion data including eventId and doctorId.
 * @throws Error if doctor not found or deletion fails.
 */
export async function deleteAppointmentEvent(data: {
  eventId: string;
  doctorId: number;
}) {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, data.doctorId),
    });

    if (!doctor || !doctor.calendar_id) {
      throw new Error(`Doctor or calendar not found for ID ${data.doctorId}.`);
    }

    // Delete the event from Google Calendar
    await googleCalendarService.calendar.events.delete({
      calendarId: doctor.calendar_id,
      eventId: data.eventId,
    });

    // If successful, delete the record from the local database
    await db.delete(appointments).where(eq(appointments.google_event_id, data.eventId));

  } catch (error) {
    console.error('Error deleting appointment event:', error);
    // If the event is already gone from the calendar, we might get a 410 error.
    // We can choose to ignore it and proceed to delete from our DB, or just throw.
    // For now, we throw.
    throw error;
  }
}

/**
 * Updates an existing break time event in Google Calendar.
 *
 * @param data - Update data including doctorId, eventId, optional startDateTime, breakTimeType, etc.
 * @returns The updated Google event data.
 * @throws Error if doctor not found or update fails.
 */
export async function updateBreakTimeEvent(data: {
  doctorId: number;
  eventId: string;
  startDateTime?: DateTime;
  endDateTime?: DateTime;
  breakTimeType?: BreakTimeType;
  summary?: string;
}) {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, data.doctorId),
    });

    if (!doctor) {
      throw new Error(`Doctor with ID ${data.doctorId} not found.`);
    }

    const calendarId = doctor.calendar_id;
    const doctorTimezone = doctor.calendar_timezone;

    if (!calendarId) {
      throw new Error(`Calendar ID not found for doctor with ID ${data.doctorId}.`);
    }

    const eventBody: calendar_v3.Schema$Event = {
      summary: data.summary,
      start: data.startDateTime
        ? {
            dateTime: data.startDateTime.setZone(doctorTimezone).toISO() || undefined,
            timeZone: doctorTimezone,
          }
        : undefined,
      end: data.endDateTime
        ? {
            dateTime: data.endDateTime.setZone(doctorTimezone).toISO() || undefined,
            timeZone: doctorTimezone,
          }
        : undefined,
      extendedProperties: data.breakTimeType ? {
        private: {
          isBreakTime: 'true',
          breakTimeType: data.breakTimeType,
        },
      } : {
        private: {
          isBreakTime: 'true',
        },
      },
    };

    const response = await googleCalendarService.calendar.events.patch({
      calendarId: calendarId,
      eventId: data.eventId,
      requestBody: eventBody,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating break time event:', error);
    throw error;
  }
}

/**
 * Deletes a break time event from Google Calendar.
 *
 * @param data - Deletion data including doctorId and eventId.
 * @returns Empty object on success.
 * @throws Error if doctor not found or deletion fails.
 */
export async function deleteBreakTimeEvent(data: {
  doctorId: number;
  eventId: string;
}) {
  try {
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, data.doctorId),
    });

    if (!doctor) {
      throw new Error(`Doctor with ID ${data.doctorId} not found.`);
    }

    const calendarId = doctor.calendar_id;

    if (!calendarId) {
      throw new Error(`Calendar ID not found for doctor with ID ${data.doctorId}.`);
    }

    await googleCalendarService.calendar.events.delete({
      calendarId: calendarId,
      eventId: data.eventId,
    });

    return {}; // Return an empty object to indicate success
  } catch (error) {
    console.error('Error deleting break time event:', error);
    throw error;
  }
}