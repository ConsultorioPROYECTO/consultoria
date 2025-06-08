// src/app/dashboard/1/compo/StaffManagement.tsx
'use client';

import { Button } from "@rutas/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@rutas/components/ui/card";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@rutas/components/ui/table";
import { ScrollArea } from "@rutas/components/ui/scroll-area";
import { Badge } from "@rutas/components/ui/badge";
import { Users, UserPlus, Stethoscope, UserCheck, Edit, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@rutas/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@rutas/components/ui/command";
import { cn } from "@rutas/lib/utils";
import { useState } from "react";

interface StaffMember {
  id: string;
  name: string;
  role: 'Médico' | 'Asistente';
  specialty?: string;
  assignedDoctor?: string;
  status: 'active' | 'inactive';
  email?: string;
}

// Mock data - en una aplicación real, esto vendría de una API
const initialStaffMembers: StaffMember[] = [
  { 
    id: "doc1", 
    name: "Dr. Ana Pérez", 
    role: "Médico", 
    specialty: "Cardiología", 
    status: "active",
    email: "ana.perez@clinica.com"
  },
  { 
    id: "asist1", 
    name: "Carlos López", 
    role: "Asistente", 
    assignedDoctor: "Dr. Ana Pérez", 
    status: "active",
    email: "carlos.lopez@clinica.com"
  },
  { 
    id: "doc2", 
    name: "Dr. Juan Rodríguez", 
    role: "Médico", 
    specialty: "Pediatría", 
    status: "active",
    email: "juan.rodriguez@clinica.com"
  },
];

export function StaffManagement() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(initialStaffMembers);
  const [roleOpen, setRoleOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    role: '' as 'Médico' | 'Asistente' | '',
    specialty: '',
    email: ''
  });

  const handleAddStaff = () => {
    // Validar que el rol esté seleccionado
    if (!newStaff.role) return;
    
    // Validar que el email esté presente y tenga formato válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newStaff.email || !emailRegex.test(newStaff.email)) return;
    
    // Validar especialidad para médicos
    if (newStaff.role === 'Médico' && !newStaff.specialty.trim()) return;
    
    const newMember: StaffMember = {
      id: `staff_${Date.now()}`,
      name: 'Pendiente de asignación',
      role: newStaff.role as 'Médico' | 'Asistente',
      specialty: newStaff.role === 'Médico' ? newStaff.specialty : undefined,
      status: 'active',
      email: newStaff.email
    };
    
    setStaffMembers([...staffMembers, newMember]);
    setNewStaff({ role: '', specialty: '', email: '' });
  };

  const handleDeleteStaff = (id: string) => {
    setStaffMembers(staffMembers.filter(member => member.id !== id));
  };

  const getRoleIcon = (role: string) => {
    return role === 'Médico' ? <Stethoscope className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === 'Médico' ? 'default' : 'secondary';
  };

  const activeStaff = staffMembers.filter(member => member.status === 'active');
  const doctorsCount = activeStaff.filter(member => member.role === 'Médico').length;
  const assistantsCount = activeStaff.filter(member => member.role === 'Asistente').length;

  return (
    <Card>
      <CardContent className="space-y-6">
        {/* Formulario para agregar personal */}
        <div className="p-6 border rounded-lg bg-muted/50 space-y-4">
          <div className="flex items-center mb-4">
            <UserPlus className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-semibold">Agregar Nuevo Personal</h3>
          </div>
          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staffEmail">Email y Rol</Label>
                <div className="flex gap-2">
                  <Input 
                    id="staffEmail" 
                    type="email"
                    placeholder="email@clinica.com" 
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="flex-1"
                  />
                  <Popover open={roleOpen} onOpenChange={setRoleOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={roleOpen}
                        className="w-[140px] justify-between"
                      >
                        {newStaff.role || "Rol..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[140px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar rol..." />
                        <CommandList>
                          <CommandEmpty>No se encontró rol.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="Médico"
                              onSelect={() => {
                                setNewStaff({...newStaff, role: 'Médico'})
                                setRoleOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newStaff.role === 'Médico' ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Médico
                            </CommandItem>
                            <CommandItem
                              value="Asistente"
                              onSelect={() => {
                                setNewStaff({...newStaff, role: 'Asistente'})
                                setRoleOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newStaff.role === 'Asistente' ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Asistente
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
             
             <div className="space-y-2">
               <Label htmlFor="staffSpecialty">Especialidad</Label>
               <Input 
                 id="staffSpecialty" 
                 placeholder={newStaff.role === 'Asistente' ? "No aplica para asistentes" : "Ej: Cardiología"}
                 value={newStaff.role === 'Asistente' ? '' : newStaff.specialty}
                 onChange={(e) => setNewStaff({...newStaff, specialty: e.target.value})}
                 disabled={newStaff.role === 'Asistente'}
                 className={newStaff.role === 'Asistente' ? 'opacity-50 cursor-not-allowed' : ''}
               />
             </div>
             
             <div className="flex justify-end">
               <Button 
                 onClick={handleAddStaff} 
                 disabled={
                   !newStaff.role || 
                   !newStaff.email || 
                   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaff.email) ||
                   (newStaff.role === 'Médico' && !newStaff.specialty.trim())
                 }
                 className="px-8"
               >
                 <UserPlus className="h-4 w-4 mr-2" />
                 Agregar Personal
               </Button>
             </div>
           </div>
        </div>

        {/* Lista de personal actual */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Personal Actual
          </h3>
          <ScrollArea className="h-[400px] border rounded-lg">
            <Table>
              <TableHeader>
                 <TableRow>
                   <TableHead>Personal</TableHead>
                   <TableHead>Rol</TableHead>
                   <TableHead>Detalles</TableHead>
                   <TableHead>Email</TableHead>
                   <TableHead className="text-right">Acciones</TableHead>
                 </TableRow>
               </TableHeader>
              <TableBody>
                {activeStaff.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          {getRoleIcon(member.role)}
                        </div>
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
                        {member.role === "Médico" && member.specialty && (
                          <p className="text-sm font-medium">{member.specialty}</p>
                        )}
                        {member.role === "Asistente" && member.assignedDoctor && (
                          <p className="text-sm text-muted-foreground">
                            Asignado a: {member.assignedDoctor}
                          </p>
                        )}
                        {!member.specialty && !member.assignedDoctor && (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                       {member.email && (
                         <p className="text-sm">{member.email}</p>
                       )}
                     </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteStaff(member.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Total de personal activo: {activeStaff.length}
        </p>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span className="flex items-center">
            <Stethoscope className="h-4 w-4 mr-1" />
            {doctorsCount} Médicos
          </span>
          <span className="flex items-center">
            <UserCheck className="h-4 w-4 mr-1" />
            {assistantsCount} Asistentes
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}