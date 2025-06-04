'use client';

import * as React from "react"
import { useState, useEffect } from 'react';
import {
  Settings2,
  Building2,
  User,
  Blocks,
} from "lucide-react"

// Importaciones de componentes UI
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

import { Label } from "@rutas/components/ui/label";
import { Input } from "@rutas/components/ui/input";
import { useTheme } from "next-themes";
import { useUIStyle } from "@/app/context/UIStyleContext";
import { useAuth } from "@/app/context/AuthContext";
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils";
import { cn } from "@/lib/utils";

const navAccount = [
  { name: "Mi Cuenta", icon: User },
  { name: "Preferencias", icon: Settings2 },
];

const navWorkspace = [
  { name: "Configuración de la organización", icon: Building2 },
  { name: "Integraciones", icon: Blocks },
];

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { uiStyle, setUiStyle } = useUIStyle(); // Usar el contexto global
  const { user } = useAuth(); // Obtener el usuario actual
  const [selectedTheme, setSelectedTheme] = useState<string>(theme?.replace('-dark', '') || "system");
  const [activeSection, setActiveSection] = useState("Mi Cuenta"); // New state for active section
  const [userRole, setUserRole] = useState<string>(""); // Estado para almacenar el rol del usuario

  useEffect(() => {
    if (theme) {
      setSelectedTheme(theme?.replace('-dark', '') || 'system');
    }
  }, [theme]);

  // Efecto para obtener el rol del usuario
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = await getFirebaseAuthToken();
        if (!token) {
          console.error('No se pudo obtener el token de autenticación.');
          return;
        }

        const response = await fetch('/api/users/rol', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setUserRole(data.role);
      } catch (error) {
        console.error('Error al obtener el rol del usuario:', error);
      }
    };

    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    // Apply the theme immediately while preserving the current mode (light/dark)
    const newTheme = theme?.endsWith('-dark') ? `${value}-dark` : value;
    setTheme(newTheme);
  };

  const handleUiStyleChange = (style: 'normal' | 'minimal') => {
    setUiStyle(style); // Ahora usa el contexto global que maneja localStorage automáticamente
  };

  const handleSaveClick = () => {
    // Apply the selected theme and current mode
    const newTheme = theme?.endsWith('-dark') ? `${selectedTheme}-dark` : selectedTheme;
    setTheme(newTheme);
    // onOpenChange(false); // Prevent modal from closing
  };

  const handleSectionChange = (sectionName: string) => {
    setActiveSection(sectionName);
  };

  const isApplyButtonDisabled = selectedTheme === (theme?.replace('-dark', '') || 'system'); // Removido uiStyle ya que se aplica inmediatamente

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}> {/* Usar isOpen y onOpenChange */}
      {/* <DialogTrigger asChild>
        <Button size="sm">Open Dialog</Button>
      </DialogTrigger> */}
      <DialogContent className="overflow-hidden p-0 h-[90vh] w-[95vw] md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px] flex flex-col">
        
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start flex-1 flex flex-col">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              {/* Cuenta y Preferencias - Visible para todos */}
              <SidebarGroup>
              <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navAccount.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          onClick={() => handleSectionChange(item.name)}
                          className={cn(
                            uiStyle === 'minimal' ? (
                               // Estilo minimalista
                               cn(
                                 "text-muted-foreground overflow-hidden",
                                 item.name === activeSection 
                                    ? "!bg-transparent text-primary hover:!bg-transparent focus:!bg-transparent active:!bg-transparent data-[active=true]:!bg-transparent" 
                                    : "hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
                               )
                             ) : (
                               // Estilo normal
                               cn(
                                 "text-muted-foreground",
                                 item.name === activeSection 
                                    ? "bg-primary text-primary-foreground" 
                                    : "hover:bg-accent hover:text-accent-foreground"
                               )
                             )
                          )}
                        >
                          <a href="#">
                            {uiStyle !== 'minimal' && <item.icon />}
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              
              {/* Configuración de organización e Integraciones - Solo para rol master */}
              {userRole === 'admin' && (
                <SidebarGroup>
                  <SidebarGroupLabel>Organizacion</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {navWorkspace.map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton
                            asChild
                            onClick={() => handleSectionChange(item.name)}
                            className={cn(
                              uiStyle === 'minimal' ? (
                                 // Estilo minimalista
                                 cn(
                                   "text-muted-foreground overflow-hidden",
                                   item.name === activeSection 
                                      ? "!bg-transparent text-primary hover:!bg-transparent focus:!bg-transparent active:!bg-transparent data-[active=true]:!bg-transparent" 
                                      : "hover:!bg-transparent focus:!bg-transparent active:!bg-transparent"
                                 )
                               ) : (
                                 // Estilo normal
                                 cn(
                                   "text-muted-foreground",
                                   item.name === activeSection 
                                      ? "bg-primary text-primary-foreground" 
                                      : "hover:bg-accent hover:text-accent-foreground"
                                 )
                               )
                            )}
                          >
                            <a href="#">
                              {uiStyle !== 'minimal' && <item.icon />}
                              <span>{item.name}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}
            </SidebarContent>
          </Sidebar>
          <main className="flex flex-1 flex-col overflow-hidden md:h-[490px]">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {activeSection === "Preferencias" && (
                <div className="grid gap-6 py-4">
                  {/* Appearance Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Apariencia</h3>
                    <div className="grid gap-4">
                      {/* Theme Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Tema</div>
                          <div className="text-sm text-muted-foreground">
                            Selecciona el tema visual de la aplicación
                          </div>
                        </div>
                        <div className="flex gap-2 justify-self-end">
                          <Button
                            variant={selectedTheme === 'theme-claude' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleThemeChange('theme-claude')}
                          >
                            Claude
                          </Button>
                          <Button
                            variant={selectedTheme === 'theme-vercel' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleThemeChange('theme-vercel')}
                          >
                            Vercel
                          </Button>
                        </div>
                      </div>
                      
                      {/* Mode Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Modo</div>
                          <div className="text-sm text-muted-foreground">
                            Elige entre modo claro u oscuro
                          </div>
                        </div>
                        <div className="flex gap-2 justify-self-end">
                          <Button
                            variant={!theme?.endsWith('-dark') ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTheme(selectedTheme)}
                          >
                            Claro
                          </Button>
                          <Button
                            variant={theme?.endsWith('-dark') ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setTheme(`${selectedTheme}-dark`)}
                          >
                            Oscuro
                          </Button>
                        </div>
                      </div>
                      
                      {/* UI Style Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Estilo de interfaz</div>
                          <div className="text-sm text-muted-foreground">
                            Personaliza la densidad visual de la interfaz
                          </div>
                        </div>
                        <div className="flex gap-2 justify-self-end">
                          <Button
                            variant={uiStyle === 'normal' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleUiStyleChange('normal')}
                          >
                            Normal
                          </Button>
                          <Button
                            variant={uiStyle === 'minimal' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleUiStyleChange('minimal')}
                          >
                            Minimalista
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
              {activeSection === "Mi Cuenta" && (
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
              )}
              {activeSection === "Configuración de la organización" && (
                <div className="grid gap-6 py-4">
                  {/* Organization Information Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Información de la Organización</h3>
                    <div className="grid gap-4">
                      {/* Organization Name */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Nombre de la Organización</div>
                          <div className="text-sm text-muted-foreground">Centro Médico Especializado San Rafael</div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>

                      {/* NIT/Tax ID */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">NIT</div>
                          <div className="text-sm text-muted-foreground">900.123.456-7</div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>

                      {/* Legal Representative */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Representante Legal</div>
                          <div className="text-sm text-muted-foreground">Dr. Carlos Eduardo Mendoza Ruiz</div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Información de Contacto</h3>
                    <div className="grid gap-4">
                      {/* Address */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Dirección Principal</div>
                          <div className="text-sm text-muted-foreground">
                            Carrera 15 #93-07, Chapinero, Bogotá D.C., Colombia
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>

                      {/* Phone */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Teléfono Principal</div>
                          <div className="text-sm text-muted-foreground">+57 (1) 234-5678</div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>

                      {/* Emergency Phone */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Teléfono de Emergencias</div>
                          <div className="text-sm text-muted-foreground">+57 (1) 234-5679</div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>

                      {/* Email */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Correo Institucional</div>
                          <div className="text-sm text-muted-foreground">contacto@centromedicosanrafael.com</div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Medical License Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Licencias y Certificaciones</h3>
                    <div className="grid gap-4">
                      {/* Health License */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Habilitación en Salud</div>
                          <div className="text-sm text-muted-foreground">
                            No. 25001234567 - Vigente hasta: Diciembre 2025
                          </div>
                        </div>
                        <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full justify-self-end">
                          Vigente
                        </div>
                      </div>

                      {/* REPS Registration */}
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Registro REPS</div>
                          <div className="text-sm text-muted-foreground">
                            No. REPS-2500123456 - Vigente hasta: Junio 2026
                          </div>
                        </div>
                        <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full justify-self-end">
                          Vigente
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeSection === "Integraciones" && (
                <div className="grid gap-6 py-4">
                  
                  {/* Cloud Storage Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Almacenamiento en la Nube</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Google Drive</div>
                          <div className="text-sm text-muted-foreground">
                            Almacena y sincroniza documentos médicos de forma segura
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span className="text-xs text-muted-foreground">No conectado</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Conectar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Communication Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Comunicación</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">WhatsApp Business</div>
                          <div className="text-sm text-muted-foreground">
                            Envía recordatorios automáticos y notificaciones a pacientes
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            <span className="text-xs text-muted-foreground">No conectado</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Conectar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Development Tools Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Herramientas de Desarrollo</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">MCP (Model Context Protocol)</div>
                          <div className="text-sm text-muted-foreground">
                            Configura la integración con servicios de IA y automatización
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            <span className="text-xs text-green-600 dark:text-green-400">Configurado</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="justify-self-end">
                          Configurar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeSection === "Appearance" && (
                 <Button onClick={handleSaveClick} disabled={isApplyButtonDisabled}>Aplicar</Button>
               )}
               {/* {activeSection !== "Appearance" && activeSection !== "Integraciones" && (
                 <Button onClick={handleSaveClick}>Guardar</Button>
               )} */}
             </div>
           </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}