'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Shield, Stethoscope, Building, Clock, Edit, Trash2, PencilLine, Loader2 } from "lucide-react";
import { showSuccessToast, showErrorToast } from './toaster';
import { useAuth } from '@/app/context/AuthContext';

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
      onUpdate(); // Refrescar la lista de personal en la vista principal
    } catch (error: any) {
      showErrorToast(error.message);
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!user || !staffMember) return;
    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/users/unlik-organization/${staffMember.id}`,
      {
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
    } catch (error: any) {
      showErrorToast(error.message);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            Información del Personal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><strong>Nombre:</strong> {staffMember.name}</p>
              <p><strong>Email:</strong> {staffMember.email}</p>
              {staffMember.specialty && <p><strong>Especialidad:</strong> {staffMember.specialty}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">Rol en la Organización</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Select value={currentRole} onValueChange={handleChangeRole} disabled={isChangingRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                </SelectContent>
              </Select>
              {isChangingRole && <Loader2 className="h-5 w-5 animate-spin" />}
            </CardContent>
          </Card>

        </div>

        <DialogFooter className="sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Eliminar de la Organización
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción es permanente y no se puede deshacer. El usuario será desvinculado de la organización.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteStaff}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}