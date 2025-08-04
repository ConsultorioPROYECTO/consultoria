import { NextRequest, NextResponse } from "next/server";
import { AppointmentAnalyticsQueries } from "@/db/queries/appointment-analytics";

/**
 * API: /api/dashboard/financial-metrics?organizationId=1&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Devuelve números de citas programadas y completadas para un rango de fechas.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const organizationId = Number(url.searchParams.get("organizationId") || 1);
  const dateFrom = url.searchParams.get("dateFrom") || new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const dateTo = url.searchParams.get("dateTo") || new Date().toISOString().split("T")[0];

  const metrics = await AppointmentAnalyticsQueries.getBasicMetrics(
    organizationId,
    dateFrom,
    dateTo
  );

  // "Programadas" son todas las citas menos las completadas
  const scheduledAppointments = metrics.totalAppointments;
  const completedAppointments = metrics.attendedAppointments;

  return NextResponse.json({ scheduledAppointments, completedAppointments });
}