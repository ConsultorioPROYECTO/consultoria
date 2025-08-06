// src/types/google-gmail.ts

import type { EmailOptions, EmailSendResult, EmailAttachment, EmailRecipient } from '../lib/config/google-gmail-config';

/**
 * Re-export types from config for easier imports
 */
export type {
  EmailOptions,
  EmailSendResult,
  EmailAttachment,
  EmailRecipient,
};

/**
 * Tipos específicos para templates de email
 */
export interface EmailTemplateData {
  [key: string]: any;
}

export interface EmailTemplateConfig {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  requiredVariables: string[];
  optionalVariables?: string[];
}

/**
 * Tipos para el sistema de colas de email
 */
export interface EmailQueueOptions {
  priority?: 'high' | 'normal' | 'low';
  delay?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number;
}

export interface EmailQueueItem {
  id: string;
  emailOptions: EmailOptions;
  queueOptions: EmailQueueOptions;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  retryCount: number;
  scheduledAt: Date;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

/**
 * Tipos para logging y auditoría
 */
export interface EmailLog {
  id: string;
  messageId?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  status: 'sent' | 'failed' | 'bounced' | 'delivered';
  timestamp: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Tipos para configuración de rate limiting
 */
export interface RateLimitConfig {
  maxEmailsPerSecond: number;
  maxEmailsPerMinute: number;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
}

export interface RateLimitStatus {
  currentSecond: number;
  currentMinute: number;
  currentHour: number;
  currentDay: number;
  isLimited: boolean;
  resetTime?: Date;
}

/**
 * Tipos para validación de emails
 */
export interface EmailValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Tipos para estadísticas de envío
 */
export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  averageDeliveryTime: number;
  lastSent?: Date;
  dailyCount: number;
  monthlyCount: number;
}

/**
 * Tipos para configuración de dominio
 */
export interface DomainConfig {
  domain: string;
  isVerified: boolean;
  dkimEnabled: boolean;
  spfRecord?: string;
  dmarcPolicy?: string;
  reputation: 'good' | 'neutral' | 'poor';
}

/**
 * Tipos para webhooks y callbacks
 */
export interface EmailWebhookEvent {
  type: 'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked';
  messageId: string;
  timestamp: Date;
  recipient: string;
  metadata?: Record<string, any>;
}

export interface EmailWebhookConfig {
  url: string;
  events: EmailWebhookEvent['type'][];
  secret?: string;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/**
 * Tipos para plantillas avanzadas
 */
export interface EmailTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface EmailTemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  variables: EmailTemplateVariable[];
  previewData?: EmailTemplateData;
}

/**
 * Tipos para configuración de autenticación
 */
export interface GmailAuthConfig {
  serviceAccountEmail: string;
  privateKey: string;
  clientEmail: string;
  projectId: string;
  impersonateUser?: string;
  scopes: string[];
}

/**
 * Tipos para respuestas de la API
 */
export interface GmailApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: Date;
    rateLimitRemaining?: number;
  };
}

/**
 * Tipos para configuración de batch operations
 */
export interface BatchEmailOptions {
  emails: EmailOptions[];
  batchSize?: number;
  delayBetweenBatches?: number;
  continueOnError?: boolean;
  progressCallback?: (sent: number, total: number, errors: number) => void;
}

export interface BatchEmailResult {
  totalEmails: number;
  successfulSends: number;
  failedSends: number;
  results: EmailSendResult[];
  duration: number;
  errors: Array<{
    index: number;
    email: EmailOptions;
    error: string;
  }>;
}

/**
 * Tipos para configuración de monitoreo
 */
export interface EmailMonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logDestination: 'console' | 'file' | 'database' | 'external';
  metricsEnabled: boolean;
  alertsEnabled: boolean;
  alertThresholds: {
    failureRate: number; // percentage
    dailyLimit: number;
    hourlyLimit: number;
  };
}

/**
 * Tipos para integración con otros servicios
 */
export interface EmailServiceIntegration {
  name: string;
  type: 'analytics' | 'crm' | 'marketing' | 'support';
  config: Record<string, any>;
  enabled: boolean;
  webhookUrl?: string;
}