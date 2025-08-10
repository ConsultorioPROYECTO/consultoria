'use client';

import { useAuth } from "../../../../context/AuthContext";
import { useState, useEffect } from "react";
import { DateTime } from 'luxon';

// Componentes específicos del Dashboard Médico
import { DailyAgendaView } from "./_components/DailyAgendaView";
import { TodaysAppointments } from "./_components/TodaysAppointments";
import { NextAppointment } from "./_components/NextAppointment";
import { MedicalConsultationWorkspace } from "./_components/MedicalConsultationWorkspace";
import type { ConsultationAppointment } from "./_components/MedicalConsultationWorkspace";
import { MonthlyAppointmentsSummary } from "./_components/MonthlyAppointmentsSummary";
import { TodayIsDay } from "./_components/TodayIsDay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Tipos de datos para eventos de calendario
import { AppointmentEventData, BreakTimeEventData } from "@/types/google-calendar";
import { APPOINTMENT_STATUS } from "@/types/appointment-status";

// Tipo combinado para el estado
type CalendarEvent = AppointmentEventData | BreakTimeEventData;

// Tipos locales para listar adjuntos del doctor (GET /api/attachments/list)
interface DoctorAttachmentItem {
  id: number;
  objectKey: string;
  objectName: string;
  contentType: string;
  fileSize: number;
  fileCategory: string;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  accessLevel: string;
  createdAt: string;
}

interface DoctorAttachmentsResponse {
  data?: {
    items: DoctorAttachmentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
  message?: string;
}

export default function DoctorDashboard() {
  const { user, doctorId } = useAuth();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConsultationAppointment, setSelectedConsultationAppointment] = useState<ConsultationAppointment | null>(null);
  const [isMedicalWorkspaceOpen, setIsMedicalWorkspaceOpen] = useState(false);

  // Estado para "Archivos del Doctor"
  const [docAttachments, setDocAttachments] = useState<DoctorAttachmentItem[]>([]);
  const [docListLoading, setDocListLoading] = useState(false);
  const [docListError, setDocListError] = useState<string | null>(null);

  const fetchDoctorAttachments = async () => {
    if (!user || !doctorId) return;
    try {
      setDocListLoading(true);
      setDocListError(null);
      const token = await user.getIdToken();
      const url = `/api/attachments/list?doctorId=${doctorId}&limit=20&sortBy=createdAt&sortOrder=desc&page=1`;
      const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!resp.ok) throw new Error('No se pudo obtener la lista de archivos del doctor');
      const json: DoctorAttachmentsResponse = await resp.json();
      setDocAttachments(json?.data?.items ?? []);
    } catch (e) {
      setDocListError(e instanceof Error ? e.message : 'Error desconocido al listar archivos');
    } finally {
      setDocListLoading(false);
    }
  };

  useEffect(() => {
    // Cargar al entrar al dashboard
    fetchDoctorAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, doctorId]);

  const handleViewAttachment = async (objectKey: string, fileName?: string) => {
    if (!user || !objectKey) return;
    try {
      const token = await user.getIdToken();
      const resp = await fetch('/api/attachments/presigned-get-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ objectKey, disposition: 'inline', fileName: fileName ?? undefined }),
      });
      if (!resp.ok) throw new Error('No se pudo obtener URL de descarga');
      const data: { data: { presignedUrl: string } } = await resp.json();
      window.open(data.data.presignedUrl, '_blank');
    } catch (e) {
      // Silencioso por ahora; se podría mostrar un toast
      console.error(e);
    }
  };

  const pendingAppointmentsCount = calendarEvents.filter(event => 
    'appointmentStatus' in event && 
    event.appointmentStatus !== APPOINTMENT_STATUS.ATTENDED
  ).length;

  const handleStartConsultation = (appointment: AppointmentEventData) => {
    if (!doctorId || !appointment.id || !appointment.patientId || !appointment.serviceId) {
      console.error("Datos insuficientes en el evento para iniciar la consulta.", appointment);
      setError("No se puede iniciar la consulta, faltan datos clave en el evento.");
      return;
    }

    const summaryMatch = appointment.summary.match(/Cita con (.*) - (.*)/);
    const patientFullName = summaryMatch ? summaryMatch[1].trim() : 'Paciente Desconocido';
    const serviceName = summaryMatch ? summaryMatch[2].trim() : 'Servicio Desconocido';

    // Dividir el nombre completo en nombre y apellido
    const nameParts = patientFullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const startDateTime = typeof appointment.startDateTime === 'string'
      ? DateTime.fromISO(appointment.startDateTime)
      : appointment.startDateTime;

    const consultationAppointment = {
      id: 0, 
      google_event_id: appointment.id,
      google_calendar_id: appointment.calendarId,
      doctorId: doctorId,
      organizationId: appointment.organizationId,
      time: startDateTime.toFormat('HH:mm'),
      status: appointment.appointmentStatus,
      patient: {
        // Corregido para usar firstName y lastName
        firstName: firstName,
        lastName: lastName,
      },
      service: {
        id: appointment.serviceId,
        name: serviceName,
        description: appointment.description || '',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      sync_status: 'not_synced',
      last_sync_attempt: null,
      sync_error: null,
    } as ConsultationAppointment;
    
    setSelectedConsultationAppointment(consultationAppointment);
    setIsMedicalWorkspaceOpen(true);
  };

  const doctorNames = user?.displayName?.split(' ') || [];
  const formattedNames = doctorNames.slice(0, 2).map(name => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  });
  const displayTwoNames = formattedNames.join(' ');

  const now = new Date();
  const hour = now.getHours();
  let timeBasedPhrase = "";

  if (hour < 12) {
    timeBasedPhrase = "¡Que tengas un productivo día!";
  } else if (hour < 18) {
    timeBasedPhrase = "Continúa con éxito tus consultas de hoy.";
  } else {
    timeBasedPhrase = "Excelente jornada de trabajo. ¡Momento de descansar!";
  }

  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!user || !doctorId) return;

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const startDate = DateTime.now().toISODate();
        const endDate = DateTime.now().plus({ days: 1 }).toISODate();

        const eventsResponse = await fetch(`/api/doctors/${doctorId}/calendar/events?startDate=${startDate}&endDate=${endDate}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!eventsResponse.ok) throw new Error('Error fetching calendar events');

        const data = await eventsResponse.json();
        setCalendarEvents(data.events || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarEvents();
  }, [user, doctorId]);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <main className="flex-1 space-y-6 pb-22 md:pb-4 lg:pb-6 px-4 md:px-4 lg:px-6 pt-2 md:pt-2 lg:pt-2">
        <div className="flex flex-col @lg:flex-row @lg:items-center @lg:justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hola, {displayTwoNames}</h1>
          <p className="text-muted-foreground">{timeBasedPhrase}</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1"><TodayIsDay /></div>
              <div className="col-span-1"><TodaysAppointments appointmentCount={isLoading ? 0 : calendarEvents.length} /></div>
            </div>
            <div>
               <DailyAgendaView 
                 calendarEvents={isLoading ? [] : calendarEvents} 
                 onStartConsultation={handleStartConsultation}
               />
             </div>
           </div>

           <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex flex-col gap-4">
             <NextAppointment calendarEvents={isLoading ? [] : calendarEvents} />
            <MonthlyAppointmentsSummary pendingAppointments={isLoading ? 0 : pendingAppointmentsCount} />

            {/* Archivos del Doctor */}
            <Card className="flex-shrink-0 rounded-lg shadow-sm p-4">
              <CardHeader className="px-0 pt-0">
                <div className="flex items-center justify-between">
                  <CardTitle>Archivos del Doctor</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={fetchDoctorAttachments} disabled={docListLoading || !doctorId}>
                      {docListLoading ? 'Actualizando...' : 'Refrescar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {docListError && (
                  <div className="text-red-500 text-sm mb-2">{docListError}</div>
                )}
                {docListLoading && docAttachments.length === 0 ? (
                  <div className="text-sm opacity-70">Cargando archivos...</div>
                ) : docAttachments.length === 0 ? (
                  <div className="text-sm opacity-70">No hay archivos asociados.</div>
                ) : (
                  <div className="space-y-2">
                    {docAttachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-sm font-medium truncate max-w-[220px]" title={att.objectName}>{att.objectName}</span>
                          <span className="text-xs opacity-70 hidden sm:inline">{new Date(att.createdAt).toLocaleString()}</span>
                          <span className="text-xs opacity-70 hidden sm:inline">{(att.fileSize / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewAttachment(att.objectKey, att.objectName)}>
                            Ver
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <MedicalConsultationWorkspace
          appointment={selectedConsultationAppointment}
          isOpen={isMedicalWorkspaceOpen}
          onOpenChange={setIsMedicalWorkspaceOpen}
        />
      </main>
    </div>
  );
}
