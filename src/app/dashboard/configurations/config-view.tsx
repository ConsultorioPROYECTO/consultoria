'use client'

import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback} from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ChevronLeft,
  User,
  Palette,
  Building,
  Phone,
  Plug,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppearanceSection } from "../com/AppearanceSection"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTheme } from "next-themes"
import { useUIStyle } from "@/app/context/UIStyleContext"
import { useAuth } from "@/app/context/AuthContext"
import { getFirebaseAuthToken } from "@/app/lib/firebase/clientUtils"
import { AccountSection } from "../com/AccountSection"
import { QRCode } from '@/components/ui/kibo-ui/qr-code'

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

// === Types ===

/**
 * Response structure from the generateQR API endpoint.
 */
interface GenerateQRResponse {
  /** Indicates if the request was successful */
  success: boolean;
  /** QR code data from Evolution API */
  data?: {
    /** QR code as data URL (data:image/png;base64,...) */
    qrcode?: string;
    /** Raw QR code string */
    code?: string;
    /** QR code as base64 image */
    base64?: string;
    /** Connection status */
    status?: string;
  };
  /** Success message */
  message?: string;
  /** Error message if request failed */
  error?: string;
  /** Additional error details */
  details?: string;
}

export default function ConfigView() {
  const { theme, setTheme } = useTheme()
  const { uiStyle } = useUIStyle()
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState("Preferencias")
  const [selectedTheme, setSelectedTheme] = useState<string>(theme?.replace('-dark', '') || "system")
  const [userRole, setUserRole] = useState<string>("")
  const isMobile = useIsMobile()
  const [showMobileNav, setShowMobileNav] = useState(true)
  // New states for WhatsApp integration
  const [instanceId, setInstanceId] = useState<string>("")
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<string | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)

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

  /**
   * Checks the connection state of a WhatsApp instance.
   * 
   * @param instanceName - The name of the instance to check
   * @returns Promise<string | null> - The connection state or null if error
   */
  const checkConnectionState = async (instanceName: string): Promise<string | null> => {
    if (!instanceName || instanceName.trim() === '') {
      return null;
    }

    try {
      setIsCheckingConnection(true);
      const response = await fetch(`/api/evolutionAPI/connectionState/${instanceName.trim()}`);
      
      if (!response.ok) {
        console.error(`Error checking connection state: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.data?.instance?.state) {
        const state = data.data.instance.state;
        setConnectionState(state);
        console.log(`Connection state for ${instanceName}: ${state}`);
        return state;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking connection state:', error);
      return null;
    } finally {
      setIsCheckingConnection(false);
    }
  };

  /**
   * Starts auto-refresh of QR code when instance is not connected.
   * Checks connection state every 15 seconds and regenerates QR if needed.
   */
  const startAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }

    const interval = setInterval(async () => {
      if (!instanceId || instanceId.trim() === '') {
        return;
      }

      const state = await checkConnectionState(instanceId);
      
      // If not connected (state is not 'open'), regenerate QR
      if (state !== 'open' && !isLoadingQR) {
        console.log('Instance not connected, regenerating QR...');
        await handleGenerateQR();
      } else if (state === 'open') {
        // If connected, stop auto-refresh
        console.log('Instance connected, stopping auto-refresh');
        stopAutoRefresh();
      }
    }, 20000); // 15 seconds

    setAutoRefreshInterval(interval);
  };

  /**
   * Stops the auto-refresh interval.
   */
  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      setAutoRefreshInterval(null);
    }
  }, [autoRefreshInterval]);

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [autoRefreshInterval, stopAutoRefresh]);

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
      
      case "Integraciones":
        return (
          <div className="grid gap-6 py-4">
            <div>
              <h3 className="text-lg font-medium mb-4">Integración de WhatsApp</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Genera un código QR para conectar tu instancia de WhatsApp.
              </p>
              <div className="grid gap-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="instanceId">ID de Instancia</Label>
                  <Input
                    id="instanceId"
                    placeholder="ej. mi-instancia-whatsapp"
                    value={instanceId}
                    onChange={(e) => {
                      setInstanceId(e.target.value);
                      // Stop auto-refresh when changing instance ID
                      if (autoRefreshInterval) {
                        stopAutoRefresh();
                      }
                      setConnectionState(null);
                      setQrCodeData(null);
                    }}
                    disabled={isLoadingQR}
                  />
                </div>
                
                {/* Connection Status */}
                {instanceId && (
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <div className="flex items-center gap-2">
                      {isCheckingConnection ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : connectionState === 'open' ? (
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                      ) : connectionState ? (
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-gray-400" />
                      )}
                      <span className="text-sm font-medium">
                        Estado: {isCheckingConnection ? 'Verificando...' : connectionState === 'open' ? 'Conectado' : connectionState || 'Desconocido'}
                      </span>
                    </div>
                    {instanceId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkConnectionState(instanceId)}
                        disabled={isCheckingConnection || !instanceId}
                        className="ml-auto"
                      >
                        {isCheckingConnection ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Verificar'
                        )}
                      </Button>
                    )}
                  </div>
                )}
                
                <Button onClick={handleGenerateQR} disabled={isLoadingQR || !instanceId}>
                  {isLoadingQR ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando QR...
                    </>
                  ) : qrCodeData ? (
                    "Regenerar QR"
                  ) : (
                    "Generar QR"
                  )}
                </Button>
                
                {autoRefreshInterval && (
                  <div className="flex items-center gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Verificando conexión cada 15 segundos...</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={stopAutoRefresh}
                      className="ml-auto h-6 px-2 text-xs"
                    >
                      Detener
                    </Button>
                  </div>
                )}
                
                {qrError && (
                  <p className="text-sm text-red-500">{qrError}</p>
                )}
                
                {qrCodeData && (
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Escanea este código QR con tu teléfono:</p>
                    <div className="relative inline-block">
                      <QRCode
                        data={qrCodeData}
                        className="mx-auto w-[200px] h-[200px]"
                        robustness="M"
                        foreground="bg-secondary"
                        background="bg-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {connectionState === 'open' 
                        ? 'WhatsApp conectado exitosamente.' 
                        : 'El código se actualizará automáticamente cada 15 segundos hasta que se conecte.'}
                    </p>
                  </div>
                )}
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

  /**
   * Handles QR code generation with improved error handling and validation.
   * 
   * @returns Promise<void>
   */
  const handleGenerateQR = async (): Promise<void> => {
    // Validate instance ID
    if (!instanceId || instanceId.trim() === '') {
      setQrError("Por favor, ingresa un ID de instancia válido.");
      return;
    }

    setIsLoadingQR(true);
    setQrCodeData(null);
    setQrError(null);

    try {
      // Add timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/evolutionAPI/generateQR', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instance: instanceId.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data: GenerateQRResponse = await response.json();

      // Log response for debugging (remove in production)
      console.log('QR Generation Response:', {
        success: data.success,
        hasData: !!data.data,
        hasQrCode: !!(data.data?.qrcode),
        status: response.status
      });

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      // Enhanced response validation
      if (data.success && data.data) {
        if (data.data.qrcode && data.data.qrcode.startsWith('data:image/')) {
          setQrCodeData(data.data.qrcode);
          // Start auto-refresh to check connection state
          startAutoRefresh();
        } else if (data.data.base64) {
          if (data.data.base64.startsWith('data:image/')) {
            setQrCodeData(data.data.base64);
          } else {
            setQrCodeData(`data:image/png;base64,${data.data.base64}`);
          }
          // Start auto-refresh to check connection state
          startAutoRefresh();
        } else {
          setQrError("No se recibió un código QR válido en la respuesta del servidor.");
        }
      } else {
        setQrError(data.error || "Error desconocido al generar el código QR.");
      }
    } catch (error: unknown) {
      console.error('Error al generar el QR:', error);
      
      let errorMessage = "Ocurrió un error inesperado.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "La solicitud tardó demasiado tiempo. Por favor, inténtalo de nuevo.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setQrError(errorMessage);
    } finally {
      setIsLoadingQR(false);
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