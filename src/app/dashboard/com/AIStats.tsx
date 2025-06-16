import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { IconBrain, IconCalendarStats, IconMessageChatbot } from "@tabler/icons-react"

// Datos de ejemplo
const aiStatsData = {
  appointmentsByAI: 12,
  frequentQueriesAnswered: 45,
}

export function AIStats() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Estadísticas de IA
        </CardTitle>
        <IconBrain className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center">
          <IconCalendarStats className="h-5 w-5 text-sky-500 mr-2" />
          <p className="text-sm">
            Citas agendadas por IA hoy: <span className="font-semibold">{aiStatsData.appointmentsByAI}</span>
          </p>
        </div>
        <div className="flex items-center">
          <IconMessageChatbot className="h-5 w-5 text-green-500 mr-2" />
          <p className="text-sm">
            Consultas frecuentes respondidas: <span className="font-semibold">{aiStatsData.frequentQueriesAnswered}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}