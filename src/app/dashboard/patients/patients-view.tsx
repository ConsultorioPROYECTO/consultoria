'use client';

import { CreatePatientModal } from "./_components/CreatePatientModal";
import { useAuth } from "../../context/AuthContext";
import { PatientsTable } from "./_components/PatientsTable";
import { PatientsOverview } from "./_components/PatientsOverview";




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
          <CreatePatientModal />
        </div>

        {/* Segunda fila: Tabla de Pacientes */}
        <div className="grid gap-6">
          <PatientsTable />
        </div>
      </div>
    </div>
  );
}