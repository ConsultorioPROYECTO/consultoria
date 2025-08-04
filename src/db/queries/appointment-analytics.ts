/**
 * Consultas optimizadas para analytics y dashboards de citas médicas.
 * @packageDocumentation
 * @module db/queries/appointment-analytics
 */

import { and, between, count, eq, sql, sum, avg, desc, asc } from 'drizzle-orm';
import { db } from '../index';
import { appointments } from '../schema/appointments';
import { doctors } from '../schema/doctors';
import { users } from '../schema/users';
import { patients } from '../schema/patients';
import { medicalServices } from '../schema/medical_services';
import {
  AppointmentMetrics,
  DoctorAppointmentMetrics,
  ServiceAppointmentMetrics,
  TimeBasedMetrics,
  AppointmentFilters,
  OptimizedAppointmentQuery
} from '../../types/appointment-analytics';
import { AppointmentStatusType } from '../../types/appointment-status';

/**
 * Clase para consultas optimizadas de analytics de citas.
 */
export class AppointmentAnalyticsQueries {
  /**
   * Obtiene métricas básicas de citas para un período específico.
   */
  static async getBasicMetrics(
    organizationId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<AppointmentMetrics> {
    const result = await db
      .select({
        totalAppointments: count(),
        pendingAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'pending' THEN 1 ELSE 0 END`
        ),
        confirmedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'accepted' THEN 1 ELSE 0 END`
        ),
        attendedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'attended' THEN 1 ELSE 0 END`
        ),
        canceledAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'canceled' THEN 1 ELSE 0 END`
        ),
        rejectedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'rejected' THEN 1 ELSE 0 END`
        ),
        averageDuration: avg(appointments.durationMinutes),
        totalRevenue: sum(sql`CAST(${appointments.appointmentPrice} AS DECIMAL(10,2))`),
        firstTimePatients: sum(
          sql`CASE WHEN ${appointments.isFirstTime} = 1 THEN 1 ELSE 0 END`
        ),
        followUpAppointments: sum(
          sql`CASE WHEN ${appointments.isFollowUp} = 1 THEN 1 ELSE 0 END`
        ),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          between(appointments.appointmentDate, new Date(dateFrom), new Date(dateTo))
        )
      );

    const metrics = result[0];
    return {
      totalAppointments: Number(metrics.totalAppointments) || 0,
      pendingAppointments: Number(metrics.pendingAppointments) || 0,
      confirmedAppointments: Number(metrics.confirmedAppointments) || 0,
      attendedAppointments: Number(metrics.attendedAppointments) || 0,
      canceledAppointments: Number(metrics.canceledAppointments) || 0,
      rejectedAppointments: Number(metrics.rejectedAppointments) || 0,
      averageDuration: Number(metrics.averageDuration) || 0,
      totalRevenue: Number(metrics.totalRevenue) || 0,
      firstTimePatients: Number(metrics.firstTimePatients) || 0,
      followUpAppointments: Number(metrics.followUpAppointments) || 0,
    };
  }

  /**
   * Obtiene métricas por doctor para dashboards.
   */
  static async getDoctorMetrics(
    organizationId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<DoctorAppointmentMetrics[]> {
    const result = await db
      .select({
        doctorId: appointments.doctorId,
        doctorName: users.displayName,
        totalAppointments: count(),
        pendingAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'pending' THEN 1 ELSE 0 END`
        ),
        confirmedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'accepted' THEN 1 ELSE 0 END`
        ),
        attendedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'attended' THEN 1 ELSE 0 END`
        ),
        canceledAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'canceled' THEN 1 ELSE 0 END`
        ),
        rejectedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'rejected' THEN 1 ELSE 0 END`
        ),
        averageDuration: avg(appointments.durationMinutes),
        totalRevenue: sum(sql`CAST(${appointments.appointmentPrice} AS DECIMAL(10,2))`),
        firstTimePatients: sum(
          sql`CASE WHEN ${appointments.isFirstTime} = 1 THEN 1 ELSE 0 END`
        ),
        followUpAppointments: sum(
          sql`CASE WHEN ${appointments.isFollowUp} = 1 THEN 1 ELSE 0 END`
        ),
        totalMinutesBooked: sum(appointments.durationMinutes),
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          between(appointments.appointmentDate, new Date(dateFrom), new Date(dateTo))
        )
      )
      .groupBy(appointments.doctorId, users.displayName)
      .orderBy(desc(count()));

    return result.map((row) => {
      const totalMinutes = Number(row.totalMinutesBooked) || 0;
      // Asumiendo 8 horas laborales por día
      const workingDaysInPeriod = this.calculateWorkingDays(dateFrom, dateTo);
      const availableMinutes = workingDaysInPeriod * 8 * 60;
      const utilizationRate = availableMinutes > 0 ? (totalMinutes / availableMinutes) * 100 : 0;

      return {
        doctorId: row.doctorId,
        doctorName: String(row.doctorName),
        totalAppointments: Number(row.totalAppointments) || 0,
        pendingAppointments: Number(row.pendingAppointments) || 0,
        confirmedAppointments: Number(row.confirmedAppointments) || 0,
        attendedAppointments: Number(row.attendedAppointments) || 0,
        canceledAppointments: Number(row.canceledAppointments) || 0,
        rejectedAppointments: Number(row.rejectedAppointments) || 0,
        averageDuration: Number(row.averageDuration) || 0,
        totalRevenue: Number(row.totalRevenue) || 0,
        firstTimePatients: Number(row.firstTimePatients) || 0,
        followUpAppointments: Number(row.followUpAppointments) || 0,
        utilizationRate: Math.round(utilizationRate),
      };
    });
  }

  /**
   * Obtiene métricas por servicio médico.
   */
  static async getServiceMetrics(
    organizationId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<ServiceAppointmentMetrics[]> {
    const result = await db
      .select({
        serviceId: appointments.serviceId,
        serviceName: medicalServices.name,
        totalAppointments: count(),
        pendingAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'pending' THEN 1 ELSE 0 END`
        ),
        confirmedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'accepted' THEN 1 ELSE 0 END`
        ),
        attendedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'attended' THEN 1 ELSE 0 END`
        ),
        canceledAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'canceled' THEN 1 ELSE 0 END`
        ),
        rejectedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'rejected' THEN 1 ELSE 0 END`
        ),
        averageDuration: avg(appointments.durationMinutes),
        totalRevenue: sum(sql`CAST(${appointments.appointmentPrice} AS DECIMAL(10,2))`),
        averagePrice: avg(sql`CAST(${appointments.appointmentPrice} AS DECIMAL(10,2))`),
        firstTimePatients: sum(
          sql`CASE WHEN ${appointments.isFirstTime} = 1 THEN 1 ELSE 0 END`
        ),
        followUpAppointments: sum(
          sql`CASE WHEN ${appointments.isFollowUp} = 1 THEN 1 ELSE 0 END`
        ),
      })
      .from(appointments)
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          between(appointments.appointmentDate, new Date(dateFrom), new Date(dateTo))
        )
      )
      .groupBy(appointments.serviceId, medicalServices.name)
      .orderBy(desc(count()));

    return result.map((row) => ({
      serviceId: row.serviceId || 0, // Manejar null
      serviceName: row.serviceName || 'Sin servicio',
      totalAppointments: Number(row.totalAppointments) || 0,
      pendingAppointments: Number(row.pendingAppointments) || 0,
      confirmedAppointments: Number(row.confirmedAppointments) || 0,
      attendedAppointments: Number(row.attendedAppointments) || 0,
      canceledAppointments: Number(row.canceledAppointments) || 0,
      rejectedAppointments: Number(row.rejectedAppointments) || 0,
      averageDuration: Number(row.averageDuration) || 0,
      totalRevenue: Number(row.totalRevenue) || 0,
      firstTimePatients: Number(row.firstTimePatients) || 0,
      followUpAppointments: Number(row.followUpAppointments) || 0,
      averagePrice: Number(row.averagePrice) || 0,
      demandRate: Number(row.totalAppointments) || 0, // Simplificado por ahora
    }));
  }

  /**
   * Obtiene métricas diarias para gráficos de tendencias.
   */
  static async getDailyMetrics(
    organizationId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<TimeBasedMetrics[]> {
    const result = await db
      .select({
        date: appointments.appointmentDate,
        totalAppointments: count(),
        pendingAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'pending' THEN 1 ELSE 0 END`
        ),
        confirmedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'accepted' THEN 1 ELSE 0 END`
        ),
        attendedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'attended' THEN 1 ELSE 0 END`
        ),
        canceledAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'canceled' THEN 1 ELSE 0 END`
        ),
        rejectedAppointments: sum(
          sql`CASE WHEN ${appointments.status} = 'rejected' THEN 1 ELSE 0 END`
        ),
        averageDuration: avg(appointments.durationMinutes),
        totalRevenue: sum(sql`CAST(${appointments.appointmentPrice} AS DECIMAL(10,2))`),
        firstTimePatients: sum(
          sql`CASE WHEN ${appointments.isFirstTime} = 1 THEN 1 ELSE 0 END`
        ),
        followUpAppointments: sum(
          sql`CASE WHEN ${appointments.isFollowUp} = 1 THEN 1 ELSE 0 END`
        ),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          between(appointments.appointmentDate, new Date(dateFrom), new Date(dateTo))
        )
      )
      .groupBy(appointments.appointmentDate)
      .orderBy(asc(appointments.appointmentDate));

    return result.map((row) => ({
      date: String(row.date),
      metrics: {
        totalAppointments: Number(row.totalAppointments) || 0,
        pendingAppointments: Number(row.pendingAppointments) || 0,
        confirmedAppointments: Number(row.confirmedAppointments) || 0,
        attendedAppointments: Number(row.attendedAppointments) || 0,
        canceledAppointments: Number(row.canceledAppointments) || 0,
        rejectedAppointments: Number(row.rejectedAppointments) || 0,
        averageDuration: Number(row.averageDuration) || 0,
        totalRevenue: Number(row.totalRevenue) || 0,
        firstTimePatients: Number(row.firstTimePatients) || 0,
        followUpAppointments: Number(row.followUpAppointments) || 0,
      },
    }));
  }

  /**
   * Obtiene citas optimizadas con joins para dashboards.
   */
  static async getOptimizedAppointments(
    filters: AppointmentFilters,
    limit: number = 100,
    offset: number = 0
  ): Promise<OptimizedAppointmentQuery[]> {
    const conditions = [];

    if (filters.organizationId) {
      conditions.push(eq(appointments.organizationId, filters.organizationId));
    }
    if (filters.doctorId) {
      conditions.push(eq(appointments.doctorId, filters.doctorId));
    }
    if (filters.patientId) {
      conditions.push(eq(appointments.patientId, filters.patientId));
    }
    if (filters.serviceId) {
      conditions.push(eq(appointments.serviceId, filters.serviceId));
    }
    if (filters.dateFrom && filters.dateTo) {
      conditions.push(between(appointments.appointmentDate, new Date(filters.dateFrom), new Date(filters.dateTo)));
    }
    if (filters.status && filters.status.length > 0) {
      conditions.push(sql`${appointments.status} IN ${filters.status}`);
    }
    if (filters.priority && filters.priority.length > 0) {
      conditions.push(sql`${appointments.priority} IN ${filters.priority}`);
    }
    if (filters.isFirstTime !== undefined) {
      conditions.push(eq(appointments.isFirstTime, filters.isFirstTime ? 1 : 0));
    }
    if (filters.isFollowUp !== undefined) {
      conditions.push(eq(appointments.isFollowUp, filters.isFollowUp ? 1 : 0));
    }

    const result = await db
      .select({
        id: appointments.id,
        doctorId: appointments.doctorId,
        doctorName: users.displayName,
        patientId: appointments.patientId,
        patientName: sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName})`,
        serviceId: appointments.serviceId,
        serviceName: medicalServices.name,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        endTime: appointments.endTime,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        priority: appointments.priority,
        appointmentPrice: appointments.appointmentPrice,
        isFirstTime: appointments.isFirstTime,
        isFollowUp: appointments.isFollowUp,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        attendedAt: appointments.attendedAt,
        canceledAt: appointments.canceledAt,
      })
      .from(appointments)
      .innerJoin(doctors, eq(appointments.doctorId, doctors.idDoctor))
      .innerJoin(users, eq(doctors.userId, users.id))
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(medicalServices, eq(appointments.serviceId, medicalServices.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime))
      .limit(limit)
      .offset(offset);

    return result.map((row) => ({
      id: row.id,
      doctorId: row.doctorId,
      doctorName: String(row.doctorName),
      patientId: row.patientId || 0, // Manejar null
      patientName: String(row.patientName),
      serviceId: row.serviceId || 0, // Manejar null
      serviceName: row.serviceName,
      appointmentDate: String(row.appointmentDate),
      appointmentTime: row.appointmentTime,
      endTime: row.endTime || undefined,
      durationMinutes: row.durationMinutes,
      status: row.status as AppointmentStatusType,
      priority: row.priority as 'low' | 'normal' | 'high' | 'urgent',
      appointmentPrice: row.appointmentPrice ? Number(row.appointmentPrice) : undefined,
      isFirstTime: Boolean(row.isFirstTime),
      isFollowUp: Boolean(row.isFollowUp),
      notes: row.notes || undefined,
      createdAt: String(row.createdAt),
      attendedAt: row.attendedAt ? String(row.attendedAt) : undefined,
      canceledAt: row.canceledAt ? String(row.canceledAt) : undefined,
    }));
  }

  /**
   * Calcula días laborales entre dos fechas.
   */
  private static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Excluir sábados (6) y domingos (0)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        workingDays++;
      }
    }

    return workingDays;
  }

  /**
   * Obtiene distribución horaria de citas para un día específico.
   */
  static async getHourlyDistribution(
    organizationId: number,
    date: string
  ): Promise<{ [hour: string]: number }> {
    const result = await db
      .select({
        hour: sql`HOUR(${appointments.appointmentTime})`,
        count: count(),
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.organizationId, organizationId),
          eq(appointments.appointmentDate, new Date(date))
        )
      )
      .groupBy(sql`HOUR(${appointments.appointmentTime})`);

    const distribution: { [hour: string]: number } = {};
    result.forEach((row) => {
      distribution[String(row.hour)] = Number(row.count);
    });

    return distribution;
  }
}