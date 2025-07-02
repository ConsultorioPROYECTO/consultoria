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
 * @requires googleCalendarService from '@/lib/google-calendar'
 * @requires onAppointmentCreated from '@/lib/hooks/calendar-hooks'
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 * @see {@link https://developers.google.com/calendar/api/v3/reference | Google Calendar API}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments, doctors, medicalServices, patients } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { googleCalendarService } from '@/lib/google-calendar';
import { onAppointmentCreated } from '@/lib/hooks/calendar-hooks';
import { handleDatabaseError } from '@/lib/api-helpers';
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
 * This function validates the API key provided in the request headers
 * and returns the associated organization information.
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

    // Para esta implementación, usaremos la organización por defecto
    // En el futuro se puede extender para soportar múltiples organizaciones
    const defaultOrganizationId = parseInt(process.env.DEFAULT_ORGANIZATION_ID || '1');

    return {
      success: true,
      organizationId: defaultOrganizationId
    };
  } catch (error) {
    console.error('Error en autenticación de API Key:', error);
    return {
      success: false,
      error: 'Error interno de autenticación'
    };
  }
}

// === Appointment API Types ===

/**
 * Request body for creating a new appointment via API Key.
 * 
 * @interface CreateAppointmentApiKeyRequest
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
 * const appointmentData: CreateAppointmentApiKeyRequest = {
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
export interface CreateAppointmentApiKeyRequest {
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
 * Response data for successful appointment creation via API Key.
 * 
 * @interface CreateAppointmentApiKeyResponse
 * @property {number} appointmentId - Unique identifier of the created appointment
 * @property {string | null} googleEventId - Google Calendar event ID if calendar integration is enabled
 * @property {string | null} meetingLink - Final meeting link (may be generated by Google Calendar)
 * @property {string} status - Initial status of the appointment
 * @property {string} syncStatus - Calendar synchronization status
 * 
 * @example
 * ```typescript
 * const response: CreateAppointmentApiKeyResponse = {
 *   appointmentId: 456,
 *   googleEventId: "abc123def456",
 *   meetingLink: "https://meet.google.com/generated-link",
 *   status: "Pendiente",
 *   syncStatus: "synced"
 * };
 * ```
 */
export interface CreateAppointmentApiKeyResponse {
  /** Unique identifier of the created appointment */
  appointmentId: number;
  /** Google Calendar event ID if integration is enabled */
  googleEventId: string | null;
  /** Meeting link for the appointment */
  meetingLink: string | null;
  /** Current status of the appointment */
  status: string;
  /** Calendar synchronization status */
  syncStatus: string;
}

/**
 * Type alias for the complete API response when creating an appointment via API Key.
 * Combines the standard API response structure with appointment-specific data.
 */
export type CreateAppointmentApiKeyApiResponse = APIResponse<CreateAppointmentApiKeyResponse>;

/**
 * Handles POST request for creating appointments with API Key authentication.
 * 
 * This function performs the following operations:
 * 1. **API Key Authentication**: Validates API key and retrieves organization context
 * 2. **Request Validation**: Validates request body format and required fields
 * 3. **Entity Verification**: Ensures doctor, patient, and service exist and belong to the organization
 * 4. **Calendar Integration**: Creates Google Calendar events if enabled
 * 5. **Database Persistence**: Stores appointment data with proper relationships
 * 6. **Post-Creation Hooks**: Triggers notification and other post-creation processes
 * 
 * @param {NextRequest} request - The incoming HTTP request containing appointment data
 * @returns {Promise<NextResponse<CreateAppointmentApiKeyApiResponse | ApiError>>} 
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
 *     "meetingLink": "https://meet.google.com/xyz",
 *     "status": "Pendiente",
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
 * @rateLimit Subject to organization-level rate limiting
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

    const organizationId = authResult.organizationId!;

    // 2. Parse and validate request body
    let body: CreateAppointmentApiKeyRequest;
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

    // 3. Validate required fields
    if (!doctorId || !patientId || !serviceId || !date || !time) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Campos requeridos faltantes: doctorId, patientId, serviceId, date, time',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 4. Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Formato de fecha inválido. Use YYYY-MM-DD',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 5. Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'Formato de hora inválido. Use HH:MM',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 6. Validate virtual appointment requirements
    if (isVirtual && !meetingLink) {
      return createErrorResponse(
        API_ERRORS.INVALID_REQUEST,
        'meetingLink es requerido para citas virtuales',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // 7. Verify doctor exists and belongs to the organization
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
    if (doctor.user?.organizationId !== organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El doctor no pertenece a la organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 8. Verify patient exists and belongs to the organization
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
    if (patient.organizationId !== organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El paciente no pertenece a la organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 9. Verify medical service exists and belongs to the organization
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
    if (medicalService.organizationId !== organizationId) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'El servicio médico no pertenece a la organización',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // 10. Calculate appointment start and end times
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    const startDateTime = appointmentDate.toISOString();
    const endDateTime = new Date(
      appointmentDate.getTime() + medicalService.durationMinutes * 60 * 1000
    ).toISOString();

    // 11. Google Calendar integration
    let googleEventId: string | null = null;
    let googleCalendarId: string | null = null;
    let finalMeetingLink = meetingLink;

    if (doctor.calendar_id && doctor.calendar_sync_enabled) {
      try {
        const eventData = {
          calendarId: doctor.calendar_id,
          summary: `Cita con ${patient.firstName} ${patient.lastName} - ${medicalService.name}`,
          description: notes || `Servicio: ${medicalService.name}\nPaciente: ${patient.firstName} ${patient.lastName}`,
          startDateTime: startDateTime,
          endDateTime: endDateTime,
          timezone: doctor.calendar_timezone || 'America/Bogota',
          attendees: patient.email ? [patient.email] : [],
          location: isVirtual ? 'Online' : undefined,
          meetingLink: isVirtual ? meetingLink : undefined,
        };

        const calendarEvent = await googleCalendarService.createAppointmentEvent(eventData);
        googleEventId = calendarEvent.eventId || null;
        googleCalendarId = doctor.calendar_id;
        finalMeetingLink = calendarEvent.meetingLink || meetingLink;
      } catch (calendarError) {
        console.error('Error creating Google Calendar event:', calendarError);
        // Continue without calendar event if there's an error
        // The appointment will still be created in the database
      }
    }

    // 12. Create appointment in database
    const newAppointment = await db.insert(appointments).values({
      doctorId,
      patientId,
      serviceId,
      organizationId,
      date: new Date(date),
      time,
      duration_minutes: medicalService.durationMinutes,
      is_virtual: isVirtual,
      meeting_link: finalMeetingLink,
      notes,
      status: 'Pendiente',
      google_event_id: googleEventId,
      google_calendar_id: googleCalendarId,
      sync_status: googleEventId ? 'synced' : 'pending',
      last_sync_attempt: new Date(),
    });

    const insertedAppointmentId = newAppointment[0]?.insertId;

    if (!insertedAppointmentId) {
      return createErrorResponse(
        API_ERRORS.INTERNAL_ERROR,
        'Error al crear la cita en la base de datos',
        HTTP_STATUS.INTERNAL_ERROR
      );
    }

    // 13. Trigger post-creation hooks
    try {
      await onAppointmentCreated(Number(insertedAppointmentId));
    } catch (hookError) {
      console.error('Error in appointment creation hook:', hookError);
      // Don't fail the request if hooks fail
    }

    // 14. Prepare response data
    const responseData: CreateAppointmentApiKeyResponse = {
      appointmentId: Number(insertedAppointmentId),
      googleEventId,
      meetingLink: finalMeetingLink || null,
      status: 'Pendiente',
      syncStatus: googleEventId ? 'synced' : 'pending'
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
 * - **Organization Isolation**: Multi-tenant data isolation
 * - **Calendar Integration**: Google Calendar synchronization
 * - **Data Validation**: Comprehensive input validation
 * - **Error Handling**: Standardized error responses
 * 
 * @route POST /api/n8n/appointments
 * @access Protected - Requires valid API key
 * @authentication API Key via X-API-Key header
 * 
 * @param {CreateAppointmentApiKeyRequest} request.body - Appointment creation data
 * @param {string} request.body.doctorId - Doctor's unique identifier
 * @param {string} request.body.patientId - Patient's unique identifier
 * @param {string} request.body.serviceId - Medical service identifier
 * @param {string} request.body.date - Appointment date (YYYY-MM-DD)
 * @param {string} request.body.time - Appointment time (HH:MM)
 * @param {boolean} [request.body.isVirtual=false] - Virtual appointment flag
 * @param {string} [request.body.meetingLink] - Meeting link for virtual appointments
 * @param {string} [request.body.notes] - Additional appointment notes
 * 
 * @returns {CreateAppointmentApiKeyApiResponse} 201 - Appointment created successfully
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
 *     "meetingLink": "https://meet.google.com/generated-link",
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
 * @see {@link CreateAppointmentApiKeyRequest} for request body structure
 * @see {@link CreateAppointmentApiKeyResponse} for response data structure
 * @see {@link https://developers.google.com/calendar/api | Google Calendar API}
 * 
 * @since 1.0.0
 * @version 1.0.0
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePostRequest(request);
}