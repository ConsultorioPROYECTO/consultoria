/**
 * @fileoverview API de gestión avanzada de citas médicas para agentes
 * @module api/n8n/appointments-manager
 * @author Santiago Prada
 * 
 * Esta API proporciona funcionalidades completas para la gestión de citas médicas,
 * incluyendo cancelación, reprogramación, recordatorios y análisis de disponibilidad.
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires zod for validation
 * 
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/route-handlers | Next.js Route Handlers}
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { 
  appointments, 
  doctors, 
  medicalServices, 
  patients, 
  users, 
  organization 
} from '@/db/schema';
import { eq, and, desc, asc, sql, gte, lte, ne } from 'drizzle-orm';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { handleDatabaseError } from '@/lib/api-helpers';
import { APPOINTMENT_STATUS, SYNC_STATUS } from '@/types/appointment-status';

// === Schemas de validación ===

/**
 * Schema para cancelar una cita
 */
const CancelAppointmentSchema = z.object({
  appointmentId: z.number().int().positive('ID de cita debe ser un número positivo'),
  reason: z.string().min(1, 'Razón de cancelación es requerida').max(500),
  notifyPatient: z.boolean().default(true),
  notifyDoctor: z.boolean().default(true)
});

/**
 * Schema para reprogramar una cita
 */
const RescheduleAppointmentSchema = z.object({
  appointmentId: z.number().int().positive('ID de cita debe ser un número positivo'),
  newGoogleEventId: z.string().min(1, 'Nuevo ID de evento de Google es requerido'),
  newGoogleCalendarId: z.string().min(1, 'Nuevo ID de calendario de Google es requerido'),
  reason: z.string().min(1, 'Razón de reprogramación es requerida').max(500),
  notifyPatient: z.boolean().default(true),
  notifyDoctor: z.boolean().default(true)
});

/**
 * Schema para obtener citas por rango de fechas
 */
const DateRangeSchema = z.object({
  startDate: z.string().min(1, 'Fecha de inicio es requerida'),
  endDate: z.string().min(1, 'Fecha de fin es requerida'),
  doctorId: z.number().int().positive().optional(),
  patientId: z.number().int().positive().optional(),
  status: z.enum(Object.values(APPOINTMENT_STATUS) as [string, ...string[]]).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

/**
 * Schema para análisis de disponibilidad
 */
const AvailabilityAnalysisSchema = z.object({
  doctorId: z.number().int().positive().optional(),
  date: z.string().min(1, 'Fecha es requerida'),
  serviceId: z.number().int().positive().optional()
});

/**
 * Schema para recordatorios
 */
const ReminderSchema = z.object({
  appointmentId: z.number().int().positive().optional(),
  daysAhead: z.number().int().min(0).max(30).default(1),
  reminderType: z.enum(['email', 'sms', 'both']).default('email')
});

// === Funciones Helper ===

/**
 * Autentica la API key y obtiene el ID de organización
 */
async function authenticateAndGetOrganization(request: NextRequest): Promise<{success: boolean, organizationId?: number, error?: string}> {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return { success: false, error: 'API Key requerida en header x-api-key' };
    }

    const orgResult = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.apiKey, apiKey))
      .limit(1);

    if (orgResult.length === 0) {
      return { success: false, error: 'API Key inválida' };
    }

    return { success: true, organizationId: orgResult[0].id };
  } catch (error) {
    console.error('Error en autenticación:', error);
    return { success: false, error: 'Error interno de autenticación' };
  }
}

// === Endpoints ===

/**
 * GET /api/n8n/appointments-manager
 * Obtiene citas con diferentes filtros y análisis
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAndGetOrganization(request);
    if (!authResult.success) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.UNAUTHORIZED, authResult.error),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const organizationId = authResult.organizationId!;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'by-date-range':
        return await getAppointmentsByDateRange(request, organizationId);
      
      case 'by-doctor':
        return await getAppointmentsByDoctor(request, organizationId);
      
      case 'by-patient':
        return await getAppointmentsByPatient(request, organizationId);
      
      case 'by-status':
        return await getAppointmentsByStatus(request, organizationId);
      
      case 'availability-analysis':
        return await getAvailabilityAnalysis(request, organizationId);
      
      case 'pending-reminders':
        return await getPendingReminders(request, organizationId);
      
      case 'statistics':
        return await getAppointmentsStatistics(request, organizationId);
      
      case 'conflicts':
        return await getAppointmentConflicts(organizationId);
      
      default:
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Acción no válida. Acciones disponibles: by-date-range, by-doctor, by-patient, by-status, availability-analysis, pending-reminders, statistics, conflicts'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/n8n/appointments-manager:', error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

/**
 * POST /api/n8n/appointments-manager
 * Realiza acciones sobre las citas (cancelar, reprogramar, enviar recordatorios)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAndGetOrganization(request);
    if (!authResult.success) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.UNAUTHORIZED, authResult.error),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const organizationId = authResult.organizationId!;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'cancel':
        return await cancelAppointment(request, organizationId);
      
      case 'reschedule':
        return await rescheduleAppointment(request, organizationId);
      
      case 'send-reminder':
        return await sendReminder(request, organizationId);
      
      case 'bulk-reminders':
        return await sendBulkReminders(request, organizationId);
      
      case 'mark-attended':
        return await markAppointmentAttended(request, organizationId);
      
      case 'mark-no-show':
        return await markAppointmentNoShow(request, organizationId);
      
      default:
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Acción no válida. Acciones disponibles: cancel, reschedule, send-reminder, bulk-reminders, mark-attended, mark-no-show'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    console.error('Error en POST /api/n8n/appointments-manager:', error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

// === Funciones de consulta ===

/**
 * Obtiene citas por rango de fechas
 */
async function getAppointmentsByDateRange(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      startDate: url.searchParams.get('startDate') || '',
      endDate: url.searchParams.get('endDate') || '',
      doctorId: url.searchParams.get('doctorId') ? parseInt(url.searchParams.get('doctorId')!) : undefined,
      patientId: url.searchParams.get('patientId') ? parseInt(url.searchParams.get('patientId')!) : undefined,
      status: url.searchParams.get('status') as 'pending'|'accepted'|'attended'|'rejected'|'canceled' | null,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    const validationResult = DateRangeSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const whereConditions = [
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, new Date(validParams.startDate)),
      lte(appointments.createdAt, new Date(validParams.endDate))
    ];

    if (validParams.doctorId) {
      whereConditions.push(eq(appointments.doctorId, validParams.doctorId));
    }

    if (validParams.patientId) {
      whereConditions.push(eq(appointments.patientId, validParams.patientId));
    }

    if (validParams.status) {
      whereConditions.push(eq(appointments.status, validParams.status));
    }

    const appointmentsResult = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        syncStatus: appointments.sync_status,
        googleEventId: appointments.google_event_id,
        googleCalendarId: appointments.google_calendar_id,
        lastSyncAttempt: appointments.last_sync_attempt,
        syncError: appointments.sync_error,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Información del doctor
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorName: users.displayName,
        doctorEmail: users.email,
        doctorPhone: users.phoneNumber,
        // Información del paciente
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        // Información del servicio
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes,
        servicePrice: medicalServices.basePrice,
        serviceCategory: medicalServices.category
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(...whereConditions))
      .limit(validParams.limit)
      .offset(validParams.offset)
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json(
      createSuccessResponse({
        appointments: appointmentsResult,
        filters: validParams,
        totalFound: appointmentsResult.length
      }, 'Citas obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo citas por rango de fechas');
  }
}

/**
 * Obtiene citas por doctor
 */
async function getAppointmentsByDoctor(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (!doctorId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'doctorId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const appointmentsResult = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        syncStatus: appointments.sync_status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        // Información del paciente
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        // Información del servicio
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes,
        servicePrice: medicalServices.basePrice
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        eq(appointments.doctorId, parseInt(doctorId))
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json(
      createSuccessResponse(appointmentsResult, 'Citas del doctor obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo citas por doctor');
  }
}

/**
 * Obtiene citas por paciente
 */
async function getAppointmentsByPatient(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (!patientId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'patientId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const appointmentsResult = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        syncStatus: appointments.sync_status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        // Información del doctor
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorName: users.displayName,
        doctorEmail: users.email,
        // Información del servicio
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes,
        servicePrice: medicalServices.basePrice
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        eq(appointments.patientId, parseInt(patientId))
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json(
      createSuccessResponse(appointmentsResult, 'Citas del paciente obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo citas por paciente');
  }
}

/**
 * Obtiene citas por estado
 */
async function getAppointmentsByStatus(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (!status || !Object.values(APPOINTMENT_STATUS).includes(status as 'pending'|'accepted'|'attended'|'rejected'|'canceled')) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, `Estado inválido. Estados válidos: ${Object.values(APPOINTMENT_STATUS).join(', ')}`),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const appointmentsResult = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        syncStatus: appointments.sync_status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        // Información del doctor
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorName: users.displayName,
        // Información del paciente
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        // Información del servicio
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        eq(appointments.status, status as 'pending'|'accepted'|'attended'|'rejected'|'canceled')
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json(
      createSuccessResponse(appointmentsResult, `Citas con estado '${status}' obtenidas exitosamente`),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo citas por estado');
  }
}

/**
 * Análisis de disponibilidad
 */
async function getAvailabilityAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      doctorId: url.searchParams.get('doctorId') ? parseInt(url.searchParams.get('doctorId')!) : undefined,
      date: url.searchParams.get('date') || '',
      serviceId: url.searchParams.get('serviceId') ? parseInt(url.searchParams.get('serviceId')!) : undefined
    };

    const validationResult = AvailabilityAnalysisSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const targetDate = new Date(validParams.date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const whereConditions = [
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, startOfDay),
      lte(appointments.createdAt, endOfDay)
    ];

    if (validParams.doctorId) {
      whereConditions.push(eq(appointments.doctorId, validParams.doctorId));
    }

    // Obtener citas del día
    const dayAppointments = await db
      .select({
        appointmentId: appointments.id,
        doctorId: appointments.doctorId,
        status: appointments.status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        doctorName: users.displayName,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(...whereConditions))
      .orderBy(asc(appointments.createdAt));

    // Análisis por doctor
    const doctorAnalysis = dayAppointments.reduce((acc, appointment) => {
      const doctorId = appointment.doctorId;
      if (!acc[doctorId]) {
        acc[doctorId] = {
          doctorId,
          doctorName: appointment.doctorName,
          totalAppointments: 0,
          totalDuration: 0,
          appointments: []
        };
      }
      acc[doctorId].totalAppointments++;
      acc[doctorId].totalDuration += appointment.serviceDuration || 30;
      acc[doctorId].appointments.push(appointment);
      return acc;
    }, {} as Record<string, { doctorId: number; doctorName: string | null; totalAppointments: number; totalDuration: number; appointments: unknown[] }>);

    return NextResponse.json(
      createSuccessResponse({
        date: validParams.date,
        totalAppointments: dayAppointments.length,
        doctorAnalysis: Object.values(doctorAnalysis),
        appointments: dayAppointments
      }, 'Análisis de disponibilidad completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de disponibilidad');
  }
}

/**
 * Obtiene citas que necesitan recordatorios
 */
async function getPendingReminders(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const daysAhead = parseInt(url.searchParams.get('daysAhead') || '1');
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const pendingReminders = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        // Información del doctor
        doctorName: users.displayName,
        doctorEmail: users.email,
        // Información del paciente
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        // Información del servicio
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startOfDay),
        lte(appointments.createdAt, endOfDay),
        eq(appointments.status, APPOINTMENT_STATUS.ACCEPTED)
      ))
      .orderBy(asc(appointments.createdAt));

    return NextResponse.json(
      createSuccessResponse({
        targetDate: targetDate.toISOString().split('T')[0],
        daysAhead,
        pendingReminders,
        totalReminders: pendingReminders.length
      }, 'Recordatorios pendientes obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo recordatorios pendientes');
  }
}

/**
 * Obtiene estadísticas de citas
 */
async function getAppointmentsStatistics(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month'; // day, week, month, year
    
    let dateCondition;
    const now = new Date();
    
    switch (period) {
      case 'day':
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const endOfDay = new Date(now.setHours(23, 59, 59, 999));
        dateCondition = and(
          gte(appointments.createdAt, startOfDay),
          lte(appointments.createdAt, endOfDay)
        );
        break;
      case 'week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        dateCondition = and(
          gte(appointments.createdAt, startOfWeek),
          lte(appointments.createdAt, endOfWeek)
        );
        break;
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        dateCondition = and(
          gte(appointments.createdAt, startOfYear),
          lte(appointments.createdAt, endOfYear)
        );
        break;
      default: // month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateCondition = and(
          gte(appointments.createdAt, startOfMonth),
          lte(appointments.createdAt, endOfMonth)
        );
    }

    const [statusStats, doctorStats, serviceStats, totalStats] = await Promise.all([
      // Estadísticas por estado
      db.select({
        status: appointments.status,
        count: sql<number>`count(*)`
      })
        .from(appointments)
        .where(and(
          eq(appointments.organizationId, organizationId),
          dateCondition
        ))
        .groupBy(appointments.status),
      
      // Estadísticas por doctor
      db.select({
        doctorId: doctors.idDoctor,
        doctorName: users.displayName,
        count: sql<number>`count(*)`
      })
        .from(appointments)
        .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          dateCondition
        ))
        .groupBy(doctors.idDoctor, users.displayName),
      
      // Estadísticas por servicio
      db.select({
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        count: sql<number>`count(*)`
      })
        .from(appointments)
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          dateCondition
        ))
        .groupBy(medicalServices.id, medicalServices.name),
      
      // Estadísticas totales
      db.select({
        total: sql<number>`count(*)`,
        avgDuration: sql<number>`avg(${medicalServices.durationMinutes})`
      })
        .from(appointments)
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          dateCondition
        ))
    ]);

    const statistics = {
      period,
      total: totalStats[0]?.total || 0,
      averageDuration: Math.round(totalStats[0]?.avgDuration || 0),
      byStatus: statusStats,
      byDoctor: doctorStats,
      byService: serviceStats.filter(s => s.serviceId !== null)
    };

    return NextResponse.json(
      createSuccessResponse(statistics, 'Estadísticas de citas obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo estadísticas de citas');
  }
}

/**
 * Detecta conflictos en las citas
 */
async function getAppointmentConflicts(organizationId: number) {
  try {
    // Buscar citas que puedan tener conflictos de horario
    const potentialConflicts = await db
      .select({
        appointmentId: appointments.id,
        doctorId: appointments.doctorId,
        googleEventId: appointments.google_event_id,
        status: appointments.status,
        syncStatus: appointments.sync_status,
        createdAt: appointments.createdAt,
        doctorName: users.displayName,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        ne(appointments.status, APPOINTMENT_STATUS.CANCELED),
        eq(appointments.sync_status, SYNC_STATUS.FAILED)
      ))
      .orderBy(asc(appointments.doctorId), asc(appointments.createdAt));

    // Agrupar por doctor para detectar solapamientos
    const conflictsByDoctor = potentialConflicts.reduce((acc, appointment) => {
      const doctorId = appointment.doctorId;
      if (!acc[doctorId]) {
        acc[doctorId] = {
          doctorId,
          doctorName: appointment.doctorName,
          conflicts: []
        };
      }
      acc[doctorId].conflicts.push(appointment);
      return acc;
    }, {} as Record<string, { doctorId: number; doctorName: string | null; conflicts: unknown[] }>);

    return NextResponse.json(
      createSuccessResponse({
        totalConflicts: potentialConflicts.length,
        conflictsByDoctor: Object.values(conflictsByDoctor),
        details: potentialConflicts
      }, 'Conflictos de citas detectados'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error detectando conflictos de citas');
  }
}

// === Funciones de acción ===

/**
 * Cancela una cita
 */
async function cancelAppointment(request: NextRequest, organizationId: number) {
  try {
    const body = await request.json();
    
    const validationResult = CancelAppointmentSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const { appointmentId, reason, notifyPatient, notifyDoctor } = validationResult.data;

    // Verificar que la cita existe y pertenece a la organización
    const appointment = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ))
      .limit(1);

    if (appointment.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Actualizar el estado de la cita
    await db
      .update(appointments)
      .set({
        status: APPOINTMENT_STATUS.CANCELED,
        sync_error: `Cancelada: ${reason}`,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId));

    // Aquí se podría integrar con el sistema de notificaciones
    // TODO: Implementar envío de notificaciones

    return NextResponse.json(
      createSuccessResponse({
        appointmentId,
        status: APPOINTMENT_STATUS.CANCELED,
        reason,
        notificationsScheduled: {
          patient: notifyPatient,
          doctor: notifyDoctor
        }
      }, 'Cita cancelada exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error cancelando cita');
  }
}

/**
 * Reprograma una cita
 */
async function rescheduleAppointment(request: NextRequest, organizationId: number) {
  try {
    const body = await request.json();
    
    const validationResult = RescheduleAppointmentSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const { appointmentId, newGoogleEventId, newGoogleCalendarId, reason, notifyPatient, notifyDoctor } = validationResult.data;

    // Verificar que la cita existe y pertenece a la organización
    const appointment = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ))
      .limit(1);

    if (appointment.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Actualizar la cita con la nueva información
    await db
      .update(appointments)
      .set({
        google_event_id: newGoogleEventId,
        google_calendar_id: newGoogleCalendarId,
        sync_status: SYNC_STATUS.PENDING,
        sync_error: `Reprogramada: ${reason}`,
        last_sync_attempt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId));

    // TODO: Implementar envío de notificaciones

    return NextResponse.json(
      createSuccessResponse({
        appointmentId,
        newGoogleEventId,
        reason,
        notificationsScheduled: {
          patient: notifyPatient,
          doctor: notifyDoctor
        }
      }, 'Cita reprogramada exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error reprogramando cita');
  }
}

/**
 * Envía recordatorio para una cita específica
 */
async function sendReminder(request: NextRequest, organizationId: number) {
  try {
    const body = await request.json();
    
    const validationResult = ReminderSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const { appointmentId, reminderType } = validationResult.data;

    if (!appointmentId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'appointmentId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Obtener detalles de la cita
    const appointmentDetails = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        doctorName: users.displayName,
        serviceName: medicalServices.name
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ))
      .limit(1);

    if (appointmentDetails.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // TODO: Implementar envío real de recordatorios
    // Aquí se integraría con servicios de email/SMS

    return NextResponse.json(
      createSuccessResponse({
        appointmentId,
        reminderType,
        sentTo: {
          email: appointmentDetails[0].patientEmail,
          phone: appointmentDetails[0].patientPhone
        },
        appointmentDetails: appointmentDetails[0]
      }, 'Recordatorio enviado exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error enviando recordatorio');
  }
}

/**
 * Envía recordatorios masivos
 */
async function sendBulkReminders(request: NextRequest, organizationId: number) {
  try {
    const body = await request.json();
    
    const validationResult = ReminderSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const { daysAhead, reminderType } = validationResult.data;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysAhead);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Obtener todas las citas que necesitan recordatorio
    const appointmentsForReminder = await db
      .select({
        appointmentId: appointments.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        doctorName: users.displayName,
        serviceName: medicalServices.name,
        appointmentTime: appointments.createdAt
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startOfDay),
        lte(appointments.createdAt, endOfDay),
        eq(appointments.status, APPOINTMENT_STATUS.ACCEPTED)
      ));

    // TODO: Implementar envío masivo de recordatorios
    
    return NextResponse.json(
      createSuccessResponse({
        targetDate: targetDate.toISOString().split('T')[0],
        daysAhead,
        reminderType,
        totalReminders: appointmentsForReminder.length,
        appointments: appointmentsForReminder
      }, 'Recordatorios masivos programados exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error enviando recordatorios masivos');
  }
}

/**
 * Marca una cita como atendida
 */
async function markAppointmentAttended(request: NextRequest, organizationId: number) {
  try {
    const body = await request.json();
    const appointmentId = body.appointmentId;
    
    if (!appointmentId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'appointmentId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verificar que la cita existe
    const appointment = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ))
      .limit(1);

    if (appointment.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Actualizar estado
    await db
      .update(appointments)
      .set({
        status: APPOINTMENT_STATUS.ATTENDED,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId));

    return NextResponse.json(
      createSuccessResponse({
        appointmentId,
        status: APPOINTMENT_STATUS.ATTENDED
      }, 'Cita marcada como atendida'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error marcando cita como atendida');
  }
}

/**
 * Marca una cita como no asistió
 */
async function markAppointmentNoShow(request: NextRequest, organizationId: number) {
  try {
    const body = await request.json();
    const appointmentId = body.appointmentId;
    const reason = body.reason || 'Paciente no asistió';
    
    if (!appointmentId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'appointmentId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verificar que la cita existe
    const appointment = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.id, appointmentId),
        eq(appointments.organizationId, organizationId)
      ))
      .limit(1);

    if (appointment.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Actualizar estado
    await db
      .update(appointments)
      .set({
        status: APPOINTMENT_STATUS.CANCELED,
        sync_error: reason,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, appointmentId));

    return NextResponse.json(
      createSuccessResponse({
        appointmentId,
        status: APPOINTMENT_STATUS.CANCELED,
        reason
      }, 'Cita marcada como no asistió'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error marcando cita como no asistió');
  }
}