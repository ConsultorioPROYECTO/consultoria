'use client';

import { Button } from "@rutas/components/ui/button";
import { Input } from "@rutas/components/ui/input";
import { Label } from "@rutas/components/ui/label";
import { UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@rutas/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@rutas/components/ui/command";
import { cn } from "@rutas/lib/utils";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";

interface StaffMember {
  id: string;
  name: string;
  role: 'Médico' | 'Asistente';
  specialty?: string;
  assignedDoctor?: string;
  status: 'active' | 'inactive';
  email?: string;
}

interface AddStaffFormProps {
  onAddStaff: (newMember: StaffMember) => void;
}

export function AddStaffForm({ onAddStaff }: AddStaffFormProps) {
  const { user } = useAuth();
  const [roleOpen, setRoleOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    role: '' as 'Médico' | 'Asistente' | '',
    specialty: '',
    email: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    // Expresión regular simple para validar formato de correo electrónico
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleAddStaff = async () => {
    if (!validateEmail(newStaff.email)) {
      setError('Por favor, introduce un correo electrónico válido.');
      return;
    }
    
    if (!newStaff.role) {
      setError('Por favor, selecciona un rol.');
      return;
    }
    
    if (newStaff.role === 'Médico' && !newStaff.specialty.trim()) {
      setError('Por favor, introduce una especialidad para el médico.');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      if (!user) {
        setError('Usuario no autenticado.');
        return;
      }
      
      const idToken = await user.getIdToken();
      const response = await fetch('/api/organization/request-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          email: newStaff.email, 
          role: newStaff.role.toLowerCase() === 'médico' ? 'medico' : 'asistente'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar la invitación.');
        return;
      }
      
      // Crear el miembro para la UI local
      const newMember: StaffMember = {
        id: `staff_${Date.now()}`,
        name: 'Pendiente de asignación',
        role: newStaff.role as 'Médico' | 'Asistente',
        specialty: newStaff.role === 'Médico' ? newStaff.specialty : undefined,
        status: 'active',
        email: newStaff.email
      };
      
      onAddStaff(newMember);
      setNewStaff({ role: '', specialty: '', email: '' });
      
    } catch (err) {
      console.error('Error sending invite:', err);
      setError('Error de red o del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
              onChange={(e) => {
                setNewStaff({...newStaff, email: e.target.value});
                if (error) {
                  setError(null); // Limpiar el error cuando el usuario empieza a escribir
                }
              }}
              className={`flex-1 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
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
          {error && <p className="text-red-500 text-xs italic mt-1">{error}</p>}
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
             isLoading ||
             !newStaff.role || 
             !newStaff.email || 
             !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaff.email) ||
             (newStaff.role === 'Médico' && !newStaff.specialty.trim())
           }
           className="px-8"
         >
           <UserPlus className="h-4 w-4 mr-2" />
           {isLoading ? 'Enviando Invitación...' : 'Enviar Invitación'}
         </Button>
       </div>
     </div>
    </div>
  );
}