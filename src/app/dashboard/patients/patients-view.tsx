'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { UserPlus, Search, Calendar, FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PatientsTable } from "./_components/PatientsTable";
import { PatientsOverview } from "./_components/PatientsOverview";



// Componente de acciones rápidas
function QuickActions() {
  const handleNewPatient = () => {
    // TODO: Implementar modal de nuevo paciente o navegación
    console.log('Registrar nuevo paciente');
  };

  const handleSearchPatient = () => {
    // TODO: Implementar búsqueda avanzada
    console.log('Buscar paciente');
  };

  const handleTodayAppointments = () => {
    // TODO: Navegar a citas del día
    console.log('Ver citas del día');
  };

  const handleExportPatients = () => {
    // TODO: Implementar exportación
    console.log('Exportar lista de pacientes');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button 
          onClick={handleNewPatient}
          className="w-full justify-start" 
          variant="outline"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Registrar Nuevo Paciente
        </Button>
        
        <Button 
          onClick={handleSearchPatient}
          className="w-full justify-start" 
          variant="outline"
        >
          <Search className="mr-2 h-4 w-4" />
          Búsqueda Avanzada
        </Button>
        
        <Button 
          onClick={handleTodayAppointments}
          className="w-full justify-start" 
          variant="outline"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Citas de Hoy
        </Button>
        
        <Button 
          onClick={handleExportPatients}
          className="w-full justify-start" 
          variant="outline"
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportar Lista
        </Button>
      </CardContent>
    </Card>
  );
}

export default function PatientsView() {
  const { user } = useAuth();
  
  // Obtener y formatear los dos primeros nombres del usuario
  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');

  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Hola, {displayTwoNames}
        </h1>
        <p className="text-muted-foreground">
          Gestión completa de pacientes y su información médica.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/* Primera fila: Estadísticas y Acciones Rápidas */}
        <div className="grid gap-6 lg:grid-cols-2">
          <PatientsOverview />
          <QuickActions />
        </div>

        {/* Segunda fila: Tabla de Pacientes */}
        <div className="grid gap-6">
          <PatientsTable />
        </div>
      </div>
    </div>
  );
}