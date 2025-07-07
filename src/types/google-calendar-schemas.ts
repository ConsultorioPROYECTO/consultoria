import { z } from 'zod';

/**
 * Esquema Zod para validar el formato de tiempo HH:mm
 * Requiere exactamente 2 dígitos para horas y 2 para minutos
 */
export const timeHHMMSchema = z.string().regex(
  /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
  'El formato de tiempo debe ser HH:mm con 2 dígitos (ej: 09:00, 17:30)'
);

/**
 * Esquema Zod para validar un intervalo de tiempo
 */
export const timeIntervalSchema = z.object({
  start: timeHHMMSchema,
  end: timeHHMMSchema
}).refine(
  (data) => {
    const [startHour, startMinute] = data.start.split(':').map(Number);
    const [endHour, endMinute] = data.end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return startMinutes < endMinutes;
  },
  {
    message: 'La hora de inicio debe ser anterior a la hora de fin',
    path: ['end']
  }
);

/**
 * Esquema Zod para validar los días de la semana
 */
export const dayOfWeekSchema = z.enum([
  'MONDAY',
  'TUESDAY', 
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
]);

/**
 * Esquema Zod para validar los horarios de trabajo diarios
 */
export const dailyWorkingHoursSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  intervals: z.array(timeIntervalSchema).min(0, 'Los intervalos no pueden estar vacíos')
}).refine(
  (data) => {
    // Validar que los intervalos no se superpongan
    const intervals = data.intervals;
    for (let i = 0; i < intervals.length - 1; i++) {
      const current = intervals[i];
      const next = intervals[i + 1];
      
      const [currentEndHour, currentEndMinute] = current.end.split(':').map(Number);
      const [nextStartHour, nextStartMinute] = next.start.split(':').map(Number);
      
      const currentEndMinutes = currentEndHour * 60 + currentEndMinute;
      const nextStartMinutes = nextStartHour * 60 + nextStartMinute;
      
      if (currentEndMinutes > nextStartMinutes) {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Los intervalos de tiempo no pueden superponerse',
    path: ['intervals']
  }
);

/**
 * Esquema Zod para validar los horarios de trabajo del doctor
 */
export const doctorWorkingHoursSchema = z.object({
  workingHours: z.array(dailyWorkingHoursSchema)
    .min(1, 'Debe especificar al menos un día de trabajo')
    .max(7, 'No puede especificar más de 7 días')
    .refine(
      (workingHours) => {
        // Validar que no haya días duplicados
        const days = workingHours.map(wh => wh.dayOfWeek);
        const uniqueDays = new Set(days);
        return days.length === uniqueDays.size;
      },
      {
        message: 'No puede haber días de la semana duplicados',
        path: ['workingHours']
      }
    )
});

/**
 * Esquema Zod para validar el cuerpo de la petición PUT
 */
export const updateWorkingHoursRequestSchema = z.object({
  workingHours: doctorWorkingHoursSchema.shape.workingHours
});

/**
 * Esquema Zod para validar el parámetro ID del doctor
 */
export const doctorIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'El ID del doctor debe ser un número válido')
});

// Tipos TypeScript inferidos de los esquemas Zod
export type TimeHHMM = z.infer<typeof timeHHMMSchema>;
export type TimeInterval = z.infer<typeof timeIntervalSchema>;
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;
export type DailyWorkingHours = z.infer<typeof dailyWorkingHoursSchema>;
export type DoctorWorkingHours = z.infer<typeof doctorWorkingHoursSchema>;
export type UpdateWorkingHoursRequest = z.infer<typeof updateWorkingHoursRequestSchema>;
export type DoctorIdParam = z.infer<typeof doctorIdParamSchema>;