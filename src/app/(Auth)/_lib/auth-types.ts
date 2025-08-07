/**
 * Tipos y interfaces compartidas para la autenticación
 */

/**
 * Parámetros de autenticación extraídos de la URL
 */
export interface AuthParams {
  invitacionCode: string | null;
  role: string | null;
}

/**
 * Roles válidos en el sistema
 */
export type UserRole = 'admin' | 'doctor' | 'patient' | 'staff';

/**
 * Estados de autenticación
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

/**
 * Errores comunes de autenticación
 */
export interface AuthError {
  code: string;
  message: string;
}

/**
 * Errores específicos de Firebase Auth
 */
export type FirebaseAuthErrorCode = 
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed'
  | 'auth/user-disabled'
  | 'auth/operation-not-allowed'
  | 'auth/invalid-credential'
  | 'auth/email-not-verified';

/**
 * Datos del formulario de login
 */
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Datos del formulario de registro
 */
export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  acceptTerms?: boolean;
}

/**
 * Configuración de redirección después de autenticación
 */
export interface AuthRedirectConfig {
  successUrl: string;
  errorUrl?: string;
  preserveParams?: boolean;
}

/**
 * Props comunes para componentes de autenticación
 */
export interface AuthComponentProps {
  invitacionCode?: string | null;
  role?: string | null;
  onSuccess?: (user: AuthUser) => void;
  onError?: (error: AuthError) => void;
}

/**
 * Estado del formulario de autenticación
 */
export interface AuthFormState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Configuración de validación de formularios
 */
export interface AuthValidationConfig {
  minPasswordLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  requireUppercase: boolean;
}

/**
 * Información del usuario después de autenticación
 */
export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  role?: UserRole;
  invitationCode?: string;
}

/**
 * Contexto de autenticación
 */
export interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}