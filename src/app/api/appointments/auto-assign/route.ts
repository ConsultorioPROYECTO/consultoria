/**
 * @fileoverview API route for creating appointments with automatic doctor assignment
 * @module api/appointments/auto-assign
 * @author Santiago Prada
 * 
 * This module provides endpoints for creating appointments without specifying a doctorId.
 * The system automatically finds and assigns an available doctor based on:
 * 1. Service capability
 * 2. Date and time availability
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires appointments, doctors, medicalServices, patients from '@/db/schema'
 * @requires eq, and from 'drizzle-orm'
 * @requires authenticateRequest from '@/lib/auth-middleware'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://developers.google.com/calendar/api/v3/reference | Google Calendar API}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, doctors, medicalServices, patients, users, doctorServices, organization } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { APPOINTMENT_STATUS, SYNC_STATUS } from '@/types/appointment-status';
import { handleDatabaseError } from '@/lib/api-helpers';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';
import {
  APIResponse,
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';

// === API Key Authentication ===

/**
 * Authenticates requests using API Key from headers and returns organization information.
 * 
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<{success: boolean, organizationId?: number, error?: string}>} 
 *   Authentication result with organization ID or error
 * 
 * @example
 * ```typescript
 * const authResult = await authenticateApiKey(request);
 * if (!authResult.success) {
 *   return createErrorResponse(API_ERRORS.UNAUTHORIZED, authResult.error);
 * }
 * const organizationId = authResult.organizationId;
 * ```
 * 
 * @security Requires 'X-API-Key' header with valid API key
 */
async function authenticateApiKey(request: NextRequest): Promise<{
  success: boolean;
  organizationId?: number;
  error?: string;
}> {
  try {
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return {
        success: false,
        error: 'API Key requerida en el header X-API-Key'
      };
    }

    // Buscar la organización por API key
    const org = await db.query.organization.findFirst({
      where: eq(organization.apiKey, apiKey),
    });
    
    if (!org) {
      return {
        success: false,
        error: 'API Key inválida'
      };
    }

    return {
      success: true,
      organizationId: org.id
    };
  } catch (error) {
    console.error('Error en autenticación de API Key:', error);
    return {
      success: false,
      error: 'Error interno de autenticación'
    };
  }
}

// === Auto-Assign Appointment API Types ===

/**
 * Request body for creating a new appointment with automatic doctor assignment.
 * 
 * @interface CreateAutoAssignAppointmentRequest
 * @property {string} identificationNumber - Patient's identification number
 * @property {string} identificationType - Type of identification document (CC, TI, CE, etc.)
 * @property {number} serviceId - Unique identifier of the medical service
 * @property {string} date - Date of the appointment in ISO format (YYYY-MM-DD)
 * @property {string} time - Time of the appointment in 24-hour format (HH:MM)
 * @property {boolean} [isVirtual=false] - Whether the appointment is conducted virtually
 * @property {string} [meetingLink] - Meeting link for virtual appointments (required if isVirtual is true)
 * @property {string} [notes] - Additional notes or comments for the appointment
 * 
 * @example
 * ```typescript
 * const appointmentData: CreateAutoAssignAppointmentRequest = {
 *   identificationNumber: "12345678",
 *   identificationType: "CC",
 *   serviceId: 5,
 *   date: "2024-01-15",
 *   time: "14:30",
 *   isVirtual: true,
 *   meetingLink: "https://meet.google.com/abc-defg-hij",
 *   notes: "Consulta de seguimiento"
 * };
 * ```
 */
export interface CreateAutoAssignAppointmentRequest {
  /** Patient's identification number */
  identificationNumber: string;
  /** Type of identification document */
  identificationType: string;
  /** Unique identifier of the medical service */
  serviceId: number;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Time in HH:MM format (24-hour) */
  time: string;
  /** Whether the appointment is virtual */
  isVirtual?: boolean;
  /** Meeting link for virtual appointments */
  meetingLink?: string;
  /** Additional notes for the appointment */
  notes?: string;
}

/**
 * Response data for successful appointment creation with auto-assigned doctor.
 * 
 * @interface CreateAutoAssignAppointmentResponse
 * @property {number} appointmentId - Unique identifier of the created appointment
 * @property {number} assignedDoctorId - ID of the automatically assigned doctor
 * @property {string} assignedDoctorName - Name of the assigned doctor
 * @property {string | null} googleEventId - Google Calendar event ID if calendar integration is enabled
 * @property {string | null} googleCalendarId - Google Calendar ID where the event was created
 * @property {string} status - Initial status of the appointment
 * @property {string} syncStatus - Calendar synchronization status
 * 
 * @example
 * ```typescript
 * const response: CreateAutoAssignAppointmentResponse = {
 *   appointmentId: 456,
 *   assignedDoctorId: 12,
 *   assignedDoctorName: "Dr. Juan Pérez",
 *   googleEventId: "abc123def456",
 *   googleCalendarId: "doctor_calendar_id",
 *   status: "pending",
 *   syncStatus: "synced"
 * };
 * ```
 */
export interface CreateAutoAssignAppointmentResponse {
  /** Unique identifier of the created appointment */
  appointmentId: number;
  /** ID of the automatically assigned doctor */
  assignedDoctorId: number;
  /** Name of the assigned doctor */
  assignedDoctorName: string;
  /** Google Calendar event ID if integration is enabled */
  googleEventId: string | null;
  /** Google Calendar ID where the event was created */
  googleCalendarId: string | null;
  /** Current status of the appointment */
  status: string;
  /** Calendar synchronization status */
  syncStatus: string;
}

/**
 * Type alias for the complete API response when creating an auto-assigned appointment.
 * Combines the standard API response structure with appointment-specific data.
 */
export type CreateAutoAssignAppointmentApiResponse = APIResponse<CreateAutoAssignAppointmentResponse>;

/**
 * Finds the first available doctor for a given service, date, and time.
 * 
 * @param serviceId - ID of the medical service
 * @param organizationId - ID of the organization
 * @param requestedDateTime - Requested appointment date and time
 * @param serviceDurationMinutes - Duration of the service in minutes
 * @returns Promise resolving to the first available doctor or null if none found
 */
async function findAvailableDoctor(
  serviceId: number,
  organizationId: number,
  requestedDateTime: DateTime,
  serviceDurationMinutes: number
): Promise<{
  idDoctor: number;
  doctorName: string;
  calendarTimezone: string | null;
  calendarId: string | null;
} | null> {
  // Get all doctors who can provide this service and belong to the organization
  const availableDoctors = await db
    .select({
      idDoctor: doctors.idDoctor,
      doctorName: users.displayName,
      calendarTimezone: doctors.calendar_timezone,
      calendarId: doctors.calendar_id,
    })
    .from(doctorServices)
    .innerJoin(doctors, eq(doctorServices.doctorId, doctors.idDoctor))
    .innerJoin(users, eq(doctors.userId, users.id))
    .where(
      and(
        eq(doctorServices.serviceId, serviceId),
        eq(doctorServices.isAvailable, true),
        eq(users.organizationId, organizationId)
      )
    );

  if (availableDoctors.length === 0) {
    return null;
  }

  // Check availability for each doctor
  for (const doctor of availableDoctors) {
    if (!doctor.calendarId) {
      continue; // Skip doctors without calendar integration
    }

    try {
      const doctorTimezone = doctor.calendarTimezone || 'America/Bogota';
      const doctorRequestedDateTime = requestedDateTime.setZone(doctorTimezone);
      const endDateTime = doctorRequestedDateTime.plus({ minutes: serviceDurationMinutes });
      
      // Get doctor's availability for the requested day
      const startOfDay = doctorRequestedDateTime.startOf('day');
      const endOfDay = doctorRequestedDateTime.endOf('day');
      
      const availableIntervals = await getDoctorAvailability(
        doctor.idDoctor,
        startOfDay,
        endOfDay
      );

      // Check if the requested time slot is available
      const isTimeSlotAvailable = availableIntervals.some(interval => {
        const intervalStart = interval.start!;
        const intervalEnd = interval.end!;
        
        return doctorRequestedDateTime >= intervalStart && endDateTime <= intervalEnd;
      });

      if (isTimeSlotAvailable) {
        return {
          idDoctor: doctor.idDoctor,
          doctorName: doctor.doctorName || 'Doctor',
          calendarTimezone: doctor.calendarTimezone,
          calendarId: doctor.calendarId,
        };
      }
    } catch (error) {
      console.error(`Error checking availability for doctor ${doctor.idDoctor}:`, error);
      continue; // Skip this doctor and try the next one
    }
  }

  return null; // No available doctor found
}

/**
 * Handles POST request for creating appointments with automatic doctor assignment.
 * 
 * This function performs the following operations:
 * 1. **API Key Authentication**: Validates API key and gets organization ID
 * 2. **Request Validation**: Validates request body format and required fields
 * 3. **Entity Verification**: Ensures patient, service, and organization exist and match
 * 4. **Doctor Assignment**: Automatically finds an available doctor for the service
 * 5. **Calendar Integration**: Creates Google Calendar events if enabled
 * 6. **Database Persistence**: Stores appointment data with proper relationships
 * 
 * @param {NextRequest} request - The incoming HTTP request containing appointment data
 * @returns {Promise<NextResponse<CreateAutoAssignAppointmentApiResponse | ApiError>>} 
 *   JSON response with appointment creation result or error details
 * 
 * @throws {ApiError} When validation fails, entities don't exist, or no doctor is available
 * 
 * @example
 * ```typescript
 * // Successful response
 * {
 *   "success": true,
 *   "message": "Cita creada exitosamente con doctor asignado automáticamente",
 *   "data": {
 *     "appointmentId": 123,
 *     "assignedDoctorId": 12,
 *     "assignedDoctorName": "Dr. Juan Pérez",
 *     "googleEventId": "abc123",
 *     "status": "pending",
 *     "syncStatus": "synced"
 *   }
 * }
 * 
 * // Error response
 * {
 *   "error": "No hay doctores disponibles para el servicio en la fecha y hora solicitadas",
 *   "details": "Intente con otra fecha u hora"
 * }
 * ```
 * 
 * @security Requires valid API key in 'X-API-Key' header
 * @rateLimit Subject to organization-level rate limiting
 */
async function handlePostRequest(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Authenticate using API Key and get organization ID
    const authResult = await authenticateApiKey(request);
    
    if (!authResult.success) {
      return createErrorResponse(
        API_ERRORS.UNAUTHORIZED,
        authResult.error || 'Autenticación fallida',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const organizationId = authResult.organizationId!;

    // Parse and validate request body
    let body: CreateAutoAssignAppointmentRequest;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'JSON inválido en el cuerpo de la petición',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const {
      identificationNumber,
      identificationType,
      serviceId,
      date,
      time,
      isVirtual = false,
      meetingLink,
      notes
    } = body;

    // Validate required fields
    if (!identificationNumber || !identificationType || !serviceId || !date || !time) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Campos requeridos faltantes: identificationNumber, identificationType, serviceId, date, time',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Formato de fecha inválido. Use YYYY-MM-DD',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Formato de hora inválido. Use HH:MM',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Validate virtual appointment requirements
    if (isVirtual && !meetingLink) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'meetingLink es requerido para citas virtuales',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Find patient by identification
    const patient = await db.query.patients.findFirst({
      where: and(
        eq(patients.identificationNumber, identificationNumber),
        eq(patients.identificationType, identificationType as 'DNI' | 'CC' | 'TI' | 'CE' | 'PP' | 'RC' | 'AS'),
        eq(patients.organizationId, organizationId)
      ),
    });

    if (!patient) {
      return createErrorResponse(
        'Paciente no encontrado',
        `No se encontró un paciente con ${identificationType} ${identificationNumber} en esta organización`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Verify medical service exists and belongs to the same organization
    const medicalService = await db.query.medicalServices.findFirst({
      where: eq(medicalServices.id, serviceId),
    });

    if (!medicalService) {
      return createErrorResponse(
        'Servicio médico no encontrado',
        `No se encontró un servicio médico con ID ${serviceId}`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Verify medical service belongs to the same organization
    if (medicalService.organizationId !== organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El servicio médico no pertenece a esta organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Combine date and time into a single DateTime object
    const dateTimeString = `${date}T${time}:00`;
    const requestedDateTime = DateTime.fromISO(dateTimeString, { zone: 'America/Bogota' });

    if (!requestedDateTime.isValid) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Formato de fecha u hora inválido.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Find an available doctor for the service
    const availableDoctor = await findAvailableDoctor(
      serviceId,
      organizationId,
      requestedDateTime,
      medicalService.durationMinutes
    );

    if (!availableDoctor) {
      return createErrorResponse(
        'No hay doctores disponibles',
        'No se encontró ningún doctor disponible para el servicio en la fecha y hora solicitadas. Intente con otra fecha u hora.',
        HTTP_STATUS.CONFLICT
      );
    }

    const endDateTime = requestedDateTime.plus({ minutes: medicalService.durationMinutes });

    // Google Calendar integration
    let googleEventId: string | null = null;
    let googleCalendarId: string | null = null;

    if (availableDoctor.calendarId) {
      try {
        const eventData = {
          doctorId: availableDoctor.idDoctor,
          patientId: patient.id,
          serviceId: medicalService.id,
          organizationId: organizationId,
          startDateTime: requestedDateTime,
          endDateTime: endDateTime,
          summary: `Cita con ${patient.firstName} ${patient.lastName} - ${medicalService.name}`,
          description: notes || `Servicio: ${medicalService.name}\nPaciente: ${patient.firstName} ${patient.lastName}`,
          location: isVirtual ? 'Online' : undefined,
          meetingLink: isVirtual ? meetingLink : undefined,
          appointmentStatus: AppointmentStatus.Pending,
        };

        const calendarEventResponse = await createAppointmentEvent(eventData);
        googleEventId = calendarEventResponse.google_event_id;
        googleCalendarId = calendarEventResponse.google_calendar_id;

      } catch (calendarError) {
        console.error('Error during appointment creation validation:', calendarError);
        if (calendarError instanceof Error) {
          return createErrorResponse(
            'APPOINTMENT_SLOT_UNAVAILABLE',
            calendarError.message,
            HTTP_STATUS.CONFLICT
          );
        }
        return createErrorResponse(
          API_ERRORS.INTERNAL_ERROR,
          'Ocurrió un error inesperado al validar la disponibilidad del calendario.',
          HTTP_STATUS.INTERNAL_ERROR
        );
      }
    }

    // Create appointment in database
    const newAppointment = await db.insert(appointments).values({
      doctorId: availableDoctor.idDoctor,
      patientId: patient.id,
      serviceId: medicalService.id,
      organizationId: organizationId,
      google_event_id: googleEventId || '',
      google_calendar_id: googleCalendarId || '',
      status: APPOINTMENT_STATUS.PENDING,
      sync_status: googleEventId ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING,
      last_sync_attempt: googleEventId ? new Date() : null,
    });

    const insertedAppointmentId = newAppointment[0]?.insertId;

    if (!insertedAppointmentId) {
      return createErrorResponse(
        API_ERRORS.INTERNAL_ERROR,
        'Error al crear la cita en la base de datos',
        HTTP_STATUS.INTERNAL_ERROR
      );
    }

    // Prepare response data
    const responseData: CreateAutoAssignAppointmentResponse = {
      appointmentId: Number(insertedAppointmentId),
      assignedDoctorId: availableDoctor.idDoctor,
      assignedDoctorName: availableDoctor.doctorName,
      googleEventId,
      googleCalendarId,
      status: APPOINTMENT_STATUS.PENDING,
      syncStatus: googleEventId ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING
    };

    return createSuccessResponse(
      responseData,
      'Cita creada exitosamente con doctor asignado automáticamente',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error('Error creating auto-assigned appointment:', error);
    return handleDatabaseError(error, 'crear cita con asignación automática');
  }
}

/**
 * POST endpoint for creating appointments with automatic doctor assignment.
 * 
 * This endpoint handles the creation of medical appointments without requiring a specific doctorId.
 * The system automatically finds and assigns the first available doctor who:
 * 1. Can provide the requested service
 * 2. Has availability at the requested date and time
 * 
 * @route POST /api/appointments/auto-assign
 * @access Protected - Requires API Key authentication
 * 
 * @param {CreateAutoAssignAppointmentRequest} request.body - Appointment creation data
 * @param {string} request.body.identificationNumber - Patient's identification number
 * @param {string} request.body.identificationType - Type of identification document
 * @param {number} request.body.serviceId - Medical service identifier
 * @param {string} request.body.date - Appointment date (YYYY-MM-DD)
 * @param {string} request.body.time - Appointment time (HH:MM)
 * @param {boolean} [request.body.isVirtual=false] - Virtual appointment flag
 * @param {string} [request.body.meetingLink] - Meeting link for virtual appointments
 * @param {string} [request.body.notes] - Additional appointment notes
 * 
 * @returns {CreateAutoAssignAppointmentApiResponse} 201 - Appointment created successfully
 * @returns {ApiError} 400 - Invalid request data
 * @returns {ApiError} 401 - Authentication required (invalid API key)
 * @returns {ApiError} 404 - Entity not found (patient/service)
 * @returns {ApiError} 409 - No available doctor found
 * @returns {ApiError} 500 - Internal server error
 * 
 * @example
 * ```typescript
 * // Request
 * POST /api/appointments/auto-assign
 * X-API-Key: <organization-api-key>
 * Content-Type: application/json
 * 
 * {
 *   "identificationNumber": "12345678",
 *   "identificationType": "CC",
 *   "serviceId": 5,
 *   "date": "2024-01-15",
 *   "time": "14:30",
 *   "isVirtual": true,
 *   "meetingLink": "https://meet.google.com/abc-defg-hij",
 *   "notes": "Consulta de seguimiento"
 * }
 * 
 * // Success Response (201)
 * {
 *   "message": "Cita creada exitosamente con doctor asignado automáticamente",
 *   "data": {
 *     "appointmentId": 456,
 *     "assignedDoctorId": 12,
 *     "assignedDoctorName": "Dr. Juan Pérez",
 *     "googleEventId": "abc123def456",
 *     "googleCalendarId": "doctor_calendar_id",
 *     "status": "pending",
 *     "syncStatus": "synced"
 *   }
 * }
 * 
 * // Error Response (409)
 * {
 *   "error": "No hay doctores disponibles",
 *   "details": "No se encontró ningún doctor disponible para el servicio en la fecha y hora solicitadas. Intente con otra fecha u hora."
 * }
 * ```
 * 
 * @see {@link CreateAutoAssignAppointmentRequest} for request body structure
 * @see {@link CreateAutoAssignAppointmentResponse} for response data structure
 * @see {@link https://developers.google.com/calendar/api | Google Calendar API}
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
export const POST = async (request: NextRequest) => {
  return handlePostRequest(request);
};