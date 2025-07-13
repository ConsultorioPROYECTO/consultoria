'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMedicalServices } from '@/hooks/useMedicalServices';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useAuth } from '../../../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface StaffMember {
  email: string;
  role: 'Médico' | 'Asistente';
  serviceId?: number;
  serviceName?: string;
}

interface AddStaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStaff: (newMember: StaffMember) => void;
}

export function AddStaffForm({ isOpen, onClose, onAddStaff }: AddStaffFormProps) {
  const { user } = useAuth();
  const { services } = useMedicalServices();
  const isMobile = useIsMobile();
  
  const showSuccessToast = (message: string) => toast.success(message);
  const showErrorToast = (message: string) => toast.error(message);
  const [roleOpen, setRoleOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    role: '' as 'Médico' | 'Asistente' | '',
    serviceId: undefined as number | undefined,
    serviceName: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleAddStaff = async () => {
    if (!validateEmail(newStaff.email)) {
      showErrorToast('Por favor, introduce un correo electrónico válido.');
      return;
    }
    
    if (!newStaff.role) {
      showErrorToast('Por favor, selecciona un rol.');
      return;
    }
    
    if (newStaff.role === 'Médico' && !newStaff.serviceId) {
      showErrorToast('Por favor, selecciona un servicio médico para el médico.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!user) {
        showErrorToast('Usuario no autenticado.');
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
          role: newStaff.role.toLowerCase() === 'médico' ? 'medico' : 'asistente',
          serviceId: newStaff.role === 'Médico' ? newStaff.serviceId : undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showErrorToast(data.error || 'Error al enviar la invitación.');
        return;
      }
      
      const newMember: StaffMember = {
        email: newStaff.email,
        role: newStaff.role as 'Médico' | 'Asistente',
        serviceId: newStaff.role === 'Médico' ? newStaff.serviceId : undefined,
        serviceName: newStaff.role === 'Médico' ? newStaff.serviceName : undefined
      };
      
      onAddStaff(newMember);
      setNewStaff({ role: '', serviceId: undefined, serviceName: '', email: '' });
      showSuccessToast("Invitación enviada correctamente.");
      onClose();
      
    } catch (err) {
      console.error('Error sending invite:', err);
      showErrorToast('Error de red o del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const FormContent = () => (
    <div className="space-y-4">

        
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="staffEmail">Email</Label>
          <Input 
            id="staffEmail" 
            type="email"
            placeholder="email@clinica.com" 
            value={newStaff.email}
            onChange={(e) => {
              setNewStaff({...newStaff, email: e.target.value});
            }}
            className="w-full"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="staffRole">Rol</Label>
          <Popover open={roleOpen} onOpenChange={setRoleOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={roleOpen}
                className="w-full justify-between"
              >
                {newStaff.role || "Seleccionar rol..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
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
       
       {newStaff.role === 'Médico' && (
         <div className="grid gap-4">
           <div className="grid gap-2">
             <Label htmlFor="staffService">Servicio Médico</Label>
             <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   role="combobox"
                   aria-expanded={serviceOpen}
                   className="w-full justify-between"
                 >
                   {newStaff.serviceName || "Seleccionar servicio..."}
                   <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-full p-0">
                 <Command>
                   <CommandInput placeholder="Buscar servicio..." />
                   <CommandList>
                     <CommandEmpty>No se encontró servicio.</CommandEmpty>
                     <CommandGroup>
                       {services.map((service: { id: number; name: string }) => (
                         <CommandItem
                           key={service.id}
                           value={service.name}
                           onSelect={() => {
                             setNewStaff({
                               ...newStaff, 
                               serviceId: service.id,
                               serviceName: service.name
                             });
                             setServiceOpen(false);
                           }}
                         >
                           <Check
                             className={cn(
                               "mr-2 h-4 w-4",
                               newStaff.serviceId === service.id ? "opacity-100" : "opacity-0"
                             )}
                           />
                           {service.name}
                         </CommandItem>
                       ))}
                     </CommandGroup>
                   </CommandList>
                 </Command>
               </PopoverContent>
             </Popover>
           </div>
           
           <div className="grid gap-2">
             <Label htmlFor="staffAssistant">Asignar Asistente</Label>
             <Popover open={assistantOpen} onOpenChange={setAssistantOpen}>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   role="combobox"
                   aria-expanded={assistantOpen}
                   className="w-full justify-between"
                 >
                   {"Seleccionar asistente..."}
                   <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-full p-0">
                 <Command>
                   <CommandInput placeholder="Buscar asistente..." />
                   <CommandList>
                     <CommandEmpty>No se encontró asistente.</CommandEmpty>
                     <CommandGroup>
                       {/* Aquí irán las asistentes disponibles cuando se implemente la lógica */}
                       <CommandItem
                         value="placeholder"
                         onSelect={() => {
                           // Lógica temporal para cerrar el popover
                           setAssistantOpen(false);
                         }}
                       >
                         <Check
                           className={cn(
                             "mr-2 h-4 w-4",
                             "opacity-0"
                           )}
                         />
                         Asistentes disponibles...
                       </CommandItem>
                     </CommandGroup>
                   </CommandList>
                 </Command>
               </PopoverContent>
             </Popover>
           </div>
         </div>
       )}
       
       {newStaff.role === 'Asistente' && (
         <div className="grid gap-2">
           <Label htmlFor="staffDoctor">Asignar Doctor(es)</Label>
           <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
             <PopoverTrigger asChild>
               <Button
                 variant="outline"
                 role="combobox"
                 aria-expanded={serviceOpen}
                 className="w-full justify-between"
               >
                 {"Seleccionar doctor(es)..."}
                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
               </Button>
             </PopoverTrigger>
             <PopoverContent className="w-full p-0">
               <Command>
                 <CommandInput placeholder="Buscar doctor..." />
                 <CommandList>
                   <CommandEmpty>No se encontró doctor.</CommandEmpty>
                   <CommandGroup>
                     {/* Aquí irán los doctores disponibles cuando se implemente la lógica */}
                     <CommandItem
                       value="placeholder"
                       onSelect={() => {
                         // Lógica temporal para cerrar el popover
                         setServiceOpen(false);
                       }}
                     >
                       <Check
                         className={cn(
                           "mr-2 h-4 w-4",
                           "opacity-0"
                         )}
                       />
                       Doctores disponibles...
                     </CommandItem>
                   </CommandGroup>
                 </CommandList>
               </Command>
             </PopoverContent>
           </Popover>
         </div>
       )}
       
       <div className="grid">
         <div className="justify-self-end">
           <Button 
             onClick={handleAddStaff} 
             disabled={
               isLoading ||
               !newStaff.role || 
               !newStaff.email || 
               !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaff.email) ||
               (newStaff.role === 'Médico' && !newStaff.serviceId)
               // Nota: Para 'Asistente' no validamos doctores por ahora (solo visual)
             }
             className="px-8"
           >
             <UserPlus className="h-4 w-4 mr-2" />
             {isLoading ? 'Enviando Invitación...' : 'Enviar Invitación'}
           </Button>
         </div>
       </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Agregar Nuevo Personal</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <UserPlus className="h-5 w-5 mr-2 text-primary" />
                <h3 className="text-lg font-semibold">Agregar Nuevo Personal</h3>
              </div>
              {/*{!isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="bg-primary h-6 w-6 p-3"
                >
                  <X className="h-4 w-4 text-secondary" />
                </Button>
              )}*/}
            </div>
          </DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}