"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

export const description = "A stacked bar chart with a legend"

const chartData = [
  // Datos de hace 3 meses (abril 2025)
  { doctorname: "Dr. García", citas: 186, horas_ocupadas: 80, date: "2025-06-15" },
  { doctorname: "Dr. Rodríguez", citas: 305, horas_ocupadas: 200, date: "2025-06-16" },
  { doctorname: "Dr. López", citas: 237, horas_ocupadas: 120, date: "2025-06-17" },
  { doctorname: "Dr. Martínez", citas: 173, horas_ocupadas: 190, date: "2025-06-18" },
  { doctorname: "Dr. González", citas: 209, horas_ocupadas: 130, date: "2025-06-19" },
  
  // Datos de hace 2 meses (mayo 2025)
  { doctorname: "Dr. García", citas: 195, horas_ocupadas: 85, date: "2025-05-15" },
  { doctorname: "Dr. Rodríguez", citas: 320, horas_ocupadas: 210, date: "2025-05-16" },
  { doctorname: "Dr. López", citas: 245, horas_ocupadas: 125, date: "2025-05-17" },
  
  // Datos del mes pasado (junio 2025)
  { doctorname: "Dr. García", citas: 210, horas_ocupadas: 90, date: "2025-06-15" },
  { doctorname: "Dr. Rodríguez", citas: 335, horas_ocupadas: 220, date: "2025-06-16" },
  
  // Datos de los últimos 30 días (junio-julio 2025)
  { doctorname: "Dr. García", citas: 225, horas_ocupadas: 95, date: "2025-06-25" },
  { doctorname: "Dr. Rodríguez", citas: 350, horas_ocupadas: 230, date: "2025-06-26" },
  { doctorname: "Dr. López", citas: 260, horas_ocupadas: 135, date: "2025-06-27" },
  
  // Datos de los últimos 7 días (julio 2025 - más recientes)
  { doctorname: "Dr. García", citas: 240, horas_ocupadas: 100, date: "2025-07-07" },
  { doctorname: "Dr. Rodríguez", citas: 365, horas_ocupadas: 240, date: "2025-07-08" },
  { doctorname: "Dr. López", citas: 275, horas_ocupadas: 140, date: "2025-07-09" },
]

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
  const [timeRange, setTimeRange] = useState("90d")

  // Función para filtrar datos por rango de fechas
  const filterDataByTimeRange = (data: typeof chartData, range: string) => {
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
    
    const cutoffDate = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000))
    
    const filtered = data.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= cutoffDate
    })
    
    // Agrupar por doctor y sumar citas y horas ocupadas
    const groupedData = filtered.reduce((acc, item) => {
      const existingDoctor = acc.find(doctor => doctor.doctorname === item.doctorname)
      
      if (existingDoctor) {
        existingDoctor.citas += item.citas
        existingDoctor.horas_ocupadas += item.horas_ocupadas
      } else {
        acc.push({
          doctorname: item.doctorname,
          citas: item.citas,
          horas_ocupadas: item.horas_ocupadas,
          date: item.date
        })
      }
      
      return acc
    }, [] as typeof data)
    
    return groupedData
  }

  const filteredData = filterDataByTimeRange(chartData, timeRange)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Citas y Horas Ocupadas</CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange}>
             <SelectTrigger
               className="w-[160px] rounded-lg sm:ml-auto"
               aria-label="Select a value"
             >
               <SelectValue placeholder="Últimos 3 meses" />
             </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Últimos 30 días
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Últimos 7 días
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={filteredData}>
            <CartesianGrid vertical={false} horizontal={false} />
            <XAxis
              dataKey="doctorname"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={(value) => value.replace('Dr. ', '')}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="citas"
              stackId="a"
              fill="var(--color-citas)"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="horas_ocupadas"
              stackId="a"
              fill="var(--color-horas_ocupadas)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
