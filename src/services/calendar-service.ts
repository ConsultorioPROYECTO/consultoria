// services/calendar-service.ts
import { googleCalendar } from '@/lib/google-calendar';
import { AppointmentData, DateRange, CalendarEvent } from '@/types/calendar';

class CalendarService {
  // Crear calendario para nuevo consultorio
  async createConsultorioCalendar(consultorioData: {
    name: string;
    doctorId: string;
    timezone: string;
  }) {
    const calendar = await googleCalendar.calendar.calendars.insert({
      auth: googleCalendar.auth,
      requestBody: {
        summary: `Consultorio ${consultorioData.name}`,
        timeZone: consultorioData.timezone,
        description: `Calendario de citas para ${consultorioData.name}`
      }
    });
    
    return calendar.data.id;
  }

  // Obtener eventos de un consultorio
  async getConsultorioEvents(calendarId: string, dateRange: DateRange): Promise<CalendarEvent[]> {
    const response = await googleCalendar.calendar.events.list({
      auth: googleCalendar.auth,
      calendarId: calendarId,
      timeMin: dateRange.start.toISOString(),
      timeMax: dateRange.end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items?.map(event => ({
      id: event.id || undefined,
      title: event.summary || '',
      start: new Date(event.start?.dateTime || event.start?.date || ''),
      end: new Date(event.end?.dateTime || event.end?.date || ''),
      description: event.description || undefined,
      // Parsear datos personalizados del description
      patientData: this.parsePatientData(event.description || '')
    })) || [];
  }

  // Crear cita médica
  async createAppointment(calendarId: string, appointmentData: AppointmentData) {
    const event = await googleCalendar.calendar.events.insert({
      auth: googleCalendar.auth,
      calendarId: calendarId,
      requestBody: {
        summary: `${appointmentData.patientName} - ${appointmentData.type}`,
        description: JSON.stringify({
          patient: appointmentData.patientName,
          doctor: appointmentData.doctorName,
          type: appointmentData.type,
          status: appointmentData.status,
          notes: appointmentData.notes
        }),
        start: {
          dateTime: appointmentData.startTime.toISOString(),
          timeZone: 'America/Mexico_City'
        },
        end: {
          dateTime: appointmentData.endTime.toISOString(),
          timeZone: 'America/Mexico_City'
        },
        colorId: this.getColorByType(appointmentData.type)
      }
    });

    return event.data;
  }

  // Actualizar cita
  async updateAppointment(calendarId: string, eventId: string, updates: any) {
    return await googleCalendar.calendar.events.patch({
      auth: googleCalendar.auth,
      calendarId: calendarId,
      eventId: eventId,
      requestBody: updates
    });
  }

  // Eliminar cita
  async deleteAppointment(calendarId: string, eventId: string) {
    return await googleCalendar.calendar.events.delete({
      auth: googleCalendar.auth,
      calendarId: calendarId,
      eventId: eventId
    });
  }

  private parsePatientData(description: string) {
    try {
      return JSON.parse(description);
    } catch {
      return { notes: description };
    }
  }

  private getColorByType(type: string): string {
    const colors: Record<string, string> = {
      'Consulta General': '1',    // Azul
      'Cardiología': '2',         // Verde
      'Dermatología': '3',        // Púrpura
      'Neurología': '4',          // Rosa
      'Ginecología': '5',         // Amarillo
      'Pediatría': '6',           // Naranja
      'Oftalmología': '7',        // Turquesa
    };
    return colors[type] || '1';
  }
}

export const calendarService = new CalendarService();