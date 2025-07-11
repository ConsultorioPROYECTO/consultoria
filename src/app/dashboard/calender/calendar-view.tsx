'use client'

import * as React from "react";
import { Calendar } from "@rutas/components/ui/calendar";
import { ChevronLeftIcon, ChevronRightIcon, LayoutGrid, CalendarDays, Clock, ChevronDown } from "lucide-react";
import { Button } from "@rutas/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rutas/components/ui/dropdown-menu";
import { es } from "date-fns/locale";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { EventModal } from "./event-modal";
import { CalendarEvent } from "@/types/calendar";
import { useAuth } from "../../context/AuthContext";
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils";
import dynamic from "next/dynamic";

// Importación dinámica del DatePicker
const DatePicker = dynamic(() => import("./date-picker"), {
  ssr: false,
  loading: () => <div className="w-[120px] h-8 bg-muted animate-pulse rounded-md" />
});

// Importación dinámica del DateRangePicker
const DateRangePicker = dynamic(() => import("./date-range-picker"), {
  ssr: false,
  loading: () => <div className="w-[200px] h-8 bg-muted animate-pulse rounded-md" />
});

// Los eventos ahora se cargan dinámicamente desde la API

type ViewMode = "month" | "week" | "day";
type Event = {
  id: number;
  date: Date;
  title: string;
  time: string;
  endTime: string;
  type: string;
  color: string;
  status: string;
};

export default function CalendarView({ consultorioId }: { consultorioId?: string }) {
  // Hook de autenticación para obtener el doctorId
  const { doctorId, user } = useAuth();
  
  // Determinar si es vista móvil para ajustar la altura de las celdas
  const [isMobile, setIsMobile] = React.useState(false);
  // Estado para controlar la vista (mes, semana, día) - día en móvil, semana en desktop
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? "day" : "week";
    }
    return "week";
  });
  // Estado para el modal de eventos
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = React.useState<Event[]>([]);
  const [selectedEventDate, setSelectedEventDate] = React.useState<Date | null>(null);
  
  // Estado para la fecha actual y navegación
  const [currentDate, setCurrentDate] = React.useState(new Date()); // Fecha actual
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  
  // Estado para el mes mostrado en los componentes (sincronización)
  const [sharedDisplayMonth, setSharedDisplayMonth] = React.useState(new Date());
  
  // Estado para la línea de tiempo actual
  const [currentTime, setCurrentTime] = React.useState(new Date());
  
  // Estado para eventos del doctor
  const [doctorEvents, setDoctorEvents] = React.useState<CalendarEvent[]>([]);
  const [, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Actualizar la hora actual cada minuto
  React.useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(new Date());
    };

    // Actualizar inmediatamente
    updateCurrentTime();

    // Actualizar cada minuto
    const interval = setInterval(updateCurrentTime, 60000);

    return () => clearInterval(interval);
  }, []);

  // Obtener el rango de fechas según la vista
  const getDateRange = React.useCallback(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else if (viewMode === "day") {
      return { start: currentDate, end: currentDate, days: [currentDate] };
    }
    // Para vista mensual, mantener la lógica existente
    return { start: currentDate, end: currentDate, days: [] };
  }, [viewMode, currentDate]);

  // Cargar eventos del doctor
  React.useEffect(() => {
    const loadEvents = async () => {
      if (!doctorId || !user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const token = await getFirebaseAuthToken();
        if (!token) {
          throw new Error('No authentication token available');
        }
        
        // Obtener rango de fechas para la vista actual
        const { start, end } = getDateRange();
        const startDate = startOfDay(start).toISOString();
        const endDate = endOfDay(end).toISOString();
        
        const response = await fetch(
          `/api/doctors/${doctorId}/calendar/events?startDate=${startDate}&endDate=${endDate}&eventType=appointment`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch doctor events');
        }
        
        const eventsData = await response.json();
        
        // Mapear eventos de la API al formato esperado
        const mappedEvents = (eventsData.events || []).map((event: { id?: string; startDateTime: string; endDateTime: string; summary?: string; description?: string; location?: string }, index: number) => ({
          id: event.id || `event-${index}`,
          start: event.startDateTime, // La API devuelve startDateTime como string ISO
          end: event.endDateTime,     // La API devuelve endDateTime como string ISO
          title: event.summary || 'Cita médica',
          description: event.description || '',
          location: event.location || '',
          type: 'appointment'
        }));
        
        setDoctorEvents(mappedEvents);
      } catch (error) {
        console.error('Error loading doctor events:', error);
        setDoctorEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [doctorId, user, currentDate, viewMode, consultorioId, getDateRange]);

  // Sincronizar sharedDisplayMonth cuando currentDate cambie
  React.useEffect(() => {
    setSharedDisplayMonth(currentDate);
  }, [currentDate]);

  // Manejar cambios de mes desde los componentes
  const handleSharedMonthChange = (newMonth: Date) => {
    setSharedDisplayMonth(newMonth);
    // Opcionalmente actualizar currentDate también para mantener sincronización
    setCurrentDate(newMonth);
  };

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


  // Obtener eventos para una fecha específica
  const getEventsForDate = (date: Date): Event[] => {
    // Convertir eventos del doctor al formato local
    return doctorEvents
      .filter(event => {
        const eventDate = new Date(event.start);
        return isSameDay(eventDate, date);
      })
      .map((event, index) => ({
        id: event.id ? parseInt(event.id.replace(/\D/g, '')) || index + 1000 : index + 1000,
        date: new Date(event.start),
        title: event.title || 'Cita médica',
        time: format(new Date(event.start), 'HH:mm'),
        endTime: format(new Date(event.end), 'HH:mm'),
        type: 'Cita médica',
        color: 'bg-blue-500', // Color único para todos los eventos
        status: 'confirmada'
      }));
  };

  // Formatear el título según la vista
  const getViewTitle = () => {
    if (viewMode === "week") {
      const { start, end } = getDateRange();
      if (start.getMonth() === end.getMonth()) {
        return format(start, "d", { locale: es }) + " - " + format(end, "d MMM yyyy", { locale: es });
      } else {
        return format(start, "d MMM", { locale: es }) + " - " + format(end, "d MMM yyyy", { locale: es });
      }
    } else if (viewMode === "day") {
      return format(currentDate, "EEEE d MMM yyyy", { locale: es });
    } else {
      return format(currentDate, "MMMM yyyy", { locale: es });
    }
  };

  // Función para obtener solo el mes y año para el título principal
  const getMonthTitle = () => {
    return {
      month: format(currentDate, "MMMM", { locale: es }),
      year: format(currentDate, "yyyy", { locale: es })
    };
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

  // Función para calcular la posición y altura de un evento
  const calculateEventPosition = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    // Calcular minutos desde la 1:00 AM
    const startMinutes = (startHour - 1) * 60 + startMinute;
    const endMinutes = (endHour - 1) * 60 + endMinute;
    
    // Cada hora tiene 64px (h-16), entonces cada minuto es 64/60 = 1.067px
    const pixelsPerMinute = 64 / 60;
    
    const top = startMinutes * pixelsPerMinute;
    const height = (endMinutes - startMinutes) * pixelsPerMinute;
    
    return { top, height };
  };

  // Función para calcular la posición de la línea de tiempo actual
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Solo mostrar la línea si estamos en horario visible (1 AM - 11 PM)
    if (currentHour < 1 || currentHour >= 23) {
      return null;
    }
    
    // Calcular minutos desde la 1:00 AM
    const minutesFromStart = (currentHour - 1) * 60 + currentMinute;
    
    // Cada hora tiene 64px (h-16), entonces cada minuto es 64/60 = 1.067px
    const pixelsPerMinute = 64 / 60;
    
    return minutesFromStart * pixelsPerMinute;
  };

  // Componente de línea de tiempo actual
  const CurrentTimeLine = ({ isToday }: { isToday: boolean }) => {
    const position = getCurrentTimePosition();
    
    if (!isToday || position === null) {
      return null;
    }
    
    return (
      <div 
        className="absolute left-0 right-0 z-50 flex items-center pointer-events-none"
        style={{ top: `${position}px` }}
      >
        <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg flex-shrink-0"></div>
        <div className="flex-1 h-0.5 bg-red-500 shadow-sm"></div>
      </div>
    );
  };

  // Renderizar vista semanal
  const renderWeekView = () => {
    const { days } = getDateRange();
    const timeSlots = Array.from({ length: 23 }, (_, i) => i + 1); // 1 AM to 11 PM

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 gap-0 min-h-full">
          {/* Columna de horas */}
          <div className="border-r border-border relative">
            <div className="h-12 border-b border-border"></div>
            {/* Fila adicional vacía */}
            <div className="h-16 border-b border-border"></div>
            <div className="relative" style={{ height: `${23 * 64}px` }}>
              {timeSlots.map((hour, index) => (
                <div key={hour} className="absolute w-full" style={{ top: `${index * 64}px` }}>
                  <div className="h-16 border-b border-border relative">
                    {/* Etiqueta de hora posicionada en la línea divisoria */}
                    <div className="absolute -top-2 right-2 text-right bg-background px-1">
                      <div className="text-xs text-muted-foreground">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columnas de días */}
          {days.map((day, dayIndex) => {
            const dayEvents = getEventsForDate(day);
            const isDayToday = isToday(day);
            return (
              <div key={dayIndex} className="border-r border-border last:border-r-0 relative">
                {/* Header del día */}
                <div className={cn(
                  "h-12 border-b border-border flex flex-col items-center justify-center p-1",
                  isDayToday ? "bg-primary/10" : ""
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
                {/* Fila adicional vacía */}
                <div className="h-16 border-b border-border"></div>

                {/* Contenedor de eventos con posicionamiento absoluto */}
                <div className="relative" style={{ height: `${23 * 64}px` }}>
                  {/* Líneas de tiempo de fondo */}
                  {timeSlots.map((hour) => (
                    <div key={hour} className="h-16 border-b border-border absolute w-full" style={{ top: `${(hour - 1) * 64}px` }}>
                    </div>
                  ))}
                  
                  {/* Línea de tiempo actual */}
                  <CurrentTimeLine isToday={isDayToday} />
                  
                  {/* Eventos posicionados según su tiempo real */}
                  {dayEvents.map((event, eventIndex) => {
                    const { top, height } = calculateEventPosition(event.time, event.endTime);
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute left-1 right-1 rounded p-1 text-xs cursor-pointer overflow-hidden",
                          event.color,
                          "text-white",
                          event.status === "cancelada" ? "opacity-50 line-through" : ""
                        )}
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 20)}px`, // Altura mínima de 20px
                          zIndex: eventIndex + 1
                        }}
                        onClick={() => openEventModal(day, [event])}
                      >
                        <div className="font-medium truncate text-[11px]">{event.title}</div>
                        {height > 30 && (
                          <div className="text-[9px] opacity-90">{event.time} - {event.endTime}</div>
                        )}
                        {height > 45 && (
                          <div className="text-[9px] opacity-75">{event.type}</div>
                        )}
                      </div>
                    );
                  })}
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
    const timeSlots = Array.from({ length: 23 }, (_, i) => i + 1); // 1 AM to 11 PM

    return (
      <div className="flex-1 overflow-auto">
        <div className="flex w-full">
          {/* Columna de horas */}
          <div className="w-20 flex-shrink-0 relative">
            {/* Header vacío para alineación */}
            <div className="h-12 border-b border-border"></div>
            {/* Fila adicional vacía */}
            <div className="h-16 border-b border-border"></div>
            <div className="relative" style={{ height: `${23 * 64}px` }}>
              {timeSlots.map((hour, index) => (
                <div key={hour} className="absolute w-full" style={{ top: `${index * 64}px` }}>
                  <div className="h-16 border-b border-border relative">
                    {/* Etiqueta de hora posicionada en la línea divisoria */}
                    <div className="absolute -top-2 right-2 text-right bg-background px-1">
                      <div className="text-sm text-muted-foreground">
                        {hour.toString().padStart(2, '0')}:00
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Área de eventos */}
          <div className="flex-1 relative border-l border-border">
            {/* Header del día */}
            <div className={cn(
              "h-12 border-b border-border flex flex-col items-center justify-center p-1",
              isToday(currentDate) ? "bg-primary/10" : ""
            )}>
              <div className="text-xs text-muted-foreground uppercase">
                {format(currentDate, "EEE", { locale: es })}
              </div>
              <div className={cn(
                "text-sm font-medium",
                isToday(currentDate) ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""
              )}>
                {format(currentDate, "d")}
              </div>
            </div>
            {/* Fila adicional vacía */}
            <div className="h-16 border-b border-border"></div>
            
            <div className="relative" style={{ height: `${23 * 64}px` }}>
            {/* Líneas de tiempo de fondo */}
            {timeSlots.map((hour) => (
              <div key={hour} className="h-16 border-b border-border absolute w-full" style={{ top: `${(hour - 1) * 64}px` }}>
              </div>
            ))}
            
            {/* Línea de tiempo actual */}
            <CurrentTimeLine isToday={isToday(currentDate)} />
            
            {/* Eventos posicionados según su tiempo real */}
            {dayEvents.map((event, eventIndex) => {
              const { top, height } = calculateEventPosition(event.time, event.endTime);
              return (
                <div
                  key={event.id}
                  className={cn(
                    "absolute left-2 right-2 rounded p-2 cursor-pointer overflow-hidden",
                    event.color,
                    "text-white",
                    event.status === "cancelada" ? "opacity-50 line-through" : ""
                  )}
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 30)}px`, // Altura mínima de 30px para vista de día
                    zIndex: eventIndex + 1
                  }}
                  onClick={() => openEventModal(currentDate, [event])}
                >
                  <div className="font-medium text-sm">{event.title}</div>
                  {height > 40 && (
                    <div className="text-xs opacity-90">{event.time} - {event.endTime}</div>
                  )}
                  {height > 55 && (
                    <div className="text-xs opacity-75">{event.type}</div>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        </div>
      </div>
    );
  };




  return (
    <div className="flex flex-col h-full w-full bg-transparent text-card-foreground rounded-lg">
      {/* Header con controles */}
      <div className="mb-6 space-y-4">
        {/* Primera fila: Título y botón Hoy */}
        <div className="flex justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground capitalize">
            <div>{getMonthTitle().month}</div>
            <div className="text-muted-foreground">{getMonthTitle().year}</div>
          </h1>
          
          <div className="flex flex-col items-end justify-between ">
            <Button 
              variant={isToday(currentDate) ? "default" : "outline"} 
              size="sm" 
              onClick={goToToday}
              className={cn(
                isToday(currentDate) 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground"
              )}
            >
              Hoy
            </Button>
            {/* Selector de vista */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 md:gap-2 flex-shrink-0">
                    {viewMode === "month" && <LayoutGrid className="h-4 w-4" />}
                    {viewMode === "week" && <CalendarDays className="h-4 w-4" />}
                    {viewMode === "day" && <Clock className="h-4 w-4" />}
                    {!isMobile && viewMode === "month" && "Mes"}
                    {!isMobile && viewMode === "week" && "Semana"}
                    {!isMobile && viewMode === "day" && "Día"}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setViewMode("day")}>
                    <Clock className="h-4 w-4 mr-2" />
                    Día
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode("week")}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Semana
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode("month")}>
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Mes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>

        {/* Segunda fila: Controles de navegación y vista */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Navegación */}
          <div className="flex justify-between items-center gap-2 flex-1 min-w-0">
            <Button variant="outline" size={isMobile ? "sm" : "icon"} onClick={goToPrevious} className="flex-shrink-0">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
              {viewMode === "day" ? (
                <DatePicker 
                  selectedDate={currentDate}
                  onDateSelect={(date) => {
                    if (date) {
                      setCurrentDate(date);
                      setSelectedDate(date);
                    }
                  }}
                  displayMonth={sharedDisplayMonth}
                  onMonthChange={handleSharedMonthChange}
                />
              ) : (
                <DateRangePicker 
                  currentDate={currentDate}
                  onRangeSelect={(range) => {
                    setCurrentDate(range.start);
                  }}
                  displayMonth={sharedDisplayMonth}
                  onMonthChange={handleSharedMonthChange}
                />
              )}
            <Button variant="outline" size={isMobile ? "sm" : "icon"} onClick={goToNext} className="flex-shrink-0">
              <ChevronRightIcon className="h-4 w-4" />
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
                            {dayEvents.slice(0, 3).map((event) => (
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