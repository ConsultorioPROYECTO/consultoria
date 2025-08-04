/**
 * @fileoverview Client-side utilities for the attend appointment API
 * @module lib/api/attend-appointment
 * @author Santiago Prada
 */

import { AttendAppointmentRequest, AttendAppointmentResponse } from '@/types/attend-appointment';
import { APIResponse } from '@/types/api';

/**
 * Client-side service for marking appointments as attended.
 * Provides a clean interface for frontend components to interact with the attend appointment API.
 */
export class AttendAppointmentService {
  private static readonly ENDPOINT = '/api/appointments/attend';

  /**
   * Marks an appointment as attended.
   * 
   * @param eventId - Google Calendar event ID of the appointment to mark as attended
   * @param notes - Optional notes about the attendance
   * @param authToken - Firebase authentication token
   * @returns Promise with the API response
   * 
   * @throws {Error} When the request fails or returns an error
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await AttendAppointmentService.markAsAttended(
   *     'google_event_id_123', 
   *     'Consulta completada exitosamente',
   *     await getAuthToken()
   *   );
   *   console.log('Appointment attended:', result.data);
   * } catch (error) {
   *   console.error('Failed to mark appointment as attended:', error.message);
   * }
   * ```
   */
  static async markAsAttended(
    eventId: string,
    notes?: string,
    authToken?: string
  ): Promise<APIResponse<AttendAppointmentResponse>> {
    if (!authToken) {
      throw new Error('Authentication token is required');
    }

    const requestBody: AttendAppointmentRequest = {
      eventId,
      ...(notes && { notes })
    };

    const response = await fetch(this.ENDPOINT, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return result;
  }

  /**
   * Validates if an appointment can be marked as attended based on its current status.
   * 
   * @param currentStatus - Current status of the appointment
   * @returns True if the appointment can be marked as attended
   * 
   * @example
   * ```typescript
   * const canAttend = AttendAppointmentService.canMarkAsAttended('pending');
   * if (canAttend) {
   *   // Show attend button
   * }
   * ```
   */
  static canMarkAsAttended(currentStatus: string): boolean {
    const validStates = ['pending', 'accepted'];
    return validStates.includes(currentStatus.toLowerCase());
  }

  /**
   * Gets a user-friendly message for why an appointment cannot be attended.
   * 
   * @param currentStatus - Current status of the appointment
   * @returns Human-readable message explaining why the appointment cannot be attended
   * 
   * @example
   * ```typescript
   * const message = AttendAppointmentService.getAttendanceBlockedReason('canceled');
   * // Returns: "No se puede marcar como atendida una cita cancelada"
   * ```
   */
  static getAttendanceBlockedReason(currentStatus: string): string {
    const statusMessages: Record<string, string> = {
      'attended': 'La cita ya ha sido marcada como atendida',
      'canceled': 'No se puede marcar como atendida una cita cancelada',
      'rejected': 'No se puede marcar como atendida una cita rechazada'
    };

    return statusMessages[currentStatus.toLowerCase()] || 
           'El estado actual de la cita no permite marcarla como atendida';
  }

  /**
   * Validates notes before sending to the API.
   * 
   * @param notes - Notes to validate
   * @returns Validation result with any errors
   * 
   * @example
   * ```typescript
   * const validation = AttendAppointmentService.validateNotes(userInput);
   * if (!validation.isValid) {
   *   showError(validation.errors[0]);
   *   return;
   * }
   * ```
   */
  static validateNotes(notes?: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        errors.push('Las notas deben ser texto');
      } else if (notes.length > 1000) {
        errors.push('Las notas no pueden exceder 1000 caracteres');
      } else if (notes.trim().length === 0) {
        errors.push('Las notas no pueden estar vacías si se proporcionan');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Hook-style function for React components to mark appointments as attended.
 * Provides loading state and error handling.
 * 
 * @example
 * ```typescript
 * function AppointmentCard({ appointment }) {
 *   const { markAsAttended, isLoading, error } = useAttendAppointment();
 * 
 *   const handleAttend = async () => {
 *     try {
 *       await markAsAttended(appointment.id, 'Consulta completada');
 *       // Handle success
 *     } catch (err) {
 *       // Error is automatically set in the hook
 *     }
 *   };
 * 
 *   return (
 *     <button 
 *       onClick={handleAttend} 
 *       disabled={isLoading || !AttendAppointmentService.canMarkAsAttended(appointment.status)}
 *     >
 *       {isLoading ? 'Marcando...' : 'Marcar como Atendida'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useAttendAppointment() {
  // This would typically use React hooks like useState and useCallback
  // For now, providing the interface that would be implemented
  
  const markAsAttended = async (
    /* appointmentId: number, */
    /* notes?: string */
  ): Promise<AttendAppointmentResponse> => {
    // Implementation would use React hooks for state management
    // and integrate with your auth context for token retrieval
    throw new Error('This function should be implemented with React hooks');
  };

  return {
    markAsAttended,
    isLoading: false, // Would be managed by useState
    error: null,      // Would be managed by useState
    reset: () => {}   // Function to reset error state
  };
}

/**
 * Utility functions for appointment attendance operations.
 */
export const AttendAppointmentUtils = {
  /**
   * Formats the attended timestamp for display.
   */
  formatAttendedAt(attendedAt: string): string {
    const date = new Date(attendedAt);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Gets the appropriate CSS class for appointment status.
   */
  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'accepted': 'bg-blue-100 text-blue-800',
      'attended': 'bg-green-100 text-green-800',
      'canceled': 'bg-red-100 text-red-800',
      'rejected': 'bg-gray-100 text-gray-800'
    };

    return statusClasses[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Gets the Spanish label for appointment status.
   */
  getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      'pending': 'Pendiente',
      'accepted': 'Confirmada',
      'attended': 'Atendida',
      'canceled': 'Cancelada',
      'rejected': 'Rechazada'
    };

    return statusLabels[status.toLowerCase()] || status;
  }
};