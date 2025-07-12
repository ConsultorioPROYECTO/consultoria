'use client'

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import {
  ChevronLeft,
  User,
  Palette,
  Building,
  Phone,
  Plug
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppearanceSection } from "../com/AppearanceSection"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTheme } from "next-themes"
import { useUIStyle } from "@/app/context/UIStyleContext"
import { useAuth } from "@/app/context/AuthContext"
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils"
import { AccountSection } from "../com/AccountSection"
import { IntegrationsSection } from "./_compo/IntegrationsSection"

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


export default function ConfigView() {
  const { theme, setTheme } = useTheme()
  const { uiStyle } = useUIStyle()
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

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    // Apply the theme immediately while preserving the current mode (light/dark)
    const newTheme = theme?.endsWith('-dark') ? `${value}-dark` : value;
    setTheme(newTheme);
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

      case "Integraciones":
        return <IntegrationsSection />;
      
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
    <div className="h-full w-full">
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
        // Vista desktop con menú de navegación que respeta el uiStyle
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] gap-10 h-full p-6">
          <aside className="flex flex-col gap-8">
            {/* Grupo de Cuenta */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">Cuenta</h3>
              <div className="flex flex-col space-y-1">
                {navAccount.map((item) => (
                  <Button
                    key={item.name}
                    variant="ghost"
                    onClick={() => handleSectionChange(item.name)}
                    className={cn(
                      "w-full justify-start gap-3 px-3",
                      uiStyle === 'minimal'
                        ? item.name === activeSection
                          ? "bg-transparent hover:bg-transparent text-primary" // Minimal Activo
                          : "bg-transparent hover:bg-transparent hover:text-primary text-muted-foreground" // Minimal Inactivo
                        : item.name === activeSection
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" // Normal Activo
                          : "hover:bg-accent hover:text-accent-foreground text-muted-foreground" // Normal Inactivo
                    )}
                  >
                    {uiStyle !== 'minimal' && <item.icon className="h-4 w-4" />}
                    <span>{item.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Grupo de Organización (condicional) */}
            {userRole === 'admin' && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">Organización</h3>
                <div className="flex flex-col space-y-1">
                  {navWorkspace.map((item) => (
                    <Button
                      key={item.name}
                      variant="ghost"
                      onClick={() => handleSectionChange(item.name)}
                      className={cn(
                        "w-full justify-start gap-3 px-3",
                        uiStyle === 'minimal'
                          ? item.name === activeSection
                            ? "bg-transparent hover:bg-transparent text-primary"
                            : "bg-transparent hover:bg-transparent hover:text-primary text-muted-foreground"
                          : item.name === activeSection
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                      )}
                    >
                      {uiStyle !== 'minimal' && <item.icon className="h-4 w-4" />}
                      <span>{item.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <main className="overflow-y-auto">
            {renderSectionContent()}
          </main>
        </div>
      )}
    </div>
  )
}