'use client'

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rutas/components/ui/dialog";
import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Calendar } from "@rutas/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@rutas/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Edit2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils";

type Event = {
  id: string; // Corregido: Google Calendar IDs son strings
  date: Date;
  title: string;
  time: string;
  endTime: string;
  type: string;
  color: string;
  status: string;
  doctorId?: number;
};

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: Event[];
  onEventUpdate?: (eventId: string, updatedData: { date: Date; time: string }) => void;
}

export function EventModal({ isOpen, onClose, date, events, onEventUpdate }: EventModalProps) {
  const { userRole } = useAuth();
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null);
  const [editingData, setEditingData] = React.useState<{ date: Date; time: string }>({ date: new Date(), time: '' });
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  if (!date) return null;

  const formattedDate = format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Verificar si el usuario puede editar (admin o asistente)
  const canEdit = userRole === 'admin' || userRole === 'asistente';

  const handleEditStart = (event: Event) => {
    setEditingEventId(event.id);
    setEditingData({
      date: event.date,
      time: event.time
    });
  };

  const handleEditCancel = () => {
    setEditingEventId(null);
    setEditingData({ date: new Date(), time: '' });
  };

  const handleEditSave = async (event: Event) => {
    if (!editingData.time || !editingData.date) return;

    setIsUpdating(true);
    try {
      const token = await getFirebaseAuthToken();
      
      // Validar que la fecha no sea en el pasado
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(editingData.date);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        console.error('No se puede programar una cita en el pasado');
        return;
      }
      
      // Crear la fecha y hora combinadas para startDateTime
      const startDateTime = new Date(editingData.date);
      const [hours, minutes] = editingData.time.split(':').map(Number);
      
      // Validar que las horas y minutos sean válidos
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        console.error('Hora inválida');
        return;
      }
      
      startDateTime.setHours(hours, minutes, 0, 0);

      // Calcular endDateTime basado en la duración original del evento
      const originalStartTime = event.time.split(':').map(Number);
      const originalEndTime = event.endTime.split(':').map(Number);
      const durationMinutes = (originalEndTime[0] * 60 + originalEndTime[1]) - (originalStartTime[0] * 60 + originalStartTime[1]);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

      const requestBody = {
        doctorId: event.doctorId,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString()
      };

      console.log('Enviando actualización:', requestBody);

      const response = await fetch(`/api/appointments/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Cita actualizada exitosamente:', result);
        
        // Notificar al componente padre sobre la actualización
        onEventUpdate?.(event.id, {
          date: editingData.date,
          time: editingData.time
        });
        
        setEditingEventId(null);
        setEditingData({ date: new Date(), time: '' });
      } else {
        const errorData = await response.text();
        console.error('Error al actualizar la cita:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error al actualizar la cita:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{capitalizedDate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="p-3 rounded-lg bg-card border border-border hover:bg-accent/10 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full ${event.color} mt-0.5 flex-shrink-0`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-foreground truncate">{event.title}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.status === 'confirmada' ? 'bg-green-100 text-green-800' :
                          event.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                          event.status === 'cancelada' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </span>
                        {canEdit && editingEventId !== event.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStart(event)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {editingEventId === event.id ? (
                      <div className="space-y-3 mt-3">
                        <div className="space-y-2">
                          <Label htmlFor="edit-date" className="text-sm font-medium">Fecha</Label>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !editingData.date && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {editingData.date ? format(editingData.date, "PPP", { locale: es }) : "Seleccionar fecha"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={editingData.date}
                                onSelect={(date) => {
                                  if (date) {
                                    setEditingData(prev => ({ ...prev, date }));
                                    setIsCalendarOpen(false);
                                  }
                                }}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-time" className="text-sm font-medium">Hora de inicio</Label>
                          <Input
                            id="edit-time"
                            type="time"
                            value={editingData.time}
                            onChange={(e) => setEditingData(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full"
                          />
                        </div>
                        
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditCancel}
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(event)}
                            disabled={isUpdating || !editingData.time || !editingData.date}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            {isUpdating ? 'Guardando...' : 'Guardar'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground mb-1">{event.type}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{event.time} - {event.endTime}</span>
                          <span>•</span>
                          <span>{((parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1])) - 
                                 (parseInt(event.time.split(':')[0]) * 60 + parseInt(event.time.split(':')[1]))) / 60}h</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay citas programadas para este día</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}