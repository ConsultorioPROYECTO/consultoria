'use client'

import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"

import { Loader2, X } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/app/context/AuthContext"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer"

// === Types ===

/**
 * Response structure from the generateQR API endpoint.
 */
interface GenerateQRResponse {
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

export function IntegrationsSection() {
  const { user } = useAuth()
  const isMobile = useIsMobile()


  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<string | null>(null)

  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [hasWhatsAppConnection, setHasWhatsAppConnection] = useState<boolean | null>(null)
  const [isCheckingWhatsAppConnection, setIsCheckingWhatsAppConnection] = useState<boolean>(false)
  const [showQRModal, setShowQRModal] = useState<boolean>(false)

  /**
   * Checks if the organization has a WhatsApp connection using the connectionState API.
   * 
   * @returns Promise<boolean> - True if organization has a connection, false otherwise
   */
  const checkOrganizationWhatsAppConnection = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      setIsCheckingWhatsAppConnection(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/evolutionAPI/connectionState', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`Error checking organization WhatsApp connection: ${response.status}`);
        return false;
      }

      const data = await response.json();
      
      if (data.success && data.data?.instance?.state) {
        const state = data.data.instance.state;
        setConnectionState(state);
        console.log(`Organization WhatsApp connection state: ${state}`);
        return state === 'open';
      }
      
      return false;
    } catch (error) {
      console.error('Error checking organization WhatsApp connection:', error);
      return false;
    } finally {
      setIsCheckingWhatsAppConnection(false);
    }
  }, [user]);



  /**
   * Starts auto-refresh to check connection state and regenerate QR every 20 seconds.
   */
  const startAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }

    const interval = setInterval(async () => {
      const hasConnection = await checkOrganizationWhatsAppConnection();
      
      if (hasConnection) {
        // If connected, stop auto-refresh and update connection status
        console.log('WhatsApp connected, stopping auto-refresh');
        setHasWhatsAppConnection(true);
        setShowQRModal(false);
        stopAutoRefresh();
      } else {
        // If not connected, regenerate QR code
        console.log('WhatsApp not connected, regenerating QR code...');
        await generateQRCode(true); // Keep current QR visible during regeneration
      }
    }, 20000); // 20 seconds

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

  // Check organization WhatsApp connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (user) {
        const hasConnection = await checkOrganizationWhatsAppConnection();
        setHasWhatsAppConnection(hasConnection);
      }
    };
    
    checkConnection();
  }, [user, checkOrganizationWhatsAppConnection]);

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh();
    };
  }, [autoRefreshInterval, stopAutoRefresh]);

  /**
   * Generates QR code without starting auto-refresh (used for regeneration).
   * 
   * @param keepCurrentQR - Whether to keep the current QR visible during regeneration
   * @returns Promise<void>
   */
  const generateQRCode = async (keepCurrentQR: boolean = false): Promise<void> => {
    if (!user) {
      setQrError("Usuario no autenticado.");
      return;
    }

    // Clear any previous errors
    setQrError(null);
    
    // For regeneration, add a small delay before showing loading state to reduce flickering
    let loadingTimeout: NodeJS.Timeout | null = null;
    if (keepCurrentQR) {
      loadingTimeout = setTimeout(() => setIsLoadingQR(true), 500); // 500ms delay
    } else {
      setIsLoadingQR(true);
      setQrCodeData(null);
    }

    try {
      // Add timeout for the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const token = await user.getIdToken();
      const response = await fetch('/api/evolutionAPI/generateQR', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data: GenerateQRResponse = await response.json();

      // Log response for debugging (remove in production)
      console.log('QR Generation Response:', {
        responseOk: response.ok,
        hasData: !!data.data,
        hasQrCode: !!(data.data?.qrcode),
        status: response.status,
        message: data.message
      });

      if (!response.ok) {
        throw new Error(data.error || `Error HTTP ${response.status}: ${response.statusText}`);
      }

      // Enhanced response validation
      // The API returns { message, data } for success, { error, details } for errors
      if (response.ok && data.data) {
        if (data.data.qrcode && data.data.qrcode.startsWith('data:image/')) {
          setQrCodeData(data.data.qrcode);
        } else if (data.data.base64) {
          if (data.data.base64.startsWith('data:image/')) {
            setQrCodeData(data.data.base64);
          } else {
            setQrCodeData(`data:image/png;base64,${data.data.base64}`);
          }
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
      // Clear loading timeout if it exists
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      setIsLoadingQR(false);
    }
  };

  /**
   * Handles QR code generation using the organization's connection.
   * 
   * @returns Promise<void>
   */
  const handleConnectWhatsApp = async (): Promise<void> => {
    await generateQRCode();
    setShowQRModal(true);
    // Start auto-refresh to check connection state
    startAutoRefresh();
  };



  /**
   * Componente que renderiza el código QR en un Dialog (desktop) o Drawer (móvil)
   */
  const QRCodeModal = () => {
    const content = (
      <>
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Escanea este código QR con tu teléfono para conectar WhatsApp:
          </p>
          {qrCodeData && (
            <div className="relative inline-block">
              <Image
                src={qrCodeData}
                alt="Código QR de WhatsApp"
                width={300}
                height={300}
                className="mx-auto border rounded-lg shadow-sm"
                priority
                onError={() => {
                  console.error('Error loading QR image');
                  setQrError("Error al cargar la imagen del código QR. Por favor, inténtalo de nuevo.");
                  setQrCodeData(null);
                  // Don't close modal on image error to prevent flickering
                }}
                onLoad={() => {
                  console.log('QR image loaded successfully');
                }}
              />
              {/* Loading overlay during regeneration */}
              {isLoadingQR && (
                <div className="absolute inset-0 bg-white/80 dark:bg-black/80 rounded-lg flex items-center justify-center transition-opacity duration-300 ease-in-out">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Regenerando QR...</span>
                  </div>
                </div>
              )}
          {/* Loading state when no QR code yet */}
          {!qrCodeData && isLoadingQR && (
            <div className="w-[300px] h-[300px] mx-auto border rounded-lg shadow-sm flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generando código QR...</span>
              </div>
            </div>
          )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            {connectionState === 'open' 
              ? 'WhatsApp conectado exitosamente.' 
              : 'El código se actualizará automáticamente cada 20 segundos hasta que se conecte.'}
          </p>
        </div>
      </>
    );

    if (isMobile) {
      return (
        <Drawer open={showQRModal} onOpenChange={setShowQRModal}>
          <DrawerContent>
            <DrawerHeader>
              <div className="flex items-center justify-between">
                <DrawerTitle>Conectar WhatsApp</DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
              <DrawerDescription>
                Usa tu teléfono para escanear el código QR
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
            <DialogDescription>
              Usa tu teléfono para escanear el código QR
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="grid gap-6 py-4">
      <div>
        <h3 className="text-lg font-medium mb-4">Integraciones Disponibles</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Conecta tu IA con diferentes plataformas de mensajería.
        </p>
        
        {/* Integration Cards */}
        <div className="grid gap-4 mb-6">
          {/* WhatsApp Integration Card */}
          <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10  rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium">WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">Conecta tu IA con WhatsApp Business</p>
                </div>
              </div>
              {isCheckingWhatsAppConnection ? (
                <Button variant="outline" size="sm" disabled>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Verificando...
                </Button>
              ) : hasWhatsAppConnection === false ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleConnectWhatsApp}
                  disabled={isLoadingQR}
                >
                  {isLoadingQR ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar'
                  )}
                </Button>
              ) : hasWhatsAppConnection === true ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-600 font-medium">Conectado</span>
                  {connectionState && (
                    <span className="text-xs text-muted-foreground">({connectionState})</span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          
          {/* Coming Soon Card */}
          <div className="border rounded-lg p-4 opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-lg">+</span>
                </div>
                <div>
                  <h4 className="font-medium text-muted-foreground">Más integraciones</h4>
                  <p className="text-sm text-muted-foreground">Próximamente: Telegram, Instagram, etc.</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                Próximamente
              </Button>
            </div>
          </div>
        </div>
        
        {/* Error display for QR generation */}
        {qrError && (
          <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{qrError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                setQrError(null);
                handleConnectWhatsApp();
              }}
              disabled={isLoadingQR}
            >
              Intentar de nuevo
            </Button>
          </div>
        )}


      </div>
      
      {/* QR Code Modal/Drawer */}
      <QRCodeModal />
    </div>
  );
}