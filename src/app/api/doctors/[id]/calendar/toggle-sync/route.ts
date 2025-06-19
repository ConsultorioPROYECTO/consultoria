// src/app/api/doctors/[id]/calendar/toggle-sync/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { doctorCalendarService } from '@/lib/doctor-calendar';
import { onCalendarSyncEnabled } from '@/lib/hooks/calendar-hooks';

/**
 * PUT /api/doctors/[id]/calendar/toggle-sync
 * Habilitar/deshabilitar sincronización de calendario para un doctor
 */
export async function PUT(
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

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled field must be a boolean' },
        { status: 400 }
      );
    }

    const result = await doctorCalendarService.toggleCalendarSync(doctorId, enabled);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Si se habilitó la sincronización, sincronizar citas pendientes
    let syncResult = null;
    if (enabled) {
      syncResult = await onCalendarSyncEnabled(doctorId);
    }

    return NextResponse.json({
      success: true,
      message: `Calendar sync ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: syncResult ? {
        syncedCount: syncResult.syncedCount,
        failedCount: syncResult.failedCount,
        errors: syncResult.errors,
      } : null,
    });
  } catch (error) {
    console.error('Error toggling calendar sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}