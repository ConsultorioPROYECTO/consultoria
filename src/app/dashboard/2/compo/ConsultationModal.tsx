'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@rutas/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Textarea } from "@rutas/components/ui/textarea";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Button } from "@rutas/components/ui/button";
import { DialogFooter } from "@rutas/components/ui/dialog";
import { useState } from 'react';

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: string;
  status: string;
}

interface ConsultationModalProps {
  appointment: Appointment | null; // La cita para la consulta actual
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndComplete: (appointmentId: string, notes: string) => void;
}

export function ConsultationModal({
  appointment,
  isOpen,
  onOpenChange,
  onSaveAndComplete,
}: ConsultationModalProps) {
  const [notes, setNotes] = useState('');

  if (!appointment) return null; // No renderizar si no hay cita seleccionada

  const handleSaveClick = () => {
    onSaveAndComplete(appointment.id, notes);
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl lg:max-w-7xl xl:max-w-[90vw] max-h-[95vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Consulta con {appointment.patientName} ({appointment.service})</DialogTitle>
          <DialogDescription>
            Hora: {appointment.time}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
          {/* Columna izquierda - Información del paciente */}
          <div className="col-span-1 overflow-y-auto">
            <Card className="flex-shrink-0"> {/* flex-shrink-0 para no encogerse si hay mucho contenido al lado */}
              <CardContent>
                {/* Aquí iría la información del perfil del paciente */}
                <div className="text-4xl font-bold mt-1">
                  <span >{appointment.patientName}</span>
                </div>
                {/**/}
                <div className="text-sm opacity-80 mt-2">
                  <span>Servicio: {appointment.service}</span>
                </div>
                {/**/}
                <div className="text-sm opacity-80 ">
                  <span>Telefono: +1 232 92302</span>
                </div>

                {/* Información adicional del paciente */}
              </CardContent>
            </Card>
            {/* Puedes añadir más tarjetas o componentes de perfil aquí */}
          </div>
          
          {/* Columna central - Transcripción de voz a texto */}
          <div className="col-span-1 overflow-y-auto border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Transcripción</h3>
            <div className="space-y-2">
              {/* Aquí irá el contenido de la transcripción */}
            </div>
          </div>

          {/* Columna derecha - Notas y observaciones */}
          <div className="col-span-1 overflow-y-auto space-y-6">
            <Card className="flex-1 flex flex-col overflow-hidden"> {/* flex-1 para ocupar espacio y permitir scroll si es necesario */}
              <CardHeader>
                <CardTitle>Notas de Consulta</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto "> {/* flex-1 y overflow para hacer scroll en las notas */}
                <ScrollArea className="h-full overflow-hidden "> {/* Eliminado pr-4 */}
                  <Textarea 
                    placeholder="Escribe tus notas de consulta aquí..." 
                    className="h-[200px] resize-none w-full whitespace-pre-wrap break-words [word-break:break-all]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Otro Componente Abajo de Notas */}
            <Card className="flex-shrink-0"> {/* flex-shrink-0 para que no se encoja */}
              <CardHeader>
                <CardTitle>Otro Componente</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Aquí iría el contenido del otro componente (ej. plan de tratamiento, recetas) */}
                <p>Contenido del componente inferior...</p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Añadir pie de diálogo con botón de guardar */}
        <DialogFooter>
          <Button onClick={handleSaveClick}>Guardar y Completar Consulta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}