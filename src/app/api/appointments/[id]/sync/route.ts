// src/app/api/appointments/[id]/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { appointmentSyncService } from '@/lib/appointment-sync';

/**
 * POST /api/appointments/[id]/sync
 * Sincronizar una cita específica con Google Calendar
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = parseInt(params.id);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const result = await appointmentSyncService.syncAppointmentToCalendar(appointmentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        googleEventId: result.googleEventId,
      },
      message: 'Appointment synced successfully',
    });
  } catch (error) {
    console.error('Error syncing appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/appointments/[id]/sync
 * Actualizar una cita sincronizada en Google Calendar
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = parseInt(params.id);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const result = await appointmentSyncService.updateAppointmentInCalendar(appointmentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment updated successfully in calendar',
    });
  } catch (error) {
    console.error('Error updating appointment in calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/[id]/sync
 * Eliminar una cita de Google Calendar
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const appointmentId = parseInt(params.id);
    
    if (isNaN(appointmentId)) {
      return NextResponse.json(
        { error: 'Invalid appointment ID' },
        { status: 400 }
      );
    }

    const result = await appointmentSyncService.deleteAppointmentFromCalendar(appointmentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully from calendar',
    });
  } catch (error) {
    console.error('Error deleting appointment from calendar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}