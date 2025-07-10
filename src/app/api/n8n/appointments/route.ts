/**
 * @fileoverview API route for managing appointments with API Key authentication
 * @module api/n8n/appointments
 * @author Santiago Prada
 * 
 * This module provides endpoints for creating appointments with API Key authentication,
 * designed for external integrations like n8n workflows.
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires appointments, doctors, medicalServices, users, patients from '@/db/schema'
 * @requires eq, and from 'drizzle-orm'
 * @requires createAppointmentEvent from '@/lib/calendar-event-manager'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://developers.google.com/calendar/api/v3/reference | Google Calendar API}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, doctors, medicalServices, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AppointmentStatus, createAppointmentEvent } from '@/lib/calendar-event-manager';
import { APPOINTMENT_STATUS, SYNC_STATUS } from '@/types/appointment-status';
import { handleDatabaseError } from '@/lib/api-helpers';
import { DateTime } from 'luxon';
import {
  APIResponse,
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';

// === API Key Authentication ===

/**
 * Authenticates requests using API Key from headers.
 * 
 * This function validates the API key provided in the request headers.
 * 
 * @param {NextRequest} request - The incoming HTTP request
 * @returns {Promise<{success: boolean, error?: string}>} 
 *   Authentication result or error
 * 
 * @example
 * ```typescript
 * const authResult = await authenticateApiKey(request);
 * if (!authResult.success) {
 *   return createErrorResponse(API_ERRORS.UNAUTHORIZED, authResult.error);
 * }
 * ```
 * 
 * @security Requires 'X-API-Key' header with valid API key
 */
async function authenticateApiKey(request: NextRequest): Promise<{
  success: boolean;
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

    // Verificar API key contra variable de entorno
    const validApiKey = process.env.N8N_API_KEY;
    
    if (!validApiKey) {
      console.error('N8N_API_KEY no está configurada en las variables de entorno');
      return {
        success: false,
        error: 'Configuración de API Key no disponible'
      };
    }

    if (apiKey !== validApiKey) {
      return {
        success: false,
        error: 'API Key inválida'
      };
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error en autenticación de API Key:', error);
    return {
      success: false,
      error: 'Error interno de autenticación'
    };
  }
}

/**
 * Request body for creating a new appointment.
 * 
 * @interface CreateAppointmentRequest
 * @property {number} doctorId - Unique identifier of the doctor for the appointment
 * @property {number} patientId - Unique identifier of the patient for the appointment
 * @property {number} serviceId - Unique identifier of the medical service
 * @property {string} date - Date of the appointment in ISO format (YYYY-MM-DD)
 * @property {string} time - Time of the appointment in 24-hour format (HH:MM)
 * @property {boolean} [isVirtual=false] - Whether the appointment is conducted virtually
 * @property {string} [meetingLink] - Meeting link for virtual appointments (required if isVirtual is true)
 * @property {string} [notes] - Additional notes or comments for the appointment
 * 
 * @example
 * ```typescript
 * const appointmentData: CreateAppointmentRequest = {
 *   doctorId: 1,
 *   patientId: 123,
 *   serviceId: 5,
 *   date: "2024-01-15",
 *   time: "14:30",
 *   isVirtual: true,
 *   meetingLink: "https://meet.google.com/abc-defg-hij",
 *   notes: "Consulta de seguimiento"
 * };
 * ```
 */
export interface CreateAppointmentRequest {
  /** Unique identifier of the doctor */
  doctorId: number;
  /** Unique identifier of the patient */
  patientId: number;
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
 * Response data for successful appointment creation.
 * 
 * @interface CreateAppointmentResponse
 * @property {number} appointmentId - Unique identifier of the created appointment
 * @property {string | null} googleEventId - Google Calendar event ID if calendar integration is enabled
 * @property {string | null} googleCalendarId - Google Calendar ID where the event was created
 * @property {string} status - Initial status of the appointment
 * @property {string} syncStatus - Calendar synchronization status
 * 
 * @example
 * ```typescript
 * const response: CreateAppointmentResponse = {
 *   appointmentId: 456,
 *   googleEventId: "abc123def456",
 *   googleCalendarId: "doctor_calendar_id",
 *   status: "pending",
 *   syncStatus: "synced"
 * };
 * ```
 */
export interface CreateAppointmentResponse {
  /** Unique identifier of the created appointment */
  appointmentId: number;
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
 * Type alias for the complete API response when creating an appointment.
 * Combines the standard API response structure with appointment-specific data.
 */
export type CreateAppointmentApiResponse = APIResponse<CreateAppointmentResponse>;

/**
 * Handles POST request for creating appointments with API Key authentication.
 * 
 * This function performs the following operations:
 * 1. **API Key Authentication**: Validates API key
 * 2. **Request Validation**: Validates request body format and required fields
 * 3. **Entity Verification**: Ensures doctor, patient, and service exist
 * 4. **Calendar Integration**: Creates Google Calendar events if enabled
 * 5. **Database Persistence**: Stores appointment data with proper relationships
 * 
 * @param {NextRequest} request - The incoming HTTP request containing appointment data
 * @returns {Promise<NextResponse<CreateAppointmentApiResponse | ApiError>>} 
 *   JSON response with appointment creation result or error details
 * 
 * @throws {ApiError} When validation fails, entities don't exist, or database operations fail
 * 
 * @example
 * ```typescript
 * // Successful response
 * {
 *   "success": true,
 *   "message": "Cita creada exitosamente",
 *   "data": {
 *     "appointmentId": 123,
 *     "googleEventId": "abc123",
 *     "status": "pending",
 *     "syncStatus": "synced"
 *   }
 * }
 * 
 * // Error response
 * {
 *   "error": "API Key inválida",
 *   "details": "La API Key proporcionada no es válida"
 * }
 * ```
 * 
 * @security Requires valid API key in 'X-API-Key' header
 */
async function handlePostRequest(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Autenticar usando API Key
    const authResult = await authenticateApiKey(request);
    
    if (!authResult.success) {
      return createErrorResponse(
        API_ERRORS.UNAUTHORIZED,
        authResult.error || 'Autenticación fallida',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // Para esta implementación, usaremos la organización por defecto
    const defaultOrganizationId = parseInt(process.env.DEFAULT_ORGANIZATION_ID || '1');

    // Parse and validate request body
    let body: CreateAppointmentRequest;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'JSON inválido en el cuerpo de la petición',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { doctorId, patientId, serviceId, date, time, isVirtual = false, meetingLink, notes } = body;

    // Validate required fields
    if (!doctorId || !patientId || !serviceId || !date || !time) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Campos requeridos faltantes: doctorId, patientId, serviceId, date, time',
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

    // Verify doctor exists and belongs to the organization
    const doctor = await db.query.doctors.findFirst({
      where: eq(doctors.idDoctor, doctorId),
      with: {
        user: true,
      },
    });

    if (!doctor) {
      return createErrorResponse(
        'Doctor no encontrado',
        `No se encontró un doctor con ID ${doctorId}`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Verify doctor belongs to the organization
    if (doctor.user?.organizationId !== defaultOrganizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El doctor no pertenece a la organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Verify patient exists and belongs to the organization
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
    });

    if (!patient) {
      return createErrorResponse(
        'Paciente no encontrado',
        `No se encontró un paciente con ID ${patientId}`,
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Verify patient belongs to the organization
    if (patient.organizationId !== defaultOrganizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El paciente no pertenece a la organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Verify medical service exists and belongs to the organization
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

    // Verify medical service belongs to the organization
    if (medicalService.organizationId !== defaultOrganizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El servicio médico no pertenece a la organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Combine date and time into a single string for Luxon parsing
    const dateTimeString = `${date}T${time}:00`; // Assuming time is HH:MM, add :00 for seconds
    const startDateTime = DateTime.fromISO(dateTimeString, { zone: doctor.calendar_timezone || 'America/Bogota' });

    if (!startDateTime.isValid) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Formato de fecha u hora inválido.',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const endDateTime = startDateTime.plus({ minutes: medicalService.durationMinutes });

    // Google Calendar integration
    let googleEventId: string | null = null;
    let googleCalendarId: string | null = null;

    if (doctor.calendar_id && doctor.calendar_sync_enabled) {
      try {
        const eventData = {
          doctorId: doctor.idDoctor,
          patientId: patient.id,
          serviceId: medicalService.id,
          organizationId: defaultOrganizationId,
          startDateTime: startDateTime,
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
        console.error('Error creating Google Calendar event:', calendarError);
        // Continue without calendar event if there's an error
        // The appointment will still be created in the database
      }
    }

    // Create appointment in database
    const newAppointment = await db.insert(appointments).values({
      doctorId: doctor.idDoctor,
      patientId: patient.id,
      serviceId: medicalService.id,
      organizationId: defaultOrganizationId,
      google_event_id: googleEventId || '',
      google_calendar_id: googleCalendarId || '',
      status: APPOINTMENT_STATUS.PENDING,
      sync_status: googleEventId ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING,
      last_sync_attempt: googleEventId ? new Date() : null,
    })

    const insertedAppointmentId = newAppointment[0]?.insertId;

    if (!insertedAppointmentId) {
      return createErrorResponse(
        API_ERRORS.INTERNAL_ERROR,
        'Error al crear la cita en la base de datos',
        HTTP_STATUS.INTERNAL_ERROR
      );
    }

    // Prepare response data
    const responseData: CreateAppointmentResponse = {
      appointmentId: Number(insertedAppointmentId),
      googleEventId,
      googleCalendarId,
      status: APPOINTMENT_STATUS.PENDING,
      syncStatus: googleEventId ? SYNC_STATUS.SYNCED : SYNC_STATUS.PENDING
    };

    return createSuccessResponse(
      responseData,
      'Cita creada exitosamente',
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    console.error('Error creating appointment:', error);
    return handleDatabaseError(error, 'crear cita');
  }
}

/**
 * POST endpoint for creating appointments with API Key authentication.
 * 
 * This endpoint handles the creation of medical appointments with the following features:
 * - **API Key Authentication**: X-API-Key header validation
 * - **Request Validation**: Basic field validation
 * - **Calendar Integration**: Google Calendar synchronization
 * - **Error Handling**: Detailed validation error messages
 * 
 * @route POST /api/n8n/appointments
 * @access Protected - Requires valid API key
 * @authentication API Key via X-API-Key header
 * 
 * @param {CreateAppointmentRequest} request.body - Appointment creation data
 * @param {number} request.body.doctorId - Doctor's unique identifier
 * @param {number} request.body.patientId - Patient's unique identifier
 * @param {number} request.body.serviceId - Medical service identifier
 * @param {string} request.body.date - Appointment date (YYYY-MM-DD)
 * @param {string} request.body.time - Appointment time (HH:MM)
 * @param {boolean} [request.body.isVirtual=false] - Virtual appointment flag
 * @param {string} [request.body.meetingLink] - Meeting link for virtual appointments
 * @param {string} [request.body.notes] - Additional appointment notes
 * 
 * @returns {CreateAppointmentApiResponse} 201 - Appointment created successfully
 * @returns {ApiError} 400 - Invalid request data
 * @returns {ApiError} 401 - Invalid or missing API key
 * @returns {ApiError} 403 - Insufficient permissions
 * @returns {ApiError} 404 - Entity not found (doctor/patient/service)
 * @returns {ApiError} 500 - Internal server error
 * 
 * @example
 * ```typescript
 * // Request
 * POST /api/n8n/appointments
 * X-API-Key: your-api-key-here
 * Content-Type: application/json
 * 
 * {
 *   "doctorId": 1,
 *   "patientId": 123,
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
 *   "message": "Cita creada exitosamente",
 *   "data": {
 *     "appointmentId": 456,
 *     "googleEventId": "abc123def456",
 *     "googleCalendarId": "calendar123",
 *     "status": "Pendiente",
 *     "syncStatus": "synced"
 *   }
 * }
 * 
 * // Error Response (401)
 * {
 *   "error": "No autorizado",
 *   "details": "API Key inválida"
 * }
 * ```
 * 
 * @see {@link CreateAppointmentRequest} for request body structure
 * @see {@link CreateAppointmentResponse} for response data structure
 * 
 * @since 1.0.0
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePostRequest(request);
}