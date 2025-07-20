import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { db } from '@/db';
import { appointments, doctors, medicalServices, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createAppointmentEvent, AppointmentStatus } from '@/lib/calendar-event-manager';
import { APPOINTMENT_STATUS, SYNC_STATUS, SyncStatusType } from '@/types/appointment-status';
import { DateTime, Interval } from 'luxon';
import { getDoctorAvailability } from '@/lib/calendar-event-retriever';
// Removiendo tipos innecesarios si status son strings

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

    // Register create_appointment tool
    server.registerTool(
      'create_appointment',
      {
        title: 'Create Appointment',
        description: 'Create a new appointment',
        inputSchema: {
          doctorId: z.number(),
          identificationType: z.enum(['DNI', 'CC', 'TI', 'CE', 'PP', 'RC', 'AS']),
          identificationNumber: z.string(),
          serviceId: z.number(),
          date: z.string(),
          time: z.string(),
          isVirtual: z.boolean().optional(),
          meetingLink: z.string().optional(),
          notes: z.string().optional()
        }
      },
      async (input) => {
        const defaultOrganizationId = parseInt(process.env.DEFAULT_ORGANIZATION_ID || '1');
        const { doctorId, identificationType, identificationNumber, serviceId, date, time, isVirtual = false, meetingLink, notes } = input;
        const doctor = await db.query.doctors.findFirst({ where: eq(doctors.idDoctor, doctorId) });
        if (!doctor) throw new Error('Doctor not found');
        const patient = await db.query.patients.findFirst({ where: and(eq(patients.identificationType, identificationType), eq(patients.identificationNumber, identificationNumber)) });
        if (!patient) throw new Error('Patient not found');
        const service = await db.query.medicalServices.findFirst({ where: eq(medicalServices.id, serviceId) });
        if (!service) throw new Error('Service not found');
        const appointmentDateTime = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', { zone: doctor.calendar_timezone });
        const endTime = appointmentDateTime.plus({ minutes: service.durationMinutes });
        await db.insert(appointments).values({
          doctorId: doctorId,
          patientId: patient.id,
          organizationId: defaultOrganizationId,
          serviceId: serviceId,
          google_event_id: doctor.calendar_id ? '' : '',
          google_calendar_id: doctor.calendar_id || '',
          status: APPOINTMENT_STATUS.PENDING,
          sync_status: SYNC_STATUS.PENDING
        });
        const newAppointment = await db.query.appointments.findFirst({ 
          where: and(
            eq(appointments.doctorId, doctorId), 
            eq(appointments.patientId, patient.id),
            eq(appointments.serviceId, serviceId)
          ),
          orderBy: (appointments, { desc }) => [desc(appointments.id)]
        });
        if (!newAppointment) throw new Error('Failed to create appointment');
        const appointmentId = newAppointment.id;
        let googleEventId = null;
        const googleCalendarId = doctor.calendar_id;
        let syncStatus: SyncStatusType = SYNC_STATUS.PENDING;
        if (doctor.calendar_id) {
          const event = await createAppointmentEvent({
            doctorId,
            patientId: patient.id,
            serviceId,
            organizationId: defaultOrganizationId,
            startDateTime: appointmentDateTime,
            endDateTime: endTime,
            summary: `Appointment with ${patient.firstName} ${patient.lastName}`,
            description: notes || '',
            location: isVirtual ? 'Virtual' : 'Office',
            meetingLink,
            appointmentStatus: AppointmentStatus.Pending
          });
          googleEventId = event.google_event_id;
          syncStatus = SYNC_STATUS.SYNCED;
        }
        await db.update(appointments).set({ 
          google_event_id: googleEventId || undefined, 
          sync_status: syncStatus 
        }).where(eq(appointments.id, appointmentId));
        return { content: [{ type: 'text', text: JSON.stringify({ appointmentId, googleEventId, googleCalendarId, status: APPOINTMENT_STATUS.PENDING, syncStatus }) }] };
      }
    );

    // Register get_doctor_availability tool
    server.registerTool(
      'get_doctor_availability',
      {
        title: 'Get Doctor Availability',
        description: 'Get availability for a doctor on a specific date',
        inputSchema: {
          doctorId: z.number(),
          date: z.string(),
          slotDuration: z.number().optional().default(30)
        }
      },
      async (input) => {
        const { doctorId, date, slotDuration = 30 } = input;
        const targetDate = DateTime.fromISO(date, { zone: 'utc' });
        if (!targetDate.isValid) throw new Error('Invalid date format');
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
            });
            currentSlotStart = currentSlotEnd;
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify(availableSlots) }] };
      }
    );

    // Register get_doctor_service_availability tool
    server.registerTool(
      'get_doctor_service_availability',
      {
        title: 'Get Doctor Service Availability',
        description: 'Get availability for a doctor and service on a specific date',
        inputSchema: {
          doctorId: z.number(),
          serviceId: z.number(),
          date: z.string()
        }
      },
      async (input) => {
        const { doctorId, serviceId, date } = input;
        const doctor = await db.query.doctors.findFirst({ where: eq(doctors.idDoctor, doctorId) });
        if (!doctor || !doctor.calendar_timezone) throw new Error('Doctor or timezone not found');
        const service = await db.query.medicalServices.findFirst({ where: eq(medicalServices.id, serviceId) });
        if (!service) throw new Error('Service not found');
        const slotDuration = service.durationMinutes;
        const targetDate = DateTime.fromISO(date, { zone: doctor.calendar_timezone });
        const startDate = targetDate.startOf('day');
        const endDate = targetDate.endOf('day');
        const availableIntervals = await getDoctorAvailability(doctorId, startDate, endDate);
        const availableSlots = [];
        for (const availInterval of availableIntervals) {
          let currentSlotStart = availInterval.start;
          if (!currentSlotStart || !availInterval.end) continue;
          while (currentSlotStart.plus({ minutes: slotDuration }) <= availInterval.end) {
            const currentSlotEnd = currentSlotStart.plus({ minutes: slotDuration });
            availableSlots.push({
              start: currentSlotStart.toISO({ includeOffset: false }),
              end: currentSlotEnd.toISO({ includeOffset: false }),
            });
            currentSlotStart = currentSlotEnd;
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify({ intervals: availableSlots, timezone: doctor.calendar_timezone }) }] };
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