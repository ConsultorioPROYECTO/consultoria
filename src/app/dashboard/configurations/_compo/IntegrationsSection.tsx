'use client'

import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"

import { Loader2, X, ChevronDown, ChevronUp } from "lucide-react"
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

/**
 * Instance information structure from Evolution API.
 */
interface InstanceInfo {
  /** Instance name */
  instanceName?: string;
  /** Instance ID */
  instanceId?: string;
  /** Owner information */
  owner?: string;
  /** Profile name */
  profileName?: string;
  /** Profile picture URL */
  profilePictureUrl?: string;
  /** Phone number */
  number?: string;
  /** Owner JID (contains phone number with @s.whatsapp.net suffix) */
  ownerJid?: string;
  /** Connection status */
  status?: string;
  /** Server URL */
  serverUrl?: string;
  /** API key */
  apikey?: string;
}

/**
 * Response structure from the instance info API endpoint.
 */
interface InstanceInfoResponse {
  /** Success message */
  message?: string;
  /** Instance data from Evolution API */
  data?: InstanceInfo[];
  /** Error message if request failed */
  error?: string;
}

/**
 * Extracts phone number from WhatsApp JID format.
 * @param ownerJid - JID in format "1234567890@s.whatsapp.net"
 * @returns Phone number without the WhatsApp suffix
 */
const extractPhoneFromJid = (ownerJid: string): string => {
  if (!ownerJid) return '';
  return ownerJid.replace('@s.whatsapp.net', '');
};

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
  
  // Estados para el desplegable de información de conexión
  const [showConnectionInfo, setShowConnectionInfo] = useState<boolean>(false)
  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null)
  const [isLoadingInstanceInfo, setIsLoadingInstanceInfo] = useState<boolean>(false)
  const [instanceInfoError, setInstanceInfoError] = useState<string | null>(null)

  /**
   * Checks if the organization has a WhatsApp connection using the connectionState API.
   * Also loads instance info when connected.
   * 
   * @returns Promise<{connected: boolean, state: string | null}> - Connection status and current state
   */
  const checkOrganizationWhatsAppConnection = useCallback(async (): Promise<{connected: boolean, state: string | null}> => {
    if (!user) {
      return {connected: false, state: null};
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
        return {connected: false, state: null};
      }

      const data = await response.json();

      console.log(`\n\n\n\n\n\tResponse from connectionState API: ${JSON.stringify(data)}\n\n\n\n`);
      
      // Check if the response has the expected structure
      if (data.data?.instance?.state) {
        const state = data.data.instance.state;
        setConnectionState(state);
        console.log(`\n\n\n\n\n\tOrganization WhatsApp connection state: ${state}\n\n\n\n`);
        console.log('Setting connectionState to:', state, 'Type:', typeof state);
        
        if (state === 'open'){
          // If connected, also fetch instance info
          try {
            const infoResponse = await fetch('/api/evolutionAPI/connectionState/info', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (infoResponse.ok) {
              const infoData: InstanceInfoResponse = await infoResponse.json();
              if (infoData.data && infoData.data.length > 0) {
                setInstanceInfo(infoData.data[0]);
                setInstanceInfoError(null);
                console.log('Instance info loaded automatically:', infoData.data[0]);
              }
            }
          } catch (infoError) {
            console.error('Error fetching instance info during connection check:', infoError);
            // Don't fail the connection check if instance info fails
          }
          
          return {connected: true, state};
        } else {
          // Clear instance info if not connected
          setInstanceInfo(null);
          setInstanceInfoError(null);
          return {connected: false, state};
        }
      }
      
      return {connected: false, state: null};
    } catch (error) {
      console.error('Error checking organization WhatsApp connection:', error);
      return {connected: false, state: null};
    } finally {
      setIsCheckingWhatsAppConnection(false);
    }
  }, [user]);



  /**
   * Starts auto-refresh to check connection state and regenerate QR every 30 seconds.
   */
  const startAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }

    const interval = setInterval(async () => {
      const connectionResult = await checkOrganizationWhatsAppConnection();
      
      console.log('Auto-refresh check - connectionResult:', {
        connected: connectionResult.connected,
        state: connectionResult.state,
        stateType: typeof connectionResult.state
      });
      
      if (connectionResult.connected) {
        // If connected, stop auto-refresh and update connection status
        console.log('WhatsApp connected, stopping auto-refresh');
        setHasWhatsAppConnection(true);
        setShowQRModal(false);
        stopAutoRefresh();
      } else {
        // Only regenerate QR if not in connecting or open state
        const currentState = connectionResult.state;
        if (currentState !== 'connecting' && currentState !== 'open') {
          console.log(`WhatsApp not connected (state: ${currentState}), regenerating QR code...`);
          await generateQRCode(true); // Keep current QR visible during regeneration
        } else {
          console.log(`WhatsApp is ${currentState}, keeping current QR...`);
        }
      }
    }, 30000); // 30 seconds

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
        const connectionResult = await checkOrganizationWhatsAppConnection();
        setHasWhatsAppConnection(connectionResult.connected);
        // Ensure connectionState is properly set from the result
        if (connectionResult.state) {
          setConnectionState(connectionResult.state);
        }
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

  // Debug useEffect to monitor connectionState changes
  useEffect(() => {
    console.log('connectionState changed in React:', {
      value: connectionState,
      type: typeof connectionState,
      isNull: connectionState === null,
      isStringNull: connectionState === 'null'
    });
  }, [connectionState]);

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
   * Fetches detailed information about the WhatsApp instance.
   * 
   * @returns Promise<void>
   */
  const fetchInstanceInfo = useCallback(async (): Promise<void> => {
    if (!user) {
      setInstanceInfoError("Usuario no autenticado.");
      return;
    }

    try {
      setIsLoadingInstanceInfo(true);
      setInstanceInfoError(null);
      
      const token = await user.getIdToken();
      const response = await fetch('/api/evolutionAPI/connectionState/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const data: InstanceInfoResponse = await response.json();
      
      console.log('Raw API response:', data);
      console.log('Response structure:', {
        hasMessage: !!data.message,
        hasData: !!data.data,
        dataLength: data.data?.length,
        firstItem: data.data?.[0]
      });
      
      if (data.data && data.data.length > 0) {
        setInstanceInfo(data.data[0]); // Tomar la primera instancia
        console.log('Instance info loaded:', data.data[0]);
      } else {
        console.log('No valid data found:', {
          hasMessage: !!data.message,
          hasData: !!data.data,
          dataLength: data.data?.length,
          error: data.error
        });
        setInstanceInfoError(data.error || "No se pudo obtener la información de la instancia.");
      }
    } catch (error: unknown) {
      console.error('Error fetching instance info:', error);
      
      let errorMessage = "Ocurrió un error inesperado.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setInstanceInfoError(errorMessage);
    } finally {
      setIsLoadingInstanceInfo(false);
    }
  }, [user]);

  /**
   * Toggles the connection info dropdown and fetches data if needed.
   */
  const toggleConnectionInfo = async () => {
    if (!showConnectionInfo && !instanceInfo && !isLoadingInstanceInfo) {
      // Only fetch if not already loaded automatically
      await fetchInstanceInfo();
    }
    setShowConnectionInfo(!showConnectionInfo);
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
            <div className="w-[300px] h-[300px] mx-auto border rounded-lg shadow-sm flex items-center justify-center">
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
              : connectionState === 'connecting'
              ? 'Conectando WhatsApp... Por favor espera.'
              : 'El código se actualizará automáticamente cada 30 segundos hasta que se conecte.'}
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
          <div className="border rounded-lg hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium">WhatsApp</h4>
                    <p className="text-sm text-muted-foreground">Conecta tu IA con WhatsApp Business</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    <>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-green-600 font-medium">Conectado</span>
                        {connectionState && connectionState !== 'null' && connectionState !== 'open' && (
                          <span className="text-xs text-muted-foreground">({connectionState})</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleConnectionInfo}
                        className="ml-2 p-1 h-8 w-8"
                      >
                        {showConnectionInfo ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            
            {/* Información desplegable de la conexión */}
            {hasWhatsAppConnection && showConnectionInfo && (
              <div className="p-4">
                {isLoadingInstanceInfo ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Cargando información...</span>
                  </div>
                ) : instanceInfoError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">{instanceInfoError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchInstanceInfo}
                      disabled={isLoadingInstanceInfo}
                    >
                      Reintentar
                    </Button>
                  </div>
                ) : instanceInfo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {instanceInfo.profilePictureUrl ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-200">
                          <Image
                            src={instanceInfo.profilePictureUrl}
                            alt="Foto de perfil de WhatsApp"
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback si la imagen no carga
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="grid gap-1">
                          {instanceInfo.profileName && (
                            <h4 className="font-medium">
                              {instanceInfo.profileName}
                            </h4>
                          )}
                          {(instanceInfo.ownerJid || instanceInfo.number) && (
                            <p className="text-sm text-muted-foreground">
                              +{instanceInfo.ownerJid ? extractPhoneFromJid(instanceInfo.ownerJid) : instanceInfo.number}
                            </p>
                          )}
                          {instanceInfo.status && (
                            <p className="text-xs text-muted-foreground capitalize">
                              Estado: {instanceInfo.status}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          {/* Coming Soon Card */}
          <div className="border rounded-lg p-4 opacity-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
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