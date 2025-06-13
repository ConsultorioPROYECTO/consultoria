// src/app/dashboard/1/compo/AIResponseConfig.tsx
'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Checkbox } from "@rutas/components/ui/checkbox";
import { Label } from "@rutas/components/ui/label";
import { Textarea } from "@rutas/components/ui/textarea";

export function AIResponseConfig() {
  // Lógica para cargar y guardar configuraciones de respuestas de IA

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Respuestas de IA</CardTitle>
        <CardDescription>
          Personaliza los mensajes automáticos para diferentes escenarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="welcomeMessage">Mensaje de Bienvenida</Label>
          <Textarea
            id="welcomeMessage"
            placeholder="Ej: ¡Hola! Gracias por contactar a la Clínica Irina. ¿Cómo podemos ayudarte hoy?"
            defaultValue="¡Hola! Gracias por contactar a la Clínica Irina. ¿Cómo podemos ayudarte hoy?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appointmentConfirmation">Confirmación de Cita</Label>
          <Textarea
            id="appointmentConfirmation"
            placeholder="Ej: Tu cita para el [Fecha] a las [Hora] con [Doctor] ha sido confirmada."
            defaultValue="Tu cita para el [Fecha] a las [Hora] con [Doctor] ha sido confirmada."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appointmentReminder">Recordatorio de Cita</Label>
          <Textarea
            id="appointmentReminder"
            placeholder="Ej: Te recordamos tu cita mañana a las [Hora] con [Doctor]."
            defaultValue="Te recordamos tu cita mañana a las [Hora] con [Doctor]."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cancellationPolicy">Política de Cancelación</Label>
          <Textarea
            id="cancellationPolicy"
            placeholder="Ej: Para cancelar o reprogramar, por favor avísanos con al menos 24 horas de anticipación."
            defaultValue="Para cancelar o reprogramar, por favor avísanos con al menos 24 horas de anticipación."
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="humanEscalation" defaultChecked />
          <Label htmlFor="humanEscalation" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Escalar a humano si la IA no puede resolver (después de 2 intentos)
          </Label>
        </div>
      </CardContent>
      <CardFooter>
        <Button>Guardar Configuración</Button>
      </CardFooter>
    </Card>
  );
}