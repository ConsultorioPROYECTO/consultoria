// src/app/api/doctors/[id]/calendar/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doctorCalendarService } from '@/lib/doctor-calendar';

/**
 * GET /api/doctors/[id]/calendar/events
 * Obtener eventos del calendario de un doctor en un rango de fechas
 * Query params: startDate, endDate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doctorId = parseInt(id);
    
    if (isNaN(doctorId)) {
      return NextResponse.json(
        { error: 'Invalid doctor ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Validar formato de fechas (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    const result = await doctorCalendarService.getDoctorCalendarEvents(
      doctorId,
      startDate,
      endDate
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
        events: result.events,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        count: result.events?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error getting doctor calendar events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}