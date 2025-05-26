'use client'

import { Card, CardContent } from "@rutas/components/ui/card";

export function TodayIsDay() {
  const today = new Date();
//   const day = today.toLocaleString('default', { weekday: 'long' });
  const month = today.toLocaleString('default', { month: 'long' });
  const date = today.getDate();

  return (
    <Card className="w-full bg-card rounded-xl overflow-hidden">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-sm opacity-80">Hoy es</span>
          <span className="text-4xl font-bold mt-1">{date} de {month}</span>
        </div>
      </CardContent>
    </Card>
  );
}