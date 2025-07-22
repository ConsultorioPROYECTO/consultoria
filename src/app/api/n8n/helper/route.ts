/**
 * @fileoverview API Helper para agentes - Obtiene información relevante de la base de datos
 * @module api/n8n/helper
 * @author Santiago Prada
 * 
 * Esta API proporciona endpoints optimizados para que los agentes obtengan información
 * relevante de la base de datos mediante queries y joins eficientes, filtrados por organización.
 * 
 * @requires NextRequest from 'next/server'
 * @requires NextResponse from 'next/server'
 * @requires db from '@/db'
 * @requires eq, and, desc, asc, between from 'drizzle-orm'
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
import { eq, and, desc, asc, sql } from 'drizzle-orm';
// import { z } from 'zod';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERRORS,
  HTTP_STATUS
} from '@/types/api';
import { handleDatabaseError } from '@/lib/api-helpers';

// === Schemas de validación ===



// Schemas comentados temporalmente para evitar errores de linting
// const DateRangeSchema = z.object({
//   startDate: z.string().optional(),
//   endDate: z.string().optional()
// });

// const PatientSearchSchema = z.object({
//   searchTerm: z.string().min(1).optional(),
//   limit: z.number().int().min(1).max(100).default(20)
// });

// const DoctorAvailabilitySchema = z.object({
//   doctorId: z.number().int().positive().optional(),
//   date: z.string().optional()
// });

// === Funciones Helper ===

/**
 * Autentica la API key desde los headers
 * @param request - Request de Next.js
 * @returns Resultado de autenticación
 */
async function authenticateApiKey(request: NextRequest): Promise<{success: boolean, error?: string}> {
  const startTime = Date.now();
  console.log('[API_HELPER] 🔐 Iniciando autenticación de API key');
  
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      console.warn('[API_HELPER] ⚠️ Intento de acceso sin API key');
      return { success: false, error: 'API Key requerida en header x-api-key' };
    }

    console.log('[API_HELPER] 🔍 Verificando API key en base de datos...');
    
    // Verificar que la API key existe en la organización
    const orgResult = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.apiKey, apiKey))
      .limit(1);

    if (orgResult.length === 0) {
      console.warn('[API_HELPER] ❌ API key inválida proporcionada');
      return { success: false, error: 'API Key inválida' };
    }

    const duration = Date.now() - startTime;
    console.log(`[API_HELPER] ✅ Autenticación exitosa para organización: ${orgResult[0].name} (ID: ${orgResult[0].id}) - Tiempo: ${duration}ms`);
    return { success: true };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API_HELPER] 💥 Error en autenticación (${duration}ms):`, error);
    return { success: false, error: 'Error interno de autenticación' };
  }
}

/**
 * Obtiene el ID de organización desde la API key
 * @param apiKey - API key de la organización
 * @returns ID de la organización o null
 */
async function getOrganizationIdFromApiKey(apiKey: string): Promise<number | null> {
  console.log('[API_HELPER] 🏢 Obteniendo ID de organización desde API key');
  
  try {
    const result = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.apiKey, apiKey))
      .limit(1);
    
    if (result.length > 0) {
      console.log(`[API_HELPER] ✅ Organización encontrada: ID ${result[0].id}`);
      return result[0].id;
    } else {
      console.warn('[API_HELPER] ⚠️ No se encontró organización para la API key proporcionada');
      return null;
    }
  } catch (error) {
    console.error('[API_HELPER] 💥 Error obteniendo organización:', error);
    return null;
  }
}

// === Endpoints ===

/**
 * GET /api/n8n/helper/organization-summary
 * Obtiene un resumen completo de la organización con estadísticas
 */
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`[API_HELPER] 🚀 Nueva petición iniciada - ID: ${requestId}`);
  console.log(`[API_HELPER] 📍 URL: ${request.url}`);
  console.log(`[API_HELPER] 🕐 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Autenticar API key
    console.log(`[API_HELPER] [${requestId}] 🔐 Iniciando proceso de autenticación`);
    const authResult = await authenticateApiKey(request);
    if (!authResult.success) {
      console.warn(`[API_HELPER] [${requestId}] ❌ Autenticación fallida: ${authResult.error}`);
      return NextResponse.json(
        createErrorResponse(API_ERRORS.UNAUTHORIZED, authResult.error),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const apiKey = request.headers.get('x-api-key')!;
    const organizationId = await getOrganizationIdFromApiKey(apiKey);
    
    if (!organizationId) {
      console.error(`[API_HELPER] [${requestId}] ❌ No se pudo obtener ID de organización`);
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Organización no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');
    
    console.log(`[API_HELPER] [${requestId}] 🎯 Endpoint solicitado: ${endpoint || 'ninguno'}`);
    console.log(`[API_HELPER] [${requestId}] 🏢 Organización ID: ${organizationId}`);

    switch (endpoint) {
      case 'organization-summary':
        console.log(`[API_HELPER] [${requestId}] 📊 Ejecutando: organization-summary`);
        return await getOrganizationSummary(organizationId, requestId);
      
      case 'doctors-with-services':
        console.log(`[API_HELPER] [${requestId}] 👨‍⚕️ Ejecutando: doctors-with-services`);
        return await getDoctorsWithServices(organizationId, requestId);
      
      case 'patients-search':
        console.log(`[API_HELPER] [${requestId}] 🔍 Ejecutando: patients-search`);
        return await searchPatients(request, organizationId, requestId);
      
      case 'appointments-today':
        console.log(`[API_HELPER] [${requestId}] 📅 Ejecutando: appointments-today`);
        return await getTodayAppointments(organizationId, requestId);
      
      case 'appointments-upcoming':
        console.log(`[API_HELPER] [${requestId}] ⏰ Ejecutando: appointments-upcoming`);
        return await getUpcomingAppointments(request, organizationId, requestId);
      
      case 'doctor-availability':
        console.log(`[API_HELPER] [${requestId}] 🗓️ Ejecutando: doctor-availability`);
        return await getDoctorAvailability(request, organizationId, requestId);
      
      case 'medical-services':
        console.log(`[API_HELPER] [${requestId}] 🏥 Ejecutando: medical-services`);
        return await getMedicalServices(organizationId, requestId);
      
      case 'appointment-details':
        console.log(`[API_HELPER] [${requestId}] 📋 Ejecutando: appointment-details`);
        return await getAppointmentDetails(request, organizationId, requestId);
      
      default:
        console.warn(`[API_HELPER] [${requestId}] ❌ Endpoint no válido solicitado: ${endpoint}`);
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Endpoint no válido. Endpoints disponibles: organization-summary, doctors-with-services, patients-search, appointments-today, appointments-upcoming, doctor-availability, medical-services, appointment-details'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API_HELPER] [${requestId}] 💥 Error general en GET /api/n8n/helper (${duration}ms):`, error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  } finally {
    const duration = Date.now() - startTime;
    console.log(`[API_HELPER] [${requestId}] ⏱️ Petición completada en ${duration}ms`);
  }
}

/**
 * Obtiene resumen completo de la organización
 */
async function getOrganizationSummary(organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [ORG_SUMMARY]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de resumen de organización`);
  
  try {
    // Información básica de la organización
    console.log(`${logPrefix} 📋 Obteniendo información básica de organización`);
    const orgInfo = await db
      .select({
        id: organization.id,
        name: organization.name,
        phone: organization.phone,
        email: organization.email,
        address: organization.address
      })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (orgInfo.length === 0) {
      console.warn(`${logPrefix} ❌ Organización no encontrada con ID: ${organizationId}`);
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Organización no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Estadísticas
    console.log(`${logPrefix} 📊 Obteniendo estadísticas de la organización`);
    const [doctorsCount, patientsCount, servicesCount, appointmentsToday] = await Promise.all([
      // Contar doctores activos
      db.select({ count: sql<number>`count(*)` })
        .from(doctors)
        .innerJoin(users, eq(doctors.userId, users.id))
        .where(and(
          eq(users.organizationId, organizationId),
          eq(users.isActive, true)
        )),
      
      // Contar pacientes
      db.select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(eq(patients.organizationId, organizationId)),
      
      // Contar servicios activos
      db.select({ count: sql<number>`count(*)` })
        .from(medicalServices)
        .where(and(
          eq(medicalServices.organizationId, organizationId),
          eq(medicalServices.isActive, true)
        )),
      
      // Citas de hoy
      db.select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(and(
          eq(appointments.organizationId, organizationId),
          sql`DATE(${appointments.createdAt}) = CURDATE()`
        ))
    ]);

    const summary = {
      organization: orgInfo[0],
      statistics: {
        totalDoctors: doctorsCount[0]?.count || 0,
        totalPatients: patientsCount[0]?.count || 0,
        totalServices: servicesCount[0]?.count || 0,
        appointmentsToday: appointmentsToday[0]?.count || 0
      }
    };

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ Resumen obtenido exitosamente en ${duration}ms - Doctores: ${summary.statistics.totalDoctors}, Pacientes: ${summary.statistics.totalPatients}, Servicios: ${summary.statistics.totalServices}, Citas hoy: ${summary.statistics.appointmentsToday}`);
    
    return NextResponse.json(
      createSuccessResponse(summary, 'Resumen de organización obtenido exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo resumen de organización (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo resumen de organización');
  }
}

/**
 * Obtiene doctores con sus servicios
 */
async function getDoctorsWithServices(organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [DOCTORS]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de doctores con servicios`);
  
  try {
    console.log(`${logPrefix} 👨‍⚕️ Consultando doctores activos en base de datos`);
    const doctorsWithServices = await db
      .select({
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorPhone: doctors.privatePhone,
        userName: users.displayName,
        userEmail: users.email,
        userPhone: users.phoneNumber,
        isActive: users.isActive
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true)
      ))
      .orderBy(asc(users.displayName));

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ ${doctorsWithServices.length} doctores obtenidos exitosamente en ${duration}ms`);
    
    return NextResponse.json(
      createSuccessResponse(doctorsWithServices, 'Doctores obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo doctores (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo doctores');
  }
}

/**
 * Busca pacientes por término de búsqueda
 */
async function searchPatients(request: NextRequest, organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [PATIENTS]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando búsqueda de pacientes`);
  
  try {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    console.log(`${logPrefix} 🔍 Parámetros de búsqueda - Término: '${searchTerm}', Límite: ${limit}`);

    let query = db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        identificationType: patients.identificationType,
        identificationNumber: patients.identificationNumber,
        phone: patients.phone,
        email: patients.email,
        birthDate: patients.birthDate,
        gender: patients.gender
      })
      .from(patients)
      .where(eq(patients.organizationId, organizationId))
      .limit(limit)
      .orderBy(asc(patients.firstName));

    // Si hay término de búsqueda, filtrar
    if (searchTerm) {
      query = db
        .select({
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          identificationType: patients.identificationType,
          identificationNumber: patients.identificationNumber,
          phone: patients.phone,
          email: patients.email,
          birthDate: patients.birthDate,
          gender: patients.gender
        })
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
        .orderBy(asc(patients.firstName));
    }

    console.log(`${logPrefix} 📊 Ejecutando consulta de pacientes`);
    const patientsResult = await query;

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ ${patientsResult.length} pacientes encontrados en ${duration}ms`);
    console.log(`${logPrefix} 📋 Datos de pacientes encontrados:`, JSON.stringify(patientsResult, null, 2));
    
    const responseData = { message: 'Pacientes obtenidos exitosamente', data: patientsResult };
    console.log(`${logPrefix} 📤 Respuesta completa que se enviará:`, JSON.stringify(responseData, null, 2));
    
    return NextResponse.json(
      responseData,
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error buscando pacientes (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error buscando pacientes');
  }
}

/**
 * Obtiene citas de hoy
 */
async function getTodayAppointments(organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [TODAY_APPTS]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de citas de hoy`);
  
  try {
    console.log(`${logPrefix} 📅 Consultando citas del día actual`);
    const todayAppointments = await db
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
        sql`DATE(${appointments.createdAt}) = CURDATE()`
      ))
      .orderBy(desc(appointments.createdAt));

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ ${todayAppointments.length} citas de hoy obtenidas exitosamente en ${duration}ms`);
    
    return NextResponse.json(
      createSuccessResponse(todayAppointments, 'Citas de hoy obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo citas de hoy (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo citas de hoy');
  }
}

/**
 * Obtiene citas próximas
 */
async function getUpcomingAppointments(request: NextRequest, organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [UPCOMING_APPTS]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de citas próximas`);
  
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
    console.log(`${logPrefix} ⏰ Consultando citas próximas para los próximos ${days} días`);
    
    const upcomingAppointments = await db
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
        sql`${appointments.createdAt} >= CURDATE() AND ${appointments.createdAt} <= DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`
      ))
      .orderBy(asc(appointments.createdAt));

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ ${upcomingAppointments.length} citas próximas obtenidas exitosamente en ${duration}ms`);
    
    return NextResponse.json(
      createSuccessResponse(upcomingAppointments, `Citas próximas (${days} días) obtenidas exitosamente`),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo citas próximas (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo citas próximas');
  }
}

/**
 * Obtiene disponibilidad de doctores
 */
async function getDoctorAvailability(request: NextRequest, organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [DOCTOR_AVAIL]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de disponibilidad de doctores`);
  
  try {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId');
    // const date = url.searchParams.get('date');
    
    console.log(`${logPrefix} 🗓️ Parámetros - Doctor ID: ${doctorId || 'todos'}`);

    const whereConditions = [eq(users.organizationId, organizationId), eq(users.isActive, true)];
    
    if (doctorId) {
      whereConditions.push(eq(doctors.idDoctor, parseInt(doctorId)));
    }

    const doctorsAvailability = await db
      .select({
        doctorId: doctors.idDoctor,
        doctorSpeciality: doctors.speciality,
        doctorName: users.displayName,
        doctorEmail: users.email,
        calendarId: doctors.calendar_id,
        tokenGoogleId: doctors.tokenGoogleId
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(asc(users.displayName));

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ Disponibilidad de ${doctorsAvailability.length} doctores obtenida exitosamente en ${duration}ms`);
    
    return NextResponse.json(
      createSuccessResponse(doctorsAvailability, 'Disponibilidad de doctores obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo disponibilidad de doctores (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo disponibilidad de doctores');
  }
}

/**
 * Obtiene servicios médicos
 */
async function getMedicalServices(organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [SERVICES]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de servicios médicos`);
  
  try {
    console.log(`${logPrefix} 🏥 Consultando servicios médicos activos`);
    const services = await db
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
        isActive: medicalServices.isActive
      })
      .from(medicalServices)
      .where(and(
        eq(medicalServices.organizationId, organizationId),
        eq(medicalServices.isActive, true)
      ))
      .orderBy(asc(medicalServices.category), asc(medicalServices.name));

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ ${services.length} servicios médicos obtenidos exitosamente en ${duration}ms`);
    
    return NextResponse.json(
      createSuccessResponse(services, 'Servicios médicos obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo servicios médicos (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo servicios médicos');
  }
}

/**
 * Obtiene detalles de una cita específica
 */
async function getAppointmentDetails(request: NextRequest, organizationId: number, requestId?: string) {
  const logPrefix = `[API_HELPER] [${requestId || 'unknown'}] [APPT_DETAILS]`;
  const startTime = Date.now();
  console.log(`${logPrefix} 🚀 Iniciando obtención de detalles de cita`);
  
  try {
    const url = new URL(request.url);
    const appointmentId = url.searchParams.get('appointmentId');
    
    console.log(`${logPrefix} 📋 Parámetros - Appointment ID: ${appointmentId}`);
    
    if (!appointmentId) {
      console.warn(`${logPrefix} ❌ appointmentId no proporcionado`);
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'appointmentId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    console.log(`${logPrefix} 🔍 Consultando detalles de cita en base de datos`);
    const appointmentDetails = await db
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
        doctorPrivatePhone: doctors.privatePhone,
        doctorName: users.displayName,
        doctorEmail: users.email,
        doctorPhone: users.phoneNumber,
        // Información del paciente
        patientId: patients.id,
        patientFirstName: patients.firstName,
        patientLastName: patients.lastName,
        patientIdentificationType: patients.identificationType,
        patientIdentificationNumber: patients.identificationNumber,
        patientPhone: patients.phone,
        patientEmail: patients.email,
        patientBirthDate: patients.birthDate,
        patientGender: patients.gender,
        // Información del servicio
        serviceId: medicalServices.id,
        serviceName: medicalServices.name,
        serviceDescription: medicalServices.description,
        serviceCode: medicalServices.code,
        serviceDuration: medicalServices.durationMinutes,
        servicePrice: medicalServices.basePrice,
        serviceCategory: medicalServices.category,
        serviceRequiresPreparation: medicalServices.requiresPreparation,
        servicePreparationInstructions: medicalServices.preparationInstructions
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(
        eq(appointments.id, parseInt(appointmentId)),
        eq(appointments.organizationId, organizationId)
      ))
      .limit(1);

    if (appointmentDetails.length === 0) {
      console.warn(`${logPrefix} ❌ Cita no encontrada con ID: ${appointmentId}`);
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} ✅ Detalles de cita obtenidos exitosamente en ${duration}ms`);
    
    return NextResponse.json(
      createSuccessResponse(appointmentDetails[0], 'Detalles de cita obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} 💥 Error obteniendo detalles de cita (${duration}ms):`, error);
    return handleDatabaseError(error, 'Error obteniendo detalles de cita');
  }
}