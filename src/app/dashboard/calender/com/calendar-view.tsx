"use client";

import * as React from "react";
import { Calendar } from "@rutas/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { ChevronLeftIcon, ChevronRightIcon, LayoutGrid, List, CalendarDays, Clock } from "lucide-react";
import { Button } from "@rutas/components/ui/button";
import { es } from "date-fns/locale";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { EventModal } from "./event-modal";
import { calendarService } from "@/services/calendar-service";
import { CalendarEvent } from "@/types/calendar";

// Mock data for events with more realistic medical appointment data
const events = [
  { 
    id: 1,
    date: new Date(2025, 0, 1), 
    title: "Amalia Solis", 
    time: "09:00", 
    endTime: "09:30",
    type: "Consulta General",
    color: "bg-blue-500",
    status: "confirmada"
  },
  { 
    id: 2,
    date: new Date(2025, 0, 17), 
    title: "Candelaria Luna", 
    time: "10:00", 
    endTime: "10:30",
    type: "Cardiología",
    color: "bg-pink-500",
    status: "pendiente"
  },
  { 
    id: 3,
    date: new Date(2025, 0, 17), 
    title: "Damián Prado", 
    time: "11:00", 
    endTime: "11:30",
    type: "Dermatología",
    color: "bg-green-500",
    status: "confirmada"
  },
  { 
    id: 4,
    date: new Date(2025, 0, 17), 
    title: "Elvira Montes", 
    time: "14:00", 
    endTime: "14:30",
    type: "Neurología",
    color: "bg-yellow-500",
    status: "confirmada"
  },
  { 
    id: 5,
    date: new Date(2025, 0, 17), 
    title: "Gema del Mar", 
    time: "15:00", 
    endTime: "15:30",
    type: "Ginecología",
    color: "bg-purple-500",
    status: "cancelada"
  },
  { 
    id: 6,
    date: new Date(2025, 0, 17), 
    title: "Irene Valle", 
    time: "16:00", 
    endTime: "16:30",
    type: "Pediatría",
    color: "bg-indigo-500",
    status: "confirmada"
  },
  { 
    id: 7,
    date: new Date(2025, 0, 19), 
    title: "Carlos Mendoza", 
    time: "09:30", 
    endTime: "10:00",
    type: "Consulta General",
    color: "bg-blue-500",
    status: "confirmada"
  },
  { 
    id: 8,
    date: new Date(2025, 0, 19), 
    title: "María González", 
    time: "11:00", 
    endTime: "11:30",
    type: "Oftalmología",
    color: "bg-orange-500",
    status: "pendiente"
  },
];

type ViewMode = "month" | "week" | "day";
type Event = typeof events[0];

export default function CalendarView({ consultorioId }: { consultorioId?: string }) {
  // Estado para controlar la vista (mes, semana, día)
  const [viewMode, setViewMode] = React.useState<ViewMode>("week");
  // Determinar si es vista móvil para ajustar la altura de las celdas
  const [isMobile, setIsMobile] = React.useState(false);
  // Estado para el modal de eventos
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = React.useState<Event[]>([]);
  const [selectedEventDate, setSelectedEventDate] = React.useState<Date | null>(null);
  
  // Estado para la fecha actual y navegación
  const [currentDate, setCurrentDate] = React.useState(new Date(2025, 0, 17)); // Enero 17, 2025
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date(2025, 0, 17));
  
  // Estado para Google Calendar
  const [googleEvents, setGoogleEvents] = React.useState<CalendarEvent[]>([]);
  const [calendarId, setCalendarId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);
  const [useGoogleCalendar, setUseGoogleCalendar] = React.useState(!!consultorioId);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Obtener ID del calendario del consultorio
  React.useEffect(() => {
    if (!consultorioId || !useGoogleCalendar) return;
    
    const getCalendarId = async () => {
      try {
        // Obtener desde tu BD local o API
        const consultorio = await fetch(`/api/consultorios/${consultorioId}`);
        const data = await consultorio.json();
        setCalendarId(data.googleCalendarId);
      } catch (error) {
        console.error('Error getting calendar ID:', error);
        setUseGoogleCalendar(false); // Fallback a eventos mock
      }
    };
    
    getCalendarId();
  }, [consultorioId, useGoogleCalendar]);

  // Cargar eventos desde Google Calendar
  React.useEffect(() => {
    if (!useGoogleCalendar || !calendarId) {
      setLoading(false);
      return;
    }
    
    const loadEvents = async () => {
      setLoading(true);
      try {
        const { start, end } = getDateRange();
        const googleEventsData = await calendarService.getConsultorioEvents(
          calendarId,
          { start, end }
        );
        
        // Convertir formato de Google a tu formato
        const formattedEvents = googleEventsData.map(event => ({
          id: event.id || '',
          date: event.start,
          title: event.patientData?.patient || event.title,
          time: format(event.start, 'HH:mm'),
          endTime: format(event.end, 'HH:mm'),
          type: event.patientData?.type || 'Consulta General',
          color: getColorByType(event.patientData?.type),
          status: event.patientData?.status || 'confirmada'
        }));
        
        setGoogleEvents(googleEventsData);
      } catch (error) {
        console.error('Error loading events:', error);
        setUseGoogleCalendar(false); // Fallback a eventos mock
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [calendarId, currentDate, viewMode, useGoogleCalendar]);

  // Funciones de navegación
  const goToPrevious = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (viewMode === "month") {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(newDate);
    } else if (viewMode === "day") {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === "month") {
      const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(newDate);
    } else if (viewMode === "day") {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Obtener el rango de fechas según la vista
  const getDateRange = () => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else if (viewMode === "day") {
      return { start: currentDate, end: currentDate, days: [currentDate] };
    }
    // Para vista mensual, mantener la lógica existente
    return { start: currentDate, end: currentDate, days: [] };
  };

  // Función para obtener color por tipo de consulta
  const getColorByType = (type?: string): string => {
    const colors: Record<string, string> = {
      'Consulta General': 'bg-blue-500',
      'Cardiología': 'bg-pink-500',
      'Dermatología': 'bg-green-500',
      'Neurología': 'bg-yellow-500',
      'Ginecología': 'bg-purple-500',
      'Pediatría': 'bg-indigo-500',
      'Oftalmología': 'bg-orange-500',
    };
    return colors[type || 'Consulta General'] || 'bg-blue-500';
  };

  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Date): Event[] => {
    if (useGoogleCalendar && googleEvents.length > 0) {
      // Convertir eventos de Google Calendar al formato local
      return googleEvents
        .filter(event => isSameDay(event.start, date))
        .map((event, index) => ({
          id: event.id ? parseInt(event.id.replace(/\D/g, '')) || index + 1000 : index + 1000,
          date: event.start,
          title: event.patientData?.patient || event.title,
          time: format(event.start, 'HH:mm'),
          endTime: format(event.end, 'HH:mm'),
          type: event.patientData?.type || 'Consulta General',
          color: getColorByType(event.patientData?.type),
          status: event.patientData?.status || 'confirmada'
        }));
    }
    return events.filter(event => isSameDay(event.date, date));
  };

  // Formatear el título según la vista
  const getViewTitle = () => {
    if (viewMode === "week") {
      const { start, end } = getDateRange();
      if (start.getMonth() === end.getMonth()) {
        return format(start, "d", { locale: es }) + " - " + format(end, "d 'de' MMMM yyyy", { locale: es });
      } else {
        return format(start, "d 'de' MMM", { locale: es }) + " - " + format(end, "d 'de' MMM yyyy", { locale: es });
      }
    } else if (viewMode === "day") {
      return format(currentDate, "EEEE d 'de' MMMM yyyy", { locale: es });
    } else {
      return format(currentDate, "MMMM yyyy", { locale: es });
    }
  };

  // Función para abrir el modal con los eventos del día seleccionado
  const openEventModal = (dayDate: Date, dayEvents: Event[]) => {
    setSelectedEventDate(dayDate);
    setSelectedDayEvents(dayEvents);
    setIsModalOpen(true);
  };

  // Función para cerrar el modal
  const closeEventModal = () => {
    setIsModalOpen(false);
    setSelectedDayEvents([]);
    setSelectedEventDate(null);
  };

  // Función para crear nueva cita
  const createNewAppointment = async (appointmentData: any) => {
    if (!useGoogleCalendar || !calendarId) {
      console.warn('Google Calendar not available, cannot create appointment');
      return;
    }
    
    try {
      await calendarService.createAppointment(calendarId, appointmentData);
      // Recargar eventos
      const { start, end } = getDateRange();
      const googleEventsData = await calendarService.getConsultorioEvents(
        calendarId,
        { start, end }
      );
      setGoogleEvents(googleEventsData);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  // Renderizar vista semanal
  const renderWeekView = () => {
    const { days } = getDateRange();
    const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 gap-0 min-h-full">
          {/* Columna de horas */}
          <div className="border-r border-border">
            <div className="h-12 border-b border-border"></div>
            {timeSlots.map((hour) => (
              <div key={hour} className="h-16 border-b border-border flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {days.map((day, dayIndex) => {
            const dayEvents = getEventsForDate(day);
            return (
              <div key={dayIndex} className="border-r border-border last:border-r-0">
                {/* Header del día */}
                <div className={cn(
                  "h-12 border-b border-border flex flex-col items-center justify-center p-1",
                  isToday(day) ? "bg-primary/10" : ""
                )}>
                  <div className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: es })}
                  </div>
                  <div className={cn(
                    "text-sm font-medium",
                    isToday(day) ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""
                  )}>
                    {format(day, "d")}
                  </div>
                </div>

                {/* Slots de tiempo */}
                <div className="relative">
                  {timeSlots.map((hour) => (
                    <div key={hour} className="h-16 border-b border-border relative">
                      {/* Eventos en este slot de tiempo */}
                      {dayEvents
                        .filter(event => {
                          const eventHour = parseInt(event.time.split(':')[0]);
                          return eventHour === hour;
                        })
                        .map((event, eventIndex) => (
                          <div
                            key={event.id}
                            className={cn(
                              "absolute left-1 right-1 top-1 rounded p-1 text-xs cursor-pointer",
                              event.color,
                              "text-white",
                              event.status === "cancelada" ? "opacity-50 line-through" : ""
                            )}
                            style={{
                              height: '28px',
                              zIndex: eventIndex + 1
                            }}
                            onClick={() => openEventModal(day, [event])}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-[10px] opacity-90">{event.time} - {event.endTime}</div>
                          </div>
                        ))
                      }
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar vista de día
  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);
    const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {timeSlots.map((hour) => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = parseInt(event.time.split(':')[0]);
              return eventHour === hour;
            });

            return (
              <div key={hour} className="flex border-b border-border min-h-[60px]">
                <div className="w-20 flex-shrink-0 p-2 text-right">
                  <span className="text-sm text-muted-foreground">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-2 rounded-lg cursor-pointer",
                        event.color,
                        "text-white",
                        event.status === "cancelada" ? "opacity-50 line-through" : ""
                      )}
                      onClick={() => openEventModal(currentDate, [event])}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm opacity-90">{event.time} - {event.endTime}</div>
                      <div className="text-xs opacity-75">{event.type}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  if (loading && useGoogleCalendar) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando eventos del calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-card-foreground rounded-lg p-2 md:p-4">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Calendario</h1>
          {useGoogleCalendar && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Google Calendar
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToToday}
            className="text-sm"
          >
            Hoy
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Navegación */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="min-w-[200px] text-center">
              <h2 className="text-lg font-medium capitalize">{getViewTitle()}</h2>
            </div>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Selector de vista */}
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode("month")} 
              className={cn("rounded-none px-3", viewMode === "month" ? "bg-primary text-primary-foreground" : "")}>
              <LayoutGrid className="h-4 w-4 mr-1" />
              {!isMobile && "Mes"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode("week")} 
              className={cn("rounded-none px-3", viewMode === "week" ? "bg-primary text-primary-foreground" : "")}>
              <CalendarDays className="h-4 w-4 mr-1" />
              {!isMobile && "Semana"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode("day")} 
              className={cn("rounded-none px-3", viewMode === "day" ? "bg-primary text-primary-foreground" : "")}>
              <Clock className="h-4 w-4 mr-1" />
              {!isMobile && "Día"}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal según la vista seleccionada */}
      <div className="flex-1 overflow-hidden border border-border rounded-lg">
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
        {viewMode === "month" && (
          <div className="flex-grow overflow-auto w-full p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border-0 p-0 w-full"
              month={currentDate}
              locale={es}
              weekStartsOn={0}
              components={{
                DayButton: ({ day, modifiers, ...props }) => {
                  const dayDate = day.date;
                  const dayEvents = getEventsForDate(dayDate);
                  
                  const isDayToday = isToday(dayDate);
                  const isSelected = selectedDate && isSameDay(selectedDate, dayDate);
                  
                  return (
                    <button
                      {...props}
                      className={cn(
                        "relative w-full flex flex-col items-start p-1 rounded-lg cursor-pointer h-auto min-h-[70px] border-0 bg-transparent hover:bg-primary/5",
                        isSelected ? "bg-primary/10" : "bg-primary/3",
                        isDayToday ? "ring-2 ring-primary" : "",
                        modifiers.selected ? "bg-primary/10" : "",
                        modifiers.today ? "ring-2 ring-primary" : ""
                      )}
                      onClick={(e) => {
                        props.onClick?.(e);
                        if (dayEvents.length > 0) {
                          openEventModal(dayDate, dayEvents);
                        }
                      }}
                    >
                      <div className="flex justify-between w-full items-center">
                        <div className={cn(
                          "text-sm font-medium",
                          isSelected || modifiers.selected ? "text-primary" : ""
                        )}>
                          {dayDate.getDate()}
                        </div>
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5">
                            {dayEvents.slice(0, 3).map((event, index) => (
                              <div 
                                key={event.id} 
                                className={`w-2 h-2 rounded-full ${event.color}`}
                                title={`${event.title} - ${event.time}`}
                              />
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Mostrar algunos eventos en la vista mensual */}
                      <div className="w-full mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div 
                            key={event.id}
                            className={cn(
                              "text-[10px] px-1 py-0.5 rounded text-white truncate",
                              event.color,
                              event.status === "cancelada" ? "opacity-50 line-through" : ""
                            )}
                          >
                            {event.time} {event.title}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                },
              }}
              classNames={{
                table: "w-full h-full border-collapse table-fixed",
                head_row: "flex w-full mb-2",
                head_cell: "text-muted-foreground w-full text-center font-medium text-sm py-2",
                row: "flex w-full min-w-full gap-1 mb-1",
                cell: "text-center p-1 relative w-full flex-1",
                day: "h-full w-full p-1 font-normal aria-selected:opacity-100 flex flex-col items-start justify-start",
                day_selected: "",
                day_today: "",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
              formatters={{
                formatWeekdayName: (day) => {
                  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                  return weekdays[day.getDay()];
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Modal para mostrar eventos */}
      <EventModal 
        isOpen={isModalOpen} 
        onClose={closeEventModal} 
        date={selectedEventDate} 
        events={selectedDayEvents} 
      />
    </div>
  );
}