import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { appointments } from '@/db/schema/appointments';
import {
  getDoctorsWithSyncEnabled,
  getDoctorSyncStats,
  getGeneralSyncStats,
  getPendingSyncAppointments,
  getFailedSyncAppointments,
  getDoctorAppointmentsByDateRange
} from '@/db/utils/GCalendar/calendar-db-utils';
import {
  listCalendars,
  getEvents,
  getAvailableSlots,
  checkAvailability
} from '@/app/lib/google-calendar/calendar-utils';
import {
  listAppointments,
  getConsultorioStatistics,
  getAvailableAppointmentSlots
} from '@/app/lib/google-calendar/appointment-service';

/**
 * @fileoverview API Administrativa para obtener información completa del sistema
 * @description Endpoints sin autenticación para obtener datos de doctores, citas, calendarios y eventos
 */

// GET /api/admin - Obtiene toda la información del sistema
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const doctorId = searchParams.get('doctorId');
    const calendarId = searchParams.get('calendarId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');

    // Si se especifica una sección, devolver solo esa información
    if (section) {
      return await handleSectionRequest(section, {
        doctorId,
        calendarId,
        startDate,
        endDate,
        date
      });
    }

    // Obtener toda la información del sistema
    const [allData] = await Promise.allSettled([
      getAllSystemData()
    ]);

    if (allData.status === 'fulfilled') {
      return NextResponse.json({
        success: true,
        data: allData.value,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error('Error obteniendo datos del sistema');
    }

  } catch (error) {
    console.error('[Admin API] Error:', error);
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

// Función para manejar solicitudes de secciones específicas
async function handleSectionRequest(
  section: string,
  params: {
    doctorId?: string | null;
    calendarId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    date?: string | null;
  }
) {
  try {
    let data;

    switch (section) {
      case 'doctors':
        data = await getDoctorsData();
        break;
      
      case 'appointments':
        data = await getAppointmentsData(params.doctorId, params.startDate, params.endDate);
        break;
      
      case 'calendars':
        data = await getCalendarsData();
        break;
      
      case 'events':
        data = await getEventsData(params.calendarId, params.startDate, params.endDate);
        break;
      
      case 'availability':
        data = await getAvailabilityData(params.calendarId, params.date);
        break;
      
      case 'statistics':
        data = await getStatisticsData(params.doctorId);
        break;
      
      case 'sync-status':
        data = await getSyncStatusData();
        break;
      
      default:
        throw new Error(`Sección '${section}' no válida`);
    }

    return NextResponse.json({
      success: true,
      section,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        section,
        error: error instanceof Error ? error.message : 'Error obteniendo datos',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Función principal para obtener todos los datos del sistema
async function getAllSystemData() {
  const [doctorsResult, appointmentsResult, calendarsResult, syncStatsResult] = await Promise.allSettled([
    getDoctorsData(),
    getAppointmentsData(),
    getCalendarsData(),
    getSyncStatusData()
  ]);

  return {
    doctors: doctorsResult.status === 'fulfilled' ? doctorsResult.value : { error: 'Error obteniendo doctores' },
    appointments: appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : { error: 'Error obteniendo citas' },
    calendars: calendarsResult.status === 'fulfilled' ? calendarsResult.value : { error: 'Error obteniendo calendarios' },
    syncStatus: syncStatsResult.status === 'fulfilled' ? syncStatsResult.value : { error: 'Error obteniendo estado de sincronización' },
    systemInfo: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    }
  };
}

// Obtener información de doctores
async function getDoctorsData() {
  try {
    const allDoctors = await db.select().from(doctors);
    const doctorsWithSync = await getDoctorsWithSyncEnabled();
    
    const doctorsWithStats = await Promise.all(
      allDoctors.map(async (doctor) => {
        const syncStats = await getDoctorSyncStats(doctor.idDoctor);
        return {
          ...doctor,
          syncStats,
          hasSyncEnabled: doctorsWithSync.some(d => d.idDoctor === doctor.idDoctor)
        };
      })
    );

    return {
      total: allDoctors.length,
      withSyncEnabled: doctorsWithSync.length,
      doctors: doctorsWithStats
    };
  } catch (error) {
    throw new Error(`Error obteniendo doctores: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Obtener información de citas
async function getAppointmentsData(doctorId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    let appointmentsData;
    
    if (doctorId && startDate && endDate) {
      appointmentsData = await getDoctorAppointmentsByDateRange(
        parseInt(doctorId),
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      appointmentsData = await db.select().from(appointments);
    }

    const pendingSync = await getPendingSyncAppointments();
    const failedSync = await getFailedSyncAppointments();

    return {
      total: appointmentsData.length,
      pendingSync: pendingSync.length,
      failedSync: failedSync.length,
      appointments: appointmentsData,
      syncInfo: {
        pending: pendingSync,
        failed: failedSync
      }
    };
  } catch (error) {
    throw new Error(`Error obteniendo citas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Obtener información de calendarios
async function getCalendarsData() {
  try {
    const calendarsResult = await listCalendars();
    
    if (!calendarsResult.success) {
      throw new Error(calendarsResult.error || 'Error obteniendo calendarios');
    }

    const calendarsWithEvents = await Promise.all(
      (calendarsResult.data || []).map(async (calendar) => {
        try {
          const eventsResult = await getEvents(calendar.id || '', {
            maxResults: 10,
            timeMin: new Date().toISOString()
          });
          
          return {
            ...calendar,
            eventsCount: eventsResult.success ? (eventsResult.data || []).length : 0,
            recentEvents: eventsResult.success ? eventsResult.data?.slice(0, 5) : []
          };
        } catch (error) {
          return {
            ...calendar,
            eventsCount: 0,
            recentEvents: [],
            error: 'Error obteniendo eventos'
          };
        }
      })
    );

    return {
      total: calendarsWithEvents.length,
      calendars: calendarsWithEvents
    };
  } catch (error) {
    throw new Error(`Error obteniendo calendarios: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Obtener eventos de un calendario específico
async function getEventsData(calendarId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    if (!calendarId) {
      throw new Error('ID de calendario requerido');
    }

    const eventsResult = await getEvents(calendarId, {
      timeMin: startDate || new Date().toISOString(),
      timeMax: endDate as string,
      maxResults: 100
    });

    if (!eventsResult.success) {
      throw new Error(eventsResult.error || 'Error obteniendo eventos');
    }

    return {
      calendarId,
      total: (eventsResult.data || []).length,
      events: eventsResult.data || []
    };
  } catch (error) {
    throw new Error(`Error obteniendo eventos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Obtener información de disponibilidad
async function getAvailabilityData(calendarId?: string | null, date?: string | null) {
  try {
    if (!calendarId) {
      throw new Error('ID de calendario requerido');
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const availableSlotsResult = await getAvailableSlots(calendarId, targetDate);
    
    if (!availableSlotsResult.success) {
      throw new Error(availableSlotsResult.error || 'Error obteniendo disponibilidad');
    }

    // Verificar disponibilidad para las próximas 2 horas como ejemplo
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    const availabilityCheck = await checkAvailability(
      calendarId,
      now.toISOString(),
      twoHoursLater.toISOString()
    );

    return {
      calendarId,
      date: targetDate,
      availableSlots: availableSlotsResult.data || [],
      totalSlots: (availableSlotsResult.data || []).length,
      currentAvailability: {
        isAvailable: availabilityCheck.success ? availabilityCheck.data?.available : false,
        conflictingEvents: availabilityCheck.success ? availabilityCheck.data?.conflictingEvents : []
      }
    };
  } catch (error) {
    throw new Error(`Error obteniendo disponibilidad: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Obtener estadísticas del sistema
async function getStatisticsData(doctorId?: string | null) {
  try {
    const generalStats = await getGeneralSyncStats();
    
    let doctorStats = null;
    if (doctorId) {
      doctorStats = await getDoctorSyncStats(parseInt(doctorId));
    }

    return {
      general: generalStats,
      doctor: doctorStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Error obteniendo estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Obtener estado de sincronización
async function getSyncStatusData() {
  try {
    const [generalStats, pendingSync, failedSync] = await Promise.all([
      getGeneralSyncStats(),
      getPendingSyncAppointments(),
      getFailedSyncAppointments()
    ]);

    return {
      overview: generalStats,
      pending: {
        count: pendingSync.length,
        appointments: pendingSync
      },
      failed: {
        count: failedSync.length,
        appointments: failedSync
      },
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Error obteniendo estado de sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}