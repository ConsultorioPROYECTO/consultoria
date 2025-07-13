// src/app/dashboard/1/compo/StaffManagement.tsx
// src/app/dashboard/rol/Admin/_compo/StaffManagement.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Stethoscope, UserCheck, Clock, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DoctorWorkingHours } from "../../rol/Admin/_compo/DoctorWorkingHours";
import { StaffDetailModal } from "../../rol/Admin/_compo/StaffDetailModal";
import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils';
import type { User } from '@/db/schema/users';
import type { DoctorWorkingHours as DoctorWorkingHoursType } from "@/types/google-calendar-schemas";
import { toast } from 'sonner';

// Tipo extendido para incluir datos del doctor desde la API
type UserWithDoctor = User & {
  idDoctor?: number | null;
  working_hours?: DoctorWorkingHoursType | string | null; // La API puede devolver JSON como string
};

// Tipo interno para el estado del componente
interface StaffMember {
  id: number;
  name: string;
  role: 'admin' | 'medico' | 'asistente';
  email: string;
  status: 'active' | 'inactive';
  idDoctor?: number | null;
  workingHours?: DoctorWorkingHoursType; // Usar el tipo correcto de la API
  specialty?: string;
  patients?: number;
  appointments?: number;
}

export function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<StaffMember | null>(null);
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffMember | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getFirebaseAuthToken();
      if (!token) throw new Error('Autenticación requerida. Por favor, inicia sesión.');

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      const users: UserWithDoctor[] = await response.json();
      
      const activeStaff = users
        .filter(user => user.isActive && user.role !== 'N/A')
        .map((user): StaffMember => {
          let parsedWorkingHours: DoctorWorkingHoursType | undefined = undefined;
          if (typeof user.working_hours === 'string') {
            try {
              parsedWorkingHours = JSON.parse(user.working_hours);
            } catch (e) {
              console.error('Error parsing working_hours JSON:', e);
            }
          } else if (user.working_hours) {
            parsedWorkingHours = user.working_hours;
          }

          return {
            id: user.id,
            name: user.displayName || user.email || 'Usuario sin nombre',
            role: user.role as 'admin' | 'medico' | 'asistente',
            email: user.email || '',
            status: 'active',
            idDoctor: user.idDoctor,
            workingHours: parsedWorkingHours,
            specialty: user.role === 'medico' ? 'Especialidad General' : undefined,
            patients: Math.floor(Math.random() * 50) + 10,
            appointments: Math.floor(Math.random() * 20) + 5,
          };
        });

      setStaffMembers(activeStaff);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Un error desconocido ocurrió.';
      console.error('Error al obtener miembros del personal:', errorMessage);
      setError(`No se pudieron cargar los miembros del personal: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaffMembers();
  }, [fetchStaffMembers]);

  const handleSaveWorkingHours = async (doctorId: number, newWorkingHours: DoctorWorkingHoursType) => {
    try {
      const token = await getFirebaseAuthToken();
      if (!token) {
        toast.error("Error de autenticación");
        return;
      }

      const response = await fetch(`/api/doctors/${doctorId}/working-hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorkingHours),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar horarios');
      }

      setStaffMembers(prev => prev.map(member => 
        member.idDoctor === doctorId 
          ? { ...member, workingHours: newWorkingHours }
          : member
      ));

      toast.success("Horarios guardados correctamente");
      setSelectedDoctorForSchedule(null);
    } catch (error) {
      console.error('Error al guardar horarios:', error);
      toast.error(error instanceof Error ? error.message : "Error desconocido al guardar");
    }
  };

  const handleViewMore = (member: StaffMember) => {
    setSelectedStaffForDetail(member);
    setIsDetailModalOpen(true);
  };

  const handleOpenSchedule = (member: StaffMember) => {
    if (member.role === 'medico' && member.idDoctor) {
      setSelectedDoctorForSchedule(member);
    }
  };

  const doctorsCount = staffMembers.filter(member => member.role === 'medico').length;
  const assistantsCount = staffMembers.filter(member => member.role === 'asistente').length;

  return (
    <Card className="w-full max-w-full overflow-hidden ">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-start justify-between">
          <div>
            Personal Actual ({staffMembers.length})
          </div>
          <Button variant="outline" size="sm" onClick={fetchStaffMembers} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </CardTitle>
        <CardDescription className="flex items-center gap-4 text-sm font-medium">
          <span className="flex items-center"><Stethoscope className="h-4 w-4 mr-1" />{doctorsCount} Médicos</span>
          <span className="flex items-center"><UserCheck className="h-4 w-4 mr-1" />{assistantsCount} Asistentes</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="space-y-4">
          {error && <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">{error}</div>}
          
          {isLoading ? (
            <div className="h-[400px] border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Cargando personal...</p>
            </div>
          ) : (
            <div className="h-[400px] border rounded-lg overflow-auto w-full">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Personal</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {staffMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No se encontraron miembros del personal</TableCell></TableRow>
                  ) : (
                    staffMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/50">
                        <TableCell>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
                          <Badge variant={member.role === 'medico' ? 'default' : member.role === 'admin' ? 'destructive' : 'secondary'} className="mt-2">
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewMore(member)}><Users className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Ver más</span></Button>
                            {member.role === 'medico' && member.idDoctor && (
                              <Button variant="outline" size="sm" onClick={() => handleOpenSchedule(member)}><Clock className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Horario</span></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>

      <StaffDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        staffMember={selectedStaffForDetail}
        onUpdate={fetchStaffMembers}
      />

      {selectedDoctorForSchedule && (
        <Dialog open={!!selectedDoctorForSchedule} onOpenChange={() => setSelectedDoctorForSchedule(null)}>
          <DialogContent className="w-full h-full max-w-none sm:max-w-5xl sm:max-h-[95vh] flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><Clock className="h-6 w-6 text-primary" />Horarios de Trabajo - {selectedDoctorForSchedule.name}</DialogTitle>
              <DialogDescription>Configure los días y horarios de atención del doctor.</DialogDescription>
            </DialogHeader>
            <DoctorWorkingHours
              doctorId={selectedDoctorForSchedule.idDoctor!}
              doctorName={selectedDoctorForSchedule.name}
              initialWorkingHours={selectedDoctorForSchedule.workingHours}
              onSave={handleSaveWorkingHours}
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
