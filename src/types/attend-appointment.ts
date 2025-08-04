/**
 * @fileoverview Types and interfaces for the attend appointment API
 * @module types/attend-appointment
 * @author Santiago Prada
 */

import { APIResponse } from './api';
import { AppointmentStatusType } from './appointment-status';

/**
 * Request body for marking an appointment as attended.
 * 
 * @interface AttendAppointmentRequest
 * @property {number} appointmentId - Unique identifier of the appointment to mark as attended
 * @property {string} [notes] - Optional notes about the attendance (max 1000 characters)
 */
export interface AttendAppointmentRequest {
  appointmentId: number;
  notes?: string;
}

/**
 * Response data for attend appointment operation.
 * 
 * @interface AttendAppointmentResponse
 * @property {number} appointmentId - ID of the updated appointment
 * @property {string} status - New status of the appointment (should be 'attended')
 * @property {string} attendedAt - ISO timestamp when the appointment was marked as attended
 * @property {string} [notes] - Updated notes if provided
 */
export interface AttendAppointmentResponse {
  appointmentId: number;
  status: AppointmentStatusType;
  attendedAt: string;
  notes?: string;
}

/**
 * Complete API response type for attend appointment endpoint.
 */
export type AttendAppointmentApiResponse = APIResponse<AttendAppointmentResponse>;

/**
 * Valid appointment states that can be marked as attended.
 */
export type ValidAttendanceStates = 'pending' | 'accepted';

/**
 * Configuration for attend appointment validation.
 */
export interface AttendAppointmentConfig {
  /** Maximum length for notes field */
  maxNotesLength: number;
  /** Valid states that can transition to attended */
  validStatesForAttendance: ValidAttendanceStates[];
  /** Required user roles for this operation */
  requiredRoles: string[];
}

/**
 * Default configuration for attend appointment operations.
 */
export const DEFAULT_ATTEND_CONFIG: AttendAppointmentConfig = {
  maxNotesLength: 1000,
  validStatesForAttendance: ['pending', 'accepted'],
  requiredRoles: ['medico', 'asistente', 'admin']
};

/**
 * Validation result for attend appointment request.
 */
export interface AttendValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Audit information for attend appointment operation.
 */
export interface AttendAuditInfo {
  /** User who performed the operation */
  performedBy: {
    userId: number;
    role: string;
    organizationId: number;
  };
  /** Timestamp of the operation */
  timestamp: Date;
  /** Previous state of the appointment */
  previousState: {
    status: AppointmentStatusType;
    notes?: string;
  };
  /** New state after the operation */
  newState: {
    status: AppointmentStatusType;
    attendedAt: Date;
    notes?: string;
  };
}
