'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@rutas/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Textarea } from "@rutas/components/ui/textarea";
import { ScrollArea } from "@rutas/components/ui/scroll-area";

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
}

export function ConsultationModal({
  appointment,
  isOpen,
  onOpenChange,
}: ConsultationModalProps) {
  if (!appointment) return null; // No renderizar si no hay cita seleccionada

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-6xl max-h-[90vh] flex flex-col p-6"> {/* Ajustar tamaño y layout */}
        <DialogHeader>
          <DialogTitle>Consulta con {appointment.patientName} ({appointment.service})</DialogTitle>
          <DialogDescription>
            Hora: {appointment.time}
          </DialogDescription>
        </DialogHeader>
        
        {/* Contenido principal: Dos columnas y sección inferior */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden"> {/* Usar grid para las columnas */}
          {/* Columna Izquierda: Perfil del Paciente */}
          <div className="lg:col-span-1 flex flex-col overflow-hidden"> {/* Ocupa 1 de 3 columnas en lg+ */}
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

          {/* Columna Derecha: Notas y Otro Componente */}
          <div className="lg:col-span-2 flex flex-col space-y-6 overflow-hidden"> {/* Ocupa 2 de 3 columnas en lg+ */}
             {/* Componente para Notas */}
             <Card className="flex-1 flex flex-col overflow-hidden"> {/* flex-1 para ocupar espacio y permitir scroll si es necesario */}
                <CardHeader>
                   <CardTitle>Notas de Consulta</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto"> {/* flex-1 y overflow para hacer scroll en las notas */}
                   <ScrollArea className="h-full pr-4"> {/* Añadir ScrollArea alrededor del textarea */}
                     <Textarea placeholder="Escribe tus notas de consulta aquí..." className="min-h-[200px] resize-none" /> {/* min-h ajustable, deshabilitar resize */}
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
        
        {/* Aquí podrías añadir botones de acción global para el modal, si son necesarios */}
        {/* <DialogFooter>
           <Button>Guardar Consulta</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
} 