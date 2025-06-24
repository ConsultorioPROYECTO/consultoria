'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rutas/components/ui/dialog";
import { Badge } from "@rutas/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Button } from "@rutas/components/ui/button";
import { User, Mail, Shield, Stethoscope, Building, Clock, Edit, Trash2, PencilLine } from "lucide-react";
// import defaultImage from './default.jpeg'; // La imagen ahora está en /public
// import Image from 'next/image';

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
  onConfigureSchedule?: (member: StaffMember) => void;
  onEditStaff?: (member: StaffMember) => void;
  onDeleteStaff?: (id: number) => void;
}

export function StaffDetailModal({ 
  isOpen, 
  onClose, 
  staffMember, 
  onConfigureSchedule, 
  onEditStaff, 
  onDeleteStaff 
}: StaffDetailModalProps) {
  if (!staffMember) return null;

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

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'medico':
        return 'Médico';
      case 'asistente':
        return 'Asistente';
      default:
        return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sm:max-w-2xl sm:max-h-[90vh] max-sm:max-w-none max-sm:max-h-none max-sm:h-screen max-sm:w-screen max-sm:rounded-none max-sm:border-0 max-sm:m-0 max-sm:p-0">
        {/* Header con imagen de perfil para móviles */}
        <div className="max-sm:h-[300px] max-sm:relative max-sm:flex max-sm:items-end max-sm:justify-center max-sm:pb-6 sm:hidden bg-[url('/img/default.jpeg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-t from-background/100 to-transparent"></div>
          <div className="relative z-10 text-center text-white">
            <div className="w-[80px] h-[80px] mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
              <User className="w-[40px] h-[40px] text-white" />
            </div>
            <h2 className="text-xl font-bold">{staffMember.name}</h2>
            <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/30">
              {getRoleDisplayName(staffMember.role)}
            </Badge>
          </div>
        </div>

        {/* Header tradicional para desktop */}
        <DialogHeader className="max-sm:hidden">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-primary" />
            Información del Personal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 max-sm:p-4">
          {/* Información básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-4 text-lg">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              {/* Mostrar nombre*/}
              <div className="flex items-center gap-4">
                <PencilLine className="h-4 w-4 text-muted-foreground"/>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                  <p className="text-base">{staffMember.name}</p>
                </div>
                {staffMember.role === 'medico' && staffMember.specialty && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Especialidad</label>
                    <p className="text-lg">{staffMember.specialty}</p>
                  </div>
                )}
                {staffMember.role === 'asistente' && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Servicio</label>
                    <p className="text-lg">Administración y Soporte</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Mail className="h-4 w-4 text-muted-foreground"/>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Correo Electrónico</label>
                  <p className="text-base">{staffMember.email}</p>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Información del rol */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Rol en la Organización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mostrar rol  */}
              <div className="flex items-center gap-3">
                <Badge variant={getRoleBadgeVariant(staffMember.role)} className="text-sm px-3 py-1">
                  {getRoleDisplayName(staffMember.role)}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  Estado: <span className="font-medium text-green-600">Activo</span>
                </span>
              </div>
              
            </CardContent>
          </Card>

          {/* Información específica del médico */}
          {staffMember.role === 'medico' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="h-5 w-5" />
                  Información Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Especialidad</label>
                    <p className="text-base">{staffMember.specialty || 'Medicina General'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Servicio</label>
                    <p className="text-base">Consulta Externa</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700">Pacientes Asignados</span>
                      <span className="text-2xl font-bold text-blue-600">{staffMember.patients || 0}</span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700">Citas Programadas</span>
                      <span className="text-2xl font-bold text-green-600">{staffMember.appointments || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información del asistente */}
          {staffMember.role === 'asistente' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5" />
                  Información del Asistente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Servicio Asignado</label>
                  <p className="text-base">Administración y Soporte</p>
                </div>
                {staffMember.assignedDoctor && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Médico Asignado</label>
                    <p className="text-base">{staffMember.assignedDoctor}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Acciones */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {staffMember.role === 'medico' && onConfigureSchedule && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onConfigureSchedule(staffMember);
                      onClose();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Configurar Horarios
                  </Button>
                )}
                {onEditStaff && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onEditStaff(staffMember);
                      onClose();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar Información
                  </Button>
                )}
                {onDeleteStaff && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      if (window.confirm(`¿Está seguro de que desea eliminar a ${staffMember.name}?`)) {
                        onDeleteStaff(staffMember.id);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar Personal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}