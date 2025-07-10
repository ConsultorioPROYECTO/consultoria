import { googleCalendarService } from './google-calendar';
import { DateTime, Interval } from 'luxon';
import type { calendar_v3 } from 'googleapis';
import {BreakTimeType } from '../types/google-calendar';
import { db } from '../db';
import { doctors } from '../db/schema/doctors';
import { eq } from 'drizzle-orm';
import { getDoctorAvailability } from './calendar-event-retriever';


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

/**
 * Enum for out-of-office status.
 */
export enum OutOfOfficeStatus {
  Accepted = 'accepted',
  Rejected = 'rejected',
  Tentative = 'tentative',
}

/**
 * Creates a new appointment event in Google Calendar.
 * @param data - The appointment event data.
 * @returns The Google event ID and calendar ID.
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

    const requestedSlot = Interval.fromDateTimes(
      data.startDateTime.setZone(doctorTimezone),
      data.endDateTime.setZone(doctorTimezone)
    );

    const isAvailable = availableSlots.some(slot =>
      slot.engulfs(requestedSlot)
    );

    if (!isAvailable) {
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
 * Creates a new "out of office" event in Google Calendar to mark a doctor's break time.
 * @param data - The break time event data.
 * @returns The Google event ID and calendar ID.
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
      eventType: 'outOfOffice',
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
          isBreakTime: 'true',
          breakTimeType: data.breakTimeType,
        },
      },
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
 * Updates an existing break time event in Google Calendar.
 * @param data - The data for updating the break time event.
 * @returns The updated Google event data.
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
      extendedProperties: {
        private: {
          isBreakTime: 'true',
          breakTimeType: data.breakTimeType,
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
 * @param data - The data for deleting the break time event.
 * @returns An empty response if successful.
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