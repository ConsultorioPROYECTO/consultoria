// src/app/dashboard/2/compo/PatientAttendancePatterns.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface AttendanceData {
  name: string;
  value: number;
}

// Mock data - en una aplicación real, esto vendría de una API para un paciente específico
const mockAttendanceData: AttendanceData[] = [
  { name: 'Asistencias', value: 18 },
  { name: 'Cancelaciones (con aviso)', value: 2 },
  { name: 'Faltas (sin aviso)', value: 1 },
  { name: 'Reprogramaciones', value: 3 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface PatientAttendancePatternsProps {
  patientId: string | null;
  patientName?: string;
}

export function PatientAttendancePatterns({ patientId, patientName }: PatientAttendancePatternsProps) {
  // Lógica para cargar datos de asistencia del pacienteId

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patrones de Asistencia</CardTitle>
          <CardDescription>Selecciona un paciente para ver sus patrones.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No hay paciente seleccionado.</p>
        </CardContent>
      </Card>
    );
  }

  const totalAppointments = mockAttendanceData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patrones de Asistencia</CardTitle>
        <CardDescription>Para: {patientName || 'Paciente seleccionado'} (Total citas: {totalAppointments})</CardDescription>
      </CardHeader>
      <CardContent>
        {totalAppointments > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={mockAttendanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {mockAttendanceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay datos de asistencia para este paciente.</p>
        )}
      </CardContent>
    </Card>
  );
}