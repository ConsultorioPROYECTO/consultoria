import { NextRequest } from 'next/server';
import { calendarService, type ExtendedAppointmentData, type ExtendedUpdateData } from '@/services/calendar-service';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.calendarId || !data.appointmentData) {
      return Response.json(
        { error: 'Missing required fields: calendarId and appointmentData' }, 
        { status: 400 }
      );
    }
    
    // Crear cita usando el servicio unificado
    const appointmentData: ExtendedAppointmentData = {
      ...data.appointmentData,
      doctorId: data.doctorId,
      patientId: data.patientId,
      serviceId: data.serviceId,
      isVirtual: data.appointmentData.isVirtual
    };
    
    const result = await calendarService.createAppointment(
      data.calendarId,
      appointmentData
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create appointment');
    }
    
    const appointment = {
      googleEvent: result.googleEvent,
      dbAppointment: result.dbAppointment,
      syncResult: result.syncResult
    };
    
    return Response.json({ success: true, appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return Response.json(
      { error: 'Failed to create appointment' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.calendarId || !data.eventId || !data.updates) {
      return Response.json(
        { error: 'Missing required fields: calendarId, eventId, and updates' }, 
        { status: 400 }
      );
    }
    
    // Actualizar cita usando el servicio unificado
    const updateData: ExtendedUpdateData = {
      ...data.updates,
      appointmentId: data.appointmentId
    };
    
    const result = await calendarService.updateAppointment(
      data.calendarId,
      data.eventId,
      updateData
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update appointment');
    }
    
    const updated = {
      googleEvent: result.googleEvent,
      syncResult: result.syncResult
    };
    
    return Response.json({ success: true, updated });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return Response.json(
      { error: 'Failed to update appointment' }, 
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');
    const eventId = searchParams.get('eventId');
    
    if (!calendarId || !eventId) {
      return Response.json(
        { error: 'Missing required parameters: calendarId and eventId' }, 
        { status: 400 }
      );
    }
    
    // Eliminar cita usando el servicio unificado
    const appointmentId = searchParams.get('appointmentId');
    const appointmentIdNum = appointmentId ? parseInt(appointmentId) : undefined;
    
    const result = await calendarService.deleteAppointment(
      calendarId,
      eventId,
      appointmentIdNum
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete appointment');
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return Response.json(
      { error: 'Failed to delete appointment' }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const calendarId = searchParams.get('calendarId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    if (!calendarId) {
      return Response.json(
        { error: 'Missing required parameter: calendarId' }, 
        { status: 400 }
      );
    }
    
    const dateRange = start && end ? {
      start: new Date(start),
      end: new Date(end)
    } : {
      start: new Date(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días desde hoy
    };
    
    // Obtener eventos usando el servicio unificado
    const result = await calendarService.getConsultorioEvents(calendarId, dateRange);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get events');
    }
    
    const events = result.googleEvent || [];
    
    return Response.json({ success: true, events });
  } catch (error) {
    console.error('Error getting events:', error);
    return Response.json(
      { error: 'Failed to get events' }, 
      { status: 500 }
    );
  }
}