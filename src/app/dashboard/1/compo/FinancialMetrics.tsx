// src/app/dashboard/1/compo/FinancialMetrics.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Progress } from "@rutas/components/ui/progress";

export function FinancialMetrics() {
  // Lógica para obtener y mostrar métricas financieras
  const totalIncome = 55000; // Ejemplo en USD
  const scheduledAppointments = 250;
  const completedAppointments = 210;
  const completionRate = (completedAppointments / scheduledAppointments) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas Financieras y de Consultas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Ingresos Totales (Mes Actual)</p>
          <p className="text-3xl font-bold">${totalIncome.toLocaleString()}</p>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Consultas Realizadas vs. Programadas</p>
            <p className="text-sm text-muted-foreground">{completedAppointments} / {scheduledAppointments}</p>
          </div>
          <Progress value={completionRate} className="w-full" />
          <p className="text-xs text-muted-foreground mt-1 text-right">Tasa de realización: {completionRate.toFixed(1)}%</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas Programadas</p>
                <p className="text-2xl font-bold">{scheduledAppointments}</p>
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">Consultas Completadas</p>
                <p className="text-2xl font-bold">{completedAppointments}</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}