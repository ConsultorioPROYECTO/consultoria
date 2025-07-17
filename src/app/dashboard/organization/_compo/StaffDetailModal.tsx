'use client';

import React, { useEffect, useState } from 'react';
import { useStaffActions } from './useStaffActions';
import { useDoctorServicesForStaff } from '@/hooks/useDoctorServicesForStaff';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Stethoscope, Building, PencilLine, Trash2, Loader2, Activity, Clock, DollarSign } from "lucide-react";

import Image from 'next/image';

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
  idDoctor?: number | null;
  idAssistant?: number | null;
}

interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: StaffMember | null;
  onUpdate: () => void; // Callback para refrescar la lista de personal
}

export function StaffDetailModal({
  isOpen,
  onClose,
  staffMember,
  onUpdate
}: StaffDetailModalProps) {
  const [currentRole, setCurrentRole] = useState(staffMember?.role);
  const { isChangingRole, isDeleting, handleChangeRole, handleDeleteStaff } = useStaffActions();
  const { services, loading: servicesLoading, error: servicesError } = useDoctorServicesForStaff(
    staffMember?.role === 'medico' ? (staffMember.idDoctor ?? null) : null
  );

  useEffect(() => {
    if (staffMember) {
      setCurrentRole(staffMember.role);
    }
  }, [staffMember]);

  if (!staffMember) return null;

  const handleRoleChange = async (newRole: 'admin' | 'medico' | 'asistente') => {
    await handleChangeRole(staffMember, newRole, onUpdate);
    setCurrentRole(newRole);
  };

  const handleDelete = async () => {
    await handleDeleteStaff(staffMember, onUpdate, onClose);
  };

  const getRoleDisplayName = (role: string) => {
    const roles: { [key: string]: string } = {
      admin: 'Administrador',
      medico: 'Médico',
      asistente: 'Asistente',
    };
    return roles[role] || role;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-y-auto sm:max-w-2xl sm:max-h-[90vh] max-sm:fixed max-sm:inset-0 max-sm:w-screen max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:border-0 max-sm:m-0 max-sm:p-0">
        {/* Header con imagen de perfil para móviles */}
        <div className="max-sm:h-[350px] max-sm:relative sm:hidden">
          {/* Usamos una etiqueta <img> para mayor fiabilidad */}
          <Image 
            src="/img/avatar_1.webp" 
            alt="Perfil" 
            width={500}
            height={500}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/100 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center pb-6">
            <div className="text-center text-white">
              <div className="w-[80px] h-[80px] mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                <User className="w-[40px] h-[40px] text-white" />
              </div>
              <h2 className="text-xl font-bold text-primary">{staffMember.name}</h2>
              <Badge variant="secondary" className="mt-2 bg-white/20 text-primary border-white/30">
                {getRoleDisplayName(staffMember.role)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Header tradicional para desktop (DISEÑO ORIGINAL RESTAURADO) */}
        <DialogHeader className="max-sm:hidden p-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            Información del Personal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 p-6 max-sm:p-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-4 text-lg"><User className="h-5 w-5" />Información Personal</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <PencilLine className="h-4 w-4 text-muted-foreground"/>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                  <p className="text-base">{staffMember.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="h-4 w-4 text-muted-foreground"/>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
                  <p className="text-base">{staffMember.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del rol con SELECT (FUNCIONALIDAD AÑADIDA) */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Shield className="h-5 w-5" />Rol en la Organización</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-4">
                <Select value={currentRole} onValueChange={handleRoleChange} disabled={isChangingRole}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="medico">Médico</SelectItem>
                        <SelectItem value="asistente">Asistente</SelectItem>
                    </SelectContent>
                </Select>
                {isChangingRole && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </CardContent>
          </Card>

          {/* Información específica del rol (DISEÑO ORIGINAL RESTAURADO) */}
          {staffMember.role === 'medico' && (
            <>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Stethoscope className="h-5 w-5" />Información Médica</CardTitle></CardHeader>
                <CardContent>
                  <p><strong>Especialidad:</strong> {staffMember.specialty || 'N/A'}</p>
                </CardContent>
              </Card>
              
              {/* Servicios Médicos Asignados */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5" />
                    Servicios Médicos Asignados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {servicesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Cargando servicios...</span>
                    </div>
                  ) : servicesError ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-destructive">Error al cargar servicios: {servicesError}</p>
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No hay servicios asignados</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((doctorService) => (
                        <div key={doctorService.serviceId} className="border rounded-lg p-3 bg-muted/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{doctorService.service.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {doctorService.service.description || 'Sin descripción'}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {doctorService.service.category}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {doctorService.service.durationMinutes} min
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <DollarSign className="h-3 w-3" />
                                {doctorService.customPrice || doctorService.service.basePrice}
                              </div>
                              {doctorService.customPrice && (
                                <p className="text-xs text-muted-foreground">
                                  Precio personalizado
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          {staffMember.role === 'asistente' && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building className="h-5 w-5" />Información del Asistente</CardTitle></CardHeader>
              <CardContent>
                <p><strong>Médico Asignado:</strong> {staffMember.assignedDoctor || 'N/A'}</p>
              </CardContent>
            </Card>
          )}

          {/* Acciones con AlertDialog (FUNCIONALIDAD MEJORADA) */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Acciones</CardTitle></CardHeader>
            <CardContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Eliminar de la Organización
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción desvinculará permanentemente a <strong>{staffMember.name}</strong> de la organización. No se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirmar Eliminación</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
