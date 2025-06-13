// src/app/dashboard/3/compo/HumanInterventionInbox.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Badge } from "@rutas/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

// Mock data
const interventionRequests = [
  {
    id: "req1",
    patientName: "Laura Gómez",
    requestType: "Solicitud de cita urgente",
    reason: "Paciente refiere dolor agudo. IA no pudo encontrar espacio inmediato.",
    receivedAt: "Hace 15 minutos",
    priority: "Alta",
  },
  {
    id: "req2",
    patientName: "Miguel Ángel Torres",
    requestType: "Reprogramación compleja",
    reason: "Necesita cambiar 3 citas futuras, IA sugiere revisión manual.",
    receivedAt: "Hace 1 hora",
    priority: "Media",
  },
  {
    id: "req3",
    patientName: "Sofía Castillo",
    requestType: "Consulta información no estándar",
    reason: "Pregunta sobre cobertura de seguro específica no programada en IA.",
    receivedAt: "Hace 3 horas",
    priority: "Baja",
  },
];

export function HumanInterventionInbox() {
  // Lógica para manejar solicitudes (asignar, resolver, etc.)

  const getPriorityBadge = (priority: string) => {
    if (priority === "Alta") return <Badge variant="destructive" className="capitalize"><AlertTriangle className="h-3 w-3 mr-1" />{priority}</Badge>;
    if (priority === "Media") return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900 capitalize"><Clock className="h-3 w-3 mr-1" />{priority}</Badge>;
    return <Badge variant="outline" className="capitalize"><CheckCircle className="h-3 w-3 mr-1" />{priority}</Badge>;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Bandeja de Intervención Humana</CardTitle>
        <CardDescription>
          Solicitudes y casos que requieren tu atención directa.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-[400px]"> {/* Altura ajustable */}
          {interventionRequests.length > 0 ? (
            <div className="space-y-0">
              {interventionRequests.map((req) => (
                <div key={req.id} className="p-4 border-b hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-md text-foreground">{req.patientName}</h4>
                    {getPriorityBadge(req.priority)}
                  </div>
                  <p className="text-sm text-primary font-medium mb-1">{req.requestType}</p>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                    {req.reason}
                  </p>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">Recibido: {req.receivedAt}</p>
                    <Button size="sm" variant="outline">Revisar Caso</Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay solicitudes pendientes.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}