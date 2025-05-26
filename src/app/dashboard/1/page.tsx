'use client';
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar";
import { SiteHeader } from "@rutas/app/dashboard/com/site-header"; // Importación añadida
import { useAuth } from "../../context/AuthContext"; // Importación añadida
import { useRouter } from "next/navigation"; // Importación añadida
import { useEffect, useState } from "react"; // Importación añadida/modificada

import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar";

// Componentes específicos del Dashboard Master
import { BusinessAnalytics } from "./compo/BusinessAnalytics";
import { StaffManagement } from "./compo/StaffManagement";
import { FinancialMetrics } from "./compo/FinancialMetrics";
import { AIResponseConfig } from "./compo/AIResponseConfig";
import { WorkloadOverview } from "./compo/WorkloadOverview";
import { ServiceSpecialtyConfig } from "./compo/ServiceSpecialtyConfig";
import { AIPerformancePanel } from "./compo/AIPerformancePanel";
import UiScreen from "@rutas/components/uiscreen";
import WaveformLoader from "@rutas/components/custom/WaveformLoader";


export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    async function checkRole() {
      if (!loading && user) {
        try {
          const token = await user.getIdToken ? await user.getIdToken() : null;
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
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          const data = await response.json();
          if (!data || data.role !== 'admin') {
            // Si no es admin, no renderiza y espera redirección
            if (data && data.role === 'N/A') {
              router.push('/onboard');
            } else if (data && data.role === 'medico') {
              router.push('/dashboard/2');
            } else if (data && data.role === 'asistente') {
              router.push('/dashboard/3');
            } else {
              router.push('/login');
            }
            return;
          }
        } catch (error) {
          console.error('Error fetching role:', error);
          // Si hay error, redirige a login
          router.push('/login');
          return;
        }
      }
      setCheckingRole(false);
    }
    checkRole();
  }, [user, loading, router]);

  if (loading || !user || checkingRole) {
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
          <main className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Administrador (Master)</h1>
            <p className="text-muted-foreground">
              Visión general y control total de la plataforma Irina.
            </p>

            {/* Sección de KPIs principales y análisis de negocio */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <BusinessAnalytics />
              <FinancialMetrics />
              <AIPerformancePanel />
            </div>

            {/* Sección de Gestión y Configuración */}
            <div className="grid gap-6 lg:grid-cols-2">
              <StaffManagement />
              <AIResponseConfig />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <WorkloadOverview />
              <ServiceSpecialtyConfig />
            </div>
            
            {/* Podrías agregar más secciones aquí según sea necesario */}
            {/* Ejemplo: 
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Logs o eventos importantes del sistema...</p>
              </CardContent>
            </Card>
            */}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}