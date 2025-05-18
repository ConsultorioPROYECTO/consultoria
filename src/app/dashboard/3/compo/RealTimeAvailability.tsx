// src/app/dashboard/3/compo/RealTimeAvailability.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Badge } from "@rutas/components/ui/badge";
import { CalendarCheck2 } from "lucide-react";

// Mock data - en una aplicación real, esto vendría de una API o WebSocket
const availabilityData = {
  doctors: [
    {
      id: "doc1",
      name: "Dr. Alan Grant",
      specialty: "Cardiología",
      status: "Disponible", // Disponible, Ocupado, En Cita, Fuera de Línea
      nextAvailable: null,
      location: "Consultorio A"
    },
    {
      id: "doc2",
      name: "Dra. Ellie Sattler",
      specialty: "Pediatría",
      status: "En Cita",
      nextAvailable: "14:30 PM",
      location: "Consultorio B"
    },
    {
      id: "doc3",
      name: "Dr. Ian Malcolm",
      specialty: "General",
      status: "Ocupado", // Ej. en una llamada, revisando expedientes
      nextAvailable: "15:00 PM",
      location: "Teleconsulta"
    },
    {
      id: "doc4",
      name: "Dra. Sarah Harding",
      specialty: "Dermatología",
      status: "Fuera de Línea",
      nextAvailable: "Mañana 09:00 AM",
      location: "-"
    },
  ],
  supportStaff: [
    {
      id: "staff1",
      name: "Laura Palmer",
      role: "Recepción",
      status: "Disponible", // Disponible, Ocupado, En Descanso
      location: "Recepción Principal"
    },
    {
      id: "staff2",
      name: "Dale Cooper",
      role: "Asistente Administrativo",
      status: "Ocupado",
      location: "Oficina"
    },
  ]
};

export function RealTimeAvailability() {
  const getStatusColor = (status: string) => {
    if (status === "Disponible") return "bg-green-500";
    if (status === "En Cita" || status === "Ocupado") return "bg-yellow-500";
    if (status === "Fuera de Línea") return "bg-red-500";
    return "bg-gray-400";
  };

  return (
    <Card className="col-span-1 lg:col-span-2"> {/* Ajustar según layout general */}
      <CardHeader>
        <CardTitle className="flex items-center">
          <CalendarCheck2 className="h-5 w-5 mr-2 text-primary" />
          Disponibilidad en Tiempo Real
        </CardTitle>
        <CardDescription>
          Estado actual de los médicos y personal de soporte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-md font-semibold mb-3 text-foreground">Médicos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availabilityData.doctors.map((doctor) => (
              <div key={doctor.id} className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-foreground">{doctor.name}</p>
                  <Badge variant={doctor.status === "Disponible" ? "default" : "secondary"} 
                         className={`text-xs ${getStatusColor(doctor.status)} text-white`}>
                    {doctor.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                <p className="text-xs text-muted-foreground">Ubicación: {doctor.location}</p>
                {doctor.nextAvailable && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Próx. disponible: {doctor.nextAvailable}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold mb-3 text-foreground">Personal de Soporte</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availabilityData.supportStaff.map((staff) => (
              <div key={staff.id} className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-foreground">{staff.name}</p>
                  <Badge variant={staff.status === "Disponible" ? "default" : "secondary"} 
                         className={`text-xs ${getStatusColor(staff.status)} text-white`}>
                    {staff.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Rol: {staff.role}</p>
                <p className="text-xs text-muted-foreground">Ubicación: {staff.location}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}