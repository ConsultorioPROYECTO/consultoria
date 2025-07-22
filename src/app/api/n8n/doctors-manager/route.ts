/**
 * @fileoverview API de gestión de doctores y disponibilidad para agentes
 * @module api/n8n/doctors-manager
 * @author Santiago Prada
 * 
 * Esta API proporciona funcionalidades para gestionar doctores, sus horarios,
 * especialidades y análisis de carga de trabajo.
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
  doctors, 
  users, 
  appointments, 
  medicalServices, 
  patients, 
  organization 
} from '@/db/schema';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { handleDatabaseError } from '@/lib/api-helpers';
import { APPOINTMENT_STATUS } from '@/types/appointment-status';

// === Schemas de validación ===

/**
 * Schema para filtros de doctores
 */
const DoctorFiltersSchema = z.object({
  speciality: z.string().optional(),
  isActive: z.boolean().optional(),
  hasCalendar: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

/**
 * Schema para análisis de carga de trabajo
 */
const WorkloadAnalysisSchema = z.object({
  doctorId: z.number().int().positive().optional(),
  startDate: z.string().min(1, 'Fecha de inicio es requerida'),
  endDate: z.string().min(1, 'Fecha de fin es requerida'),
  groupBy: z.enum(['day', 'week', 'month']).default('day')
});

/**
 * Schema para disponibilidad por fecha
 */
const AvailabilityByDateSchema = z.object({
  doctorId: z.number().int().positive().optional(),
  date: z.string().min(1, 'Fecha es requerida'),
  includeAppointments: z.boolean().default(true)
});

/**
 * Schema para estadísticas de rendimiento
 */
const PerformanceStatsSchema = z.object({
  doctorId: z.number().int().positive().optional(),
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month')
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
 * GET /api/n8n/doctors-manager
 * Obtiene información de doctores con diferentes filtros y análisis
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
      case 'list':
        return await getDoctorsList(request, organizationId);
      
      case 'by-speciality':
        return await getDoctorsBySpeciality(request, organizationId);
      
      case 'workload-analysis':
        return await getWorkloadAnalysis(request, organizationId);
      
      case 'availability-by-date':
        return await getAvailabilityByDate(request, organizationId);
      
      case 'performance-stats':
        return await getPerformanceStats(request, organizationId);
      
      case 'schedule-overview':
        return await getScheduleOverview(request, organizationId);
      
      case 'specialities-list':
        return await getSpecialitiesList(organizationId);
      
      case 'doctor-details':
        return await getDoctorDetails(request, organizationId);
      
      default:
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Acción no válida. Acciones disponibles: list, by-speciality, workload-analysis, availability-by-date, performance-stats, schedule-overview, specialities-list, doctor-details'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/n8n/doctors-manager:', error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

// === Funciones de consulta ===

/**
 * Obtiene lista de doctores con filtros
 */
async function getDoctorsList(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      speciality: url.searchParams.get('speciality'),
      isActive: url.searchParams.get('isActive') === 'true',
      hasCalendar: url.searchParams.get('hasCalendar') === 'true',
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    const validationResult = DoctorFiltersSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const whereConditions = [eq(users.organizationId, organizationId)];

    if (validParams.speciality) {
      whereConditions.push(eq(doctors.speciality, validParams.speciality));
    }

    if (validParams.isActive !== undefined) {
      whereConditions.push(eq(users.isActive, validParams.isActive));
    }

    if (validParams.hasCalendar) {
      whereConditions.push(sql`${doctors.calendar_id} IS NOT NULL AND ${doctors.calendar_id} != ''`);
    }

    const doctorsResult = await db
      .select({
        doctorId: doctors.idDoctor,
        userId: users.id,
        speciality: doctors.speciality,
        privatePhone: doctors.privatePhone,
        nitId: doctors.nitId,
        calendarId: doctors.calendar_id,
        tokenGoogleId: doctors.tokenGoogleId,
        // Información del usuario
        displayName: users.displayName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        // Estadísticas básicas
        totalAppointments: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.doctorId} = ${doctors.idDoctor}
        )`,
        activeAppointments: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.doctorId} = ${doctors.idDoctor} 
          AND ${appointments.status} IN ('${APPOINTMENT_STATUS.PENDING}', '${APPOINTMENT_STATUS.ACCEPTED}')
        )`
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...whereConditions))
      .limit(validParams.limit)
      .offset(validParams.offset)
      .orderBy(asc(users.displayName));

    // Contar total de doctores
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...whereConditions));

    return NextResponse.json(
      createSuccessResponse({
        doctors: doctorsResult,
        pagination: {
          total: totalCount[0]?.count || 0,
          limit: validParams.limit,
          offset: validParams.offset,
          hasMore: (totalCount[0]?.count || 0) > validParams.offset + validParams.limit
        },
        filters: validParams
      }, 'Lista de doctores obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo lista de doctores');
  }
}

/**
 * Obtiene doctores por especialidad
 */
async function getDoctorsBySpeciality(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const speciality = url.searchParams.get('speciality');
    
    if (!speciality) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'speciality es requerida'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const doctorsBySpeciality = await db
      .select({
        doctorId: doctors.idDoctor,
        speciality: doctors.speciality,
        displayName: users.displayName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        privatePhone: doctors.privatePhone,
        isActive: users.isActive,
        calendarId: doctors.calendar_id,
        // Estadísticas de citas
        totalAppointments: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.doctorId} = ${doctors.idDoctor}
        )`,
        appointmentsThisMonth: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.doctorId} = ${doctors.idDoctor}
          AND MONTH(${appointments.createdAt}) = MONTH(CURDATE())
          AND YEAR(${appointments.createdAt}) = YEAR(CURDATE())
        )`
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        eq(users.organizationId, organizationId),
        eq(doctors.speciality, speciality),
        eq(users.isActive, true)
      ))
      .orderBy(asc(users.displayName));

    return NextResponse.json(
      createSuccessResponse({
        speciality,
        doctors: doctorsBySpeciality,
        totalDoctors: doctorsBySpeciality.length
      }, `Doctores de especialidad '${speciality}' obtenidos exitosamente`),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo doctores por especialidad');
  }
}

/**
 * Análisis de carga de trabajo de doctores
 */
async function getWorkloadAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      doctorId: url.searchParams.get('doctorId') ? parseInt(url.searchParams.get('doctorId')!) : undefined,
      startDate: url.searchParams.get('startDate') || '',
      endDate: url.searchParams.get('endDate') || '',
      groupBy: url.searchParams.get('groupBy') as 'day'|'week'|'month' || 'day'
    };

    const validationResult = WorkloadAnalysisSchema.safeParse(params);
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

    // Determinar el formato de agrupación
    let dateFormat;
    switch (validParams.groupBy) {
      case 'week':
        dateFormat = sql`YEARWEEK(${appointments.createdAt})`;
        break;
      case 'month':
        dateFormat = sql`DATE_FORMAT(${appointments.createdAt}, '%Y-%m')`;
        break;
      default: // day
        dateFormat = sql`DATE(${appointments.createdAt})`;
    }

    const workloadData = await db
      .select({
        period: dateFormat,
        doctorId: doctors.idDoctor,
        doctorName: users.displayName,
        doctorSpeciality: doctors.speciality,
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        pendingAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.PENDING}' then 1 else 0 end)`,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(...whereConditions))
      .groupBy(dateFormat, doctors.idDoctor, users.displayName, doctors.speciality)
      .orderBy(dateFormat, asc(users.displayName));

    // Calcular estadísticas generales
    const overallStats = workloadData.reduce((acc, curr) => {
      acc.totalAppointments += curr.totalAppointments;
      acc.totalAttended += curr.attendedAppointments;
      acc.totalCanceled += curr.canceledAppointments;
      acc.totalPending += curr.pendingAppointments;
      acc.totalDuration += curr.totalDuration || 0;
      return acc;
    }, {
      totalAppointments: 0,
      totalAttended: 0,
      totalCanceled: 0,
      totalPending: 0,
      totalDuration: 0
    });

    return NextResponse.json(
      createSuccessResponse({
        period: {
          startDate: validParams.startDate,
          endDate: validParams.endDate,
          groupBy: validParams.groupBy
        },
        overallStats,
        workloadByPeriod: workloadData,
        totalRecords: workloadData.length
      }, 'Análisis de carga de trabajo completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de carga de trabajo');
  }
}

/**
 * Obtiene disponibilidad por fecha específica
 */
async function getAvailabilityByDate(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      doctorId: url.searchParams.get('doctorId') ? parseInt(url.searchParams.get('doctorId')!) : undefined,
      date: url.searchParams.get('date') || '',
      includeAppointments: url.searchParams.get('includeAppointments') !== 'false'
    };

    const validationResult = AvailabilityByDateSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const targetDate = new Date(validParams.date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const whereConditions = [eq(users.organizationId, organizationId), eq(users.isActive, true)];
    
    if (validParams.doctorId) {
      whereConditions.push(eq(doctors.idDoctor, validParams.doctorId));
    }

    // Obtener doctores disponibles
    const availableDoctors = await db
      .select({
        doctorId: doctors.idDoctor,
        speciality: doctors.speciality,
        displayName: users.displayName,
        email: users.email,
        calendarId: doctors.calendar_id,
        hasCalendar: sql<boolean>`${doctors.calendar_id} IS NOT NULL AND ${doctors.calendar_id} != ''`
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(asc(users.displayName));

    const result: {
      date: string;
      availableDoctors: typeof availableDoctors;
      totalDoctors: number;
      appointmentsByDoctor?: unknown[];
      totalAppointments?: number;
    } = {
      date: validParams.date,
      availableDoctors,
      totalDoctors: availableDoctors.length
    };

    // Si se incluyen las citas, obtener las citas del día
    if (validParams.includeAppointments) {
      const appointmentWhereConditions = [
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startOfDay),
        lte(appointments.createdAt, endOfDay)
      ];

      if (validParams.doctorId) {
        appointmentWhereConditions.push(eq(appointments.doctorId, validParams.doctorId));
      }

      const dayAppointments = await db
        .select({
          appointmentId: appointments.id,
          doctorId: appointments.doctorId,
          status: appointments.status,
          googleEventId: appointments.google_event_id,
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
        .where(and(...appointmentWhereConditions))
        .orderBy(asc(appointments.createdAt));

      // Agrupar citas por doctor
      const appointmentsByDoctor = dayAppointments.reduce((acc, appointment) => {
        const doctorId = appointment.doctorId;
        if (!acc[doctorId]) {
          acc[doctorId] = {
            doctorId,
            doctorName: appointment.doctorName || 'Doctor sin nombre',
            appointments: [],
            totalAppointments: 0,
            totalDuration: 0
          };
        }
        acc[doctorId].appointments.push(appointment);
        acc[doctorId].totalAppointments++;
        acc[doctorId].totalDuration += appointment.serviceDuration || 30;
        return acc;
      }, {} as Record<string, { doctorId: number; doctorName: string; appointments: unknown[]; totalAppointments: number; totalDuration: number }>);

      result.appointmentsByDoctor = Object.values(appointmentsByDoctor);
      result.totalAppointments = dayAppointments.length;
    }

    return NextResponse.json(
      createSuccessResponse(result, 'Disponibilidad por fecha obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo disponibilidad por fecha');
  }
}

/**
 * Obtiene estadísticas de rendimiento de doctores
 */
async function getPerformanceStats(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      doctorId: url.searchParams.get('doctorId') ? parseInt(url.searchParams.get('doctorId')!) : undefined,
      period: url.searchParams.get('period') as 'week'|'month'|'quarter'|'year' || 'month'
    };

    const validationResult = PerformanceStatsSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;
    
    switch (validParams.period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default: // month
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const whereConditions = [
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, startDate)
    ];

    if (validParams.doctorId) {
      whereConditions.push(eq(appointments.doctorId, validParams.doctorId));
    }

    const performanceStats = await db
      .select({
        doctorId: doctors.idDoctor,
        doctorName: users.displayName,
        doctorSpeciality: doctors.speciality,
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        pendingAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.PENDING}' then 1 else 0 end)`,
        acceptedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ACCEPTED}' then 1 else 0 end)`,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        // Calcular tasas
        attendanceRate: sql<number>`
          case when count(*) > 0 then 
            round((sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*), 2)
          else 0 end
        `,
        cancellationRate: sql<number>`
          case when count(*) > 0 then 
            round((sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end) * 100.0) / count(*), 2)
          else 0 end
        `
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(...whereConditions))
      .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
      .orderBy(desc(sql`count(*)`));

    // Calcular estadísticas generales
    const overallStats = performanceStats.reduce((acc, curr) => {
      acc.totalAppointments += curr.totalAppointments;
      acc.totalAttended += curr.attendedAppointments;
      acc.totalCanceled += curr.canceledAppointments;
      acc.totalPending += curr.pendingAppointments;
      acc.totalAccepted += curr.acceptedAppointments;
      acc.totalDuration += curr.totalDuration || 0;
      acc.totalUniquePatients += curr.uniquePatients;
      return acc;
    }, {
      totalAppointments: 0,
      totalAttended: 0,
      totalCanceled: 0,
      totalPending: 0,
      totalAccepted: 0,
      totalDuration: 0,
      totalUniquePatients: 0
    });

    // Calcular tasas generales
    const overallAttendanceRate = overallStats.totalAppointments > 0 
      ? Math.round((overallStats.totalAttended * 100) / overallStats.totalAppointments * 100) / 100
      : 0;
    
    const overallCancellationRate = overallStats.totalAppointments > 0 
      ? Math.round((overallStats.totalCanceled * 100) / overallStats.totalAppointments * 100) / 100
      : 0;

    return NextResponse.json(
      createSuccessResponse({
        period: validParams.period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        overallStats: {
          ...overallStats,
          overallAttendanceRate,
          overallCancellationRate,
          averageDurationOverall: overallStats.totalAppointments > 0 
            ? Math.round(overallStats.totalDuration / overallStats.totalAppointments)
            : 0
        },
        doctorStats: performanceStats,
        totalDoctors: performanceStats.length
      }, 'Estadísticas de rendimiento obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo estadísticas de rendimiento');
  }
}

/**
 * Obtiene resumen de horarios de doctores
 */
async function getScheduleOverview(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Obtener todos los doctores activos
    const activeDoctors = await db
      .select({
        doctorId: doctors.idDoctor,
        speciality: doctors.speciality,
        displayName: users.displayName,
        email: users.email,
        calendarId: doctors.calendar_id,
        hasCalendar: sql<boolean>`${doctors.calendar_id} IS NOT NULL AND ${doctors.calendar_id} != ''`
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true)
      ))
      .orderBy(asc(users.displayName));

    // Obtener citas del día para cada doctor
    const dayAppointments = await db
      .select({
        doctorId: appointments.doctorId,
        appointmentId: appointments.id,
        status: appointments.status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startOfDay),
        lte(appointments.createdAt, endOfDay)
      ))
      .orderBy(asc(appointments.createdAt));

    // Combinar información de doctores con sus citas
    const scheduleOverview = activeDoctors.map(doctor => {
      const doctorAppointments = dayAppointments.filter(apt => apt.doctorId === doctor.doctorId);
      
      const totalDuration = doctorAppointments.reduce((sum, apt) => sum + (apt.serviceDuration || 30), 0);
      const statusCounts = doctorAppointments.reduce((acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        ...doctor,
        appointments: doctorAppointments,
        summary: {
          totalAppointments: doctorAppointments.length,
          totalDuration,
          statusBreakdown: statusCounts,
          isAvailable: doctor.hasCalendar && doctorAppointments.length < 8, // Asumiendo máximo 8 citas por día
          workloadLevel: doctorAppointments.length === 0 ? 'libre' : 
                        doctorAppointments.length <= 3 ? 'ligero' :
                        doctorAppointments.length <= 6 ? 'moderado' : 'alto'
        }
      };
    });

    // Estadísticas generales del día
    const dayStats = {
      totalDoctors: activeDoctors.length,
      doctorsWithAppointments: scheduleOverview.filter(d => d.summary.totalAppointments > 0).length,
      totalAppointments: dayAppointments.length,
      averageAppointmentsPerDoctor: activeDoctors.length > 0 
        ? Math.round(dayAppointments.length / activeDoctors.length * 100) / 100 
        : 0,
      workloadDistribution: {
        libre: scheduleOverview.filter(d => d.summary.workloadLevel === 'libre').length,
        ligero: scheduleOverview.filter(d => d.summary.workloadLevel === 'ligero').length,
        moderado: scheduleOverview.filter(d => d.summary.workloadLevel === 'moderado').length,
        alto: scheduleOverview.filter(d => d.summary.workloadLevel === 'alto').length
      }
    };

    return NextResponse.json(
      createSuccessResponse({
        date,
        dayStats,
        scheduleOverview,
        totalRecords: scheduleOverview.length
      }, 'Resumen de horarios obtenido exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo resumen de horarios');
  }
}

/**
 * Obtiene lista de especialidades disponibles
 */
async function getSpecialitiesList(organizationId: number) {
  try {
    const specialities = await db
      .select({
        speciality: doctors.speciality,
        doctorCount: sql<number>`count(*)`,
        activeDoctorCount: sql<number>`sum(case when ${users.isActive} = true then 1 else 0 end)`
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(users.organizationId, organizationId))
      .groupBy(doctors.speciality)
      .orderBy(asc(doctors.speciality));

    return NextResponse.json(
      createSuccessResponse({
        specialities,
        totalSpecialities: specialities.length,
        totalDoctors: specialities.reduce((sum, s) => sum + s.doctorCount, 0),
        totalActiveDoctors: specialities.reduce((sum, s) => sum + s.activeDoctorCount, 0)
      }, 'Lista de especialidades obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo lista de especialidades');
  }
}

/**
 * Obtiene detalles completos de un doctor específico
 */
async function getDoctorDetails(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId');
    
    if (!doctorId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'doctorId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Obtener información básica del doctor
    const doctorInfo = await db
      .select({
        doctorId: doctors.idDoctor,
        speciality: doctors.speciality,
        privatePhone: doctors.privatePhone,
        nitId: doctors.nitId,
        calendarId: doctors.calendar_id,
        tokenGoogleId: doctors.tokenGoogleId,
        // Información del usuario
        userId: users.id,
        displayName: users.displayName,
        email: users.email,
        phoneNumber: users.phoneNumber,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        eq(doctors.idDoctor, parseInt(doctorId)),
        eq(users.organizationId, organizationId)
      ))
      .limit(1);

    if (doctorInfo.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Doctor no encontrado'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Obtener estadísticas del doctor
    const [appointmentStats, recentAppointments] = await Promise.all([
      // Estadísticas de citas
      db.select({
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        pendingAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.PENDING}' then 1 else 0 end)`,
        acceptedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ACCEPTED}' then 1 else 0 end)`,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        appointmentsThisMonth: sql<number>`
          sum(case when MONTH(${appointments.createdAt}) = MONTH(CURDATE()) 
              AND YEAR(${appointments.createdAt}) = YEAR(CURDATE()) then 1 else 0 end)
        `
      })
        .from(appointments)
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(eq(appointments.doctorId, parseInt(doctorId))),
      
      // Citas recientes
      db.select({
        appointmentId: appointments.id,
        status: appointments.status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        serviceName: medicalServices.name,
        serviceDuration: medicalServices.durationMinutes
      })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(eq(appointments.doctorId, parseInt(doctorId)))
        .orderBy(desc(appointments.createdAt))
        .limit(10)
    ]);

    const stats = appointmentStats[0] || {
      totalAppointments: 0,
      attendedAppointments: 0,
      canceledAppointments: 0,
      pendingAppointments: 0,
      acceptedAppointments: 0,
      averageDuration: 0,
      uniquePatients: 0,
      appointmentsThisMonth: 0
    };

    // Calcular tasas
    const attendanceRate = stats.totalAppointments > 0 
      ? Math.round((stats.attendedAppointments * 100) / stats.totalAppointments * 100) / 100
      : 0;
    
    const cancellationRate = stats.totalAppointments > 0 
      ? Math.round((stats.canceledAppointments * 100) / stats.totalAppointments * 100) / 100
      : 0;

    return NextResponse.json(
      createSuccessResponse({
        doctorInfo: doctorInfo[0],
        statistics: {
          ...stats,
          attendanceRate,
          cancellationRate
        },
        recentAppointments,
        hasCalendar: !!doctorInfo[0].calendarId,
        isActive: doctorInfo[0].isActive
      }, 'Detalles del doctor obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo detalles del doctor');
  }
}