'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { Badge } from "@rutas/components/ui/badge";
import { Users, UserPlus, Search, Calendar, FileText, TrendingUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePatientsOnly } from "@/hooks/useDashboardOptimized";
import { PatientsTable } from "./_components/PatientsTable";
import { useMemo } from "react";

// Componente de estadísticas de pacientes
function PatientsOverview() {
  const { patients, isLoading } = usePatientsOnly();

  const stats = useMemo(() => {
    if (!patients.length) {
      return {
        total: 0,
        active: 0,
        male: 0,
        female: 0,
        other: 0,
        thisMonth: 0
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      total: patients.length,
      active: patients.filter(p => p.isActive).length,
      male: patients.filter(p => p.gender === 'M').length,
      female: patients.filter(p => p.gender === 'F').length,
      other: patients.filter(p => p.gender === 'Other').length,
      thisMonth: patients.filter(p => {
        const patientDate = new Date(p.dateOfBirth);
        return patientDate.getMonth() === currentMonth && patientDate.getFullYear() === currentYear;
      }).length
    };
  }, [patients]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen de Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Resumen de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <Badge variant="secondary">{stats.total}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Activos</span>
              <Badge variant="default">{stats.active}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Masculino</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">{stats.male}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Femenino</span>
              <Badge variant="outline" className="bg-pink-100 text-pink-800">{stats.female}</Badge>
            </div>
          </div>
        </div>
        
        {stats.other > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Otro género</span>
            <Badge variant="outline">{stats.other}</Badge>
          </div>
        )}
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-sm text-muted-foreground">
            {stats.active} pacientes activos en el sistema
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

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