"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rutas/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Event = {
  date: Date;
  title: string;
  time: string;
  color: string;
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
            events.map((event, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-card hover:bg-accent/10 transition-colors">
                <div className={`w-3 h-3 rounded-full ${event.color}`}></div>
                <div className="flex-1">
                  <p className="font-medium">{event.title}</p>
                </div>
                <div className="text-sm text-muted-foreground">{event.time}</div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground">No hay eventos para este día</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}