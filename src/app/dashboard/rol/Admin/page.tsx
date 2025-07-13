'use client';
import { useAuth } from "../../../context/AuthContext";

// Componentes específicos del Dashboard Master
import { FinancialMetrics } from "./_compo/FinancialMetrics";
import { CreateAppointmentCard } from "./_compo/CreateAppointmentCard";
import { ChartBarInteractive } from "./_compo/chart-area-interactive"; 

export default function AdminDashboard() {
  const { user } = useAuth();

  // Obtener y formatear los dos primeros nombres del usuario (primera letra en mayúscula, resto en minúscula)
  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');
  return (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 space-y-6 pb-4 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
            <div  className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
            <p className="text-muted-foreground">
              Visión general y control total de la plataforma Irina.
            </p>
            </div>

            <div className="grid gap-6 lg:grid-rows">
              <ChartBarInteractive />
            </div>
                        {/* Sección de KPIs principales y análisis de negocio */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              <FinancialMetrics />
              <CreateAppointmentCard />
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
  );
}