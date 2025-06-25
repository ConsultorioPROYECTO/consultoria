'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Stethoscope, Building, PencilLine, Trash2, Loader2 } from "lucide-react";
import { showSuccessToast, showErrorToast } from './toaster';
import { useAuth } from '@/app/context/AuthContext';
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
  const { user } = useAuth();
  const [currentRole, setCurrentRole] = useState(staffMember?.role);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (staffMember) {
      setCurrentRole(staffMember.role);
    }
  }, [staffMember]);

  if (!staffMember) return null;

  const handleChangeRole = async (newRole: 'admin' | 'medico' | 'asistente') => {
    if (!user || !staffMember) return;
    setIsChangingRole(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/users/rol/change-rol/${staffMember.id}/${newRole}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar el rol.');
      }

      showSuccessToast('Rol actualizado correctamente.');
      setCurrentRole(newRole);
      onUpdate();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Ocurrió un error desconocido.");
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!user || !staffMember) return;
    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/users/unlik-organization/${staffMember.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el miembro.');
      }

      showSuccessToast('Miembro eliminado de la organización.');
      onUpdate();
      onClose();
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Ocurrió un error desconocido.");
    } finally {
      setIsDeleting(false);
    }
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
      <DialogContent className="max-w-2xl max-h-[100vh] overflow-y-auto sm:max-w-2xl sm:max-h-[90vh] max-sm:max-w-none max-sm:max-h-none max-sm:h-screen max-sm:w-screen max-sm:rounded-none max-sm:border-0 max-sm:m-0 max-sm:p-0">
        {/* Header con imagen de perfil para móviles */}
        <div className="max-sm:h-[300px] max-sm:relative sm:hidden">
          {/* Usamos una etiqueta <img> para mayor fiabilidad */}
          <Image 
            src="/img/default.jpeg" 
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
        <DialogHeader className="max-sm:hidden">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            Información del Personal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 max-sm:p-4">
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
                <Select value={currentRole} onValueChange={(newRole: 'admin' | 'medico' | 'asistente') => handleChangeRole(newRole)} disabled={isChangingRole}>
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
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Stethoscope className="h-5 w-5" />Información Médica</CardTitle></CardHeader>
              <CardContent>
                <p><strong>Especialidad:</strong> {staffMember.specialty || 'N/A'}</p>
              </CardContent>
            </Card>
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
                            <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive hover:bg-destructive/90">Confirmar Eliminación</AlertDialogAction>
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
