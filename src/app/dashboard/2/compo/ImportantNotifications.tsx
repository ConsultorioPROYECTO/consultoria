'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'urgent';
}

interface ImportantNotificationsProps {
  notifications?: Notification[];
}

export function ImportantNotifications({ notifications }: ImportantNotificationsProps) {
  // Notificaciones de ejemplo si no se proporcionan
  const defaultNotifications: Notification[] = [
    { id: '1', message: 'Recordatorio: Cita de seguimiento con Juan Pérez mañana a las 10:00 AM.', type: 'info' },
    { id: '2', message: 'Alerta: Expediente de María García incompleto. Faltan resultados de laboratorio.', type: 'warning' },
    { id: '3', message: 'Urgente: Paciente con Holter 24 horas requiere revisión inmediata de resultados.', type: 'urgent' },
  ];

  const notificationsToDisplay = notifications && notifications.length > 0 ? notifications : defaultNotifications;

  return (
    <Card className="flex flex-col justify-between h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-semibold flex items-center">
        
          Notificaciones
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-3">
        {notificationsToDisplay.length > 0 ? (
          notificationsToDisplay.map(notif => (
            <div key={notif.id} className={`p-3 rounded-lg ${notif.type === 'urgent' ? 'bg-red-100 text-red-800 border border-red-300' : notif.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}`}>
              <p className="text-sm font-medium">{notif.message}</p>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm text-center">No hay notificaciones importantes en este momento.</p>
        )}
      </CardContent>
    </Card>
  );
}
