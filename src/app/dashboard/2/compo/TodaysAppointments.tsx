'use client';

import { Card, CardContent } from "@rutas/components/ui/card";
// import { ClipboardList } from 'lucide-react'; // Icono de ejemplo

interface TodaysAppointmentsProps {
  appointmentCount: number;
}

export function TodaysAppointments({ appointmentCount }: TodaysAppointmentsProps) {
  return (
    <Card className="w-full bg-card rounded-xl overflow-hidden">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-xs lg:text-sm opacity-80">Hoy tienes</span>
          <span className="text-3xl lg:text-3xl font-bold mt-1">{appointmentCount} Cita{appointmentCount !== 1 ? 's' : ''}</span>
        </div>
        {/* <div className="flex-shrink-0 size-10 rounded-full bg-gray-800 flex items-center justify-center">
            <ClipboardList className="size-5 text-gray-300" />
        </div> */}
      </CardContent>
    </Card>
  );
}