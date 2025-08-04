'use client';

import { useEffect } from 'react';
import { Button } from '@rutas/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log del error para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard error:', error);
    }
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-4">
      <div className="flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-6 w-6" />
        <h2 className="text-xl font-semibold">Algo salió mal</h2>
      </div>
      
      <p className="text-center text-muted-foreground max-w-md">
        Ha ocurrido un error inesperado en el dashboard. 
        Por favor, intenta recargar la página.
      </p>
      
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 p-4 bg-muted rounded-lg max-w-lg">
          <summary className="cursor-pointer font-medium">Detalles del error</summary>
          <pre className="mt-2 text-xs overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      
      <Button 
        onClick={reset}
        className="mt-4"
        variant="outline"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Intentar de nuevo
      </Button>
    </div>
  );
}