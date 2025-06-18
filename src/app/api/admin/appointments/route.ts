import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { appointments } from '@/db/schema/appointments';
import { eq, and, gte, lte } from 'drizzle-orm';
import {
  createAppointmentWithCalendar,
  getAppointmentByGoogleEventId,
  updateAppointmentSyncStatus,
  getPendingSyncAppointments,
  getFailedSyncAppointments,
  getDoctorAppointmentsByDateRange,
  removeAppointmentCalendarInfo
} from '@/db/utils/GCalendar/calendar-db-utils';
import {
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
  cancelAppointment,
  deleteAppointment,
  searchAppointments
} from '@/app/lib/google-calendar/appointment-service';

/**
 * @fileoverview API para gestión de citas
 * @description Endpoints para obtener y gestionar citas médicas
 */

// GET /api/admin/appointments - Obtiene citas con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');
    const doctorId = searchParams.get('doctorId');
    const calendarId = searchParams.get('calendarId');
    const googleEventId = searchParams.get('googleEventId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const syncStatus = searchParams.get('syncStatus');
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Si se especifica un ID de cita específico
    if (appointmentId) {
      return await getAppointmentDetails(parseInt(appointmentId));
    }

    // Si se especifica un Google Event ID
    if (googleEventId) {
      return await getAppointmentByGoogleEvent(googleEventId);
    }

    // Si se especifica un estado de sincronización específico
    if (syncStatus) {
      return await getAppointmentsBySyncStatus(syncStatus);
    }

    // Si hay una consulta de búsqueda y calendarId
    if (searchQuery && calendarId) {
      return await searchAppointmentsInCalendar(calendarId, searchQuery, {
        startDate,
        endDate
      });
    }

    // Obtener citas con filtros
    return await getFilteredAppointments({
      doctorId: doctorId ? parseInt(doctorId) : undefined,
      calendarId,
      startDate,
      endDate,
      page,
      pageSize
    });

  } catch (error) {
    console.error('[Admin Appointments API] Error:', error);
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

// Función para obtener detalles de una cita específica
async function getAppointmentDetails(appointmentId: number) {
  try {
    const appointment = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment[0]) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    // Si tiene Google Event ID, obtener también información del calendario
    let calendarInfo = null;
    if (appointment[0].google_event_id && appointment[0].google_calendar_id) {
      try {
        const calendarResult = await getAppointment(
          appointment[0].google_calendar_id,
          appointment[0].google_event_id
        );
        if (calendarResult.success) {
          calendarInfo = calendarResult.data;
        }
      } catch (error) {
        console.warn('Error obteniendo información del calendario:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...appointment[0],
        calendarInfo
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo detalles de la cita: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener cita por Google Event ID
async function getAppointmentByGoogleEvent(googleEventId: string) {
  try {
    const appointment = await getAppointmentByGoogleEventId(googleEventId);
    
    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada con ese Google Event ID',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: appointment,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo cita por Google Event ID: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener citas por estado de sincronización
async function getAppointmentsBySyncStatus(syncStatus: string) {
  try {
    let appointmentsResult: any[] = [];
    
    switch (syncStatus) {
      case 'pending':
        appointmentsResult = await getPendingSyncAppointments();
        break;
      case 'failed':
        appointmentsResult = await getFailedSyncAppointments();
        break;
      default:
        appointmentsResult = await db
          .select()
          .from(appointments)
          .where(eq(appointments.sync_status, syncStatus as any));
    }

    return NextResponse.json({
      success: true,
      data: {
        syncStatus,
        total: appointmentsResult.length,
        appointments: appointmentsResult
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo citas por estado de sincronización: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para buscar citas en calendario
async function searchAppointmentsInCalendar(
  calendarId: string,
  query: string,
  filters: { startDate?: string | null; endDate?: string | null }
) {
  try {
    const searchResult = await searchAppointments(calendarId, query, {
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    });

    if (!searchResult.success) {
      throw new Error(searchResult.error || 'Error en la búsqueda');
    }

    return NextResponse.json({
      success: true,
      data: {
        query,
        calendarId,
        total: (searchResult.data || []).length,
        appointments: searchResult.data || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error buscando citas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Función para obtener citas con filtros
async function getFilteredAppointments(filters: {
  doctorId?: number;
  calendarId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  page: number;
  pageSize: number;
}) {
  try {
    let appointmentsResult: any[] = [];
    
    // Si se especifica doctor y rango de fechas, usar función específica
    if (filters.doctorId && filters.startDate && filters.endDate) {
      appointmentsResult = await getDoctorAppointmentsByDateRange(
        filters.doctorId,
        new Date(filters.startDate),
        new Date(filters.endDate)
      );
    } else {
      // Construir query con filtros
      const conditions = [];
      
      if (filters.doctorId) {
        conditions.push(eq(appointments.doctorId, filters.doctorId));
      }
      
      if (filters.startDate) {
        conditions.push(gte(appointments.date, new Date(filters.startDate)));
      }
      
      if (filters.endDate) {
        conditions.push(lte(appointments.date, new Date(filters.endDate)));
      }
      
      if (conditions.length > 0) {
        appointmentsResult = await db.select().from(appointments).where(and(...conditions));
      } else {
        appointmentsResult = await db.select().from(appointments);
      }
    }

    // Aplicar paginación
    const total = appointmentsResult.length;
    const totalPages = Math.ceil(total / filters.pageSize);
    const startIndex = (filters.page - 1) * filters.pageSize;
    const endIndex = startIndex + filters.pageSize;
    const paginatedAppointments = appointmentsResult.slice(startIndex, endIndex);

    // Si hay calendarId, enriquecer con información del calendario
    let enrichedAppointments = paginatedAppointments;
    if (filters.calendarId) {
      const calendarResult = await listAppointments(filters.calendarId, {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      });
      
      if (calendarResult.success) {
        // Combinar información de DB y calendario
        enrichedAppointments = paginatedAppointments.map(dbAppointment => {
          const calendarAppointment = calendarResult.data?.data.find(
            ca => ca.eventId === dbAppointment.google_event_id
          );
          return {
            ...dbAppointment,
            calendarInfo: calendarAppointment || null
          };
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        appointments: enrichedAppointments,
        pagination: {
          total,
          page: filters.page,
          pageSize: filters.pageSize,
          totalPages,
          hasNext: filters.page < totalPages,
          hasPrevious: filters.page > 1
        },
        filters
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo citas filtradas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// PUT /api/admin/appointments - Actualiza estado de sincronización
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!appointmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de cita requerido',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    let result;
    switch (action) {
      case 'sync-status':
        result = await updateAppointmentSyncStatus(parseInt(appointmentId), body);
        break;
      case 'remove-calendar':
        result = await removeAppointmentCalendarInfo(parseInt(appointmentId));
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

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Acción '${action}' ejecutada exitosamente`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Appointments API] Error updating:', error);
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