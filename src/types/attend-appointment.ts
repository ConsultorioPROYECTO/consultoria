/**
 * Types and Zod schemas for the attend appointment API endpoint.
 * @packageDocumentation
 * @module types/attend-appointment
 * @author Santiago Prada
 */

import { z } from 'zod';

/**
 * Request body for marking an appointment as attended.
 * 
 * @interface AttendAppointmentRequest
 * @property {string} eventId - Google Calendar event ID of the appointment to mark as attended
 * @property {string} [notes] - Optional notes about the attendance/consultation
 * 
 * @example
 * ```typescript
 * const request: AttendAppointmentRequest = {
 *   eventId: 'google_event_id_123',
 *   notes: 'Consulta completada exitosamente. Paciente respondió bien al tratamiento.'
 * };
 * ```
 */
export interface AttendAppointmentRequest {
  /** Google Calendar event ID of the appointment */
  eventId: string;
  /** Optional notes about the attendance/consultation */
  notes?: string;
}

/**
 * Response data for successful appointment attendance marking.
 * 
 * @interface AttendAppointmentResponse
 * @property {number} appointmentId - Database ID of the attended appointment
 * @property {string} eventId - Google Calendar event ID
 * @property {string} status - Updated appointment status (should be 'attended')
 * @property {string} attendedAt - ISO timestamp when the appointment was marked as attended
 * @property {string} [notes] - Notes added during attendance
 * @property {string} syncStatus - Calendar synchronization status
 * 
 * @example
 * ```typescript
 * const response: AttendAppointmentResponse = {
 *   appointmentId: 456,
 *   eventId: 'google_event_id_123',
 *   status: 'attended',
 *   attendedAt: '2024-01-15T10:30:00.000Z',
 *   notes: 'Consulta completada exitosamente',
 *   syncStatus: 'synced'
 * };
 * ```
 */
export interface AttendAppointmentResponse {
  /** Database ID of the attended appointment */
  appointmentId: number;
  /** Google Calendar event ID */
  eventId: string;
  /** Updated appointment status */
  status: string;
  /** ISO timestamp when marked as attended */
  attendedAt: string;
  /** Notes added during attendance */
  notes?: string;
  /** Calendar synchronization status */
  syncStatus: string;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for validating attend appointment request data.
 * 
 * @example
 * ```typescript
 * const validatedRequest = AttendAppointmentRequestSchema.parse(requestBody);
 * ```
 */
export const AttendAppointmentRequestSchema = z.object({
  /** Google Calendar event ID of the appointment */
  eventId: z.string()
    .min(1, 'Event ID is required')
    .max(255, 'Event ID is too long'),
  /** Optional notes about the attendance/consultation */
  notes: z.string()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional()
    .transform(val => val?.trim() || undefined)
});

/**
 * Zod schema for validating attend appointment response data.
 * 
 * @example
 * ```typescript
 * const validatedResponse = AttendAppointmentResponseSchema.parse(responseData);
 * ```
 */
export const AttendAppointmentResponseSchema = z.object({
  /** Database ID of the attended appointment */
  appointmentId: z.number().int().positive(),
  /** Google Calendar event ID */
  eventId: z.string().min(1),
  /** Updated appointment status */
  status: z.string().min(1),
  /** ISO timestamp when marked as attended */
  attendedAt: z.string().datetime(),
  /** Notes added during attendance */
  notes: z.string().optional(),
  /** Calendar synchronization status */
  syncStatus: z.string().min(1)
});

// Type inference from Zod schemas
export type AttendAppointmentRequestZod = z.infer<typeof AttendAppointmentRequestSchema>;
export type AttendAppointmentResponseZod = z.infer<typeof AttendAppointmentResponseSchema>;