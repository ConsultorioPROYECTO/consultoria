"use client";

import * as React from "react";
import { Calendar } from "@rutas/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { ChevronLeftIcon, ChevronRightIcon, LayoutGrid, List } from "lucide-react";
import { Button } from "@rutas/components/ui/button";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EventModal } from "./event-modal";

// Mock data for events, replace with actual data fetching
const events = [
  { date: new Date(2025, 0, 1), title: "Amalia Solis", time: "1:00 PM", color: "bg-blue-500" },
  { date: new Date(2025, 0, 17), title: "Candelaria Luna", time: "2:00 PM", color: "bg-pink-500" },
  { date: new Date(2025, 0, 17), title: "Damián Prado", time: "3:00 PM", color: "bg-green-500" },
  { date: new Date(2025, 0, 17), title: "Elvira Montes", time: "4:00 PM", color: "bg-yellow-500" },
  { date: new Date(2025, 0, 17), title: "Gema del Mar", time: "5:00 PM", color: "bg-purple-500" },
  { date: new Date(2025, 0, 17), title: "Irene Valle", time: "6:00 PM", color: "bg-indigo-500" },
];

export default function CalendarView() {
  // Estado para controlar la vista (grid o lista)
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  // Determinar si es vista móvil para ajustar la altura de las celdas
  const [, setIsMobile] = React.useState(false);
  // Estado para el modal de eventos
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = React.useState<typeof events>([]);
  const [selectedEventDate, setSelectedEventDate] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768); // md breakpoint
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [date, setDate] = React.useState<Date | undefined>(new Date(2025, 0, 21));
  const [currentMonth, setCurrentMonth] = React.useState(date?.getMonth() ?? new Date().getMonth());
  const [currentYear, setCurrentYear] = React.useState(date?.getFullYear() ?? new Date().getFullYear());

  const handleMonthChange = (month: string) => {
    const newMonth = parseInt(month, 10);
    setCurrentMonth(newMonth);
    setDate(new Date(currentYear, newMonth, 1));
  };

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year, 10);
    setCurrentYear(newYear);
    setDate(new Date(newYear, currentMonth, 1));
  };

  const goToPreviousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    setDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    setCurrentMonth(newDate.getMonth());
    setCurrentYear(newDate.getFullYear());
    setDate(newDate);
  };

  // Función para abrir el modal con los eventos del día seleccionado
  const openEventModal = (dayDate: Date, dayEvents: typeof events) => {
    setSelectedEventDate(dayDate);
    setSelectedDayEvents(dayEvents);
    setIsModalOpen(true);
  };

  // Función para cerrar el modal
  const closeEventModal = () => {
    setIsModalOpen(false);
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(2000, i).toLocaleString('es-ES', { month: 'long' });
    return {
      value: i.toString(),
      label: monthName.charAt(0).toUpperCase() + monthName.slice(1)
    };
  });

  const years = Array.from({ length: 10 }, (_, i) => ({
    value: (new Date().getFullYear() - 5 + i).toString(),
    label: (new Date().getFullYear() - 5 + i).toString(),
  })); 
  // Ensure 2025 is in the list
  if (!years.find(y => y.value === '2025')) {
    years.push({ value: '2025', label: '2025' });
    years.sort((a, b) => parseInt(a.value) - parseInt(b.value));
  }


  return (
    <div className="flex flex-col h-full w-full bg-transparent text-card-foreground rounded-lg p-2 md:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Calendario</h1>
        <div className="flex items-center gap-4 mt-4 sm:mt-0">
          <div className="flex items-center">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="rounded-r-none border-r-0">
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[120px] rounded-none border-x-0">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currentYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px] rounded-none border-l-0 border-r-0">
                <SelectValue placeholder="Año" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={goToNextMonth} className="rounded-l-none border-l-0">
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode("grid")} 
              className={cn("rounded-none h-9 w-9", viewMode === "grid" ? "bg-primary text-primary-foreground" : "")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode("list")} 
              className={cn("rounded-none h-9 w-9", viewMode === "list" ? "bg-primary text-primary-foreground" : "")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="flex-grow overflow-auto w-full">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border-0 p-0 w-full"
            month={new Date(currentYear, currentMonth)}
            locale={es}
            weekStartsOn={0} // 0 para domingo, 1 para lunes (valor predeterminado)
            components={{
              DayButton: ({ day, modifiers, ...props }) => {
                const dayDate = day.date;
                const dayEvents = events.filter(
                  (event) =>
                    event.date.getDate() === dayDate.getDate() &&
                    event.date.getMonth() === dayDate.getMonth() &&
                    event.date.getFullYear() === dayDate.getFullYear()
                );
                
                // Verificar si es el día actual
                const isToday = new Date().getDate() === dayDate.getDate() && 
                                new Date().getMonth() === dayDate.getMonth() && 
                                new Date().getFullYear() === dayDate.getFullYear();
                
                // Verificar si es el día seleccionado
                const isSelected = date?.getDate() === dayDate.getDate() && 
                                  date?.getMonth() === dayDate.getMonth() && 
                                  date?.getFullYear() === dayDate.getFullYear();
                
                return (
                  <button
                    {...props}
                    className={cn(
                      "relative w-full flex flex-col items-start p-1 rounded-lg cursor-pointer h-auto min-h-[70px] border-0 bg-transparent hover:bg-primary/5",
                      isSelected ? "bg-primary/10" : "bg-primary/3",
                      isToday ? "ring-2 ring-primary" : "",
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
                              key={index} 
                              className={`w-2 h-2 rounded-full ${event.color}`}
                              title={event.title}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground ml-0.5">+{dayEvents.length - 3}</div>
                          )}
                        </div>
                      )}
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
              cell: `text-center p-1 relative w-full flex-1`,
              day: "h-full w-full p-1 font-normal aria-selected:opacity-100 flex flex-col items-start justify-start",
              day_selected: "", // Manejado en el componente DayContent
              day_today: "", // Manejado en el componente DayContent
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
            formatters={{
              formatWeekdayName: (day) => {
                // Usar un enfoque más simple y compatible para obtener los nombres de los días
                const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                return weekdays[day.getDay()];
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-grow overflow-auto p-4">
          <div className="text-muted-foreground text-sm">Vista de lista no implementada</div>
        </div>
      )}

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