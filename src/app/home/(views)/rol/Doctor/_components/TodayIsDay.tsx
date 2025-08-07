import { Card, CardContent } from "@/components/ui/card";

export function TodayIsDay() {
  const today = new Date();
  const month = today.toLocaleString('es-PE', { month: 'long' });
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
  const date = today.getDate();

  return (
    <Card className="w-full bg-card rounded-xl overflow-hidden">
      <CardContent className="flex items-center justify-between py-1 px-8">
        <div className="flex flex-col">
          <span className="text-sm opacity-80">Hoy</span>
          <span className="text-2xl lg:text-3xl font-bold mt-1 selection:bg-primary selection:text-primary-foreground">{date} de {capitalizedMonth}</span>
        </div>
      </CardContent>
    </Card>
  );
}