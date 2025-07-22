/**
 * @fileoverview API de gestión de servicios médicos para agentes
 * @module api/n8n/medical-services-manager
 * @author Santiago Prada
 * 
 * Esta API proporciona funcionalidades para gestionar servicios médicos,
 * análisis de precios, categorías y estadísticas de uso.
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
  medicalServices, 
  appointments, 
  doctors, 
  users, 
  patients, 
  organization 
} from '@/db/schema';
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse
} from '@/types/api';

const API_ERRORS = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
};
import { handleDatabaseError } from '@/lib/api-helpers';
import { APPOINTMENT_STATUS } from '@/types/appointment-status';

// === Schemas de validación ===

/**
 * Schema para filtros de servicios médicos
 */
const ServiceFiltersSchema = z.object({
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  requiresPreparation: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minDuration: z.number().int().min(1).optional(),
  maxDuration: z.number().int().min(1).optional(),
  searchTerm: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

/**
 * Schema para análisis de uso de servicios
 */
const ServiceUsageAnalysisSchema = z.object({
  serviceId: z.number().int().positive().optional(),
  startDate: z.string().min(1, 'Fecha de inicio es requerida'),
  endDate: z.string().min(1, 'Fecha de fin es requerida'),
  groupBy: z.enum(['day', 'week', 'month']).default('month'),
  includeRevenue: z.boolean().default(true)
});

/**
 * Schema para análisis de precios
 */
const PriceAnalysisSchema = z.object({
  category: z.string().optional(),
  compareWithMarket: z.boolean().default(false)
});

/**
 * Schema para creación de servicio médico
 */
const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido').max(255),
  description: z.string().optional(),
  code: z.string().min(1, 'Código es requerido').max(50),
  durationMinutes: z.number().int().min(1, 'Duración debe ser mayor a 0'),
  basePrice: z.number().min(0, 'Precio base debe ser mayor o igual a 0'),
  category: z.string().min(1, 'Categoría es requerida').max(100),
  requiresPreparation: z.boolean().default(false),
  preparationInstructions: z.string().optional(),
  isActive: z.boolean().default(true)
});

/**
 * Schema para actualización de servicio médico
 */
const UpdateServiceSchema = CreateServiceSchema.partial();

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
 * GET /api/n8n/medical-services-manager
 * Obtiene información de servicios médicos con diferentes filtros y análisis
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
        return await getServicesList(request, organizationId);
      
      case 'by-category':
        return await getServicesByCategory(request, organizationId);
      
      case 'usage-analysis':
        return await getUsageAnalysis(request, organizationId);
      
      case 'price-analysis':
        return await getPriceAnalysis(request, organizationId);
      
      case 'popular-services':
        return await getPopularServices(request, organizationId);
      
      case 'revenue-analysis':
        return await getRevenueAnalysis(request, organizationId);
      
      case 'categories-list':
        return await getCategoriesList(organizationId);
      
      case 'service-details':
        return await getServiceDetails(request, organizationId);
      
      case 'preparation-required':
        return await getServicesRequiringPreparation(organizationId);
      
      case 'duration-analysis':
        return await getDurationAnalysis(organizationId);
      
      default:
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Acción no válida. Acciones disponibles: list, by-category, usage-analysis, price-analysis, popular-services, revenue-analysis, categories-list, service-details, preparation-required, duration-analysis'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/n8n/medical-services-manager:', error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

/**
 * POST /api/n8n/medical-services-manager
 * Crea un nuevo servicio médico
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
    const body = await request.json();
    
    const validationResult = CreateServiceSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const serviceData = validationResult.data;

    // Verificar si ya existe un servicio con el mismo código
    const existingService = await db
      .select({ id: medicalServices.id })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, organizationId),
        eq(medicalServices.code, serviceData.code)
      ))
      .limit(1);

    if (existingService.length > 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.CONFLICT, 'Ya existe un servicio con este código'),
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Crear el nuevo servicio
    await db
      .insert(medicalServices)
      .values({
        name: serviceData.name,
        description: serviceData.description,
        code: serviceData.code,
        durationMinutes: serviceData.durationMinutes,
        basePrice: serviceData.basePrice.toString(),
        category: serviceData.category,
        requiresPreparation: serviceData.requiresPreparation,
        preparationInstructions: serviceData.preparationInstructions,
        isActive: serviceData.isActive,
        organizationId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Obtener el servicio creado usando el código único
    const createdService = await db
      .select()
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, organizationId),
        eq(medicalServices.code, serviceData.code)
      ))
      .limit(1);

    return createSuccessResponse(createdService[0], 'Servicio médico creado exitosamente', HTTP_STATUS.CREATED);

  } catch (error) {
    return handleDatabaseError(error, 'Error creando servicio médico');
  }
}

/**
 * PUT /api/n8n/medical-services-manager
 * Actualiza un servicio médico existente
 */
export async function PUT(request: NextRequest) {
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
    const serviceId = url.searchParams.get('serviceId');
    
    if (!serviceId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'serviceId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const body = await request.json();
    
    const validationResult = UpdateServiceSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const updateData = validationResult.data;

    // Verificar que el servicio existe y pertenece a la organización
    const existingService = await db
      .select({ id: medicalServices.id, code: medicalServices.code })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.id, parseInt(serviceId)),
        eq(medicalServices.organizationId, organizationId)
      ))
      .limit(1);

    if (existingService.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Servicio no encontrado'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Si se está actualizando el código, verificar que no exista otro servicio con el mismo código
    if (updateData.code && updateData.code !== existingService[0].code) {
      const codeConflict = await db
        .select({ id: medicalServices.id })
        .from(medicalServices)
        .where(and(
          eq(medicalServices.organizationId, organizationId),
          eq(medicalServices.code, updateData.code)
        ))
        .limit(1);

      if (codeConflict.length > 0) {
        return NextResponse.json(
          createErrorResponse(API_ERRORS.CONFLICT, 'Ya existe un servicio con este código'),
          { status: HTTP_STATUS.CONFLICT }
        );
      }
    }

    // Actualizar el servicio
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date()
    };
    
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.code !== undefined) updateFields.code = updateData.code;
    if (updateData.durationMinutes !== undefined) updateFields.durationMinutes = updateData.durationMinutes;
    if (updateData.basePrice !== undefined) updateFields.basePrice = updateData.basePrice;
    if (updateData.category !== undefined) updateFields.category = updateData.category;
    if (updateData.requiresPreparation !== undefined) updateFields.requiresPreparation = updateData.requiresPreparation;
    if (updateData.preparationInstructions !== undefined) updateFields.preparationInstructions = updateData.preparationInstructions;
    if (updateData.isActive !== undefined) updateFields.isActive = updateData.isActive;

    await db
      .update(medicalServices)
      .set(updateFields)
      .where(and(
        eq(medicalServices.id, parseInt(serviceId)),
        eq(medicalServices.organizationId, organizationId)
      ));

    // Obtener el servicio actualizado
    const updatedService = await db
      .select()
      .from(medicalServices)
      .where(and(
        eq(medicalServices.id, parseInt(serviceId)),
        eq(medicalServices.organizationId, organizationId)
      ))
      .limit(1);

    return createSuccessResponse(updatedService[0], 'Servicio médico actualizado exitosamente', HTTP_STATUS.OK);

  } catch (error) {
    return handleDatabaseError(error, 'Error actualizando servicio médico');
  }
}

// === Funciones de consulta ===

/**
 * Obtiene lista de servicios médicos con filtros
 */
async function getServicesList(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      category: url.searchParams.get('category'),
      isActive: url.searchParams.get('isActive') === 'true',
      requiresPreparation: url.searchParams.get('requiresPreparation') === 'true',
      minPrice: url.searchParams.get('minPrice') ? parseFloat(url.searchParams.get('minPrice')!) : undefined,
      maxPrice: url.searchParams.get('maxPrice') ? parseFloat(url.searchParams.get('maxPrice')!) : undefined,
      minDuration: url.searchParams.get('minDuration') ? parseInt(url.searchParams.get('minDuration')!) : undefined,
      maxDuration: url.searchParams.get('maxDuration') ? parseInt(url.searchParams.get('maxDuration')!) : undefined,
      searchTerm: url.searchParams.get('searchTerm'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    const validationResult = ServiceFiltersSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const whereConditions = [eq(medicalServices.organizationId, organizationId)];

    if (validParams.category) {
      whereConditions.push(eq(medicalServices.category, validParams.category));
    }

    if (validParams.isActive !== undefined) {
      whereConditions.push(eq(medicalServices.isActive, validParams.isActive));
    }

    if (validParams.requiresPreparation !== undefined) {
      whereConditions.push(eq(medicalServices.requiresPreparation, validParams.requiresPreparation));
    }

    if (validParams.minPrice !== undefined) {
      whereConditions.push(gte(medicalServices.basePrice, validParams.minPrice.toString()));
    }

    if (validParams.maxPrice !== undefined) {
      whereConditions.push(lte(medicalServices.basePrice, validParams.maxPrice.toString()));
    }

    if (validParams.minDuration !== undefined) {
      whereConditions.push(gte(medicalServices.durationMinutes, validParams.minDuration));
    }

    if (validParams.maxDuration !== undefined) {
      whereConditions.push(lte(medicalServices.durationMinutes, validParams.maxDuration));
    }

    if (validParams.searchTerm) {
      whereConditions.push(
        sql`(${medicalServices.name} LIKE ${`%${validParams.searchTerm}%`} OR ${medicalServices.description} LIKE ${`%${validParams.searchTerm}%`} OR ${medicalServices.code} LIKE ${`%${validParams.searchTerm}%`})`
      );
    }

    const servicesResult = await db
      .select({
        id: medicalServices.id,
        name: medicalServices.name,
        description: medicalServices.description,
        code: medicalServices.code,
        durationMinutes: medicalServices.durationMinutes,
        basePrice: medicalServices.basePrice,
        category: medicalServices.category,
        requiresPreparation: medicalServices.requiresPreparation,
        preparationInstructions: medicalServices.preparationInstructions,
        isActive: medicalServices.isActive,
        createdAt: medicalServices.createdAt,
        updatedAt: medicalServices.updatedAt,
        // Estadísticas de uso
        totalAppointments: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.serviceId} = ${medicalServices.id}
        )`,
        appointmentsThisMonth: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.serviceId} = ${medicalServices.id}
          AND MONTH(${appointments.createdAt}) = MONTH(CURDATE())
          AND YEAR(${appointments.createdAt}) = YEAR(CURDATE())
        )`,
        averageRating: sql<number>`
          COALESCE((
            SELECT AVG(rating) 
            FROM appointment_ratings ar
            JOIN ${appointments} a ON ar.appointment_id = a.id
            WHERE a.service_id = ${medicalServices.id}
          ), 0)
        `
      })
      .from(medicalServices)
      .where(and(...whereConditions))
      .limit(validParams.limit)
      .offset(validParams.offset)
      .orderBy(asc(medicalServices.name));

    // Contar total de servicios
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(medicalServices)
      .where(and(...whereConditions));

    return NextResponse.json(
      createSuccessResponse({
        services: servicesResult,
        pagination: {
          total: totalCount[0]?.count || 0,
          limit: validParams.limit,
          offset: validParams.offset,
          hasMore: (totalCount[0]?.count || 0) > validParams.offset + validParams.limit
        },
        filters: validParams
      }, 'Lista de servicios médicos obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo lista de servicios médicos');
  }
}

/**
 * Obtiene servicios por categoría
 */
async function getServicesByCategory(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    
    if (!category) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'category es requerida'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const servicesByCategory = await db
      .select({
        id: medicalServices.id,
        name: medicalServices.name,
        description: medicalServices.description,
        code: medicalServices.code,
        durationMinutes: medicalServices.durationMinutes,
        basePrice: medicalServices.basePrice,
        requiresPreparation: medicalServices.requiresPreparation,
        isActive: medicalServices.isActive,
        // Estadísticas de uso
        totalAppointments: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.serviceId} = ${medicalServices.id}
        )`,
        revenueGenerated: sql<number>`(
          SELECT COALESCE(SUM(${medicalServices.basePrice}), 0)
          FROM ${appointments} 
          WHERE ${appointments.serviceId} = ${medicalServices.id}
          AND ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}'
        )`
      })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, organizationId),
        eq(medicalServices.category, category)
      ))
      .orderBy(desc(sql`total_appointments`), asc(medicalServices.name));

    // Calcular estadísticas de la categoría
    const categoryStats = servicesByCategory.reduce((acc, service) => {
      acc.totalServices++;
      acc.activeServices += service.isActive ? 1 : 0;
      acc.totalAppointments += service.totalAppointments;
      acc.totalRevenue += service.revenueGenerated;
      acc.averagePrice += parseFloat(service.basePrice);
      acc.averageDuration += service.durationMinutes;
      return acc;
    }, {
      totalServices: 0,
      activeServices: 0,
      totalAppointments: 0,
      totalRevenue: 0,
      averagePrice: 0,
      averageDuration: 0
    });

    if (categoryStats.totalServices > 0) {
      categoryStats.averagePrice = Math.round(categoryStats.averagePrice / categoryStats.totalServices * 100) / 100;
      categoryStats.averageDuration = Math.round(categoryStats.averageDuration / categoryStats.totalServices);
    }

    return NextResponse.json(
      createSuccessResponse({
        category,
        services: servicesByCategory,
        categoryStats
      }, `Servicios de categoría '${category}' obtenidos exitosamente`),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo servicios por categoría');
  }
}

/**
 * Análisis de uso de servicios
 */
async function getUsageAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      serviceId: url.searchParams.get('serviceId') ? parseInt(url.searchParams.get('serviceId')!) : undefined,
      startDate: url.searchParams.get('startDate') || '',
      endDate: url.searchParams.get('endDate') || '',
      groupBy: url.searchParams.get('groupBy') as 'day'|'week'|'month' || 'month',
      includeRevenue: url.searchParams.get('includeRevenue') !== 'false'
    };

    const validationResult = ServiceUsageAnalysisSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const whereConditions = [
      eq(appointments.organizationId, organizationId),
      gte(appointments.createdAt, new Date(validParams.startDate)),
      lte(appointments.createdAt, new Date(validParams.endDate))
    ];

    if (validParams.serviceId) {
      whereConditions.push(eq(appointments.serviceId, validParams.serviceId));
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

    const usageData = await db
      .select({
        period: dateFormat,
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceCategory: medicalServices.category,
        servicePrice: medicalServices.basePrice,
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        revenue: validParams.includeRevenue ? sql<number>`
          sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)
        ` : sql<number>`0`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        uniqueDoctors: sql<number>`count(distinct ${appointments.doctorId})`
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(...whereConditions))
      .groupBy(dateFormat, medicalServices.id, medicalServices.name, medicalServices.category, medicalServices.basePrice)
      .orderBy(dateFormat, desc(sql`total_appointments`));

    // Calcular estadísticas generales
    const overallStats = usageData.reduce((acc, curr) => {
      acc.totalAppointments += curr.totalAppointments;
      acc.totalAttended += curr.attendedAppointments;
      acc.totalCanceled += curr.canceledAppointments;
      acc.totalRevenue += curr.revenue;
      acc.uniqueServices.add(curr.serviceId);
      return acc;
    }, {
      totalAppointments: 0,
      totalAttended: 0,
      totalCanceled: 0,
      totalRevenue: 0,
      uniqueServices: new Set()
    });

    return NextResponse.json(
      createSuccessResponse({
        period: {
          startDate: validParams.startDate,
          endDate: validParams.endDate,
          groupBy: validParams.groupBy
        },
        overallStats: {
          ...overallStats,
          uniqueServices: overallStats.uniqueServices.size,
          attendanceRate: overallStats.totalAppointments > 0 
            ? Math.round((overallStats.totalAttended * 100) / overallStats.totalAppointments * 100) / 100
            : 0
        },
        usageByPeriod: usageData,
        totalRecords: usageData.length
      }, 'Análisis de uso de servicios completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de uso de servicios');
  }
}

/**
 * Análisis de precios de servicios
 */
async function getPriceAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const params = {
      category: url.searchParams.get('category'),
      compareWithMarket: url.searchParams.get('compareWithMarket') === 'true'
    };

    const validationResult = PriceAnalysisSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const validParams = validationResult.data;
    const whereConditions = [eq(medicalServices.organizationId, organizationId), eq(medicalServices.isActive, true)];

    if (validParams.category) {
      whereConditions.push(eq(medicalServices.category, validParams.category));
    }

    const priceAnalysis = await db
      .select({
        category: medicalServices.category,
        serviceCount: sql<number>`count(*)`,
        averagePrice: sql<number>`avg(${medicalServices.basePrice})`,
        minPrice: sql<number>`min(${medicalServices.basePrice})`,
        maxPrice: sql<number>`max(${medicalServices.basePrice})`,
        medianPrice: sql<number>`
          (SELECT ${medicalServices.basePrice} 
           FROM ${medicalServices} ms2 
           WHERE ms2.category = ${medicalServices.category} 
           AND ms2.organization_id = ${organizationId}
           ORDER BY ms2.base_price 
           LIMIT 1 OFFSET (SELECT COUNT(*)/2 FROM ${medicalServices} ms3 WHERE ms3.category = ${medicalServices.category} AND ms3.organization_id = ${organizationId}))
        `,
        totalRevenue: sql<number>`
          COALESCE((
            SELECT SUM(${medicalServices.basePrice})
            FROM ${appointments} a
            JOIN ${medicalServices} ms ON a.service_id = ms.id
            WHERE ms.category = ${medicalServices.category}
            AND a.organization_id = ${organizationId}
            AND a.status = '${APPOINTMENT_STATUS.ATTENDED}'
          ), 0)
        `,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        pricePerMinute: sql<number>`avg(${medicalServices.basePrice} / ${medicalServices.durationMinutes})`
      })
      .from(medicalServices)
      .where(and(...whereConditions))
      .groupBy(medicalServices.category)
      .orderBy(desc(sql`average_price`));

    // Calcular estadísticas generales
    const overallStats = priceAnalysis.reduce((acc, curr) => {
      acc.totalServices += curr.serviceCount;
      acc.totalRevenue += curr.totalRevenue;
      acc.weightedAveragePrice += curr.averagePrice * curr.serviceCount;
      acc.minPrice = Math.min(acc.minPrice, curr.minPrice);
      acc.maxPrice = Math.max(acc.maxPrice, curr.maxPrice);
      return acc;
    }, {
      totalServices: 0,
      totalRevenue: 0,
      weightedAveragePrice: 0,
      minPrice: Infinity,
      maxPrice: 0
    });

    if (overallStats.totalServices > 0) {
      overallStats.weightedAveragePrice = Math.round(overallStats.weightedAveragePrice / overallStats.totalServices * 100) / 100;
    }

    // Recomendaciones de precios
    const recommendations = priceAnalysis.map(category => {
      const priceRange = category.maxPrice - category.minPrice;
      const isHighVariation = priceRange > category.averagePrice * 0.5;
      
      return {
        category: category.category,
        recommendation: isHighVariation 
          ? 'Considerar estandarizar precios en esta categoría'
          : 'Precios consistentes en esta categoría',
        suggestedPriceRange: {
          min: Math.round(category.averagePrice * 0.9 * 100) / 100,
          max: Math.round(category.averagePrice * 1.1 * 100) / 100
        },
        currentVariation: Math.round(priceRange * 100) / 100
      };
    });

    return NextResponse.json(
      createSuccessResponse({
        overallStats: {
          ...overallStats,
          minPrice: overallStats.minPrice === Infinity ? 0 : overallStats.minPrice
        },
        priceByCategory: priceAnalysis,
        recommendations,
        totalCategories: priceAnalysis.length
      }, 'Análisis de precios completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de precios');
  }
}

/**
 * Obtiene servicios más populares
 */
async function getPopularServices(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const period = url.searchParams.get('period') || 'month'; // week, month, quarter, year
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
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

    const popularServices = await db
      .select({
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceCategory: medicalServices.category,
        servicePrice: medicalServices.basePrice,
        serviceDuration: medicalServices.durationMinutes,
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        uniqueDoctors: sql<number>`count(distinct ${appointments.doctorId})`,
        attendanceRate: sql<number>`
          case when count(*) > 0 then 
            round((sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end) * 100.0) / count(*), 2)
          else 0 end
        `
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate)
      ))
      .groupBy(medicalServices.id, medicalServices.name, medicalServices.category, medicalServices.basePrice, medicalServices.durationMinutes)
      .orderBy(desc(sql`total_appointments`))
      .limit(limit);

    return NextResponse.json(
      createSuccessResponse({
        period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        popularServices,
        totalServices: popularServices.length
      }, 'Servicios populares obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo servicios populares');
  }
}

/**
 * Análisis de ingresos por servicios
 */
async function getRevenueAnalysis(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'month';
    
    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
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

    const revenueAnalysis = await db
      .select({
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceCategory: medicalServices.category,
        servicePrice: medicalServices.basePrice,
        totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        totalAppointments: sql<number>`count(*)`,
        averageRevenuePerAppointment: sql<number>`
          case when count(*) > 0 then 
            sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) / count(*)
          else 0 end
        `,
        revenueGrowth: sql<number>`
          COALESCE((
            (sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end) - 
             COALESCE((
               SELECT SUM(CASE WHEN a2.status = '${APPOINTMENT_STATUS.ATTENDED}' THEN ms2.base_price ELSE 0 END)
               FROM ${appointments} a2
               JOIN ${medicalServices} ms2 ON a2.service_id = ms2.id
               WHERE ms2.id = ${medicalServices.id}
               AND a2.created_at >= DATE_SUB(${sql`'${startDate.toISOString()}'`}, INTERVAL 1 MONTH)
               AND a2.created_at < ${sql`'${startDate.toISOString()}'`}
             ), 0)) / 
             NULLIF(COALESCE((
               SELECT SUM(CASE WHEN a2.status = '${APPOINTMENT_STATUS.ATTENDED}' THEN ms2.base_price ELSE 0 END)
               FROM ${appointments} a2
               JOIN ${medicalServices} ms2 ON a2.service_id = ms2.id
               WHERE ms2.id = ${medicalServices.id}
               AND a2.created_at >= DATE_SUB(${sql`'${startDate.toISOString()}'`}, INTERVAL 1 MONTH)
               AND a2.created_at < ${sql`'${startDate.toISOString()}'`}
             ), 0), 0) * 100
          ), 0)
        `
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.organizationId, organizationId),
        gte(appointments.createdAt, startDate)
      ))
      .groupBy(medicalServices.id, medicalServices.name, medicalServices.category, medicalServices.basePrice)
      .orderBy(desc(sql`total_revenue`));

    // Calcular estadísticas generales
    const totalRevenue = revenueAnalysis.reduce((sum, service) => sum + service.totalRevenue, 0);
    const totalAppointments = revenueAnalysis.reduce((sum, service) => sum + service.totalAppointments, 0);
    const totalAttended = revenueAnalysis.reduce((sum, service) => sum + service.attendedAppointments, 0);

    // Agrupar por categoría
    const revenueByCategory = revenueAnalysis.reduce((acc, service) => {
      const category = service.serviceCategory;
      if (!acc[category]) {
        acc[category] = {
          category,
          totalRevenue: 0,
          serviceCount: 0,
          totalAppointments: 0
        };
      }
      acc[category].totalRevenue += service.totalRevenue;
      acc[category].serviceCount++;
      acc[category].totalAppointments += service.totalAppointments;
      return acc;
    }, {} as Record<string, { category: string; totalRevenue: number; serviceCount: number; totalAppointments: number }>);

    return NextResponse.json(
      createSuccessResponse({
        period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        overallStats: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalAppointments,
          totalAttended,
          averageRevenuePerAppointment: totalAppointments > 0 
            ? Math.round(totalRevenue / totalAppointments * 100) / 100 
            : 0,
          conversionRate: totalAppointments > 0 
            ? Math.round((totalAttended * 100) / totalAppointments * 100) / 100
            : 0
        },
        revenueByService: revenueAnalysis,
        revenueByCategory: Object.values(revenueByCategory),
        totalServices: revenueAnalysis.length
      }, 'Análisis de ingresos completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de ingresos');
  }
}

/**
 * Obtiene lista de categorías disponibles
 */
async function getCategoriesList(organizationId: number) {
  try {
    const categories = await db
      .select({
        category: medicalServices.category,
        serviceCount: sql<number>`count(*)`,
        activeServiceCount: sql<number>`sum(case when ${medicalServices.isActive} = true then 1 else 0 end)`,
        averagePrice: sql<number>`avg(${medicalServices.basePrice})`,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        totalAppointments: sql<number>`
          COALESCE((
            SELECT COUNT(*)
            FROM ${appointments} a
            WHERE a.service_id IN (
              SELECT id FROM ${medicalServices} ms2 
              WHERE ms2.category = ${medicalServices.category} 
              AND ms2.organization_id = ${organizationId}
            )
          ), 0)
        `
      })
      .from(medicalServices)
      .where(eq(medicalServices.organizationId, organizationId))
      .groupBy(medicalServices.category)
      .orderBy(asc(medicalServices.category));

    return NextResponse.json(
      createSuccessResponse({
        categories,
        totalCategories: categories.length,
        totalServices: categories.reduce((sum, c) => sum + c.serviceCount, 0),
        totalActiveServices: categories.reduce((sum, c) => sum + c.activeServiceCount, 0)
      }, 'Lista de categorías obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo lista de categorías');
  }
}

/**
 * Obtiene detalles completos de un servicio específico
 */
async function getServiceDetails(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const serviceId = url.searchParams.get('serviceId');
    
    if (!serviceId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'serviceId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Obtener información básica del servicio
    const serviceInfo = await db
      .select()
      .from(medicalServices)
      .where(and(
        eq(medicalServices.id, parseInt(serviceId)),
        eq(medicalServices.organizationId, organizationId)
      ))
      .limit(1);

    if (serviceInfo.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Servicio no encontrado'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Obtener estadísticas del servicio
    const [serviceStats, recentAppointments, doctorsUsingService] = await Promise.all([
      // Estadísticas de citas
      db.select({
        totalAppointments: sql<number>`count(*)`,
        attendedAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then 1 else 0 end)`,
        canceledAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.CANCELED}' then 1 else 0 end)`,
        pendingAppointments: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.PENDING}' then 1 else 0 end)`,
        totalRevenue: sql<number>`sum(case when ${appointments.status} = '${APPOINTMENT_STATUS.ATTENDED}' then ${medicalServices.basePrice} else 0 end)`,
        uniquePatients: sql<number>`count(distinct ${appointments.patientId})`,
        uniqueDoctors: sql<number>`count(distinct ${appointments.doctorId})`,
        appointmentsThisMonth: sql<number>`
          sum(case when MONTH(${appointments.createdAt}) = MONTH(CURDATE()) 
              AND YEAR(${appointments.createdAt}) = YEAR(CURDATE()) then 1 else 0 end)
        `
      })
        .from(appointments)
        .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
        .where(eq(appointments.serviceId, parseInt(serviceId))),
      
      // Citas recientes
      db.select({
        appointmentId: appointments.id,
        status: appointments.status,
        createdAt: appointments.createdAt,
        patientName: sql<string>`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        doctorName: users.displayName
      })
        .from(appointments)
        .leftJoin(patients, eq(appointments.patientId, patients.id))
        .leftJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
        .leftJoin(users, eq(doctors.userId, users.id))
        .where(eq(appointments.serviceId, parseInt(serviceId)))
        .orderBy(desc(appointments.createdAt))
        .limit(10),
      
      // Doctores que usan este servicio
      db.select({
        doctorId: doctors.idDoctor,
        doctorName: users.displayName,
        speciality: doctors.speciality,
        appointmentCount: sql<number>`count(*)`,
        lastAppointment: sql<Date>`max(${appointments.createdAt})`
      })
        .from(appointments)
        .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(eq(appointments.serviceId, parseInt(serviceId)))
        .groupBy(doctors.idDoctor, users.displayName, doctors.speciality)
        .orderBy(desc(sql`appointment_count`))
        .limit(10)
    ]);

    const stats = serviceStats[0] || {
      totalAppointments: 0,
      attendedAppointments: 0,
      canceledAppointments: 0,
      pendingAppointments: 0,
      totalRevenue: 0,
      uniquePatients: 0,
      uniqueDoctors: 0,
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
        serviceInfo: serviceInfo[0],
        statistics: {
          ...stats,
          attendanceRate,
          cancellationRate,
          averageRevenuePerAppointment: stats.totalAppointments > 0 
            ? Math.round(stats.totalRevenue / stats.totalAppointments * 100) / 100
            : 0
        },
        recentAppointments,
        doctorsUsingService,
        isActive: serviceInfo[0].isActive
      }, 'Detalles del servicio obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo detalles del servicio');
  }
}

/**
 * Obtiene servicios que requieren preparación
 */
async function getServicesRequiringPreparation(organizationId: number) {
  try {
    const servicesWithPreparation = await db
      .select({
        id: medicalServices.id,
        name: medicalServices.name,
        category: medicalServices.category,
        durationMinutes: medicalServices.durationMinutes,
        basePrice: medicalServices.basePrice,
        preparationInstructions: medicalServices.preparationInstructions,
        isActive: medicalServices.isActive,
        totalAppointments: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.serviceId} = ${medicalServices.id}
        )`
      })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, organizationId),
        eq(medicalServices.requiresPreparation, true)
      ))
      .orderBy(asc(medicalServices.category), asc(medicalServices.name));

    return NextResponse.json(
      createSuccessResponse({
        servicesRequiringPreparation: servicesWithPreparation,
        totalServices: servicesWithPreparation.length,
        activeServices: servicesWithPreparation.filter(s => s.isActive).length
      }, 'Servicios que requieren preparación obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo servicios que requieren preparación');
  }
}

/**
 * Análisis de duración de servicios
 */
async function getDurationAnalysis(organizationId: number) {
  try {
    const durationAnalysis = await db
      .select({
        category: medicalServices.category,
        serviceCount: sql<number>`count(*)`,
        averageDuration: sql<number>`avg(${medicalServices.durationMinutes})`,
        minDuration: sql<number>`min(${medicalServices.durationMinutes})`,
        maxDuration: sql<number>`max(${medicalServices.durationMinutes})`,
        totalDurationHours: sql<number>`sum(${medicalServices.durationMinutes}) / 60`,
        shortServices: sql<number>`sum(case when ${medicalServices.durationMinutes} <= 30 then 1 else 0 end)`,
        mediumServices: sql<number>`sum(case when ${medicalServices.durationMinutes} > 30 AND ${medicalServices.durationMinutes} <= 60 then 1 else 0 end)`,
        longServices: sql<number>`sum(case when ${medicalServices.durationMinutes} > 60 then 1 else 0 end)`
      })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, organizationId),
        eq(medicalServices.isActive, true)
      ))
      .groupBy(medicalServices.category)
      .orderBy(desc(sql`average_duration`));

    // Calcular estadísticas generales
    const overallStats = durationAnalysis.reduce((acc, curr) => {
      acc.totalServices += curr.serviceCount;
      acc.totalDurationHours += curr.totalDurationHours;
      acc.shortServices += curr.shortServices;
      acc.mediumServices += curr.mediumServices;
      acc.longServices += curr.longServices;
      acc.weightedAverageDuration += curr.averageDuration * curr.serviceCount;
      return acc;
    }, {
      totalServices: 0,
      totalDurationHours: 0,
      shortServices: 0,
      mediumServices: 0,
      longServices: 0,
      weightedAverageDuration: 0
    });

    if (overallStats.totalServices > 0) {
      overallStats.weightedAverageDuration = Math.round(overallStats.weightedAverageDuration / overallStats.totalServices);
    }

    return NextResponse.json(
      createSuccessResponse({
        overallStats,
        durationByCategory: durationAnalysis,
        totalCategories: durationAnalysis.length,
        durationDistribution: {
          short: overallStats.shortServices,
          medium: overallStats.mediumServices,
          long: overallStats.longServices
        }
      }, 'Análisis de duración completado'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en análisis de duración');
  }
}