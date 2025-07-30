'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";
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
        const patientDate = new Date(p.dateOfBirth);
        return patientDate.getMonth() === currentMonth && patientDate.getFullYear() === currentYear;
      }).length
    };
  }, [patients]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Resumen de Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Resumen de Pacientes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <Badge variant="secondary">{stats.total}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Activos</span>
              <Badge variant="default">{stats.active}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Masculino</span>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">{stats.male}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Femenino</span>
              <Badge variant="outline" className="bg-pink-100 text-pink-800">{stats.female}</Badge>
            </div>
          </div>
        </div>
        
        {stats.other > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">Otro género</span>
            <Badge variant="outline">{stats.other}</Badge>
          </div>
        )}
        
        <div className="flex items-center gap-2 pt-2 border-t">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-sm text-muted-foreground">
            {stats.active} pacientes activos en el sistema
          </span>
        </div>
      </CardContent>
    </Card>
  );
}