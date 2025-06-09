import { calendarService } from '@/services/calendar-service';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.calendarId || !data.appointmentData) {
      return Response.json(
        { error: 'Missing required fields: calendarId and appointmentData' }, 
        { status: 400 }
      );
    }
    
    const appointment = await calendarService.createAppointment(
      data.calendarId,
      data.appointmentData
    );
    
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
    
    const updated = await calendarService.updateAppointment(
      data.calendarId,
      data.eventId,
      data.updates
    );
    
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
    
    await calendarService.deleteAppointment(calendarId, eventId);
    
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
    
    const events = await calendarService.getConsultorioEvents(calendarId, dateRange);
    
    return Response.json({ success: true, events });
  } catch (error) {
    console.error('Error getting events:', error);
    return Response.json(
      { error: 'Failed to get events' }, 
      { status: 500 }
    );
  }
}