// src/app/dashboard/3/compo/AutomatedMessagesTracker.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { Badge } from "@rutas/components/ui/badge";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { CheckCircle2, XCircle, Send, MessageCircle } from "lucide-react"; // Assuming lucide-react

// Mock data
const automatedMessages = [
  {
    id: "msg1",
    patientName: "Ana Torres",
    messageType: "Recordatorio de Cita",
    sentAt: "2024-08-01 10:00 AM",
    status: "Entregado",
    channel: "WhatsApp",
    contentPreview: "Hola Ana, te recordamos tu cita mañana a las 11:00 AM..."
  },
  {
    id: "msg2",
    patientName: "Luis Fernández",
    messageType: "Confirmación de Cita",
    sentAt: "2024-08-01 09:30 AM",
    status: "Leído",
    channel: "WhatsApp",
    contentPreview: "Tu cita para el 03/08 a las 15:00 ha sido confirmada..."
  },
  {
    id: "msg3",
    patientName: "Sofía Vargas",
    messageType: "Solicitud de Feedback",
    sentAt: "2024-07-31 17:00 PM",
    status: "Fallido",
    channel: "SMS",
    contentPreview: "Nos encantaría conocer tu opinión sobre tu última consulta..."
  },
  {
    id: "msg4",
    patientName: "Carlos Méndez",
    messageType: "Información Pre-consulta",
    sentAt: "2024-07-31 14:00 PM",
    status: "Enviado",
    channel: "WhatsApp",
    contentPreview: "Recuerda traer tus últimos análisis a la consulta..."
  },
];

export function AutomatedMessagesTracker() {
  const getStatusIcon = (status: string) => {
    if (status === "Entregado") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "Leído") return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    if (status === "Fallido") return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === "Enviado") return <Send className="h-4 w-4 text-gray-500" />;
    return <MessageCircle className="h-4 w-4 text-gray-400" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seguimiento de Mensajes Automatizados</CardTitle>
        <CardDescription>
          Visualiza el estado de los mensajes enviados por el sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]"> {/* Altura ajustable */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Estado</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Tipo de Mensaje</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automatedMessages.map((msg) => (
                <TableRow key={msg.id} className="hover:bg-muted/50">
                  <TableCell className="p-2 text-center">{getStatusIcon(msg.status)}</TableCell>
                  <TableCell className="font-medium py-2">{msg.patientName}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline">{msg.messageType}</Badge>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">{msg.channel}</TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">{msg.sentAt}</TableCell>
                  <TableCell className="text-right py-2">
                    {/* <Button variant="ghost" size="xs">Ver Detalles</Button> */}
                    <span className="text-xs text-muted-foreground italic">{msg.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}