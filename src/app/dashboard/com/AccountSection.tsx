'use client';

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@rutas/components/ui/label";
import { Input } from "@rutas/components/ui/input";
import { User } from "firebase/auth";

interface AccountSectionProps {
  user?: User | null;
  userRole?: string;
}

export function AccountSection({ user, userRole }: AccountSectionProps) {
  return (
    <div className="grid gap-6 py-4">
      {/* Account Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Account</h3>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden flex-shrink-0">
              <img 
                src={user?.photoURL || "/avatars/shadcn.jpg"} 
                alt="Foto de perfil" 
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
              disabled={user?.providerData?.[0]?.providerId === 'google.com'}
              className="justify-self-end"
            >
              Cambiar contraseña
            </Button>
          </div>

          {/* Two-Factor Authentication and Passkeys - Only for non-Google accounts */}
          {user?.providerData?.[0]?.providerId !== 'google.com' && (
            <>
              {/* 2FA Section */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start ">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Verificación en dos pasos</div>
                  <div className="text-sm text-muted-foreground">
                    Agrega una capa adicional de seguridad a tu cuenta durante el inicio de sesión.
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="justify-self-end"
                  onClick={() => {
                    alert('Configuración de verificación en 2 pasos - Próximamente disponible');
                  }}
                >
                  Agregar método de verificación
                </Button>
              </div>

              {/* Passkeys Section */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Passkeys</div>
                  <div className="text-sm text-muted-foreground">
                    Inicia sesión de forma segura con autenticación biométrica del dispositivo.
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="justify-self-end"
                  onClick={() => {
                    try {
                      if (typeof navigator !== 'undefined' && 
                          navigator.credentials && 
                          typeof navigator.credentials.create === 'function') {
                        alert('Configuración de Passkeys - Próximamente disponible');
                      } else {
                        alert('Tu navegador no soporta Passkeys');
                      }
                    } catch (error) {
                      console.error('Error al verificar soporte de Passkeys:', error);
                      alert('No se pudo verificar la compatibilidad con Passkeys');
                    }
                  }}
                >
                  Agregar Passkey
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Devices Section */}
      <div>
        <h3 className="text-lg font-medium mb-4">Dispositivos</h3>
        <div className="grid gap-4">
          {/* Current Device */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">Dispositivo actual</div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Windows - Chrome
                </div>
                <div className="text-xs text-muted-foreground mt-1">Última actividad: Ahora</div>
              </div>
            </div>
            <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full justify-self-end">
              Activo ahora
            </div>
          </div>

          {/* Other Device Example */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">iPhone 13</div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  iOS - Safari
                </div>
                <div className="text-xs text-muted-foreground mt-1">Última actividad: Hace 2 días</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="justify-self-end text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => {
                alert('Dispositivo desconectado - Esta función estará disponible próximamente');
              }}
            >
              Desconectar
            </Button>
          </div>

          {/* Another Device Example */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-1">
              <div className="text-sm font-medium">MacBook Pro</div>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  macOS - Firefox
                </div>
                <div className="text-xs text-muted-foreground mt-1">Última actividad: Hace 1 semana</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="justify-self-end text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => {
                alert('Dispositivo desconectado - Esta función estará disponible próximamente');
              }}
            >
              Desconectar
            </Button>
          </div>
        </div>
      </div>

      {userRole === 'medico' && (
        <div>
          <h3 className="text-lg font-medium mb-4">Professional Information</h3>
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