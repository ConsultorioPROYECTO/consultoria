"use client"

import { useState, useMemo } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"

interface SettingsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userRole?: 'admin' | 'medico' | 'paciente'
  user?: {
    name?: string
    email?: string
    dni?: string
  }
  theme?: string
  setTheme?: (theme: string) => void
  uiStyle?: 'normal' | 'minimal'
  setUiStyle?: (style: 'normal' | 'minimal') => void
}

const navAccount = [
  {
    name: "Preferencias",
    icon: Palette,
  },
  {
    name: "Cuenta",
    icon: User,
  },
  {
    name: "Passkeys",
    icon: Key,
  },
  {
    name: "Dispositivos",
    icon: Smartphone,
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
  userRole = 'paciente',
  user,
  theme,
  setTheme,
  uiStyle = 'normal',
  setUiStyle
}: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState("Preferencias")
  const [selectedTheme, setSelectedTheme] = useState(theme?.replace('-dark', '') || 'theme-claude')
  const [isDarkMode, setIsDarkMode] = useState(theme?.endsWith('-dark') || false)
  const isMobile = useIsMobile()
  const [showMobileNav, setShowMobileNav] = useState(true)

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

  const handleThemeChange = (newTheme: string) => {
    setSelectedTheme(newTheme)
    const finalTheme = isDarkMode ? `${newTheme}-dark` : newTheme
    setTheme?.(finalTheme)
  }

  const handleModeChange = (darkMode: boolean) => {
    setIsDarkMode(darkMode)
    const finalTheme = darkMode ? `${selectedTheme}-dark` : selectedTheme
    setTheme?.(finalTheme)
  }

  const handleUiStyleChange = (style: 'normal' | 'minimal') => {
    setUiStyle?.(style)
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case "Preferencias":
        return (
          <div className="grid gap-6 py-4">
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
                    <Button
                      variant={selectedTheme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleThemeChange('system')}
                    >
                      Sistema
                    </Button>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Modo</div>
                    <div className="text-sm text-muted-foreground">
                      Selecciona entre modo claro u oscuro
                    </div>
                  </div>
                  <div className="flex gap-2 justify-self-end">
                    <Button
                      variant={!isDarkMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange(false)}
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Claro
                    </Button>
                    <Button
                      variant={isDarkMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleModeChange(true)}
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Oscuro
                    </Button>
                  </div>
                </div>

                {/* UI Style Selection */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Estilo de UI</div>
                    <div className="text-sm text-muted-foreground">
                      Selecciona el estilo de la interfaz de usuario
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
                      Minimal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "Cuenta":
        return (
          <div className="grid gap-6 py-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Información de la cuenta</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Nombre y DNI</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.name || 'Usuario'} - {user?.dni || 'No especificado'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar nombre
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Correo electrónico</div>
                    <div className="text-sm text-muted-foreground">
                      {user?.email || 'No especificado'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar correo electrónico
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Contraseña</div>
                    <div className="text-sm text-muted-foreground">
                      Autenticada por Google
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar contraseña
                  </Button>
                </div>
              </div>
            </div>
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
          <SidebarProvider className="items-start">
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
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
                {/* Contenido de la sección */}
                {renderSectionContent()}
              </div>
            </main>
          </SidebarProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}