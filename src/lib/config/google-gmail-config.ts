// src/lib/config/google-gmail-config.ts

/**
 * Configuración para Gmail API
 */
export const googleGmailConfig = {
  // Ruta al archivo de credenciales de la cuenta de servicio
  serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '',
  
  // Contenido del archivo de credenciales como JSON string (alternativa)
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '',
  
  // Scopes necesarios para Gmail API
  scopes: [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose',
  ],
  
  // Configuración por defecto para emails
  defaultEmailSettings: {
    from: process.env.GMAIL_DEFAULT_FROM || '',
    replyTo: process.env.GMAIL_DEFAULT_REPLY_TO || '',
    charset: 'UTF-8',
    encoding: 'base64url',
  },
  
  // Configuración de plantillas
  templateSettings: {
    defaultLanguage: 'es',
    templatesPath: 'src/lib/email-templates',
  },
  
  // Límites de la API
  apiLimits: {
    maxRecipientsPerEmail: 100,
    maxEmailsPerSecond: 5,
    maxEmailsPerDay: 1000000000, // Límite muy alto para cuentas de servicio
    maxAttachmentSize: 25 * 1024 * 1024, // 25MB
  },
  
  // Configuración de reintentos
  retrySettings: {
    maxRetries: 3,
    retryDelay: 1000, // 1 segundo
    exponentialBackoff: true,
  },
  
  // Configuración de logging
  logging: {
    enabled: process.env.NODE_ENV !== 'production',
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    logEmails: process.env.NODE_ENV === 'development',
  },
};

/**
 * Validar que las variables de entorno necesarias estén configuradas
 */
export function validateGoogleGmailConfig(): {
  isValid: boolean;
  missingVars: string[];
  errors: string[];
} {
  const missingVars: string[] = [];
  const errors: string[] = [];
  
  // Verificar que al menos una forma de credenciales esté configurada
  if (!googleGmailConfig.serviceAccountKeyPath && !googleGmailConfig.serviceAccountKey) {
    missingVars.push('GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_KEY');
  }
  
  // Verificar email por defecto
  if (!googleGmailConfig.defaultEmailSettings.from) {
    missingVars.push('GMAIL_DEFAULT_FROM');
  }
  
  // Validar formato de email
  if (googleGmailConfig.defaultEmailSettings.from && !isValidEmail(googleGmailConfig.defaultEmailSettings.from)) {
    errors.push('GMAIL_DEFAULT_FROM must be a valid email address');
  }
  
  if (googleGmailConfig.defaultEmailSettings.replyTo && !isValidEmail(googleGmailConfig.defaultEmailSettings.replyTo)) {
    errors.push('GMAIL_DEFAULT_REPLY_TO must be a valid email address');
  }
  
  // Si se usa serviceAccountKey, verificar que sea un JSON válido
  if (googleGmailConfig.serviceAccountKey) {
    try {
      JSON.parse(googleGmailConfig.serviceAccountKey);
    } catch {
      errors.push('GOOGLE_SERVICE_ACCOUNT_KEY must be a valid JSON string');
    }
  }
  
  return {
    isValid: missingVars.length === 0 && errors.length === 0,
    missingVars,
    errors,
  };
}

/**
 * Obtener las credenciales de la cuenta de servicio
 */
export function getGmailServiceAccountCredentials(): GoogleGmailCredentials | null {
  if (googleGmailConfig.serviceAccountKey) {
    try {
      return JSON.parse(googleGmailConfig.serviceAccountKey);
    } catch (error) {
      console.log(error);
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format');
    }
  }
  
  if (googleGmailConfig.serviceAccountKeyPath) {
    // Si se usa la ruta del archivo, se manejará en google-gmail.ts
    return null;
  }
  
  throw new Error('No Google service account credentials configured');
}

/**
 * Validar formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Tipos para TypeScript
 */
export interface GoogleGmailCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  encoding?: 'base64' | 'base64url';
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface EmailQueueItem {
  id: string;
  emailOptions: EmailOptions;
  retryCount: number;
  scheduledAt: Date;
  createdAt: Date;
}