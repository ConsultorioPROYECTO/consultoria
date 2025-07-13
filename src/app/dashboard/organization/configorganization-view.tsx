'use client';

import { StaffManagement } from "../rol/Admin/_compo/StaffManagement";
import { CreateInvitationCard } from "../rol/Admin/_compo/CreateInvitationCard";
import { ServiceManagement } from "../rol/Admin/_compo/ServiceManagement";

export default function OrganizationConfigView() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, Bienvenido</h1>
        <p className="text-muted-foreground">
          Visión general y control total de la plataforma Irina.
        </p>
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2 lg:col-span-2">
        {/* <WorkloadOverview /> */}
        <ServiceManagement />
        <CreateInvitationCard />
      </div>

      {/* Formulario de Agregar Personal */}
      <div className="grid gap-6">
        <StaffManagement />
      </div>
    </div>
  );
}