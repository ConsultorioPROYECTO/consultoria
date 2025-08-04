/**
 * @fileoverview Example React component for attending appointments
 * @module examples/AttendAppointmentButton
 * @author Santiago Prada
 */

import React, { useState } from 'react';
import { AttendAppointmentService, AttendAppointmentUtils } from '@/lib/api/attend-appointment';
import { AttendAppointmentResponse } from '@/types/attend-appointment';
// import { useAuth } from '@/contexts/AuthContext'; // Assuming you have an auth context

// Mock auth hook for example purposes
const useAuth = () => ({
  getAuthToken: async () => 'mock-token' // Replace with your actual auth implementation
});

// Example appointment type (adjust based on your actual appointment type)
interface Appointment {
  id: number;
  google_event_id: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  notes?: string;
  attendedAt?: string;
}

interface AttendAppointmentButtonProps {
  appointment: Appointment;
  onAttended?: (updatedAppointment: AttendAppointmentResponse) => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Button component for marking appointments as attended.
 * Includes validation, loading states, and error handling.
 * 
 * @example
 * ```tsx
 * <AttendAppointmentButton
 *   appointment={appointment}
 *   onAttended={(updated) => {
 *     console.log('Appointment attended:', updated);
 *     // Update your local state or refetch data
 *   }}
 *   onError={(error) => {
 *     toast.error(error);
 *   }}
 * />
 * ```
 */
export function AttendAppointmentButton({
  appointment,
  onAttended,
  onError,
  className = ''
}: AttendAppointmentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const { getAuthToken } = useAuth(); // Assuming your auth context provides this

  // Check if appointment can be attended
  const canAttend = AttendAppointmentService.canMarkAsAttended(appointment.status);
  const blockedReason = !canAttend ? 
    AttendAppointmentService.getAttendanceBlockedReason(appointment.status) : null;

  const handleAttendClick = () => {
    if (!canAttend) {
      onError?.(blockedReason || 'No se puede marcar esta cita como atendida');
      return;
    }
    setShowNotesInput(true);
  };

  const handleConfirmAttend = async () => {
    try {
      setIsLoading(true);

      // Validate notes
      const validation = AttendAppointmentService.validateNotes(notes);
      if (!validation.isValid) {
        onError?.(validation.errors[0]);
        return;
      }

      // Get auth token
      const authToken = await getAuthToken();
      if (!authToken) {
        onError?.('No se pudo obtener el token de autenticación');
        return;
      }

      // Mark as attended
      const response = await AttendAppointmentService.markAsAttended(
        appointment.google_event_id,
        notes.trim() || undefined,
        authToken
      );

      // Success callback
      if (response.data) {
        onAttended?.(response.data);
      }
      setShowNotesInput(false);
      setNotes('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowNotesInput(false);
    setNotes('');
  };

  // If already attended, show status
  if (appointment.status === 'attended') {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            AttendAppointmentUtils.getStatusClass(appointment.status)
          }`}>
            {AttendAppointmentUtils.getStatusLabel(appointment.status)}
          </span>
        </div>
        {appointment.attendedAt && (
          <p className="text-sm text-gray-600">
            Atendida el {AttendAppointmentUtils.formatAttendedAt(appointment.attendedAt)}
          </p>
        )}
        {appointment.notes && (
          <p className="text-sm text-gray-700 italic">
            Notas: {appointment.notes}
          </p>
        )}
      </div>
    );
  }

  // If cannot attend, show disabled state
  if (!canAttend) {
    return (
      <div className={`${className}`}>
        <button
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          title={blockedReason || undefined}
        >
          No se puede atender
        </button>
        {blockedReason && (
          <p className="text-sm text-red-600 mt-1">{blockedReason}</p>
        )}
      </div>
    );
  }

  // Show notes input if requested
  if (showNotesInput) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div>
          <label htmlFor="attendance-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notas de la consulta (opcional)
          </label>
          <textarea
            id="attendance-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agregar notas sobre la consulta..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            maxLength={1000}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            {notes.length}/1000 caracteres
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleConfirmAttend}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Marcando...</span>
              </span>
            ) : (
              'Confirmar Asistencia'
            )}
          </button>
          
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // Default state - show attend button
  return (
    <div className={className}>
      <button
        onClick={handleAttendClick}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        Marcar como Atendida
      </button>
    </div>
  );
}

/**
 * Example of a more complete appointment card component
 */
export function AppointmentCard({ appointment, onUpdate }: {
  appointment: Appointment;
  onUpdate?: (appointment: Appointment) => void;
}) {
  const handleAttended = (updatedData: AttendAppointmentResponse) => {
    // Update the appointment with the new data
    const updatedAppointment: Appointment = {
      ...appointment,
      status: 'attended',
      attendedAt: updatedData.attendedAt,
      notes: updatedData.notes || appointment.notes
    };
    onUpdate?.(updatedAppointment);
  };

  const handleError = (error: string) => {
    // Handle error (show toast, etc.)
    console.error('Error attending appointment:', error);
    // You might want to show a toast notification here
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {appointment.patientName}
          </h3>
          <p className="text-sm text-gray-600">
            {appointment.appointmentDate} a las {appointment.appointmentTime}
          </p>
        </div>
        
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          AttendAppointmentUtils.getStatusClass(appointment.status)
        }`}>
          {AttendAppointmentUtils.getStatusLabel(appointment.status)}
        </span>
      </div>

      <AttendAppointmentButton
        appointment={appointment}
        onAttended={handleAttended}
        onError={handleError}
        className="mt-4"
      />
    </div>
  );
}

/**
 * Example usage in a list component
 */
export function AppointmentsList({ appointments }: { appointments: Appointment[] }) {
  const [appointmentList, setAppointmentList] = useState(appointments);

  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setAppointmentList(prev => 
      prev.map(apt => 
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    );
  };

  return (
    <div className="space-y-4">
      {appointmentList.map(appointment => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onUpdate={handleAppointmentUpdate}
        />
      ))}
    </div>
  );
}