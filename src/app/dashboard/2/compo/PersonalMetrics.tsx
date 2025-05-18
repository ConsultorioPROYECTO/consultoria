// src/app/dashboard/2/compo/PersonalMetrics.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Progress } from "@rutas/components/ui/progress";
import { TrendingUp, Users, Smile, Star } from "lucide-react"; // Asumiendo lucide-react

// Mock data - en una aplicación real, esto vendría de una API
const personalMetricsData = {
  appointmentsThisMonth: 85,
  avgConsultationTime: 22, // minutos
  patientSatisfactionRate: 95, // %
  followUpCompletionRate: 80, // %
  newPatientsThisMonth: 12,
};

export function PersonalMetrics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-primary" />
          Métricas Personales de Productividad y Calidad
        </CardTitle>
        <CardDescription>
          Un resumen de tu desempeño y la satisfacción de tus pacientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="p-4 border rounded-lg bg-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Consultas este Mes</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{personalMetricsData.appointmentsThisMonth}</p>
        </div>

        <div className="p-4 border rounded-lg bg-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Tiempo Prom. Consulta</p>
            <Star className="h-4 w-4 text-muted-foreground" /> {/* Icono placeholder */}
          </div>
          <p className="text-2xl font-bold">{personalMetricsData.avgConsultationTime} <span className="text-sm font-normal text-muted-foreground">min</span></p>
        </div>

        <div className="p-4 border rounded-lg bg-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Satisfacción Pacientes</p>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </div>
          <Progress value={personalMetricsData.patientSatisfactionRate} className="h-2 mt-1" />
          <p className="text-right text-sm font-bold">{personalMetricsData.patientSatisfactionRate}%</p>
        </div>

        <div className="p-4 border rounded-lg bg-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Seguimientos Completados</p>
            <Star className="h-4 w-4 text-muted-foreground" /> {/* Icono placeholder */}
          </div>
          <Progress value={personalMetricsData.followUpCompletionRate} className="h-2 mt-1" />
          <p className="text-right text-sm font-bold">{personalMetricsData.followUpCompletionRate}%</p>
        </div>
        
        <div className="p-4 border rounded-lg bg-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Pacientes Nuevos (Mes)</p>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{personalMetricsData.newPatientsThisMonth}</p>
        </div>

        {/* Podrías agregar más métricas aquí */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/30 space-y-2 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Objetivo Mensual de Consultas</p>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">100</p>
            <Progress value={(personalMetricsData.appointmentsThisMonth / 100) * 100} className="h-2 mt-1 w-3/4 [&>*]:bg-blue-500" />
        </div>

      </CardContent>
    </Card>
  );
}