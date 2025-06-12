// src/app/dashboard/1/compo/WorkloadOverview.tsx
'use client';

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Mock data - en una aplicación real, esto vendría de una API
const initialWorkloadData = [
  { name: "Dr. Pérez", appointments: 18, availability: 60 },
  { name: "Dr. Rodríguez", appointments: 25, availability: 40 },
  { name: "Dr. Gómez", appointments: 15, availability: 75 },
  { name: "Dr. Fernández", appointments: 22, availability: 50 },
];

type SortOption = "name_asc" | "name_desc" | "value_asc" | "value_desc";

interface WorkloadChartProps {
  title: string;
  description: string;
  dataKey: "appointments" | "availability";
  dataLabel: string;
  unit?: string;
}

const chartConfig = {
  appointments: {
    label: "Citas Programadas",
    color: "hsl(var(--chart-1))",
  },
  availability: {
    label: "Disponibilidad",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function SortableBarChart({ title, description, dataKey, dataLabel, unit }: WorkloadChartProps) {
  const [sortOption, setSortOption] = React.useState<SortOption>("name_asc");
  const [chartData, setChartData] = React.useState(initialWorkloadData);

  React.useEffect(() => {
    const sortedData = [...initialWorkloadData];
    switch (sortOption) {
      case "name_asc":
        sortedData.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        sortedData.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "value_asc":
        sortedData.sort((a, b) => a[dataKey] - b[dataKey]);
        break;
      case "value_desc":
        sortedData.sort((a, b) => b[dataKey] - a[dataKey]);
        break;
    }
    setChartData(sortedData);
  }, [sortOption, dataKey]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Select onValueChange={(value) => setSortOption(value as SortOption)} defaultValue={sortOption}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Nombre (A-Z)</SelectItem>
              <SelectItem value="name_desc">Nombre (Z-A)</SelectItem>
              <SelectItem value="value_asc">{dataLabel} (Menor a Mayor)</SelectItem>
              <SelectItem value="value_desc">{dataLabel} (Mayor a Menor)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis tickFormatter={(value) => `${value}${unit || ''}`} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function WorkloadOverview() {
  return (
    <div className="grid gap-6 grid-cols-1">
      <SortableBarChart 
        title="Carga de Citas de Médicos"
        description="Visualiza las citas asignadas a cada médico."
        dataKey="appointments"
        dataLabel="Citas"
      />
      <SortableBarChart 
        title="Disponibilidad de Médicos"
        description="Visualiza el porcentaje de disponibilidad de cada médico."
        dataKey="availability"
        dataLabel="Disponibilidad"
        unit="%"
      />
    </div>
  );
}