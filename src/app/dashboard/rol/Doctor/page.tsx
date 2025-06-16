'use client';

import { useAuth } from "../../../context/AuthContext";
import { useState, useEffect } from "react";

// Componentes específicos del Dashboard Médico
import { DailyAgendaView } from "./compo/DailyAgendaView";

import { TodaysAppointments } from "./compo/TodaysAppointments";
import { NextAppointment } from "./compo/NextAppointment";
import { ConsultationModal } from "./compo/ConsultationModal";
import { MonthlyAppointmentsSummary } from "./compo/MonthlyAppointmentsSummary";
import { getFirebaseAuthToken } from "@rutas/app/lib/firebase/clientUtils";
import { TodayIsDay } from "./compo/TodayIsDay";
import { ImportantNotifications } from "./compo/ImportantNotifications";

// Definir la interfaz Appointment (copia de DailyAgendaView para resolver linter)
interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: string;
  status: string;
}


const fetchAppointments = async () => {
  try {
    const token = await getFirebaseAuthToken();

    if (!token) {
      console.error('No se pudo obtener el token de autenticación.');
      return [];
    }

    const response = await fetch('/api/medicos/dashboard/appointments',{
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });
    
    if (!response.ok) {
      // Manejo específico para diferentes códigos de error
      if (response.status === 403) {
        console.error('Error 403: Acceso denegado. Verifica que tu cuenta tenga el rol de médico asignado.');
        // Podrías mostrar un mensaje al usuario aquí
        return [];
      } else if (response.status === 401) {
        console.error('Error 401: No autorizado. Tu sesión puede haber expirado.');
        return [];
      } else {
        console.error(`Error HTTP ${response.status}: ${response.statusText}`);
      }
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validar que la respuesta sea un array
    if (!Array.isArray(data)) {
      console.warn('La respuesta del API no es un array válido:', data);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    // En lugar de devolver un array vacío, podrías mostrar un mensaje de error al usuario
    return [];
  }
}

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
  const handleStartAppointment = (id: string) => {
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === id ? { ...apt, status: "Llegó" } : apt // Cambiar estado a 'Llegó' para mostrar botón Completada
      )
    );
    console.log(`Iniciar consulta para cita: ${id}, estado cambiado a Llegó`);
  };

  const handleCompleteAppointment = (id: string) => {
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === id ? { ...apt, status: "Completada" } : apt // Cambiar estado a 'Completada'
      )
    );
    console.log(`Cita ${id} marcada como completada.`);
  };

  const handleResetAppointment = (id: string) => {
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === id ? { ...apt, status: "Confirmada" } : apt
      )
    );
    console.log(`Cita ${id} restablecida a Confirmada.`);
  };

  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedConsultationAppointment(appointment);
    setIsConsultationModalOpen(true);
  };

  const handleSaveAndCompleteConsultation = (appointmentId: string, notes: string) => {
    console.log(`Guardando notas para cita ${appointmentId}:`, notes);
    // Actualizar el estado de la cita a "Completada"
    setTodayAppointmentsState(prevState =>
      prevState.map(apt =>
        apt.id === appointmentId ? { ...apt, status: "Completada" } : apt
      )
    );
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
