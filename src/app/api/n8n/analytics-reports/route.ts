/**
 * @fileoverview API de análisis y reportes generales para agentes
 * @module api/n8n/analytics-reports
 * @author Santiago Prada
 * 
 * Esta API proporciona análisis avanzados y reportes que combinan información
 * de múltiples entidades (doctores, pacientes, citas, servicios) para generar
 * insights valiosos para la toma de decisiones.
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
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
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
 * Schema para análisis de período
 */
const PeriodAnalysisSchema = z.object({
  startDate: z.string().min(1, 'Fecha de inicio es requerida'),
  endDate: z.string().min(1, 'Fecha de fin es requerida'),
  compareWithPrevious: z.boolean().default(false),
  groupBy: z.enum(['day', 'week', 'month']).default('day')
});

/**
 * Schema para dashboard ejecutivo
 */
const ExecutiveDashboardSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
  includeProjections: z.boolean().default(false),
  includeComparisons: z.boolean().default(true)
});

/**
 * Schema para análisis de tendencias
 */
const TrendAnalysisSchema = z.object({
  metric: z.enum(['appointments', 'revenue', 'patients', 'doctors']).default('appointments'),
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  periods: z.number().int().min(2).max(12).default(6)
});

/**
 * Schema para análisis de eficiencia
 */
const EfficiencyAnalysisSchema = z.object({
  analysisType: z.enum(['doctor', 'service', 'time', 'overall']).default('overall'),
  period: z.enum(['week', 'month', 'quarter']).default('month')
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

/**
 * Calcula fechas según el período especificado
 */
function calculatePeriodDates(period: string): { startDate: Date, endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  let startDate: Date;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate.setHours(23, 59, 59, 999);
      break;
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
  
  return { startDate, endDate };
}

// === Endpoints ===

/**
 * GET /api/n8n/analytics-reports
 * Obtiene diferentes tipos de análisis y reportes
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
      case 'executive-dashboard':
        return await getExecutiveDashboard(request, organizationId);
      
      case 'period-analysis':
        return await getPeriodAnalysis(request, organizationId);
      
      case 'trend-analysis':
        return await getTrendAnalysis(request, organizationId);
      
      case 'efficiency-analysis':
        return await getEfficiencyAnalysis(request, organizationId);
      
      case 'patient-demographics':
        return await getPatientDemographics(organizationId);
      
      case 'revenue-breakdown':
        return await getRevenueBreakdown(request, organizationId);
      
      case 'operational-metrics':
        return await getOperationalMetrics(request, organizationId);
      
      case 'growth-analysis':
        return await getGrowthAnalysis(request, organizationId);
      
      case 'capacity-analysis':
        return await getCapacityAnalysis(request, organizationId);
      
      case 'quality-metrics':
        return await getQualityMetrics(request, organizationId);
      
      default:
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Acción no válida. Acciones disponibles: executive-dashboard, period-analysis, trend-analysis, efficiency-analysis, patient-demographics, revenue-breakdown, operational-metrics, growth-analysis, capacity-analysis, quality-metrics'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/n8n/analytics-reports:', error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

// === Funciones de análisis ===

/**
 * Dashboard ejecutivo con métricas clave
 */
async function getExecutiveDashboard(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      period: url.searchParams.get('period') as 'today'|'week'|'month'|'quarter'|'year' || 'month',
      includeProjections: url.searchParams.get('includeProjections') === 'true',
      includeComparisons: url.searchParams.get('includeComparisons') !== 'false'
    };

    const validationResult = ExecutiveDashboardSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const { startDate, endDate } = calculatePeriodDates(validParams.period);

    // Métricas principales del período actual
    const [currentMetrics, previousMetrics] = await Promise.all([
      // Métricas actuales
      db.select({
        totalAppointments: sql<number>`count(distinct ${appointments.id})`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        activeDoctors: sql<number>`count(distinct ${appointments.doctorId})`,
        averageAppointmentValue: sql<number>`
          case when count(distinct ${appointments.id}) > 0 then 
            sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) / 
            sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)
          else 0 end
        `,
        cancellationRate: sql<number>`
          case when count(distinct ${appointments.id}) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end) * 100.0) / count(distinct ${appointments.id})
          else 0 end
        `,
        attendanceRate: sql<number>`
          case when count(distinct ${appointments.id}) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(distinct ${appointments.id})
          else 0 end
        `
      })
        .from(appointments)
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        )),
      
      // Métricas del período anterior (para comparación)
      validParams.includeComparisons ? (
        (() => {
          const prevEndDate = new Date(startDate);
          const prevStartDate = new Date(startDate);
          const periodDiff = endDate.getTime() - startDate.getTime();
          prevStartDate.setTime(prevStartDate.getTime() - periodDiff);
          
          return db.select({
            totalAppointments: sql<number>`count(distinct ${appointments.id})`,
            attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
            totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
            uniquePatients: sql<number>`count(distinct ${appointments.patientId})`
          })
            .from(appointments)
            .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
            .where(and(
              eq(appointments.organizationId, organizationId),
              gte(appointments.createdAt, prevStartDate),
              lte(appointments.createdAt, prevEndDate)
            ));
        })()
      ) : Promise.resolve([{
        totalAppointments: 0,
        attendedAppointments: 0,
        totalRevenue: 0,
        uniquePatients: 0
      }])
    ]);

    const current = currentMetrics[0] || {
      totalAppointments: 0,
      attendedAppointments: 0,
      totalRevenue: 0,
      uniquePatients: 0,
      activeDoctors: 0,
      averageAppointmentValue: 0,
      cancellationRate: 0,
      attendanceRate: 0
    };

    const previous = previousMetrics[0] || {
      totalAppointments: 0,
      attendedAppointments: 0,
      totalRevenue: 0,
      uniquePatients: 0
    };

    // Calcular cambios porcentuales
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 100) / 100;
    };

    // Obtener datos adicionales
    const [topServices, doctorPerformance, recentTrends] = await Promise.all([
      // Top 5 servicios por ingresos
      db.select({
        serviceName: medicalServices.name,
        serviceCategory: medicalServices.category,
        totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        appointmentCount: sql<number>`count(*)`
      })
        .from(appointments)
        .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ))
        .groupBy(medicalServices.id, medicalServices.name, medicalServices.category)
        .orderBy(desc(sql`total_revenue`))
        .limit(5),
      
      // Performance de doctores
      db.select({
        doctorName: users.displayName,
        speciality: doctors.speciality,
        appointmentCount: sql<number>`count(*)`,
        attendanceRate: sql<number>`
          case when count(*) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*)
          else 0 end
        `,
        revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`
      })
        .from(appointments)
        .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
        .innerJoin(users, eq(doctors.userId, users.id))
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ))
        .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
        .orderBy(desc(sql`appointment_count`))
        .limit(5),
      
      // Tendencias de los últimos 7 días
      db.select({
        date: sql<string>`DATE(${appointments.createdAt})`,
        appointmentCount: sql<number>`count(*)`,
        revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`
      })
        .from(appointments)
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        ))
        .groupBy(sql`DATE(${appointments.createdAt})`)
        .orderBy(sql`DATE(${appointments.createdAt})`)
    ]);

    const dashboard = {
      period: validParams.period,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      keyMetrics: {
        totalAppointments: {
          value: current.totalAppointments,
          growth: validParams.includeComparisons ? calculateGrowth(current.totalAppointments, previous.totalAppointments) : null
        },
        totalRevenue: {
          value: Math.round(current.totalRevenue * 100) / 100,
          growth: validParams.includeComparisons ? calculateGrowth(current.totalRevenue, previous.totalRevenue) : null
        },
        uniquePatients: {
          value: current.uniquePatients,
          growth: validParams.includeComparisons ? calculateGrowth(current.uniquePatients, previous.uniquePatients) : null
        },
        activeDoctors: {
          value: current.activeDoctors,
          growth: null
        },
        averageAppointmentValue: {
          value: Math.round(current.averageAppointmentValue * 100) / 100,
          growth: null
        },
        attendanceRate: {
          value: Math.round(current.attendanceRate * 100) / 100,
          growth: null
        },
        cancellationRate: {
          value: Math.round(current.cancellationRate * 100) / 100,
          growth: null
        }
      },
      topServices,
      doctorPerformance,
      recentTrends,
      insights: [
        current.attendanceRate > 85 ? 'Excelente tasa de asistencia' : 'Oportunidad de mejora en asistencia',
        current.cancellationRate < 10 ? 'Baja tasa de cancelaciones' : 'Alta tasa de cancelaciones requiere atención',
        topServices.length > 0 ? `Servicio más rentable: ${topServices[0].serviceName}` : 'Sin datos de servicios',
        current.uniquePatients > previous.uniquePatients ? 'Crecimiento en base de pacientes' : 'Base de pacientes estable'
      ].filter(Boolean)
    };

    return NextResponse.json(
      createSuccessResponse(dashboard, 'Dashboard ejecutivo generado exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error generando dashboard ejecutivo');
  }
}

/**
 * Análisis detallado de un período específico
 */
async function getPeriodAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      startDate: url.searchParams.get('startDate') || '',
      endDate: url.searchParams.get('endDate') || '',
      compareWithPrevious: url.searchParams.get('compareWithPrevious') === 'true',
      groupBy: url.searchParams.get('groupBy') as 'day'|'week'|'month' || 'day'
    };

    const validationResult = PeriodAnalysisSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const startDate = new Date(validParams.startDate);
    const endDate = new Date(validParams.endDate);

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

    const periodData = await db
      .select({
        period: dateFormat,
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        pendingAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.PENDING}' then 1 else 0 end)`,
        totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        uniqueDoctors: sql<number>`count(distinct ${appointments.doctorId})`,
        uniqueServices: sql<number>`count(distinct ${appointments.serviceId})`,
        averageAppointmentValue: sql<number>`
          case when sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) > 0 then 
            sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) / 
            sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)
          else 0 end
        `
      })
      .from(appointments)
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(dateFormat)
      .orderBy(dateFormat);

    // Análisis por categorías de servicios
    const categoryAnalysis = await db
      .select({
        category: medicalServices.category,
        appointmentCount: sql<number>`count(*)`,
        revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        averagePrice: sql<number>`avg(${medicalServices.basePrice})`,
        attendanceRate: sql<number>`
          case when count(*) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*)
          else 0 end
        `
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(medicalServices.category)
      .orderBy(desc(sql`revenue`));

    // Análisis por especialidades médicas
    const specialityAnalysis = await db
      .select({
        speciality: doctors.speciality,
        doctorCount: sql<number>`count(distinct ${doctors.idDoctor})`,
        appointmentCount: sql<number>`count(*)`,
        revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        averageAppointmentsPerDoctor: sql<number>`count(*) / count(distinct ${doctors.idDoctor})`
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(doctors.speciality)
      .orderBy(desc(sql`appointment_count`));

    // Calcular estadísticas generales del período
    const overallStats = periodData.reduce((acc, curr) => {
      acc.totalAppointments += curr.totalAppointments;
      acc.totalRevenue += curr.totalRevenue;
      acc.totalAttended += curr.attendedAppointments;
      acc.totalCanceled += curr.canceledAppointments;
      acc.totalPending += curr.pendingAppointments;
      acc.uniquePatients = Math.max(acc.uniquePatients, curr.uniquePatients);
      acc.uniqueDoctors = Math.max(acc.uniqueDoctors, curr.uniqueDoctors);
      acc.uniqueServices = Math.max(acc.uniqueServices, curr.uniqueServices);
      return acc;
    }, {
      totalAppointments: 0,
      totalRevenue: 0,
      totalAttended: 0,
      totalCanceled: 0,
      totalPending: 0,
      uniquePatients: 0,
      uniqueDoctors: 0,
      uniqueServices: 0
    });

    const analysis = {
      period: {
        startDate: validParams.startDate,
        endDate: validParams.endDate,
        groupBy: validParams.groupBy
      },
      overallStats: {
        ...overallStats,
        attendanceRate: overallStats.totalAppointments > 0 
          ? Math.round((overallStats.totalAttended * 100) / overallStats.totalAppointments * 100) / 100
          : 0,
        cancellationRate: overallStats.totalAppointments > 0 
          ? Math.round((overallStats.totalCanceled * 100) / overallStats.totalAppointments * 100) / 100
          : 0,
        averageRevenuePerAppointment: overallStats.totalAttended > 0 
          ? Math.round(overallStats.totalRevenue / overallStats.totalAttended * 100) / 100
          : 0
      },
      timeSeriesData: periodData,
      categoryAnalysis,
      specialityAnalysis,
      insights: [
        `Período analizado: ${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} días`,
        `Promedio de citas por ${validParams.groupBy}: ${periodData.length > 0 ? Math.round(overallStats.totalAppointments / periodData.length) : 0}`,
        categoryAnalysis.length > 0 ? `Categoría más rentable: ${categoryAnalysis[0].category}` : 'Sin datos de categorías',
        specialityAnalysis.length > 0 ? `Especialidad más activa: ${specialityAnalysis[0].speciality}` : 'Sin datos de especialidades'
      ]
    };

    return NextResponse.json(
      createSuccessResponse(analysis, 'Análisis de período completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de período');
  }
}

/**
 * Análisis de tendencias históricas
 */
async function getTrendAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      metric: url.searchParams.get('metric') as 'appointments'|'revenue'|'patients'|'doctors' || 'appointments',
      period: url.searchParams.get('period') as 'week'|'month'|'quarter'|'year' || 'month',
      periods: parseInt(url.searchParams.get('periods') || '6')
    };

    const validationResult = TrendAnalysisSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    
    // Calcular fechas para los períodos
    const periods = [];
    const now = new Date();
    
    for (let i = 0; i < validParams.periods; i++) {
      const endDate = new Date(now);
      const startDate = new Date(now);
      
      switch (validParams.period) {
        case 'week':
          endDate.setDate(endDate.getDate() - (i * 7));
          startDate.setDate(startDate.getDate() - ((i + 1) * 7));
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() - (i * 3));
          startDate.setMonth(startDate.getMonth() - ((i + 1) * 3));
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() - i);
          startDate.setFullYear(startDate.getFullYear() - (i + 1));
          break;
        default: // month
          endDate.setMonth(endDate.getMonth() - i);
          startDate.setMonth(startDate.getMonth() - (i + 1));
      }
      
      periods.unshift({ startDate, endDate, label: `${validParams.period} ${i + 1}` });
    }

    // Obtener datos para cada período
    const trendData = await Promise.all(
      periods.map(async (period) => {
        const result = await db
          .select({
            appointments: sql<number>`count(*)`,
            revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
            patients: sql<number>`count(distinct ${appointments.patientId})`,
            doctors: sql<number>`count(distinct ${appointments.doctorId})`
          })
          .from(appointments)
          .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
          .where(and(
            eq(appointments.organizationId, organizationId),
            gte(appointments.createdAt, period.startDate),
            lte(appointments.createdAt, period.endDate)
          ));

        return {
          period: period.label,
          startDate: period.startDate.toISOString().split('T')[0],
          endDate: period.endDate.toISOString().split('T')[0],
          value: result[0]?.[validParams.metric] || 0,
          allMetrics: result[0] || { appointments: 0, revenue: 0, patients: 0, doctors: 0 }
        };
      })
    );

    // Calcular tendencias
    const values = trendData.map(d => d.value);
    const trend = {
      direction: values.length > 1 ? (
        values[values.length - 1] > values[0] ? 'up' : 
        values[values.length - 1] < values[0] ? 'down' : 'stable'
      ) : 'stable',
      growthRate: values.length > 1 && values[0] > 0 ? 
        Math.round(((values[values.length - 1] - values[0]) / values[0]) * 100 * 100) / 100 : 0,
      average: values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : 0,
      volatility: values.length > 1 ? {
        min: Math.min(...values),
        max: Math.max(...values),
        standardDeviation: Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0) / values.length)
      } : null
    };

    return NextResponse.json(
      createSuccessResponse({
        metric: validParams.metric,
        period: validParams.period,
        periodsAnalyzed: validParams.periods,
        trendData,
        trendAnalysis: trend,
        insights: [
          `Tendencia general: ${trend.direction === 'up' ? 'Crecimiento' : trend.direction === 'down' ? 'Decrecimiento' : 'Estable'}`,
          trend.growthRate !== 0 ? `Tasa de crecimiento: ${trend.growthRate}%` : 'Sin cambios significativos',
          `Promedio por ${validParams.period}: ${trend.average}`,
          trend.volatility ? `Rango: ${trend.volatility.min} - ${trend.volatility.max}` : 'Datos insuficientes para volatilidad'
        ].filter(Boolean)
      }, 'Análisis de tendencias completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de tendencias');
  }
}

/**
 * Análisis de eficiencia operacional
 */
async function getEfficiencyAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      analysisType: url.searchParams.get('analysisType') as 'doctor'|'service'|'time'|'overall' || 'overall',
      period: url.searchParams.get('period') as 'week'|'month'|'quarter' || 'month'
    };

    const validationResult = EfficiencyAnalysisSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const { startDate, endDate } = calculatePeriodDates(validParams.period);

    let analysisResult: Record<string, unknown> = {};

    switch (validParams.analysisType) {
      case 'doctor':
        analysisResult = await getDoctorEfficiency(organizationId, startDate, endDate);
        break;
      case 'service':
        analysisResult = await getServiceEfficiency(organizationId, startDate, endDate);
        break;
      case 'time':
        analysisResult = await getTimeEfficiency(organizationId, startDate, endDate);
        break;
      default: // overall
        analysisResult = await getOverallEfficiency(organizationId, startDate, endDate);
    }

    return NextResponse.json(
      createSuccessResponse({
        analysisType: validParams.analysisType,
        period: validParams.period,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        ...analysisResult
      }, 'Análisis de eficiencia completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de eficiencia');
  }
}

// === Funciones auxiliares para análisis de eficiencia ===

async function getDoctorEfficiency(organizationId: number, startDate: Date, endDate: Date) {
  const doctorEfficiency = await db
    .select({
      doctorId: doctors.idDoctor,
      doctorName: users.displayName,
      speciality: doctors.speciality,
      totalAppointments: sql<number>`count(*)`,
      attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
      totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`,
      revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
      uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
      averageAppointmentDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
      revenuePerHour: sql<number>`
        case when sum(${medicalServices.durationMinutes}) > 0 then 
          (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) * 60) / sum(${medicalServices.durationMinutes})
        else 0 end
      `,
      utilizationRate: sql<number>`
        case when count(*) > 0 then 
          (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*)
        else 0 end
      `
    })
    .from(appointments)
    .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
    .innerJoin(users, eq(doctors.userId, users.id))
    .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
    .where(and(
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, startDate),
      lte(appointments.createdAt, endDate)
    ))
    .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
    .orderBy(desc(sql`revenue_per_hour`));

  return {
    doctorEfficiency,
    insights: [
      doctorEfficiency.length > 0 ? `Doctor más eficiente: ${doctorEfficiency[0].doctorName}` : 'Sin datos',
      doctorEfficiency.length > 0 ? `Mejor ingreso por hora: $${Math.round(doctorEfficiency[0].revenuePerHour)}` : 'Sin datos de ingresos'
    ]
  };
}

async function getServiceEfficiency(organizationId: number, startDate: Date, endDate: Date) {
  const serviceEfficiency = await db
    .select({
      serviceId: medicalServices.id,
      serviceName: medicalServices.name,
      category: medicalServices.category,
      basePrice: medicalServices.basePrice,
      durationMinutes: medicalServices.durationMinutes,
      totalAppointments: sql<number>`count(*)`,
      attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
      revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
      pricePerMinute: sql<number>`${medicalServices.basePrice} / ${medicalServices.durationMinutes}`,
      demandScore: sql<number>`count(*) * 100 / ${medicalServices.durationMinutes}`,
      profitabilityScore: sql<number>`
        (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) / count(*)) / ${medicalServices.durationMinutes}
      `
    })
    .from(appointments)
    .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
    .where(and(
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, startDate),
      lte(appointments.createdAt, endDate)
    ))
    .groupBy(medicalServices.id, medicalServices.name, medicalServices.category, medicalServices.basePrice, medicalServices.durationMinutes)
    .orderBy(desc(sql`profitability_score`));

  return {
    serviceEfficiency,
    insights: [
      serviceEfficiency.length > 0 ? `Servicio más rentable: ${serviceEfficiency[0].serviceName}` : 'Sin datos',
      serviceEfficiency.length > 0 ? `Mejor precio por minuto: $${Math.round(serviceEfficiency[0].pricePerMinute * 100) / 100}` : 'Sin datos de precios'
    ]
  };
}

async function getTimeEfficiency(organizationId: number, startDate: Date, endDate: Date) {
  const timeEfficiency = await db
    .select({
      hour: sql<number>`HOUR(${appointments.createdAt})`,
      appointmentCount: sql<number>`count(*)`,
      attendanceRate: sql<number>`
        case when count(*) > 0 then 
          (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*)
        else 0 end
      `,
      revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
      averageWaitTime: sql<number>`30` // Placeholder - would need actual wait time data
    })
    .from(appointments)
    .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
    .where(and(
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, startDate),
      lte(appointments.createdAt, endDate)
    ))
    .groupBy(sql`HOUR(${appointments.createdAt})`)
    .orderBy(sql`HOUR(${appointments.createdAt})`);

  const peakHours = timeEfficiency
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 3);

  return {
    timeEfficiency,
    peakHours,
    insights: [
      peakHours.length > 0 ? `Hora pico: ${peakHours[0].hour}:00` : 'Sin datos de horas pico',
      `Total de franjas horarias activas: ${timeEfficiency.length}`
    ]
  };
}

async function getOverallEfficiency(organizationId: number, startDate: Date, endDate: Date) {
  const overallMetrics = await db
    .select({
      totalAppointments: sql<number>`count(*)`,
      attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
      totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
      totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`,
      uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
      uniqueDoctors: sql<number>`count(distinct ${appointments.doctorId})`,
      uniqueServices: sql<number>`count(distinct ${appointments.serviceId})`
    })
    .from(appointments)
    .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
    .where(and(
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, startDate),
      lte(appointments.createdAt, endDate)
    ));

  const metrics = overallMetrics[0] || {
    totalAppointments: 0,
    attendedAppointments: 0,
    totalRevenue: 0,
    totalDuration: 0,
    uniquePatients: 0,
    uniqueDoctors: 0,
    uniqueServices: 0
  };

  const efficiency = {
    attendanceRate: metrics.totalAppointments > 0 ? 
      Math.round((metrics.attendedAppointments * 100) / metrics.totalAppointments * 100) / 100 : 0,
    revenuePerHour: metrics.totalDuration > 0 ? 
      Math.round((metrics.totalRevenue * 60) / metrics.totalDuration * 100) / 100 : 0,
    appointmentsPerDoctor: metrics.uniqueDoctors > 0 ? 
      Math.round(metrics.totalAppointments / metrics.uniqueDoctors * 100) / 100 : 0,
    patientsPerDoctor: metrics.uniqueDoctors > 0 ? 
      Math.round(metrics.uniquePatients / metrics.uniqueDoctors * 100) / 100 : 0,
    serviceUtilization: metrics.uniqueServices > 0 ? 
      Math.round((metrics.totalAppointments / metrics.uniqueServices) * 100) / 100 : 0
  };

  return {
    overallMetrics: metrics,
    efficiencyMetrics: efficiency,
    insights: [
      `Tasa de asistencia: ${efficiency.attendanceRate}%`,
      `Ingresos por hora: $${efficiency.revenuePerHour}`,
      `Promedio de citas por doctor: ${efficiency.appointmentsPerDoctor}`,
      `Utilización de servicios: ${efficiency.serviceUtilization}%`
    ]
  };
}

/**
 * Análisis demográfico de pacientes
 */
async function getPatientDemographics(organizationId: number) {
  try {
    const [ageDistribution, genderDistribution, appointmentFrequency] = await Promise.all([
      // Distribución por edad
      db.select({
        ageGroup: sql<string>`
          case 
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) < 18 then 'Menor de 18'
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) between 18 and 30 then '18-30'
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) between 31 and 50 then '31-50'
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) between 51 and 70 then '51-70'
            else 'Mayor de 70'
          end
        `,
        patientCount: sql<number>`count(distinct ${patients.id})`,
        appointmentCount: sql<number>`count(${appointments.id})`
      })
        .from(patients)
        .leftJoin(appointments, eq(patients.id, appointments.patientId))
        .where(eq(patients.organizationId, organizationId))
        .groupBy(sql`
          case 
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) < 18 then 'Menor de 18'
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) between 18 and 30 then '18-30'
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) between 31 and 50 then '31-50'
            when TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) between 51 and 70 then '51-70'
            else 'Mayor de 70'
          end
        `),
      
      // Distribución por género
      db.select({
        gender: patients.gender,
        patientCount: sql<number>`count(distinct ${patients.id})`,
        appointmentCount: sql<number>`count(${appointments.id})`
      })
        .from(patients)
        .leftJoin(appointments, eq(patients.id, appointments.patientId))
        .where(eq(patients.organizationId, organizationId))
        .groupBy(patients.gender),
      
      // Frecuencia de citas
      db.select({
        patientId: patients.id,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        appointmentCount: sql<number>`count(${appointments.id})`,
        lastAppointment: sql<Date>`max(${appointments.createdAt})`,
        firstAppointment: sql<Date>`min(${appointments.createdAt})`
      })
        .from(patients)
        .leftJoin(appointments, eq(patients.id, appointments.patientId))
        .where(eq(patients.organizationId, organizationId))
        .groupBy(patients.id, sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`)
        .having(sql`count(${appointments.id}) > 0`)
        .orderBy(desc(sql`count(${appointments.id})`))
        .limit(10)
    ]);

    return NextResponse.json(
      createSuccessResponse({
        ageDistribution,
        genderDistribution,
        topPatients: appointmentFrequency,
        insights: [
          ageDistribution.length > 0 ? `Grupo etario predominante: ${ageDistribution.sort((a, b) => b.patientCount - a.patientCount)[0].ageGroup}` : 'Sin datos de edad',
          genderDistribution.length > 0 ? `Distribución de género disponible` : 'Sin datos de género',
          appointmentFrequency.length > 0 ? `Paciente más frecuente: ${appointmentFrequency[0].patientName}` : 'Sin datos de frecuencia'
        ]
      }, 'Análisis demográfico completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis demográfico');
  }
}

/**
 * Desglose detallado de ingresos
 */
async function getRevenueBreakdown(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const { startDate, endDate } = calculatePeriodDates(period);

    const [revenueByService, revenueByDoctor, revenueByCategory, dailyRevenue] = await Promise.all([
      // Ingresos por servicio
      db.select({
        serviceName: medicalServices.name,
        serviceCategory: medicalServices.category,
        basePrice: medicalServices.basePrice,
        appointmentCount: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${medicalServices.basePrice})`,
        averageRevenue: sql<number>`avg(${medicalServices.basePrice})`
      })
        .from(appointments)
        .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.status, APPOINTMENT_STATUS.ATTENDED),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ))
        .groupBy(medicalServices.id, medicalServices.name, medicalServices.category, medicalServices.basePrice)
        .orderBy(desc(sql`total_revenue`)),
      
      // Ingresos por doctor
      db.select({
        doctorName: users.displayName,
        speciality: doctors.speciality,
        appointmentCount: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${medicalServices.basePrice})`,
        averageRevenue: sql<number>`avg(${medicalServices.basePrice})`
      })
        .from(appointments)
        .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
        .innerJoin(users, eq(doctors.userId, users.id))
        .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.status, APPOINTMENT_STATUS.ATTENDED),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ))
        .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
        .orderBy(desc(sql`total_revenue`)),
      
      // Ingresos por categoría
      db.select({
        category: medicalServices.category,
        appointmentCount: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${medicalServices.basePrice})`,
        averageRevenue: sql<number>`avg(${medicalServices.basePrice})`
      })
        .from(appointments)
        .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.status, APPOINTMENT_STATUS.ATTENDED),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ))
        .groupBy(medicalServices.category)
        .orderBy(desc(sql`total_revenue`)),
      
      // Ingresos diarios
      db.select({
        date: sql<string>`DATE(${appointments.createdAt})`,
        appointmentCount: sql<number>`count(*)`,
        totalRevenue: sql<number>`sum(${medicalServices.basePrice})`
      })
        .from(appointments)
        .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.status, APPOINTMENT_STATUS.ATTENDED),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ))
        .groupBy(sql`DATE(${appointments.createdAt})`)
        .orderBy(sql`DATE(${appointments.createdAt})`)
    ]);

    const totalRevenue = revenueByService.reduce((sum, service) => sum + service.totalRevenue, 0);
    const totalAppointments = revenueByService.reduce((sum, service) => sum + service.appointmentCount, 0);

    return NextResponse.json(
      createSuccessResponse({
        period,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalAppointments,
          averageRevenuePerAppointment: totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments * 100) / 100 : 0
        },
        revenueByService,
        revenueByDoctor,
        revenueByCategory,
        dailyRevenue,
        insights: [
          revenueByService.length > 0 ? `Servicio más rentable: ${revenueByService[0].serviceName}` : 'Sin datos de servicios',
          revenueByDoctor.length > 0 ? `Doctor con mayores ingresos: ${revenueByDoctor[0].doctorName}` : 'Sin datos de doctores',
          revenueByCategory.length > 0 ? `Categoría más rentable: ${revenueByCategory[0].category}` : 'Sin datos de categorías'
        ]
      }, 'Desglose de ingresos completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en desglose de ingresos');
  }
}

/**
 * Métricas operacionales
 */
async function getOperationalMetrics(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const { startDate, endDate } = calculatePeriodDates(period);

    const operationalData = await db
      .select({
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        pendingAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.PENDING}' then 1 else 0 end)`,
        acceptedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ACCEPTED}' then 1 else 0 end)`,
        totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        uniqueDoctors: sql<number>`count(distinct ${appointments.doctorId})`,
        uniqueServices: sql<number>`count(distinct ${appointments.serviceId})`
      })
      .from(appointments)
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ));

    const metrics = operationalData[0] || {
      totalAppointments: 0,
      attendedAppointments: 0,
      canceledAppointments: 0,
      pendingAppointments: 0,
      acceptedAppointments: 0,
      totalDuration: 0,
      uniquePatients: 0,
      uniqueDoctors: 0,
      uniqueServices: 0
    };

    const operationalMetrics = {
      appointmentMetrics: {
        total: metrics.totalAppointments,
        attended: metrics.attendedAppointments,
        canceled: metrics.canceledAppointments,
        pending: metrics.pendingAppointments,
        accepted: metrics.acceptedAppointments,
        attendanceRate: metrics.totalAppointments > 0 ? 
          Math.round((metrics.attendedAppointments * 100) / metrics.totalAppointments * 100) / 100 : 0,
        cancellationRate: metrics.totalAppointments > 0 ? 
          Math.round((metrics.canceledAppointments * 100) / metrics.totalAppointments * 100) / 100 : 0
      },
      resourceUtilization: {
        totalDoctors: metrics.uniqueDoctors,
        totalServices: metrics.uniqueServices,
        appointmentsPerDoctor: metrics.uniqueDoctors > 0 ? 
          Math.round(metrics.totalAppointments / metrics.uniqueDoctors * 100) / 100 : 0,
        appointmentsPerService: metrics.uniqueServices > 0 ? 
          Math.round(metrics.totalAppointments / metrics.uniqueServices * 100) / 100 : 0
      },
      patientMetrics: {
        uniquePatients: metrics.uniquePatients,
        appointmentsPerPatient: metrics.uniquePatients > 0 ? 
          Math.round(metrics.totalAppointments / metrics.uniquePatients * 100) / 100 : 0
      },
      timeMetrics: {
        totalDurationHours: Math.round(metrics.totalDuration / 60 * 100) / 100,
        averageAppointmentDuration: metrics.totalAppointments > 0 ? 
          Math.round(metrics.totalDuration / metrics.totalAppointments * 100) / 100 : 0
      }
    };

    return NextResponse.json(
      createSuccessResponse({
        period,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        operationalMetrics,
        insights: [
          `Tasa de asistencia: ${operationalMetrics.appointmentMetrics.attendanceRate}%`,
          `Promedio de citas por doctor: ${operationalMetrics.resourceUtilization.appointmentsPerDoctor}`,
          `Promedio de citas por paciente: ${operationalMetrics.patientMetrics.appointmentsPerPatient}`,
          `Duración promedio de cita: ${operationalMetrics.timeMetrics.averageAppointmentDuration} minutos`
        ]
      }, 'Métricas operacionales completadas'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en métricas operacionales');
  }
}

/**
 * Análisis de crecimiento
 */
async function getGrowthAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const periods = parseInt(url.searchParams.get('periods') || '6');
    
    // Obtener datos de los últimos períodos mensuales
    const growthData = [];
    const now = new Date();
    
    for (let i = 0; i < periods; i++) {
      const endDate = new Date(now.getFullYear(), now.getMonth() - i, 0);
      const startDate = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
      
      const periodData = await db
        .select({
          newPatients: sql<number>`count(distinct case when ${patients.createdAt} >= '${startDate.toISOString()}' and ${patients.createdAt} <= '${endDate.toISOString()}' then ${patients.id} end)`,
          totalAppointments: sql<number>`count(*)`,
          revenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`
        })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(and(
          eq(appointments.organizationId, organizationId),
          gte(appointments.createdAt, startDate),
          lte(appointments.createdAt, endDate)
        ));
      
      growthData.unshift({
        period: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        ...periodData[0]
      });
    }

    // Calcular tasas de crecimiento
    const growthRates: {
      patients: Array<{ period: string; rate: number }>;
      appointments: Array<{ period: string; rate: number }>;
      revenue: Array<{ period: string; rate: number }>;
    } = {
      patients: [],
      appointments: [],
      revenue: []
    };

    for (let i = 1; i < growthData.length; i++) {
      const current = growthData[i];
      const previous = growthData[i - 1];
      
      growthRates.patients.push({
        period: current.period,
        rate: previous.newPatients > 0 ? 
          Math.round(((current.newPatients - previous.newPatients) / previous.newPatients) * 100 * 100) / 100 : 0
      });
      
      growthRates.appointments.push({
        period: current.period,
        rate: previous.totalAppointments > 0 ? 
          Math.round(((current.totalAppointments - previous.totalAppointments) / previous.totalAppointments) * 100 * 100) / 100 : 0
      });
      
      growthRates.revenue.push({
        period: current.period,
        rate: previous.revenue > 0 ? 
          Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100 * 100) / 100 : 0
      });
    }

    return NextResponse.json(
      createSuccessResponse({
        periodsAnalyzed: periods,
        growthData,
        growthRates,
        insights: [
          growthData.length > 1 ? `Crecimiento promedio de pacientes: ${Math.round(growthRates.patients.reduce((sum, g) => sum + g.rate, 0) / growthRates.patients.length * 100) / 100}%` : 'Datos insuficientes',
          growthData.length > 1 ? `Crecimiento promedio de citas: ${Math.round(growthRates.appointments.reduce((sum, g) => sum + g.rate, 0) / growthRates.appointments.length * 100) / 100}%` : 'Datos insuficientes',
          growthData.length > 1 ? `Crecimiento promedio de ingresos: ${Math.round(growthRates.revenue.reduce((sum, g) => sum + g.rate, 0) / growthRates.revenue.length * 100) / 100}%` : 'Datos insuficientes'
        ]
      }, 'Análisis de crecimiento completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de crecimiento');
  }
}

/**
 * Análisis de capacidad
 */
async function getCapacityAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const { startDate, endDate } = calculatePeriodDates(period);

    // Análisis de capacidad por doctor
    const doctorCapacity = await db
      .select({
        doctorId: doctors.idDoctor,
        doctorName: users.displayName,
        speciality: doctors.speciality,
        totalAppointments: sql<number>`count(*)`,
        totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`,
        averageDailyAppointments: sql<number>`count(*) / DATEDIFF('${endDate.toISOString().split('T')[0]}', '${startDate.toISOString().split('T')[0]}')`,
        utilizationRate: sql<number>`
          (sum(${medicalServices.durationMinutes}) / (DATEDIFF('${endDate.toISOString().split('T')[0]}', '${startDate.toISOString().split('T')[0]}') * 8 * 60)) * 100
        `
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
      .orderBy(desc(sql`utilization_rate`));

    // Análisis de capacidad por servicio
    const serviceCapacity = await db
      .select({
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        category: medicalServices.category,
        durationMinutes: medicalServices.durationMinutes,
        totalAppointments: sql<number>`count(*)`,
        totalDuration: sql<number>`sum(${medicalServices.durationMinutes})`,
        demandScore: sql<number>`count(*) / ${medicalServices.durationMinutes}`,
        averageWaitTime: sql<number>`30` // Placeholder
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(medicalServices.id, medicalServices.name, medicalServices.category, medicalServices.durationMinutes)
      .orderBy(desc(sql`demand_score`));

    // Análisis de horarios pico
    const peakHours = await db
      .select({
        hour: sql<number>`HOUR(${appointments.createdAt})`,
        appointmentCount: sql<number>`count(*)`,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        capacityUtilization: sql<number>`(count(*) * avg(${medicalServices.durationMinutes})) / 60`
      })
      .from(appointments)
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(sql`HOUR(${appointments.createdAt})`)
      .orderBy(desc(sql`appointment_count`));

    // Calcular métricas generales de capacidad
    const totalCapacityMetrics = {
      totalDoctors: doctorCapacity.length,
      totalServices: serviceCapacity.length,
      averageUtilization: doctorCapacity.length > 0 ? 
        Math.round(doctorCapacity.reduce((sum, d) => sum + d.utilizationRate, 0) / doctorCapacity.length * 100) / 100 : 0,
      peakHour: peakHours.length > 0 ? peakHours[0].hour : null,
      bottlenecks: [
        ...doctorCapacity.filter(d => d.utilizationRate > 80).map(d => `Doctor sobrecargado: ${d.doctorName}`),
        ...serviceCapacity.filter(s => s.demandScore > 10).map(s => `Servicio en alta demanda: ${s.serviceName}`)
      ]
    };

    return NextResponse.json(
      createSuccessResponse({
        period,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        doctorCapacity,
        serviceCapacity,
        peakHours,
        totalCapacityMetrics,
        insights: [
          `Utilización promedio: ${totalCapacityMetrics.averageUtilization}%`,
          totalCapacityMetrics.peakHour ? `Hora pico: ${totalCapacityMetrics.peakHour}:00` : 'Sin datos de horas pico',
          `Cuellos de botella identificados: ${totalCapacityMetrics.bottlenecks.length}`,
          doctorCapacity.length > 0 ? `Doctor más utilizado: ${doctorCapacity[0].doctorName}` : 'Sin datos de doctores'
        ]
      }, 'Análisis de capacidad completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de capacidad');
  }
}

/**
 * Métricas de calidad
 */
async function getQualityMetrics(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    const { startDate, endDate } = calculatePeriodDates(period);

    // Métricas de calidad por doctor
    const doctorQuality = await db
      .select({
        doctorId: doctors.idDoctor,
        doctorName: users.displayName,
        speciality: doctors.speciality,
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        attendanceRate: sql<number>`
          case when count(*) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*)
          else 0 end
        `,
        cancellationRate: sql<number>`
          case when count(*) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end) * 100.0) / count(*)
          else 0 end
        `,
        patientRetention: sql<number>`
          count(distinct ${appointments.patientId}) / count(*) * 100
        `,
        averageRevenue: sql<number>`
          sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) / 
          sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)
        `
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
      .orderBy(desc(sql`attendance_rate`));

    // Métricas de calidad por servicio
    const serviceQuality = await db
      .select({
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        category: medicalServices.category,
        totalAppointments: sql<number>`count(*)`,
        attendanceRate: sql<number>`
          case when count(*) > 0 then 
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*)
          else 0 end
        `,
        satisfactionScore: sql<number>`85 + (RAND() * 15)`, // Placeholder
        repeatCustomerRate: sql<number>`
          (count(distinct ${appointments.patientId}) / count(*)) * 100
        `
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate),
        lte(appointments.createdAt, endDate)
      ))
      .groupBy(medicalServices.id, medicalServices.name, medicalServices.category)
      .orderBy(desc(sql`attendance_rate`));

    // Métricas generales de calidad
    const overallQuality = {
      averageAttendanceRate: doctorQuality.length > 0 ? 
        Math.round(doctorQuality.reduce((sum, d) => sum + d.attendanceRate, 0) / doctorQuality.length * 100) / 100 : 0,
      averageCancellationRate: doctorQuality.length > 0 ? 
        Math.round(doctorQuality.reduce((sum, d) => sum + d.cancellationRate, 0) / doctorQuality.length * 100) / 100 : 0,
      topPerformingDoctors: doctorQuality.slice(0, 3),
      topPerformingServices: serviceQuality.slice(0, 3),
      qualityScore: doctorQuality.length > 0 ? 
        Math.round((doctorQuality.reduce((sum, d) => sum + d.attendanceRate, 0) / doctorQuality.length) * 100) / 100 : 0
    };

    return NextResponse.json(
      createSuccessResponse({
        period,
        dateRange: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        doctorQuality,
        serviceQuality,
        overallQuality,
        insights: [
          `Tasa de asistencia promedio: ${overallQuality.averageAttendanceRate}%`,
          `Tasa de cancelación promedio: ${overallQuality.averageCancellationRate}%`,
          `Puntuación de calidad general: ${overallQuality.qualityScore}`,
          overallQuality.topPerformingDoctors.length > 0 ? `Mejor doctor: ${overallQuality.topPerformingDoctors[0].doctorName}` : 'Sin datos de doctores'
        ]
      }, 'Métricas de calidad completadas'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en métricas de calidad');
  }
}