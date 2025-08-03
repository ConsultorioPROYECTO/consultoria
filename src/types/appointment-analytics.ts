/**
 * Tipos optimizados para analytics y dashboards de citas médicas.
 * @packageDocumentation
 * @module types/appointment-analytics
 */

import { AppointmentStatusType } from './appointment-status';

/**
 * Prioridades válidas para las citas médicas.
 */
export const APPOINTMENT_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
} as const;

export type AppointmentPriorityType = typeof APPOINTMENT_PRIORITY[keyof typeof APPOINTMENT_PRIORITY];

/**
 * Interfaz para métricas básicas de citas por período.
 */
export interface AppointmentMetrics {
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  attendedAppointments: number;
  canceledAppointments: number;
  rejectedAppointments: number;
  averageDuration: number;
  totalRevenue: number;
  firstTimePatients: number;
  followUpAppointments: number;
}

/**
 * Interfaz para métricas por doctor.
 */
export interface DoctorAppointmentMetrics extends AppointmentMetrics {
  doctorId: number;
  doctorName: string;
  utilizationRate: number; // Porcentaje de tiempo ocupado
  averageRating?: number;
}

/**
 * Interfaz para métricas por servicio médico.
 */
export interface ServiceAppointmentMetrics extends AppointmentMetrics {
  serviceId: number;
  serviceName: string;
  averagePrice: number;
  demandRate: number; // Frecuencia de solicitud del servicio
}

/**
 * Interfaz para métricas diarias/semanales/mensuales.
 */
export interface TimeBasedMetrics {
  date: string; // YYYY-MM-DD
  metrics: AppointmentMetrics;
  hourlyDistribution?: { [hour: string]: number };
}

/**
 * Interfaz para análisis de tendencias.
 */
export interface AppointmentTrends {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  data: TimeBasedMetrics[];
  growthRate: number; // Porcentaje de crecimiento
  seasonalPatterns?: { [month: string]: number };
}

/**
 * Interfaz para filtros de consultas de dashboard.
 */
export interface AppointmentFilters {
  organizationId?: number;
  doctorId?: number;
  patientId?: number;
  serviceId?: number;
  status?: AppointmentStatusType[];
  priority?: AppointmentPriorityType[];
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  isFirstTime?: boolean;
  isFollowUp?: boolean;
  minDuration?: number;
  maxDuration?: number;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Interfaz para consultas optimizadas de citas.
 */
export interface OptimizedAppointmentQuery {
  id: number;
  doctorId: number;
  doctorName: string;
  patientId: number;
  patientName: string;
  serviceId: number;
  serviceName: string;
  appointmentDate: string;
  appointmentTime: string;
  endTime?: string;
  durationMinutes: number;
  status: AppointmentStatusType;
  priority: AppointmentPriorityType;
  appointmentPrice?: number;
  isFirstTime: boolean;
  isFollowUp: boolean;
  notes?: string;
  createdAt: string;
  attendedAt?: string;
  canceledAt?: string;
}

/**
 * Interfaz para resumen de disponibilidad de doctores.
 */
export interface DoctorAvailabilitySummary {
  doctorId: number;
  doctorName: string;
  date: string;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  utilizationPercentage: number;
  nextAvailableSlot?: string; // HH:MM
}

/**
 * Interfaz para alertas y notificaciones del dashboard.
 */
export interface DashboardAlert {
  type: 'high_demand' | 'low_utilization' | 'revenue_drop' | 'cancellation_spike';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedEntity: {
    type: 'doctor' | 'service' | 'organization';
    id: number;
    name: string;
  };
  metrics: {
    current: number;
    previous: number;
    threshold: number;
  };
  suggestions?: string[];
}

/**
 * Interfaz para configuración de dashboard.
 */
export interface DashboardConfig {
  refreshInterval: number; // minutos
  defaultDateRange: number; // días
  alertThresholds: {
    lowUtilization: number; // porcentaje
    highCancellation: number; // porcentaje
    revenueDrop: number; // porcentaje
  };
  preferredChartTypes: {
    appointments: 'line' | 'bar' | 'area';
    revenue: 'line' | 'bar' | 'area';
    utilization: 'gauge' | 'bar' | 'donut';
  };
}

/**
 * Funciones de utilidad para cálculos de métricas.
 */
export class AppointmentAnalytics {
  /**
   * Calcula la tasa de utilización de un doctor.
   */
  static calculateUtilizationRate(
    bookedMinutes: number,
    availableMinutes: number
  ): number {
    if (availableMinutes === 0) return 0;
    return Math.round((bookedMinutes / availableMinutes) * 100);
  }

  /**
   * Calcula el crecimiento porcentual entre dos períodos.
   */
  static calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  /**
   * Determina si una métrica requiere alerta.
   */
  static shouldAlert(
    current: number,
    threshold: number,
    type: 'above' | 'below'
  ): boolean {
    return type === 'above' ? current > threshold : current < threshold;
  }

  /**
   * Formatea duración en minutos a formato legible.
   */
  static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Calcula el promedio de una lista de números.
   */
  static calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round((sum / numbers.length) * 100) / 100;
  }
}