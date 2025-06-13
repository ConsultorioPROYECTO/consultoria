// src/app/dashboard/1/compo/StaffManagement.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@rutas/components/ui/button";
import { Card, CardContent } from "@rutas/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { Badge } from "@rutas/components/ui/badge";
import { Users, Stethoscope, UserCheck, Edit, Trash2, Clock, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@rutas/components/ui/dialog";
import { DoctorWorkingHours } from "./DoctorWorkingHours";
import { WorkingHours } from "@rutas/types/working-hours";
import { getFirebaseAuthToken } from '@rutas/app/lib/firebase/clientUtils';
import type { User } from '@rutas/db/schema/users';

// Definir el tipo de miembro del personal basado en el schema de la base de datos
interface StaffMember {
  id: number;
  name: string;
  role: 'admin' | 'medico' | 'asistente' | 'N/A';
  specialty?: string;
  assignedDoctor?: string;
  status: 'active' | 'inactive';
  email: string;
  patients?: number;
  appointments?: number;
  workingHours?: WorkingHours;
}

export function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<StaffMember | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener los miembros del personal de la API
  const fetchStaffMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = await getFirebaseAuthToken();

    if (!token) {
      setError('Autenticación requerida. Por favor, inicia sesión.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const users: User[] = await response.json();
      
      // Filtrar solo usuarios activos y con roles relevantes (excluir N/A)
      const activeStaff = users
        .filter(user => user.isActive && user.role !== 'N/A')
        .map(user => ({
          id: user.id,
          name: user.displayName || user.email || 'Usuario sin nombre',
          role: user.role as 'admin' | 'medico' | 'asistente',
          email: user.email || '',
          status: 'active' as const,
          // Datos mock para pacientes y citas - en una implementación real vendrían de otras APIs
          patients: Math.floor(Math.random() * 50) + 10,
          appointments: Math.floor(Math.random() * 20) + 5,
          specialty: user.role === 'medico' ? 'Especialidad General' : undefined,
        }));

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

  const handleDeleteStaff = (id: number) => {
    // En una implementación real, esto haría una llamada a la API para eliminar el usuario
    setStaffMembers(prev => prev.filter(member => member.id !== id));
  };

  const handleSaveWorkingHours = async (doctorId: number, workingHours: WorkingHours) => {
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



  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'medico':
        return 'default';
      case 'asistente':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const activeStaff = staffMembers.filter(member => member.status === 'active');
  const doctorsCount = activeStaff.filter(member => member.role === 'medico').length;
  const assistantsCount = activeStaff.filter(member => member.role === 'asistente').length;

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardContent className="space-y-6 p-4 sm:p-6">
        {/* Lista de personal actual */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Personal Actual ({staffMembers.length})
              </h3>
              <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                <span className="flex items-center">
                  <Stethoscope className="h-4 w-4 mr-1" />
                  {doctorsCount} Médicos
                </span>
                <span className="flex items-center">
                  <UserCheck className="h-4 w-4 mr-1" />
                  {assistantsCount} Asistentes
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStaffMembers}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cargando
                </>
              ) : (
                <>
                <RefreshCw className="h-4 w-4 mr-2"/>
                  Actualizar
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="h-[400px] border rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Cargando personal...</p>
            </div>
          ) : (
            <div className="h-[400px] border rounded-lg overflow-auto w-full">
              <Table className="w-full table-auto">
                  <TableHeader>
                     <TableRow>
                       <TableHead className="min-w-[120px] sm:min-w-[200px]">Personal</TableHead>
                       <TableHead className="min-w-[80px] sm:min-w-[100px]">Rol</TableHead>
                       <TableHead className="min-w-[100px] sm:min-w-[150px] hidden sm:table-cell">Detalles</TableHead>
                       <TableHead className="min-w-[120px] sm:min-w-[200px] hidden md:table-cell">Email</TableHead>
                       <TableHead className="text-right min-w-[100px] sm:min-w-[150px]">Acciones</TableHead>
                     </TableRow>
                   </TableHeader>
                <TableBody>
                  {staffMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No se encontraron miembros del personal
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        
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
                        {member.role === "medico" && member.specialty && (
                          <p className="text-sm font-medium">{member.specialty}</p>
                        )}
                        {member.role === "asistente" && member.assignedDoctor && (
                          <p className="text-sm text-muted-foreground">
                            Asignado a: {member.assignedDoctor}
                          </p>
                        )}
                        {!member.specialty && !member.assignedDoctor && (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      <div className="truncate max-w-[120px] sm:max-w-none">{member.email}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1 sm:space-x-2">
                        {member.role === 'medico' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                title="Configurar Horarios"
                                onClick={() => setSelectedDoctorForSchedule(member)}
                                className="px-2 sm:px-3"
                              >
                                <Clock className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Horarios</span>
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
                        <Button variant="outline" size="sm" title="Editar" className="px-2 sm:px-3">
                          <Edit className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteStaff(member.id)}
                          title="Eliminar"
                          className="px-2 sm:px-3"
                        >
                          <Trash2 className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </Button>
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

    </Card>
  );
}