'use client';
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar";
import { SiteHeader } from "@rutas/app/dashboard/com/site-header"; // Importación añadida
import { useAuth } from "../../context/AuthContext"; // Importación añadida
import { useRouter } from "next/navigation"; // Importación añadida
import { useEffect } from "react"; // Importación añadida

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












export default function Page() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>; // O un componente de carga más sofisticado
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
  )
}
