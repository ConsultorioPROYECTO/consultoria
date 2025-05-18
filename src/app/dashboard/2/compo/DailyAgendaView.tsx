// src/app/dashboard/2/compo/DailyAgendaView.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Badge } from "@rutas/components/ui/badge";
import { Button } from "@rutas/components/ui/button";
import { ClockIcon, UserIcon } from "lucide-react"; // Asumiendo que usas lucide-react para iconos

interface DailyAgendaViewProps {
  onSelectPatient?: (id: string, name: string) => void;
  onSelectAppointment?: (id: string) => void;
}

// Mock data - en una aplicación real, esto vendría de una API
const todayAppointments = [
  { id: "apt1", time: "09:00 AM", patientName: "Elena García", service: "Consulta General", status: "Confirmada" },
  { id: "apt2", time: "09:30 AM", patientName: "Roberto Fernández", service: "Revisión", status: "Pendiente" },
  { id: "apt3", time: "10:00 AM", patientName: "Lucía Martínez", service: "Consulta Especializada", status: "Confirmada" },
  { id: "apt4", time: "11:00 AM", patientName: "Marcos Alonso", service: "Consulta General", status: "Confirmada" },
  { id: "apt5", time: "11:30 AM", patientName: "Sofía Reyes", service: "Vacunación", status: "Llegó" },
  { id: "apt6", time: "12:00 PM", patientName: "Javier Torres", service: "Consulta General", status: "Confirmada" },
];

export function DailyAgendaView({ onSelectPatient, onSelectAppointment }: DailyAgendaViewProps) {
  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handlePatientClick = (id: string, name: string) => {
    onSelectPatient?.(id, name);
  };

  const handleAppointmentClick = (id: string) => {
    onSelectAppointment?.(id);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Agenda del Día</span>
          <Button variant="outline" size="sm">Ver Semana</Button>
        </CardTitle>
        <CardDescription>{currentDate}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[calc(100%-0px)]"> {/* Ajustar altura según necesidad */}
          <div className="p-4 space-y-4">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((apt) => (
                <div key={apt.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-2 text-primary" />
                      <span className="font-semibold text-primary">{apt.time}</span>
                    </div>
                    <Badge 
                      variant={apt.status === "Confirmada" ? "default" : apt.status === "Pendiente" ? "secondary" : "outline"}
                      className={`${apt.status === "Llegó" ? "bg-green-500 text-white" : ""}`}
                    >
                      {apt.status}
                    </Badge>
                  </div>
                  <div className="mb-1 flex items-center">
                    <UserIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-medium text-foreground">{apt.patientName}</p>
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">{apt.service}</p>
                  <div className="mt-3 flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handlePatientClick(apt.id, apt.patientName)}>Ver Historial</Button>
                    <Button size="sm" onClick={() => handleAppointmentClick(apt.id)}>Iniciar Consulta</Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay citas programadas para hoy.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}