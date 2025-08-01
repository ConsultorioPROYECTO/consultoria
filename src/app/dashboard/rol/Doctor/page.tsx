'use client';

import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect } from "react";
import { DateTime } from 'luxon';

// Componentes específicos del Dashboard Médico
import { DailyAgendaView } from "./_compo/DailyAgendaView";
import { TodaysAppointments } from "./_compo/TodaysAppointments";
import { NextAppointment } from "./_compo/NextAppointment";
import { MedicalConsultationWorkspace } from "./_compo/MedicalConsultationWorkspace";
import { MonthlyAppointmentsSummary } from "./_compo/MonthlyAppointmentsSummary";
import { TodayIsDay } from "./_compo/TodayIsDay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';

// Tipos de datos para eventos de calendario
import { AppointmentEventData, BreakTimeEventData } from "@/types/google-calendar";

// Tipo combinado para el estado
type CalendarEvent = AppointmentEventData | BreakTimeEventData;

// Tipo específico para el workspace de consulta médica (DEBE COINCIDIR CON EL ESPERADO POR EL WORKSPACE)
type ConsultationAppointment = {
  id: number;
  google_event_id: string;
  google_calendar_id: string;
  doctorId: number;
  organizationId: number;
  time: string;
  status: string;
  patient: { 
    // Corregido para coincidir con el workspace
    firstName: string; 
    lastName: string; 
  };
  service: { id: number; name: string; description?: string; };
  createdAt: Date;
  updatedAt: Date;
  // Campos requeridos por el workspace para sincronización
  sync_status: 'synced' | 'not_synced' | 'error';
  last_sync_attempt: Date | null;
  sync_error: string | null;
};

export default function DoctorDashboard() {
  const { user, doctorId } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsultationAppointment, setSelectedConsultationAppointment] = useState<ConsultationAppointment | null>(null);
  const [isMedicalWorkspaceOpen, setIsMedicalWorkspaceOpen] = useState(false);

  const pendingAppointmentsCount = calendarEvents.filter(event => 'appointmentStatus' in event && event.appointmentStatus !== 'Completada').length;

  const handleStartConsultation = (appointment: AppointmentEventData) => {
    if (!doctorId || !appointment.id || !appointment.patientId || !appointment.serviceId) {
      console.error("Datos insuficientes en el evento para iniciar la consulta.", appointment);
      setError("No se puede iniciar la consulta, faltan datos clave en el evento.");
      return;
    }

    const summaryMatch = appointment.summary.match(/Cita con (.*) - (.*)/);
    const patientFullName = summaryMatch ? summaryMatch[1].trim() : 'Paciente Desconocido';
    const serviceName = summaryMatch ? summaryMatch[2].trim() : 'Servicio Desconocido';

    // Dividir el nombre completo en nombre y apellido
    const nameParts = patientFullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const startDateTime = typeof appointment.startDateTime === 'string'
      ? DateTime.fromISO(appointment.startDateTime)
      : appointment.startDateTime;

    const consultationAppointment: ConsultationAppointment = {
      id: 0, 
      google_event_id: appointment.id,
      google_calendar_id: appointment.calendarId,
      doctorId: doctorId,
      organizationId: appointment.organizationId,
      time: startDateTime.toFormat('HH:mm'),
      status: appointment.appointmentStatus,
      patient: {
        // Corregido para usar firstName y lastName
        firstName: firstName,
        lastName: lastName,
      },
      service: {
        id: appointment.serviceId,
        name: serviceName,
        description: appointment.description || '',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      sync_status: 'not_synced',
      last_sync_attempt: null,
      sync_error: null,
    };
    
    setSelectedConsultationAppointment(consultationAppointment);
    setIsMedicalWorkspaceOpen(true);
  };

  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');

  const now = new Date();
  const hour = now.getHours();
  let timeBasedPhrase = "";

  if (hour < 12) {
    timeBasedPhrase = "¡Que tengas un productivo día!";
  } else if (hour < 18) {
    timeBasedPhrase = "Continúa con éxito tus consultas de hoy.";
  } else {
    timeBasedPhrase = "Excelente jornada de trabajo. ¡Momento de descansar!";
  }

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!user || !doctorId) return;

      setIsLoading(true);
      setError(null);

      try {
        const startDate = DateTime.now().toISODate();
        const endDate = DateTime.now().plus({ days: 7 }).toISODate();

        const eventsResponse = await fetch(`/api/doctors/${doctorId}/calendar/events?startDate=${startDate}&endDate=${endDate}`);
        
        if (!eventsResponse.ok) throw new Error('Error fetching calendar events');

        const data = await eventsResponse.json();
        setCalendarEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarEvents();
  }, [user, doctorId]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
        <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
          <p className="text-muted-foreground">{timeBasedPhrase}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1"><TodayIsDay /></div>
              <div className="col-span-1"><TodaysAppointments appointmentCount={isLoading ? 0 : calendarEvents.length} /></div>
            </div>
            <div>
               <DailyAgendaView 
                 calendarEvents={isLoading ? [] : calendarEvents} 
                 onStartConsultation={handleStartConsultation}
               />
             </div>
           </div>

           <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
             <NextAppointment calendarEvents={isLoading ? [] : calendarEvents} />
            <MonthlyAppointmentsSummary pendingAppointments={isLoading ? 0 : pendingAppointmentsCount} />
          </div>
        </div>

        <MedicalConsultationWorkspace
          appointment={selectedConsultationAppointment}
          isOpen={isMedicalWorkspaceOpen}
           onOpenChange={setIsMedicalWorkspaceOpen}
          onSaveAndComplete={() => {
            // Lógica de guardado
          }}
        />
      </main>
    </div>
  );
}
