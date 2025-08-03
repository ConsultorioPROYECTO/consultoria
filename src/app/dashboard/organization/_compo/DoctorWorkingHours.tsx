'use client';

import { useState, useEffect, useRef } from 'react';
import WaveformLoader from '@/components/custom/WaveformLoader';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, AlertCircle, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
// import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils'; // Removido - usando contexto centralizado
import { useAuth } from '@/app/context/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { DAYS_OF_WEEK } from "@rutas/types/working-hours";
import type { 
  DoctorWorkingHours, 
  DailyWorkingHours, 
  DayOfWeek, 
  TimeInterval 
} from "@rutas/types/google-calendar-schemas";
import { toast } from 'sonner';

// --- NUEVAS FUNCIONES DE LÓGICA Y VALIDACIÓN ---

function validateAndFormatIntervals(day: DailyWorkingHours): { errors: string[], formattedDay?: DailyWorkingHours } {
  const errors: string[] = [];
  const dayLabel = DAYS_OF_WEEK.find(d => d.apiValue === day.dayOfWeek)?.label || day.dayOfWeek;

  if (day.intervals.length === 0) {
    return { errors: [`${dayLabel} no tiene intervalos.`] };
  }

  // Ordenar intervalos para detectar solapamientos
  const sortedIntervals = [...day.intervals].sort((a, b) => a.start.localeCompare(b.start));

  for (let i = 0; i < sortedIntervals.length; i++) {
    const current = sortedIntervals[i];

    // 1. Validar formato y lógica de cada intervalo
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(current.start) || !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(current.end)) {
      errors.push(`Formato de hora inválido en ${dayLabel}. Use HH:MM.`);
      continue; // No se pueden hacer más validaciones si el formato es incorrecto
    }
    if (current.start >= current.end) {
      errors.push(`En ${dayLabel}, la hora de inicio (${current.start}) debe ser menor que la de fin (${current.end}).`);
    }

    // 2. Validar solapamiento con el siguiente intervalo
    if (i + 1 < sortedIntervals.length) {
      const next = sortedIntervals[i + 1];
      if (current.end > next.start) {
        errors.push(`En ${dayLabel}, el intervalo ${current.start}-${current.end} se solapa con ${next.start}-${next.end}.`);
      }
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { errors: [], formattedDay: { ...day, intervals: sortedIntervals } };
}

function formatHoursForDisplay(workingHours: DailyWorkingHours[]): string {
    if (workingHours.length === 0) return 'No hay días laborales configurados.';
  
    return workingHours
      .map(day => {
        const dayLabel = DAYS_OF_WEEK.find(d => d.apiValue === day.dayOfWeek)?.label || day.dayOfWeek;
        const intervalsStr = day.intervals.map(int => `${int.start} - ${int.end}`).join(', ');
        return `${dayLabel}: ${intervalsStr}`;
      })
      .join(' | ');
}

// --- PROPS DEL COMPONENTE ---

interface DoctorWorkingHoursProps {
  doctorId: number;
  doctorName: string;
  initialWorkingHours?: DoctorWorkingHours;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (doctorId: number, workingHours: DoctorWorkingHours) => Promise<void>;
}

// --- COMPONENTE PRINCIPAL ---

export function DoctorWorkingHours({ 
  doctorId, 
  doctorName,
  initialWorkingHours,
  isOpen,
  onClose,
  onSave 
}: DoctorWorkingHoursProps) {
  const isMobile = useIsMobile();
  const { getAuthToken } = useAuth();
  const getAuthTokenRef = useRef(getAuthToken);
  const [workingHours, setWorkingHours] = useState<DailyWorkingHours[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  // Mantener la referencia de getAuthToken actualizada
  useEffect(() => {
    getAuthTokenRef.current = getAuthToken;
  }, [getAuthToken]);

  useEffect(() => {
    const loadWorkingHours = async () => {
      if (initialWorkingHours) {
        setWorkingHours(initialWorkingHours.workingHours || []);
        setIsLoading(false);
        return;
      }

      try {
        const token = await getAuthTokenRef.current();
        if (!token) {
          setErrors(['Autenticación requerida']);
          return;
        }

        const response = await fetch(`/api/doctors/${doctorId}/working-hours`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          // CORRECTO: Acceder a la propiedad anidada para obtener el array
          setWorkingHours(data.workingHours?.workingHours || []);
        } else if (response.status !== 404) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar horarios');
        }
      } catch (error) {
        console.error('Error loading working hours:', error);
        setErrors([error instanceof Error ? error.message : 'Error desconocido']);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkingHours();
  }, [doctorId, initialWorkingHours]);

  const handleDayToggle = (dayOfWeek: DayOfWeek, isActive: boolean) => {
    setErrors([]);
    setWorkingHours(currentHours => {
      const dayExists = currentHours.some(d => d.dayOfWeek === dayOfWeek);
      if (isActive && !dayExists) {
        // Añadir día con un intervalo por defecto
        return [...currentHours, { dayOfWeek, intervals: [{ start: '09:00', end: '17:00' }] }];
      } else if (!isActive && dayExists) {
        // Eliminar día
        return currentHours.filter(d => d.dayOfWeek !== dayOfWeek);
      }
      return currentHours;
    });
  };

  const handleIntervalChange = (dayOfWeek: DayOfWeek, intervalIndex: number, field: keyof TimeInterval, value: string) => {
    setErrors([]);
    setWorkingHours(currentHours => 
      currentHours.map(day => {
        if (day.dayOfWeek === dayOfWeek) {
          const updatedIntervals = day.intervals.map((interval, idx) => {
            if (idx === intervalIndex) {
              return { ...interval, [field]: value };
            }
            return interval;
          });
          return { ...day, intervals: updatedIntervals };
        }
        return day;
      })
    );
  };

  const addInterval = (dayOfWeek: DayOfWeek) => {
    setErrors([]);
    setWorkingHours(currentHours => 
      currentHours.map(day => {
        if (day.dayOfWeek === dayOfWeek) {
          // Añadir nuevo intervalo al final
          return { ...day, intervals: [...day.intervals, { start: '09:00', end: '10:00' }] };
        }
        return day;
      })
    );
  };

  const removeInterval = (dayOfWeek: DayOfWeek, intervalIndex: number) => {
    setErrors([]);
    setWorkingHours(currentHours => 
      currentHours.map(day => {
        if (day.dayOfWeek === dayOfWeek) {
          const updatedIntervals = day.intervals.filter((_, idx) => idx !== intervalIndex);
          // Si no quedan intervalos, se podría eliminar el día completo
          if (updatedIntervals.length === 0) {
            return null;
          }
          return { ...day, intervals: updatedIntervals };
        }
        return day;
      }).filter((d): d is DailyWorkingHours => d !== null)
    );
  };

  const handleSave = async () => {
    const allErrors: string[] = [];
    const validatedHours: DailyWorkingHours[] = [];

    // Validar y formatear cada día activo
    workingHours.forEach(day => {
      const result = validateAndFormatIntervals(day);
      if (result.errors.length > 0) {
        allErrors.push(...result.errors);
      } else if (result.formattedDay) {
        validatedHours.push(result.formattedDay);
      }
    });

    if (allErrors.length > 0) {
      setErrors(allErrors);
      toast.error('Errores de validación detectados', { description: allErrors.join('; ') });
      return;
    }

    setIsSaving(true);
    setErrors([]);
    
    const finalPayload: DoctorWorkingHours = { workingHours: validatedHours };

    try {
      const token = await getAuthTokenRef.current();
      if (!token) throw new Error('Autenticación requerida');

      console.log('Payload final a enviar a la API:', JSON.stringify(finalPayload, null, 2));

      const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar los horarios');
      }

      toast.success('Horarios guardados exitosamente');
      if (onSave) {
        await onSave(doctorId, finalPayload);
      }
      onClose(); // Cerrar el modal después de guardar exitosamente
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido';
      setErrors([errorMessage]);
      toast.error('Error al guardar', { description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  // Contenido compartido entre Dialog y Drawer
  const renderHeader = () => (
    <>
      <div className="flex items-center gap-2 text-xl font-semibold">
        <Clock className="h-6 w-6 text-primary" />
        Horarios de Trabajo - {doctorName}
      </div>
      <p className="text-sm text-muted-foreground">
        Configure los días y horarios de atención del doctor.
      </p>
    </>
  );

  const renderContent = () => (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <WaveformLoader className="w-24 h-auto text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-6">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => <li key={index}>{error}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {DAYS_OF_WEEK.map(({ label, apiValue }) => {
              const daySchedule = workingHours.find(d => d.dayOfWeek === apiValue);
              const isActive = !!daySchedule;

              return (
                <div key={apiValue} className="p-4 border rounded-lg bg-card transition-colors">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium text-base">{label}</Label>
                      <Switch checked={isActive} onCheckedChange={(checked) => handleDayToggle(apiValue, checked)} />
                    </div>

                    {isActive && (
                      <div className="grid gap-3 pl-2 border-l-2 border-primary/20">
                        {daySchedule.intervals.map((interval, index) => (
                          <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 pl-4">
                            <Input type="time" value={interval.start} onChange={(e) => handleIntervalChange(apiValue, index, 'start', e.target.value)} className="w-32 h-9" />
                            <span>-</span>
                            <Input type="time" value={interval.end} onChange={(e) => handleIntervalChange(apiValue, index, 'end', e.target.value)} className="w-32 h-9" />
                            <Button variant="ghost" size="icon" onClick={() => removeInterval(apiValue, index)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addInterval(apiValue)} className="ml-4 mt-2">
                          <PlusCircle className="h-4 w-4 mr-2" />Añadir Intervalo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-2 text-base">Resumen:</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {formatHoursForDisplay(workingHours)}
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="px-8 py-2.5">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} 
              {isSaving ? 'Guardando...' : 'Guardar Horarios'}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  // Renderizado condicional: Drawer para móvil, Dialog para desktop
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="flex flex-col max-h-[95vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle asChild>
              <div>{renderHeader()}</div>
            </DrawerTitle>
            <DrawerDescription>
              Configure los días y horarios de atención del doctor.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-auto px-4 pb-4">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-5xl sm:max-h-[95vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-6 w-6 text-primary" />
            Horarios de Trabajo - {doctorName}
          </DialogTitle>
          <DialogDescription>
            Configure los días y horarios de atención del doctor.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
