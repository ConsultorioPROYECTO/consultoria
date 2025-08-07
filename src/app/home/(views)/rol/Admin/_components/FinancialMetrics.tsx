import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancialMetrics } from "@/hooks/useFinancialMetrics";

export function FinancialMetrics() {
  const { data, loading, error } = useFinancialMetrics();

  const scheduledAppointments = data?.scheduledAppointments ?? 0;
  const completedAppointments = data?.completedAppointments ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Métricas de Consultas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error && <p className="text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-6">
          <div className="grid grid-rows-2 gap-1">
            <p className="text-sm font-medium text-muted-foreground">Consultas Programadas</p>
            <p className="text-3xl font-bold text-foreground selection:bg-primary selection:text-primary-foreground">
              {loading ? '...' : scheduledAppointments}
            </p>
          </div>
          <div className="grid grid-rows-2 gap-1">
            <p className="text-sm font-medium text-muted-foreground">Consultas Atendidas</p>
            <p className="text-3xl font-bold text-foreground selection:bg-primary selection:text-primary-foreground">
              {loading ? '...' : completedAppointments}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}