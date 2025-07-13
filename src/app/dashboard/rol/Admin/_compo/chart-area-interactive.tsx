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
  { doctorname: "Dr. García", citas: 186, horas_ocupadas: 80, date: "2025-04-15" },
  { doctorname: "Dr. Rodríguez", citas: 305, horas_ocupadas: 200, date: "2025-04-16" },
  { doctorname: "Dr. López", citas: 237, horas_ocupadas: 120, date: "2025-04-17" },
  { doctorname: "Dr. Martínez", citas: 173, horas_ocupadas: 190, date: "2025-04-18" },
  { doctorname: "Dr. González", citas: 209, horas_ocupadas: 130, date: "2025-04-19" },
  
  // Datos de hace 2 meses (mayo 2025)
  { doctorname: "Dr. García", citas: 195, horas_ocupadas: 85, date: "2025-05-15" },
  { doctorname: "Dr. Rodríguez", citas: 320, horas_ocupadas: 210, date: "2025-05-16" },
  { doctorname: "Dr. López", citas: 245, horas_ocupadas: 125, date: "2025-05-17" },
  { doctorname: "Dr. Pérez", citas: 214, horas_ocupadas: 140, date: "2025-05-22" },
  { doctorname: "Dr. Sánchez", citas: 298, horas_ocupadas: 165, date: "2025-05-23" },
  { doctorname: "Dr. Ramírez", citas: 142, horas_ocupadas: 95, date: "2025-05-24" },
  
  // Datos del mes pasado (junio 2025)
  { doctorname: "Dr. García", citas: 210, horas_ocupadas: 90, date: "2025-06-15" },
  { doctorname: "Dr. Rodríguez", citas: 335, horas_ocupadas: 220, date: "2025-06-16" },
  { doctorname: "Dr. Torres", citas: 267, horas_ocupadas: 180, date: "2025-06-17" },
  { doctorname: "Dr. Flores", citas: 189, horas_ocupadas: 110, date: "2025-06-18" },
  { doctorname: "Dr. Rivera", citas: 321, horas_ocupadas: 220, date: "2025-06-19" },
  { doctorname: "Dr. Morales", citas: 156, horas_ocupadas: 85, date: "2025-06-20" },
  
  // Datos de los últimos 30 días (junio-julio 2025)
  { doctorname: "Dr. García", citas: 225, horas_ocupadas: 95, date: "2025-06-25" },
  { doctorname: "Dr. Rodríguez", citas: 350, horas_ocupadas: 230, date: "2025-06-26" },
  { doctorname: "Dr. López", citas: 260, horas_ocupadas: 135, date: "2025-06-27" },
  { doctorname: "Dr. Herrera", citas: 278, horas_ocupadas: 145, date: "2025-06-28" },
  { doctorname: "Dr. Jiménez", citas: 195, horas_ocupadas: 125, date: "2025-06-29" },
  { doctorname: "Dr. Vargas", citas: 342, horas_ocupadas: 235, date: "2025-06-30" },
  { doctorname: "Dr. Castro", citas: 167, horas_ocupadas: 98, date: "2025-07-01" },
  { doctorname: "Dr. Ortega", citas: 289, horas_ocupadas: 175, date: "2025-07-02" },
  
  // Datos de los últimos 7 días (julio 2025 - más recientes)
  { doctorname: "Dr. García", citas: 240, horas_ocupadas: 100, date: "2025-07-07" },
  { doctorname: "Dr. Rodríguez", citas: 365, horas_ocupadas: 240, date: "2025-07-08" },
  { doctorname: "Dr. López", citas: 275, horas_ocupadas: 140, date: "2025-07-09" },
  { doctorname: "Dr. Ruiz", citas: 224, horas_ocupadas: 155, date: "2025-07-10" },
  { doctorname: "Dr. Mendoza", citas: 198, horas_ocupadas: 115, date: "2025-07-11" },
  { doctorname: "Dr. Aguilar", citas: 256, horas_ocupadas: 168, date: "2025-07-12" },
  { doctorname: "Dr. Vega", citas: 312, horas_ocupadas: 205, date: "2025-07-13" },
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
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  )
}
