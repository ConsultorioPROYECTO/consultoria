import type { calendar_v3 } from 'googleapis';

/**
 * Base interface for event data passed to GoogleCalendarService methods.
 */
export interface BaseEventData {
  calendarId: string;
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  timezone?: string;
  attendees?: calendar_v3.Schema$EventAttendee[];
  location?: string;
  meetingLink?: string;
}

/**
 * Interface for appointment event data, extending BaseEventData
 * with custom private extended properties.
 */
export interface AppointmentEventData extends BaseEventData {
  patientId: string;
  serviceId: string;
  organizationId: string;
  appointmentStatus: string;
}

/**
 * Interface for break time event data, extending BaseEventData
 * with custom private extended properties for break types.
 */
export interface BreakTimeEventData extends BaseEventData {
  isBreakTime: boolean;
  breakTimeType?: string; // e.g., 'lunch', 'personal', 'meeting'
}

/**
 * Defines a time interval with start and end times (HH:MM format).
 */
export interface TimeInterval {
  start: string; // e.g., "09:00"
  end: string;   // e.g., "13:00"
}

/**
 * Defines working hours for a single day of the week.
 */
export interface DailyWorkingHours {
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  intervals: TimeInterval[];
}

/**
 * Represents the structure for a doctor's weekly working hours.
 * This will be stored in the `workingHours` JSON field in the `doctors` schema.
 */
export type DoctorWorkingHours = {
  workingHours: DailyWorkingHours[];
};
