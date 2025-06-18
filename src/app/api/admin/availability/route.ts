import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db';
import { doctors } from '../../../../db/schema/doctors';
import { users } from '../../../../db/schema/users';
import { Appointment, appointments } from '../../../../db/schema/appointments';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import {
  getCalendarFreeBusy,
  getCalendarEvents,
  getCalendar
} from '../../../lib/google-calendar/calendar-utils';
import {
  listAppointments
} from '../../../lib/google-calendar/appointment-service';
import {
  getDoctorAppointmentsByDateRange,
  getAppointmentStats
} from '../../../../db/utils/GCalendar/calendar-db-utils';

/**
 * @fileoverview API para gestión de disponibilidad y estadísticas
 * @description Endpoints para obtener información de disponibilidad de doctores y estadísticas del sistema
 */

// GET /api/admin/availability - Obtiene disponibilidad y estadísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const calendarId = searchParams.get('calendarId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const timeZone = searchParams.get('timeZone') || 'America/Bogota';
    const action = searchParams.get('action');
    const granularity = searchParams.get('granularity') || 'day'; // day, week, month
    const includeWeekends = searchParams.get('includeWeekends') === 'true';

    // Si se especifica un doctor específico
    if (doctorId) {
      return await getDoctorAvailability(parseInt(doctorId), {
        startDate,
        endDate,
        timeZone,
        action,
        granularity,
        includeWeekends
      });
    }

    // Si se especifica un calendario específico
    if (calendarId) {
      return await getCalendarAvailability(calendarId, {
        startDate,
        endDate,
        timeZone,
        action,
        granularity,
        includeWeekends
      });
    }

    // Obtener estadísticas generales del sistema
    return await getSystemAvailabilityStats({
      startDate,
      endDate,
      timeZone,
      granularity,
      includeWeekends
    });

  } catch (error) {
    console.error('[Admin Availability API] Error:', error);
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

// Función para obtener disponibilidad de un doctor específico
async function getDoctorAvailability(
  doctorId: number,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
    action?: string | null;
    granularity: string;
    includeWeekends: boolean;
  }
) {
  try {
    // Obtener información del doctor con datos del usuario
    const doctor = await db
      .select({
        idDoctor: doctors.idDoctor,
        userId: doctors.userId,
        speciality: doctors.speciality,
        calendar_id: doctors.calendar_id,
        privatePhone: doctors.privatePhone,
        nitId: doctors.nitId,
        availability: doctors.availability,
        tokenGoogleId: doctors.tokenGoogleId,
        calendar_timezone: doctors.calendar_timezone,
        calendar_color: doctors.calendar_color,
        calendar_sync_enabled: doctors.calendar_sync_enabled,
        last_calendar_sync: doctors.last_calendar_sync,
        createdAt: doctors.createdAt,
        updatedAt: doctors.updatedAt,
        // Datos del usuario
        displayName: users.displayName,
        email: users.email
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
    let availabilityData: any = {
      doctor: {
        id: doctorData.idDoctor,
        name: doctorData.displayName,
        email: doctorData.email,
        googleCalendarId: doctorData.calendar_id
      }
    };

    // Si no tiene calendario configurado
    if (!doctorData.calendar_id) {
      availabilityData.availability = {
        success: false,
        error: 'Doctor no tiene calendario configurado'
      };
      return NextResponse.json({
        success: true,
        data: availabilityData,
        timestamp: new Date().toISOString()
      });
    }

    // Según la acción solicitada
    switch (options.action) {
      case 'freebusy':
        availabilityData.freeBusy = await getDoctorFreeBusy(
          doctorData.calendar_id,
          options
        );
        break;
        
      case 'appointments':
        availabilityData.appointments = await getDoctorAppointmentsData(
          doctorId,
          doctorData.calendar_id,
          options
        );
        break;
        
      case 'events':
        availabilityData.events = await getDoctorEventsData(
          doctorData.calendar_id,
          options
        );
        break;
        
      case 'stats':
        availabilityData.stats = await getDoctorStatsData(
          doctorId,
          options
        );
        break;
        
      case 'schedule':
        availabilityData.schedule = await getDoctorScheduleData(
          doctorId,
          doctorData.calendar_id,
          options
        );
        break;
        
      case 'full':
        // Obtener toda la información disponible
        availabilityData = await getFullDoctorAvailability(
          doctorId,
          doctorData.calendar_id,
          options
        );
        availabilityData.doctor = {
        id: doctorData.idDoctor,
        name: doctorData.displayName,
        email: doctorData.email,
        googleCalendarId: doctorData.calendar_id
      };
        break;
        
      default:
        // Por defecto, obtener disponibilidad básica
        availabilityData.freeBusy = await getDoctorFreeBusy(
          doctorData.calendar_id,
          options
        );
        availabilityData.appointmentsSummary = await getDoctorAppointmentsSummary(
          doctorId,
          options
        );
    }

    return NextResponse.json({
      success: true,
      data: availabilityData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo disponibilidad del doctor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener disponibilidad de un calendario específico
async function getCalendarAvailability(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
    action?: string | null;
    granularity: string;
    includeWeekends: boolean;
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

    let availabilityData: any = {
      calendar: calendarResult.data
    };

    // Según la acción solicitada
    switch (options.action) {
      case 'freebusy':
        availabilityData.freeBusy = await getCalendarFreeBusyData(
          calendarId,
          options
        );
        break;
        
      case 'events':
        availabilityData.events = await getCalendarEventsData(
          calendarId,
          options
        );
        break;
        
      case 'appointments':
        availabilityData.appointments = await getCalendarAppointmentsData(
          calendarId,
          options
        );
        break;
        
      case 'full':
        // Obtener toda la información disponible
        availabilityData = await getFullCalendarAvailability(
          calendarId,
          options
        );
        availabilityData.calendar = calendarResult.data;
        break;
        
      default:
        // Por defecto, obtener disponibilidad básica
        availabilityData.freeBusy = await getCalendarFreeBusyData(
          calendarId,
          options
        );
    }

    return NextResponse.json({
      success: true,
      data: availabilityData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo disponibilidad del calendario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener estadísticas generales del sistema
async function getSystemAvailabilityStats(
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
    granularity: string;
    includeWeekends: boolean;
  }
) {
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
      .where(sql`${doctors.calendar_id} IS NOT NULL`);

    // Estadísticas básicas
    const totalDoctors = doctorsWithCalendars.length;
    const doctorsWithCalendarsCount = doctorsWithCalendars.filter(d => d.googleCalendarId).length;

    // Estadísticas de citas
    let appointmentStats: any = {};
    if (options.startDate && options.endDate) {
      const startDateObj = new Date(options.startDate);
      const endDateObj = new Date(options.endDate);
      
      // Total de citas en el rango
      const totalAppointments = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            gte(appointments.date, startDateObj),
            lte(appointments.date, endDateObj)
          )
        );

      appointmentStats = {
        total: totalAppointments[0]?.count || 0,
        dateRange: {
          start: options.startDate,
          end: options.endDate
        }
      };

      // Estadísticas por doctor
      const appointmentsByDoctor = await db
        .select({
          doctorId: appointments.doctorId,
          count: count()
        })
        .from(appointments)
        .where(
          and(
            gte(appointments.date, startDateObj),
            lte(appointments.date, endDateObj)
          )
        )
        .groupBy(appointments.doctorId);

      appointmentStats.byDoctor = appointmentsByDoctor;
    }

    // Obtener disponibilidad de cada doctor (muestra)
    const doctorAvailabilitySample = await Promise.allSettled(
      doctorsWithCalendars.slice(0, 5).map(async (doctor) => {
        if (!doctor.googleCalendarId) return null;
        
        const freeBusyResult = await getDoctorFreeBusy(
          doctor.googleCalendarId,
          options
        );
        
        return {
          doctorId: doctor.id,
          doctorName: doctor.name,
          calendarId: doctor.googleCalendarId,
          availability: freeBusyResult
        };
      })
    );

    const systemStats = {
      overview: {
        totalDoctors,
        doctorsWithCalendars: doctorsWithCalendarsCount,
        doctorsWithoutCalendars: totalDoctors - doctorsWithCalendarsCount
      },
      appointments: appointmentStats,
      doctorAvailabilitySample: doctorAvailabilitySample
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => (result as PromiseFulfilledResult<any>).value),
      timeZone: options.timeZone,
      granularity: options.granularity,
      includeWeekends: options.includeWeekends
    };

    return NextResponse.json({
      success: true,
      data: systemStats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo estadísticas del sistema: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Funciones auxiliares

async function getDoctorFreeBusy(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
  }
) {
  try {
    if (!options.startDate || !options.endDate) {
      // Usar rango por defecto (próximos 7 días)
      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      options.startDate = now.toISOString();
      options.endDate = endDate.toISOString();
    }

    const freeBusyResult = await getCalendarFreeBusy(
      [calendarId],
      options.startDate,
      options.endDate,
      options.timeZone
    );

    return {
      success: freeBusyResult.success,
      data: freeBusyResult.data,
      error: freeBusyResult.error,
      dateRange: {
        start: options.startDate,
        end: options.endDate
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo disponibilidad'
    };
  }
}

async function getDoctorAppointmentsData(
  doctorId: number,
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
  }
) {
  try {
    let dbAppointments: Appointment[] = [];
    let calendarAppointments = null;

    // Obtener citas de la base de datos
    if (options.startDate && options.endDate) {
      dbAppointments = await getDoctorAppointmentsByDateRange(
        doctorId,
        new Date(options.startDate),
        new Date(options.endDate)
      );
    }

    // Obtener citas del calendario
    const calendarResult = await listAppointments(calendarId, {
      startDate: options.startDate || undefined,
      endDate: options.endDate || undefined
    });

    if (calendarResult.success) {
      calendarAppointments = calendarResult.data;
    }

    return {
      success: true,
      database: {
        total: dbAppointments.length,
        appointments: dbAppointments
      },
      calendar: {
        success: calendarResult.success,
        total: calendarAppointments?.data?.length || 0,
        appointments: calendarAppointments?.data || [],
        error: calendarResult.error
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo citas'
    };
  }
}

async function getDoctorEventsData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
  }
) {
  try {
    const eventsResult = await getCalendarEvents([calendarId], {
      timeMin: options.startDate || undefined,
      timeMax: options.endDate || undefined,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
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

async function getDoctorStatsData(
  doctorId: number,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    granularity: string;
  }
) {
  try {
    // Estadísticas básicas de citas
    let appointmentStats: any = {};
    
    if (options.startDate && options.endDate) {
      const startDateObj = new Date(options.startDate);
      const endDateObj = new Date(options.endDate);
      
      const totalAppointments = await db
        .select({ count: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorId),
            gte(appointments.date, startDateObj),
            lte(appointments.date, endDateObj)
          )
        );

      appointmentStats = {
        total: totalAppointments[0]?.count || 0,
        dateRange: {
          start: options.startDate,
          end: options.endDate
        }
      };
    }

    return {
      success: true,
      appointments: appointmentStats,
      granularity: options.granularity
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo estadísticas'
    };
  }
}

async function getDoctorScheduleData(
  doctorId: number,
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
    includeWeekends: boolean;
  }
) {
  try {
    const [freeBusy, appointments, events] = await Promise.allSettled([
      getDoctorFreeBusy(calendarId, options),
      getDoctorAppointmentsData(doctorId, calendarId, options),
      getDoctorEventsData(calendarId, options)
    ]);

    return {
      freeBusy: freeBusy.status === 'fulfilled' ? freeBusy.value : { success: false, error: 'Error obteniendo disponibilidad' },
      appointments: appointments.status === 'fulfilled' ? appointments.value : { success: false, error: 'Error obteniendo citas' },
      events: events.status === 'fulfilled' ? events.value : { success: false, error: 'Error obteniendo eventos' },
      includeWeekends: options.includeWeekends
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo horario'
    };
  }
}

async function getFullDoctorAvailability(
  doctorId: number,
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
    granularity: string;
    includeWeekends: boolean;
  }
) {
  try {
    const [freeBusy, appointments, events, stats, schedule] = await Promise.allSettled([
      getDoctorFreeBusy(calendarId, options),
      getDoctorAppointmentsData(doctorId, calendarId, options),
      getDoctorEventsData(calendarId, options),
      getDoctorStatsData(doctorId, options),
      getDoctorScheduleData(doctorId, calendarId, options)
    ]);

    return {
      freeBusy: freeBusy.status === 'fulfilled' ? freeBusy.value : { success: false, error: 'Error obteniendo disponibilidad' },
      appointments: appointments.status === 'fulfilled' ? appointments.value : { success: false, error: 'Error obteniendo citas' },
      events: events.status === 'fulfilled' ? events.value : { success: false, error: 'Error obteniendo eventos' },
      stats: stats.status === 'fulfilled' ? stats.value : { success: false, error: 'Error obteniendo estadísticas' },
      schedule: schedule.status === 'fulfilled' ? schedule.value : { success: false, error: 'Error obteniendo horario' }
    };
  } catch (error) {
    throw new Error(`Error obteniendo información completa: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

async function getDoctorAppointmentsSummary(
  doctorId: number,
  options: {
    startDate?: string | null;
    endDate?: string | null;
  }
) {
  try {
    if (!options.startDate || !options.endDate) {
      return {
        success: false,
        error: 'Fechas requeridas para resumen de citas'
      };
    }

    const appointments = await getDoctorAppointmentsByDateRange(
      doctorId,
      new Date(options.startDate),
      new Date(options.endDate)
    );

    return {
      success: true,
      total: appointments.length,
      dateRange: {
        start: options.startDate,
        end: options.endDate
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo resumen de citas'
    };
  }
}

async function getCalendarFreeBusyData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
  }
) {
  return await getDoctorFreeBusy(calendarId, options);
}

async function getCalendarEventsData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
  }
) {
  return await getDoctorEventsData(calendarId, options);
}

async function getCalendarAppointmentsData(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
  }
) {
  try {
    const calendarResult = await listAppointments(calendarId, {
      startDate: options.startDate || undefined,
      endDate: options.endDate || undefined
    });

    return {
      success: calendarResult.success,
      total: calendarResult.data?.data?.length || 0,
      appointments: calendarResult.data?.data || [],
      error: calendarResult.error
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo citas del calendario'
    };
  }
}

async function getFullCalendarAvailability(
  calendarId: string,
  options: {
    startDate?: string | null;
    endDate?: string | null;
    timeZone: string;
    granularity: string;
    includeWeekends: boolean;
  }
) {
  try {
    const [freeBusy, events, appointments] = await Promise.allSettled([
      getCalendarFreeBusyData(calendarId, options),
      getCalendarEventsData(calendarId, options),
      getCalendarAppointmentsData(calendarId, options)
    ]);

    return {
      freeBusy: freeBusy.status === 'fulfilled' ? freeBusy.value : { success: false, error: 'Error obteniendo disponibilidad' },
      events: events.status === 'fulfilled' ? events.value : { success: false, error: 'Error obteniendo eventos' },
      appointments: appointments.status === 'fulfilled' ? appointments.value : { success: false, error: 'Error obteniendo citas' }
    };
  } catch (error) {
    throw new Error(`Error obteniendo información completa del calendario: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}