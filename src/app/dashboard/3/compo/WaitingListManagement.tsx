// src/app/dashboard/3/compo/WaitingListManagement.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Users, PlusCircle } from "lucide-react";
import { Badge } from "@rutas/components/ui/badge";
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rutas/components/ui/dialog";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Textarea } from "@rutas/components/ui/textarea";
import { useDoctorsWithAppointments } from "@/hooks/useDoctorsWithAppointments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rutas/components/ui/select";

interface WaitingPatient {
  id: string;
  patientName: string;
  requestedDoctorId?: number;
  requestedSpecialty: string;
  reason: string;
  contactInfo: string;
  addedAt: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Pendiente' | 'Contactado' | 'Agendado';
}

export function WaitingListManagement() {
  const { doctors, loading, error } = useDoctorsWithAppointments();
  
  // Lista de espera inicial con algunos datos de ejemplo basados en los doctores reales
  const initialWaitingList = useMemo(() => {
    if (!doctors.length) return [];
    
    return [
      {
        id: "wait1",
        patientName: "Ricardo Gómez",
        requestedDoctorId: doctors[0]?.idDoctor,
        requestedSpecialty: doctors[0]?.speciality || "General",
        reason: "Revisión anual programada",
        contactInfo: "ricardo@email.com / 555-1234",
        addedAt: "2024-07-28",
        priority: "Media" as const,
        status: "Pendiente" as const
      },
      {
        id: "wait2",
        patientName: "Fernanda López",
        requestedSpecialty: doctors[1]?.speciality || "Pediatría",
        reason: "Consulta para recién nacido",
        contactInfo: "fernanda.l@email.com / 555-5678",
        addedAt: "2024-07-30",
        priority: "Alta" as const,
        status: "Contactado" as const
      }
    ];
  }, [doctors]);

  const [waitingList, setWaitingList] = useState<WaitingPatient[]>([]);
  
  // Actualizar la lista cuando los datos de doctores cambien
  React.useEffect(() => {
    if (doctors.length > 0 && waitingList.length === 0) {
      setWaitingList(initialWaitingList);
    }
  }, [doctors, initialWaitingList, waitingList.length]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Partial<WaitingPatient> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Obtener especialidades únicas de los doctores
  const availableSpecialties = useMemo(() => {
    const specialties = [...new Set(doctors.map(doctor => doctor.speciality))];
    return specialties.filter(Boolean);
  }, [doctors]);
  
  // Función para obtener el nombre del doctor
  const getDoctorName = (doctorId?: number) => {
    if (!doctorId) return '';
    const doctor = doctors.find(d => d.idDoctor === doctorId);
    return doctor ? `${doctor.speciality} (ID: ${doctor.idDoctor})` : '';
  };

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
      setWaitingList([...waitingList, { 
        ...currentPatient, 
        id: `wait-${Date.now()}`,
        addedAt: new Date().toISOString().split('T')[0]
      } as WaitingPatient]);
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

  if (loading) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            Gestión de Lista de Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-primary" />
            Gestión de Lista de Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Gestión de Lista de Espera
                </CardTitle>
                <CardDescription>
                    Administra pacientes en espera de citas con tus médicos.
                </CardDescription>
            </div>
            <Button onClick={() => openModal()} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" /> Añadir Paciente
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {waitingList.length > 0 ? (
          <ScrollArea className="h-[400px]">
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
                        {patient.requestedDoctorId && (
                          <p className="text-xs text-muted-foreground">
                            Pref. Dr: {getDoctorName(patient.requestedDoctorId)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Agregado: {patient.addedAt}</p>
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
                <Select 
                  value={currentPatient.requestedSpecialty || ''} 
                  onValueChange={(value) => setCurrentPatient({...currentPatient, requestedSpecialty: value})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar especialidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSpecialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-doctor" className="text-right">Médico (Pref.)</Label>
                <Select 
                  value={currentPatient.requestedDoctorId?.toString() || ''} 
                  onValueChange={(value) => setCurrentPatient({
                    ...currentPatient, 
                    requestedDoctorId: value ? parseInt(value) : undefined
                  })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar médico (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin preferencia</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.idDoctor} value={doctor.idDoctor.toString()}>
                        {doctor.speciality} (ID: {doctor.idDoctor})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="patient-reason" className="text-right pt-2">Motivo</Label>
                <Textarea id="patient-reason" value={currentPatient.reason || ''} onChange={(e) => setCurrentPatient({...currentPatient, reason: e.target.value})} className="col-span-3 min-h-[80px]" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="patient-priority" className="text-right">Prioridad</Label>
                <Select 
                  value={currentPatient.priority || 'Media'} 
                  onValueChange={(value) => setCurrentPatient({
                    ...currentPatient, 
                    priority: value as WaitingPatient['priority']
                  })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baja">Baja</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
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