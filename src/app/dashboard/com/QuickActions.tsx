"use client"

import * as React from "react"
import { Button } from "@rutas/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card"
import { IconCalendarTime, IconSettingsAutomation, IconExternalLink } from "@tabler/icons-react"

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Accesos Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-col sm:space-y-0">
        <Button variant="outline" className="w-full sm:w-auto">
          <IconCalendarTime className="mr-2 h-4 w-4" />
          Ver Calendario Completo
        </Button>
        <Button variant="outline" className="w-full sm:w-auto">
          <IconSettingsAutomation className="mr-2 h-4 w-4" />
          Configurar IA
        </Button>
        {/* Puedes agregar más botones según sea necesario */}
      </CardContent>
    </Card>
  )
}