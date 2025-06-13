// src/app/dashboard/3/compo/ScheduleChangeNotifications.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Bell, CalendarOff, CheckCheck, AlertTriangle } from "lucide-react";
import { Badge } from "@rutas/components/ui/badge";
import { useState, useMemo } from 'react';
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments";

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

export function ScheduleChangeNotifications() {
  const { doctors, loading, error } = useDoctorsWithAppointments();
  
  // Generar notificaciones basadas en los datos reales
  const generatedNotifications = useMemo(() => {
    const notifications: Notification[] = [];
    const now = new Date();
    
    doctors.forEach(doctor => {
      doctor.appointments.forEach(appointment => {
        const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
        const timeDiff = appointmentDate.getTime() - now.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        // Simular notificaciones para citas con diferentes estados
        if (appointment.status === 'Pendiente' && daysDiff === 0) {
          notifications.push({
            id: `pending-${appointment.id}`,
            type: 'Nueva Cita Urgente',
            patientName: appointment.patientName || undefined,
            doctorName: `${doctor.speciality} (ID: ${doctor.idDoctor})`,
            newTime: `${appointment.time} - ${new Date(appointment.date).toLocaleDateString()}`,
            reason: 'Cita pendiente de confirmación para hoy',
            timestamp: 'Hace 30 minutos',
            isRead: false,
            priority: 'Alta'
          });
        }
        
        if (appointment.status === 'Confirmada' && timeDiff < 30 * 60 * 1000 && timeDiff > 0) {
          notifications.push({
            id: `reminder-${appointment.id}`,
            type: 'Retraso Médico',
            doctorName: `${doctor.speciality} (ID: ${doctor.idDoctor})`,
            reason: `Próxima cita con ${appointment.patientName || 'paciente'} en 30 minutos`,
            timestamp: 'Hace 5 minutos',
            isRead: false,
            priority: 'Media'
          });
        }
      });
    });
    
    return notifications.slice(0, 10); // Limitar a 10 notificaciones
  }, [doctors]);

  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  
  const notifications = generatedNotifications.map(notif => ({
    ...notif,
    isRead: readNotifications.has(notif.id)
  }));

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary" />
            Notificaciones de Cambios en Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary" />
            Notificaciones de Cambios en Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

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
                    Alertas sobre las citas de tus médicos asignados.
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
          <ScrollArea className="h-[350px]">
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