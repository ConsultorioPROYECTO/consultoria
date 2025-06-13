'use client';
import { AppSidebar } from "@rutas/app/dashboard/com/app-sidebar";
import { SiteHeader } from "@rutas/app/dashboard/com/site-header"; // Importación añadida
import { useAuth } from "../../context/AuthContext"; // Importación añadida
import { useRouter } from "next/navigation"; // Importación añadida
import { useEffect, useState } from "react"; // Importación añadida/modificada
import { LoadingScreen } from '../com/loadingScreen';
import {
  SidebarInset,
  SidebarProvider,
} from "@rutas/components/ui/sidebar";

// Componentes específicos del Dashboard Master
import { BusinessAnalytics } from "./compo/BusinessAnalytics";
import { FinancialMetrics } from "./compo/FinancialMetrics";
import { WorkloadOverview } from "./compo/WorkloadOverview";
import { AIPerformancePanel } from "./compo/AIPerformancePanel";


export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);

  // Obtener y formatear los dos primeros nombres del usuario (primera letra en mayúscula, resto en minúscula)
  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');

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
      <LoadingScreen />
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
            <div  className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
            <p className="text-muted-foreground">
              Visión general y control total de la plataforma Irina.
            </p>
            </div>

            {/* Sección de KPIs principales y análisis de negocio */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <BusinessAnalytics />
              <FinancialMetrics />
              <AIPerformancePanel />
            </div>
            
            
            <div className="grid gap-6 lg:grid-cols-2">
              <WorkloadOverview />
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