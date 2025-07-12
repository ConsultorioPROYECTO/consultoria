'use client'

import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Image from "next/image"

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

export function IntegrationsSection() {
  const [instanceId, setInstanceId] = useState<string>("")
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [isLoadingQR, setIsLoadingQR] = useState<boolean>(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<string | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState<boolean>(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null)

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
                <Image
                  src={qrCodeData}
                  alt="Código QR de WhatsApp"
                  width={500}
                  height={500}
                  className="mx-auto border rounded-lg shadow-sm"
                  priority
                  onError={() => {
                    console.error('Error loading QR image');
                    setQrError("Error al cargar la imagen del código QR. Por favor, inténtalo de nuevo.");
                    setQrCodeData(null);
                  }}
                  
                  onLoad={() => {
                    console.log('QR image loaded successfully');
                  }}
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
}