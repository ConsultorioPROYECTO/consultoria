// src/app/dashboard/2/compo/WeeklyMonthlyPlanner.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { Calendar } from "@rutas/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Mock data para eventos del calendario
const mockEvents = [
  { date: new Date(2024, 7, 18), title: "Reunión de equipo", color: "bg-blue-500" },
  { date: new Date(2024, 7, 20), title: "Congreso Médico", color: "bg-green-500" },
  { date: new Date(2024, 7, 25), title: "Guardia Hospital", color: "bg-red-500" },
  { date: new Date(2024, 8, 5), title: "Vacaciones", color: "bg-yellow-500" },
];

export function WeeklyMonthlyPlanner() {
  const [currentDate, setCurrentDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month'); // 'month' or 'week'

  // Lógica para mostrar eventos en el calendario y cambiar vistas
  // Esta es una simplificación. Un calendario real requeriría más lógica.

  const handleDateChange = (date: Date | undefined) => {
    setCurrentDate(date);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => {
      if (!prevDate) return new Date();
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prevDate => {
      if (!prevDate) return new Date();
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Planificador Semanal/Mensual</CardTitle>
            <CardDescription>Organiza tu tiempo y visualiza tus compromisos.</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week')}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Vista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mensual</SelectItem>
                <SelectItem value="week">Semanal</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={goToToday}>Hoy</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center space-x-2 mb-4">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth} aria-label="Mes anterior">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium">
                {currentDate?.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth} aria-label="Mes siguiente">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
        {viewMode === 'month' ? (
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={handleDateChange}
            className="rounded-md border p-0 w-full"
            month={currentDate} // Controlar el mes mostrado
            // Podríamos añadir lógica para mostrar eventos aquí
            components={{
                Day: ({ day }) => {
                    const event = mockEvents.find(e => 
                        e.date.getFullYear() === day.date.getFullYear() &&
                        e.date.getMonth() === day.date.getMonth() &&
                        e.date.getDate() === day.date.getDate()
                    );
                    return (
                        <div className="relative h-full w-full flex items-center justify-center">
                           <span>{day.date.getDate()}</span>
                           {event && <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 ${event.color} rounded-full`} title={event.title}></div>}
                        </div>
                    );
                }
            }}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Vista semanal no implementada en este ejemplo.
            {/* Aquí iría la lógica para una vista semanal detallada */}
          </div>
        )}
        <div className="mt-6">
            <h4 className="text-md font-semibold mb-2">Próximos Eventos Importantes:</h4>
            <ul className="space-y-2">
                {mockEvents
                    .filter(event => currentDate && event.date >= currentDate)
                    .sort((a,b) => a.date.getTime() - b.date.getTime())
                    .slice(0,3) // Mostrar los próximos 3 eventos
                    .map(event => (
                        <li key={event.title} className="flex items-center text-sm">
                            <span className={`h-2 w-2 ${event.color} rounded-full mr-2`}></span>
                            <span>{event.date.toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})}: {event.title}</span>
                        </li>
                    ))}
                {mockEvents.filter(event => currentDate && event.date >= currentDate).length === 0 && (
                    <p className="text-sm text-muted-foreground">No hay eventos próximos registrados.</p>
                )}
            </ul>
        </div>
      </CardContent>
    </Card>
  );
}