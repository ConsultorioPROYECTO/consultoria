// src/types/doctor-availability.ts

/**
 * Representa un intervalo de tiempo específico
 */
export type TimeInterval = {
  startTime: string; // Formato HH:mm (ej: "09:30")
  endTime: string;   // Formato HH:mm (ej: "10:00")
};

/**
 * Disponibilidad de un doctor para un día específico
 */
export type DayAvailability = {
  intervals: TimeInterval[];
  timeZone: string; // Zona horaria del doctor (ej: "America/Bogota")
};

/**
 * Disponibilidad completa de un doctor organizada por fecha
 * La clave es la fecha en formato YYYY-MM-DD
 */
export type DoctorAvailabilityByDate = {
  [date: string]: DayAvailability;
};

/**
 * Información de disponibilidad de un doctor específico
 */
export type DoctorAvailabilityInfo = {
  idDoctor: number;
  doctorName: string;
  availability: DoctorAvailabilityByDate;
};

/**
 * Respuesta completa de la API de disponibilidad de doctores por servicio
 */
export type ServiceDoctorsAvailabilityResponse = {
  availability: {
    doctors: DoctorAvailabilityInfo[];
  };
};

/**
 * Parámetros de entrada para la API
 */
export type ServiceAvailabilityParams = {
  serviceId: string;
};

/**
 * Respuesta de error de la API
 */
export type ServiceAvailabilityError = {
  error: string;
};

/**
 * Información básica de un doctor que puede ofrecer un servicio
 */
export type AvailableDoctor = {
  idDoctor: number;
  doctorName: string | null;
  calendarTimezone: string | null;
  calendarId: string | null;
};

/**
 * Configuración para el procesamiento de disponibilidad
 */
export type AvailabilityConfig = {
  daysAhead: number;        // Número de días hacia adelante a consultar
  intervalMinutes: number;  // Duración del servicio en minutos
  defaultTimezone: string;  // Zona horaria por defecto
};