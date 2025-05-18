// src/app/dashboard/2/compo/ProactiveFollowUps.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { BellRing, CalendarPlus } from "lucide-react";
import { ScrollArea } from "@rutas/components/ui/scroll-area";

// Mock data - en una aplicación real, esto vendría de una API
const followUpReminders = [
  {
    id: "fu1",
    patientName: "Carlos Santana",
    reason: "Control post-operatorio (Rodilla)",
    dueDate: "2024-08-15",
    status: "Pendiente",
  },
  {
    id: "fu2",
    patientName: "Laura Vargas",
    reason: "Seguimiento de tratamiento (Hipertensión)",
    dueDate: "2024-08-20",
    status: "Programado",
  },
  {
    id: "fu3",
    patientName: "Pedro Jiménez",
    reason: "Resultados de laboratorio (Análisis anual)",
    dueDate: "2024-08-10",
    status: "Contactado",
  },
  {
    id: "fu4",
    patientName: "Ana Morales",
    reason: "Vacuna de refuerzo",
    dueDate: "2024-09-01",
    status: "Pendiente",
  },
];

export function ProactiveFollowUps() {
  // Lógica para gestionar seguimientos (marcar como hecho, reprogramar, etc.)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BellRing className="h-5 w-5 mr-2 text-primary" />
          Recordatorios de Seguimiento Proactivo
        </CardTitle>
        <CardDescription>
          Pacientes que requieren atención o contacto de seguimiento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {followUpReminders.length > 0 ? (
          <ScrollArea className="h-[250px]"> {/* Altura ajustable */}
            <div className="space-y-3 pr-3">
              {followUpReminders.map((followUp) => (
                <div key={followUp.id} className="p-3 border rounded-md bg-card hover:shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-foreground">{followUp.patientName}</p>
                      <p className="text-xs text-muted-foreground">{followUp.reason}</p>
                    </div>
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${followUp.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : followUp.status === 'Programado' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {followUp.status}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      Vence: {new Date(followUp.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                    <div className="space-x-2">
                      {followUp.status === 'Pendiente' && (
                        <Button variant="outline" size="sm">
                          <CalendarPlus className="h-3 w-3 mr-1" /> Programar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">Ver Detalles</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay seguimientos pendientes.</p>
        )}
        <div className="mt-4 flex justify-end">
            <Button variant="secondary">
                Ver todos los seguimientos
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}