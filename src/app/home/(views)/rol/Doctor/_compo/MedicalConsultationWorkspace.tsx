'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@rutas/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Textarea } from "@rutas/components/ui/textarea";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Button } from "@rutas/components/ui/button";
import { DialogFooter } from "@rutas/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rutas/components/ui/tabs";
import { useState, useRef } from 'react';
import { useAICare } from '@/app/hooks/useAICare';
import { PatientHistoryView } from "./medical-consultation/PatientHistoryView";


import { Appointment, } from '../../../../../../db/schema';

// Definir el tipo para la cita de consulta con las relaciones necesarias
export interface ConsultationAppointment extends Omit<Partial<Appointment>, 'patientId' | 'serviceId'> {
  time: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  service: {
    id: number;
    name: string;
    description?: string;
    code?: string;
    durationMinutes?: number;
    basePrice?: number;
    category?: string;
    requiresPreparation?: boolean;
    preparationInstructions?: string;
    organizationId?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
}

interface MedicalConsultationWorkspaceProps {
  appointment: ConsultationAppointment | null; // La cita para la consulta actual
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAndComplete: (appointmentId: number, notes: string) => void;
}

export function MedicalConsultationWorkspace({
  appointment,
  isOpen,
  onOpenChange,
  onSaveAndComplete,
}: MedicalConsultationWorkspaceProps) {
  const [notes, setNotes] = useState('');
  const [, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      // Archivo seleccionado - log removido para producción
    }
  };

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
  };

  const { data, loading, error, fetchAICare } = useAICare();

  // Debug logs removidos para producción

  if (!appointment) return null; // No renderizar si no hay cita seleccionada

  const handleSaveClick = () => {
    // Debug logs removidos para producción
    onSaveAndComplete(appointment.id ?? 0, notes);
    setNotes('');
  };

  // Para mostrar el resultado de AI Care en el textarea central
  const aiCareText = data?.text || '';

  // Debug logs para AI Care
  // Debug logs removidos para producción

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl lg:max-w-7xl xl:max-w-[90vw] max-h-[95vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Consulta con {appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Paciente no disponible'} ({appointment.service?.name || 'Servicio no disponible'})</DialogTitle>
          <DialogDescription>
            Hora: {appointment.time}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
          <div className="col-span-1 flex flex-col">
            <Tabs defaultValue="patient-info" className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="patient-info">Información del Paciente</TabsTrigger>
                <TabsTrigger value="medical-history">Historial Médico</TabsTrigger>
              </TabsList>
              <TabsContent value="patient-info" className="flex-1 overflow-hidden pt-4">
                <Card className="flex-shrink-0"> {/* flex-shrink-0 para no encogerse si hay mucho contenido al lado */}
                  <CardContent>
                    {/* Aquí iría la información del perfil del paciente */}
                    <div className="text-4xl font-bold mt-1 mb-2">
                      <span>{appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Paciente no disponible'}</span>
                    </div>
                    {/**/}
                    <div className="text-sm opacity-80 ">
                      <span>Telefono: </span>
                    </div>
                    {/**/}
                    <div className="text-sm opacity-80 ">
                      <span>Ultimo peso: </span>
                    </div>
                    {/**/}
                    <div className="text-sm opacity-80 ">
                      <span>Tipo de sangre: </span>
                    </div>
                    {/**/}
                    <div className="text-sm opacity-80 ">
                      <span>Estatura: </span>
                    </div>
                    {/**/}
                    <div className="text-sm opacity-80 ">
                      <span>Edad: </span>
                    </div>

                    {/* Información adicional del paciente */}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="medical-history" className="flex-1 overflow-hidden pt-4">
                <PatientHistoryView
                  patientId={appointment.id ?? 0} // Fallback a 0 si el ID no está definido
                  patientName={appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : 'Paciente no disponible'}
                  // isOpen={isOpen} // La visibilidad del modal principal controla la del historial
                  // onOpenChange={onOpenChange}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Columna derecha - Notas y observaciones */}
          <div className="col-span-1 overflow-y-auto flex flex-col gap-4">
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
            <Card className="flex-shrink-0 rounded-lg shadow-sm p-4">
             
              <CardContent className="flex items-center justify-center h-full p-0">
                <div
                  className="w-full h-32 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-400 transition-colors duration-200 cursor-pointer"
                  onClick={handleAttachFileClick}
                  onContextMenu={(e) => {
                    e.preventDefault(); // Prevenir el menú contextual por defecto del navegador
                    handleAttachFileClick();
                  }}
                >
                  <p className="text-center">Arrastra y suelta archivos aquí o haz clic para adjuntar.</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple
                />
              </CardContent>
            </Card>
          </div>

          {/* Columna central - Transcripción de voz a texto */}
          <Card className="col-span-1 overflow-y-auto border rounded-lg py-4">
            <CardHeader>
              <CardTitle>AI-Care</CardTitle>
              <Button onClick={() => {
                // Debug logs removidos para producción
                fetchAICare(notes);
              }} disabled={loading}>
                {loading ? 'Generando...' : 'Generar con AI Care'}
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto "> {/* flex-1 y overflow para hacer scroll en las notas */}
              <ScrollArea className="h-full overflow-hidden "> {/* Eliminado pr-4 */}
                <Textarea
                  placeholder="Aquí aparecerá el resultado de AI Care..."
                  className="h-[350px] resize-none w-full whitespace-pre-wrap break-words [word-break:break-all]"
                  value={typeof aiCareText === 'string' ? aiCareText : ''}
                  readOnly
                />
                {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
              </ScrollArea>
            </CardContent>
          </Card>

        </div>

        {/* Añadir pie de diálogo con botón de guardar */}
        <DialogFooter>
          <Button onClick={handleSaveClick}>Guardar y Completar Consulta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}