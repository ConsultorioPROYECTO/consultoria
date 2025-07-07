import type { calendar_v3 } from 'googleapis';
import { DateTime, Interval } from 'luxon';

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
  id?: string;
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
 * @property {string} [id] - The unique identifier of the event.
 * @property {calendar_v3.Schema$EventAttendee[]} [attendees] - An array of attendees for the event. Optional.
 */
export interface AppointmentEventData extends BaseEventData {
  id?: string;
  patientId: number;
  serviceId: number;
  organizationId: number;
  appointmentStatus: string;
  attendees?: calendar_v3.Schema$EventAttendee[];
}

/**
 * Defines the possible types of break times.
 * @typedef {'lunch' | 'personal' | 'meeting' | 'other'} BreakTimeType
 */
export type BreakTimeType = 'lunch' | 'personal' | 'meeting' | 'other';

export const BREAK_TIME_TYPES = ['lunch', 'personal', 'meeting', 'other'] as const;

export function isBreakTimeType(value: string): value is BreakTimeType {
  return (BREAK_TIME_TYPES as readonly string[]).includes(value);
}

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
 * Represents a time string in a strict "HH:mm" format (e.g., "09:00", "17:30").
 * This type alias provides semantic clarity for strings that are expected
 * to represent a time of day.
 */
export type TimeHHMM = string;

/**
 * A regular expression for validating TimeHHMM format.
 * Ensures the string is in the format HH:MM (e.g., 00:00 to 23:59).
 */
export const TIME_HHMM_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Type guard to validate if a string is a valid TimeHHMM.
 * @param {unknown} value - The value to check.
 * @returns {value is TimeHHMM} - True if the value is a string in "HH:mm" format.
 */
export function isValidTimeHHMM(value: unknown): value is TimeHHMM {
  return typeof value === 'string' && TIME_HHMM_REGEX.test(value);
}

/**
 * Defines a time interval with start and end times.
 * The use of the `TimeHHMM` type ensures that the start and end properties
 * are not just any string, but one that represents a time in "HH:mm" format.
 * @interface TimeInterval
 * @property {TimeHHMM} start - The start time of the interval (e.g., "09:00").
 * @property {TimeHHMM} end - The end time of the interval (e.g., "13:00").
 */
export interface TimeInterval {
  start: TimeHHMM;
  end: TimeHHMM;
}

/**
 * Converts a TimeInterval object into a Luxon Interval object for a specific date.
 * This function is crucial for translating the easily serializable working hours
 * from the database into a format that can be used for date and time calculations.
 *
 * @param {TimeInterval} timeInterval - The time interval to convert, with start and end times in "HH:mm" format.
 * @param {DateTime} date - The specific date for which to create the interval.
 * @param {string} timezone - The IANA timezone (e.g., 'America/Bogota') to ensure the interval is created in the correct timezone.
 * @returns {Interval} A Luxon Interval object representing the time interval for the given date and timezone.
 * @throws {Error} If the start or end times in the timeInterval are invalid, Luxon will throw an error.
 */
export function getTimeIntervalAsLuxonInterval(
  timeInterval: TimeInterval,
  date: DateTime,
  timezone: string
): Interval {
  const startDate = date.set({ 
    hour: parseInt(timeInterval.start.split(':')[0]), 
    minute: parseInt(timeInterval.start.split(':')[1]) 
  }).setZone(timezone);

  const endDate = date.set({ 
    hour: parseInt(timeInterval.end.split(':')[0]), 
    minute: parseInt(timeInterval.end.split(':')[1]) 
  }).setZone(timezone);

  return Interval.fromDateTimes(startDate, endDate);
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
 * Interface for basic calendar events without extended properties.
 * Used for events that don't have custom metadata stored in extendedProperties.private.
 * @interface BasicEventData
 * @extends {BaseEventData}
 * @property {string} eventType - The type of event ('basic' for events without extended properties)
 */
export interface BasicEventData extends BaseEventData {
  eventType: 'basic';
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

/**
 * Union type for all possible event data types.
 */
export type CalendarEventData = AppointmentEventData | BreakTimeEventData | BasicEventData;

/**
 * Type guard to check if an event is an AppointmentEventData.
 * @param {CalendarEventData} event - The event to check.
 * @returns {event is AppointmentEventData} - True if the event is an AppointmentEventData.
 */
export function isAppointmentEvent(event: CalendarEventData): event is AppointmentEventData {
  return 'patientId' in event && 'serviceId' in event && 'organizationId' in event;
}

/**
 * Type guard to check if an event is a BreakTimeEventData.
 * @param {CalendarEventData} event - The event to check.
 * @returns {event is BreakTimeEventData} - True if the event is a BreakTimeEventData.
 */
export function isBreakTimeEvent(event: CalendarEventData): event is BreakTimeEventData {
  return 'isBreakTime' in event && event.isBreakTime === true;
}

/**
 * Type guard to check if an event is a BasicEventData.
 * @param {CalendarEventData} event - The event to check.
 * @returns {event is BasicEventData} - True if the event is a BasicEventData.
 */
export function isBasicEvent(event: CalendarEventData): event is BasicEventData {
  return 'eventType' in event && event.eventType === 'basic';
}