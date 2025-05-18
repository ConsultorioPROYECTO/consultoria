// src/app/dashboard/1/compo/AIPerformancePanel.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Progress } from "@rutas/components/ui/progress";

export function AIPerformancePanel() {
  // Lógica para obtener datos de rendimiento de la IA
  const precisionRate = 92; // Ejemplo
  const escalatedCases = 15; // Ejemplo
  const totalInteractions = 350; // Ejemplo
  const resolutionRate = ((totalInteractions - escalatedCases) / totalInteractions) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento de la IA</CardTitle>
        <CardDescription>Métricas clave sobre la efectividad de la IA en las interacciones.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Tasa de Precisión de Respuestas</p>
            <p className="text-sm font-bold">{precisionRate}%</p>
          </div>
          <Progress value={precisionRate} aria-label={`${precisionRate}% de precisión`} />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Casos Escalados a Humanos</p>
          <p className="text-2xl font-bold">{escalatedCases}</p>
          <p className="text-xs text-muted-foreground">de {totalInteractions} interacciones totales</p>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <p className="text-sm font-medium text-muted-foreground">Tasa de Resolución Autónoma</p>
            <p className="text-sm font-bold">{resolutionRate.toFixed(1)}%</p>
          </div>
          <Progress value={resolutionRate} aria-label={`${resolutionRate.toFixed(1)}% de resolución`} />
        </div>
      </CardContent>
    </Card>
  );
}