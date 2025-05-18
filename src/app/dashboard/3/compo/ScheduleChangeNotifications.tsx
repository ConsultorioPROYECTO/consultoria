// src/app/dashboard/3/compo/ScheduleChangeNotifications.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Bell, CalendarOff, CheckCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@rutas/components/ui/badge";
import { useState } from 'react';

interface Notification {
  id: string;
  type: 'Cancelación' | 'Reprogramación' | 'Nueva Cita Urgente' | 'Retraso Médico';
  patientName?: string;
  doctorName?: string;
  originalTime?: string;
  newTime?: string;
  reason?: string;
  timestamp: string;
  isRead: boolean;
  priority: 'Alta' | 'Media' | 'Baja';
}

// Mock data
const mockNotifications: Notification[] = [
  {
    id: "notif1",
    type: "Cancelación",
    patientName: "Carlos Ruiz",
    doctorName: "Dr. Alan Grant",
    originalTime: "2024-08-05 10:00 AM",
    reason: "Paciente indica imprevisto",
    timestamp: "Hace 15 minutos",
    isRead: false,
    priority: "Alta"
  },
  {
    id: "notif2",
    type: "Reprogramación",
    patientName: "Laura Méndez",
    doctorName: "Dra. Ellie Sattler",
    originalTime: "2024-08-05 11:30 AM",
    newTime: "2024-08-06 09:00 AM",
    reason: "Solicitud del paciente",
    timestamp: "Hace 1 hora",
    isRead: false,
    priority: "Media"
  },
  {
    id: "notif3",
    type: "Nueva Cita Urgente",
    patientName: "Sofía Castro",
    doctorName: "Dr. Ian Malcolm",
    newTime: "Hoy 16:00 PM",
    reason: "Caso de emergencia referido",
    timestamp: "Hace 5 minutos",
    isRead: false,
    priority: "Alta"
  },
  {
    id: "notif4",
    type: "Retraso Médico",
    doctorName: "Dr. Alan Grant",
    reason: "Emergencia en quirófano, retraso estimado de 45 mins",
    timestamp: "Hace 30 minutos",
    isRead: true,
    priority: "Media"
  },
];

export function ScheduleChangeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const getPriorityBadge = (priority: 'Alta' | 'Media' | 'Baja') => {
    if (priority === 'Alta') return <Badge variant="destructive">Alta</Badge>;
    if (priority === 'Media') return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">Media</Badge>;
    return <Badge variant="outline">Baja</Badge>;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    if (type === 'Cancelación') return <CalendarOff className="h-5 w-5 text-red-500" />;
    if (type === 'Reprogramación') return <CalendarOff className="h-5 w-5 text-blue-500" />;
    if (type === 'Nueva Cita Urgente') return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (type === 'Retraso Médico') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <Bell className="h-5 w-5 text-gray-500" />;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-primary" />
                    Notificaciones de Cambios en Agenda
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">{unreadCount} Nueva(s)</Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    Alertas importantes sobre cancelaciones, reprogramaciones y urgencias.
                </CardDescription>
            </div>
            {unreadCount > 0 && (
                <Button onClick={markAllAsRead} variant="outline" size="sm">
                    <CheckCheck className="h-4 w-4 mr-2" /> Marcar todas como leídas
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length > 0 ? (
          <ScrollArea className="h-[350px]"> {/* Altura ajustable */}
            <div className="space-y-3 pr-3">
              {notifications.map((notif) => (
                <div 
                    key={notif.id} 
                    className={`p-3 border rounded-md flex items-start space-x-3 ${notif.isRead ? 'bg-muted/30 opacity-70' : 'bg-card hover:shadow-sm'}`}
                >
                  <div className="pt-1">{getNotificationIcon(notif.type)}</div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                        <div>
                            <p className={`font-semibold ${notif.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>{notif.type}</p>
                            <p className="text-xs text-muted-foreground">
                                {notif.patientName && `Paciente: ${notif.patientName} `}
                                {notif.doctorName && `Médico: ${notif.doctorName}`}
                            </p>
                        </div>
                        {getPriorityBadge(notif.priority)}
                    </div>
                    {notif.originalTime && <p className="text-xs text-muted-foreground">Hora Original: <span className="line-through">{notif.originalTime}</span></p>}
                    {notif.newTime && <p className="text-xs text-green-600 dark:text-green-400">Nueva Hora: {notif.newTime}</p>}
                    {notif.reason && <p className="text-xs italic text-muted-foreground mt-1">Motivo: {notif.reason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{notif.timestamp}</p>
                  </div>
                  {!notif.isRead && (
                    <Button variant="ghost" size="sm" onClick={() => markAsRead(notif.id)} className="self-center">
                      Marcar Leída
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No hay notificaciones recientes.</p>
        )}
      </CardContent>
    </Card>
  );
}