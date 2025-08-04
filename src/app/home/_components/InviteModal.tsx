'use client';

import * as React from "react"
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@rutas/components/ui/label";
import { Input } from "@rutas/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "../../context/AuthContext"



interface InviteModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteModal({ isOpen, onOpenChange }: InviteModalProps) {
  const {user} = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'medico' | 'asistente'>('medico');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    // Expresión regular simple para validar formato de correo electrónico
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSendInvite = async () => {
    if (!validateEmail(email)) {
      setError('Por favor, introduce un correo electrónico válido.');
      return;
    }
    setError(null);
    try {
      if (!user) {
        setError('Usuario no autenticado.');
        return;
      }
      const idToken = await user.getIdToken()
      const response = await fetch('/api/organization/request-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al enviar la invitación.');
        return;
      }
      setEmail('');
      
    } catch (err) {
      console.error('Error sending invite:', err);
      setError('Error de red o del servidor.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>Enviar Invitación</DialogTitle>
        <DialogDescription>
          Introduce el correo electrónico de la persona que quieres invitar a tu organización.
        </DialogDescription>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) {
                  setError(null); // Limpiar el error cuando el usuario empieza a escribir
                }
              }}
              className={`col-span-3 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
          </div>
          {error && <p className="text-red-500 text-xs italic mt-1">{error}</p>}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Rol
            </Label>
            <Select onValueChange={(value: 'medico' | 'asistente') => setRole(value)} defaultValue={role}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={handleSendInvite}>
            Enviar Invitación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}