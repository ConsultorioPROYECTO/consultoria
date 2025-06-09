'use client';

import { useState } from 'react';
import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Switch } from "@rutas/components/ui/switch";
import { Badge } from "@rutas/components/ui/badge";
import { Clock, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@rutas/components/ui/alert";
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
  doctorName, 
  initialWorkingHours = DEFAULT_WORKING_HOURS,
  onSave 
}: DoctorWorkingHoursProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(initialWorkingHours);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

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
      if (onSave) {
        await onSave(doctorId, workingHours);
        setSuccessMessage('Horarios guardados exitosamente');
      }
    } catch (error) {
      setErrors(['Error al guardar los horarios. Intente nuevamente.']);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setErrors([]);
    setSuccessMessage('');
  };

  return (
    <Card className="w-full flex-1 overflow-hidden">
      {/* <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock className="h-6 w-6 text-primary" />
          Horarios de Trabajo - {doctorName}
        </CardTitle>
        <CardDescription className="text-base">
          Configure los días y horarios de atención del doctor. Los horarios se mostrarán en el calendario.
        </CardDescription>
      </CardHeader> */}
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