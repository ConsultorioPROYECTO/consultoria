/**
 * @fileoverview API de gestión de pacientes para agentes
 * @module api/n8n/patients-manager
 * @author Santiago Prada
 * 
 * Esta API proporciona funcionalidades completas para la gestión de pacientes,
 * incluyendo creación, actualización, búsqueda avanzada y obtención de historial.
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
import { patients, appointments, doctors, users, medicalServices, organization } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { handleDatabaseError } from '@/lib/api-helpers';

// === Schemas de validación ===

/**
 * Schema para crear un nuevo paciente
 */
const CreatePatientSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido').max(255),
  lastName: z.string().min(1, 'Apellido es requerido').max(255),
  identificationType: z.string().min(1, 'Tipo de identificación es requerido'),
  identificationNumber: z.string().min(1, 'Número de identificación es requerido'),
  birthDate: z.string().optional(),
  gender: z.enum(['M', 'F', 'Other']).optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional()
});

/**
 * Schema para actualizar un paciente
 */
const UpdatePatientSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  identificationType: z.string().optional(),
  identificationNumber: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['M', 'F', 'Other']).optional(),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional()
});

/**
 * Schema para búsqueda avanzada de pacientes
 */
const AdvancedSearchSchema = z.object({
  searchTerm: z.string().optional(),
  identificationType: z.string().optional(),
  gender: z.enum(['M', 'F', 'Other']).optional(),
  ageMin: z.number().int().min(0).optional(),
  ageMax: z.number().int().max(120).optional(),
  hasAppointments: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
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
 * GET /api/n8n/patients-manager
 * Obtiene pacientes con diferentes filtros y opciones
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
      case 'search':
        return await searchPatients(request, organizationId);
      
      case 'get-by-id':
        return await getPatientById(request, organizationId);
      
      case 'get-history':
        return await getPatientHistory(request, organizationId);
      
      case 'advanced-search':
        return await advancedSearchPatients(request, organizationId);
      
      case 'statistics':
        return await getPatientsStatistics(organizationId);
      
      default:
        return await getAllPatients(request, organizationId);
    }

  } catch (error) {
    console.error('Error en GET /api/n8n/patients-manager:', error);
    return createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor', HTTP_STATUS.INTERNAL_ERROR);
  }
}

/**
 * POST /api/n8n/patients-manager
 * Crea un nuevo paciente
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
    
    // Validar datos de entrada
    const validationResult = CreatePatientSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const patientData = {
      ...validationResult.data,
      identificationType: validationResult.data.identificationType as 'DNI'|'CC'|'TI'|'CE'|'PP'|'RC'|'AS',
      gender: validationResult.data.gender as 'M'|'F'|'Other',
      birthDate: validationResult.data.birthDate ? new Date(validationResult.data.birthDate) : undefined
    };

    // Verificar que no exista un paciente con la misma identificación
    const existingPatient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(
        eq(patients.organizationId, organizationId),
        eq(patients.identificationNumber, patientData.identificationNumber)
      ))
      .limit(1);

    if (existingPatient.length > 0) {
      return createErrorResponse(API_ERRORS.CONFLICT, 'Ya existe un paciente con este número de identificación', HTTP_STATUS.CONFLICT);
    }

    // Crear el paciente y obtener el registro insertado
    const [newPatient] = await db
      .insert(patients)
      .values({
        ...patientData,
        organizationId
      })
      .returning();

    return NextResponse.json(
      createSuccessResponse(newPatient, 'Paciente creado exitosamente'),
      { status: HTTP_STATUS.CREATED }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error creando paciente');
  }
}

/**
 * PUT /api/n8n/patients-manager
 * Actualiza un paciente existente
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
    const patientId = url.searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'patientId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const body = await request.json();
    
    // Validar datos de entrada
    const validationResult = UpdatePatientSchema.safeParse(body);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Datos inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const { identificationType, gender, birthDate, ...restData } = validationResult.data;
    const updateData = {
      ...restData,
      ...(identificationType && { identificationType: identificationType as 'DNI'|'CC'|'TI'|'CE'|'PP'|'RC'|'AS' }),
      ...(gender && { gender: gender as 'M'|'F'|'Other' }),
      ...(birthDate && { birthDate: typeof birthDate === 'string' ? new Date(birthDate) : birthDate })
    };

    // Verificar que el paciente existe y pertenece a la organización
    const existingPatient = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(
        eq(patients.id, parseInt(patientId)),
        eq(patients.organizationId, organizationId)
      ))
      .limit(1);

    if (existingPatient.length === 0) {
      return createErrorResponse(API_ERRORS.NOT_FOUND, 'Paciente no encontrado', HTTP_STATUS.NOT_FOUND);
    }

    // Si se está actualizando el número de identificación, verificar que no exista otro paciente con el mismo
    if (updateData.identificationNumber) {
      const duplicatePatient = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(
          eq(patients.organizationId, organizationId),
          eq(patients.identificationNumber, updateData.identificationNumber),
          sql`${patients.id} != ${parseInt(patientId)}`
        ))
        .limit(1);

      if (duplicatePatient.length > 0) {
        return createErrorResponse(API_ERRORS.CONFLICT, 'Ya existe otro paciente con este número de identificación', HTTP_STATUS.CONFLICT);
      }
    }

    // Actualizar el paciente
    await db
      .update(patients)
      .set(updateData)
      .where(and(
        eq(patients.id, parseInt(patientId)),
        eq(patients.organizationId, organizationId)
      ));

    // Obtener el paciente actualizado
    const updatedPatient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, parseInt(patientId)))
      .limit(1);

    return NextResponse.json(
      createSuccessResponse(updatedPatient[0], 'Paciente actualizado exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error actualizando paciente');
  }
}

// === Funciones de consulta ===

/**
 * Obtiene todos los pacientes con paginación
 */
async function getAllPatients(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const patientsResult = await db
      .select()
      .from(patients)
      .where(eq(patients.organizationId, organizationId))
      .limit(limit)
      .offset(offset)
      .orderBy(asc(patients.firstName), asc(patients.lastName));

    // Contar total de pacientes
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.organizationId, organizationId));

    return NextResponse.json(
      createSuccessResponse({
        patients: patientsResult,
        pagination: {
          total: totalCount[0]?.count || 0,
          limit,
          offset,
          hasMore: (totalCount[0]?.count || 0) > offset + limit
        }
      }, 'Pacientes obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo pacientes');
  }
}

/**
 * Busca pacientes por término
 */
async function searchPatients(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!searchTerm) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'searchTerm es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const patientsResult = await db
      .select()
      .from(patients)
      .where(and(
        eq(patients.organizationId, organizationId),
        sql`(
          ${patients.firstName} LIKE ${`%${searchTerm}%`} OR 
          ${patients.lastName} LIKE ${`%${searchTerm}%`} OR 
          ${patients.identificationNumber} LIKE ${`%${searchTerm}%`} OR 
          ${patients.phone} LIKE ${`%${searchTerm}%`} OR 
          ${patients.email} LIKE ${`%${searchTerm}%`}
        )`
      ))
      .limit(limit)
      .orderBy(asc(patients.firstName), asc(patients.lastName));

    return NextResponse.json(
      createSuccessResponse(patientsResult, 'Búsqueda de pacientes completada'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error buscando pacientes');
  }
}

/**
 * Obtiene un paciente por ID
 */
async function getPatientById(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'patientId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const patient = await db
      .select()
      .from(patients)
      .where(and(
        eq(patients.id, parseInt(patientId)),
        eq(patients.organizationId, organizationId)
      ))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Paciente no encontrado'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      createSuccessResponse(patient[0], 'Paciente obtenido exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo paciente');
  }
}

/**
 * Obtiene el historial de citas de un paciente
 */
async function getPatientHistory(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const patientId = url.searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'patientId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Verificar que el paciente existe y pertenece a la organización
    const patient = await db
      .select()
      .from(patients)
      .where(and(
        eq(patients.id, parseInt(patientId)),
        eq(patients.organizationId, organizationId)
      ))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Paciente no encontrado'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Obtener historial de citas
    const appointmentHistory = await db
      .select({
        appointmentId: appointments.id,
        status: appointments.status,
        syncStatus: appointments.sync_status,
        googleEventId: appointments.google_event_id,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        // Información del doctor
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorName: users.displayName,
        doctorEmail: users.email,
        // Información del servicio
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceDescription: medicalServices.description,
        serviceDuration: medicalServices.durationMinutes,
        servicePrice: medicalServices.basePrice,
        serviceCategory: medicalServices.category
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.patientId, parseInt(patientId)),
        eq(appointments.organizationId, organizationId)
      ))
      .orderBy(desc(appointments.createdAt));

    return NextResponse.json(
      createSuccessResponse({
        patient: patient[0],
        appointmentHistory,
        totalAppointments: appointmentHistory.length
      }, 'Historial del paciente obtenido exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo historial del paciente');
  }
}

/**
 * Búsqueda avanzada de pacientes
 */
async function advancedSearchPatients(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const searchParams = {
      searchTerm: url.searchParams.get('searchTerm'),
      identificationType: url.searchParams.get('identificationType'),
      gender: url.searchParams.get('gender'),
      ageMin: url.searchParams.get('ageMin') ? parseInt(url.searchParams.get('ageMin')!) : undefined,
      ageMax: url.searchParams.get('ageMax') ? parseInt(url.searchParams.get('ageMax')!) : undefined,
      hasAppointments: url.searchParams.get('hasAppointments') === 'true',
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    // Validar parámetros
    const validationResult = AdvancedSearchSchema.safeParse(searchParams);
    if (!validationResult.success) {
      return createErrorResponse(API_ERRORS.VALIDATION_ERROR, 'Parámetros inválidos', HTTP_STATUS.BAD_REQUEST);
    }

    const params = validationResult.data;
    const whereConditions = [eq(patients.organizationId, organizationId)];

    // Aplicar filtros
    if (params.searchTerm) {
      whereConditions.push(
        sql`(
          ${patients.firstName} LIKE ${`%${params.searchTerm}%`} OR 
          ${patients.lastName} LIKE ${`%${params.searchTerm}%`} OR 
          ${patients.identificationNumber} LIKE ${`%${params.searchTerm}%`} OR 
          ${patients.phone} LIKE ${`%${params.searchTerm}%`} OR 
          ${patients.email} LIKE ${`%${params.searchTerm}%`}
        )`
      );
    }

    if (params.identificationType) {
      whereConditions.push(eq(patients.identificationType, params.identificationType as 'DNI'|'CC'|'TI'|'CE'|'PP'|'RC'|'AS'));
    }

    if (params.gender) {
      whereConditions.push(eq(patients.gender, params.gender as 'M'|'F'|'Other'));
    }

    // Filtros de edad (requieren cálculo)
    if (params.ageMin !== undefined || params.ageMax !== undefined) {
      if (params.ageMin !== undefined && params.ageMax !== undefined) {
        whereConditions.push(
          sql`TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN ${params.ageMin} AND ${params.ageMax}`
        );
      } else if (params.ageMin !== undefined) {
        whereConditions.push(
          sql`TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) >= ${params.ageMin}`
        );
      } else if (params.ageMax !== undefined) {
        whereConditions.push(
          sql`TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) <= ${params.ageMax}`
        );
      }
    }

    let query = db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        identificationType: patients.identificationType,
        identificationNumber: patients.identificationNumber,
        birthDate: patients.birthDate,
        gender: patients.gender,
        phone: patients.phone,
        email: patients.email,
        age: sql<number>`TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE())`,
        appointmentCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${appointments} 
          WHERE ${appointments.patientId} = ${patients.id}
        )`
      })
      .from(patients)
      .where(and(...whereConditions))
      .limit(params.limit)
      .offset(params.offset)
      .orderBy(asc(patients.firstName), asc(patients.lastName));

    // Si se filtra por tener citas, agregar join
    if (params.hasAppointments) {
      query = db
        .selectDistinct({
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          identificationType: patients.identificationType,
          identificationNumber: patients.identificationNumber,
          birthDate: patients.birthDate,
          gender: patients.gender,
          phone: patients.phone,
          email: patients.email,
          age: sql<number>`TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE())`,
          appointmentCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${appointments} 
            WHERE ${appointments.patientId} = ${patients.id}
          )`
        })
        .from(patients)
        .innerJoin(appointments, eq(patients.id, appointments.patientId))
        .where(and(...whereConditions))
        .limit(params.limit)
        .offset(params.offset)
        .orderBy(asc(patients.firstName), asc(patients.lastName));
    }

    const patientsResult = await query;

    return NextResponse.json(
      createSuccessResponse({
        patients: patientsResult,
        searchParams: params,
        totalFound: patientsResult.length
      }, 'Búsqueda avanzada completada'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error en búsqueda avanzada');
  }
}

/**
 * Obtiene estadísticas de pacientes
 */
async function getPatientsStatistics(organizationId: number) {
  try {
    const [totalPatients, genderStats, ageStats, appointmentStats] = await Promise.all([
      // Total de pacientes
      db.select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(eq(patients.organizationId, organizationId)),
      
      // Estadísticas por género
      db.select({
        gender: patients.gender,
        count: sql<number>`count(*)`
      })
        .from(patients)
        .where(eq(patients.organizationId, organizationId))
        .groupBy(patients.gender),
      
      // Estadísticas por rango de edad
      db.select({
        ageRange: sql<string>`
          CASE 
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) < 18 THEN 'Menor de 18'
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN 18 AND 30 THEN '18-30'
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN 31 AND 50 THEN '31-50'
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN 51 AND 70 THEN '51-70'
            ELSE 'Mayor de 70'
          END
        `,
        count: sql<number>`count(*)`
      })
        .from(patients)
        .where(and(
          eq(patients.organizationId, organizationId),
          sql`${patients.birthDate} IS NOT NULL`
        ))
        .groupBy(sql`
          CASE 
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) < 18 THEN 'Menor de 18'
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN 18 AND 30 THEN '18-30'
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN 31 AND 50 THEN '31-50'
            WHEN TIMESTAMPDIFF(YEAR, ${patients.birthDate}, CURDATE()) BETWEEN 51 AND 70 THEN '51-70'
            ELSE 'Mayor de 70'
          END
        `),
      
      // Pacientes con y sin citas
      db.select({
        hasAppointments: sql<string>`
          CASE 
            WHEN COUNT(${appointments.id}) > 0 THEN 'Con citas'
            ELSE 'Sin citas'
          END
        `,
        count: sql<number>`count(DISTINCT ${patients.id})`
      })
        .from(patients)
        .leftJoin(appointments, eq(patients.id, appointments.patientId))
        .where(eq(patients.organizationId, organizationId))
        .groupBy(sql`
          CASE 
            WHEN COUNT(${appointments.id}) > 0 THEN 'Con citas'
            ELSE 'Sin citas'
          END
        `)
    ]);

    const statistics = {
      total: totalPatients[0]?.count || 0,
      byGender: genderStats,
      byAgeRange: ageStats,
      byAppointments: appointmentStats
    };

    return NextResponse.json(
      createSuccessResponse(statistics, 'Estadísticas de pacientes obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo estadísticas de pacientes');
  }
}