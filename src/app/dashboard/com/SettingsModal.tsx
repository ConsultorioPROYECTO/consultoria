'use client';

import * as React from "react"
import { useState, useEffect } from 'react';
import {
  Paintbrush,
  Building,
  User,
  Shield,
  Plug,
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
} from "@/components/ui/sidebar"

import { Label } from "@rutas/components/ui/label";
import { Input } from "@rutas/components/ui/input";
import { useTheme } from "next-themes";
import { useUIStyle } from "@/app/context/UIStyleContext";
import { useAuth } from "@/app/context/AuthContext";
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils";

const data = {
  nav: [
    { name: "Mi Cuenta", icon: User },
    { name: "Configuración de la organización", icon: Building },
    { name: "Appearance", icon: Paintbrush },
    { name: "Seguridad y Privacidad", icon: Shield },
    { name: "Integraciones", icon: Plug },
  ],
}

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ isOpen, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const { uiStyle, setUiStyle } = useUIStyle(); // Usar el contexto global
  const { user } = useAuth(); // Obtener el usuario actual
  const [selectedTheme, setSelectedTheme] = useState<string>(theme?.replace('-dark', '') || "system");
  const [activeSection, setActiveSection] = useState("Appearance"); // New state for active section
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
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.name === activeSection}
                          onClick={() => handleSectionChange(item.name)}
                        >
                          <a href="#">
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {activeSection === "Appearance" && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="theme">Tema</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={selectedTheme === 'theme-claude' ? 'default' : 'outline'}
                          onClick={() => handleThemeChange('theme-claude')}
                        >
                          Claude
                        </Button>
                        <Button
                          variant={selectedTheme === 'theme-vercel' ? 'default' : 'outline'}
                          onClick={() => handleThemeChange('theme-vercel')}
                        >
                          Vercel
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mode">Modo</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={!theme?.endsWith('-dark') ? 'default' : 'outline'}
                          onClick={() => setTheme(selectedTheme)}
                        >
                          Claro
                        </Button>
                        <Button
                          variant={theme?.endsWith('-dark') ? 'default' : 'outline'}
                          onClick={() => setTheme(`${selectedTheme}-dark`)}
                        >
                          Oscuro
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="uiStyle">Estilo de interfaz</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={uiStyle === 'normal' ? 'default' : 'outline'}
                          onClick={() => handleUiStyleChange('normal')}
                        >
                          Normal
                        </Button>
                        <Button
                          variant={uiStyle === 'minimal' ? 'default' : 'outline'}
                          onClick={() => handleUiStyleChange('minimal')}
                        >
                          Minimalista
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Tema actual: {theme?.replace('-dark', '')} ({theme?.endsWith('-dark') ? 'Oscuro' : 'Claro'})
                      <br />
                      Estilo de interfaz: {uiStyle === 'normal' ? 'Normal' : 'Minimalista'}
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
                        <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                          <img 
                            src={user?.photoURL || "/avatars/shadcn.jpg"} 
                            alt="Foto de perfil" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="text-sm text-muted-foreground mb-1">Preferred name</div>
                          <div className="text-base font-medium">{user?.displayName || "Usuario"}</div>
                        </div>
                      </div>
                  </div>

                  {/* Account Security Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Account security</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-sm font-medium">Email</div>
                          <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Change email
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-sm font-medium">Password</div>
                          <div className="text-sm text-muted-foreground">
                            {user?.providerData?.[0]?.providerId === 'google.com' 
                              ? 'Managed by Google' 
                              : 'If you lose access to your school email address, you\'ll be able to log in using your password.'}
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={user?.providerData?.[0]?.providerId === 'google.com'}
                        >
                          Change password
                        </Button>
                      </div>

                      {user?.providerData?.[0]?.providerId !== 'google.com' && (
                        <>
                          <div className="flex items-center justify-between py-2">
                            <div>
                              <div className="text-sm font-medium">2-step verification</div>
                              <div className="text-sm text-muted-foreground">Add an additional layer of security to your account during login.</div>
                            </div>
                            <Button variant="outline" size="sm">
                              Add verification method
                            </Button>
                          </div>

                          <div className="flex items-center justify-between py-2">
                            <div>
                              <div className="text-sm font-medium">Passkeys</div>
                              <div className="text-sm text-muted-foreground">Securely sign-in with on-device biometric authentication.</div>
                            </div>
                            <Button variant="outline" size="sm">
                              Add passkey
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Organization Role Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Organization</h3>
                    <div className="border-b pb-4">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-sm font-medium">Role</div>
                          <div className="text-sm text-muted-foreground">
                            {userRole === 'medico' ? 'Médico' : 
                             userRole === 'asistente' ? 'Asistente' : 
                             userRole === 'admin' ? 'Administrador' : 
                             'No asignado'}
                          </div>
                        </div>
                      </div>
                      {user?.phoneNumber && (
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <div className="text-sm font-medium">Phone</div>
                            <div className="text-sm text-muted-foreground">{user.phoneNumber}</div>
                          </div>
                        </div>
                      )}
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
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="organizationName">Nombre de la Organización</Label>
                    <Input id="organizationName" defaultValue="Mi Organización" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" defaultValue="Calle Falsa 123" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" defaultValue="+1234567890" />
                  </div>
                </div>
              )}
              {activeSection === "Seguridad y Privacidad" && (
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Cambiar Contraseña</Label>
                    <div className="grid gap-2">
                      <Input type="password" placeholder="Contraseña actual" />
                      <Input type="password" placeholder="Nueva contraseña" />
                      <Input type="password" placeholder="Confirmar nueva contraseña" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="twoFactor">Autenticación de dos factores</Label>
                    <Button variant="outline" size="sm">Configurar</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sessions">Sesiones activas</Label>
                    <Button variant="outline" size="sm">Ver sesiones</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dataBackup">Respaldo de datos</Label>
                    <Button variant="outline" size="sm">Configurar</Button>
                  </div>
                </div>
              )}
              {activeSection === "Integraciones" && (
                <div className="grid gap-4 py-4">
                  <div className="text-sm text-muted-foreground mb-4">
                    Conecta tu aplicación con servicios externos para mejorar tu flujo de trabajo.
                  </div>
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">MCP</h4>
                        <p className="text-sm text-muted-foreground">Configura la integración con MCP</p>
                      </div>
                      <Button variant="outline" size="sm">Configurar</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">Google Calendar</h4>
                        <p className="text-sm text-muted-foreground">Sincroniza citas con tu calendario</p>
                      </div>
                      <Button variant="outline" size="sm">Conectar</Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">WhatsApp Business</h4>
                        <p className="text-sm text-muted-foreground">Envía recordatorios por WhatsApp</p>
                      </div>
                      <Button variant="outline" size="sm">Conectar</Button>
                    </div>
                  </div>
                </div>
              )}
              {activeSection === "Appearance" && (
                 <Button onClick={handleSaveClick} disabled={isApplyButtonDisabled}>Aplicar</Button>
               )}
               {activeSection !== "Appearance" && activeSection !== "Integraciones" && (
                 <Button onClick={handleSaveClick}>Guardar</Button>
               )}
             </div>
           </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}