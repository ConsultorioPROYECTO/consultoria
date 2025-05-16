"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { IconCalendarEvent } from "@tabler/icons-react"

// Datos de ejemplo, idealmente vendrían de una API o estado global
const sampleAppointments = [
  { id: 1, time: "10:00 AM", patientName: "Juan Pérez", service: "Consulta General" },
  { id: 2, time: "11:30 AM", patientName: "Ana Gómez", service: "Revisión" },
  { id: 3, time: "02:00 PM", patientName: "Carlos López", service: "Vacunación" },
]

export function UpcomingAppointments() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Citas Próximas
        </CardTitle>
        <IconCalendarEvent className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {sampleAppointments.length > 0 ? (
          <ul className="space-y-2">
            {sampleAppointments.map((appointment) => (
              <li key={appointment.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                <div>
                  <p className="text-sm font-semibold">{appointment.patientName}</p>
                  <p className="text-xs text-muted-foreground">{appointment.service}</p>
                </div>
                <span className="text-sm font-medium">{appointment.time}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No hay citas próximas.</p>
        )}
      </CardContent>
    </Card>
  )
}