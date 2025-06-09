// src/app/dashboard/1/compo/StaffManagement.tsx
'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { Badge } from "@rutas/components/ui/badge";
import { Users, Stethoscope, UserCheck, Edit, Trash2, Clock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@rutas/components/ui/dialog";
import { DoctorWorkingHours } from "./DoctorWorkingHours";
import { AddStaffForm } from "./AddStaffForm";
import { WorkingHours } from "@rutas/types/working-hours";

interface StaffMember {
  id: string;
  name: string;
  role: 'Médico' | 'Asistente';
  specialty?: string;
  assignedDoctor?: string;
  status: 'active' | 'inactive';
  email?: string;
  workingHours?: WorkingHours;
}

// Mock data - en una aplicación real, esto vendría de una API
const initialStaffMembers: StaffMember[] = [
  { 
    id: "doc1", 
    name: "Dr. Ana Pérez", 
    role: "Médico", 
    specialty: "Cardiología", 
    status: "active",
    email: "ana.perez@clinica.com"
  },
  { 
    id: "asist1", 
    name: "Carlos López", 
    role: "Asistente", 
    assignedDoctor: "Dr. Ana Pérez", 
    status: "active",
    email: "carlos.lopez@clinica.com"
  },
  { 
    id: "doc2", 
    name: "Dr. Juan Rodríguez", 
    role: "Médico", 
    specialty: "Pediatría", 
    status: "active",
    email: "juan.rodriguez@clinica.com"
  },
];

export function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(initialStaffMembers);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<StaffMember | null>(null);

  const handleAddStaff = (newMember: StaffMember) => {
    setStaffMembers([...staffMembers, newMember]);
  };

  const handleDeleteStaff = (id: string) => {
    setStaffMembers(staffMembers.filter(member => member.id !== id));
  };

  const handleSaveWorkingHours = async (doctorId: string, workingHours: WorkingHours) => {
    try {
      const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workingHours }),
      });

      if (!response.ok) {
        throw new Error('Error al guardar horarios');
      }

      // Actualizar el estado local
      setStaffMembers(prev => prev.map(member => 
        member.id === doctorId 
          ? { ...member, workingHours }
          : member
      ));

      setSelectedDoctorForSchedule(null);
    } catch (error) {
      console.error('Error al guardar horarios:', error);
      throw error;
    }
  };

  const getRoleIcon = (role: string) => {
    return role === 'Médico' ? <Stethoscope className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'Médico' ? 'default' : 'secondary';
  };

  const activeStaff = staffMembers.filter(member => member.status === 'active');
  const doctorsCount = activeStaff.filter(member => member.role === 'Médico').length;
  const assistantsCount = activeStaff.filter(member => member.role === 'Asistente').length;

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Lista de personal actual */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Personal Actual



          </h3>
          <div className="h-[400px] border rounded-lg overflow-auto">
            <Table className="min-w-[800px] w-full">
                <TableHeader>
                   <TableRow>
                     <TableHead className="min-w-[200px]">Personal</TableHead>
                     <TableHead className="min-w-[100px]">Rol</TableHead>
                     <TableHead className="min-w-[150px]">Detalles</TableHead>
                     <TableHead className="min-w-[200px]">Email</TableHead>
                     <TableHead className="text-right min-w-[150px]">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
              <TableBody>
                {activeStaff.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          {getRoleIcon(member.role)}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">ID: {member.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {member.role === "Médico" && member.specialty && (
                          <p className="text-sm font-medium">{member.specialty}</p>
                        )}
                        {member.role === "Asistente" && member.assignedDoctor && (
                          <p className="text-sm text-muted-foreground">
                            Asignado a: {member.assignedDoctor}
                          </p>
                        )}
                        {!member.specialty && !member.assignedDoctor && (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                       {member.email && (
                         <p className="text-sm">{member.email}</p>
                       )}
                     </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {member.role === 'Médico' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                title="Configurar Horarios"
                                onClick={() => setSelectedDoctorForSchedule(member)}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-full h-full max-w-none max-h-none sm:max-w-5xl sm:max-h-[95vh] lg:max-w-7xl xl:max-w-[90vw] flex flex-col p-4 sm:p-6">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                  <Clock className="h-6 w-6 text-primary" />
                                  Horarios de Trabajo - {selectedDoctorForSchedule?.name}
                                </DialogTitle>
                                <DialogDescription className="text-base">
                                  Configure los días y horarios de atención del doctor. Los horarios se mostrarán en el calendario.
                                </DialogDescription>
                              </DialogHeader>
                              {selectedDoctorForSchedule && (
                                <DoctorWorkingHours
                                  doctorId={selectedDoctorForSchedule.id}
                                  doctorName={selectedDoctorForSchedule.name}
                                  initialWorkingHours={selectedDoctorForSchedule.workingHours}
                                  onSave={handleSaveWorkingHours}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button variant="outline" size="sm" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteStaff(member.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total de personal activo: {activeStaff.length}
        </p>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span className="flex items-center">
            <Stethoscope className="h-4 w-4 mr-1" />
            {doctorsCount} Médicos
          </span>
          <span className="flex items-center">
            <UserCheck className="h-4 w-4 mr-1" />
            {assistantsCount} Asistentes
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}