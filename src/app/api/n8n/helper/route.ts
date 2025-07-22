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
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return { success: false, error: 'API Key requerida en header x-api-key' };
    }

    // Verificar que la API key existe en la organización
    const orgResult = await db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.apiKey, apiKey))
      .limit(1);

    if (orgResult.length === 0) {
      return { success: false, error: 'API Key inválida' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en autenticación:', error);
    return { success: false, error: 'Error interno de autenticación' };
  }
}

/**
 * Obtiene el ID de organización desde la API key
 * @param apiKey - API key de la organización
 * @returns ID de la organización o null
 */
async function getOrganizationIdFromApiKey(apiKey: string): Promise<number | null> {
  try {
    const result = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.apiKey, apiKey))
      .limit(1);
    
    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error('Error obteniendo organización:', error);
    return null;
  }
}

// === Endpoints ===

/**
 * GET /api/n8n/helper/organization-summary
 * Obtiene un resumen completo de la organización con estadísticas
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticar API key
    const authResult = await authenticateApiKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.UNAUTHORIZED, authResult.error),
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const apiKey = request.headers.get('x-api-key')!;
    const organizationId = await getOrganizationIdFromApiKey(apiKey);
    
    if (!organizationId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Organización no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    const url = new URL(request.url);
    const endpoint = url.searchParams.get('endpoint');

    switch (endpoint) {
      case 'organization-summary':
        return await getOrganizationSummary(organizationId);
      
      case 'doctors-with-services':
        return await getDoctorsWithServices(organizationId);
      
      case 'patients-search':
        return await searchPatients(request, organizationId);
      
      case 'appointments-today':
        return await getTodayAppointments(organizationId);
      
      case 'appointments-upcoming':
        return await getUpcomingAppointments(request, organizationId);
      
      case 'doctor-availability':
        return await getDoctorAvailability(request, organizationId);
      
      case 'medical-services':
        return await getMedicalServices(organizationId);
      
      case 'appointment-details':
        return await getAppointmentDetails(request, organizationId);
      
      default:
        return NextResponse.json(
          createErrorResponse(API_ERRORS.BAD_REQUEST, 'Endpoint no válido. Endpoints disponibles: organization-summary, doctors-with-services, patients-search, appointments-today, appointments-upcoming, doctor-availability, medical-services, appointment-details'),
          { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

  } catch (error) {
    console.error('Error en GET /api/n8n/helper:', error);
    return NextResponse.json(
      createErrorResponse(API_ERRORS.INTERNAL_ERROR, 'Error interno del servidor'),
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}

/**
 * Obtiene resumen completo de la organización
 */
async function getOrganizationSummary(organizationId: number) {
  try {
    // Información básica de la organización
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
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Organización no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Estadísticas
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

    return NextResponse.json(
      createSuccessResponse(summary, 'Resumen de organización obtenido exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo resumen de organización');
  }
}

/**
 * Obtiene doctores con sus servicios
 */
async function getDoctorsWithServices(organizationId: number) {
  try {
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

    return NextResponse.json(
      createSuccessResponse(doctorsWithServices, 'Doctores obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo doctores');
  }
}

/**
 * Busca pacientes por término de búsqueda
 */
async function searchPatients(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');

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

    const patientsResult = await query;

    return NextResponse.json(
      createSuccessResponse(patientsResult, 'Pacientes obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error buscando pacientes');
  }
}

/**
 * Obtiene citas de hoy
 */
async function getTodayAppointments(organizationId: number) {
  try {
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

    return NextResponse.json(
      createSuccessResponse(todayAppointments, 'Citas de hoy obtenidas exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo citas de hoy');
  }
}

/**
 * Obtiene citas próximas
 */
async function getUpcomingAppointments(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');
    
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

    return NextResponse.json(
      createSuccessResponse(upcomingAppointments, `Citas próximas (${days} días) obtenidas exitosamente`),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo citas próximas');
  }
}

/**
 * Obtiene disponibilidad de doctores
 */
async function getDoctorAvailability(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId');
    // const date = url.searchParams.get('date');

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

    return NextResponse.json(
      createSuccessResponse(doctorsAvailability, 'Disponibilidad de doctores obtenida exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo disponibilidad de doctores');
  }
}

/**
 * Obtiene servicios médicos
 */
async function getMedicalServices(organizationId: number) {
  try {
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

    return NextResponse.json(
      createSuccessResponse(services, 'Servicios médicos obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo servicios médicos');
  }
}

/**
 * Obtiene detalles de una cita específica
 */
async function getAppointmentDetails(request: NextRequest, organizationId: number) {
  try {
    const url = new URL(request.url);
    const appointmentId = url.searchParams.get('appointmentId');
    
    if (!appointmentId) {
      return NextResponse.json(
        createErrorResponse(API_ERRORS.BAD_REQUEST, 'appointmentId es requerido'),
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

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
      return NextResponse.json(
        createErrorResponse(API_ERRORS.NOT_FOUND, 'Cita no encontrada'),
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json(
      createSuccessResponse(appointmentDetails[0], 'Detalles de cita obtenidos exitosamente'),
      { status: HTTP_STATUS.OK }
    );

  } catch (error) {
    return handleDatabaseError(error, 'Error obteniendo detalles de cita');
  }
}