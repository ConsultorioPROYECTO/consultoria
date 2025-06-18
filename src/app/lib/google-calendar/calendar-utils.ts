/**
 * @fileoverview Utilidades para CRUD de calendarios de Google Calendar
 * @version 1.0.0
 * @author Santiago Prada
 * @date 2025-01-27
 * @description Funciones para crear, leer, actualizar y eliminar calendarios y eventos
 * usando Google Calendar API con Service Account.
 */

import { calendar_v3 } from 'googleapis';
import { googleCalendarClient, calendarConfig } from './config';
import { z } from 'zod';

// === Tipos y Esquemas ===

/**
 * Esquema para crear un nuevo calendario
 */
export const CreateCalendarSchema = z.object({
  summary: z.string().min(1, 'Nombre del calendario es requerido'),
  description: z.string().optional(),
  timeZone: z.string().optional().default('America/Mexico_City'),
  location: z.string().optional(),
});

/**
 * Esquema para crear un evento
 */
export const CreateEventSchema = z.object({
  summary: z.string().min(1, 'Título del evento es requerido'),
  description: z.string().optional(),
  start: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().datetime(),
    timeZone: z.string().optional(),
  }),
  attendees: z.array(z.object({
    email: z.string().email(),
    displayName: z.string().optional(),
  })).optional(),
  location: z.string().optional(),
  colorId: z.string().optional(),
});

/**
 * Esquema para actualizar un evento
 */
export const UpdateEventSchema = CreateEventSchema.partial();

/**
 * Tipos inferidos
 */
export type CreateCalendarInput = z.infer<typeof CreateCalendarSchema>;
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

/**
 * Resultado de operaciones
 */
export interface CalendarOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// === Funciones de Calendario ===

/**
 * Crea un nuevo calendario
 */
export async function createCalendar(
  input: CreateCalendarInput
): Promise<CalendarOperationResult<{ id: string; summary: string }>> {
  try {
    const validatedInput = CreateCalendarSchema.parse(input);
    
    const response = await googleCalendarClient.calendars.insert({
      requestBody: {
        summary: validatedInput.summary,
        description: validatedInput.description,
        timeZone: validatedInput.timeZone,
        location: validatedInput.location,
      },
    });

    if (!response.data.id) {
      throw new Error('No se pudo obtener el ID del calendario creado');
    }

    console.log(`[Calendar Utils] Calendario creado: ${response.data.id}`);
    
    return {
      success: true,
      data: {
        id: response.data.id,
        summary: response.data.summary || validatedInput.summary,
      },
    };
  } catch (error) {
    console.error('[Calendar Utils] Error creando calendario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene información de un calendario
 */
export async function getCalendar(
  calendarId: string
): Promise<CalendarOperationResult<calendar_v3.Schema$Calendar>> {
  try {
    const response = await googleCalendarClient.calendars.get({
      calendarId,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Lista todos los calendarios accesibles
 */
export async function listCalendars(): Promise<CalendarOperationResult<calendar_v3.Schema$CalendarListEntry[]>> {
  try {
    const response = await googleCalendarClient.calendarList.list();

    return {
      success: true,
      data: response.data.items || [],
    };
  } catch (error) {
    console.error('[Calendar Utils] Error listando calendarios:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza un calendario
 */
export async function updateCalendar(
  calendarId: string,
  updates: Partial<CreateCalendarInput>
): Promise<CalendarOperationResult<calendar_v3.Schema$Calendar>> {
  try {
    const response = await googleCalendarClient.calendars.patch({
      calendarId,
      requestBody: updates,
    });

    console.log(`[Calendar Utils] Calendario actualizado: ${calendarId}`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error actualizando calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Elimina un calendario
 */
export async function deleteCalendar(
  calendarId: string
): Promise<CalendarOperationResult<void>> {
  try {
    await googleCalendarClient.calendars.delete({
      calendarId,
    });

    console.log(`[Calendar Utils] Calendario eliminado: ${calendarId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error eliminando calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// === Funciones de Eventos ===

/**
 * Crea un nuevo evento en un calendario
 */
export async function createEvent(
  calendarId: string,
  input: CreateEventInput
): Promise<CalendarOperationResult<{ id: string; htmlLink: string }>> {
  try {
    const validatedInput = CreateEventSchema.parse(input);
    
    const response = await googleCalendarClient.events.insert({
      calendarId,
      requestBody: {
        summary: validatedInput.summary,
        description: validatedInput.description,
        start: {
          dateTime: validatedInput.start.dateTime,
          timeZone: validatedInput.start.timeZone || calendarConfig.defaultTimezone,
        },
        end: {
          dateTime: validatedInput.end.dateTime,
          timeZone: validatedInput.end.timeZone || calendarConfig.defaultTimezone,
        },
        attendees: validatedInput.attendees,
        location: validatedInput.location,
        colorId: validatedInput.colorId,
      },
    });

    if (!response.data.id) {
      throw new Error('No se pudo obtener el ID del evento creado');
    }

    console.log(`[Calendar Utils] Evento creado: ${response.data.id} en calendario ${calendarId}`);
    
    return {
      success: true,
      data: {
        id: response.data.id,
        htmlLink: response.data.htmlLink || '',
      },
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error creando evento en calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene eventos de un calendario en un rango de fechas
 */
export async function getEvents(
  calendarId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
  } = {}
): Promise<CalendarOperationResult<calendar_v3.Schema$Event[]>> {
  try {
    const response = await googleCalendarClient.events.list({
      calendarId,
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      maxResults: options.maxResults || 250,
      singleEvents: options.singleEvents ?? true,
      orderBy: options.orderBy || 'startTime',
    });

    return {
      success: true,
      data: response.data.items || [],
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo eventos del calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene un evento específico
 */
export async function getEvent(
  calendarId: string,
  eventId: string
): Promise<CalendarOperationResult<calendar_v3.Schema$Event>> {
  try {
    const response = await googleCalendarClient.events.get({
      calendarId,
      eventId,
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo evento ${eventId} del calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza un evento
 */
export async function updateEvent(
  calendarId: string,
  eventId: string,
  updates: UpdateEventInput
): Promise<CalendarOperationResult<calendar_v3.Schema$Event>> {
  try {
    const validatedUpdates = UpdateEventSchema.parse(updates);
    
    const response = await googleCalendarClient.events.patch({
      calendarId,
      eventId,
      requestBody: {
        ...validatedUpdates,
        start: validatedUpdates.start ? {
          dateTime: validatedUpdates.start.dateTime,
          timeZone: validatedUpdates.start.timeZone || calendarConfig.defaultTimezone,
        } : undefined,
        end: validatedUpdates.end ? {
          dateTime: validatedUpdates.end.dateTime,
          timeZone: validatedUpdates.end.timeZone || calendarConfig.defaultTimezone,
        } : undefined,
      },
    });

    console.log(`[Calendar Utils] Evento actualizado: ${eventId} en calendario ${calendarId}`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error actualizando evento ${eventId} en calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Elimina un evento
 */
export async function deleteEvent(
  calendarId: string,
  eventId: string
): Promise<CalendarOperationResult<void>> {
  try {
    await googleCalendarClient.events.delete({
      calendarId,
      eventId,
    });

    console.log(`[Calendar Utils] Evento eliminado: ${eventId} del calendario ${calendarId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error eliminando evento ${eventId} del calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// === Funciones de Utilidad ===

/**
 * Busca eventos por texto
 */
export async function searchEvents(
  calendarId: string,
  query: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {}
): Promise<CalendarOperationResult<calendar_v3.Schema$Event[]>> {
  try {
    const response = await googleCalendarClient.events.list({
      calendarId,
      q: query,
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      maxResults: options.maxResults || 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return {
      success: true,
      data: response.data.items || [],
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error buscando eventos en calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Verifica disponibilidad en un rango de tiempo
 */
export async function checkAvailability(
  calendarId: string,
  startTime: string,
  endTime: string
): Promise<CalendarOperationResult<{ available: boolean; conflictingEvents: calendar_v3.Schema$Event[] }>> {
  try {
    const eventsResult = await getEvents(calendarId, {
      timeMin: startTime,
      timeMax: endTime,
    });

    if (!eventsResult.success) {
      return {
        success: false,
        error: eventsResult.error,
      };
    }

    const conflictingEvents = eventsResult.data || [];
    
    return {
      success: true,
      data: {
        available: conflictingEvents.length === 0,
        conflictingEvents,
      },
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error verificando disponibilidad en calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene horarios libres en un día específico
 */
export async function getAvailableSlots(
  calendarId: string,
  date: string,
  slotDuration: number = 30, // minutos
  workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
): Promise<CalendarOperationResult<{ start: string; end: string }[]>> {
  try {
    const startOfDay = `${date}T${workingHours.start}:00`;
    const endOfDay = `${date}T${workingHours.end}:00`;
    
    const eventsResult = await getEvents(calendarId, {
      timeMin: startOfDay,
      timeMax: endOfDay,
    });

    if (!eventsResult.success) {
      return {
        success: false,
        error: eventsResult.error,
      };
    }

    const events = eventsResult.data || [];
    const availableSlots: { start: string; end: string }[] = [];
    
    // Lógica para calcular slots disponibles
    // (implementación simplificada - se puede mejorar)
    const workStart = new Date(`${date}T${workingHours.start}:00`);
    const workEnd = new Date(`${date}T${workingHours.end}:00`);
    
    let currentTime = new Date(workStart);
    
    while (currentTime < workEnd) {
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
      
      if (slotEnd > workEnd) break;
      
      // Verificar si hay conflictos con eventos existentes
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
        
        return (
          (currentTime >= eventStart && currentTime < eventEnd) ||
          (slotEnd > eventStart && slotEnd <= eventEnd) ||
          (currentTime <= eventStart && slotEnd >= eventEnd)
        );
      });
      
      if (!hasConflict) {
        availableSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
      
      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }
    
    return {
      success: true,
      data: availableSlots,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo slots disponibles para ${date}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene información de disponibilidad (free/busy) de uno o más calendarios
 */
export async function getCalendarFreeBusy(
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
  timeZone?: string
): Promise<CalendarOperationResult<calendar_v3.Schema$FreeBusyResponse>> {
  try {
    const response = await googleCalendarClient.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: timeZone || calendarConfig.defaultTimezone,
        items: calendarIds.map(id => ({ id })),
      },
    });

    console.log(`[Calendar Utils] Información free/busy obtenida para ${calendarIds.length} calendario(s)`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo información free/busy:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene eventos de múltiples calendarios de forma optimizada
 */
export async function getCalendarEvents(
  calendarIds: string[],
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    singleEvents?: boolean;
    orderBy?: 'startTime' | 'updated';
    showDeleted?: boolean;
    syncToken?: string;
  } = {}
): Promise<CalendarOperationResult<{
  events: calendar_v3.Schema$Event[];
  calendarId: string;
}[]>> {
  try {
    const promises = calendarIds.map(async (calendarId) => {
      const response = await googleCalendarClient.events.list({
        calendarId,
        timeMin: options.timeMin,
        timeMax: options.timeMax,
        maxResults: options.maxResults || 250,
        singleEvents: options.singleEvents ?? true,
        orderBy: options.orderBy || 'startTime',
        showDeleted: options.showDeleted ?? false,
        syncToken: options.syncToken,
      });
      
      return {
        events: response.data.items || [],
        calendarId,
      };
    });

    const results = await Promise.all(promises);
    
    console.log(`[Calendar Utils] Eventos obtenidos de ${calendarIds.length} calendario(s)`);
    
    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo eventos de múltiples calendarios:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// === Funciones de Configuración y Permisos ===

/**
 * Obtiene la configuración de un calendario
 */
export async function getCalendarSettings(
  calendarId: string
): Promise<CalendarOperationResult<calendar_v3.Schema$CalendarListEntry>> {
  try {
    const response = await googleCalendarClient.calendarList.get({
      calendarId,
    });

    console.log(`[Calendar Utils] Configuración obtenida para calendario: ${calendarId}`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo configuración del calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza la configuración de un calendario
 */
export async function updateCalendarSettings(
  calendarId: string,
  settings: {
    backgroundColor?: string;
    foregroundColor?: string;
    colorId?: string;
    defaultReminders?: calendar_v3.Schema$EventReminder[];
    notificationSettings?: {
      notifications?: calendar_v3.Schema$CalendarNotification[];
    };
    primary?: boolean;
    selected?: boolean;
    summaryOverride?: string;
  }
): Promise<CalendarOperationResult<calendar_v3.Schema$CalendarListEntry>> {
  try {
    const response = await googleCalendarClient.calendarList.patch({
      calendarId,
      requestBody: settings,
    });

    console.log(`[Calendar Utils] Configuración actualizada para calendario: ${calendarId}`);
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error actualizando configuración del calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene la lista de control de acceso (ACL) de un calendario
 */
export async function getCalendarACL(
  calendarId: string
): Promise<CalendarOperationResult<calendar_v3.Schema$AclRule[]>> {
  try {
    const response = await googleCalendarClient.acl.list({
      calendarId,
    });

    console.log(`[Calendar Utils] ACL obtenida para calendario: ${calendarId}`);
    
    return {
      success: true,
      data: response.data.items || [],
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error obteniendo ACL del calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Actualiza o crea una regla de ACL para un calendario
 */
export async function updateCalendarACL(
  calendarId: string,
  aclRule: {
    role: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
    scope: {
      type: 'default' | 'user' | 'group' | 'domain';
      value?: string;
    };
  },
  ruleId?: string
): Promise<CalendarOperationResult<calendar_v3.Schema$AclRule>> {
  try {
    let response;
    
    if (ruleId) {
      // Actualizar regla existente
      response = await googleCalendarClient.acl.patch({
        calendarId,
        ruleId,
        requestBody: aclRule,
      });
      console.log(`[Calendar Utils] Regla ACL actualizada: ${ruleId} en calendario ${calendarId}`);
    } else {
      // Crear nueva regla
      response = await googleCalendarClient.acl.insert({
        calendarId,
        requestBody: aclRule,
      });
      console.log(`[Calendar Utils] Nueva regla ACL creada en calendario: ${calendarId}`);
    }
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`[Calendar Utils] Error ${ruleId ? 'actualizando' : 'creando'} regla ACL en calendario ${calendarId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Obtiene los colores disponibles para calendarios y eventos
 */
export async function getCalendarColors(): Promise<CalendarOperationResult<calendar_v3.Schema$Colors>> {
  try {
    const response = await googleCalendarClient.colors.get();

    console.log('[Calendar Utils] Colores de calendario obtenidos');
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('[Calendar Utils] Error obteniendo colores de calendario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}