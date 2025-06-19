// src/app/api/doctors/[id]/calendar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doctorCalendarService } from '@/lib/doctor-calendar';
import { onCalendarSyncEnabled } from '@/lib/hooks/calendar-hooks';

/**
 * GET /api/doctors/[id]/calendar
 * Obtener información del calendario de un doctor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doctorId = parseInt(params.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const result = await doctorCalendarService.getDoctorCalendarSettings(doctorId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        settings: result.settings,
        calendarInfo: result.calendarInfo,
      },
    });
  } catch (error) {
    console.error('Error getting doctor calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/doctors/[id]/calendar
 * Crear calendario para un doctor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doctorId = parseInt(params.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { calendarName, timezone, color, syncEnabled } = body;

    const result = await doctorCalendarService.createDoctorCalendar({
      doctorId,
      calendarName,
      timezone,
      color,
      syncEnabled,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Si se habilitó la sincronización, sincronizar citas pendientes
    if (syncEnabled) {
      await onCalendarSyncEnabled(doctorId);
    }

    return NextResponse.json({
      success: true,
      data: {
        calendarId: result.calendarId,
      },
    });
  } catch (error) {
    console.error('Error creating doctor calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/doctors/[id]/calendar
 * Actualizar configuración del calendario de un doctor
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doctorId = parseInt(params.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    const result = await doctorCalendarService.updateDoctorCalendarSettings(
      doctorId,
      settings
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating doctor calendar settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/doctors/[id]/calendar
 * Eliminar calendario de un doctor
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const doctorId = parseInt(params.id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const result = await doctorCalendarService.deleteDoctorCalendar(doctorId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting doctor calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}