// src/lib/appointment-sync.ts

import { db } from '@/db';
import { appointments, doctors, patients, medicalServices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { googleCalendarService } from './google-calendar';
import { addMinutes, parseISO } from 'date-fns';

export interface AppointmentSyncData {
  id: number;
  doctorId: number;
  patientId?: number | null;
  serviceId?: number | null;
  date: string;
  time: string;
  durationMinutes: number;
  status: string;
  isVirtual: boolean;
  meetingLink?: string | null;
  notes?: string | null;
  patientName?: string | null;
  service?: string | null;
}

export interface DoctorCalendarData {
  idDoctor: number;
  calendar_id: string;
  calendar_timezone: string;
  calendar_sync_enabled: boolean;
  userId: number;
}

export interface PatientData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface MedicalServiceData {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface AppointmentWithDetails {
  id: number;
  doctorId: number;
  patientId: number | null;
  serviceId: number | null;
  date: Date;
  time: string;
  status: string;
  durationMinutes: number;
  isVirtual: boolean;
  meetingLink: string | null;
  notes: string | null;
  patientName: string | null;
  service: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  doctor: DoctorCalendarData | null;
  patient: PatientData | null;
  medicalService: MedicalServiceData | null;
}

export interface CalendarEventData {
  calendarId: string;
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  attendees: string[];
  meetingLink?: string;
}

export interface CalendarEventUpdateData {
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timezone: string;
  attendees: string[];
}

/**
 * Servicio para sincronizar citas con Google Calendar
 */
export class AppointmentSyncService {
  /**
   * Sincronizar una cita con Google Calendar
   */
  async syncAppointmentToCalendar(appointmentId: number): Promise<{
    success: boolean;
    googleEventId?: string;
    error?: string;
  }> {
    try {
      // Obtener datos completos de la cita
      const appointmentData = await this.getAppointmentWithDetails(appointmentId);
      
      if (!appointmentData) {
        throw new Error('Appointment not found');
      }

      // Verificar que el doctor tenga sincronización habilitada
      if (!appointmentData.doctor?.calendar_sync_enabled) {
        return {
          success: false,
          error: 'Calendar sync is disabled for this doctor'
        };
      }

      // Crear el evento en Google Calendar
      const eventData = this.buildEventData(appointmentData);
      const result = await googleCalendarService.createAppointmentEvent(eventData);

      // Verificar que se haya creado el evento correctamente
      if (!result.eventId) {
        throw new Error('Failed to create Google Calendar event - no event ID returned');
      }

      // Actualizar la cita con los datos de Google Calendar
      await db.update(appointments)
        .set({
          google_event_id: result.eventId,
          google_calendar_id: appointmentData.doctor?.calendar_id || null,
          sync_status: 'synced',
          last_sync_attempt: new Date(),
          sync_error: null,
          meeting_link: result.meetingLink || appointmentData.meetingLink,
        })
        .where(eq(appointments.id, appointmentId));

      return {
        success: true,
        googleEventId: result.eventId,
      };
    } catch (error) {
      console.error('Error syncing appointment to calendar:', error);
      
      // Actualizar el estado de error en la base de datos
      await db.update(appointments)
        .set({
          sync_status: 'failed',
          last_sync_attempt: new Date(),
          sync_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(appointments.id, appointmentId));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Actualizar una cita existente en Google Calendar
   */
  async updateAppointmentInCalendar(appointmentId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const appointmentData = await this.getAppointmentWithDetails(appointmentId);
      
      if (!appointmentData || !appointmentData.google_event_id || !appointmentData.google_calendar_id) {
        throw new Error('Appointment not found or not synced with calendar');
      }

      const eventData = this.buildEventUpdateData(appointmentData);
      
      await googleCalendarService.updateAppointmentEvent(
        appointmentData.google_calendar_id,
        appointmentData.google_event_id,
        eventData
      );

      // Actualizar estado de sincronización
      await db.update(appointments)
        .set({
          sync_status: 'synced',
          last_sync_attempt: new Date(),
          sync_error: null,
        })
        .where(eq(appointments.id, appointmentId));

      return { success: true };
    } catch (error) {
      console.error('Error updating appointment in calendar:', error);
      
      await db.update(appointments)
        .set({
          sync_status: 'failed',
          last_sync_attempt: new Date(),
          sync_error: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(appointments.id, appointmentId));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Eliminar una cita de Google Calendar
   */
  async deleteAppointmentFromCalendar(appointmentId: number): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const appointment = await db.select()
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);

      if (appointment.length === 0) {
        throw new Error('Appointment not found');
      }

      const appointmentData = appointment[0];
      
      if (appointmentData.google_event_id && appointmentData.google_calendar_id) {
        await googleCalendarService.deleteAppointmentEvent(
          appointmentData.google_calendar_id,
          appointmentData.google_event_id
        );
      }

      // Limpiar datos de Google Calendar
      await db.update(appointments)
        .set({
          google_event_id: null,
          google_calendar_id: null,
          sync_status: 'not_synced',
          last_sync_attempt: new Date(),
          sync_error: null,
        })
        .where(eq(appointments.id, appointmentId));

      return { success: true };
    } catch (error) {
      console.error('Error deleting appointment from calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Sincronizar todas las citas pendientes de un doctor
   */
  async syncDoctorPendingAppointments(doctorId: number): Promise<{
    success: boolean;
    syncedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    try {
      const pendingAppointments = await db.select()
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            eq(appointments.sync_status, 'pending')
          )
        );

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const appointment of pendingAppointments) {
        const result = await this.syncAppointmentToCalendar(appointment.id);
        
        if (result.success) {
          syncedCount++;
        } else {
          failedCount++;
          if (result.error) {
            errors.push(`Appointment ${appointment.id}: ${result.error}`);
          }
        }
      }

      return {
        success: failedCount === 0,
        syncedCount,
        failedCount,
        errors,
      };
    } catch (error) {
      console.error('Error syncing doctor pending appointments:', error);
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Obtener datos completos de una cita con relaciones
   */
  private async getAppointmentWithDetails(appointmentId: number): Promise<AppointmentWithDetails | null> {
    const result = await db.select({
      // Appointment data
      id: appointments.id,
      doctorId: appointments.doctorId,
      patientId: appointments.patientId,
      serviceId: appointments.serviceId,
      date: appointments.date,
      time: appointments.time,
      status: appointments.status,
      durationMinutes: appointments.duration_minutes,
      isVirtual: appointments.is_virtual,
      meetingLink: appointments.meeting_link,
      notes: appointments.notes,
      patientName: appointments.patientName,
      service: appointments.service,
      google_event_id: appointments.google_event_id,
      google_calendar_id: appointments.google_calendar_id,
      
      // Doctor data
      doctor: {
        idDoctor: doctors.idDoctor,
        calendar_id: doctors.calendar_id,
        calendar_timezone: doctors.calendar_timezone,
        calendar_sync_enabled: doctors.calendar_sync_enabled,
        userId: doctors.userId,
      },
      
      // Patient data (optional)
      patient: {
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        email: patients.email,
        phone: patients.phone,
      },
      
      // Service data (optional)
      medicalService: {
        id: medicalServices.id,
        name: medicalServices.name,
        durationMinutes: medicalServices.durationMinutes,
      },
    })
    .from(appointments)
    .leftJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
    .leftJoin(patients, eq(appointments.patientId, patients.id))
    .leftJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

    if (result.length === 0) {
      return null;
    }

    const appointment = result[0];
    return {
      ...appointment,
      durationMinutes: appointment.durationMinutes,
      isVirtual: appointment.isVirtual,
      meetingLink: appointment.meetingLink,
    } as AppointmentWithDetails;
  }

  /**
   * Construir datos del evento para Google Calendar
   */
  private buildEventData(appointmentData: AppointmentWithDetails): CalendarEventData {
    const patientName = appointmentData.patient 
      ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
      : appointmentData.patientName || 'Paciente';
    
    const serviceName = appointmentData.medicalService?.name || appointmentData.service || 'Consulta';
    
    const startDateTime = this.buildDateTime(appointmentData.date.toISOString().split('T')[0], appointmentData.time);
    const endDateTime = addMinutes(parseISO(startDateTime), appointmentData.durationMinutes);
    
    const attendees = [];
    if (appointmentData.patient?.email) {
      attendees.push(appointmentData.patient.email);
    }

    if (!appointmentData.doctor) {
      throw new Error('Doctor data is required for calendar event creation');
    }

    return {
      calendarId: appointmentData.doctor.calendar_id,
      summary: `${serviceName} - ${patientName}`,
      description: this.buildEventDescription(appointmentData),
      startDateTime,
      endDateTime: endDateTime.toISOString(),
      timezone: appointmentData.doctor.calendar_timezone,
      attendees,
      meetingLink: appointmentData.isVirtual ? appointmentData.meetingLink || undefined : undefined,
    };
  }

  /**
   * Construir datos de actualización del evento
   */
  private buildEventUpdateData(appointmentData: AppointmentWithDetails): CalendarEventUpdateData {
    const patientName = appointmentData.patient 
      ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
      : appointmentData.patientName || 'Paciente';
    
    const serviceName = appointmentData.medicalService?.name || appointmentData.service || 'Consulta';
    
    const startDateTime = this.buildDateTime(appointmentData.date.toISOString().split('T')[0], appointmentData.time);
    const endDateTime = addMinutes(parseISO(startDateTime), appointmentData.durationMinutes);
    
    const attendees = [];
    if (appointmentData.patient?.email) {
      attendees.push(appointmentData.patient.email);
    }

    if (!appointmentData.doctor) {
      throw new Error('Doctor data is required for calendar event update');
    }

    return {
      summary: `${serviceName} - ${patientName}`,
      description: this.buildEventDescription(appointmentData),
      startDateTime,
      endDateTime: endDateTime.toISOString(),
      timezone: appointmentData.doctor.calendar_timezone,
      attendees,
    };
  }

  /**
   * Construir descripción del evento
   */
  private buildEventDescription(appointmentData: AppointmentWithDetails): string {
    const lines = [];
    
    const patientName = appointmentData.patient 
      ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
      : appointmentData.patientName || 'Paciente';
    
    lines.push(`Paciente: ${patientName}`);
    
    if (appointmentData.patient?.phone) {
      lines.push(`Teléfono: ${appointmentData.patient.phone}`);
    }
    
    const serviceName = appointmentData.medicalService?.name || appointmentData.service;
    if (serviceName) {
      lines.push(`Servicio: ${serviceName}`);
    }
    
    lines.push(`Estado: ${appointmentData.status}`);
    lines.push(`Duración: ${appointmentData.durationMinutes} minutos`);
    
    if (appointmentData.isVirtual) {
      lines.push('Modalidad: Virtual');
      if (appointmentData.meetingLink) {
        lines.push(`Enlace: ${appointmentData.meetingLink}`);
      }
    } else {
      lines.push('Modalidad: Presencial');
    }
    
    if (appointmentData.notes) {
      lines.push(`Notas: ${appointmentData.notes}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Construir fecha y hora en formato ISO
   */
  private buildDateTime(date: string, time: string): string {
    // Convertir time de formato "2:30 PM" a "14:30"
    const [timePart, period] = time.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    const dateTimeString = `${date}T${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    return new Date(dateTimeString).toISOString();
  }
}

// Instancia singleton del servicio
export const appointmentSyncService = new AppointmentSyncService();