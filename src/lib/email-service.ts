// src/lib/email-service.ts

import { googleGmailService } from './google-gmail';
import { emailTemplateEngine } from './email-templates/email-template-engine';
import { emailQueueService } from './email-queue/email-queue-service';
import { validateGoogleGmailConfig } from './config/google-gmail-config';
import type {
  EmailOptions,
  EmailSendResult,
  EmailTemplateData,
  BatchEmailOptions,
  BatchEmailResult,
  EmailQueueOptions,
  EmailValidationResult,
  EmailStats
} from '../types/google-gmail';

/**
 * Servicio principal de email que integra Gmail API, plantillas y cola
 * Proporciona una API unificada para todas las operaciones de email
 */
export class EmailService {
  private stats: EmailStats = {
    totalSent: 0,
    totalFailed: 0,
    successRate: 0,
    averageDeliveryTime: 0,
    dailyCount: 0,
    monthlyCount: 0,
  };

  constructor() {
    // Validar configuración al inicializar
    this.validateConfiguration();
  }

  /**
   * Envía un email inmediatamente
   * @param emailOptions Opciones del email
   * @param impersonateUser Usuario a suplantar (para domain-wide delegation)
   * @returns Resultado del envío
   */
  public async sendEmail(
    emailOptions: EmailOptions,
    impersonateUser?: string
  ): Promise<EmailSendResult> {
    const validation = this.validateEmail(emailOptions);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();
    const result = await googleGmailService.sendEmail(emailOptions, impersonateUser);
    const deliveryTime = Date.now() - startTime;

    // Actualizar estadísticas
    this.updateStats(result, deliveryTime);

    return result;
  }

  /**
   * Envía un email usando una plantilla
   * @param templateName Nombre de la plantilla
   * @param templateData Datos para la plantilla
   * @param recipients Destinatarios
   * @param additionalOptions Opciones adicionales del email
   * @param impersonateUser Usuario a suplantar
   * @returns Resultado del envío
   */
  public async sendTemplateEmail(
    templateName: string,
    templateData: EmailTemplateData,
    recipients: EmailOptions['to'],
    additionalOptions: Partial<EmailOptions> = {},
    impersonateUser?: string
  ): Promise<EmailSendResult> {
    try {
      const templateResult = emailTemplateEngine.renderTemplate(templateName, templateData);
      
      const emailOptions: EmailOptions = {
        to: recipients,
        subject: templateResult.subject!,
        html: templateResult.html,
        text: templateResult.text,
        ...additionalOptions,
      };

      return this.sendEmail(emailOptions, impersonateUser);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template rendering failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Añade un email a la cola para envío asíncrono
   * @param emailOptions Opciones del email
   * @param queueOptions Opciones de la cola
   * @param impersonateUser Usuario a suplantar
   * @returns ID del item en la cola
   */
  public async queueEmail(
    emailOptions: EmailOptions,
    queueOptions: EmailQueueOptions = {},
    impersonateUser?: string
  ): Promise<string> {
    const validation = this.validateEmail(emailOptions);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return emailQueueService.addToQueue(emailOptions, queueOptions, impersonateUser);
  }

  /**
   * Añade un email con plantilla a la cola
   * @param templateName Nombre de la plantilla
   * @param templateData Datos para la plantilla
   * @param recipients Destinatarios
   * @param queueOptions Opciones de la cola
   * @param impersonateUser Usuario a suplantar
   * @returns ID del item en la cola
   */
  public async queueTemplateEmail(
    templateName: string,
    templateData: EmailTemplateData,
    recipients: EmailOptions['to'],
    queueOptions: EmailQueueOptions = {},
    impersonateUser?: string
  ): Promise<string> {
    return emailQueueService.addTemplateToQueue(
      templateName,
      templateData,
      recipients,
      queueOptions,
      impersonateUser
    );
  }

  /**
   * Envía múltiples emails en lote
   * @param batchOptions Opciones del lote
   * @param impersonateUser Usuario a suplantar
   * @returns Resultado del procesamiento en lote
   */
  public async sendBulkEmails(
    batchOptions: BatchEmailOptions,
    impersonateUser?: string
  ): Promise<BatchEmailResult> {
    // Validar todos los emails antes de enviar
    const validationErrors: string[] = [];
    batchOptions.emails.forEach((email, index) => {
      const validation = this.validateEmail(email);
      if (!validation.isValid) {
        validationErrors.push(`Email ${index}: ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      throw new Error(`Batch validation failed: ${validationErrors.join('; ')}`);
    }

    const result = await emailQueueService.processBatch(batchOptions, impersonateUser);
    
    // Actualizar estadísticas
    result.results.forEach(emailResult => {
      this.updateStats(emailResult, 0); // No tenemos tiempo de entrega individual
    });

    return result;
  }

  /**
   * Obtiene el estado de un email en la cola
   * @param queueId ID del item en la cola
   * @returns Estado del item o undefined
   */
  public getQueueStatus(queueId: string) {
    return emailQueueService.getQueueItem(queueId);
  }

  /**
   * Cancela un email en la cola
   * @param queueId ID del item en la cola
   * @returns true si se canceló, false si no se encontró
   */
  public cancelQueuedEmail(queueId: string): boolean {
    return emailQueueService.cancelQueueItem(queueId);
  }

  /**
   * Obtiene estadísticas de la cola
   * @returns Estadísticas de la cola
   */
  public getQueueStats() {
    return emailQueueService.getQueueStats();
  }

  /**
   * Obtiene estadísticas generales del servicio
   * @returns Estadísticas del servicio
   */
  public getServiceStats(): EmailStats {
    return { ...this.stats };
  }

  /**
   * Limpia la cola de emails completados
   * @param olderThanHours Items más antiguos que X horas
   * @returns Número de items eliminados
   */
  public cleanupQueue(olderThanHours: number = 24): number {
    return emailQueueService.cleanupQueue(olderThanHours);
  }

  /**
   * Verifica el estado de salud del servicio
   * @returns Estado de salud
   */
  public async healthCheck(): Promise<{
    isHealthy: boolean;
    services: {
      gmail: { isHealthy: boolean; error?: string };
      queue: { isHealthy: boolean; stats: any };
      templates: { isHealthy: boolean; count: number };
    };
    configuration: { isValid: boolean; errors: string[] };
  }> {
    const gmailHealth = await googleGmailService.healthCheck();
    const queueStats = emailQueueService.getQueueStats();
    const templates = emailTemplateEngine.getTemplates();
    const configValidation = validateGoogleGmailConfig();

    return {
      isHealthy: gmailHealth.isHealthy && configValidation.isValid,
      services: {
        gmail: gmailHealth,
        queue: {
          isHealthy: true,
          stats: queueStats,
        },
        templates: {
          isHealthy: true,
          count: templates.length,
        },
      },
      configuration: {
        isValid: configValidation.isValid,
        errors: [...configValidation.missingVars, ...configValidation.errors],
      },
    };
  }

  /**
   * Registra una nueva plantilla de email
   * @param template Configuración de la plantilla
   */
  public registerTemplate(template: {
    name: string;
    subject: string;
    htmlTemplate: string;
    textTemplate?: string;
    requiredVariables: string[];
    optionalVariables?: string[];
  }): void {
    emailTemplateEngine.registerTemplate(template);
  }

  /**
   * Obtiene la lista de plantillas disponibles
   * @returns Array de metadatos de plantillas
   */
  public getAvailableTemplates() {
    return emailTemplateEngine.getTemplates();
  }

  /**
   * Previsualiza una plantilla con datos de prueba
   * @param templateName Nombre de la plantilla
   * @param templateData Datos para la plantilla
   * @returns Email renderizado
   */
  public previewTemplate(templateName: string, templateData: EmailTemplateData) {
    return emailTemplateEngine.renderTemplate(templateName, templateData);
  }

  /**
   * Valida las opciones de un email
   * @param emailOptions Opciones a validar
   * @returns Resultado de la validación
   */
  private validateEmail(emailOptions: EmailOptions): EmailValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar destinatarios
    if (!emailOptions.to || emailOptions.to.length === 0) {
      errors.push('At least one recipient is required');
    } else {
      emailOptions.to.forEach((recipient, index) => {
        if (!this.isValidEmail(recipient.email)) {
          errors.push(`Invalid email address in 'to' field at index ${index}: ${recipient.email}`);
        }
      });
    }

    // Validar CC
    if (emailOptions.cc) {
      emailOptions.cc.forEach((recipient, index) => {
        if (!this.isValidEmail(recipient.email)) {
          errors.push(`Invalid email address in 'cc' field at index ${index}: ${recipient.email}`);
        }
      });
    }

    // Validar BCC
    if (emailOptions.bcc) {
      emailOptions.bcc.forEach((recipient, index) => {
        if (!this.isValidEmail(recipient.email)) {
          errors.push(`Invalid email address in 'bcc' field at index ${index}: ${recipient.email}`);
        }
      });
    }

    // Validar subject
    if (!emailOptions.subject || emailOptions.subject.trim().length === 0) {
      errors.push('Subject is required');
    } else if (emailOptions.subject.length > 998) {
      errors.push('Subject is too long (max 998 characters)');
    }

    // Validar contenido
    if (!emailOptions.html && !emailOptions.text) {
      errors.push('Either HTML or text content is required');
    }

    // Validar from
    if (emailOptions.from && !this.isValidEmail(emailOptions.from)) {
      errors.push(`Invalid 'from' email address: ${emailOptions.from}`);
    }

    // Validar replyTo
    if (emailOptions.replyTo && !this.isValidEmail(emailOptions.replyTo)) {
      errors.push(`Invalid 'replyTo' email address: ${emailOptions.replyTo}`);
    }

    // Validar adjuntos
    if (emailOptions.attachments) {
      emailOptions.attachments.forEach((attachment, index) => {
        if (!attachment.filename || attachment.filename.trim().length === 0) {
          errors.push(`Attachment at index ${index} is missing filename`);
        }
        if (!attachment.content) {
          errors.push(`Attachment at index ${index} is missing content`);
        }
        if (!attachment.contentType) {
          errors.push(`Attachment at index ${index} is missing contentType`);
        }
      });
    }

    // Advertencias
    const totalRecipients = (emailOptions.to?.length || 0) + 
                           (emailOptions.cc?.length || 0) + 
                           (emailOptions.bcc?.length || 0);
    
    if (totalRecipients > 100) {
      warnings.push('Large number of recipients may trigger rate limits');
    }

    if (emailOptions.subject && emailOptions.subject.length > 50) {
      warnings.push('Long subject lines may be truncated in some email clients');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Valida el formato de una dirección de email
   * @param email Email a validar
   * @returns true si es válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida la configuración del servicio
   */
  private validateConfiguration(): void {
    const validation = validateGoogleGmailConfig();
    if (!validation.isValid) {
      console.warn('Gmail service configuration issues:', {
        missingVars: validation.missingVars,
        errors: validation.errors,
      });
    }
  }

  /**
   * Actualiza las estadísticas del servicio
   * @param result Resultado del envío
   * @param deliveryTime Tiempo de entrega en ms
   */
  private updateStats(result: EmailSendResult, deliveryTime: number): void {
    if (result.success) {
      this.stats.totalSent++;
      this.stats.lastSent = result.timestamp;
    } else {
      this.stats.totalFailed++;
    }

    const total = this.stats.totalSent + this.stats.totalFailed;
    this.stats.successRate = total > 0 ? (this.stats.totalSent / total) * 100 : 0;

    // Actualizar tiempo promedio de entrega (solo para envíos exitosos)
    if (result.success && deliveryTime > 0) {
      this.stats.averageDeliveryTime = 
        (this.stats.averageDeliveryTime + deliveryTime) / 2;
    }

    // Actualizar contadores diarios y mensuales
    const today = new Date().toDateString();
    const thisMonth = new Date().toISOString().slice(0, 7);
    
    // Nota: En una implementación real, estos contadores deberían persistirse
    // y resetearse apropiadamente. Aquí es una implementación simplificada.
    this.stats.dailyCount++;
    this.stats.monthlyCount++;
  }
}

// Instancia singleton del servicio de email
export const emailService = new EmailService();

// Re-exportar tipos para facilitar el uso
export type {
  EmailOptions,
  EmailSendResult,
  EmailTemplateData,
  BatchEmailOptions,
  BatchEmailResult,
  EmailQueueOptions,
} from '../types/google-gmail';