'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, X, UserPlus, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tipos de datos
interface User {
  id: number;
  displayName: string;
  email: string;
  role: string;
  idDoctor?: number;
}

interface Doctor {
  idDoctor: number;
  speciality: string;
  user: {
    id: number;
    displayName: string;
    email: string;
  };
}

interface DoctorAssignment {
  doctor: {
    idDoctor: number;
    speciality?: string;
    user: {
      id: number;
      displayName: string;
      email: string;
    };
  };
}

interface AssignDoctorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  assistantId: number | null | undefined;
  assistantName: string;
  onAssignmentComplete: () => void;
}

export function AssignDoctorModal({
  isOpen,
  onOpenChange,
  assistantId,
  assistantName,
  onAssignmentComplete
}: AssignDoctorModalProps) {
  const [availableDoctors, setAvailableDoctors] = useState<Doctor[]>([]);
  const [assignedDoctors, setAssignedDoctors] = useState<Doctor[]>([]);
  const [selectedDoctors, setSelectedDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const loadDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const users: User[] = await response.json();
        // Filtrar solo usuarios con rol médico que tengan idDoctor
        const doctors = users
          .filter(user => user.role === 'medico' && user.idDoctor)
          .map(user => ({
            idDoctor: user.idDoctor!,
            speciality: 'Medicina General', // Por defecto, se puede mejorar con datos reales
            user: {
              id: user.id,
              displayName: user.displayName || 'Sin nombre',
              email: user.email
            }
          }));
        
        setAvailableDoctors(doctors);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAssignedDoctors = useCallback(async () => {
    try {
      const response = await fetch(`/api/master/doctor-assign-to-asistant?assistantId=${assistantId}`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Verificar si la respuesta tiene la estructura esperada
        if (responseData && responseData.data && Array.isArray(responseData.data)) {
          const assignments: DoctorAssignment[] = responseData.data;
          
          // Verificar si hay asignaciones
          if (assignments.length > 0) {
            // Transformar los datos de asignación a formato Doctor
            const assignedDoctorsData = assignments.map((assignment: DoctorAssignment) => ({
              idDoctor: assignment.doctor.idDoctor,
              speciality: assignment.doctor.speciality || 'Medicina General',
              user: {
                id: assignment.doctor.user.id,
                displayName: assignment.doctor.user.displayName || 'Sin nombre',
                email: assignment.doctor.user.email
              }
            }));
            setAssignedDoctors(assignedDoctorsData);
          } else {
            // No hay asignaciones, establecer array vacío
            setAssignedDoctors([]);
          }
        } else {
          console.warn('Estructura de respuesta inesperada:', responseData);
          setAssignedDoctors([]);
        }
      } else {
        console.error('Error en la respuesta:', response.status, response.statusText);
        setAssignedDoctors([]);
      }
    } catch (error) {
      console.error('Error loading assigned doctors:', error);
      setAssignedDoctors([]);
    }
  }, [assistantId]);

  // Cargar doctores disponibles y asignados
  useEffect(() => {
    if (isOpen && assistantId) {
      loadDoctors();
      loadAssignedDoctors();
    }
  }, [isOpen, assistantId, loadDoctors, loadAssignedDoctors]);

  const getAuthToken = async () => {
    const { getFirebaseAuthToken } = await import('@/app/lib/firebase/clientUtils');
    return await getFirebaseAuthToken();
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    const isAlreadySelected = selectedDoctors.some(d => d.idDoctor === doctor.idDoctor);
    const isAlreadyAssigned = assignedDoctors.some(d => d.idDoctor === doctor.idDoctor);
    
    if (isAlreadyAssigned) {
      return; // No permitir seleccionar doctores ya asignados
    }
    
    if (isAlreadySelected) {
      setSelectedDoctors(selectedDoctors.filter(d => d.idDoctor !== doctor.idDoctor));
    } else {
      setSelectedDoctors([...selectedDoctors, doctor]);
    }
  };

  const handleRemoveDoctor = (doctorId: number) => {
    setSelectedDoctors(selectedDoctors.filter(d => d.idDoctor !== doctorId));
  };

  const handleSave = async () => {
    if (selectedDoctors.length === 0 || !assistantId) return;
    
    setIsSaving(true);
    try {
      // Crear asignaciones para cada doctor seleccionado
      const assignments = selectedDoctors.map(doctor => ({
        doctorId: doctor.idDoctor,
        assistantId: assistantId
      }));

      for (const assignment of assignments) {
        const response = await fetch('/api/master/doctor-assign-to-asistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAuthToken()}`
          },
          body: JSON.stringify(assignment)
        });

        if (!response.ok) {
          throw new Error(`Error assigning doctor ${assignment.doctorId}`);
        }
      }

      // Limpiar selección y cerrar modal
      setSelectedDoctors([]);
      onAssignmentComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDoctors = availableDoctors.filter(doctor => {
    const isAlreadyAssigned = assignedDoctors.some(d => d.idDoctor === doctor.idDoctor);
    const matchesSearch = doctor.user.displayName.toLowerCase().includes(searchValue.toLowerCase()) ||
                         doctor.user.email.toLowerCase().includes(searchValue.toLowerCase()) ||
                         doctor.speciality.toLowerCase().includes(searchValue.toLowerCase());
    return !isAlreadyAssigned && matchesSearch;
  });

  // Si no hay assistantId, mostrar mensaje de error
  if (!assistantId) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Error
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              No se pudo encontrar el ID del asistente. Asegúrate de que el usuario tenga el rol de asistente correctamente configurado.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Asignar Doctores a {assistantName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Doctores ya asignados */}
          <div>
            <h4 className="text-sm font-medium mb-2">Doctores ya asignados:</h4>
            {assignedDoctors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedDoctors.map((doctor) => (
                  <Badge key={doctor.idDoctor} variant="secondary" className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {doctor.user.displayName}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
                No hay doctores asignados actualmente a este asistente.
              </div>
            )}
          </div>

          {/* Selector de doctores */}
          <div>
            <h4 className="text-sm font-medium mb-2">Seleccionar nuevos doctores:</h4>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {selectedDoctors.length > 0
                    ? `${selectedDoctors.length} doctor(es) seleccionado(s)`
                    : "Seleccionar doctores..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Buscar doctores..." 
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {isLoading ? "Cargando doctores..." : "No se encontraron doctores."}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredDoctors.map((doctor) => {
                        const isSelected = selectedDoctors.some(d => d.idDoctor === doctor.idDoctor);
                        return (
                          <CommandItem
                            key={doctor.idDoctor}
                            value={`${doctor.user.displayName} ${doctor.user.email} ${doctor.speciality}`}
                            onSelect={() => handleDoctorSelect(doctor)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{doctor.user.displayName}</span>
                              <span className="text-sm text-muted-foreground">
                                {doctor.user.email} • {doctor.speciality}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Doctores seleccionados */}
          {selectedDoctors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Doctores a asignar:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDoctors.map((doctor) => (
                  <Badge key={doctor.idDoctor} variant="default" className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {doctor.user.displayName}
                    <button
                      onClick={() => handleRemoveDoctor(doctor.idDoctor)}
                      className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={selectedDoctors.length === 0 || isSaving}
          >
            {isSaving ? "Asignando..." : `Asignar ${selectedDoctors.length} doctor(es)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}