'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OrganizationSettings } from "@/app/home/com/OrganizationSettings"

export function OrganizationInfoSection() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Información de la Organización</h3>
        <p className="text-sm text-muted-foreground">
          Gestiona la información básica de tu organización
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Datos de la Organización</CardTitle>
          <CardDescription>
            Actualiza la información general de tu organización, incluyendo datos de contacto y configuración regional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettings />
        </CardContent>
      </Card>
    </div>
  )
}