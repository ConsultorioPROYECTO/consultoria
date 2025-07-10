// Tipos para los horarios de trabajo de los doctores
import type { DayOfWeek } from './google-calendar-schemas';

/**
 * Deprecated
 */
export interface DaySchedule {
  isActive: boolean;
  startTime: string; // Formato HH:MM (24 horas)
  endTime: string;   // Formato HH:MM (24 horas)
}

/**
 * Deprecated
 */
export interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

/**
 * Deprecated
 */
export const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { isActive: true, startTime: '08:00', endTime: '17:00' },
  tuesday: { isActive: true, startTime: '08:00', endTime: '17:00' },
  wednesday: { isActive: true, startTime: '08:00', endTime: '17:00' },
  thursday: { isActive: true, startTime: '08:00', endTime: '17:00' },
  friday: { isActive: true, startTime: '08:00', endTime: '17:00' },
  saturday: { isActive: false, startTime: '08:00', endTime: '12:00' },
  sunday: { isActive: false, startTime: '08:00', endTime: '12:00' }
};

/**
 * Deprecated
 */
export const DAYS_OF_WEEK: { key: keyof WorkingHours; label: string; apiValue: DayOfWeek }[] = [
  { key: 'monday',    label: 'Lunes',     apiValue: 'MONDAY' },
  { key: 'tuesday',   label: 'Martes',    apiValue: 'TUESDAY' },
  { key: 'wednesday', label: 'Miércoles', apiValue: 'WEDNESDAY' },
  { key: 'thursday',  label: 'Jueves',    apiValue: 'THURSDAY' },
  { key: 'friday',    label: 'Viernes',   apiValue: 'FRIDAY' },
  { key: 'saturday',  label: 'Sábado',    apiValue: 'SATURDAY' },
  { key: 'sunday',    label: 'Domingo',   apiValue: 'SUNDAY' }
];

/**
 * Deprecated
 */
export function validateWorkingHours(hours: WorkingHours): string[] {
  const errors: string[] = [];
  
  Object.entries(hours).forEach(([day, schedule]) => {
    if (schedule.isActive) {
      // Validar formato de tiempo
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(schedule.startTime)) {
        errors.push(`Hora de inicio inválida para ${day}`);
      }
      if (!timeRegex.test(schedule.endTime)) {
        errors.push(`Hora de fin inválida para ${day}`);
      }
      
      // Validar que la hora de inicio sea menor que la de fin
      if (schedule.startTime >= schedule.endTime) {
        errors.push(`La hora de inicio debe ser menor que la hora de fin para ${day}`);
      }
    }
  });
  
  return errors;
}

// Función para formatear horarios para mostrar
export function formatWorkingHours(hours: WorkingHours): string {
  const activeDays = Object.entries(hours)
    .filter(([, schedule]) => schedule.isActive)
    .map(([day, schedule]) => {
      const dayLabel = DAYS_OF_WEEK.find(d => d.key === day)?.label || day;
      return `${dayLabel}: ${schedule.startTime}-${schedule.endTime}`;
    });
  
  return activeDays.length > 0 ? activeDays.join(', ') : 'Sin horarios definidos';
}