// src/app/dashboard/1/compo/BusinessAnalytics.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";

export function BusinessAnalytics() {
  // Lógica para obtener y mostrar KPIs de tasa de confirmación y cancelación
  const confirmationRate = 75; // Ejemplo
  const cancellationRate = 10; // Ejemplo

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis del Negocio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tasa de Confirmación de Citas
            </p>
            <p className="text-2xl font-bold">{confirmationRate}%</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Tasa de Cancelación de Citas
            </p>
            <p className="text-2xl font-bold">{cancellationRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}