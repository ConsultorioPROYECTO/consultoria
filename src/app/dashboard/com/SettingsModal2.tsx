"use client"

import { useState, useMemo, useEffect} from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  User,
  Settings,
  Palette,
  Shield,
  Smartphone,
  Building,
  Phone,
  FileText,
  Award,
  Plug,
  Sun,
  Moon,
  Key
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppearanceSection } from "./AppearanceSection"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTheme } from "next-themes"
import { useUIStyle } from "@/app/context/UIStyleContext"
import { useAuth } from "@/app/context/AuthContext"
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils"
import { AccountSection } from "./AccountSection";

interface SettingsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userRole?: 'admin' | 'medico' | 'paciente'
  user?: {
    name?: string
    email?: string
    dni?: string
  }
}

const navAccount = [
  {
    name: "Cuenta",
    icon: User,
  },
  {
    name: "Preferencias",
    icon: Palette,
  },
]

const navWorkspace = [
  {
    name: "Información de la Organización",
    icon: Building,
  },
  {
    name: "Información de Contacto",
    icon: Phone,
  },
  {
    name: "Integraciones",
    icon: Plug,
  },
]

const navMedico = [
  {
    name: "Información Profesional",
    icon: FileText,
  },
  {
    name: "Licencia Médica",
    icon: Shield,
  },
  {
    name: "Certificaciones",
    icon: Award,
  },
]

export function SettingsModal2({ 
  isOpen, 
  onOpenChange, 
  
}: SettingsModalProps) {
  
  const { theme, setTheme } = useTheme()
  const { uiStyle, setUiStyle } = useUIStyle()
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState("Preferencias")
  const [selectedTheme, setSelectedTheme] = useState<string>(theme?.replace('-dark', '') || "system")
  const [userRole, setUserRole] = useState<string>("")
  const isMobile = useIsMobile()
  const [showMobileNav, setShowMobileNav] = useState(true)

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

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    if (isMobile) {
      setShowMobileNav(false)
    }
  }

  const handleBackToNav = () => {
    setShowMobileNav(true)
  }

  const availableSections = useMemo(() => {
    let sections = [...navAccount]
    
    if (userRole === 'medico') {
      sections = [...sections, ...navMedico]
    }
    
    if (userRole === 'admin') {
      sections = [...sections, ...navWorkspace]
    }
    
    return sections
  }, [userRole])

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    // Apply the theme immediately while preserving the current mode (light/dark)
    const newTheme = theme?.endsWith('-dark') ? `${value}-dark` : value;
    setTheme(newTheme);
  };

  const handleUiStyleChange = (style: 'normal' | 'minimal') => {
    setUiStyle(style); // Usa el contexto global que maneja localStorage automáticamente
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Preferencias":
        return (
          <div className="grid gap-6 py-4">
            <AppearanceSection 
              selectedTheme={selectedTheme}
              onThemeChange={handleThemeChange}
            />
          </div>
        );

      case "Cuenta":
        return (
          <div className="grid gap-6 py-4">
            <AccountSection 
                  user={user}
                  userRole={userRole}
                />
          </div>
        );

      case "Dispositivos":
        return (
          <div className="grid gap-6 py-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Dispositivos</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Dispositivo actual</div>
                    <div className="text-sm text-muted-foreground">
                      Windows - Chrome
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Última actividad: Ahora
                    </div>
                  </div>
                  <div className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full justify-self-end">
                    Activo
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">iPhone 13</div>
                    <div className="text-sm text-muted-foreground">
                      iOS - Safari
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Última actividad: Hace 2 horas
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Desconectar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="grid gap-6 py-4">
            <div>
              <h3 className="text-lg font-medium mb-4">{activeSection}</h3>
              <div className="text-sm text-muted-foreground">
                Contenido de {activeSection} en desarrollo...
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "overflow-hidden p-0 max-h-[90vh] md:max-h-[80vh]",
        isMobile ? "max-w-[95vw] w-full" : "md:max-w-[700px] lg:max-w-[800px]"
      )}>
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        
        {isMobile ? (
          // Vista móvil con navegación por tabs
          <div className="flex flex-col h-full">
            {showMobileNav ? (
              // Navegación móvil
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Configuración</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-6">
                    {/* Secciones de Cuenta */}
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Cuenta</h3>
                      <div className="space-y-2">
                        {navAccount.map((item) => (
                          <button
                            key={item.name}
                            onClick={() => handleSectionChange(item.name)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                          >
                            <item.icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{item.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Secciones de Organización - Solo para admin */}
                    {userRole === 'admin' && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">Organización</h3>
                        <div className="space-y-2">
                          {navWorkspace.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => handleSectionChange(item.name)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                            >
                              <item.icon className="h-5 w-5 text-muted-foreground" />
                              <span className="font-medium">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Contenido de la sección seleccionada
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 p-4 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToNav}
                    className="p-1 h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-lg font-semibold">{activeSection}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Contenido de la sección */}
                  {renderSectionContent()}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Vista desktop con sidebar
          <SidebarProvider className="items-start flex-1 flex">
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
            <main className="flex-1 flex-col p-6">

                {/* Contenido de la sección */}
                {renderSectionContent()}

            </main>
          </SidebarProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}