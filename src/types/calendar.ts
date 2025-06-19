// types/calendar.ts
export interface ConsultorioCalendar {
    id: string;                    // ID del calendario en Google
    consultorioId: string;         // ID interno de tu sistema
    name: string;                  // "Consultorio Dr. García"
    doctorId: string;              // ID del doctor
    timezone: string;              // "America/Mexico_City"
  }
  
  // Ejemplo de estructura:
  // Consultorio 1: calendar-consultorio-garcia@tu-dominio.com
  // Consultorio 2: calendar-consultorio-lopez@tu-dominio.com
  
  export interface AppointmentData {
    patientName: string;
    doctorName: string;
    type: string;
    startTime: Date;
    endTime: Date;
    status: string;
    notes?: string;
  }
  
  export interface DateRange {
    start: Date;
    end: Date;
  }
  
  export interface PatientData {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    type?: string;
    status?: string;
  }
  
  export interface CalendarEvent {
    id?: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    patientData?: PatientData;
  }