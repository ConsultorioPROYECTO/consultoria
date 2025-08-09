'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef } from 'react';
import { useAICare } from '@/hooks/useAICare';
import { PatientHistoryView } from "./medical-consultation/PatientHistoryView";
import { useAuth } from '@/app/context/AuthContext';


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
  onSaveAndComplete?: (appointmentId: number, notes: string) => void;
}

export function MedicalConsultationWorkspace({
  appointment,
  isOpen,
  onOpenChange,
  onSaveAndComplete,
}: MedicalConsultationWorkspaceProps) {
  const [notes, setNotes] = useState('');
  // Integrate file upload state management
  // Removed selectedFiles state to avoid unused var warning
  // If needed in future for UI listing, can be reintroduced
  // const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<Array<{
    name: string;
    status: 'idle' | 'presigning' | 'uploading' | 'confirming' | 'done' | 'error';
    progress: number; // 0-100
    error?: string;
    objectKey?: string;
    id?: number; // r2_objects.id after confirm
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Compute SHA-256 hex for file integrity (optional)
  async function computeSha256Hex(file: File): Promise<string | undefined> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch {
      return undefined;
    }
  }

  async function startUpload(file: File) {
    if (!appointment || !user) return;

    // Push initial upload state
    setUploads(prev => [
      { name: file.name, status: 'presigning', progress: 0 },
      ...prev,
    ]);

    try {
      const token = await user.getIdToken();
      // 1) Request presigned PUT URL
      const presignResp = await fetch('/api/attachments/presigned-put-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          appointmentId: appointment.id ?? undefined,
          // patientId is optional and not available in current appointment shape
          patientId: undefined,
          fileCategory: 'medical_document',
          description: 'Uploaded from Medical Consultation Workspace',
        }),
      });

      if (!presignResp.ok) {
        const err = await presignResp.json().catch(() => ({}));
        throw new Error(err?.message || 'No se pudo obtener URL de carga');
      }

      const presignData: { data: { presignedUrl: string; objectKey: string; expiresInSeconds: number } } = await presignResp.json();
      const { presignedUrl, objectKey } = presignData.data;

      // 2) Upload file to R2 using presigned URL
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'uploading', progress: 10 } : u));

      const putResp = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!putResp.ok) {
        throw new Error('Error al subir el archivo');
      }

      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'confirming', progress: 80 } : u));

      // 3) Confirm upload and persist metadata
      const fileHash = await computeSha256Hex(file);
      const confirmResp = await fetch('/api/attachments/confirm-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          objectKey,
          objectName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          fileHash,
          appointmentId: appointment.id ?? undefined,
          patientId: undefined,
          medicalServiceId: appointment.service?.id ?? undefined,
          fileCategory: 'medical_document',
          description: 'Uploaded from Medical Consultation Workspace',
          tags: ['consultation'],
        }),
      });

      if (!confirmResp.ok) {
        const err = await confirmResp.json().catch(() => ({}));
        throw new Error(err?.message || 'No se pudo confirmar la carga');
      }

      const confirmData: { data: { id: number; objectKey: string } } = await confirmResp.json();

      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'done', progress: 100, objectKey: objectKey, id: confirmData.data.id } : u));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error al cargar archivo';
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', progress: 100, error: message } : u));
    }
  }

  async function handleViewAttachment(objectKey?: string, fileName?: string) {
    if (!objectKey || !user) return;
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/attachments/presigned-get-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          objectKey,
          disposition: 'inline',
          fileName: fileName ?? undefined,
        }),
      });
      if (!resp.ok) {
        throw new Error('No se pudo obtener URL de descarga');
      }
      const data: { data: { presignedUrl: string } } = await resp.json();
      window.open(data.data.presignedUrl, '_blank');
    } catch (e) {
      // Silently fail in UI list by marking error on that item could be an enhancement
      console.error(e);
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const files = Array.from(event.target.files);
      files.forEach((f) => startUpload(f));
    }
  };

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
  };

  const { data, loading, error, fetchAICare } = useAICare();

  // Debug logs removidos para producción

  if (!appointment) return null; // No renderizar si no hay cita seleccionada

  const handleSaveClick = async () => {
    if (!appointment?.google_event_id || !user) {
      setSubmitError('Datos de cita o usuario no disponibles');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Concatenar notas de consulta con notas de AI-Care
       const aiCareText = typeof data?.text === 'string' ? data.text : '';
       const combinedNotes = notes.trim() + (aiCareText.trim() ? '\n\n--- AI-Care ---\n' + aiCareText.trim() : '');

      const token = await user.getIdToken();
      const response = await fetch(`/api/appointments/${appointment.google_event_id}/attend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: combinedNotes,
          durationMinutes: appointment.service?.durationMinutes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al marcar la cita como atendida');
      }

      // Llamar callback opcional si existe
      if (onSaveAndComplete) {
        onSaveAndComplete(appointment.id ?? 0, combinedNotes);
      }

      // Limpiar formulario y cerrar modal
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error al guardar consulta:', error);
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
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
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files || []);
                    if (files.length > 0) {
                      // Maintain only uploads state; we can derive file list from it
                      files.forEach((f) => startUpload(f));
                    }
                  }}
                >
                  <p className="text-center">Arrastra y suelta archivos aquí o haz clic para adjuntar.</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.txt"
                  multiple
                />
              </CardContent>

              {/* Uploads list */}
              {uploads.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {uploads.map((u, idx) => (
                    <div key={`${u.name}-${idx}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium truncate max-w-[200px]">{u.name}</span>
                        <span className="text-xs opacity-70">
                          {u.status === 'presigning' && 'Preparando carga...'}
                          {u.status === 'uploading' && 'Subiendo...'}
                          {u.status === 'confirming' && 'Confirmando...'}
                          {u.status === 'done' && 'Completado'}
                          {u.status === 'error' && `Error: ${u.error ?? 'Desconocido'}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs opacity-70">{u.progress}%</div>
                        {u.status === 'done' && (
                          <Button size="sm" variant="outline" onClick={() => handleViewAttachment(u.objectKey, u.name)}>
                            Ver
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        <DialogFooter className="flex flex-col gap-2">
          {submitError && (
            <div className="text-red-500 text-sm text-center">{submitError}</div>
          )}
          <Button 
            onClick={handleSaveClick} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar y Completar Consulta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}