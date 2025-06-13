// src/app/dashboard/3/compo/AutomatedMessagesTracker.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { Badge } from "@rutas/components/ui/badge";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { CheckCircle2, XCircle, Send, MessageCircle } from "lucide-react";
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments";

interface AutomatedMessage {
  id: string;
  patientName: string;
  messageType: string;
  sentAt: string;
  status: 'Entregado' | 'Leído' | 'Fallido' | 'Enviado';
  channel: 'WhatsApp' | 'SMS' | 'Email';
  contentPreview: string;
  doctorId: number;
  appointmentId: number;
}

export function AutomatedMessagesTracker() {
  const { doctors, loading, error } = useDoctorsWithAppointments();

  // Generar mensajes automatizados basados en las citas reales
  const automatedMessages = useMemo(() => {
    const messages: AutomatedMessage[] = [];
    const now = new Date();
    
    doctors.forEach(doctor => {
      doctor.appointments.forEach(appointment => {
        const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
        const timeDiff = appointmentDate.getTime() - now.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        
        // Recordatorio de cita (1 día antes)
        if (daysDiff === 1 && appointment.status === 'Confirmada') {
          messages.push({
            id: `reminder-${appointment.id}`,
            patientName: appointment.patientName,
            messageType: "Recordatorio de Cita",
            sentAt: new Date(now.getTime() - 60 * 60 * 1000).toLocaleString(), // Hace 1 hora
            status: Math.random() > 0.8 ? 'Fallido' : 'Entregado',
            channel: 'WhatsApp',
            contentPreview: `Hola ${appointment.patientName}, te recordamos tu cita mañana a las ${appointment.time}...`,
            doctorId: doctor.idDoctor,
            appointmentId: appointment.id
          });
        }
        
        // Confirmación de cita
        if (appointment.status === 'Confirmada') {
          messages.push({
            id: `confirmation-${appointment.id}`,
            patientName: appointment.patientName,
            messageType: "Confirmación de Cita",
            sentAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toLocaleString(), // Hace 2 horas
            status: Math.random() > 0.9 ? 'Fallido' : 'Leído',
            channel: 'WhatsApp',
            contentPreview: `Tu cita para el ${new Date(appointment.date).toLocaleDateString()} a las ${appointment.time} ha sido confirmada...`,
            doctorId: doctor.idDoctor,
            appointmentId: appointment.id
          });
        }
        
        // Solicitud de feedback para citas completadas
        if (appointment.status === 'Completada') {
          messages.push({
            id: `feedback-${appointment.id}`,
            patientName: appointment.patientName,
            messageType: "Solicitud de Feedback",
            sentAt: new Date(appointmentDate.getTime() + 24 * 60 * 60 * 1000).toLocaleString(), // 1 día después
            status: Math.random() > 0.7 ? 'Fallido' : 'Enviado',
            channel: 'SMS',
            contentPreview: `Nos encantaría conocer tu opinión sobre tu consulta con ${doctor.speciality}...`,
            doctorId: doctor.idDoctor,
            appointmentId: appointment.id
          });
        }
        
        // Información pre-consulta
        if (appointment.status === 'Confirmada' && daysDiff <= 2 && daysDiff >= 0) {
          messages.push({
            id: `preconsult-${appointment.id}`,
            patientName: appointment.patientName,
            messageType: "Información Pre-consulta",
            sentAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toLocaleString(), // Hace 3 horas
            status: 'Enviado',
            channel: 'WhatsApp',
            contentPreview: `Recuerda traer tus documentos y análisis para tu consulta de ${appointment.service}...`,
            doctorId: doctor.idDoctor,
            appointmentId: appointment.id
          });
        }
      });
    });
    
    return messages
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 20); // Mostrar últimos 20 mensajes
  }, [doctors]);
  const getStatusIcon = (status: string) => {
    if (status === "Entregado") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "Leído") return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    if (status === "Fallido") return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === "Enviado") return <Send className="h-4 w-4 text-gray-500" />;
    return <MessageCircle className="h-4 w-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seguimiento de Mensajes Automatizados</CardTitle>
          <CardDescription>
            Visualiza el estado de los mensajes enviados por el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
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
          <CardTitle>Seguimiento de Mensajes Automatizados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const successRate = automatedMessages.length > 0 
    ? ((automatedMessages.filter(msg => msg.status === 'Entregado' || msg.status === 'Leído').length / automatedMessages.length) * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Seguimiento de Mensajes Automatizados</span>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {successRate}% Tasa de éxito
          </Badge>
        </CardTitle>
        <CardDescription>
          Mensajes automatizados para las citas de tus médicos asignados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {automatedMessages.length > 0 ? (
          <ScrollArea className="h-[350px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Estado</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo de Mensaje</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead className="text-right">Médico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automatedMessages.map((msg) => (
                  <TableRow key={msg.id} className="hover:bg-muted/50">
                    <TableCell className="p-2 text-center">{getStatusIcon(msg.status)}</TableCell>
                    <TableCell className="font-medium py-2">
                      <div>
                        <p>{msg.patientName}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {msg.contentPreview}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline">{msg.messageType}</Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={msg.channel === 'WhatsApp' ? 'default' : 'secondary'} className="text-xs">
                        {msg.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{msg.sentAt}</TableCell>
                    <TableCell className="text-right py-2">
                      <span className="text-xs text-muted-foreground">
                        ID: {msg.doctorId}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay mensajes automatizados recientes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}