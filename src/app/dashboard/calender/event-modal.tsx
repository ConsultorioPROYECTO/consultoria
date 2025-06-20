'use client'

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rutas/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: Event[];
}

export function EventModal({ isOpen, onClose, date, events }: EventModalProps) {
  if (!date) return null;

  const formattedDate = format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

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
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        event.status === 'confirmada' ? 'bg-green-100 text-green-800' :
                        event.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'cancelada' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{event.type}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{event.time} - {event.endTime}</span>
                      <span>•</span>
                      <span>{((parseInt(event.endTime.split(':')[0]) * 60 + parseInt(event.endTime.split(':')[1])) - 
                             (parseInt(event.time.split(':')[0]) * 60 + parseInt(event.time.split(':')[1]))) / 60}h</span>
                    </div>
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