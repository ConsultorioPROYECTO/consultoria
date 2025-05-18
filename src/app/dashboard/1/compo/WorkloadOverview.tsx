// src/app/dashboard/1/compo/WorkloadOverview.tsx
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";

// Mock data - en una aplicación real, esto vendría de una API
const workloadData = [
  { name: "Dr. Pérez", appointments: 18, availability: 60 },
  { name: "Dr. Rodríguez", appointments: 25, availability: 40 },
  { name: "Dr. Gómez", appointments: 15, availability: 75 },
  { name: "Dr. Fernández", appointments: 22, availability: 50 },
];

export function WorkloadOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carga de Trabajo de Médicos</CardTitle>
        <CardDescription>Visualiza las citas asignadas y disponibilidad.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={workloadData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend wrapperStyle={{fontSize: "12px"}}/>
            <Bar dataKey="appointments" name="Citas Programadas" fill="var(--theme-primary)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="availability" name="Disponibilidad (%) " fill="hsl(var(--primary) / 0.3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}