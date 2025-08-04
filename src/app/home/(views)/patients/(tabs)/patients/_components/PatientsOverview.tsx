'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatientsOnly } from "@/hooks/useDashboardOptimized";
import { useMemo } from "react";

/**
 * Component that displays patient statistics overview
 * Shows total, active, gender distribution and other metrics
 */
export function PatientsOverview() {
  const { patients, isLoading } = usePatientsOnly();

  const stats = useMemo(() => {
    if (!patients.length) {
      return {
        total: 0,
        active: 0,
        male: 0,
        female: 0,
        other: 0,
        thisMonth: 0
      };
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return {
      total: patients.length,
      active: patients.filter(p => p.isActive).length,
      male: patients.filter(p => p.gender === 'M').length,
      female: patients.filter(p => p.gender === 'F').length,
      other: patients.filter(p => p.gender === 'Other').length,
      thisMonth: patients.filter(p => {
        // Usar birthDate en lugar de dateOfBirth para coincidir con el esquema de la API
        if (!p.birthDate) return false;
        const patientDate = new Date(p.birthDate);
        return patientDate.getMonth() === currentMonth && patientDate.getFullYear() === currentYear;
      }).length
    };
  }, [patients]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-0">
        <CardTitle className="text-2xl font-bold">
          Resumen de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Masculino</span>
            <span className="text-2xl font-bold text-blue-600">{stats.male}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Femenino</span>
            <span className="text-2xl font-bold text-pink-600">{stats.female}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-muted-foreground">Otros</span>
            <span className="text-2xl font-bold text-gray-600">{stats.other}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}