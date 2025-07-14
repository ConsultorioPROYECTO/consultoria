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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rutas/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@rutas/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { es } from "date-fns/locale";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, startOfDay, endOfDay } from "date-fns";
import { EventModal } from "./event-modal";
import { CalendarEvent } from "@/types/calendar";
import { useAuth } from "../../context/AuthContext";
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils";
import dynamic from "next/dynamic";
import { toast } from "sonner";

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

// Los eventos ahora se cargan dinámicamente desde la API http://localhost:3000/api/assitantants/doctors-with-appointments

type ViewMode = "month" | "week" | "day";
type Event = {
  id: string;
  date: Date;
  title: string;
  time: string;
  endTime: string;
  type: string;
  color: string;
  status: string;
  doctorId?: number;
};

type Doctor = {
  id: number;
  displayName: string;
  email: string;
  idDoctor: number;
};

export default function CalendarView({ consultorioId }: { consultorioId?: string }) {
  // Hook de autenticación para obtener el doctorId
  const { doctorId, user, userRole } = useAuth();
  
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
  const [loading, setLoading] = React.useState(true);
  
  // Estado para filtro de doctores
  const [availableDoctors, setAvailableDoctors] = React.useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>(""); // Doctor específico seleccionado
  const [openDoctorCombo, setOpenDoctorCombo] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar doctores disponibles
  React.useEffect(() => {
    const loadDoctors = async () => {
      if (!user) return;
      
      try {
        const token = await getFirebaseAuthToken();
        if (!token) return;
        
        let doctors: Doctor[] = [];
        
        if (userRole === 'asistente') {
          // Para asistentes, usar la API específica que obtiene solo doctores asignados
          const response = await fetch('/api/assitantants/doctors-with-appointments', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn('Failed to fetch assigned doctors for assistant');
            return;
          }
          
          const assistantData = await response.json();
          
          // Definir interfaz para los datos de doctores asignados
          interface AssignedDoctor {
            idDoctor: number;
            userId?: string;
            user?: {
              displayName?: string;
              email?: string;
            };
          }
          
          // Mapear los doctores asignados al formato esperado
          doctors = (assistantData.data || []).map((doctor: AssignedDoctor) => ({
            id: doctor.userId?.toString() || doctor.idDoctor.toString(),
            displayName: doctor.user?.displayName || doctor.user?.email || `Doctor ${doctor.idDoctor}`,
            email: doctor.user?.email || '',
            idDoctor: doctor.idDoctor
          }));
        } else {
          // Para administradores y otros roles, usar la API de usuarios
          const response = await fetch('/api/users', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.warn('Failed to fetch users for doctor selection');
            return;
          }
          
          const users = await response.json();
          
          // Filtrar solo usuarios con rol 'medico' y que tengan idDoctor
          interface UserFromAPI {
            id: string;
            role: string;
            idDoctor?: number;
            displayName?: string;
            email: string;
          }
          
          doctors = users
            .filter((user: UserFromAPI) => user.role === 'medico' && user.idDoctor)
            .map((user: UserFromAPI) => ({
              id: user.id,
              displayName: user.displayName || user.email,
              email: user.email,
              idDoctor: user.idDoctor!
            }));
        }
        
        setAvailableDoctors(doctors);
        
        // Si el usuario actual es doctor y no se ha seleccionado ninguno, seleccionarlo
        if (!selectedDoctorId && doctorId) {
          setSelectedDoctorId(doctorId.toString());
        } else if (!selectedDoctorId && doctors.length > 0) {
          // Si no hay doctor del usuario actual, seleccionar el primero disponible
          setSelectedDoctorId(doctors[0].idDoctor.toString());
        }
      } catch (error) {
        console.error('Error loading doctors:', error);
        // En caso de error, si el usuario es doctor, usar su propio ID
        if (doctorId && !selectedDoctorId) {
          setSelectedDoctorId(doctorId.toString());
        }
      }
    };
    
    loadDoctors();
  }, [user, doctorId, selectedDoctorId, userRole]);

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
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        const token = await getFirebaseAuthToken();
        if (!token) {
          console.warn('No authentication token available');
          setDoctorEvents([]);
          toast.error('No se pudo obtener el token de autenticación');
          setLoading(false);
          return;
        }
        
        // Obtener rango de fechas para la vista actual
        const { start, end } = getDateRange();
        const startDate = startOfDay(start).toISOString();
        const endDate = endOfDay(end).toISOString();
        
        // Cargar eventos del doctor seleccionado
        let targetDoctorId = selectedDoctorId || doctorId;
        
        // Si el usuario es un médico, solo puede ver sus propios eventos
        if (userRole === 'medico' && doctorId) {
          targetDoctorId = doctorId;
        }
        
        if (!targetDoctorId) {
          console.info('No doctor ID available for loading events');
          setDoctorEvents([]);
          if (userRole === 'medico') {
            toast.error('No se encontró información del doctor');
          }
          setLoading(false);
          return;
        }
        
        const response = await fetch(
          `/api/doctors/${targetDoctorId}/calendar/events?startDate=${startDate}&endDate=${endDate}&eventType=appointment`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            console.info(`No calendar events found for doctor ${targetDoctorId}`);
            setDoctorEvents([]);
            // No mostrar toast para 404, es normal no tener eventos
          } else if (response.status === 403) {
            console.warn('Access denied to doctor events');
            setDoctorEvents([]);
            toast.error('No tiene permisos para ver los eventos de este doctor');
          } else {
            console.warn(`Failed to fetch doctor events: ${response.status} ${response.statusText}`);
            setDoctorEvents([]);
            toast.error('Error al cargar los eventos del calendario');
          }
          setLoading(false);
          return;
        }
        
        const eventsData = await response.json();
        
        // Mapear eventos de la API al formato esperado
        const allEvents = (eventsData.events || []).map((event: { id?: string; startDateTime: string; endDateTime: string; summary?: string; description?: string; location?: string }, index: number) => ({
          id: event.id || `event-${index}`,
          start: event.startDateTime,
          end: event.endDateTime,
          title: event.summary || 'Cita médica',
          description: event.description || '',
          location: event.location || '',
          type: 'appointment'
        }));
        
        setDoctorEvents(allEvents);
      } catch (error) {
        console.error('Error loading doctor events:', error);
        setDoctorEvents([]);
        toast.error('Error de conexión al cargar eventos');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [selectedDoctorId, doctorId, user, currentDate, viewMode, consultorioId, getDateRange, availableDoctors, userRole]);

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
        id: event.id || `event-${index + 1000}`,
        date: new Date(event.start),
        title: event.title || 'Cita médica',
        time: format(new Date(event.start), 'HH:mm'),
        endTime: format(new Date(event.end), 'HH:mm'),
        type: 'Cita médica',
        color: 'bg-blue-500', // Color único para todos los eventos
        status: 'confirmada',
        doctorId: selectedDoctorId ? parseInt(selectedDoctorId.toString()) : (doctorId ? parseInt(doctorId.toString()) : undefined)
      }));
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground capitalize">
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
          
          {/* Filtro de Doctor - Solo mostrar si hay múltiples doctores disponibles o el usuario no es doctor */}
          {availableDoctors.length > 1 || (availableDoctors.length > 0 && userRole !== 'medico') ? (
             <div className="flex items-center gap-2 flex-shrink-0">
               <span className="text-sm font-medium">Doctor:</span>
               <Popover open={openDoctorCombo} onOpenChange={setOpenDoctorCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openDoctorCombo}
                    className="w-[250px] justify-between"
                  >
                    <span className="truncate">
                      {availableDoctors.find((doctor) => doctor.idDoctor.toString() === selectedDoctorId)?.displayName || "Seleccionar doctor..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre o correo..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún doctor.</CommandEmpty>
                      <CommandGroup>
                         {availableDoctors.map((doctor) => (
                          <CommandItem
                            key={doctor.idDoctor}
                            value={`${doctor.displayName} ${doctor.email}`}
                            onSelect={() => {
                              setSelectedDoctorId(doctor.idDoctor.toString());
                              setOpenDoctorCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                selectedDoctorId === doctor.idDoctor.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{doctor.displayName}</span>
                              <span className="text-xs text-muted-foreground">{doctor.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          ) : userRole === 'medico' && availableDoctors.length === 1 ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-muted-foreground">Mi calendario</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Contenido principal según la vista seleccionada */}
      <div className="flex-1 overflow-hidden border border-border rounded-lg relative">
        {/* Indicador de carga */}
        {loading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-background border rounded-lg px-4 py-2 shadow-lg">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">Cargando eventos...</span>
            </div>
          </div>
        )}
        
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