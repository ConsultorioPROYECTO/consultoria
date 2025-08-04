'use client';

import React, { useEffect, useState } from 'react';
import { useStaffActions } from './useStaffActions';
import { useDoctorServicesForStaff } from '@/hooks/useDoctorServicesForStaff';
import { useServicesData } from '@/hooks/useDashboardOptimized';
import { useAuth } from '@/app/context/AuthContext';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Stethoscope, Building, PencilLine, Trash2, Loader2, Activity, Clock, DollarSign, Plus, Check } from "lucide-react";

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
  const [isAssigningService, setIsAssigningService] = useState(false);
  const { isChangingRole, isDeleting, handleChangeRole, handleDeleteStaff } = useStaffActions();
  const { user } = useAuth();
  const { services, loading: servicesLoading, error: servicesError, refetch: refetchDoctorServices } = useDoctorServicesForStaff(
    staffMember?.role === 'medico' ? (staffMember.idDoctor ?? null) : null
  );
  const { medicalServices: allMedicalServices, isLoading: allServicesLoading, errors } = useServicesData();
  const allServicesError = errors.medicalServices;

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

  const handleAssignService = async (serviceId: number) => {
    if (!staffMember?.idDoctor || !user) return;

    setIsAssigningService(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/doctor-services', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: staffMember.idDoctor,
          serviceId: serviceId,
          isAvailable: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Refrescar la lista de servicios del doctor
      await refetchDoctorServices();
    } catch (error) {
      console.error('Error asignando servicio:', error);
    } finally {
      setIsAssigningService(false);
    }
  };

  // Filtrar servicios que el doctor no tiene asignados
  const getAvailableServices = () => {
    if (!allMedicalServices || !services) return [];
    
    const assignedServiceIds = services.map(ds => ds.serviceId);
    return allMedicalServices.filter(service => 
      service.isActive && !assignedServiceIds.includes(service.id)
    );
  };

  const availableServices = getAvailableServices();

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
      <DialogContent className="max-w-2xl flex flex-col sm:left-auto sm:right-0 sm:top-0 sm:ml-auto sm:h-screen sm:w-[480px] sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:border-l sm:border-border data-[state=open]:sm:animate-in data-[state=open]:sm:slide-in-from-right-80 max-sm:fixed max-sm:inset-0 max-sm:w-screen max-sm:h-dvh max-sm:rounded-none max-sm:border-0 max-sm:m-0 !p-0 ">
        {/* Header con imagen de perfil para móviles */}
        <div className="relative h-[350px] sm:h-[240px] ">
          {/* Usamos una etiqueta <img> para mayor fiabilidad */}
          <Image
            src="/banners/im2.avif"
            alt="Perfil"
            priority
            width={500}
            height={500}
            className="h-full w-full object-cover mask-b-from-40% mask-b-to-90%" // degrada de negro (visible) a transparente hacia arriba
          />

          <div className="absolute inset-0 flex items-end justify-center pb-6">
            <div className="text-center text-white">
              <div className="w-[80px] h-[80px] mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                <User className="w-[40px] h-[40px] text-white" />
              </div>
              <h2 className="text-2xl font-light text-primary">{staffMember.name}</h2>
              <Badge variant="secondary" className="mt-2 bg-white/20 text-primary border-white/30">
                {getRoleDisplayName(staffMember.role)}
              </Badge>
            </div>
          </div>
        </div>

        
        
        <div className="flex-grow space-y-6 p-6 max-sm:p-4 overflow-y-auto">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-lg font-medium text-foreground"><User className="h-5 w-5 text-muted-foreground" />Información Personal</h3>
            <div className="space-y-3">
                <div className="flex items-center gap-4">
              <PencilLine className="h-4 w-4 text-muted-foreground"/>
              <p className="text-base"><span className="text-sm font-medium text-muted-foreground">Nombre Completo:</span> {staffMember.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Mail className="h-4 w-4 text-muted-foreground"/>
              <p className="text-base"><span className="text-sm font-medium text-muted-foreground">Correo Electrónico:</span> {staffMember.email}</p>
            </div>
            </div>
          </div>

          {/* Información del rol con SELECT (FUNCIONALIDAD AÑADIDA) */}
          <div className="space-y-4 mt-6">
            <h3 className="flex items-center gap-2 text-lg font-medium text-foreground"><Shield className="h-5 w-5 text-muted-foreground" />Rol en la Organización</h3>
            <div className="flex items-center gap-4">
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
            </div>
          </div>

          {/* Información específica del rol (DISEÑO ORIGINAL RESTAURADO) */}
          {staffMember.role === 'medico' && (
            <>
              <div className="space-y-4 mt-6">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground"><Stethoscope className="h-5 w-5 text-muted-foreground" />Información Médica</h3>
                <div className="space-y-3">
                  <p className="text-base"><strong>Especialidad:</strong> {staffMember.specialty || 'N/A'}</p>
                </div>
              </div>
              
              {/* Servicios Médicos Asignados */}
              <div className="space-y-4 mt-6">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  Servicios Médicos Asignados
                </h3>
                <div className="space-y-3">
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
                </div>
              </div>

              {/* Servicios Disponibles para Asignar */}
              <div className="space-y-4 mt-6">
                <h3 className="flex items-center gap-2 text-lg font-medium text-foreground">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  Asignar Nuevos Servicios
                </h3>
                <div className="space-y-3">
                  {allServicesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Cargando servicios disponibles...</span>
                    </div>
                  ) : allServicesError ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-destructive">Error al cargar servicios: {allServicesError}</p>
                    </div>
                  ) : availableServices.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No hay servicios disponibles para asignar</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {availableServices.map((service) => (
                        <div key={service.id} className="border rounded-lg p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{service.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {service.description || 'Sin descripción'}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {service.category}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {service.durationMinutes} min
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  {service.basePrice}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignService(service.id)}
                              disabled={isAssigningService}
                              className="ml-2"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Asignar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
          {staffMember.role === 'asistente' && (
            <div className="space-y-4 mt-6">
              <h3 className="flex items-center gap-2 text-lg font-medium text-foreground"><Building className="h-5 w-5 text-muted-foreground" />Información del Asistente</h3>
              <div className="space-y-3">
                <p className="text-base"><strong>Médico Asignado:</strong> {staffMember.assignedDoctor || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Acciones con AlertDialog (FUNCIONALIDAD MEJORADA) */}
          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-medium text-foreground">Acciones</h3>
            <div className="space-y-3">
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
