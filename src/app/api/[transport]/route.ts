import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { db } from '@/db';
import { appointments, doctors, medicalServices, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { APPOINTMENT_STATUS, SYNC_STATUS, SyncStatusType } from '@/types/appointment-status';
import { DateTime } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';

/**
 * @fileoverview MCP Server for Medical Consultation Management (mcp-handler implementation)
 * 
 * This file implements a Model Context Protocol (MCP) server using mcp-handler that provides
 * AI assistants with tools to manage medical appointments, doctor availability, and patient information.
 * 
 * ## Features
 * - Supports both Streamable HTTP and SSE transports
 * - Optimized for Next.js App Router with [transport] dynamic routing
 * - Redis support for stateful SSE connections
 * - Comprehensive error handling and validation
 * - Google Calendar synchronization
 * 
 * ## Transport Support
 * - `/api/mcp` - Streamable HTTP (recommended)
 * - `/api/sse` - Server-Sent Events for legacy clients
 * 
 * ## MCP Tools Available
 * 1. `create_appointment` - Creates new medical appointments with calendar sync
 * 2. `get_doctor_availability` - Gets available time slots for a doctor
 * 3. `get_doctor_service_availability` - Gets availability for specific doctor-service combinations
 * 4. `list_doctors` - Lists all available doctors
 * 5. `list_services` - Lists all medical services
 * 6. `get_patient_info` - Retrieves patient information
 */

/**
 * Custom error class for MCP operations
 */
class MCPError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * Helper function to format error responses
 */
function formatErrorResponse(error: unknown): { content: Array<{ type: 'text'; text: string }> } {
  let errorMessage = 'Unknown error occurred';
  let errorCode = 'UNKNOWN_ERROR';
  
  if (error instanceof MCPError) {
    errorMessage = error.message;
    errorCode = error.code;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      })
    }]
  };
}

/**
 * Helper function to format success responses
 */
function formatSuccessResponse(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        data
      })
    }]
  };
}

/**
 * Create MCP handler with all medical consultation tools
 */
const handler = createMcpHandler(
  (server) => {
    /**
     * Create Appointment Tool
     * Creates a new medical appointment with comprehensive validation and calendar sync
     */
    server.tool(
      'create_appointment',
      'Creates a new medical appointment with automatic calendar synchronization. Validates all inputs and provides detailed error messages.',
      {
        doctorId: z.number().describe('Unique identifier for the doctor'),
        identificationType: z.enum(['DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS']).describe('Type of patient identification document'),
        identificationNumber: z.string().describe('Patient identification number'),
        serviceId: z.number().describe('Medical service identifier'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Appointment date in YYYY-MM-DD format'),
        time: z.string().regex(/^\d{2}:\d{2}$/).describe('Appointment time in HH:MM format (24-hour)'),
        isVirtual: z.boolean().optional().describe('Whether the appointment is virtual'),
        meetingLink: z.string().optional().describe('Virtual meeting link (required if isVirtual is true)'),
        notes: z.string().optional().describe('Additional notes for the appointment')
      },
      async (input) => {
        try {
          const defaultOrganizationId = parseInt(process.env.DEFAULT_ORGANIZATION_ID || '1');
          const { doctorId, identificationType, identificationNumber, serviceId, date, time, isVirtual, meetingLink, notes } = input;
          
          // Validate doctor exists
          const doctor = await db.query.doctors.findFirst({ 
            where: eq(doctors.idDoctor, doctorId),
            with: { user: true }
          });
          if (!doctor) throw new MCPError('Doctor not found', 'DOCTOR_NOT_FOUND');
          
          // Validate patient exists
          const patient = await db.query.patients.findFirst({ 
            where: and(
              eq(patients.identificationType, identificationType), 
              eq(patients.identificationNumber, identificationNumber)
            )
          });
          if (!patient) throw new MCPError('Patient not found', 'PATIENT_NOT_FOUND');
          
          // Validate service exists
          const service = await db.query.medicalServices.findFirst({ where: eq(medicalServices.id, serviceId) });
          if (!service) throw new MCPError('Service not found', 'SERVICE_NOT_FOUND');
          
          // Validate appointment date and time
          const appointmentDateTime = DateTime.fromISO(`${date}T${time}`, { zone: doctor.calendar_timezone || 'utc' });
          if (!appointmentDateTime.isValid) throw new MCPError('Invalid date or time format', 'INVALID_DATETIME');
          
          // Don't allow appointments in the past
          if (appointmentDateTime < DateTime.now()) {
            throw new MCPError('Cannot create appointments in the past', 'PAST_APPOINTMENT');
          }
          
          const endTime = appointmentDateTime.plus({ minutes: service.durationMinutes });
          
          // Create appointment
          const [appointmentResult] = await db.insert(appointments).values({
            doctorId,
            patientId: patient.id,
            serviceId,
            organizationId: defaultOrganizationId,
            google_event_id: '',
            google_calendar_id: doctor.calendar_id || '',
            status: APPOINTMENT_STATUS.PENDING,
            sync_status: SYNC_STATUS.PENDING
          });
          
          const appointmentId = appointmentResult.insertId;
          let googleEventId: string | undefined;
          const googleCalendarId: string | undefined = doctor.calendar_id || undefined;
          let syncStatus: SyncStatusType = SYNC_STATUS.NOT_SYNCED;
          
          // Try to create Google Calendar event if doctor has calendar configured
          if (googleCalendarId) {
            try {
              const eventResult = await createAppointmentEvent({
                doctorId: input.doctorId,
                patientId: patient.id,
                serviceId: input.serviceId,
                organizationId: doctor.user?.organizationId || 1,
                startDateTime: appointmentDateTime,
                endDateTime: endTime,
                summary: `${service.name} - ${patient.firstName} ${patient.lastName}`,
                description: `Appointment for ${service.name}\n\nPatient: ${patient.firstName} ${patient.lastName}\nID: ${patient.identificationType} ${patient.identificationNumber}\nPhone: ${patient.phone}\nEmail: ${patient.email}${notes ? `\n\nNotes: ${notes}` : ''}${isVirtual && meetingLink ? `\n\nMeeting Link: ${meetingLink}` : ''}`,
                location: isVirtual ? 'Virtual Meeting' : 'Medical Office',
                meetingLink: input.meetingLink,
                appointmentStatus: AppointmentStatus.Pending
              });
              
              if (eventResult && eventResult.google_event_id) {
                googleEventId = eventResult.google_event_id;
                syncStatus = SYNC_STATUS.SYNCED;
                
                // Update appointment with Google event ID
                await db.update(appointments)
                  .set({ 
                    google_event_id: googleEventId,
                    sync_status: syncStatus
                  })
                  .where(eq(appointments.id, appointmentId));
              } else {
                syncStatus = SYNC_STATUS.FAILED;
                await db.update(appointments)
                  .set({ sync_status: syncStatus })
                  .where(eq(appointments.id, appointmentId));
              }
            } catch (calendarError) {
              console.error('Calendar sync error:', calendarError);
              syncStatus = SYNC_STATUS.FAILED;
              await db.update(appointments)
                .set({ sync_status: syncStatus })
                .where(eq(appointments.id, appointmentId));
            }
          }
          
          return formatSuccessResponse({
            appointmentId,
            status: APPOINTMENT_STATUS.PENDING,
            syncStatus,
            googleEventId,
            appointmentDateTime: appointmentDateTime.toISO(),
            endDateTime: endTime.toISO(),
            doctor: {
              id: doctor.idDoctor,
              name: doctor.user?.displayName || 'Doctor',
              specialization: doctor.speciality
            },
            patient: {
              id: patient.id,
              name: `${patient.firstName} ${patient.lastName}`,
              identificationType: patient.identificationType,
              identificationNumber: patient.identificationNumber
            },
            service: {
              id: service.id,
              name: service.name,
              duration: service.durationMinutes
            }
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * Get Doctor Availability Tool
     * Retrieves available time slots for a specific doctor
     */
    server.tool(
      'get_doctor_availability',
      'Gets available time slots for a doctor on a specific date, considering their calendar and existing appointments.',
      {
        doctorId: z.number().describe('Unique identifier for the doctor'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date to check availability in YYYY-MM-DD format'),
        durationMinutes: z.number().optional().default(30).describe('Duration of the appointment in minutes (default: 30)')
      },
      async (input) => {
        try {
          const { doctorId, date, durationMinutes } = input;
          
          // Validate doctor exists
          const doctor = await db.query.doctors.findFirst({ 
            where: eq(doctors.idDoctor, doctorId),
            with: { user: true }
          });
          if (!doctor) throw new MCPError('Doctor not found', 'DOCTOR_NOT_FOUND');
          
          const targetDate = DateTime.fromISO(date, { zone: doctor.calendar_timezone || 'utc' });
          if (!targetDate.isValid) throw new MCPError('Invalid date format', 'INVALID_DATE');
          
          const startOfDay = targetDate.startOf('day');
          const endOfDay = targetDate.endOf('day');
          const availability = await getDoctorAvailability(doctorId, startOfDay, endOfDay);
          
          return formatSuccessResponse({
            doctorId,
            doctorName: doctor.user?.displayName || 'Doctor',
            date,
            timezone: doctor.calendar_timezone || 'utc',
            durationMinutes,
            availableSlots: availability.map(slot => ({
              startTime: slot.start,
              endTime: slot.end,
              available: true
            }))
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * Get Doctor Service Availability Tool
     * Gets availability for a specific doctor-service combination
     */
    server.tool(
      'get_doctor_service_availability',
      'Gets available time slots for a specific doctor and service combination, using the service duration.',
      {
        doctorId: z.number().describe('Unique identifier for the doctor'),
        serviceId: z.number().describe('Medical service identifier'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date to check availability in YYYY-MM-DD format')
      },
      async (input) => {
        try {
          const { doctorId, serviceId, date } = input;
          
          // Validate doctor exists
          const doctor = await db.query.doctors.findFirst({ 
            where: eq(doctors.idDoctor, doctorId),
            with: { user: true }
          });
          if (!doctor) throw new MCPError('Doctor not found', 'DOCTOR_NOT_FOUND');
          
          // Validate service exists
          const service = await db.query.medicalServices.findFirst({ where: eq(medicalServices.id, serviceId) });
          if (!service) throw new MCPError('Service not found', 'SERVICE_NOT_FOUND');
          
          const targetDate = DateTime.fromISO(date, { zone: doctor.calendar_timezone || 'utc' });
          if (!targetDate.isValid) throw new MCPError('Invalid date format', 'INVALID_DATE');
          
          const startOfDay = targetDate.startOf('day');
          const endOfDay = targetDate.endOf('day');
          const availability = await getDoctorAvailability(doctorId, startOfDay, endOfDay);
          
          return formatSuccessResponse({
            doctorId,
            doctorName: doctor.user?.displayName || 'Doctor',
            serviceId,
            serviceName: service.name,
            serviceDuration: service.durationMinutes,
            date,
            timezone: doctor.calendar_timezone || 'utc',
            availableSlots: availability.map(slot => ({
              startTime: slot.start,
              endTime: slot.end,
              available: true
            }))
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * List Doctors Tool
     * Lists all available doctors with their information
     */
    server.tool(
      'list_doctors',
      'Lists all available doctors with their specializations and basic information.',
      {},
      async () => {
        try {
          const doctorsList = await db.query.doctors.findMany({
            with: { user: true }
          });
          
          return formatSuccessResponse({
            doctors: doctorsList.map(doctor => ({
              id: doctor.idDoctor,
              name: doctor.user?.displayName || 'Doctor',
              specialization: doctor.speciality,
              email: doctor.user?.email || '',
               phone: doctor.user?.phoneNumber || doctor.privatePhone,
              address: 'Consultorio médico',
              hasCalendarIntegration: !!doctor.calendar_id,
              timezone: doctor.calendar_timezone || 'utc'
            }))
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * List Services Tool
     * Lists all available medical services
     */
    server.tool(
      'list_services',
      'Lists all available medical services with their durations and descriptions.',
      {},
      async () => {
        try {
          const servicesList = await db.query.medicalServices.findMany();
          
          return formatSuccessResponse({
            services: servicesList.map(service => ({
              id: service.id,
              name: service.name,
              description: service.description,
              durationMinutes: service.durationMinutes,
              price: parseFloat(service.basePrice)
            }))
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * Get Patient Info Tool
     * Retrieves patient information by identification
     */
    server.tool(
      'get_patient_info',
      'Retrieves patient information using their identification type and number.',
      {
        identificationType: z.enum(['DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS']).describe('Type of patient identification document'),
        identificationNumber: z.string().describe('Patient identification number')
      },
      async (input) => {
        try {
          const { identificationType, identificationNumber } = input;
          
          const patient = await db.query.patients.findFirst({ 
            where: and(
              eq(patients.identificationType, identificationType), 
              eq(patients.identificationNumber, identificationNumber)
            )
          });
          
          if (!patient) throw new MCPError('Patient not found', 'PATIENT_NOT_FOUND');
          
          return formatSuccessResponse({
            id: patient.id,
            name: `${patient.firstName} ${patient.lastName}`,
            identificationType: patient.identificationType,
            identificationNumber: patient.identificationNumber,
            email: patient.email,
            phone: patient.phone,
            dateOfBirth: patient.birthDate,
            gender: patient.gender,
            emergencyContact: patient.emergencyContactName,
            emergencyPhone: patient.emergencyContactPhone
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );
  },
  {
      // Server options
    },
  {
    // Configuration options
    redisUrl: process.env.REDIS_URL, // Optional Redis for SSE state management
    basePath: '/api', // Must match the [transport] route location
    maxDuration: 60, // Maximum duration for SSE connections in seconds
    verboseLogs: process.env.NODE_ENV === 'development' // Enable verbose logging in development
  }
);

// Export handlers for both GET and POST methods
// GET is required for SSE support, POST for Streamable HTTP
export { handler as GET, handler as POST };