import { NextRequest, NextResponse } from "next/server";
import { AppointmentAnalyticsQueries } from "@/db/queries/appointment-analytics";
import { DoctorAppointmentMetrics } from "@/types/appointment-analytics";

/**
 * API: /api/dashboard/doctor-metrics?organizationId=1&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Devuelve citas y horas ocupadas por doctor para un rango de fechas.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const organizationId = Number(url.searchParams.get("organizationId") || 1);
  const dateFrom = url.searchParams.get("dateFrom") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const dateTo = url.searchParams.get("dateTo") || new Date().toISOString().split("T")[0];

  const doctorMetrics: DoctorAppointmentMetrics[] = await AppointmentAnalyticsQueries.getDoctorMetrics(
    organizationId,
    dateFrom,
    dateTo
  );

  // Convertir a formato para gráfico
  const data = doctorMetrics.map((m) => {
    const estimatedHours = (m.averageDuration * m.totalAppointments) / 60; // horas ocupadas aprox
    return {
      doctorName: m.doctorName,
      citas: m.totalAppointments,
      horas_ocupadas: Math.round(estimatedHours),
    };
  });

  return NextResponse.json({ data });
}