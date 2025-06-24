'use client';

import { StaffManagement } from "../rol/Admin/compo/StaffManagement";
import { ServiceSpecialtyConfig } from "../rol/Admin/compo/ServiceSpecialtyConfig";
import { AddStaffForm } from "../rol/Admin/compo/AddStaffForm";

export default function OrganizationConfigView() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, Bienvenido</h1>
        <p className="text-muted-foreground">
          Visión general y control total de la plataforma Irina.
        </p>
      </div>

      {/* Sección de Gestión y Configuración */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* <AIResponseConfig /> */}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
        <StaffManagement />
        {/* <WorkloadOverview /> */}
        <ServiceSpecialtyConfig />
      </div>

      {/* Formulario de Agregar Personal */}
      <div className="grid gap-6">
        <AddStaffForm onAddStaff={() => {}} />
        <StaffManagement />
      </div>
    </div>
  );
}