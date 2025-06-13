// src/app/dashboard/2/compo/DailyAgendaView.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Button } from "@rutas/components/ui/button";
import { ClockIcon, UserIcon, AlertCircle, CalendarSync, Play } from "lucide-react";
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

interface Appointment {
  id: string;
  time: string;
  patientName: string;
  service: string;
  status: string; // Mantener status para la lógica condicional del botón
}

interface DailyAgendaViewProps {
  todayAppointments: Appointment[]; // Añadir la prop para recibir las citas
  onSelectPatient?: (id: string, name: string) => void;
  onSelectAppointment?: (id: string) => void;
  onStartAppointment?: (id: string) => void;
  onCompleteAppointment?: (id: string) => void;
  onResetAppointment?: (id: string) => void; // Añadir nueva prop para restablecer cita
  onStartConsultation?: (appointment: Appointment) => void; // Nueva prop para iniciar consulta
}

// Función auxiliar para crear un objeto Date para hoy con una hora y minuto específicos
function getDateFromTimeString(timeString: string): Date {
  const [time, modifier] = timeString.split(' ');
  let hours = parseInt(time.split(':')[0], 10);
  const minutes = parseInt(time.split(':')[1], 10);

  if (hours === 12) {
    hours = 0; // Medianoche o Mediodía se manejan por el modifier
  }
  if (modifier === 'PM') {
    hours += 12;
  }

  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  return today;
}

// Función para formatear el tiempo restante/pasado
function formatTimeDifference(date: Date): string {
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInMinutes = Math.round(diffInMs / 60000);

  if (diffInMinutes > 0) {
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    if (hours > 0) {
      return `en ${hours}h ${minutes}m`;
    } else {
      return `en ${minutes}m`;
    }
  } else if (diffInMinutes < 0) {
    const absDiffInMinutes = Math.abs(diffInMinutes);
     const hours = Math.floor(absDiffInMinutes / 60);
    const minutes = absDiffInMinutes % 60;
     if (hours > 0) {
      return `hace ${hours}h ${minutes}m`;
    } else {
       return `hace ${absDiffInMinutes}m`;
    }
  } else {
    return "ahora";
  }
}

export function DailyAgendaView({ todayAppointments, onSelectPatient, onStartAppointment, onCompleteAppointment, onResetAppointment, onStartConsultation }: DailyAgendaViewProps) {
  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [activeTab, setActiveTab] = useState("pending");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  console.log("Citas para hoy:", todayAppointments);
  console.log("Estado de las citas:", todayAppointments.map(apt => apt.status));
  // Pendiente por debuggear
  console.debug("Variables sin usar \ncurrentTime:\t", currentTime,"onStartAppointment:\t", onStartAppointment);

  // Actualizar el tiempo actual cada minuto para que el tiempo restante se refresque
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Actualizar cada minuto

    return () => clearInterval(timerId); // Limpiar el intervalo al desmontar el componente
  }, []); // El array vacío asegura que el efecto solo se ejecute una vez al montar

  const handlePatientClick = (id: string, name: string) => {
    onSelectPatient?.(id, name);
  };
  /*
  const handleStartAppointment = (id: string) => {
    onStartAppointment?.(id);
    console.log(`Iniciar consulta para cita: ${id}, estado cambiado a Llegó`);
  };
  */

  const handleCompleteAppointment = (id: string) => {
    onCompleteAppointment?.(id);
    console.log(`Cita ${id} marcada como completada.`);
  };

  const handleResetAppointment = (id: string) => {
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
                           const aptDateTime = getDateFromTimeString(apt.time);
                           const timeDiff = formatTimeDifference(aptDateTime);
                           return (
                             <div 
                               key={apt.id} 
                               className="p-2 md:p-3 border rounded-lg hover:shadow-md transition-shadow bg-card cursor-pointer"
                               onClick={() => handlePatientClick(apt.id, apt.patientName)} // Hacer la tarjeta clickeable
                             >
                               
                               
                               {/* Sección principal: Info paciente a la izq, botones a la der */}
                               <div className="flex flex-row items-center justify-between gap-3 md:gap-2">
                                 {/* Info del paciente y servicio (columna izquierda) */}
                                 <div className="flex-1 w-full md:w-auto md:mr-2">
                                    {/* Fila superior: Hora e ícono + posible estado (para completadas) */}
                                    <div className="flex justify-between items-center mb-2">
                                      <div className="flex items-center">
                                        <ClockIcon className="h-4 w-4 mr-1 md:mr-2 text-primary" />
                                          <span className="font-medium text-primary text-sm">{apt.time}</span>
                                          <span className="text-muted-foreground text-xs ml-2">{timeDiff}</span>
                                      </div>
                                    </div>
                                   <div className="flex items-center mb-1">
                                      <UserIcon className="h-5 w-5 mr-2 flex-shrink-0 text-muted-foreground" />
                                      <p className="text-lg md:text-xl font-bold text-foreground">{apt.patientName}</p> {/* Nombre más grande */}
                                   </div>
                                   <p className="text-sm text-muted-foreground md:ml-7">{apt.service}</p> {/* Servicio más pequeño, indentado */}

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
                        filteredAppointments.map((apt) => (
                           <div 
                             key={apt.id} 
                             className="p-2 md:p-3 border rounded-lg hover:shadow-md transition-shadow bg-card cursor-pointer"
                             onClick={() => handlePatientClick(apt.id, apt.patientName)} // Hacer la tarjeta clickeable
                           >
                             {/* Fila superior: Hora e ícono + estado completada */}
                             <div className="flex justify-between items-center mb-1 md:mb-2">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1 md:mr-2 text-primary" />
                      <span className="font-semibold text-primary text-sm md:text-base">{apt.time}</span>
                    </div>
                               <span className="text-xs md:text-sm text-muted-foreground">Completada</span> {/* Estado Completada a la derecha */}
                  </div>
                             
                              {/* Sección principal: Info paciente a la izq, botón a la der */}
                             <div className="flex flex-row items-center justify-between gap-3 md:gap-2">
                                {/* Info del paciente y servicio (columna izquierda) */}
                               <div className="flex-1 w-full md:w-auto md:mr-2">
                  <div className="mb-1 flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 md:mr-2 text-muted-foreground" />
                                   <p className="font-medium text-foreground text-base md:text-lg">{apt.patientName}</p> {/* Nombre del paciente */}
                                 </div>
                                 <p className="text-xs md:text-sm text-muted-foreground md:ml-6">{apt.service}</p> {/* Servicio */}
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
              ))
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
                <span className="font-medium">{selectedAppointment.patientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>{selectedAppointment.time}</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{selectedAppointment.service}</p>
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