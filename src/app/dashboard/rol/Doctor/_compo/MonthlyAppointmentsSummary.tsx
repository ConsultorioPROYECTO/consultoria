import React from 'react';
import { Card, CardContent } from "@/components/ui/card";


interface MonthlyAppointmentsSummaryProps {
  pendingAppointments: number; // Cambiado a pendingAppointments
}

export function MonthlyAppointmentsSummary({ pendingAppointments }: MonthlyAppointmentsSummaryProps) {
  return (
    <Card className="flex-1">
      <CardContent className="flex items-center justify-between py-1 px-8">
        <div className="flex flex-col">
          <span className="text-sm opacity-80">Citas este mes</span>
          <span className="text-3xl lg:text-3xl font-bold mt-1">{pendingAppointments} Citas</span>
        </div>
      </CardContent>
    </Card>
  );
}