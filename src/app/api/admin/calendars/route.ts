import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq, isNotNull } from 'drizzle-orm';
import {
  listCalendars,
  getCalendar,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  getCalendarEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEvent,
  getCalendarSettings,
  updateCalendarSettings,
  getCalendarACL,
  updateCalendarACL,
  getCalendarFreeBusy,
  getCalendarColors
} from '@/app/lib/google-calendar/calendar-utils';
import {
  listAppointments,
  getAppointment,
  searchAppointments
} from '@/app/lib/google-calendar/appointment-service';
import type { PaginatedResult, Appointment } from '@/app/lib/google-calendar/types';
import { users } from '@/db/schema/users';

/**
 * @fileoverview API para gestión de calendarios y eventos
 * @description Endpoints para obtener y gestionar calendarios de Google Calendar
 */

// GET /api/admin/calendars - Obtiene calendarios y eventos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');
    const eventId = searchParams.get('eventId');
    const doctorId = searchParams.get('doctorId');
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = searchParams.get('search');
    const maxResults = parseInt(searchParams.get('maxResults') || '250');
    const timeZone = searchParams.get('timeZone') || 'America/Bogota';

    // Si se especifica un evento específico
    if (calendarId && eventId) {
      return await getEventDetails(calendarId, eventId);
    }

    // Si se especifica un calendario específico
    if (calendarId) {
      return await getCalendarDetails(calendarId, {
        action,
        startDate,
        endDate,
        searchQuery,
        maxResults,
        timeZone
      });
    }

    // Si se especifica un doctor, obtener sus calendarios
    if (doctorId) {
      return await getDoctorCalendars(parseInt(doctorId));
    }

    // Obtener todos los calendarios del sistema
    return await getAllSystemCalendars();

  } catch (error) {
    console.error('[Admin Calendars API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Función para obtener detalles de un evento específico
async function getEventDetails(calendarId: string, eventId: string) {
  try {
    const eventResult = await getEvent(calendarId, eventId);
    
    if (!eventResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: eventResult.error || 'Evento no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        calendarId,
        event: eventResult.data
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo detalles del evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener detalles de un calendario específico
async function getCalendarDetails(
  calendarId: string,
  options: {
    action?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    searchQuery?: string | null;
    maxResults: number;
    timeZone: string;
  }
) {
  try {
    // Obtener información básica del calendario
    const calendarResult = await getCalendar(calendarId);
    
    if (!calendarResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: calendarResult.error || 'Calendario no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const calendarData = calendarResult.data;
    let additionalData: any = {};

    // Según la acción solicitada, obtener información adicional
    switch (options.action) {
      case 'events':
        additionalData.events = await getCalendarEventsData(calendarId, {
          startDate: options.startDate,
          endDate: options.endDate,
          maxResults: options.maxResults,
          timeZone: options.timeZone
        });
        break;
        
      case 'appointments':
        additionalData.appointments = await getCalendarAppointmentsData(calendarId, {
          startDate: options.startDate,
          endDate: options.endDate,
          searchQuery: options.searchQuery
        });
        break;
        
      case 'settings':
        additionalData.settings = await getCalendarSettingsData(calendarId);
        break;
        
      case 'acl':
        additionalData.acl = await getCalendarACLData(calendarId);
        break;
        
      case 'freebusy':
        if (options.startDate && options.endDate) {
          additionalData.freeBusy = await getCalendarFreeBusyData(calendarId, {
            startDate: options.startDate,
            endDate: options.endDate,
            timeZone: options.timeZone
          });
        }
        break;
        
      case 'colors':
        additionalData.colors = await getCalendarColorsData();
        break;
        
      case 'full':
        // Obtener toda la información disponible
        additionalData = await getFullCalendarData(calendarId, {
          startDate: options.startDate,
          endDate: options.endDate,
          maxResults: options.maxResults,
          timeZone: options.timeZone
        });
        break;
        
      default:
        // Por defecto, obtener eventos recientes
        additionalData.events = await getCalendarEventsData(calendarId, {
          maxResults: 10,
          timeZone: options.timeZone
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        calendar: calendarData,
        ...additionalData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo detalles del calendario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener eventos del calendario
async function getCalendarEventsData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    maxResults: number;
    timeZone: string;
  }
) {
  try {
    const eventsResult = await getCalendarEvents([calendarId], {
      timeMin: options.startDate || undefined,
      timeMax: options.endDate || undefined,
      maxResults: options.maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    return {
      success: eventsResult.success,
      total: eventsResult.data?.length || 0,
      events: eventsResult.data || [],
      error: eventsResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo eventos'
    };
  }
}

// Función para obtener citas del calendario
async function getCalendarAppointmentsData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    searchQuery?: string | null;
  }
) {
  try {
    let appointmentsResult;
    
    if (options.searchQuery) {
      appointmentsResult = await searchAppointments(calendarId, options.searchQuery, {
        startDate: options.startDate || undefined,
        endDate: options.endDate || undefined
      });
    } else {
      appointmentsResult = await listAppointments(calendarId, {
        startDate: options.startDate || undefined,
        endDate: options.endDate || undefined
      });
    }

    // Handle different return types: PaginatedResult<Appointment> vs Appointment[]
    const isSearchResult = options.searchQuery;
    const appointments = isSearchResult 
      ? (appointmentsResult.data as Appointment[] || [])
      : ((appointmentsResult.data as PaginatedResult<Appointment>)?.data || []);
    
    const total = isSearchResult
      ? (appointmentsResult.data as Appointment[] || []).length
      : ((appointmentsResult.data as PaginatedResult<Appointment>)?.total || 0);

    return {
      success: appointmentsResult.success,
      total,
      appointments,
      error: appointmentsResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo citas'
    };
  }
}

// Función para obtener configuraciones del calendario
async function getCalendarSettingsData(calendarId: string) {
  try {
    const settingsResult = await getCalendarSettings(calendarId);
    return {
      success: settingsResult.success,
      settings: settingsResult.data || null,
      error: settingsResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo configuraciones'
    };
  }
}

// Función para obtener ACL del calendario
async function getCalendarACLData(calendarId: string) {
  try {
    const aclResult = await getCalendarACL(calendarId);
    return {
      success: aclResult.success,
      acl: aclResult.data || [],
      error: aclResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo ACL'
    };
  }
}

// Función para obtener información de disponibilidad
async function getCalendarFreeBusyData(
  calendarId: string,
  options: {
    startDate: string;
    endDate: string;
    timeZone: string;
  }
) {
  try {
    const freeBusyResult = await getCalendarFreeBusy(
      [calendarId],
      options.startDate,
      options.endDate,
      options.timeZone
    );
    
    return {
      success: freeBusyResult.success,
      freeBusy: freeBusyResult.data || null,
      error: freeBusyResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo disponibilidad'
    };
  }
}

// Función para obtener colores del calendario
async function getCalendarColorsData() {
  try {
    const colorsResult = await getCalendarColors();
    return {
      success: colorsResult.success,
      colors: colorsResult.data || null,
      error: colorsResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo colores'
    };
  }
}

// Función para obtener información completa del calendario
async function getFullCalendarData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    maxResults: number;
    timeZone: string;
  }
) {
  try {
    const [events, appointments, settings, acl, colors] = await Promise.allSettled([
      getCalendarEventsData(calendarId, options),
      getCalendarAppointmentsData(calendarId, {
        startDate: options.startDate,
        endDate: options.endDate
      }),
      getCalendarSettingsData(calendarId),
      getCalendarACLData(calendarId),
      getCalendarColorsData()
    ]);

    return {
      events: events.status === 'fulfilled' ? events.value : { success: false, error: 'Error obteniendo eventos' },
      appointments: appointments.status === 'fulfilled' ? appointments.value : { success: false, error: 'Error obteniendo citas' },
      settings: settings.status === 'fulfilled' ? settings.value : { success: false, error: 'Error obteniendo configuraciones' },
      acl: acl.status === 'fulfilled' ? acl.value : { success: false, error: 'Error obteniendo ACL' },
      colors: colors.status === 'fulfilled' ? colors.value : { success: false, error: 'Error obteniendo colores' }
    };
  } catch (error) {
    throw new Error(`Error obteniendo información completa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener calendarios de un doctor específico
async function getDoctorCalendars(doctorId: number) {
  try {
    const doctor = await db
      .select({
        idDoctor: doctors.idDoctor,
        name: users.displayName,
        email: users.email,
        googleCalendarId: doctors.calendar_id,
        speciality: doctors.speciality,
        userId: doctors.userId
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(eq(doctors.idDoctor, doctorId))
      .limit(1);

    if (!doctor[0]) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const doctorData = doctor[0];
    let calendarsData: any = {
      doctor: {
        id: doctorData.idDoctor,
        name: doctorData.name,
        email: doctorData.email,
        googleCalendarId: doctorData.googleCalendarId
      },
      calendars: []
    };

    // Si el doctor tiene un calendario configurado, obtener su información
    if (doctorData.googleCalendarId) {
      const calendarResult = await getCalendar(doctorData.googleCalendarId);
      if (calendarResult.success) {
        calendarsData.calendars.push({
          ...calendarResult.data,
          isPrimary: true
        });
      }
    }

    // Obtener lista de todos los calendarios accesibles
    const allCalendarsResult = await listCalendars();
    if (allCalendarsResult.success && allCalendarsResult.data) {
      calendarsData.allAccessibleCalendars = allCalendarsResult.data;
    }

    return NextResponse.json({
      success: true,
      data: calendarsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo calendarios del doctor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener todos los calendarios del sistema
async function getAllSystemCalendars() {
  try {
    // Obtener todos los doctores con calendarios configurados
    const doctorsWithCalendars = await db
      .select({
        id: doctors.idDoctor,
        name: users.displayName,
        email: users.email,
        googleCalendarId: doctors.calendar_id
      })
      .from(doctors)
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(isNotNull(doctors.calendar_id)); // Solo doctores con calendario

    // Obtener lista de todos los calendarios
    const allCalendarsResult = await listCalendars();
    
    let systemData: any = {
      totalDoctors: doctorsWithCalendars.length,
      doctorsWithCalendars,
      calendars: {
        success: allCalendarsResult.success,
        total: allCalendarsResult.data?.length || 0,
        data: allCalendarsResult.data || [],
        error: allCalendarsResult.error
      }
    };

    // Obtener colores disponibles
    const colorsResult = await getCalendarColorsData();
    if (colorsResult.success) {
      systemData.availableColors = colorsResult.colors;
    }

    return NextResponse.json({
      success: true,
      data: systemData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo calendarios del sistema: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// POST /api/admin/calendars - Crear calendario o evento
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const calendarId = searchParams.get('calendarId');
    
    const body = await request.json();

    let result;
    switch (action) {
      case 'create-calendar':
        result = await createCalendar(body);
        break;
      case 'create-event':
        if (!calendarId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID requerido para crear evento',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await createEvent(calendarId, body);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Acción no válida',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      message: `${action} ejecutado exitosamente`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Calendars API] Error creating:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/calendars - Actualizar calendario o evento
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const calendarId = searchParams.get('calendarId');
    const eventId = searchParams.get('eventId');
    
    const body = await request.json();

    let result;
    switch (action) {
      case 'update-calendar':
        if (!calendarId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID requerido',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await updateCalendar(calendarId, body);
        break;
      case 'update-event':
        if (!calendarId || !eventId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID y Event ID requeridos',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await updateEvent(calendarId, eventId, body);
        break;
      case 'update-settings':
        if (!calendarId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID requerido',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await updateCalendarSettings(calendarId, body);
        break;
      case 'update-acl':
        if (!calendarId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID requerido',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await updateCalendarACL(calendarId, body);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Acción no válida',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      message: `${action} ejecutado exitosamente`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Calendars API] Error updating:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/calendars - Eliminar calendario o evento
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const calendarId = searchParams.get('calendarId');
    const eventId = searchParams.get('eventId');

    let result;
    switch (action) {
      case 'delete-calendar':
        if (!calendarId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID requerido',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await deleteCalendar(calendarId);
        break;
      case 'delete-event':
        if (!calendarId || !eventId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Calendar ID y Event ID requeridos',
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }
        result = await deleteEvent(calendarId, eventId);
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Acción no válida',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
      message: `${action} ejecutado exitosamente`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Calendars API] Error deleting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}