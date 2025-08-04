'use client';

import { CreatePatientCard } from "./_components/CreatePatientCard";
import { PatientsTable } from "./_components/PatientsTable";
import { PatientsOverview } from "./_components/PatientsOverview";

/**
 * Component that renders the patients tab content
 * Contains patient overview statistics and patient management table
 */
export default function PatientsTabContent() {
  return (
    <div className="h-full flex flex-col gap-6">
      {/* Primera fila: Estadísticas y Acciones Rápidas */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 flex-shrink-0 min-w-0 overflow-x-hidden">
        <div className="min-w-0">
          <PatientsOverview />
        </div>
        <div className="min-w-0">
          <CreatePatientCard />
        </div>
      </div>

      {/* Segunda fila: Tabla de Pacientes */}
      <div className="flex-1 min-h-0">
        <PatientsTable />
      </div>
    </div>
  );
}