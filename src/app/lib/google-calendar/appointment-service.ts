/**
 * @fileoverview Servicio especializado para manejo de citas médicas
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-27
 * @description Funciones de alto nivel para gestionar citas médicas,
 * integrando la lógica de negocio específica del consultorio.
 */

import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEvents,
  getEvent,
  checkAvailability,
  getAvailableSlots,
  searchEvents,
  type CalendarOperationResult,
} from './calendar-utils';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
  type Appointment,
  type AvailableTimeSlot,
  type AppointmentFilters,
  type PaginatedResult,
  type ConsultorioStats,
  AppointmentStatus,
  ConsultationType,
  AppointmentPriority,
  CALENDAR_COLORS,
} from './types';
import { calendar_v3 } from 'googleapis';

// === Funciones principales de citas ===

/**
 * Crea una nueva cita médica
 */
export async function createAppointment(
  calendarId: string,
  input: CreateAppointmentInput
): Promise<CalendarOperationResult<{ appointmentId: string; eventId: string; htmlLink: string }>> {
  try {
    // Validar entrada
    const validatedInput = CreateAppointmentSchema.parse(input);
    
    // Verificar disponibilidad
    const availabilityResult = await checkAvailability(
      calendarId,
      validatedInput.startDateTime,
      validatedInput.endDateTime
    );
    
    if (!availabilityResult.success) {
      return {
        success: false,
        error: `Error verificando disponibilidad: ${availabilityResult.error}`,
      };
    }
    
    if (!availabilityResult.data?.available) {
      return {
        success: false,
        error: 'El horario solicitado no está disponible',
      };
    }
    
    // Preparar datos del evento
    const eventData = {
      summary: `${validatedInput.consultationType.toUpperCase()}: ${validatedInput.patient.name}`,
      description: buildEventDescription(validatedInput),
      start: {
        dateTime: validatedInput.startDateTime,
      },
      end: {
        dateTime: validatedInput.endDateTime,
      },
      attendees: [
        {
          email: validatedInput.patient.email,
          displayName: validatedInput.patient.name,
        },
        {
          email: validatedInput.doctor.email,
          displayName: validatedInput.doctor.name,
        },
      ],
      location: validatedInput.isTelemedicine 
        ? validatedInput.meetingLink || 'Consulta Virtual'
        : validatedInput.location,
      colorId: getColorForConsultationType(validatedInput.consultationType),
    };
    
    // Crear evento en Google Calendar
    const eventResult = await createEvent(calendarId, eventData);
    
    if (!eventResult.success) {
      return {
        success: false,
        error: `Error creando evento: ${eventResult.error}`,
      };
    }
    
    console.log(`[Appointment Service] Cita creada: ${eventResult.data?.id} para paciente ${validatedInput.patient.name}`);
    
    return {
      success: true,
      data: {
        appointmentId: eventResult.data?.id || '',
        eventId: eventResult.data?.id || '',
        htmlLink: eventResult.data?.htmlLink || '',
      },
    };
  } catch (error) {
    console.error('[Appointment Service] Error creando cita:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene una cita específica
 */
export async function getAppointment(
  calendarId: string,
  eventId: string
): Promise<CalendarOperationResult<Appointment>> {
  try {
    const eventResult = await getEvent(calendarId, eventId);
    
    if (!eventResult.success) {
      return {
        success: false,
        error: eventResult.error,
      };
    }
    
    const appointment = parseEventToAppointment(calendarId, eventResult.data!);
    if (!appointment) {
      return {
        success: false,
        error: 'No se pudo parsear la cita desde el evento',
      };
    }
    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    console.error(`[Appointment Service] Error obteniendo cita ${eventId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Lista citas con filtros
 */
export async function listAppointments(
  calendarId: string,
  filters: AppointmentFilters = {},
  pagination: { page?: number; pageSize?: number } = {}
): Promise<CalendarOperationResult<PaginatedResult<Appointment>>> {
  try {
    const { page = 1, pageSize = 50 } = pagination;
    
    // Obtener eventos del calendario
    const eventsResult = await getEvents(calendarId, {
      timeMin: filters.startDate,
      timeMax: filters.endDate,
      maxResults: 2500, // Obtener más para filtrar localmente
    });
    
    if (!eventsResult.success) {
      return {
        success: false,
        error: eventsResult.error,
      };
    }
    
    // Convertir eventos a citas
    let appointments = (eventsResult.data || [])
      .map(event => parseEventToAppointment(calendarId, event))
      .filter(appointment => appointment !== null) as Appointment[];
    
    // Aplicar filtros
    appointments = applyFilters(appointments, filters);
    
    // Aplicar paginación
    const total = appointments.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAppointments = appointments.slice(startIndex, endIndex);
    
    return {
      success: true,
      data: {
        data: paginatedAppointments,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  } catch (error) {
    console.error('[Appointment Service] Error listando citas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza una cita existente
 */
export async function updateAppointment(
  calendarId: string,
  eventId: string,
  updates: UpdateAppointmentInput
): Promise<CalendarOperationResult<Appointment>> {
  try {
    const validatedUpdates = UpdateAppointmentSchema.parse(updates);
    
    // Si se cambian las fechas, verificar disponibilidad
    if (validatedUpdates.startDateTime || validatedUpdates.endDateTime) {
      const currentEvent = await getEvent(calendarId, eventId);
      if (!currentEvent.success) {
        return {
          success: false,
          error: `Error obteniendo cita actual: ${currentEvent.error}`,
        };
      }
      
      const newStart = validatedUpdates.startDateTime || currentEvent.data?.start?.dateTime || '';
      const newEnd = validatedUpdates.endDateTime || currentEvent.data?.end?.dateTime || '';
      
      const availabilityResult = await checkAvailability(calendarId, newStart, newEnd);
      
      if (!availabilityResult.success) {
        return {
          success: false,
          error: `Error verificando disponibilidad: ${availabilityResult.error}`,
        };
      }
      
      // Permitir el horario actual (ignorar el evento que se está actualizando)
      const conflictingEvents = availabilityResult.data?.conflictingEvents?.filter(
        event => event.id !== eventId
      ) || [];
      
      if (conflictingEvents.length > 0) {
        return {
          success: false,
          error: 'El nuevo horario solicitado no está disponible',
        };
      }
    }
    
    // Preparar datos de actualización
    const updateData: any = {};
    
    if (validatedUpdates.patient || validatedUpdates.consultationType) {
      updateData.summary = buildEventSummary(validatedUpdates);
    }
    
    if (validatedUpdates.patient || validatedUpdates.reasonForVisit || validatedUpdates.notes) {
      updateData.description = buildEventDescription(validatedUpdates as CreateAppointmentInput);
    }
    
    if (validatedUpdates.startDateTime) {
      updateData.start = { dateTime: validatedUpdates.startDateTime };
    }
    
    if (validatedUpdates.endDateTime) {
      updateData.end = { dateTime: validatedUpdates.endDateTime };
    }
    
    if (validatedUpdates.location || validatedUpdates.isTelemedicine || validatedUpdates.meetingLink) {
      updateData.location = validatedUpdates.isTelemedicine 
        ? validatedUpdates.meetingLink || 'Consulta Virtual'
        : validatedUpdates.location;
    }
    
    if (validatedUpdates.consultationType) {
      updateData.colorId = getColorForConsultationType(validatedUpdates.consultationType);
    }
    
    // Actualizar evento
    const eventResult = await updateEvent(calendarId, eventId, updateData);
    
    if (!eventResult.success) {
      return {
        success: false,
        error: `Error actualizando evento: ${eventResult.error}`,
      };
    }
    
    // Obtener cita actualizada
    const updatedAppointment = parseEventToAppointment(calendarId, eventResult.data!);
    if (!updatedAppointment) {
      return {
        success: false,
        error: 'No se pudo parsear la cita actualizada desde el evento',
      };
    }
    console.log(`[Appointment Service] Cita actualizada: ${eventId}`);
    
    return {
      success: true,
      data: updatedAppointment,
    };
  } catch (error) {
    console.error(`[Appointment Service] Error actualizando cita ${eventId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Cancela una cita
 */
export async function cancelAppointment(
  calendarId: string,
  eventId: string,
  reason?: string
): Promise<CalendarOperationResult<void>> {
  try {
    // Actualizar el evento para marcarlo como cancelado
    const updateResult = await updateEvent(calendarId, eventId, {
      summary: '[CANCELADA] ' + (await getEvent(calendarId, eventId)).data?.summary,
      description: `CITA CANCELADA\n\nMotivo: ${reason || 'No especificado'}\n\n---\n\n` + 
                  (await getEvent(calendarId, eventId)).data?.description,
      colorId: CALENDAR_COLORS.CANCELLED,
    });
    
    if (!updateResult.success) {
      return {
        success: false,
        error: `Error marcando cita como cancelada: ${updateResult.error}`,
      };
    }
    
    console.log(`[Appointment Service] Cita cancelada: ${eventId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error(`[Appointment Service] Error cancelando cita ${eventId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Elimina permanentemente una cita
 */
export async function deleteAppointment(
  calendarId: string,
  eventId: string
): Promise<CalendarOperationResult<void>> {
  try {
    const result = await deleteEvent(calendarId, eventId);
    
    if (result.success) {
      console.log(`[Appointment Service] Cita eliminada permanentemente: ${eventId}`);
    }
    
    return result;
  } catch (error) {
    console.error(`[Appointment Service] Error eliminando cita ${eventId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Busca citas por texto
 */
export async function searchAppointments(
  calendarId: string,
  query: string,
  filters: Omit<AppointmentFilters, 'searchQuery'> = {}
): Promise<CalendarOperationResult<Appointment[]>> {
  try {
    const searchResult = await searchEvents(calendarId, query, {
      timeMin: filters.startDate,
      timeMax: filters.endDate,
    });
    
    if (!searchResult.success) {
      return {
        success: false,
        error: searchResult.error,
      };
    }
    
    const appointments = (searchResult.data || [])
      .map(event => parseEventToAppointment(calendarId, event))
      .filter(appointment => appointment !== null) as Appointment[];
    
    const filteredAppointments = applyFilters(appointments, filters);
    
    return {
      success: true,
      data: filteredAppointments,
    };
  } catch (error) {
    console.error('[Appointment Service] Error buscando citas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene horarios disponibles para citas
 */
export async function getAvailableAppointmentSlots(
  calendarId: string,
  date: string,
  duration: number = 30,
  workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
): Promise<CalendarOperationResult<AvailableTimeSlot[]>> {
  try {
    const slotsResult = await getAvailableSlots(calendarId, date, duration, workingHours);
    
    if (!slotsResult.success) {
      return {
        success: false,
        error: slotsResult.error,
      };
    }
    
    const availableSlots: AvailableTimeSlot[] = (slotsResult.data || []).map(slot => ({
      start: slot.start,
      end: slot.end,
      duration,
      isAvailable: true,
    }));
    
    return {
      success: true,
      data: availableSlots,
    };
  } catch (error) {
    console.error('[Appointment Service] Error obteniendo horarios disponibles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene estadísticas del consultorio
 */
export async function getConsultorioStatistics(
  calendarId: string,
  startDate: string,
  endDate: string
): Promise<CalendarOperationResult<ConsultorioStats>> {
  try {
    const appointmentsResult = await listAppointments(calendarId, {
      startDate,
      endDate,
    });
    
    if (!appointmentsResult.success) {
      return {
        success: false,
        error: appointmentsResult.error,
      };
    }
    
    const appointments = appointmentsResult.data?.data || [];
    
    const stats: ConsultorioStats = {
      totalAppointments: appointments.length,
      completedAppointments: appointments.filter(a => a.status === AppointmentStatus.COMPLETED).length,
      cancelledAppointments: appointments.filter(a => a.status === AppointmentStatus.CANCELLED).length,
      noShowAppointments: appointments.filter(a => a.status === AppointmentStatus.NO_SHOW).length,
      upcomingAppointments: appointments.filter(a => 
        a.status === AppointmentStatus.SCHEDULED || a.status === AppointmentStatus.CONFIRMED
      ).length,
      averageAppointmentDuration: calculateAverageAppointmentDuration(appointments),
      busyHours: calculateBusyHours(appointments),
      popularConsultationTypes: calculatePopularConsultationTypes(appointments),
      patientRetentionRate: calculatePatientRetentionRate(appointments),
    };
    
    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('[Appointment Service] Error obteniendo estadísticas:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// === Funciones auxiliares ===

function buildEventSummary(input: Partial<CreateAppointmentInput>): string {
  const type = input.consultationType?.toUpperCase() || 'CONSULTA';
  const patientName = input.patient?.name || 'Paciente';
  return `${type}: ${patientName}`;
}

function buildEventDescription(input: CreateAppointmentInput): string {
  const lines = [
    `INFORMACIÓN DE LA CITA`,
    `========================`,
    ``,
    `Paciente: ${input.patient.name}`,
    `Email: ${input.patient.email}`,
    `Teléfono: ${input.patient.phone}`,
    ``,
    `Doctor: ${input.doctor.name}`,
    `Especialización: ${input.doctor.specialization}`,
    ``,
    `Tipo de consulta: ${input.consultationType}`,
    `Prioridad: ${input.priority}`,
    `Motivo: ${input.reasonForVisit}`,
  ];
  
  if (input.symptoms) {
    lines.push(`Síntomas: ${input.symptoms}`);
  }
  
  if (input.isTelemedicine) {
    lines.push(``, `CONSULTA VIRTUAL`);
    if (input.meetingLink) {
      lines.push(`Enlace: ${input.meetingLink}`);
    }
  }
  
  if (input.notes) {
    lines.push(``, `Notas adicionales:`, input.notes);
  }
  
  return lines.join('\n');
}

function getColorForConsultationType(type: ConsultationType): string {
  return CALENDAR_COLORS[type.toUpperCase() as keyof typeof CALENDAR_COLORS] || CALENDAR_COLORS.CONSULTATION;
}

function parseEventToAppointment(calendarId: string, event: calendar_v3.Schema$Event): Appointment | null {
  if (!event.id || !event.start?.dateTime || !event.end?.dateTime) {
    return null;
  }
  
  // Parsear información del evento (implementación simplificada)
  const summary = event.summary || '';
  const description = event.description || '';
  
  // Extraer información básica del summary y description
  const consultationType = extractConsultationType(summary);
  const patientInfo = extractPatientInfo(description);
  const doctorInfo = extractDoctorInfo(description);
  
  return {
    id: event.id,
    calendarId,
    eventId: event.id,
    patient: patientInfo,
    doctor: doctorInfo,
    consultationType,
    priority: AppointmentPriority.NORMAL,
    status: extractStatus(summary),
    startDateTime: event.start.dateTime,
    endDateTime: event.end.dateTime,
    location: event.location ?? undefined,
    reasonForVisit: extractReasonForVisit(description),
    isTelemedicine: isTelemedicineEvent(event),
    meetingLink: extractMeetingLink(description),
    reminderMinutes: [15, 60],
    createdAt: event.created || new Date().toISOString(),
    updatedAt: event.updated || new Date().toISOString(),
    googleEvent: event,
    notes: extractNotes(description),
  };
}

function extractConsultationType(summary: string): ConsultationType {
  const upperSummary = summary.toUpperCase();
  if (upperSummary.includes('INITIAL')) return ConsultationType.INITIAL;
  if (upperSummary.includes('FOLLOW')) return ConsultationType.FOLLOW_UP;
  if (upperSummary.includes('EMERGENCY')) return ConsultationType.EMERGENCY;
  if (upperSummary.includes('TELEMEDICINE')) return ConsultationType.TELEMEDICINE;
  if (upperSummary.includes('PROCEDURE')) return ConsultationType.PROCEDURE;
  return ConsultationType.CONSULTATION;
}

function extractStatus(summary: string): AppointmentStatus {
  if (summary.includes('[CANCELADA]')) return AppointmentStatus.CANCELLED;
  if (summary.includes('[COMPLETADA]')) return AppointmentStatus.COMPLETED;
  if (summary.includes('[EN PROGRESO]')) return AppointmentStatus.IN_PROGRESS;
  return AppointmentStatus.SCHEDULED;
}

function extractPatientInfo(description: string): any {
  // Implementación simplificada - en producción usar regex más robustos
  const emailMatch = description.match(/Email: ([^\n]+)/);
  const phoneMatch = description.match(/Teléfono: ([^\n]+)/);
  const nameMatch = description.match(/Paciente: ([^\n]+)/);
  
  return {
    name: nameMatch?.[1] || 'Paciente',
    email: emailMatch?.[1] || '',
    phone: phoneMatch?.[1] || '',
  };
}

function extractDoctorInfo(description: string): any {
  const nameMatch = description.match(/Doctor: ([^\n]+)/);
  const specializationMatch = description.match(/Especialización: ([^\n]+)/);
  
  return {
    id: 'default',
    name: nameMatch?.[1] || 'Doctor',
    email: '',
    specialization: specializationMatch?.[1] || '',
  };
}

function extractReasonForVisit(description: string): string {
  const reasonMatch = description.match(/Motivo: ([^\n]+)/);
  return reasonMatch?.[1] || 'Consulta general';
}

function extractNotes(description: string): string | undefined {
  const notesMatch = description.match(/Notas adicionales:\n([\s\S]+)$/);
  return notesMatch?.[1];
}

function extractMeetingLink(description: string): string | undefined {
  const linkMatch = description.match(/Enlace: ([^\n]+)/);
  return linkMatch?.[1];
}

function isTelemedicineEvent(event: calendar_v3.Schema$Event): boolean {
  const summary = event.summary || '';
  const description = event.description || '';
  const location = event.location || '';
  
  return summary.toUpperCase().includes('TELEMEDICINE') ||
         description.includes('CONSULTA VIRTUAL') ||
         location.includes('Virtual') ||
         location.includes('http');
}

function applyFilters(appointments: Appointment[], filters: AppointmentFilters): Appointment[] {
  return appointments.filter(appointment => {
    if (filters.doctorId && appointment.doctor.id !== filters.doctorId) return false;
    if (filters.patientEmail && appointment.patient.email !== filters.patientEmail) return false;
    if (filters.status && !filters.status.includes(appointment.status)) return false;
    if (filters.consultationType && !filters.consultationType.includes(appointment.consultationType)) return false;
    if (filters.priority && !filters.priority.includes(appointment.priority)) return false;
    if (filters.isTelemedicine !== undefined && appointment.isTelemedicine !== filters.isTelemedicine) return false;
    
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        appointment.patient.name,
        appointment.patient.email,
        appointment.doctor.name,
        appointment.reasonForVisit,
        appointment.notes || '',
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }
    
    return true;
  });
}

function calculateAverageAppointmentDuration(appointments: Appointment[]): number {
  if (appointments.length === 0) return 0;
  
  const totalDuration = appointments.reduce((sum, appointment) => {
    const start = new Date(appointment.startDateTime);
    const end = new Date(appointment.endDateTime);
    return sum + (end.getTime() - start.getTime());
  }, 0);
  
  return Math.round(totalDuration / appointments.length / (1000 * 60)); // minutos
}

function calculateBusyHours(appointments: Appointment[]): { hour: number; count: number }[] {
  const hourCounts: Record<number, number> = {};
  
  appointments.forEach(appointment => {
    const hour = new Date(appointment.startDateTime).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  return Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => b.count - a.count);
}

function calculatePopularConsultationTypes(appointments: Appointment[]): { type: ConsultationType; count: number }[] {
  const typeCounts: Record<ConsultationType, number> = {} as Record<ConsultationType, number>;
  
  appointments.forEach(appointment => {
    typeCounts[appointment.consultationType] = (typeCounts[appointment.consultationType] || 0) + 1;
  });
  
  return Object.entries(typeCounts)
    .map(([type, count]) => ({ type: type as ConsultationType, count }))
    .sort((a, b) => b.count - a.count);
}

function calculatePatientRetentionRate(appointments: Appointment[]): number {
  const patientVisits: Record<string, number> = {};
  
  appointments.forEach(appointment => {
    const email = appointment.patient.email;
    patientVisits[email] = (patientVisits[email] || 0) + 1;
  });
  
  const totalPatients = Object.keys(patientVisits).length;
  const returningPatients = Object.values(patientVisits).filter(visits => visits > 1).length;
  
  return totalPatients > 0 ? Math.round((returningPatients / totalPatients) * 100) : 0;
}