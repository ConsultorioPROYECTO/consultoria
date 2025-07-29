'use client';

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input";
import { User, updateProfile } from "firebase/auth";
import Image from 'next/image';
import { useState } from "react";
import { toast } from "sonner";

interface AccountSectionProps {
  user?: User | null;
  userRole?: string;
}

export function AccountSection({ user, userRole }: AccountSectionProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Verificar si el usuario usa Google como proveedor
  const isGoogleUser = user?.providerData?.[0]?.providerId === 'google.com';

  const handleUpdateDisplayName = async () => {
    if (!user || !displayName.trim()) {
      toast.error("Por favor, ingresa un nombre válido");
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile(user, {
        displayName: displayName.trim()
      });
      
      // Forzar actualización del usuario
      await user.reload();
      
      toast.success("Nombre actualizado correctamente");
      setIsEditingName(false);
    } catch (error) {
      console.error("Error al actualizar el nombre:", error);
      toast.error("Error al actualizar el nombre. Inténtalo de nuevo.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.displayName || "");
    setIsEditingName(false);
  };

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
            <div className="flex flex-col justify-center flex-1">
              <div className="text-sm text-muted-foreground">Nombre y Rol</div>
              {isEditingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="text-base font-medium h-8"
                    placeholder="Ingresa tu nombre"
                    disabled={isUpdating}
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateDisplayName}
                    disabled={isUpdating || !displayName.trim()}
                  >
                    {isUpdating ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="text-base font-medium">{user?.displayName || "Usuario"}</div>
                  {!isGoogleUser && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                      className="h-6 px-2 text-xs"
                    >
                      Editar
                    </Button>
                  )}
                </div>
              )}
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
    </div>
  );
}