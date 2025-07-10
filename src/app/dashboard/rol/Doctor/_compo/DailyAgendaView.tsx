// src/app/dashboard/rol/Doctor/compo/DailyAgendaView.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ClockIcon, UserIcon, Play, MapPinIcon, VideoIcon, Coffee } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentEventData, BreakTimeEventData } from "@/types/google-calendar";
import { DateTime } from 'luxon';

type CalendarEvent = AppointmentEventData | BreakTimeEventData;

// Type guard to check if an event is an appointment
function isAppointmentEvent(event: CalendarEvent): event is AppointmentEventData {
  return 'patientId' in event;
}

interface DailyAgendaViewProps {
  calendarEvents: CalendarEvent[];
  onStartConsultation?: (appointment: AppointmentEventData) => void;
}

export function DailyAgendaView({ calendarEvents, onStartConsultation }: DailyAgendaViewProps) {
  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const [activeTab, setActiveTab] = useState("pending");

  const formatEventTime = (event: CalendarEvent): string => {
    const startTime = DateTime.fromISO(event.startDateTime as unknown as string);
    const endTime = DateTime.fromISO(event.endDateTime as unknown as string);
    return `${startTime.toFormat('HH:mm')} - ${endTime.toFormat('HH:mm')}`;
  };

  const getEventDuration = (event: CalendarEvent): string => {
    const start = DateTime.fromISO(event.startDateTime as unknown as string);
    const end = DateTime.fromISO(event.endDateTime as unknown as string);
    const duration = end.diff(start, 'minutes').minutes;
    return `${duration}min`;
  };

  const handleStartConsultationClick = (e: React.MouseEvent, appointment: AppointmentEventData) => {
    e.stopPropagation();
    onStartConsultation?.(appointment);
  };

  const filteredEvents = calendarEvents.filter(event => {
    if (activeTab === "pending") {
      return !isAppointmentEvent(event) || (isAppointmentEvent(event) && event.appointmentStatus !== "Completada");
    } else if (activeTab === "completed") {
      return isAppointmentEvent(event) && event.appointmentStatus === "Completada";
    }
    return false;
  });

  return (
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
            <TabsTrigger value="pending">Pendientes ({calendarEvents.filter(e => !isAppointmentEvent(e) || e.appointmentStatus !== 'Completada').length})</TabsTrigger>
            <TabsTrigger value="completed">Atendidas ({calendarEvents.filter(e => isAppointmentEvent(e) && e.appointmentStatus === 'Completada').length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="m-0 flex-grow">
            <ScrollArea className="h-[430px]">
              <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    <div key={event.id} className="p-2 md:p-3 border rounded-lg hover:shadow-md transition-shadow bg-card">
                      {isAppointmentEvent(event) ? (
                        // Render Appointment
                        <div className="flex flex-row items-center justify-between gap-3 md:gap-2">
                          <div className="flex-1 w-full md:w-auto md:mr-2">
                            <div className="flex items-center mb-2">
                              <ClockIcon className="h-4 w-4 mr-1 md:mr-2 text-primary" />
                              <span className="font-medium text-primary text-sm">
                                {formatEventTime(event)} ({getEventDuration(event)})
                              </span>
                            </div>
                            <div className="flex items-center mb-1">
                              <UserIcon className="h-5 w-5 mr-2 flex-shrink-0 text-muted-foreground" />
                              <p className="text-lg md:text-xl font-bold text-foreground">{event.summary}</p>
                            </div>
                            <p className="text-sm text-muted-foreground md:ml-7 mb-1">{event.description}</p>
                            <div className="space-y-1">
                              {event.location && <div className="flex items-center text-xs text-muted-foreground md:ml-7"><MapPinIcon className="h-3 w-3 mr-1" /><span>{event.location}</span></div>}
                              {event.meetingLink && <div className="flex items-center text-xs text-muted-foreground md:ml-7"><VideoIcon className="h-3 w-3 mr-1" /><a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Unirse a la reunión</a></div>}
                              <div className="flex items-center text-xs text-muted-foreground md:ml-7"><span>Estado: {event.appointmentStatus}</span></div>
                            </div>
                          </div>
                          <div className="flex flex-row space-x-2 items-center self-center md:flex-col md:space-y-2 md:space-x-0 md:items-stretch md:self-end flex-shrink-0">
                            <Button onClick={(e) => handleStartConsultationClick(e, event)} variant="outline" className="flex items-center justify-center rounded-md text-xs p-2 h-9 w-9 md:w-full md:px-3 md:h-8 lg:w-auto">
                              <Play className="h-4 w-4 md:mr-2" />
                              <span className="hidden md:inline">Iniciar</span>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Render Break
                        <div className="flex flex-row items-center gap-3 md:gap-4">
                            <Coffee className="h-5 w-5 mr-2 flex-shrink-0 text-muted-foreground" />
                            <div className="flex-1">
                                <div className="flex items-center mb-1">
                                    <span className="font-medium text-foreground">{event.summary}</span>
                                    <span className="text-muted-foreground ml-2 text-sm">({(event as BreakTimeEventData).breakTimeType})</span>
                                </div>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <ClockIcon className="h-4 w-4 mr-1" />
                                    <span>{formatEventTime(event)}</span>
                                </div>
                            </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hay citas ni descansos pendientes.</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="completed" className="m-0 flex-grow overflow-y-auto">
            <ScrollArea className="h-[430px]">
              <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((event) => (
                    isAppointmentEvent(event) && (
                        <div key={event.id} className="p-2 md:p-3 border rounded-lg hover:shadow-md transition-shadow bg-card">
                            <div className="flex justify-between items-center mb-1 md:mb-2">
                                <div className="flex items-center">
                                    <ClockIcon className="h-4 w-4 mr-1 md:mr-2 text-primary" />
                                    <span className="font-semibold text-primary text-sm md:text-base">
                                        {formatEventTime(event)} ({getEventDuration(event)})
                                    </span>
                                </div>
                                <span className="text-xs md:text-sm text-muted-foreground">Completada</span>
                            </div>
                            <div className="flex flex-row items-center justify-between gap-3 md:gap-2">
                                <div className="flex-1 w-full md:w-auto md:mr-2">
                                    <div className="mb-1 flex items-center">
                                        <UserIcon className="h-4 w-4 mr-1 md:mr-2 text-muted-foreground" />
                                        <p className="font-medium text-foreground text-base md:text-lg">{event.summary}</p>
                                    </div>
                                    <p className="text-xs md:text-sm text-muted-foreground md:ml-6 mb-1">{event.description}</p>
                                </div>
                            </div>
                        </div>
                    )
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
  );
}
