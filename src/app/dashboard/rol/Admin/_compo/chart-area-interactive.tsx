"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"

import {
  Card,
  CardContent,
  CardDescription,
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

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", citas: 222, busyHours: 150 },
  { date: "2024-04-02", citas: 97, busyHours: 180 },
  { date: "2024-04-03", citas: 167, busyHours: 120 },
  { date: "2024-04-04", citas: 242, busyHours: 260 },
  { date: "2024-04-05", citas: 373, busyHours: 290 },
  { date: "2024-04-06", citas: 301, busyHours: 340 },
  { date: "2024-04-07", citas: 245, busyHours: 180 },
  { date: "2024-04-08", citas: 409, busyHours: 320 },
  { date: "2024-04-09", citas: 59, busyHours: 110 },
  { date: "2024-04-10", citas: 261, busyHours: 190 },
  { date: "2024-04-11", citas: 327, busyHours: 350 },
  { date: "2024-04-12", citas: 292, busyHours: 210 },
  { date: "2024-04-13", citas: 342, busyHours: 380 },
  { date: "2024-04-14", citas: 137, busyHours: 220 },
  { date: "2024-04-15", citas: 120, busyHours: 170 },
  { date: "2024-04-16", citas: 138, busyHours: 190 },
  { date: "2024-04-17", citas: 446, busyHours: 360 },
  { date: "2024-04-18", citas: 364, busyHours: 410 },
  { date: "2024-04-19", citas: 243, busyHours: 180 },
  { date: "2024-04-20", citas: 89, busyHours: 150 },
  { date: "2024-04-21", citas: 137, busyHours: 200 },
  { date: "2024-04-22", citas: 224, busyHours: 170 },
  { date: "2024-04-23", citas: 138, busyHours: 230 },
  { date: "2024-04-24", citas: 387, busyHours: 290 },
  { date: "2024-04-25", citas: 215, busyHours: 250 },
  { date: "2024-04-26", citas: 75, busyHours: 130 },
  { date: "2024-04-27", citas: 383, busyHours: 420 },
  { date: "2024-04-28", citas: 122, busyHours: 180 },
  { date: "2024-04-29", citas: 315, busyHours: 240 },
  { date: "2024-04-30", citas: 454, busyHours: 380 },
  { date: "2024-05-01", citas: 165, busyHours: 220 },
  { date: "2024-05-02", citas: 293, busyHours: 310 },
  { date: "2024-05-03", citas: 247, busyHours: 190 },
  { date: "2024-05-04", citas: 385, busyHours: 420 },
  { date: "2024-05-05", citas: 481, busyHours: 390 },
  { date: "2024-05-06", citas: 498, busyHours: 520 },
  { date: "2024-05-07", citas: 388, busyHours: 300 },
  { date: "2024-05-08", citas: 149, busyHours: 210 },
  { date: "2024-05-09", citas: 227, busyHours: 180 },
  { date: "2024-05-10", citas: 293, busyHours: 330 },
  { date: "2024-05-11", citas: 335, busyHours: 270 },
  { date: "2024-05-12", citas: 197, busyHours: 240 },
  { date: "2024-05-13", citas: 197, busyHours: 160 },
  { date: "2024-05-14", citas: 448, busyHours: 490 },
  { date: "2024-05-15", citas: 473, busyHours: 380 },
  { date: "2024-05-16", citas: 338, busyHours: 400 },
  { date: "2024-05-17", citas: 499, busyHours: 420 },
  { date: "2024-05-18", citas: 315, busyHours: 350 },
  { date: "2024-05-19", citas: 235, busyHours: 180 },
  { date: "2024-05-20", citas: 177, busyHours: 230 },
  { date: "2024-05-21", citas: 82, busyHours: 140 },
  { date: "2024-05-22", citas: 81, busyHours: 120 },
  { date: "2024-05-23", citas: 252, busyHours: 290 },
  { date: "2024-05-24", citas: 294, busyHours: 220 },
  { date: "2024-05-25", citas: 201, busyHours: 250 },
  { date: "2024-05-26", citas: 213, busyHours: 170 },
  { date: "2024-05-27", citas: 420, busyHours: 460 },
  { date: "2024-05-28", citas: 233, busyHours: 190 },
  { date: "2024-05-29", citas: 78, busyHours: 130 },
  { date: "2024-05-30", citas: 340, busyHours: 280 },
  { date: "2024-05-31", citas: 178, busyHours: 230 },
  { date: "2024-06-01", citas: 178, busyHours: 200 },
  { date: "2024-06-02", citas: 470, busyHours: 410 },
  { date: "2024-06-03", citas: 103, busyHours: 160 },
  { date: "2024-06-04", citas: 439, busyHours: 380 },
  { date: "2024-06-05", citas: 88, busyHours: 140 },
  { date: "2024-06-06", citas: 294, busyHours: 250 },
  { date: "2024-06-07", citas: 323, busyHours: 370 },
  { date: "2024-06-08", citas: 385, busyHours: 320 },
  { date: "2024-06-09", citas: 438, busyHours: 480 },
  { date: "2024-06-10", citas: 155, busyHours: 200 },
  { date: "2024-06-11", citas: 92, busyHours: 150 },
  { date: "2024-06-12", citas: 492, busyHours: 420 },
  { date: "2024-06-13", citas: 81, busyHours: 130 },
  { date: "2024-06-14", citas: 426, busyHours: 380 },
  { date: "2024-06-15", citas: 307, busyHours: 350 },
  { date: "2024-06-16", citas: 371, busyHours: 310 },
  { date: "2024-06-17", citas: 475, busyHours: 520 },
  { date: "2024-06-18", citas: 107, busyHours: 170 },
  { date: "2024-06-19", citas: 341, busyHours: 290 },
  { date: "2024-06-20", citas: 408, busyHours: 450 },
  { date: "2024-06-21", citas: 169, busyHours: 210 },
  { date: "2024-06-22", citas: 317, busyHours: 270 },
  { date: "2024-06-23", citas: 480, busyHours: 530 },
  { date: "2024-06-24", citas: 132, busyHours: 180 },
  { date: "2024-06-25", citas: 141, busyHours: 190 },
  { date: "2024-06-26", citas: 434, busyHours: 380 },
  { date: "2024-06-27", citas: 448, busyHours: 490 },
  { date: "2024-06-28", citas: 149, busyHours: 200 },
  { date: "2024-06-29", citas: 103, busyHours: 160 },
  { date: "2024-06-30", citas: 446, busyHours: 400 },
]

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  citas: {
    label: "Citas",
    color: "var(--chart-1)",
  },
  busyHours: {
    label: "Horas Ocupadas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile !== undefined) {
      setTimeRange(isMobile ? "7d" : "90d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle className="text-2xl font-bold">Citas y Horas Ocupadas</CardTitle>
          <CardDescription>
            Volumen total de citas y distribución de horas ocupadas
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
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
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillCitas" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-citas)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-citas)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillBusyHours" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-busyHours)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-busyHours)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} horizontal={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="busyHours"
              type="natural"
              fill="url(#fillBusyHours)"
              stroke="var(--color-busyHours)"
              stackId="a"
            />
            <Area
              dataKey="citas"
              type="natural"
              fill="url(#fillCitas)"
              stroke="var(--color-citas)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
