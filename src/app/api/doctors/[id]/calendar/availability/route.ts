// src/app/api/doctors/[id]/calendar/availability/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doctorCalendarService } from '@/lib/doctor-calendar';

/**
 * GET /api/doctors/[id]/calendar/availability
 * Verificar disponibilidad de un doctor en un rango de fechas
 * Query params: startDateTime, endDateTime
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

    const { searchParams } = new URL(request.url);
    const startDateTime = searchParams.get('startDateTime');
    const endDateTime = searchParams.get('endDateTime');

    if (!startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'startDateTime and endDateTime are required' },
        { status: 400 }
      );
    }

    // Validar formato de fechas
    try {
      new Date(startDateTime).toISOString();
      new Date(endDateTime).toISOString();
    } catch {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format' },
        { status: 400 }
      );
    }

    const result = await doctorCalendarService.checkDoctorAvailability(
      doctorId,
      startDateTime,
      endDateTime
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        isAvailable: result.isAvailable,
        conflictingEvents: result.conflictingEvents,
        timeRange: {
          start: startDateTime,
          end: endDateTime,
        },
      },
    });
  } catch (error) {
    console.error('Error checking doctor availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}