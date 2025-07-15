'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Stethoscope, UserCheck, Clock, RefreshCw, ChevronRight } from "lucide-react";
import WaveformLoader from '@/components/custom/WaveformLoader';
import { DoctorWorkingHours } from "./DoctorWorkingHours";
import { StaffDetailModal } from "./StaffDetailModal";
import { AssignDoctorModal } from "./AssignDoctorModal";
import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils';
import type { User } from '@/db/schema/users';
import type { DoctorWorkingHours as DoctorWorkingHoursType } from "@/types/google-calendar-schemas";
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

// Tipo extendido para incluir datos del doctor y asistente desde la API
type UserWithDoctorAndAssistant = User & {
  idDoctor?: number | null;
  idAssistant?: number | null;
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
  idAssistant?: number | null;
  workingHours?: DoctorWorkingHoursType; // Usar el tipo correcto de la API
  specialty?: string;
  patients?: number;
  appointments?: number;
}

export function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<StaffMember | null>(null);
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffMember | null>(null);
  const [selectedAssistantForDoctors, setSelectedAssistantForDoctors] = useState<StaffMember | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isAssignDoctorModalOpen, setIsAssignDoctorModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

      const users: UserWithDoctorAndAssistant[] = await response.json();
      
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
            idAssistant: user.idAssistant,
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

  const handleOpenDoctors = (member: StaffMember) => {
    if (member.role === 'asistente') {
      setSelectedAssistantForDoctors(member);
      setIsAssignDoctorModalOpen(true);
    }
  };

  const handleAssignmentComplete = () => {
    // Refrescar la lista de personal después de asignar doctores
    fetchStaffMembers();
    toast.success('Doctores asignados correctamente');
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
        <CardDescription className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
            <Stethoscope className="h-3 w-3" />
            {doctorsCount} Médicos
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 px-2 py-1 text-xs">
            <UserCheck className="h-3 w-3" />
            {assistantsCount} Asistentes
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="space-y-4">
          {error && <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">{error}</div>}
          
          {isLoading ? (
            <div className="flex h-[400px] border rounded-lg flex-col items-center justify-center">
              <WaveformLoader className="w-24 h-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[400px] border rounded-lg overflow-auto w-full">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Personal</TableHead>
                  {!isMobile && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow></TableHeader>
                <TableBody>
                  {staffMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No se encontraron miembros del personal</TableCell></TableRow>
                  ) : (
                    staffMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{member.name}</p>
                                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                                  </div>
                                  {!isMobile && (
                                    <Badge 
                                      variant="outline"
                                      className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 border-0 whitespace-nowrap ${
                                        member.role === 'medico' 
                                          ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 shadow-sm hover:shadow-md hover:from-blue-500/15 hover:to-cyan-500/15 dark:from-blue-400/10 dark:to-cyan-400/10 dark:text-blue-300' 
                                          : member.role === 'admin' 
                                          ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700 shadow-sm hover:shadow-md hover:from-red-500/15 hover:to-pink-500/15 dark:from-red-400/10 dark:to-pink-400/10 dark:text-red-300'
                                          : 'bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 shadow-sm hover:shadow-md hover:from-gray-500/15 hover:to-slate-500/15 dark:from-gray-400/10 dark:to-slate-400/10 dark:text-gray-300'
                                      }`}
                                    >
                                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                                        member.role === 'medico' 
                                          ? 'bg-blue-500 shadow-sm' 
                                          : member.role === 'admin' 
                                          ? 'bg-red-500 shadow-sm'
                                          : 'bg-gray-500 shadow-sm'
                                      }`} />
                                      {member.role === 'medico' ? 'Médico' : member.role === 'admin' ? 'Admin' : 'Asistente'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isMobile && (
                                <div className="flex items-center gap-3">
                                  <Badge 
                                    variant="outline"
                                    className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 border-0 whitespace-nowrap ${
                                      member.role === 'medico' 
                                        ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-700 shadow-sm hover:shadow-md hover:from-blue-500/15 hover:to-cyan-500/15 dark:from-blue-400/10 dark:to-cyan-400/10 dark:text-blue-300' 
                                        : member.role === 'admin' 
                                        ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-700 shadow-sm hover:shadow-md hover:from-red-500/15 hover:to-pink-500/15 dark:from-red-400/10 dark:to-pink-400/10 dark:text-red-300'
                                        : 'bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 shadow-sm hover:shadow-md hover:from-gray-500/15 hover:to-slate-500/15 dark:from-gray-400/10 dark:to-slate-400/10 dark:text-gray-300'
                                    }`}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${
                                      member.role === 'medico' 
                                        ? 'bg-blue-500 shadow-sm' 
                                        : member.role === 'admin' 
                                        ? 'bg-red-500 shadow-sm'
                                        : 'bg-gray-500 shadow-sm'
                                    }`} />
                                    {member.role === 'medico' ? 'Médico' : member.role === 'admin' ? 'Admin' : 'Asistente'}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleViewMore(member)}
                                    className="p-2 flex-shrink-0"
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {!isMobile && (
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end space-x-2">
                               <Button variant="outline" size="sm" onClick={() => handleViewMore(member)}><Users className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Ver más</span></Button>
                               {member.role === 'medico' && member.idDoctor && (
                                 <Button variant="outline" size="sm" onClick={() => handleOpenSchedule(member)}><Clock className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Horario</span></Button>
                               )}
                               {member.role === 'asistente' && (
                                 <Button variant="outline" size="sm" onClick={() => handleOpenDoctors(member)}><Stethoscope className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Doctores</span></Button>
                               )}
                             </div>
                           </TableCell>
                         )}
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
        <DoctorWorkingHours
          doctorId={selectedDoctorForSchedule.idDoctor!}
          doctorName={selectedDoctorForSchedule.name}
          initialWorkingHours={selectedDoctorForSchedule.workingHours}
          isOpen={!!selectedDoctorForSchedule}
          onClose={() => setSelectedDoctorForSchedule(null)}
          onSave={handleSaveWorkingHours}
        />
      )}

      {selectedAssistantForDoctors && (
        <AssignDoctorModal
          isOpen={isAssignDoctorModalOpen}
          onOpenChange={setIsAssignDoctorModalOpen}
          assistantId={selectedAssistantForDoctors.idAssistant}
          assistantName={selectedAssistantForDoctors.name}
          onAssignmentComplete={handleAssignmentComplete}
        />
      )}
    </Card>
  );
}
