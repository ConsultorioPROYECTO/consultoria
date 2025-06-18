import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { doctors } from '@/db/schema/doctors';
import { eq } from 'drizzle-orm';
import {
  getDoctorWithCalendar,
  getDoctorSyncStats,
  getDoctorsWithSyncEnabled,
  getDoctorSyncedAppointments,
  updateDoctorCalendarConfig
} from '@/db/utils/GCalendar/calendar-db-utils';

/**
 * @fileoverview API para gestión de doctores
 * @description Endpoints para obtener y gestionar información de doctores
 */

// GET /api/admin/doctors - Obtiene todos los doctores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('id');
    const withSync = searchParams.get('withSync') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeAppointments = searchParams.get('includeAppointments') === 'true';

    // Si se especifica un doctor específico
    if (doctorId) {
      return await getDoctorDetails(parseInt(doctorId), {
        includeStats,
        includeAppointments
      });
    }

    // Obtener todos los doctores o solo los que tienen sincronización habilitada
    let doctorsData;
    if (withSync) {
      doctorsData = await getDoctorsWithSyncEnabled();
    } else {
      doctorsData = await db.select().from(doctors);
    }

    // Enriquecer con estadísticas si se solicita
    if (includeStats) {
      const enrichedDoctors = await Promise.all(
        doctorsData.map(async (doctor) => {
          const syncStats = await getDoctorSyncStats(doctor.idDoctor);
          return {
            ...doctor,
            syncStats
          };
        })
      );
      doctorsData = enrichedDoctors;
    }

    return NextResponse.json({
      success: true,
      data: {
        total: doctorsData.length,
        doctors: doctorsData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Doctors API] Error:', error);
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

// Función para obtener detalles completos de un doctor
async function getDoctorDetails(
  doctorId: number,
  options: {
    includeStats?: boolean;
    includeAppointments?: boolean;
  }
) {
  try {
    const doctor = await getDoctorWithCalendar(doctorId);
    
    if (!doctor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const result: any = { ...doctor };

    // Incluir estadísticas de sincronización
    if (options.includeStats) {
      result.syncStats = await getDoctorSyncStats(doctorId);
    }

    // Incluir citas sincronizadas
    if (options.includeAppointments) {
      result.syncedAppointments = await getDoctorSyncedAppointments(doctorId);
    }

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    throw new Error(`Error obteniendo detalles del doctor: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// PUT /api/admin/doctors - Actualiza configuración de calendario de un doctor
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('id');
    
    if (!doctorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de doctor requerido',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      calendar_id,
      calendar_timezone,
      calendar_color,
      calendar_sync_enabled,
      calendar_settings,
      working_hours,
      break_times,
      appointment_duration
    } = body;

    const updatedDoctor = await updateDoctorCalendarConfig(parseInt(doctorId), {
      calendar_id,
      calendar_timezone,
      calendar_color,
      calendar_sync_enabled,
      calendar_settings,
      working_hours,
      break_times,
      appointment_duration
    });

    if (!updatedDoctor) {
      return NextResponse.json(
        {
          success: false,
          error: 'Doctor no encontrado',
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedDoctor,
      message: 'Configuración de calendario actualizada exitosamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Admin Doctors API] Error updating:', error);
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