'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, ChevronsUpDown, Check, Mail, UserCog } from 'lucide-react';
import { toast } from 'sonner';
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
import { useAuth } from '../../../../context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface StaffMember {
  email: string;
  role: 'Médico' | 'Asistente';
}

interface AddStaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStaff: (newMember: StaffMember) => void;
}

export function AddStaffForm({ isOpen, onClose, onAddStaff }: AddStaffFormProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const showSuccessToast = (message: string) => toast.success(message);
  const showErrorToast = (message: string) => toast.error(message);
  const [roleOpen, setRoleOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    role: '' as 'Médico' | 'Asistente' | '',
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
          role: newStaff.role.toLowerCase() === 'médico' ? 'medico' : 'asistente'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showErrorToast(data.error || 'Error al enviar la invitación.');
        return;
      }
      
      const newMember: StaffMember = {
        email: newStaff.email,
        role: newStaff.role as 'Médico' | 'Asistente'
      };
      
      onAddStaff(newMember);
      setNewStaff({ role: '', email: '' });
      showSuccessToast("Invitación enviada correctamente.");
      onClose();
      
    } catch (err) {
      console.error('Error sending invite:', err);
      showErrorToast('Error de red o del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewStaff(prev => ({ ...prev, email: e.target.value }));
  }, []);

  const handleRoleSelect = useCallback((role: 'Médico' | 'Asistente') => {
    setNewStaff(prev => ({ ...prev, role }));
    setRoleOpen(false);
  }, []);

  const formContent = (
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="staffEmail">
            <Mail className="w-4 h-4" />
            Email
          </Label>
          <Input 
            id="staffEmail" 
            type="email"
            placeholder="email@clinica.com" 
            value={newStaff.email}
            onChange={handleEmailChange}
            className="w-full"
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="staffRole">
            <UserCog className="w-4 h-4" />
            Rol
          </Label>
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
                      onSelect={() => handleRoleSelect('Médico')}
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
                      onSelect={() => handleRoleSelect('Asistente')}
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
       
       <div className="grid">
         <div className="justify-self-end">
           <Button 
             onClick={handleAddStaff} 
             disabled={
               isLoading ||
               !newStaff.role || 
               !newStaff.email || 
               !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaff.email)
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

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Agregar Nuevo Personal</DrawerTitle>
            <DrawerDescription>
              Invita a nuevos personal a tu organización.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Personal</DialogTitle>
          <DialogDescription>
            Invita a nuevos personal a tu organización.
          </DialogDescription>

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
          
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}