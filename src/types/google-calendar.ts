import type { calendar_v3 } from 'googleapis';
import { DateTime } from 'luxon';

/**
 * Base interface for event data passed to GoogleCalendarService methods.
 * @interface BaseEventData
 * @property {string} calendarId - The ID of the Google Calendar where the event will be created or managed.
 * @property {string} summary - The title or summary of the event.
 * @property {string} [description] - A detailed description of the event. Optional.
 * @property {DateTime} startDateTime - The start date and time of the event as a Luxon DateTime object.
 * @property {DateTime} endDateTime - The end date and time of the event as a Luxon DateTime object.
 * @property {string} [timezone] - The IANA Time Zone Database name for the event (e.g., 'America/Bogota'). Optional. Defaults to 'America/Bogota' if not provided.
 * @property {calendar_v3.Schema$EventAttendee[]} [attendees] - An array of attendees for the event. Optional.
 * @property {string} [location] - The physical location of the event. Optional.
 * @property {string} [meetingLink] - A link to a virtual meeting (e.g., Google Meet link). Optional.
 */
export interface BaseEventData {
  calendarId: string;
  summary: string;
  description?: string;
  startDateTime: DateTime;
  endDateTime: DateTime;
  timezone?: string;
  attendees?: calendar_v3.Schema$EventAttendee[];
  location?: string;
  meetingLink?: string;
}

/**
 * Interface for appointment event data, extending BaseEventData
 * with custom private extended properties specific to appointments.
 * These properties are stored in `extendedProperties.private` in Google Calendar.
 * @interface AppointmentEventData
 * @extends {BaseEventData}
 * @property {number} patientId - The unique identifier of the patient associated with the appointment.
 * @property {number} serviceId - The unique identifier of the medical service for the appointment.
 * @property {number} organizationId - The unique identifier of the organization to which the appointment belongs.
 * @property {string} appointmentStatus - The status of the appointment (e.g., "Confirmada", "Completada", "Pendiente", "Llegó", "Cancelada").
 */
export interface AppointmentEventData extends BaseEventData {
  patientId: number;
  serviceId: number;
  organizationId: number;
  appointmentStatus: string;
}

/**
 * Defines the possible types of break times.
 * @typedef {'lunch' | 'personal' | 'meeting' | 'other'} BreakTimeType
 */
export type BreakTimeType = 'lunch' | 'personal' | 'meeting' | 'other';

/**
 * Interface for break time event data, extending BaseEventData
 * with custom private extended properties for break types.
 * These properties are stored in `extendedProperties.private` in Google Calendar.
 * @interface BreakTimeEventData
 * @extends {BaseEventData}
 * @property {boolean} isBreakTime - A flag indicating that this event represents a break time. Should be `true`.
 * @property {BreakTimeType} [breakTimeType] - The specific type of break. Optional. Defaults to 'other' if not provided.
 */
export interface BreakTimeEventData extends BaseEventData {
  isBreakTime: boolean;
  breakTimeType?: BreakTimeType;
}

/**
 * Defines a time interval with start and end times in HH:MM format.
 * @interface TimeInterval
 * @property {string} start - The start time of the interval (e.g., "09:00").
 * @property {string} end - The end time of the interval (e.g., "13:00").
 */
export interface TimeInterval {
  start: string;
  end: string;
}

/**
 * Defines working hours for a single day of the week.
 * @interface DailyWorkingHours
 * @property {"MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY"} dayOfWeek - The day of the week.
 * @property {TimeInterval[]} intervals - An array of time intervals for the working day.
 */
export interface DailyWorkingHours {
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  intervals: TimeInterval[];
}

/**
 * Represents the structure for a doctor's weekly working hours.
 * This type is intended to be stored in the `working_hours` JSON field in the `doctors` schema.
 * @typedef {object} DoctorWorkingHours
 * @property {DailyWorkingHours[]} workingHours - An array defining the working hours for each day of the week.
 */
export type DoctorWorkingHours = {
  workingHours: DailyWorkingHours[];
};