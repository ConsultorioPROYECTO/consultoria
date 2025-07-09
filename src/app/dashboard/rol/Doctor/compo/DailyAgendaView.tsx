// src/app/dashboard/2/compo/DailyAgendaView.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Button } from "@rutas/components/ui/button";
import { ClockIcon, UserIcon, AlertCircle, CalendarSync, Play, MapPinIcon, VideoIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@rutas/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rutas/components/ui/dialog";

import { Appointment } from '../../../lib/appointmentsService';

interface DailyAgendaViewProps {
  todayAppointments: Appointment[]; // Añadir la prop para recibir las citas
  onSelectPatient?: (id: number, name: string) => void;
  onSelectAppointment?: (id: number) => void;
  onStartAppointment?: (id: number) => void;
  onCompleteAppointment?: (id: number) => void;
  onResetAppointment?: (id: number) => void; // Añadir nueva prop para restablecer cita
  onStartConsultation?: (appointment: Appointment) => void; // Nueva prop para iniciar consulta
}

export function DailyAgendaView({ todayAppointments, onSelectPatient, onStartAppointment, onCompleteAppointment, onResetAppointment, onStartConsultation }: DailyAgendaViewProps) {
  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [activeTab, setActiveTab] = useState("pending");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Función para formatear la hora de la cita
  const formatAppointmentTime = (appointment: Appointment): string => {
    // Debug: Log de datos de la cita
    if (process.env.NODE_ENV === 'development') {
      console.log(`🕐 Formateando hora para cita ${appointment.id}:`, {
        startDateTime: appointment.startDateTime,
        endDateTime: appointment.endDateTime,
        time: appointment.time,
        date: appointment.date
      });
    }
    
    if (appointment.startDateTime) {
      const startTime = new Date(appointment.startDateTime);
      const endTime = appointment.endDateTime ? new Date(appointment.endDateTime) : null;
      
      // Debug: Verificar si las fechas son válidas
      if (process.env.NODE_ENV === 'development') {
        console.log(`📅 Fechas parseadas para cita ${appointment.id}:`, {
          startTime: startTime.toISOString(),
          endTime: endTime?.toISOString(),
          startTimeValid: !isNaN(startTime.getTime()),
          endTimeValid: endTime ? !isNaN(endTime.getTime()) : 'N/A'
        });
      }
      
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      
      const startTimeStr = startTime.toLocaleTimeString('es-ES', timeOptions);
      
      if (endTime) {
        const endTimeStr = endTime.toLocaleTimeString('es-ES', timeOptions);
        return `${startTimeStr} - ${endTimeStr}`;
      }
      
      return startTimeStr;
    }
    
    // Fallback al campo time si existe
    if (appointment.time) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏰ Usando campo time para cita ${appointment.id}: ${appointment.time}`);
      }
      return appointment.time;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ No se pudo determinar hora para cita ${appointment.id}`);
    }
    
    return 'Hora no especificada';
  };

  // Función para calcular la duración de la cita
  const getAppointmentDuration = (appointment: Appointment): string => {
    if (appointment.startDateTime && appointment.endDateTime) {
      const start = new Date(appointment.startDateTime);
      const end = new Date(appointment.endDateTime);
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      if (durationMinutes >= 60) {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
      }
      
      return `${durationMinutes}min`;
    }
    
    // Fallback a la duración del servicio
    if (appointment.service?.duration) {
      return `${appointment.service.duration}min`;
    }
    
    return '';
  };

  // Debug logs solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log("Citas para hoy:", todayAppointments);
    console.log("Estado de las citas:", todayAppointments.map(apt => apt.status));
  }
  // Pendiente por debuggear
  console.debug("Variables sin usar \ncurrentTime:\t", currentTime,"onStartAppointment:\t", onStartAppointment);

  // Actualizar el tiempo actual cada minuto para que el tiempo restante se refresque
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(timerId); // Limpiar el intervalo al desmontar el componente
  }, []); // El array vacío asegura que el efecto solo se ejecute una vez al montar

  const handlePatientClick = (id: number, name: string) => {
    onSelectPatient?.(id, name);
  };
  /*
  const handleStartAppointment = (id: string) => {
    onStartAppointment?.(id);
    // Log removido para producción
  };
  */

  const handleCompleteAppointment = (id: number) => {
    onCompleteAppointment?.(id);
    // Log removido para producción
  };

  const handleResetAppointment = (id: number) => {
    const appointment = todayAppointments.find(apt => apt.id === id);
    if (appointment) {
      setSelectedAppointment(appointment);
      setIsDialogOpen(true);
    }
  };

  const confirmReschedule = () => {
    if (selectedAppointment) {
      onResetAppointment?.(selectedAppointment.id);
      setIsDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

  const handleStartConsultationClick = (e: React.MouseEvent, appointment: Appointment) => {
    e.stopPropagation();
    onStartConsultation?.(appointment);
  };

  // Filtrar citas según la pestaña activa
  const filteredAppointments = todayAppointments.filter(apt => {
    if (activeTab === "pending") {
      // Consideramos pendientes y en curso como 'faltantes' para esta vista
      return apt.status !== "Completada";
    } else if (activeTab === "completed") {
      return apt.status === "Completada";
    }
    return false; // No mostrar nada si la pestaña no es reconocida
  });

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle>Agenda del Día</CardTitle>
          </div>
        <CardDescription>{currentDate}</CardDescription>
      </CardHeader>
        <CardContent className="flex-grow p-0 flex flex-col">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col px-4 sm:px-0">
              <TabsList className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground w-full justify-center sm:w-auto sm:self-end sm:mr-4">
                 <TabsTrigger value="pending" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
                    Pendientes ({todayAppointments.filter(apt => apt.status !== 'Completada').length})
                 </TabsTrigger>
                 <TabsTrigger value="completed" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow">
                    Atendidas ({todayAppointments.filter(apt => apt.status === 'Completada').length})
                 </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="m-0 flex-grow">
                 <ScrollArea className="h-[430px]"> {/* Altura fija para mostrar 3.5 elementos y habilitar scroll */}
                    <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((apt) => {
                           const patientName = apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Paciente no disponible';
                           const serviceName = apt.service?.name || 'Servicio no disponible';
                           return (
                             <div 
                               key={apt.id} 
                               className="p-2 md:p-3 border rounded-lg hover:shadow-md transition-shadow bg-card cursor-pointer"
                               onClick={() => handlePatientClick(apt.id, patientName)} // Hacer la tarjeta clickeable
                             >
                               
                               
                               {/* Sección principal: Info paciente a la izq, botones a la der */}
                               <div className="flex flex-row items-center justify-between gap-3 md:gap-2">
                                 {/* Info del paciente y servicio (columna izquierda) */}
                                 <div className="flex-1 w-full md:w-auto md:mr-2">
                                    {/* Fila superior: Hora exacta y duración */}
                                    <div className="flex items-center mb-2">
                                      <ClockIcon className="h-4 w-4 mr-1 md:mr-2 text-primary" />
                                      <span className="font-medium text-primary text-sm">
                                        {formatAppointmentTime(apt)}
                                        {getAppointmentDuration(apt) && (
                                          <span className="text-muted-foreground ml-2">({getAppointmentDuration(apt)})</span>
                                        )}
                                      </span>
                                    </div>
                                   <div className="flex items-center mb-1">
                                      <UserIcon className="h-5 w-5 mr-2 flex-shrink-0 text-muted-foreground" />
                                      <p className="text-lg md:text-xl font-bold text-foreground">{patientName}</p>
                                   </div>
                                   <p className="text-sm text-muted-foreground md:ml-7 mb-1">{serviceName}</p>
                                   
                                   {/* Información adicional de Google Calendar */}
                                   <div className="space-y-1">
                                     {apt.location && (
                                       <div className="flex items-center text-xs text-muted-foreground md:ml-7">
                                         <MapPinIcon className="h-3 w-3 mr-1" />
                                         <span>{apt.location}</span>
                                       </div>
                                     )}
                                     {apt.meetingLink && (
                                       <div className="flex items-center text-xs text-muted-foreground md:ml-7">
                                         <VideoIcon className="h-3 w-3 mr-1" />
                                         <a 
                                           href={apt.meetingLink} 
                                           target="_blank" 
                                           rel="noopener noreferrer"
                                           className="text-blue-600 hover:text-blue-800 underline"
                                           onClick={(e) => e.stopPropagation()}
                                         >
                                           Unirse a la reunión
                                         </a>
                                       </div>
                                     )}
                                     <div className="flex items-center text-xs text-muted-foreground md:ml-7">
                                       <span>Estado: {apt.status}</span>
                                     </div>
                                   </div>

                                 </div>

                                 {/* Botones de acción (fila en móvil, columna en md+) */}
                                 <div className="flex flex-row space-x-2 items-center self-center md:flex-col md:space-y-2 md:space-x-0 md:items-stretch md:self-end flex-shrink-0">
                                   {/* Botón "Ver Historial" eliminado */}
                                   {apt.status === "Confirmada" || apt.status === "Pendiente" ? (
                                     <>
                                       <Button
                                         onClick={(e) => { e.stopPropagation(); handleResetAppointment(apt.id); }} // Botón Reprogramar con diálogo
                                         variant="outline"
                                         className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 flex items-center justify-center rounded-md text-xs p-2 h-9 w-9 md:w-full md:px-3 md:h-8 lg:w-auto"
                                       >
                                         <CalendarSync className="h-4 w-4 md:mr-2" />
                                         <span className="hidden md:inline">Reprogramar</span>
                                       </Button>
                                       <Button
                                         onClick={(e) => handleStartConsultationClick(e, apt)}
                                         variant="outline"
                                         className="flex items-center justify-center rounded-md text-xs p-2 h-9 w-9 md:w-full md:px-3 md:h-8 lg:w-auto"
                                       >
                                         <Play className="h-4 w-4 md:mr-2" />
                                         <span className="hidden md:inline">Iniciar</span>
                                       </Button>
                                     </>
                                   ) : apt.status === "Llegó" ? (
                                     <Button variant="secondary" className="w-full md:w-auto h-10 md:h-8 px-3 text-xs md:text-sm" onClick={(e) => { e.stopPropagation(); handleCompleteAppointment(apt.id); }}>Completada</Button>
                                   ) : null}
                                 </div>
                               </div>
                             </div>
                           );
                        })
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No hay citas pendientes.</p>
                      )}
                    </div>
                 </ScrollArea>
              </TabsContent>

              <TabsContent value="completed" className="m-0 flex-grow overflow-y-auto">
                 <ScrollArea className="h-[430px]"> {/* Altura fija para mostrar 3.5 elementos y habilitar scroll */}
          <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                      {filteredAppointments.length > 0 ? (
                        filteredAppointments.map((apt) => {
                           const patientName = apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Paciente no disponible';
                           const serviceName = apt.service?.name || 'Servicio no disponible';
                           return (
                           <div 
                             key={apt.id} 
                             className="p-2 md:p-3 border rounded-lg hover:shadow-md transition-shadow bg-card cursor-pointer"
                             onClick={() => handlePatientClick(apt.id, patientName)} // Hacer la tarjeta clickeable
                           >
                             {/* Fila superior: Hora exacta y duración */}
                             <div className="flex justify-between items-center mb-1 md:mb-2">
                               <div className="flex items-center">
                                 <ClockIcon className="h-4 w-4 mr-1 md:mr-2 text-primary" />
                                 <span className="font-semibold text-primary text-sm md:text-base">
                                   {formatAppointmentTime(apt)}
                                   {getAppointmentDuration(apt) && (
                                     <span className="text-muted-foreground ml-2">({getAppointmentDuration(apt)})</span>
                                   )}
                                 </span>
                               </div>
                               <span className="text-xs md:text-sm text-muted-foreground">Completada</span>
                             </div>
                             
                              {/* Sección principal: Info paciente a la izq, botón a la der */}
                             <div className="flex flex-row items-center justify-between gap-3 md:gap-2">
                                {/* Info del paciente y servicio (columna izquierda) */}
                               <div className="flex-1 w-full md:w-auto md:mr-2">
                                 <div className="mb-1 flex items-center">
                                   <UserIcon className="h-4 w-4 mr-1 md:mr-2 text-muted-foreground" />
                                   <p className="font-medium text-foreground text-base md:text-lg">{patientName}</p>
                                 </div>
                                 <p className="text-xs md:text-sm text-muted-foreground md:ml-6 mb-1">{serviceName}</p>
                                 
                                 {/* Información adicional de Google Calendar */}
                                 <div className="space-y-1">
                                   {apt.location && (
                                     <div className="flex items-center text-xs text-muted-foreground md:ml-6">
                                       <MapPinIcon className="h-3 w-3 mr-1" />
                                       <span>{apt.location}</span>
                                     </div>
                                   )}
                                   {apt.meetingLink && (
                                     <div className="flex items-center text-xs text-muted-foreground md:ml-6">
                                       <VideoIcon className="h-3 w-3 mr-1" />
                                       <a 
                                         href={apt.meetingLink} 
                                         target="_blank" 
                                         rel="noopener noreferrer"
                                         className="text-blue-600 hover:text-blue-800 underline"
                                         onClick={(e) => e.stopPropagation()}
                                       >
                                         Ver grabación
                                       </a>
                                     </div>
                                   )}
                                 </div>
                               </div>
                                
                                {/* Botón de acción (columna derecha, apilado en pantallas grandes, fila en pequeñas) */}
                               <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2 flex-shrink-0 self-center md:self-auto">
                                  {/* Botón "Ver Historial" eliminado */}
                                  {/* Botón Restablecer */}
                                  <Button 
                                    variant="secondary" // Usar variant secondary
                                    onClick={(e) => { e.stopPropagation(); onResetAppointment?.(apt.id); }} // Llama directamente a la prop onResetAppointment
                                    className="text-muted-foreground hover:bg-muted w-full md:w-auto h-10 md:h-8 px-3 text-xs md:text-sm"
                                  >
                                     Restablecer
                                  </Button>
                  </div>
                  </div>
                </div>
              );
                        })
            ) : (
                        <p className="text-center text-muted-foreground py-8">No hay citas completadas.</p>
            )}
          </div>
        </ScrollArea>
              </TabsContent>
           </Tabs>
      </CardContent>
    </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Confirmar Reprogramación
            </DialogTitle>
            <DialogDescription>
              Estás a punto de reprogramar la siguiente cita:
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="py-4 space-y-2">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedAppointment.patient?.firstName} {selectedAppointment.patient?.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>{selectedAppointment.status}</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{selectedAppointment.service?.name}</p>
            </div>
          )}

          <DialogDescription className="text-amber-600 bg-amber-50 p-3 rounded-md">
            Se enviará una notificación automática al paciente informando que su cita será reprogramada.
          </DialogDescription>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmReschedule}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirmar Reprogramación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}