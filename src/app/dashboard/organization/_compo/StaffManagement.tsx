'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Stethoscope, UserCheck, Clock, RefreshCw, ChevronRight, Search, Shield } from "lucide-react";
import WaveformLoader from '@/components/custom/WaveformLoader';
import { DoctorWorkingHours } from "./DoctorWorkingHours";
import { StaffDetailModal } from "./StaffDetailModal";
import { AssignDoctorModal } from "./AssignDoctorModal";
import { useAuth } from '@/app/context/AuthContext';
import { useUsersData } from '@/app/context/DashboardDataContext';
import type { DoctorWorkingHours as DoctorWorkingHoursType } from "@/types/google-calendar-schemas";
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Tipo interno para el estado del componente
interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'medico' | 'asistente' | 'N/A';
  organizationId: number;
  name: string;
  displayName: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  idDoctor?: number | null;
  idAssistant?: number | null;
  workingHours?: DoctorWorkingHoursType;
  specialty?: string;
  patients?: number;
  appointments?: number;
}

export function StaffManagement() {
  const { getAuthToken } = useAuth();
  const { users, loading, error, refetch } = useUsersData();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [filteredStaffMembers, setFilteredStaffMembers] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('todos');
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] = useState<StaffMember | null>(null);
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<StaffMember | null>(null);
  const [selectedAssistantForDoctors, setSelectedAssistantForDoctors] = useState<StaffMember | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isAssignDoctorModalOpen, setIsAssignDoctorModalOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();

  // Procesar usuarios del hook centralizado para convertirlos a StaffMembers
  useEffect(() => {
    if (users && users.length > 0) {
      const processedUsers: StaffMember[] = users.map(user => {
        // Convertir el role de string a uno de los valores permitidos
        const normalizedRole = (['admin', 'medico', 'asistente'].includes(user.role)) 
          ? user.role as 'admin' | 'medico' | 'asistente'
          : 'N/A' as const;
        
        const processedUser = {
          ...user,
          role: normalizedRole,
          name: `${user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim()}`,
          displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          isActive: user.isActive ?? true,
          status: (user.isActive ?? true) ? 'active' as const : 'inactive' as const,
          idDoctor: user.idDoctor || null,
          idAssistant: user.idAssistant || null,
          workingHours: undefined,
          specialty: normalizedRole === 'medico' ? 'Especialidad General' : undefined,
          patients: Math.floor(Math.random() * 50) + 10,
          appointments: Math.floor(Math.random() * 20) + 5,
        };
        
        console.log(`Usuario procesado - ${user.email}:`, {
          role: processedUser.role,
          idDoctor: processedUser.idDoctor,
          idAssistant: processedUser.idAssistant,
          originalIdDoctor: user.idDoctor,
          originalIdAssistant: user.idAssistant
        });
        
        return processedUser;
      });
      
      console.log('Usuarios procesados:', processedUsers);
      setStaffMembers(processedUsers);
    }
  }, [users]);

  // Efecto para filtrar miembros del personal basado en el término de búsqueda y tab activo
  useEffect(() => {
    let filtered = staffMembers;
    
    // Filtrar por rol según el tab activo
    if (activeTab !== 'todos') {
      filtered = filtered.filter(member => member.role === activeTab);
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredStaffMembers(filtered);
  }, [staffMembers, searchTerm, activeTab]);



  const handleSaveWorkingHours = async (doctorId: number, newWorkingHours: DoctorWorkingHoursType) => {
    try {
      const token = await getAuthToken();
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
      console.log('Abriendo horario para médico:', {
        name: member.name,
        idDoctor: member.idDoctor,
        role: member.role
      });
      setSelectedDoctorForSchedule(member);
    } else {
      console.warn('No se puede abrir el horario:', {
        name: member.name,
        role: member.role,
        idDoctor: member.idDoctor,
        reason: !member.idDoctor ? 'No tiene idDoctor' : 'Rol incorrecto'
      });
    }
  };

  const handleOpenDoctors = (member: StaffMember) => {
    if (member.role === 'asistente' && member.idAssistant) {
      console.log('Abriendo modal para asistente:', {
        name: member.name,
        idAssistant: member.idAssistant,
        role: member.role
      });
      setSelectedAssistantForDoctors(member);
      setIsAssignDoctorModalOpen(true);
    } else {
      console.warn('No se puede abrir el modal de doctores:', {
        name: member.name,
        role: member.role,
        idAssistant: member.idAssistant,
        reason: !member.idAssistant ? 'No tiene idAssistant' : 'Rol incorrecto'
      });
    }
  };

  const handleAssignmentComplete = () => {
    // Refrescar la lista de personal después de asignar doctores
    refetch();
    toast.success('Doctores asignados correctamente');
  };

  const adminsCount = staffMembers.filter(member => member.role === 'admin').length;
  const doctorsCount = staffMembers.filter(member => member.role === 'medico').length;
  const assistantsCount = staffMembers.filter(member => member.role === 'asistente').length;

  return (
    <Card className="w-full max-w-full overflow-hidden ">
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-start justify-between">
          <div>
            Personal Actual
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </CardTitle>
        <CardDescription>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                Todos ({staffMembers.length})
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Admins ({adminsCount})
              </TabsTrigger>
              <TabsTrigger value="medico" className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                Médicos ({doctorsCount})
              </TabsTrigger>
              <TabsTrigger value="asistente" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Asistentes ({assistantsCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Campo de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={`Buscar ${activeTab === 'todos' ? 'personal' : activeTab === 'admin' ? 'administradores' : activeTab === 'medico' ? 'médicos' : 'asistentes'} por nombre o correo...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="space-y-4">
          {error && <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-red-700">{error}</div>}
          
          {loading ? (
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
                  {filteredStaffMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No se encontraron resultados para la búsqueda' : 'No se encontraron miembros del personal'}
                    </TableCell></TableRow>
                  ) : (
                    filteredStaffMembers.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex-1 min-w-0">
                            {isMobile ? (
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{member.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                                  <div className="mt-2">
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
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleViewMore(member)}
                                  className="p-2 flex-shrink-0 ml-3"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{member.name}</p>
                                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                                    </div>
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
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {!isMobile && (
                           <TableCell className="text-right">
                             <div className="flex items-center justify-end space-x-2">
                               <Button variant="outline" size="sm" onClick={() => handleViewMore(member)}><Users className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Ver más</span></Button>
                               {member.role === 'medico' && member.idDoctor && (
                                 <Button variant="outline" size="sm" onClick={() => handleOpenSchedule(member)}><Clock className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Horario</span></Button>
                               )}
                               {member.role === 'asistente' && member.idAssistant && (
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
        onUpdate={refetch}
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
