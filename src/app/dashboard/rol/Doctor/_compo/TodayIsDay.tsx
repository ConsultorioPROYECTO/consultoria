import { Card, CardContent } from "@rutas/components/ui/card";

export function TodayIsDay() {
  const today = new Date();
  const month = today.toLocaleString('default', { month: 'long' });
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
  const date = today.getDate();

  return (
    <Card className="w-full bg-card rounded-xl overflow-hidden">
      <CardContent className="flex items-center justify-between py-1 px-8">
        <div className="flex flex-col">
          <span className="text-sm opacity-80">Hoy</span>
          <span className="text-3xl lg:text-3xl font-bold mt-1">{date} de {capitalizedMonth}</span>
        </div>
      </CardContent>
    </Card>
  );
}