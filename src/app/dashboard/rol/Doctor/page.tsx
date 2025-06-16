'use client';

import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect } from "react";

// Componentes específicos del Dashboard Médico
import { DailyAgendaView } from "./compo/DailyAgendaView";
import { TodaysAppointments } from "./compo/TodaysAppointments";
import { NextAppointment } from "./compo/NextAppointment";
import { ConsultationModal } from "./compo/ConsultationModal";
import { MonthlyAppointmentsSummary } from "./compo/MonthlyAppointmentsSummary";
import { TodayIsDay } from "./compo/TodayIsDay";
import { ImportantNotifications } from "./compo/ImportantNotifications";

// Importar el nuevo servicio de data fetching
import { 
  fetchAppointments, 
  updateAppointmentStatus,
  type Appointment 
} from "../../lib/appointmentsService";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [, setSelectedAppointmentId] = useState<string | null>(null);
  const [todayAppointmentsState, setTodayAppointmentsState] = useState<Appointment[]>([]);
  const [selectedConsultationAppointment, setSelectedConsultationAppointment] = useState<Appointment | null>(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

  const pendingAppointmentsCount = todayAppointmentsState.filter(apt => apt.status !== 'Completada').length;

  // Obtener y formatear los dos primeros nombres del usuario (primera letra en mayúscula, resto en minúscula)
  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');

  // Lógica para determinar la frase según la hora del día
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

  const handleSelectAppointment = (id: string) => {
    setSelectedAppointmentId(id);
  };

  // Funciones para manejar el estado de las citas
  const handleStartAppointment = async (id: string) => {
    // Actualizar estado local inmediatamente para mejor UX
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === id ? { ...apt, status: "Llegó" } : apt
      )
    );
    
    // Actualizar en el servidor
    const success = await updateAppointmentStatus(id, "Llegó");
    if (!success) {
      // Revertir cambio local si falla la actualización
      setTodayAppointmentsState(prevState =>
        prevState.map(apt =>
          apt.id === id ? { ...apt, status: "Confirmada" } : apt
        )
      );
    }
  };

  const handleCompleteAppointment = async (id: string) => {
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === id ? { ...apt, status: "Completada" } : apt
      )
    );
    
    const success = await updateAppointmentStatus(id, "Completada");
    if (!success) {
      setTodayAppointmentsState(prevState =>
        prevState.map(apt =>
          apt.id === id ? { ...apt, status: "Llegó" } : apt
        )
      );
    }
  };

  const handleResetAppointment = async (id: string) => {
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === id ? { ...apt, status: "Confirmada" } : apt
      )
    );
    
    const success = await updateAppointmentStatus(id, "Confirmada");
    if (!success) {
      // En caso de error, recargar las citas
      const appointments = await fetchAppointments();
      setTodayAppointmentsState(appointments);
    }
  };

  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedConsultationAppointment(appointment);
    setIsConsultationModalOpen(true);
  };

  const handleSaveAndCompleteConsultation = async (appointmentId: string, notes: string) => {
    // Actualizar el estado de la cita a "Completada"
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === appointmentId ? { ...apt, status: "Completada", notes } : apt
      )
    );
    
    // Actualizar en el servidor
    const success = await updateAppointmentStatus(appointmentId, "Completada");
    if (!success) {
      // Revertir cambio si falla
      setTodayAppointmentsState(prevState =>
        prevState.map(apt =>
          apt.id === appointmentId ? { ...apt, status: "Llegó", notes: undefined } : apt
        )
      );
    }
    
    // Cerrar el modal
    setIsConsultationModalOpen(false);
    setSelectedConsultationAppointment(null);
  };

  // Cargar citas al montar el componente
  useEffect(() => {
    const loadAppointments = async () => {
      if (user) {
        const appointments = await fetchAppointments();
        setTodayAppointmentsState(appointments);
      }
    };
    loadAppointments();
  }, [user]);

  return (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
            <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
              <p className="text-muted-foreground">
                {timeBasedPhrase}
              </p>
            </div>
            {/* Reestructurar la grilla principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 "> {/* Cambiar a 3 columnas en lg */}
                <div className="col-span-1"> {/* Hoy es */}
                  <TodayIsDay />
                </div>
                <div className="col-span-1"> {/* Hoy tienes */}
                  <TodaysAppointments appointmentCount={todayAppointmentsState.length} />
                </div>
                <div className="col-span-1 sm:col-span-2 lg:col-span-1 lg:row-span-2 flex flex-col gap-4"> {/* Tu próxima cita - ocupa 1 columna y 2 filas en lg, 2 columnas en sm y 1 en xs */}
                  <NextAppointment appointments={todayAppointmentsState} />
                  <MonthlyAppointmentsSummary pendingAppointments={pendingAppointmentsCount} />
                  <div className="hidden sm:block">
                    <ImportantNotifications />
                  </div>
                </div>
                <div className="col-span-full sm:col-span-2 lg:col-span-2 flex flex-col gap-4"> {/* Agenda del Día - ocupa todo el ancho en xs, 2 columnas en sm y lg */}
                  <DailyAgendaView
                    todayAppointments={todayAppointmentsState}
                    // onSelectPatient={handleSelectPatient}
                    onSelectAppointment={handleSelectAppointment}
                    onStartAppointment={handleStartAppointment}
                    onCompleteAppointment={handleCompleteAppointment}
                    onResetAppointment={handleResetAppointment}
                    onStartConsultation={handleStartConsultation}
                  />
                  <div className="block sm:hidden">
                    <ImportantNotifications />
                  </div>
                </div>
            </div>
            <ConsultationModal
              appointment={selectedConsultationAppointment}
              isOpen={isConsultationModalOpen}
              onOpenChange={setIsConsultationModalOpen}
              onSaveAndComplete={handleSaveAndCompleteConsultation}
            />
          </main>
        </div>
  )
}
