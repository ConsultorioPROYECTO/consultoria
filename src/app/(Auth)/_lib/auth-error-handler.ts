/**
 * Utilidades para el manejo de errores de autenticación
 */

import { toast } from 'sonner';
import type { FirebaseAuthErrorCode, AuthError } from './auth-types';

/**
 * Mapeo de códigos de error de Firebase a mensajes amigables
 */
const ERROR_MESSAGES: Record<FirebaseAuthErrorCode, { title: string; description: string }> = {
  'auth/email-already-in-use': {
    title: 'Correo ya registrado',
    description: 'Este correo electrónico ya está registrado. Intenta iniciar sesión o usa otro correo.'
  },
  'auth/weak-password': {
    title: 'Contraseña débil',
    description: 'La contraseña debe tener al menos 6 caracteres.'
  },
  'auth/invalid-email': {
    title: 'Correo inválido',
    description: 'El formato del correo electrónico no es válido.'
  },
  'auth/user-not-found': {
    title: 'Credenciales incorrectas',
    description: 'El correo electrónico o la contraseña son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.'
  },
  'auth/wrong-password': {
    title: 'Credenciales incorrectas',
    description: 'El correo electrónico o la contraseña son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.'
  },
  'auth/invalid-credential': {
    title: 'Credenciales incorrectas',
    description: 'El correo electrónico o la contraseña son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.'
  },
  'auth/user-disabled': {
    title: 'Cuenta deshabilitada',
    description: 'Esta cuenta ha sido deshabilitada. Contacta al soporte para más información.'
  },
  'auth/too-many-requests': {
    title: 'Demasiados intentos',
    description: 'Has realizado demasiados intentos fallidos. Espera un momento antes de intentar de nuevo.'
  },
  'auth/network-request-failed': {
    title: 'Error de conexión',
    description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
  },
  'auth/operation-not-allowed': {
    title: 'Operación no permitida',
    description: 'Esta operación no está habilitada. Contacta al soporte.'
  }
};

/**
 * Maneja errores de autenticación y muestra toasts apropiados
 * @param error - Error de autenticación
 * @param context - Contexto adicional (login, signup, etc.)
 */
export function handleAuthError(error: unknown): void {
  if (error && typeof error === 'object' && 'code' in error) {
    const authError = error as { code: FirebaseAuthErrorCode; message: string };
    const errorInfo = ERROR_MESSAGES[authError.code];
    
    if (errorInfo) {
      toast.error(errorInfo.title, {
        description: errorInfo.description,
        descriptionClassName: 'text-foreground'
      });
    } else {
      // Error no mapeado
      toast.error('Error de autenticación', {
        description: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.',
        descriptionClassName: 'text-foreground'
      });
    }
  } else {
    // Error de conexión u otro tipo
    toast.error('Error de conexión', {
      description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      descriptionClassName: 'text-foreground'
    });
  }
  
  // Error logging removed to avoid console noise
}

/**
 * Valida si un error es de tipo Firebase Auth
 * @param error - Error a validar
 * @returns true si es un error de Firebase Auth
 */
export function isFirebaseAuthError(error: unknown): error is { code: FirebaseAuthErrorCode; message: string } {
  return error !== null && 
         typeof error === 'object' && 
         'code' in error && 
         typeof (error as { code: unknown }).code === 'string' &&
         (error as { code: string }).code.startsWith('auth/');
}

/**
 * Crea un objeto AuthError normalizado
 * @param error - Error original
 * @returns Objeto AuthError normalizado
 */
export function normalizeAuthError(error: unknown): AuthError {
  if (isFirebaseAuthError(error)) {
    const errorInfo = ERROR_MESSAGES[error.code];
    return {
      code: error.code,
      message: errorInfo?.description || error.message || 'Error de autenticación desconocido'
    };
  }
  
  return {
    code: 'unknown',
    message: 'Error de conexión o servidor'
  };
}