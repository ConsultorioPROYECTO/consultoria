// src/app/dashboard/3/compo/WaitingListManagement.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Users, Clock, PlusCircle, Mail, Phone } from "lucide-react";
import { Badge } from "@rutas/components/ui/badge";
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rutas/components/ui/dialog";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Textarea } from "@rutas/components/ui/textarea";

interface WaitingPatient {
  id: string;
  patientName: string;
  requestedDoctor?: string;
  requestedSpecialty: string;
  reason: string;
  contactInfo: string;
  addedAt: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'Contactado' | 'Agendado';
}

// Mock data
const mockWaitingList: WaitingPatient[] = [
  {
    id: "wait1",
    patientName: "Ricardo Gómez",
    requestedDoctor: "Dr. Alan Grant",
    requestedSpecialty: "Cardiología",
    reason: "Revisión anual, preferentemente con Dr. Grant",
    contactInfo: "ricardo@email.com / 555-1234",
    addedAt: "2024-07-28",
    priority: "Media",
    status: "Pendiente"
  },
  {
    id: "wait2",
    patientName: "Fernanda López",
    requestedSpecialty: "Pediatría",
    reason: "Consulta para recién nacido",
    contactInfo: "fernanda.l@email.com / 555-5678",
    addedAt: "2024-07-30",
    priority: "Alta",
    status: "Contactado"
  },
  {
    id: "wait3",
    patientName: "Mario Bros",
    requestedSpecialty: "General",
    reason: "Chequeo general",
    contactInfo: "mario@domain.com",
    addedAt: "2024-08-01",
    priority: "Baja",
    status: "Pendiente"
  },
];

export function WaitingListManagement() {
  const [waitingList, setWaitingList] = useState<WaitingPatient[]>(mockWaitingList);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Partial<WaitingPatient> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const openModal = (patient?: WaitingPatient) => {
    if (patient) {
      setCurrentPatient(patient);
      setIsEditing(true);
    } else {
      setCurrentPatient({ priority: 'Media', status: 'Pendiente', addedAt: new Date().toISOString().split('T')[0] });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSavePatient = () => {
    if (!currentPatient || !currentPatient.patientName || !currentPatient.requestedSpecialty || !currentPatient.contactInfo) {
        alert("Por favor, completa los campos obligatorios: Nombre, Especialidad y Contacto.");
        return;
    }

    if (isEditing && currentPatient.id) {
      setWaitingList(waitingList.map(p => p.id === currentPatient.id ? currentPatient as WaitingPatient : p));
    } else {
      setWaitingList([...waitingList, { ...currentPatient, id: `wait-${Date.now()}` } as WaitingPatient]);
    }
    setIsModalOpen(false);
    setCurrentPatient(null);
  };

  const updateStatus = (id: string, status: WaitingPatient['status']) => {
    setWaitingList(waitingList.map(p => p.id === id ? { ...p, status } : p));
  };

  const getPriorityBadge = (priority: WaitingPatient['priority']) => {
    if (priority === 'Alta') return <Badge variant="destructive">Alta</Badge>;
    if (priority === 'Media') return <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">Media</Badge>;
    return <Badge variant="outline">Baja</Badge>;
  };

  const getStatusBadge = (status: WaitingPatient['status']) => {
    if (status === 'Pendiente') return <Badge variant="outline">Pendiente</Badge>;
    if (status === 'Contactado') return <Badge className="bg-blue-500 text-white">Contactado</Badge>;
    if (status === 'Agendado') return <Badge className="bg-green-500 text-white">Agendado</Badge>;
    return <Badge>{status}</Badge>;
  };

  return (
    <Card className="col-span-1 lg:col-span-2"> {/* Ajustar según layout */}
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Gestión de Lista de Espera
                </CardTitle>
                <CardDescription>
                    Administra pacientes en espera de una cita.
                </CardDescription>
            </div>
            <Button onClick={() => openModal()} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" /> Añadir Paciente
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {waitingList.length > 0 ? (
          <ScrollArea className="h-[400px]"> {/* Altura ajustable */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitingList.map((patient) => (
                  <TableRow key={patient.id} className="hover:bg-muted/50">
                    <TableCell>
                        <p className="font-medium">{patient.patientName}</p>
                        <p className="text-xs text-muted-foreground">{patient.contactInfo}</p>
                        <p className="text-xs text-muted-foreground">Motivo: {patient.reason}</p>
                        {patient.requestedDoctor && <p className="text-xs text-muted-foreground">Pref. Dr: {patient.requestedDoctor}</p>}
                    </TableCell>
                    <TableCell>{patient.requestedSpecialty}</TableCell>
                    <TableCell>{getPriorityBadge(patient.priority)}</TableCell>
                    <TableCell>{getStatusBadge(patient.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => openModal(patient)}>Editar</Button>
                      {patient.status === 'Pendiente' && <Button variant="ghost" size="sm" onClick={() => updateStatus(patient.id, 'Contactado')}>Contactar</Button>}
                      {patient.status === 'Contactado' && <Button variant="default" size="sm" onClick={() => updateStatus(patient.id, 'Agendado')}>Agendar</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">La lista de espera está vacía.</p>
        )}
      </CardContent>

      {isModalOpen && currentPatient && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar Paciente en Espera" : "Añadir Paciente a Lista de Espera"}</DialogTitle>
              <DialogDescription>
                {isEditing ? `Modifica los datos de ${currentPatient.patientName}.` : "Completa los datos del nuevo paciente."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-name" className="text-right">Nombre*</Label>
                <Input id="patient-name" value={currentPatient.patientName || ''} onChange={(e) => setCurrentPatient({...currentPatient, patientName: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-contact" className="text-right">Contacto*</Label>
                <Input id="patient-contact" value={currentPatient.contactInfo || ''} onChange={(e) => setCurrentPatient({...currentPatient, contactInfo: e.target.value})} className="col-span-3" placeholder="Email / Teléfono"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-specialty" className="text-right">Especialidad*</Label>
                <Input id="patient-specialty" value={currentPatient.requestedSpecialty || ''} onChange={(e) => setCurrentPatient({...currentPatient, requestedSpecialty: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-doctor" className="text-right">Médico (Pref.)</Label>
                <Input id="patient-doctor" value={currentPatient.requestedDoctor || ''} onChange={(e) => setCurrentPatient({...currentPatient, requestedDoctor: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="patient-reason" className="text-right pt-2">Motivo</Label>
                <Textarea id="patient-reason" value={currentPatient.reason || ''} onChange={(e) => setCurrentPatient({...currentPatient, reason: e.target.value})} className="col-span-3 min-h-[80px]" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-priority" className="text-right">Prioridad</Label>
                <select id="patient-priority" value={currentPatient.priority || 'Media'} onChange={(e) => setCurrentPatient({...currentPatient, priority: e.target.value as WaitingPatient['priority']})} className="col-span-3 p-2 border rounded-md">
                    <option value="Baja">Baja</option>
                    <option value="Media">Media</option>
                    <option value="Alta">Alta</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePatient}>Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}