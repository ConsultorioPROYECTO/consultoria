/**
 * Ejemplos de uso de la API de horarios de trabajo con validaciones Zod
 * 
 * Este archivo muestra cómo usar correctamente la API `/api/doctors/[id]/working-hours`
 * con el nuevo sistema de validación basado en Zod y el tipo DailyWorkingHours.
 */

import { DoctorWorkingHours } from '../google-calendar-schemas';

// Ejemplo 1: Horarios de trabajo típicos de lunes a viernes
export const standardWorkingHours: DoctorWorkingHours = {
  workingHours: [
    {
      dayOfWeek: 'MONDAY',
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '17:00' }
      ]
    },
    {
      dayOfWeek: 'TUESDAY',
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '17:00' }
      ]
    },
    {
      dayOfWeek: 'WEDNESDAY',
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '17:00' }
      ]
    },
    {
      dayOfWeek: 'THURSDAY',
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '17:00' }
      ]
    },
    {
      dayOfWeek: 'FRIDAY',
      intervals: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '17:00' }
      ]
    }
  ]
};

// Ejemplo 2: Horarios con días de trabajo extendido
export const extendedWorkingHours: DoctorWorkingHours = {
  workingHours: [
    {
      dayOfWeek: 'MONDAY',
      intervals: [
        { start: '08:00', end: '18:00' }
      ]
    },
    {
      dayOfWeek: 'TUESDAY',
      intervals: [
        { start: '08:00', end: '18:00' }
      ]
    },
    {
      dayOfWeek: 'WEDNESDAY',
      intervals: [
        { start: '08:00', end: '18:00' }
      ]
    },
    {
      dayOfWeek: 'SATURDAY',
      intervals: [
        { start: '09:00', end: '13:00' }
      ]
    }
  ]
};

// Ejemplo 3: Horarios con múltiples intervalos por día
export const flexibleWorkingHours: DoctorWorkingHours = {
  workingHours: [
    {
      dayOfWeek: 'MONDAY',
      intervals: [
        { start: '07:00', end: '10:00' },
        { start: '11:00', end: '14:00' },
        { start: '16:00', end: '19:00' }
      ]
    },
    {
      dayOfWeek: 'WEDNESDAY',
      intervals: [
        { start: '08:00', end: '12:00' },
        { start: '15:00', end: '18:00' }
      ]
    },
    {
      dayOfWeek: 'FRIDAY',
      intervals: [
        { start: '09:00', end: '17:00' }
      ]
    }
  ]
};

// Ejemplo 4: Día sin horarios de trabajo (intervalos vacíos)
export const partialWorkingHours: DoctorWorkingHours = {
  workingHours: [
    {
      dayOfWeek: 'TUESDAY',
      intervals: [
        { start: '09:00', end: '17:00' }
      ]
    },
    {
      dayOfWeek: 'THURSDAY',
      intervals: [
        { start: '09:00', end: '17:00' }
      ]
    },
    {
      dayOfWeek: 'SUNDAY',
      intervals: [] // Sin horarios de trabajo este día
    }
  ]
};

/**
 * Función de ejemplo para actualizar horarios de trabajo
 */
export async function updateDoctorWorkingHours(
  doctorId: number,
  workingHours: DoctorWorkingHours['workingHours']
): Promise<Response> {
  const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workingHours }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error updating working hours: ${errorData.error}`);
  }

  return response;
}

/**
 * Función de ejemplo para obtener horarios de trabajo
 */
export async function getDoctorWorkingHours(
  doctorId: number
): Promise<{ doctorId: number; workingHours: DoctorWorkingHours | unknown }> {
  const response = await fetch(`/api/doctors/${doctorId}/working-hours`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error fetching working hours: ${errorData.error}`);
  }

  return response.json();
}

/**
 * Ejemplos de uso de las funciones
 */
export async function exampleUsage() {
  try {
    // Actualizar horarios de trabajo para el doctor con ID 1
    await updateDoctorWorkingHours(1, standardWorkingHours.workingHours);
    console.log('Horarios actualizados exitosamente');

    // Obtener horarios de trabajo
    const doctorHours = await getDoctorWorkingHours(1);
    console.log('Horarios obtenidos:', doctorHours);
  } catch (error) {
    console.error('Error:', error);
  }
}

/**
 * Ejemplos de datos que causarían errores de validación
 */
export const invalidExamples = {
  // Error: Formato de tiempo inválido
  invalidTimeFormat: {
    workingHours: [
      {
        dayOfWeek: 'MONDAY',
        intervals: [
          { start: '9:00', end: '17:00' } // Debería ser '09:00'
        ]
      }
    ]
  },

  // Error: Hora de inicio posterior a hora de fin
  invalidTimeOrder: {
    workingHours: [
      {
        dayOfWeek: 'MONDAY',
        intervals: [
          { start: '17:00', end: '09:00' }
        ]
      }
    ]
  },

  // Error: Intervalos superpuestos
  overlappingIntervals: {
    workingHours: [
      {
        dayOfWeek: 'MONDAY',
        intervals: [
          { start: '09:00', end: '13:00' },
          { start: '12:00', end: '17:00' } // Se superpone con el anterior
        ]
      }
    ]
  },

  // Error: Días duplicados
  duplicateDays: {
    workingHours: [
      {
        dayOfWeek: 'MONDAY',
        intervals: [{ start: '09:00', end: '17:00' }]
      },
      {
        dayOfWeek: 'MONDAY', // Duplicado
        intervals: [{ start: '10:00', end: '18:00' }]
      }
    ]
  },

  // Error: Día de la semana inválido
  invalidDayOfWeek: {
    workingHours: [
      {
        dayOfWeek: 'LUNES', // Debería ser 'MONDAY'
        intervals: [{ start: '09:00', end: '17:00' }]
      }
    ]
  }
};