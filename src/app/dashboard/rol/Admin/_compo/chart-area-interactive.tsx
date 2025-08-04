"use client"

//import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useState } from "react"

import {
  Card,
  CardContent,
  //CardDescription,
  //CardFooter,
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

export const description = "A stacked bar chart with a legend"

// const chartData = [
//   // Datos de hace 3 meses (abril 2025)
//   { doctorname: "Dr. García", citas: 186, horas_ocupadas: 80, date: "2025-06-15" },
//   { doctorname: "Dr. Rodríguez", citas: 305, horas_ocupadas: 200, date: "2025-06-16" },
//   { doctorname: "Dr. López", citas: 237, horas_ocupadas: 120, date: "2025-06-17" },
//   { doctorname: "Dr. Martínez", citas: 173, horas_ocupadas: 190, date: "2025-06-18" },
//   { doctorname: "Dr. González", citas: 209, horas_ocupadas: 130, date: "2025-06-19" },
//   
//   // Datos de hace 2 meses (mayo 2025)
//   { doctorname: "Dr. García", citas: 195, horas_ocupadas: 85, date: "2025-05-15" },
//   { doctorname: "Dr. Rodríguez", citas: 320, horas_ocupadas: 210, date: "2025-05-16" },
//   { doctorname: "Dr. López", citas: 245, horas_ocupadas: 125, date: "2025-05-17" },
//   
//   // Datos del mes pasado (junio 2025)
//   { doctorname: "Dr. García", citas: 210, horas_ocupadas: 90, date: "2025-06-15" },
//   { doctorname: "Dr. Rodríguez", citas: 335, horas_ocupadas: 220, date: "2025-06-16" },
//   
//   // Datos de los últimos 30 días (junio-julio 2025)
//   { doctorname: "Dr. García", citas: 225, horas_ocupadas: 95, date: "2025-06-25" },
//   { doctorname: "Dr. Rodríguez", citas: 350, horas_ocupadas: 230, date: "2025-06-26" },
//   { doctorname: "Dr. López", citas: 260, horas_ocupadas: 135, date: "2025-06-27" },
//   
//   // Datos de los últimos 7 días (julio 2025 - más recientes)
//   { doctorname: "Dr. García", citas: 240, horas_ocupadas: 100, date: "2025-07-07" },
//   { doctorname: "Dr. Rodríguez", citas: 365, horas_ocupadas: 240, date: "2025-07-08" },
//   { doctorname: "Dr. López", citas: 275, horas_ocupadas: 140, date: "2025-07-09" },
// ]

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
      <CardHeader>
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
          <p>Cargando...</p>
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
