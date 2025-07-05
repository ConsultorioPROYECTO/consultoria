import { googleCalendarService } from './google-calendar';
import { DateTime } from 'luxon';
import type { calendar_v3 } from 'googleapis';
import {BreakTimeType } from '../types/google-calendar';
import { db } from '../db';
import { doctors } from '../db/schema/doctors';
import { eq } from 'drizzle-orm';

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
  appointmentStatus: string;
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
      description: data.description,
      location: data.location,
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
