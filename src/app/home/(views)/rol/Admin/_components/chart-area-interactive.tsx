"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useDoctorMetrics } from "@/hooks/useDoctorMetrics";

import WaveformLoader from '@/components/custom/WaveformLoader';

export const description = "A stacked bar chart with a legend"

const chartConfig = {
  citas: {
    label: "Citas",
    color: "var(--chart-1)",
  },
  horas_ocupadas: {
    label: "Horas Ocupadas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartBarInteractive() {
// eliminado uso duplicado de useDoctorMetrics
   const [timeRange, setTimeRange] = useState("90d")

  // Helper to compute dateFrom based on selected range
  const computeDateFrom = (range: string): string => {
    const now = new Date()
    let daysToSubtract = 90
    switch (range) {
      case "7d":
        daysToSubtract = 7
        break
      case "30d":
        daysToSubtract = 30
        break
      case "90d":
      default:
        daysToSubtract = 90
        break
    }
    const cutoff = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
    return cutoff.toISOString().split("T")[0]
  }

  const dateTo = new Date().toISOString().split("T")[0]
  const dateFrom = computeDateFrom(timeRange)

   const { data, loading, error } = useDoctorMetrics({ dateFrom, dateTo })
  // Filtrar por rango usando fecha actual simulada porque API ya trae totales.
  const filteredData = data; // simplificado, se podría filtrar si endpoint devuelve fechas

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <Card>
      <CardHeader className="gap-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Citas y Horas Ocupadas</CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange} /*enabled now*/>
            {/* Deshabilitado hasta que endpoint soporte rangos */}
            <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select a value">
              <SelectValue placeholder="Últimos 3 meses" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">Últimos 3 meses</SelectItem>
              <SelectItem value="30d" className="rounded-lg">Últimos 30 días</SelectItem>
              <SelectItem value="7d" className="rounded-lg">Últimos 7 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
        <div className="flex h-full flex-col items-center justify-center">
          <WaveformLoader className="w-24 h-auto text-muted-foreground" />
        </div>
        ) : !filteredData || filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-muted-foreground text-lg">
              No hay doctores disponibles en la organización
            </p>
            <p className="text-sm text-muted-foreground">
              Esta función no está disponible sin doctores registrados
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={filteredData}>
              <CartesianGrid vertical={false} horizontal={false} />
              <XAxis dataKey="doctorName" tickLine={false} tickMargin={10} axisLine={false} angle={-45} textAnchor="end" height={80} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="citas" stackId="a" fill="var(--color-citas)" radius={[0,0,4,4]} />
              <Bar dataKey="horas_ocupadas" stackId="a" fill="var(--color-horas_ocupadas)" radius={[4,4,0,0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
