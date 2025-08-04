'use client';

import { Card, CardContent } from "@rutas/components/ui/card";

interface TodaysAppointmentsProps {
  appointmentCount: number;
}

export function TodaysAppointments({ appointmentCount }: TodaysAppointmentsProps) {
  return (
    <Card className="w-full bg-card rounded-xl overflow-hidden">
      <CardContent className="flex items-center justify-between py-1 px-8">
        <div className="flex flex-col">
          <span className="text-sm opacity-80">Tienes</span>
          <span className="text-2xl lg:text-3xl font-bold mt-1 selection:bg-primary selection:text-primary-foreground">{appointmentCount} Cita{appointmentCount !== 1 ? 's' : ''}</span>
        </div>
      </CardContent>
    </Card>
  );
}