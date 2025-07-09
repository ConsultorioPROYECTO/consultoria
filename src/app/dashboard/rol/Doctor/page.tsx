'use client';

import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect } from "react";
import { DateTime } from 'luxon';

// Componentes específicos del Dashboard Médico
import { DailyAgendaView } from "./compo/DailyAgendaView";
import { TodaysAppointments } from "./compo/TodaysAppointments";
import { NextAppointment } from "./compo/NextAppointment";
import { ConsultationModal } from "./compo/ConsultationModal";
import { MonthlyAppointmentsSummary } from "./compo/MonthlyAppointmentsSummary";
import { TodayIsDay } from "./compo/TodayIsDay";
import { ImportantNotifications } from "./compo/ImportantNotifications";

// Tipos de datos para eventos de calendario
import { AppointmentEventData, BreakTimeEventData } from "@/types/google-calendar";

type CalendarEvent = AppointmentEventData | BreakTimeEventData;

// Importar tipos de la base de datos
import { Appointment } from "@/db/schema";

// Tipo específico para el modal de consulta (debe coincidir con ConsultationModal.tsx)
type ConsultationAppointment = Omit<Appointment, 'patientId' | 'serviceId'> & {
  time: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  service: {
    id: number;
    name: string;
    description?: string;
  };
};

export default function DoctorDashboard() {
  const { user, doctorId } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedConsultationAppointment] = useState<ConsultationAppointment | null>(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const pendingAppointmentsCount = calendarEvents.filter(event => 'appointmentStatus' in event && event.appointmentStatus !== 'Completada').length;

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
      <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
        <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
          <p className="text-muted-foreground">{timeBasedPhrase}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1"><TodayIsDay /></div>
              <div className="col-span-1"><TodaysAppointments appointmentCount={isLoading ? 0 : calendarEvents.length} /></div>
            </div>
            <div>
               <DailyAgendaView calendarEvents={isLoading ? [] : calendarEvents} />
             </div>
           </div>

           <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
             <NextAppointment calendarEvents={isLoading ? [] : calendarEvents} />
            <MonthlyAppointmentsSummary pendingAppointments={isLoading ? 0 : pendingAppointmentsCount} />
            <div className="hidden sm:block"><ImportantNotifications /></div>
            <div className="block sm:hidden"><ImportantNotifications /></div>
          </div>
        </div>

        <ConsultationModal
          appointment={selectedConsultationAppointment}
          isOpen={isConsultationModalOpen}
          onOpenChange={setIsConsultationModalOpen}
          onSaveAndComplete={() => {
            // Lógica de guardado
          }}
        />
      </main>
    </div>
  );
}