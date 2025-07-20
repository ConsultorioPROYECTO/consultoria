import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { db } from '@/db';
import { appointments, doctors, medicalServices, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { APPOINTMENT_STATUS, SYNC_STATUS, SyncStatusType } from '@/types/appointment-status';
import { DateTime, Interval } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';

/**
 * @fileoverview MCP Server for Medical Consultation Management
 * 
 * This file implements a Model Context Protocol (MCP) server that provides AI assistants
 * with tools to manage medical appointments, doctor availability, and patient information.
 * 
 * ## Features
 * - Create and manage medical appointments
 * - Check doctor availability with real-time calendar integration
 * - Service-specific availability checking
 * - Google Calendar synchronization
 * - Comprehensive error handling and validation
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

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get('mcp-session-id') as string | undefined;
  let transport: StreamableHTTPServerTransport;

  const body = await req.json();

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    const server = new McpServer({
      name: 'consultoria-mcp-server',
      version: '1.0.0'
    });

    /**
     * Create Appointment Tool
     * Creates a new medical appointment with comprehensive validation and calendar sync
     */
    server.registerTool(
      'create_appointment',
      {
        title: 'Create Medical Appointment',
        description: 'Creates a new medical appointment with automatic calendar synchronization. Validates all inputs and provides detailed error messages.',
        inputSchema: {
          doctorId: z.number().describe('Unique identifier for the doctor'),
          identificationType: z.enum(['DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS']).describe('Type of patient identification document'),
          identificationNumber: z.string().describe('Patient identification number'),
          serviceId: z.number().describe('Medical service identifier'),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Appointment date in YYYY-MM-DD format'),
          time: z.string().regex(/^\d{2}:\d{2}$/).describe('Appointment time in HH:MM format (24-hour)'),
          isVirtual: z.boolean().optional().describe('Whether the appointment is virtual'),
          meetingLink: z.string().optional().describe('Virtual meeting link (required if isVirtual is true)'),
          notes: z.string().optional().describe('Additional notes for the appointment')
        }
      },
      async (input) => {
        try {
          const validatedInput = input as {
            doctorId: number;
            identificationType: 'DNI' | 'CC' | 'TI' | 'CE' | 'PP' | 'RC' | 'AS';
            identificationNumber: string;
            serviceId: number;
            date: string;
            time: string;
            isVirtual?: boolean;
            meetingLink?: string;
            notes?: string;
          };
          const defaultOrganizationId = parseInt(process.env.DEFAULT_ORGANIZATION_ID || '1');
          const { doctorId, identificationType, identificationNumber, serviceId, date, time, isVirtual, meetingLink, notes } = validatedInput;
          
          // Validate doctor exists
          const doctor = await db.query.doctors.findFirst({ where: eq(doctors.idDoctor, doctorId) });
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
          
          // Sync with Google Calendar if configured
          if (doctor.calendar_id) {
            try {
              const event = await createAppointmentEvent({
                doctorId,
                patientId: patient.id,
                serviceId,
                organizationId: defaultOrganizationId,
                startDateTime: appointmentDateTime,
                endDateTime: endTime,
                summary: `${service.name} - ${patient.firstName} ${patient.lastName}`,
                description: notes || `Medical appointment for ${service.name}`,
                location: isVirtual ? 'Virtual Meeting' : 'Medical Office',
                meetingLink,
                appointmentStatus: AppointmentStatus.Pending
              });
              googleEventId = event.google_event_id;
              syncStatus = SYNC_STATUS.SYNCED;
            } catch (calendarError) {
              console.error('Calendar sync failed:', calendarError);
              syncStatus = SYNC_STATUS.FAILED;
            }
          }
          
          // Update appointment with calendar information
          await db.update(appointments).set({ 
            google_event_id: googleEventId || undefined, 
            sync_status: syncStatus 
          }).where(eq(appointments.id, appointmentId));
          
          return formatSuccessResponse({
            appointmentId,
            googleEventId,
            googleCalendarId,
            status: APPOINTMENT_STATUS.PENDING,
            syncStatus,
            appointmentDetails: {
              doctor: `Dr. ${doctor.speciality}`,
              patient: `${patient.firstName} ${patient.lastName}`,
              service: service.name,
              dateTime: appointmentDateTime.toISO(),
              duration: service.durationMinutes,
              isVirtual,
              meetingLink: isVirtual ? meetingLink : undefined
            }
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * Get Doctor Availability Tool
     * Retrieves available time slots for a doctor on a specific date
     */
    server.registerTool(
      'get_doctor_availability',
      {
        title: 'Get Doctor Availability',
        description: 'Retrieves available time slots for a doctor on a specific date with customizable slot duration',
        inputSchema: {
          doctorId: z.number().describe('Doctor identifier'),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format'),
          slotDuration: z.number().min(15).max(240).default(30).describe('Duration of each time slot in minutes (15-240), defaults to 30')
        }
      },
      async (input) => {
        try {
          const validatedInput = input as {
            doctorId: number;
            date: string;
            slotDuration?: number;
          };
          const { doctorId, date, slotDuration } = validatedInput;
          
          // Validate doctor exists
          const doctor = await db.query.doctors.findFirst({ where: eq(doctors.idDoctor, doctorId) });
          if (!doctor) throw new MCPError('Doctor not found', 'DOCTOR_NOT_FOUND');
          
          const targetDate = DateTime.fromISO(date, { zone: doctor.calendar_timezone || 'utc' });
          if (!targetDate.isValid) throw new MCPError('Invalid date format', 'INVALID_DATE');
          
          // Don't allow checking availability for past dates
          if (targetDate < DateTime.now().startOf('day')) {
            throw new MCPError('Cannot check availability for past dates', 'PAST_DATE');
          }
          
          const startDate = targetDate.startOf('day');
          const endDate = targetDate.endOf('day');
          const availableIntervals: Interval[] = await getDoctorAvailability(doctorId, startDate, endDate);
          
          const availableSlots = [];
          for (const availInterval of availableIntervals) {
            let currentSlotStart = availInterval.start;
            if (!currentSlotStart || !availInterval.end) continue;
            
            while (currentSlotStart.plus({ minutes: slotDuration }) <= availInterval.end) {
              const currentSlotEnd = currentSlotStart.plus({ minutes: slotDuration });
              availableSlots.push({
                start: currentSlotStart.toISO(),
                end: currentSlotEnd.toISO(),
                startTime: currentSlotStart.toFormat('HH:mm'),
                endTime: currentSlotEnd.toFormat('HH:mm'),
                duration: slotDuration
              });
              currentSlotStart = currentSlotEnd;
            }
          }
          
          return formatSuccessResponse({
            doctorId,
            doctorName: `Dr. ${doctor.speciality}`,
            date,
            timezone: doctor.calendar_timezone || 'UTC',
            slotDuration,
            totalSlots: availableSlots.length,
            availableSlots
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * Get Doctor Service Availability Tool
     * Retrieves available time slots for a specific doctor and service combination
     */
    server.registerTool(
      'get_doctor_service_availability',
      {
        title: 'Get Doctor Service Availability',
        description: 'Retrieves available time slots for a specific doctor and service combination on a given date',
        inputSchema: {
          doctorId: z.number().describe('Doctor identifier'),
          serviceId: z.number().describe('Service identifier'),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date in YYYY-MM-DD format')
        }
      },
      async (input) => {
        try {
          const validatedInput = input as {
            doctorId: number;
            serviceId: number;
            date: string;
          };
          const { doctorId, serviceId, date } = validatedInput;
          
          // Validate doctor exists
          const doctor = await db.query.doctors.findFirst({ where: eq(doctors.idDoctor, doctorId) });
          if (!doctor) throw new MCPError('Doctor not found', 'DOCTOR_NOT_FOUND');
          
          // Validate service exists
          const service = await db.query.medicalServices.findFirst({ where: eq(medicalServices.id, serviceId) });
          if (!service) throw new MCPError('Service not found', 'SERVICE_NOT_FOUND');
          
          const targetDate = DateTime.fromISO(date, { zone: doctor.calendar_timezone || 'utc' });
          if (!targetDate.isValid) throw new MCPError('Invalid date format', 'INVALID_DATE');
          
          // Don't allow checking availability for past dates
          if (targetDate < DateTime.now().startOf('day')) {
            throw new MCPError('Cannot check availability for past dates', 'PAST_DATE');
          }
          
          const startDate = targetDate.startOf('day');
          const endDate = targetDate.endOf('day');
          const availableIntervals: Interval[] = await getDoctorAvailability(doctorId, startDate, endDate);
          
          const availableSlots = [];
          for (const availInterval of availableIntervals) {
            let currentSlotStart = availInterval.start;
            if (!currentSlotStart || !availInterval.end) continue;
            
            while (currentSlotStart.plus({ minutes: service.durationMinutes }) <= availInterval.end) {
              const currentSlotEnd = currentSlotStart.plus({ minutes: service.durationMinutes });
              availableSlots.push({
                start: currentSlotStart.toISO(),
                end: currentSlotEnd.toISO(),
                startTime: currentSlotStart.toFormat('HH:mm'),
                endTime: currentSlotEnd.toFormat('HH:mm'),
                duration: service.durationMinutes
              });
              currentSlotStart = currentSlotEnd;
            }
          }
          
          return formatSuccessResponse({
            doctorId,
            doctorName: `Dr. ${doctor.speciality}`,
            serviceId,
            serviceName: service.name,
            date,
            timezone: doctor.calendar_timezone,
            totalSlots: availableSlots.length,
            availableSlots
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * List Doctors Tool
     * Retrieves all available doctors with their basic information
     */
    server.registerTool(
      'list_doctors',
      {
        title: 'List All Doctors',
        description: 'Retrieves a list of all available doctors with their basic information and specialties',
        inputSchema: {}
      },
      async () => {
        try {
          const doctorsList = await db.query.doctors.findMany();
          
          const formattedDoctors = doctorsList.map(doctor => ({
            id: doctor.idDoctor,
            name: `Dr. ${doctor.speciality}`,
            specialties: [],
            hasCalendarIntegration: !!doctor.calendar_id,
            timezone: doctor.calendar_timezone || 'UTC',
            specialty: doctor.speciality,
            phone: doctor.privatePhone
          }));
          
          return formatSuccessResponse({
            totalDoctors: formattedDoctors.length,
            doctors: formattedDoctors
          });
        } catch (error) {
          return formatErrorResponse(error);
        }
      }
    );

    /**
     * List Services Tool
     * Retrieves all available medical services
     */
    server.registerTool(
      'list_services',
      {
        title: 'List Medical Services',
        description: 'Retrieves a list of all available medical services with their details',
        inputSchema: {}
      },
      async () => {
        try {
          const servicesList = await db.query.medicalServices.findMany();
          
          const formattedServices = servicesList.map(service => ({
            id: service.id,
            name: service.name,
            description: service.description,
            duration: service.durationMinutes,
            price: service.basePrice,
            category: service.category
          }));
          
          return formatSuccessResponse({
            totalServices: formattedServices.length,
            services: formattedServices
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
    server.registerTool(
      'get_patient_info',
      {
        title: 'Get Patient Information',
        description: 'Retrieves patient information using identification type and number',
        inputSchema: {
          identificationType: z.enum(['DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS']).describe('Type of identification document'),
          identificationNumber: z.string().describe('Identification number')
        }
      },
      async (input) => {
        try {
          const validatedInput = input as {
            identificationType: 'DNI' | 'CC' | 'TI' | 'CE' | 'PP' | 'RC' | 'AS';
            identificationNumber: string;
          };
          const { identificationType, identificationNumber } = validatedInput;
          
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

    await server.connect(transport);
  } else {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  // Handle the request
  const res = NextResponse.next();
  await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, body);
  return res;
}

export async function GET(req: NextRequest) {
  return handleSessionRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleSessionRequest(req);
}

async function handleSessionRequest(req: NextRequest) {
  const sessionId = req.headers.get('mcp-session-id') as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    return NextResponse.json({ error: 'Invalid or missing session ID' }, { status: 400 });
  }
  const transport = transports[sessionId];
  const res = NextResponse.next();
  await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  return res;
}