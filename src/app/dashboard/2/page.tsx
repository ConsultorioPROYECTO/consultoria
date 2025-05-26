'use client';
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar";
import { SiteHeader } from "@rutas/app/dashboard/com/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UiScreen from '@rutas/components/uiscreen';
import WaveformLoader from '@rutas/components/custom/WaveformLoader';

// Componentes específicos del Dashboard Médico
import { DailyAgendaView } from "./compo/DailyAgendaView";
import { PatientHistoryView } from "./compo/PatientHistoryView";
import { QuickNotes } from "./compo/QuickNotes";
import { PatientAttendancePatterns } from "./compo/PatientAttendancePatterns";
import { ProactiveFollowUps } from "./compo/ProactiveFollowUps";
import { DirectMessagingPanel } from "./compo/DirectMessagingPanel";
import { WeeklyMonthlyPlanner } from "./compo/WeeklyMonthlyPlanner";
import { PersonalMetrics } from "./compo/PersonalMetrics";
import { SmartSuggestions } from "./compo/SmartSuggestions";
import { TodaysAppointments } from "./compo/TodaysAppointments";
import { NextAppointment } from "./compo/NextAppointment";
import { ConsultationModal } from "./compo/ConsultationModal";
import { getFirebaseAuthToken } from "@rutas/app/lib/firebase/clientUtils";
import { FetchRolUser } from "../page";

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
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | undefined>(undefined);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [todayAppointmentsState, setTodayAppointmentsState] = useState<Appointment[]>([]);
  const [selectedConsultationAppointment, setSelectedConsultationAppointment] = useState<Appointment | null>(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [appointmentsLoaded, setAppointmentsLoaded] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

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

  const handleSelectPatient = (id: string, name: string) => {
    setSelectedPatientId(id);
    setSelectedPatientName(name);
    setIsHistoryModalOpen(true);
  };

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

  useEffect(() => {
    const verifyRole = async () => {
      if (!loading && user) {
        try {
          const token = await getFirebaseAuthToken();
          if (!token) {
            router.push('/login');
            return;
          }
          const response = await fetch('/api/users/rol', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error('Error al obtener el rol');
          }
          const data: FetchRolUser = await response.json();
          const rol = data.role;
          if (rol === 'medico') {
            setCheckingRole(false);
          } else if (rol === 'admin') {
            router.push('/dashboard/1');
            return;
          } else if (rol === 'asistente') {
            router.push('/dashboard/3');
            return;
          } else if (rol === 'N/A') {
            router.push('/onboard');
            return;
          } else {
            router.push('/login');
            return;
          }
        } catch (error) {
          console.error('Error al verificar el rol:', error);
          // Solo redirigir si el usuario sigue autenticado
          if (!loading && user) {
            router.push('/login');
          }
        }
      }
    };
    verifyRole();
  }, [user, loading, router]);

  useEffect(() => {
    const loadAppointments = async () => {
      if (user && !loading && !appointmentsLoaded && !checkingRole) {
        const appointments = await fetchAppointments();
        setTodayAppointmentsState(appointments);
        setAppointmentsLoaded(true);
      }
    };
    loadAppointments();
  }, [user, loading, appointmentsLoaded, checkingRole]);

  if (loading || !user || !appointmentsLoaded || checkingRole) {
    return (
      <UiScreen className="flex h-screen flex-col items-center justify-center ">
        <p className="font-bold text-muted-foreground text-2xl text-center">Preparando<br/>tu<br/>espacio</p>
        <WaveformLoader className="mt-4 w-30 h-auto text-muted-foreground" />
      </UiScreen>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
            <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
              <p className="text-muted-foreground">
                {timeBasedPhrase}
              </p>
            </div>

            {/* Reestructurar la grilla principal */}
            {/* Nueva fila/sección para Contador de Citas y Próxima Cita */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-col-2 xl:grid-cols-6 gap-6 mb-6"> {/* Contenedor Grid para 4 columnas y espaciado */} 

                <TodaysAppointments appointmentCount={todayAppointmentsState.length} /> {/* Ocupa la primera columna */}

                <NextAppointment appointments={todayAppointmentsState} className="col-span-2" /> {/* Ocupa dos columnas */}

                {/* Las columnas 3 y 4 quedan vacías */}
            </div>

            {/* Grilla principal para el resto del contenido */}
            <div className="grid grid-cols-1 gap-6 @[60rem]:grid-cols-3 @[80rem]:grid-cols-4"> {/* Mantener la grilla principal para el resto */}

              {/* Primera fila de esta grilla principal: Agenda del Día */}
              <div className="col-span-1 @[60rem]:col-span-3 @[80rem]:col-span-4 space-y-6 relative"> {/* DailyAgendaView ocupa todo el ancho de esta grilla */}
                <DailyAgendaView 
                  todayAppointments={todayAppointmentsState} 
                  onSelectPatient={handleSelectPatient} 
                  onSelectAppointment={handleSelectAppointment}
                  onStartAppointment={handleStartAppointment} 
                  onCompleteAppointment={handleCompleteAppointment} 
                  onResetAppointment={handleResetAppointment}
                  onStartConsultation={handleStartConsultation}
                />
              </div>

              {/* Segunda fila de esta grilla principal: Notas Rápidas, Patrones, Métricas y Sugerencias */}
              {/* Usar una grilla anidada para la distribución interna de esta fila */}
              <div className="col-span-1 @[60rem]:col-span-3 @[80rem]:col-span-4 grid grid-cols-1 gap-6 @[60rem]:grid-cols-3 @[80rem]:grid-cols-4 mt-6"> {/* Contenedor para la segunda fila de esta grilla */}
                 {/* Columna izquierda (Notas Rápidas y Patrones) */}
                <div className="@[60rem]:col-span-2 @[80rem]:col-span-3 space-y-6 relative">
                  <QuickNotes appointmentId={selectedAppointmentId} patientName={selectedPatientName} />
                  <PatientAttendancePatterns patientId={selectedPatientId} patientName={selectedPatientName} />
                </div>

                 {/* Columna derecha (Métricas y Sugerencias) */}
                <div className="space-y-6 @[60rem]:col-span-1 @[80rem]:col-span-1 relative">
                   <PersonalMetrics />
                  <SmartSuggestions patientId={selectedPatientId} />
                </div>
              </div>
            </div>

            {/* Sección Inferior (Planificador, Seguimientos, Mensajería) - Ocupa todo el ancho debajo */}
             <div className="grid grid-cols-1 gap-6 @xl:grid-cols-3 mt-6"> {/* Reutilizar la estructura de la sección inferior */}
                <div className="@xl:col-span-2">
                  <DirectMessagingPanel />
                </div>
                <div className="space-y-6">
                  <WeeklyMonthlyPlanner />
                  <ProactiveFollowUps />
                </div>
              </div>
            
            <PatientHistoryView 
              patientId={selectedPatientId}
              patientName={selectedPatientName}
              isOpen={isHistoryModalOpen}
              onOpenChange={setIsHistoryModalOpen}
            />

            <ConsultationModal
              appointment={selectedConsultationAppointment}
              isOpen={isConsultationModalOpen}
              onOpenChange={setIsConsultationModalOpen}
              onSaveAndComplete={handleSaveAndCompleteConsultation}
            />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
