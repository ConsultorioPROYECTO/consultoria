// examples/use-doctors-availability.ts
// Ejemplo de cómo usar la nueva API de disponibilidad de doctores por servicio

import React, { useState, useEffect, useCallback } from 'react';
import {
  ServiceDoctorsAvailabilityResponse,
  TimeInterval,
  TimePeriod,
  IntervalsByPeriod,
  IntervalsByPeriodSummary,
} from '@/types/doctor-availability';

/**
 * Hook personalizado para obtener la disponibilidad de doctores por servicio
 */
export const useDoctorsAvailability = (serviceId: string) => {
  const [data, setData] = useState<ServiceDoctorsAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/services/${serviceId}/doctors/availability`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    if (serviceId) {
      fetchAvailability();
    }
  }, [serviceId, fetchAvailability]);

  return { data, loading, error, refetch: fetchAvailability };
};

/**
 * Función utilitaria para contar intervalos en todos los períodos
 */
const countIntervalsInPeriods = (intervals: IntervalsByPeriod | IntervalsByPeriodSummary): number => {
  return Object.values(intervals).reduce(
    (total, periodIntervals) => {
      if (Array.isArray(periodIntervals)) {
        return total + periodIntervals.length;
      }
      // Si es string (modo summary), contamos como 1 período disponible
      return total + (periodIntervals ? 1 : 0);
    },
    0
  );
};

/**
 * Función utilitaria para formatear la disponibilidad para mostrar en UI
 */
export const formatAvailabilityForDisplay = (data: ServiceDoctorsAvailabilityResponse) => {
  return data.availability.doctors.map(doctor => ({
    doctor: {
      id: doctor.idDoctor,
      name: doctor.doctorName,
    },
    totalDays: Object.keys(doctor.availability).length,
    totalSlots: Object.values(doctor.availability).reduce(
      (total, day) => total + countIntervalsInPeriods(day.intervals),
      0
    ),
    availability: doctor.availability,
  }));
};

/**
 * Función para encontrar el próximo slot disponible de cualquier doctor
 */
export const findNextAvailableSlot = (data: ServiceDoctorsAvailabilityResponse) => {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  const today = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).replace(/^\w/, c => c.toUpperCase()); // Formato largo en español

  for (const doctor of data.availability.doctors) {
    for (const [date, dayAvailability] of Object.entries(doctor.availability)) {
      // Solo considerar fechas futuras o hoy con horarios futuros
      const isToday = date === today;
      const isFutureDate = !isToday; // Asumimos que las fechas están ordenadas
      
      if (isFutureDate || isToday) {
        // Revisar todos los períodos del día
        for (const period of ['mañana', 'tarde', 'noche'] as TimePeriod[]) {
          const intervals = dayAvailability.intervals[period];
          if (intervals && Array.isArray(intervals)) {
            for (const interval of intervals) {
              // Si es hoy, verificar que el horario sea futuro
              if (!isToday || interval.startTime > currentTime) {
                return {
                  doctor: {
                    id: doctor.idDoctor,
                    name: doctor.doctorName,
                  },
                  date,
                  period,
                  startTime: interval.startTime,
                  endTime: interval.endTime,
                  timeZone: dayAvailability.timeZone,
                };
              }
            }
          } else if (intervals && typeof intervals === 'string') {
            // En modo summary, solo sabemos que hay disponibilidad pero no los horarios específicos
            return {
              doctor: {
                id: doctor.idDoctor,
                name: doctor.doctorName,
              },
              date,
              period,
              startTime: 'Consultar detalles',
              endTime: 'Consultar detalles',
              timeZone: dayAvailability.timeZone,
            };
          }
        }
      }
    }
  }
  
  return null;
};

/**
 * Función para agrupar disponibilidad por fecha (todos los doctores)
 */
export const groupAvailabilityByDate = (data: ServiceDoctorsAvailabilityResponse) => {
  const groupedByDate: Record<string, {
    date: string;
    doctors: Array<{
      doctor: { id: number; name: string };
      intervals: IntervalsByPeriod | IntervalsByPeriodSummary;
      timeZone: string;
    }>;
  }> = {};

  data.availability.doctors.forEach(doctor => {
    Object.entries(doctor.availability).forEach(([date, dayAvailability]) => {
      if (!groupedByDate[date]) {
        groupedByDate[date] = {
          date,
          doctors: [],
        };
      }
      
      groupedByDate[date].doctors.push({
        doctor: {
          id: doctor.idDoctor,
          name: doctor.doctorName,
        },
        intervals: dayAvailability.intervals,
        timeZone: dayAvailability.timeZone,
      });
    });
  });

  return groupedByDate;
};

/**
 * Función para obtener todos los intervalos de un día sin importar el período
 */
export const getAllIntervalsForDay = (intervals: IntervalsByPeriod | IntervalsByPeriodSummary): TimeInterval[] => {
  const allIntervals: TimeInterval[] = [];
  
  (['mañana', 'tarde', 'noche'] as TimePeriod[]).forEach(period => {
    const periodData = intervals[period];
    if (periodData && Array.isArray(periodData)) {
      allIntervals.push(...periodData);
    }
    // Si es string (modo summary), no podemos extraer intervalos específicos
  });
  
  return allIntervals;
};

/**
 * Función para obtener intervalos por período específico
 */
export const getIntervalsByPeriod = (intervals: IntervalsByPeriod | IntervalsByPeriodSummary, period: TimePeriod): TimeInterval[] => {
  const periodData = intervals[period];
  if (Array.isArray(periodData)) {
    return periodData;
  }
  // Si es string (modo summary), no podemos devolver intervalos específicos
  return [];
};

/**
 * Función para obtener estadísticas de disponibilidad
 */
export const getAvailabilityStats = (data: ServiceDoctorsAvailabilityResponse) => {
  const totalDoctors = data.availability.doctors.length;
  const doctorsWithAvailability = data.availability.doctors.filter(
    doctor => Object.keys(doctor.availability).length > 0
  ).length;
  
  let totalDays = 0;
  let totalSlots = 0;
  
  data.availability.doctors.forEach(doctor => {
    totalDays += Object.keys(doctor.availability).length;
    Object.values(doctor.availability).forEach(day => {
      totalSlots += countIntervalsInPeriods(day.intervals);
    });
  });
  
  return {
    totalDoctors,
    doctorsWithAvailability,
    totalDays,
    totalSlots,
  };
};

/**
 * Ejemplo de componente React que usa la API
 */
export const DoctorsAvailabilityExample: React.FC<{ serviceId: string }> = ({ serviceId }) => {
  const { data, loading, error } = useDoctorsAvailability(serviceId);

  if (loading) {
    return (
      <div className="p-4">
        <h2>Disponibilidad de Doctores</h2>
        <p>Cargando disponibilidad...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h2>Disponibilidad de Doctores</h2>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const formattedData = formatAvailabilityForDisplay(data);
  const nextSlot = findNextAvailableSlot(data);
  const groupedByDate = groupAvailabilityByDate(data);
  const stats = getAvailabilityStats(data);

  return (
    <div className="p-6 space-y-6">
      <h2>Disponibilidad de Doctores</h2>
      
      {/* Próximo turno disponible */}
      {nextSlot && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3>Próximo turno disponible</h3>
          <p>
            Dr. {nextSlot.doctor.name} - {nextSlot.date} ({nextSlot.period}) a las {nextSlot.startTime}
          </p>
        </div>
      )}

      {/* Resumen por doctor */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3>Resumen por doctor</h3>
        {formattedData.map((doctor) => (
          <div key={doctor.doctor.id} className="mb-2">
            <h4>{doctor.doctor.name}</h4>
            <p>{doctor.totalDays} días disponibles, {doctor.totalSlots} turnos totales</p>
          </div>
        ))}
      </div>

      {/* Disponibilidad por fecha */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3>Disponibilidad por fecha</h3>
        {Object.entries(groupedByDate).map(([date, { doctors }]) => (
          <div key={date} className="mb-4">
            <h4>{date}</h4>
            {doctors.map((doctor) => (
              <div key={`${doctor.doctor.id}-${date}`} className="ml-4">
                <h5>{doctor.doctor.name}</h5>
                
                {/* Mostrar intervalos agrupados por período */}
                {(['mañana', 'tarde', 'noche'] as TimePeriod[]).map(period => {
                  const periodIntervals = getIntervalsByPeriod(doctor.intervals, period);
                  if (periodIntervals.length === 0) return null;
                  
                  return (
                    <div key={period} className="mb-2">
                      <h6 className="font-semibold capitalize text-sm">{period}</h6>
                      <div className="flex flex-wrap gap-2 ml-2">
                        {periodIntervals.map((interval, index) => (
                          <span 
                            key={index} 
                            className={`px-2 py-1 rounded text-sm ${
                              period === 'mañana' ? 'bg-yellow-200' :
                              period === 'tarde' ? 'bg-orange-200' :
                              'bg-purple-200'
                            }`}
                          >
                            {interval.startTime} - {interval.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Estadísticas */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3>Estadísticas</h3>
        <p>Total doctores: {stats.totalDoctors}</p>
        <p>Doctores con disponibilidad: {stats.doctorsWithAvailability}</p>
        <p>Total días: {stats.totalDays}</p>
        <p>Total turnos: {stats.totalSlots}</p>
      </div>
    </div>
  );
};

/**
 * Función para validar si un doctor específico está disponible en una fecha/hora
 */
export const isDoctorAvailableAt = (
  data: ServiceDoctorsAvailabilityResponse,
  doctorId: number,
  date: string,
  time: string
): boolean => {
  const doctor = data.availability.doctors.find(d => d.idDoctor === doctorId);
  if (!doctor || !doctor.availability[date]) {
    return false;
  }

  const dayAvailability = doctor.availability[date];
  const allIntervals = getAllIntervalsForDay(dayAvailability.intervals);
  return allIntervals.some((interval: TimeInterval) => 
    time >= interval.startTime && time < interval.endTime
  );
};