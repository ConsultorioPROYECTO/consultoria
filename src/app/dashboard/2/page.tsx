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

export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientName, setSelectedPatientName] = useState<string | undefined>(undefined);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  // Funciones para manejar la selección de paciente/cita (simuladas)
  const handleSelectPatientForHistory = (patientId: string, patientName: string) => {
    setSelectedPatientId(patientId);
    setSelectedPatientName(patientName);
    setIsHistoryModalOpen(true);
  };

  const handleSelectAppointmentForNotes = (appointmentId: string, patientName: string) => {
    setSelectedAppointmentId(appointmentId);
    setSelectedPatientId(appointmentId); // Asumimos que la cita tiene un ID de paciente o similar
    setSelectedPatientName(patientName);
  };

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
          <main className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Médico</h1>
              <p className="text-muted-foreground">
                Bienvenido/a, Dr./Dra. {user?.displayName || user?.email}. Gestiona tus citas y pacientes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 @[60rem]:grid-cols-3 @[80rem]:grid-cols-4">
              {/* Columna Principal - Agenda y Notas */}
              <div className="@[60rem]:col-span-2 @[80rem]:col-span-3 space-y-6">
                <DailyAgendaView /> {/* Este componente podría tener props para pasarle handleSelectPatientForHistory y handleSelectAppointmentForNotes */}
                <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
                  <QuickNotes appointmentId={selectedAppointmentId} patientName={selectedPatientName} />
                  <PatientAttendancePatterns patientId={selectedPatientId} patientName={selectedPatientName} />
                </div>
              </div>

              {/* Columna Lateral - Métricas y Sugerencias */}
              <div className="space-y-6 @[60rem]:col-span-1 @[80rem]:col-span-1">
                <PersonalMetrics />
                <SmartSuggestions patientId={selectedPatientId} />
              </div>
            </div>

            {/* Sección Inferior - Planificador, Seguimientos y Mensajería */}
            <div className="grid grid-cols-1 gap-6 @xl:grid-cols-3">
              <div className="@xl:col-span-2">
                <DirectMessagingPanel />
              </div>
              <div className="space-y-6">
                <WeeklyMonthlyPlanner />
                <ProactiveFollowUps />
              </div>
            </div>
            
            {/* Modal de Historial Médico */}
            <PatientHistoryView 
              patientId={selectedPatientId}
              patientName={selectedPatientName}
              isOpen={isHistoryModalOpen}
              onOpenChange={setIsHistoryModalOpen}
            />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
