'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Save, AlertCircle, Loader2, Settings, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils';
import { 
  WorkingHours, 
  DaySchedule, 
  DEFAULT_WORKING_HOURS, 
  DAYS_OF_WEEK, 
  validateWorkingHours,
  formatWorkingHours 
} from "@rutas/types/working-hours";
import { toast } from 'sonner';

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
  // Log para verificar props recibidas
  console.log('DoctorWorkingHours props:', {
    doctorId,
    initialWorkingHours
  });

  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_WORKING_HOURS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [fixedSchedule, setFixedSchedule] = useState({
    startTime: '08:00',
    endTime: '17:00'
  });

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
        ...(prev[day] || DEFAULT_WORKING_HOURS[day]),
        [field]: value
      }
    }));
    // Limpiar mensajes al hacer cambios
    setErrors([]);
    setSuccessMessage('');
  };

  const updateFixedSchedule = (field: 'startTime' | 'endTime', value: string) => {
    setFixedSchedule(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar mensajes al hacer cambios
    setErrors([]);
    setSuccessMessage('');
  };

  const toggleDayActive = (day: keyof WorkingHours, isActive: boolean) => {
    if (mode === 'simple') {
      setWorkingHours(prev => ({
        ...prev,
        [day]: {
          isActive,
          startTime: isActive ? fixedSchedule.startTime : '08:00',
          endTime: isActive ? fixedSchedule.endTime : '17:00'
        }
      }));
    } else {
      updateDaySchedule(day, 'isActive', isActive);
    }
  };

  const applyFixedScheduleToAllActiveDays = useCallback(() => {
    setWorkingHours(prev => {
      const updated = { ...prev };
      DAYS_OF_WEEK.forEach(({ key }) => {
        if (updated[key]?.isActive) {
          updated[key] = {
            ...updated[key],
            startTime: fixedSchedule.startTime,
            endTime: fixedSchedule.endTime
          };
        }
      });
      return updated;
    });
  }, [fixedSchedule.startTime, fixedSchedule.endTime]);

  // Aplicar horario fijo cuando cambie en modo simple
  useEffect(() => {
    if (mode === 'simple') {
      applyFixedScheduleToAllActiveDays();
    }
  }, [mode, fixedSchedule, applyFixedScheduleToAllActiveDays]);

  const handleSave = async () => {
    // Validar horarios
    const validationErrors = validateWorkingHours(workingHours);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error('Errores de validación', {
        description: validationErrors.join(', ')
      });
      return;
    }

    setIsSaving(true);
    setErrors([]);
    
    try {
      const token = await getFirebaseAuthToken();
      if (!token) {
        setErrors(['Autenticación requerida']);
        toast.error('Error de autenticación', {
          description: 'No se pudo obtener el token de autenticación'
        });
        return;
      }

      // Log para depuración
      console.log('Enviando datos a la API:', {
        doctorId,
        workingHours,
        url: `/api/doctors/${doctorId}/working-hours`
      });

      const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workingHours }),
      });

      console.log('Respuesta de la API:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.log('Error de la API:', {
          status: response.status,
          errorData
        });
        throw new Error(errorData.error || 'Error al guardar horarios');
      }

      const responseData = await response.json();
      console.log('Respuesta exitosa de la API:', responseData);

      setSuccessMessage('Horarios guardados exitosamente');
      toast.success('Horarios guardados exitosamente', {
        description: 'Los horarios de trabajo han sido actualizados correctamente.'
      });
      
      // Llamar callback si existe
      if (onSave) {
        await onSave(doctorId, workingHours);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar los horarios. Intente nuevamente.';
      setErrors([errorMessage]);
      toast.error('Error al guardar horarios', {
        description: errorMessage
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setWorkingHours(DEFAULT_WORKING_HOURS);
    setErrors([]);
    setSuccessMessage('');
    toast.info('Horarios restaurados', {
      description: 'Se han restaurado los horarios predeterminados.'
    });
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
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Configuración de Horarios de Trabajo
        </CardTitle>
      </CardHeader>
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

        {/* Tabs para modo simple y avanzado */}
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'simple' | 'advanced')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Horario Fijo
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración Avanzada
            </TabsTrigger>
          </TabsList>

          {/* Modo Simple */}
          <TabsContent value="simple" className="space-y-4 mt-6">
            <div className="p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-semibold mb-3 text-base">Horario Laboral Fijo</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Configure un horario fijo que se aplicará a todos los días activos. Puede activar o desactivar días específicos.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="fixed-start" className="text-sm font-medium min-w-[50px]">Desde:</Label>
                  <Input
                    id="fixed-start"
                    type="time"
                    value={fixedSchedule.startTime}
                    onChange={(e) => updateFixedSchedule('startTime', e.target.value)}
                    className="w-36 h-10"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="fixed-end" className="text-sm font-medium min-w-[50px]">Hasta:</Label>
                  <Input
                    id="fixed-end"
                    type="time"
                    value={fixedSchedule.endTime}
                    onChange={(e) => updateFixedSchedule('endTime', e.target.value)}
                    className="w-36 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Días de la semana - Modo Simple */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base">Días Laborales</h4>
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const daySchedule = workingHours[key] || DEFAULT_WORKING_HOURS[key];
                return (
                  <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-24 flex-shrink-0">
                        <Label className="font-medium text-base">{label}</Label>
                      </div>
                      <Switch
                        checked={daySchedule?.isActive || false}
                        onCheckedChange={(checked) => toggleDayActive(key, checked)}
                      />
                      {daySchedule?.isActive && (
                        <Badge variant="outline" className="ml-2">Activo</Badge>
                      )}
                    </div>
                    {daySchedule?.isActive && (
                      <div className="text-sm text-muted-foreground">
                        {fixedSchedule.startTime} - {fixedSchedule.endTime}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Modo Avanzado */}
          <TabsContent value="advanced" className="space-y-4 mt-6">
            <div className="p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-semibold mb-2 text-base">Configuración Individual por Día</h4>
              <p className="text-sm text-muted-foreground">
                Configure horarios específicos para cada día de la semana de forma independiente.
              </p>
            </div>

            {/* Configuración por día - Modo Avanzado */}
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const daySchedule = workingHours[key] || DEFAULT_WORKING_HOURS[key];
                return (
                  <div key={key} className="flex flex-col lg:flex-row lg:items-center lg:justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center space-x-4 mb-3 lg:mb-0">
                      <div className="w-24 flex-shrink-0">
                        <Label className="font-medium text-base">{label}</Label>
                      </div>
                      <Switch
                        checked={daySchedule?.isActive || false}
                        onCheckedChange={(checked) => toggleDayActive(key, checked)}
                      />
                      {daySchedule?.isActive && (
                        <Badge variant="outline" className="ml-2">Activo</Badge>
                      )}
                    </div>
                    
                    {daySchedule?.isActive && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${key}-start`} className="text-sm font-medium min-w-[50px]">Desde:</Label>
                          <Input
                            id={`${key}-start`}
                            type="time"
                            value={daySchedule?.startTime || '08:00'}
                            onChange={(e) => updateDaySchedule(key, 'startTime', e.target.value)}
                            className="w-36 h-10"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${key}-end`} className="text-sm font-medium min-w-[50px]">Hasta:</Label>
                          <Input
                            id={`${key}-end`}
                            type="time"
                            value={daySchedule?.endTime || '17:00'}
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
          </TabsContent>
        </Tabs>

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