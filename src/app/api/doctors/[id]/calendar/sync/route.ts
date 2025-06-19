// src/app/api/doctors/[id]/calendar/sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { appointmentSyncService } from '@/lib/appointment-sync';

/**
 * POST /api/doctors/[id]/calendar/sync
 * Sincronizar todas las citas pendientes de un doctor
 */
export async function POST(
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

    const result = await appointmentSyncService.syncDoctorPendingAppointments(doctorId);

    return NextResponse.json({
      success: result.success,
      data: {
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Error syncing doctor appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}