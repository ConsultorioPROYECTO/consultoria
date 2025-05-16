"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { IconMessageCircle, IconBell } from "@tabler/icons-react"

// Datos de ejemplo
const sampleInteractions = [
  { id: 1, type: "Nueva Cita", patientName: "Laura Martín", timeAgo: "hace 5 min" },
  { id: 2, type: "Consulta WhatsApp", patientName: "Pedro Jiménez", timeAgo: "hace 12 min" },
]

export function PendingInteractions() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Interacciones Pendientes
        </CardTitle>
        <IconBell className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {sampleInteractions.length > 0 ? (
          <ul className="space-y-3">
            {sampleInteractions.map((interaction) => (
              <li key={interaction.id} className="flex items-start space-x-3 p-2 border-b last:border-b-0">
                <IconMessageCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-semibold">{interaction.type}: {interaction.patientName}</p>
                  <p className="text-xs text-muted-foreground">{interaction.timeAgo}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No hay interacciones pendientes.</p>
        )}
      </CardContent>
    </Card>
  )
}