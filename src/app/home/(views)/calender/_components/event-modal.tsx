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
// import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils"; // Removido - usando contexto centralizado

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
  const { userRole, getAuthToken } = useAuth();
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
      const token = await getAuthToken();
      
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
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">{capitalizedDate}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid gap-3 p-1">
            {events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="p-4 rounded-lg bg-card border border-border hover:bg-accent/10 transition-colors">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-start">
                    <div className={`w-4 h-4 rounded-full ${event.color} mt-1 flex-shrink-0`}></div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-foreground leading-tight break-words">{event.title}</h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                              event.status === 'pending' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              event.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              event.status === 'canceled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        
                        {editingEventId === event.id ? (
                          <div className="grid gap-4 mt-3">
                            <div className="grid gap-2">
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
                                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">
                                      {editingData.date ? format(editingData.date, "PPP", { locale: es }) : "Seleccionar fecha"}
                                    </span>
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
                            
                            <div className="grid gap-2">
                              <Label htmlFor="edit-time" className="text-sm font-medium">Hora de inicio</Label>
                              <Input
                                id="edit-time"
                                type="time"
                                value={editingData.time}
                                onChange={(e) => setEditingData(prev => ({ ...prev, time: e.target.value }))}
                                className="w-full"
                              />
                            </div>
                            
                            <div className="flex gap-2 justify-end pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEditCancel}
                                disabled={isUpdating}
                                className="flex items-center gap-1"
                              >
                                <X className="h-3 w-3" />
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleEditSave(event)}
                                disabled={isUpdating || !editingData.time || !editingData.date}
                                className="flex items-center gap-1"
                              >
                                <Save className="h-3 w-3" />
                                {isUpdating ? 'Guardando...' : 'Guardar'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-1">
                            <p className="text-sm text-muted-foreground">{event.type}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                              <span className="whitespace-nowrap">{event.time} - {event.endTime}</span>
                              <span>•</span>
                              <span className="whitespace-nowrap">
                                {((parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1])) - 
                                 (parseInt(event.time.split(':')[0]) * 60 + parseInt(event.time.split(':')[1]))) / 60}h
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      {canEdit && editingEventId !== event.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditStart(event)}
                          className="h-8 w-8 p-0 hover:bg-accent"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">No hay citas programadas para este día</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}