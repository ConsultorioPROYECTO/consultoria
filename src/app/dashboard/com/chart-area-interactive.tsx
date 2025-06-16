'use client'

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@rutas/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rutas/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@rutas/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rutas/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@rutas/components/ui/toggle-group"
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments"

export const description = "An interactive area chart"


const chartConfig = {
  appointments: {
    label: "Citas",
  },
  confirmed: {
    label: "Confirmadas",
    color: "hsl(var(--chart-1))",
  },
  completed: {
    label: "Completadas", 
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")
  const { doctors, loading, error } = useDoctorsWithAppointments()

  // Generar datos del gráfico basados en las citas reales
  const chartData = React.useMemo(() => {
    if (!doctors.length) return []

    const data: { [key: string]: { date: string; confirmed: number; completed: number } } = {}
    const today = new Date()
    
    // Generar fechas para los últimos 90 días
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      data[dateStr] = { date: dateStr, confirmed: 0, completed: 0 }
    }

    // Agregar datos reales de citas
    doctors.forEach(doctor => {
      doctor.appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.date).toISOString().split('T')[0]
        if (data[appointmentDate]) {
          if (appointment.status === 'Confirmada') {
            data[appointmentDate].confirmed += 1
          } else if (appointment.status === 'Completada') {
            data[appointmentDate].completed += 1
          }
        }
      })
    })

    return Object.values(data).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [doctors])

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Estadísticas de Citas</CardTitle>
          <CardDescription>Cargando datos...</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="animate-pulse w-full h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Estadísticas de Citas</CardTitle>
          <CardDescription>Error al cargar datos</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  // Asegurarse de que chartData existe y tiene elementos
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Estadísticas de Citas</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p>No hay datos para mostrar</p>
        </CardContent>
      </Card>
    );
  }

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const today = new Date()
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  // Verificar que filteredData tiene elementos antes de renderizar el gráfico
  if (!filteredData || filteredData.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Estadísticas de Citas</CardTitle>
          <CardDescription>No hay datos para el período seleccionado</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p>No hay datos para mostrar en el período seleccionado</p>
        </CardContent>
      </Card>
    );
  }

  const totalConfirmed = filteredData.reduce((sum, item) => sum + item.confirmed, 0)
  const totalCompleted = filteredData.reduce((sum, item) => sum + item.completed, 0)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Estadísticas de Citas</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Confirmadas: {totalConfirmed} | Completadas: {totalCompleted} | Total: {totalConfirmed + totalCompleted}
          </span>
          <span className="@[540px]/card:hidden">Citas por período</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Últimos 3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 días</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 días</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
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
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillConfirmed" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-confirmed)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-confirmed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-completed)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-completed)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              active={false} // Inicialmente inactivo
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    if (!value) return "";
                    return new Date(value).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="completed"
              type="natural"
              fill="url(#fillCompleted)"
              stroke="var(--color-completed)"
              stackId="a"
            />
            <Area
              dataKey="confirmed"
              type="natural"
              fill="url(#fillConfirmed)"
              stroke="var(--color-confirmed)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
