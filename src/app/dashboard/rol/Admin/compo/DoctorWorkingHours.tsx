'use client';

import { useState, useEffect } from 'react';
import { Button } from "@rutas/components/ui/button";
import { Card, CardContent } from "@rutas/components/ui/card";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Switch } from "@rutas/components/ui/switch";
import { Badge } from "@rutas/components/ui/badge";
import { Clock, Save, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@rutas/components/ui/alert";
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';
import { 
  WorkingHours, 
  DaySchedule, 
  DEFAULT_WORKING_HOURS, 
  DAYS_OF_WEEK, 
  validateWorkingHours,
  formatWorkingHours 
} from "@rutas/types/working-hours";

interface DoctorWorkingHoursProps {
  doctorId: number;
  doctorName: string;
  initialWorkingHours?: WorkingHours;
  onSave?: (doctorId: number, workingHours: WorkingHours) => Promise<void>;
}

export function DoctorWorkingHours({ 
  doctorId, 
  initialWorkingHours,
  onSave 
}: DoctorWorkingHoursProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar horarios desde la API
  useEffect(() => {
    const loadWorkingHours = async () => {
      if (initialWorkingHours) {
        setWorkingHours(initialWorkingHours);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getFirebaseAuthToken();
        if (!token) {
          setErrors(['Autenticación requerida']);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setWorkingHours(data.workingHours || DEFAULT_WORKING_HOURS);
        } else if (response.status === 404) {
          // Doctor no encontrado, usar horarios por defecto
          setWorkingHours(DEFAULT_WORKING_HOURS);
        } else {
          throw new Error('Error al cargar horarios');
        }
      } catch (error) {
        console.error('Error loading working hours:', error);
        setErrors(['Error al cargar los horarios. Usando horarios por defecto.']);
        setWorkingHours(DEFAULT_WORKING_HOURS);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkingHours();
  }, [doctorId, initialWorkingHours]);

  const updateDaySchedule = (day: keyof WorkingHours, field: keyof DaySchedule, value: boolean | string) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
    // Limpiar mensajes al hacer cambios
    setErrors([]);
    setSuccessMessage('');
  };

  const handleSave = async () => {
    // Validar horarios
    const validationErrors = validateWorkingHours(workingHours);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);
    
    try {
      const token = await getFirebaseAuthToken();
      if (!token) {
        setErrors(['Autenticación requerida']);
        return;
      }

      const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workingHours }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error al guardar horarios');
      }

      setSuccessMessage('Horarios guardados exitosamente');
      
      // Llamar callback si existe
      if (onSave) {
        await onSave(doctorId, workingHours);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar los horarios. Intente nuevamente.';
      setErrors([errorMessage]);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setErrors([]);
    setSuccessMessage('');
  };

  if (isLoading) {
    return (
      <Card className="w-full flex-1 overflow-hidden">
        <CardContent className="space-y-6 px-6 pb-6 flex-1 overflow-y-auto flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando horarios...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full flex-1 overflow-hidden">
      <CardContent className="space-y-6 px-6 pb-6 flex-1 overflow-y-auto">
        {/* Mensajes de error y éxito */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Configuración por día */}
        <div className="space-y-3">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const daySchedule = workingHours[key];
            return (
              <div key={key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center space-x-4 mb-3 lg:mb-0">
                  <div className="w-24 flex-shrink-0">
                    <Label className="font-medium text-base">{label}</Label>
                  </div>
                  <Switch
                    checked={daySchedule.isActive}
                    onCheckedChange={(checked) => updateDaySchedule(key, 'isActive', checked)}
                  />
                  {daySchedule.isActive && (
                    <Badge variant="outline" className="ml-2">Activo</Badge>
                  )}
                </div>
                
                {daySchedule.isActive && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`${key}-start`} className="text-sm font-medium min-w-[50px]">Desde:</Label>
                      <Input
                        id={`${key}-start`}
                        type="time"
                        value={daySchedule.startTime}
                        onChange={(e) => updateDaySchedule(key, 'startTime', e.target.value)}
                        className="w-36 h-10"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`${key}-end`} className="text-sm font-medium min-w-[50px]">Hasta:</Label>
                      <Input
                        id={`${key}-end`}
                        type="time"
                        value={daySchedule.endTime}
                        onChange={(e) => updateDaySchedule(key, 'endTime', e.target.value)}
                        className="w-36 h-10"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen de horarios */}
        <div className="p-5 bg-muted/30 rounded-lg border">
          <h4 className="font-semibold mb-3 text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Resumen de Horarios:
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {formatWorkingHours(workingHours)}
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
            className="w-full sm:w-auto px-6 py-2.5"
          >
            Restaurar Predeterminados
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-2.5 bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Horarios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}