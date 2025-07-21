'use client';

import { StaffManagement } from "./_compo/StaffManagement";
import { CreateInvitationCard } from "./_compo/CreateInvitationCard";
import { ServiceManagement } from "./_compo/ServiceManagementCard";
import { useAuth } from "../../context/AuthContext";

export default function OrganizationConfigView() {
  const { user } = useAuth();
  // Obtener y formatear los dos primeros nombres del usuario (primera letra en mayúscula, resto en minúscula)
  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');
  return (
    <div className="flex-1 overflow-auto">
      <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
        <p className="text-muted-foreground">
          Visión general y control total de la plataforma Irina.
        </p>
      </div>
      
      <div className="grid gap-6">
        {/*  */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ServiceManagement />
          <CreateInvitationCard />
        </div>

        {/*  */}
        <div className="grid gap-6">
          <StaffManagement />
        </div>
      </div>
    </div>
  );
}