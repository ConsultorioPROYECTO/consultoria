import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";

export function FinancialMetrics() {
  // Lógica para obtener y mostrar métricas financieras
  const scheduledAppointments = 250;
  const completedAppointments = 210;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Métricas de Consultas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-6">
          <div className="grid grid-rows-2 gap-1">
            <p className="text-sm font-medium text-muted-foreground">Consultas Programadas</p>
            <p className="text-3xl font-bold text-foreground selection:bg-primary selection:text-primary-foreground">{scheduledAppointments}</p>
          </div>
          <div className="grid grid-rows-2 gap-1">
            <p className="text-sm font-medium text-muted-foreground">Consultas Atendidas</p>
            <p className="text-3xl font-bold text-foreground selection:bg-primary selection:text-primary-foreground">{completedAppointments}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}