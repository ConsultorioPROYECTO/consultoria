'use client';

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User } from "firebase/auth";
import Image from 'next/image';

interface AccountSectionProps {
  user?: User | null;
  userRole?: string;
}

export function AccountSection({ user, userRole }: AccountSectionProps) {
  return (
    <div className="grid gap-6 py-4">
      {/* Account Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Cuenta</h3>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0">
              <Image 
                src={user?.photoURL || "/img/avatar_1.webp"} 
                alt="Foto de perfil" 
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-sm text-muted-foreground">Nombre y Rol</div>
              <div className="text-base font-medium">{user?.displayName || "Usuario"}</div>
              <div className="text-xs text-muted-foreground">
                {userRole === 'medico' ? 'Médico' : 
                 userRole === 'asistente' ? 'Asistente' : 
                 userRole === 'admin' ? 'Administrador' : 
                 'No asignado'}
              </div>
            </div>
          </div>
      </div>

      {/* Account Security Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Seguridad de la cuenta</h3>
        <div className="grid gap-4">
          {/* Email Section */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">Correo electrónico</div>
              <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
            </div>
            <Button variant="outline" size="sm" disabled className="justify-self-end">
              Cambiar correo electrónico
            </Button>
          </div>
          
          {/* Password Section */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">Contraseña</div>
              <div className="text-sm text-muted-foreground">
                {user?.providerData?.[0]?.providerId === 'google.com' 
                  ? 'Administrada por Google' 
                  : 'Si pierdes acceso a tu correo institucional, podrás iniciar sesión usando tu contraseña.'}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              disabled
              className="justify-self-end"
            >
              Cambiar contraseña
            </Button>
          </div>


        </div>
      </div>

      {userRole === 'medico' && (
        <div>
          <h3 className="text-lg font-medium mb-4">Información Profesional</h3>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="specialty">Especialidad</Label>
              <Input id="specialty" defaultValue="" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="license">Número de Colegiado</Label>
              <Input id="license" defaultValue="" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}