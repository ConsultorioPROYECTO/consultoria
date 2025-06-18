// src/db/utils/GCalendar/calendar-db-utils.ts

import { eq, and, gte, lte, desc, asc, isNull, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../index';
import { doctors, type Doctor, type NewDoctor } from '../../schema/doctors';
import { appointments, type Appointment, type NewAppointment } from '../../schema/appointments';
import { z } from 'zod';

/**
 * @fileoverview Utilidades para el manejo de eventos de Google Calendar con la base de datos
 * @author Santiago Prada
 * @description Funciones para sincronizar y gestionar eventos entre Google Calendar y la base de datos local
 */

// --- Schemas de validación ---

export const SyncStatusSchema = z.enum(['pending', 'synced', 'failed', 'not_synced']);

export const CalendarSyncSchema = z.object({
  google_event_id: z.string().optional(),
  google_calendar_id: z.string().optional(),
  sync_status: SyncStatusSchema.default('pending'),
  last_sync_attempt: z.date().optional(),
  sync_error: z.string().optional(),
});

export const AppointmentWithCalendarSchema = z.object({
  doctorId: z.number(),
  patientId: z.number().optional(),
  serviceId: z.number().optional(),
  time: z.string(),
  date: z.date(),
  duration_minutes: z.number().default(30),
  is_virtual: z.boolean().default(false),
  meeting_link: z.string().optional(),
  notes: z.string().optional(),
}).merge(CalendarSyncSchema);

export type SyncStatus = z.infer<typeof SyncStatusSchema>;
export type CalendarSync = z.infer<typeof CalendarSyncSchema>;
export type AppointmentWithCalendar = z.infer<typeof AppointmentWithCalendarSchema>;

// --- Funciones para Doctores ---

/**
 * Obtiene un doctor por su ID con información de calendario
 */
export async function getDoctorWithCalendar(doctorId: number): Promise<Doctor | null> {
  try {
    const result = await db
      .select()
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('Error al obtener doctor:', error);
    throw new Error('Error al obtener información del doctor');
  }
}

/**
 * Actualiza la configuración de calendario de un doctor
 */
export async function updateDoctorCalendarConfig(
  doctorId: number,
  config: {
    calendar_id?: string;
    calendar_timezone?: string;
    calendar_color?: string;
    calendar_sync_enabled?: boolean;
    calendar_settings?: any;
    working_hours?: any;
    break_times?: any;
    appointment_duration?: number;
  }
): Promise<Doctor | null> {
  try {
    await db
      .update(doctors)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(eq(doctors.idDoctor, doctorId));
    const updated = await db
      .select()
      .from(doctors)
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);
    return updated[0] || null;
  } catch (error) {
    console.error('Error al actualizar configuración de calendario:', error);
    throw new Error('Error al actualizar configuración de calendario');
  }
}

/**
 * Actualiza el timestamp de última sincronización de un doctor
 */
export async function updateDoctorLastSync(doctorId: number): Promise<void> {
  try {
    await db
      .update(doctors)
      .set({
        last_calendar_sync: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(doctors.idDoctor, doctorId));
  } catch (error) {
    console.error('Error al actualizar última sincronización:', error);
    throw new Error('Error al actualizar última sincronización');
  }
}

/**
 * Obtiene todos los doctores con sincronización habilitada
 */
export async function getDoctorsWithSyncEnabled(): Promise<Doctor[]> {
  try {
    return await db
      .select()
      .from(doctors)
      .where(eq(doctors.calendar_sync_enabled, true));
  } catch (error) {
    console.error('Error al obtener doctores con sincronización:', error);
    throw new Error('Error al obtener doctores con sincronización');
  }
}

// --- Funciones para Citas ---

/**
 * Crea una nueva cita con información de Google Calendar
 */
export async function createAppointmentWithCalendar(
  appointmentData: AppointmentWithCalendar
): Promise<Appointment> {
  try {
    // Validar datos
    const validatedData = AppointmentWithCalendarSchema.parse(appointmentData);
    await db
      .insert(appointments)
      .values({
        ...validatedData,
        sync_status: validatedData.sync_status || 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    const inserted = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.id))
      .limit(1);
    return inserted[0];
  } catch (error) {
    console.error('Error al crear cita:', error);
    throw new Error('Error al crear cita con información de calendario');
  }
}

/**
 * Obtiene una cita por su ID de evento de Google Calendar
 */
export async function getAppointmentByGoogleEventId(
  googleEventId: string
): Promise<Appointment | null> {
  try {
    const result = await db
      .select()
      .from(appointments)
      .where(eq(appointments.google_event_id, googleEventId))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('Error al obtener cita por Google Event ID:', error);
    throw new Error('Error al obtener cita por Google Event ID');
  }
}

/**
 * Actualiza el estado de sincronización de una cita
 */
export async function updateAppointmentSyncStatus(
  appointmentId: number,
  syncData: {
    sync_status: SyncStatus;
    google_event_id?: string;
    google_calendar_id?: string;
    sync_error?: string;
  }
): Promise<Appointment | null> {
  try {
    await db
      .update(appointments)
      .set({
        ...syncData,
        last_sync_attempt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));
    const updated = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    return updated[0] || null;
  } catch (error) {
    console.error('Error al actualizar estado de sincronización:', error);
    throw new Error('Error al actualizar estado de sincronización');
  }
}

/**
 * Obtiene citas pendientes de sincronización
 */
export async function getPendingSyncAppointments(): Promise<Appointment[]> {
  try {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.sync_status, 'pending'))
      .orderBy(asc(appointments.createdAt));
  } catch (error) {
    console.error('Error al obtener citas pendientes:', error);
    throw new Error('Error al obtener citas pendientes de sincronización');
  }
}

/**
 * Obtiene citas con errores de sincronización
 */
export async function getFailedSyncAppointments(): Promise<Appointment[]> {
  try {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.sync_status, 'failed'))
      .orderBy(desc(appointments.last_sync_attempt));
  } catch (error) {
    console.error('Error al obtener citas con errores:', error);
    throw new Error('Error al obtener citas con errores de sincronización');
  }
}

/**
 * Obtiene citas de un doctor en un rango de fechas
 */
export async function getDoctorAppointmentsByDateRange(
  doctorId: number,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  try {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          gte(appointments.date, startDate),
          lte(appointments.date, endDate)
        )
      )
      .orderBy(asc(appointments.date), asc(appointments.time));
  } catch (error) {
    console.error('Error al obtener citas por rango de fechas:', error);
    throw new Error('Error al obtener citas por rango de fechas');
  }
}

/**
 * Obtiene citas sincronizadas de un doctor
 */
export async function getDoctorSyncedAppointments(
  doctorId: number
): Promise<Appointment[]> {
  try {
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.doctorId, doctorId),
          eq(appointments.sync_status, 'synced'),
          isNotNull(appointments.google_event_id)
        )
      )
      .orderBy(desc(appointments.date));
  } catch (error) {
    console.error('Error al obtener citas sincronizadas:', error);
    throw new Error('Error al obtener citas sincronizadas');
  }
}

/**
 * Elimina la información de Google Calendar de una cita
 */
export async function removeAppointmentCalendarInfo(
  appointmentId: number
): Promise<Appointment | null> {
  try {
    await db
      .update(appointments)
      .set({
        google_event_id: null,
        google_calendar_id: null,
        sync_status: 'not_synced',
        sync_error: null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));
    const updated = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);
    return updated[0] || null;
  } catch (error) {
    console.error('Error al eliminar información de calendario:', error);
    throw new Error('Error al eliminar información de calendario');
  }
}

// --- Funciones de estadísticas ---

/**
 * Obtiene estadísticas de sincronización de un doctor
 */
export async function getDoctorSyncStats(doctorId: number) {
  try {
    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        synced: sql<number>`sum(case when ${appointments.sync_status} = 'synced' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${appointments.sync_status} = 'pending' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${appointments.sync_status} = 'failed' then 1 else 0 end)`,
        not_synced: sql<number>`sum(case when ${appointments.sync_status} = 'not_synced' then 1 else 0 end)`,
      })
      .from(appointments)
      .where(eq(appointments.doctorId, doctorId));
    
    return stats[0] || {
      total: 0,
      synced: 0,
      pending: 0,
      failed: 0,
      not_synced: 0,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de sincronización:', error);
    throw new Error('Error al obtener estadísticas de sincronización');
  }
}

/**
 * Obtiene estadísticas generales de sincronización
 */
export async function getGeneralSyncStats() {
  try {
    const stats = await db
      .select({
        total_appointments: sql<number>`count(*)`,
        synced: sql<number>`sum(case when ${appointments.sync_status} = 'synced' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${appointments.sync_status} = 'pending' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${appointments.sync_status} = 'failed' then 1 else 0 end)`,
        not_synced: sql<number>`sum(case when ${appointments.sync_status} = 'not_synced' then 1 else 0 end)`,
        doctors_with_sync: sql<number>`(
          select count(*) from ${doctors} 
          where ${doctors.calendar_sync_enabled} = true
        )`,
      })
      .from(appointments);
    
    return stats[0] || {
      total_appointments: 0,
      synced: 0,
      pending: 0,
      failed: 0,
      not_synced: 0,
      doctors_with_sync: 0,
    };
  } catch (error) {
    console.error('Error al obtener estadísticas generales:', error);
    throw new Error('Error al obtener estadísticas generales de sincronización');
  }
}

/**
 * Obtiene estadísticas completas de citas con información adicional
 */
export async function getAppointmentStats(doctorId?: number) {
  try {
    const whereCondition = doctorId ? eq(appointments.doctorId, doctorId) : undefined;
    
    const stats = await db
      .select({
        total_appointments: sql<number>`count(*)`,
        synced: sql<number>`sum(case when ${appointments.sync_status} = 'synced' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${appointments.sync_status} = 'pending' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${appointments.sync_status} = 'failed' then 1 else 0 end)`,
        not_synced: sql<number>`sum(case when ${appointments.sync_status} = 'not_synced' then 1 else 0 end)`,
        virtual_appointments: sql<number>`sum(case when ${appointments.is_virtual} = true then 1 else 0 end)`,
        in_person_appointments: sql<number>`sum(case when ${appointments.is_virtual} = false then 1 else 0 end)`,
        appointments_today: sql<number>`sum(case when date(${appointments.date}) = curdate() then 1 else 0 end)`,
        appointments_this_week: sql<number>`sum(case when yearweek(${appointments.date}) = yearweek(curdate()) then 1 else 0 end)`,
        appointments_this_month: sql<number>`sum(case when year(${appointments.date}) = year(curdate()) and month(${appointments.date}) = month(curdate()) then 1 else 0 end)`,
        upcoming_appointments: sql<number>`sum(case when ${appointments.date} >= curdate() then 1 else 0 end)`,
        past_appointments: sql<number>`sum(case when ${appointments.date} < curdate() then 1 else 0 end)`,
        avg_duration: sql<number>`avg(${appointments.duration_minutes})`,
        total_duration: sql<number>`sum(${appointments.duration_minutes})`,
      })
      .from(appointments)
      .where(whereCondition);
    
    const result = stats[0] || {
      total_appointments: 0,
      synced: 0,
      pending: 0,
      failed: 0,
      not_synced: 0,
      virtual_appointments: 0,
      in_person_appointments: 0,
      appointments_today: 0,
      appointments_this_week: 0,
      appointments_this_month: 0,
      upcoming_appointments: 0,
      past_appointments: 0,
      avg_duration: 0,
      total_duration: 0,
    };

    // Calcular porcentajes de sincronización
    const syncPercentage = result.total_appointments > 0 
      ? Math.round((result.synced / result.total_appointments) * 100) 
      : 0;
    
    const virtualPercentage = result.total_appointments > 0 
      ? Math.round((result.virtual_appointments / result.total_appointments) * 100) 
      : 0;

    return {
      ...result,
      sync_percentage: syncPercentage,
      virtual_percentage: virtualPercentage,
      avg_duration: Math.round(result.avg_duration || 0),
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de citas:', error);
    throw new Error('Error al obtener estadísticas de citas');
  }
}

// --- Funciones de limpieza ---

/**
 * Limpia citas antiguas con errores de sincronización
 */
export async function cleanupOldFailedSyncs(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    await db
      .update(appointments)
      .set({
        sync_status: 'not_synced',
        sync_error: null,
        google_event_id: null,
        google_calendar_id: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(appointments.sync_status, 'failed'),
          lte(appointments.last_sync_attempt, cutoffDate)
        )
      );
    // No se puede obtener rowsAffected en MySQL con Drizzle ORM
    return 0;
  } catch (error) {
    console.error('Error al limpiar sincronizaciones fallidas:', error);
    throw new Error('Error al limpiar sincronizaciones fallidas');
  }
}

/**
 * Reintenta sincronización de citas fallidas
 */
export async function retryFailedSyncs(limit: number = 10): Promise<Appointment[]> {
  try {
    await db
      .update(appointments)
      .set({
        sync_status: 'pending',
        sync_error: null,
        updatedAt: new Date(),
      })
      .where(eq(appointments.sync_status, 'failed'))
      .limit(limit);
    // No se puede retornar los registros actualizados directamente en MySQL
    // Se recomienda hacer un select si se necesitan los datos
    return [];
  } catch (error) {
    console.error('Error al reintentar sincronizaciones:', error);
    throw new Error('Error al reintentar sincronizaciones fallidas');
  }
}