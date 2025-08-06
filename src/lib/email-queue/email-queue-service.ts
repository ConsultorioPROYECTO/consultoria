// src/lib/email-queue/email-queue-service.ts

import { googleGmailService } from '../google-gmail';
import { emailTemplateEngine } from '../email-templates/email-template-engine';
import type {
  EmailOptions,
  EmailQueueItem,
  EmailQueueOptions,
  EmailSendResult,
  BatchEmailOptions,
  BatchEmailResult,
  EmailTemplateData
} from '../../types/google-gmail';
import { googleGmailConfig } from '../config/google-gmail-config';

/**
 * Servicio de cola de emails para manejo asíncrono y con reintentos
 */
export class EmailQueueService {
  private queue: Map<string, EmailQueueItem> = new Map();
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL = 1000; // 1 segundo

  constructor() {
    this.startProcessing();
  }

  /**
   * Añade un email a la cola
   * @param emailOptions Opciones del email
   * @param queueOptions Opciones de la cola
   * @param impersonateUser Usuario a suplantar
   * @returns ID del item en la cola
   */
  public async addToQueue(
    emailOptions: EmailOptions,
    queueOptions: EmailQueueOptions = {},
    impersonateUser?: string
  ): Promise<string> {
    const id = this.generateId();
    const now = new Date();
    const scheduledAt = queueOptions.delay 
      ? new Date(now.getTime() + queueOptions.delay)
      : now;

    const queueItem: EmailQueueItem = {
      id,
      emailOptions: {
        ...emailOptions,
        headers: {
          ...emailOptions.headers,
          'X-Queue-Id': id,
          'X-Impersonate-User': impersonateUser || '',
        },
      },
      queueOptions: {
        priority: 'normal',
        maxRetries: googleGmailConfig.retrySettings.maxRetries,
        retryDelay: googleGmailConfig.retrySettings.retryDelay,
        ...queueOptions,
      },
      status: 'pending',
      retryCount: 0,
      scheduledAt,
      createdAt: now,
    };

    this.queue.set(id, queueItem);
    
    if (googleGmailConfig.logging.enabled) {
      console.log(`Email added to queue: ${id}`, {
        to: emailOptions.to.map(r => r.email),
        subject: emailOptions.subject,
        scheduledAt,
      });
    }

    return id;
  }

  /**
   * Añade un email usando una plantilla
   * @param templateName Nombre de la plantilla
   * @param templateData Datos para la plantilla
   * @param recipients Destinatarios
   * @param queueOptions Opciones de la cola
   * @param impersonateUser Usuario a suplantar
   * @returns ID del item en la cola
   */
  public async addTemplateToQueue(
    templateName: string,
    templateData: EmailTemplateData,
    recipients: EmailOptions['to'],
    queueOptions: EmailQueueOptions = {},
    impersonateUser?: string
  ): Promise<string> {
    const templateResult = emailTemplateEngine.renderTemplate(templateName, templateData);
    
    const emailOptions: EmailOptions = {
      to: recipients,
      subject: templateResult.subject!,
      html: templateResult.html,
      text: templateResult.text,
    };

    return this.addToQueue(emailOptions, queueOptions, impersonateUser);
  }

  /**
   * Procesa emails en lote
   * @param batchOptions Opciones del lote
   * @param impersonateUser Usuario a suplantar
   * @returns Resultado del procesamiento en lote
   */
  public async processBatch(
    batchOptions: BatchEmailOptions,
    impersonateUser?: string
  ): Promise<BatchEmailResult> {
    const startTime = Date.now();
    const results: EmailSendResult[] = [];
    const errors: BatchEmailResult['errors'] = [];
    let successfulSends = 0;
    let failedSends = 0;

    const batchSize = batchOptions.batchSize || 10;
    const delayBetweenBatches = batchOptions.delayBetweenBatches || 1000;

    // Procesar en lotes
    for (let i = 0; i < batchOptions.emails.length; i += batchSize) {
      const batch = batchOptions.emails.slice(i, i + batchSize);
      
      // Procesar lote actual
      const batchPromises = batch.map(async (emailOptions, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const result = await googleGmailService.sendEmail(emailOptions, impersonateUser);
          results[globalIndex] = result;
          
          if (result.success) {
            successfulSends++;
          } else {
            failedSends++;
            errors.push({
              index: globalIndex,
              email: emailOptions,
              error: result.error || 'Unknown error',
            });
          }
          
          // Callback de progreso
          if (batchOptions.progressCallback) {
            batchOptions.progressCallback(successfulSends, batchOptions.emails.length, failedSends);
          }
          
          return result;
        } catch (error) {
          failedSends++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          const failedResult: EmailSendResult = {
            success: false,
            error: errorMessage,
            timestamp: new Date(),
          };
          
          results[globalIndex] = failedResult;
          errors.push({
            index: globalIndex,
            email: emailOptions,
            error: errorMessage,
          });
          
          if (batchOptions.progressCallback) {
            batchOptions.progressCallback(successfulSends, batchOptions.emails.length, failedSends);
          }
          
          if (!batchOptions.continueOnError) {
            throw error;
          }
          
          return failedResult;
        }
      });

      // Esperar a que termine el lote actual
      await Promise.all(batchPromises);
      
      // Esperar entre lotes (excepto en el último)
      if (i + batchSize < batchOptions.emails.length) {
        await this.delay(delayBetweenBatches);
      }
    }

    const duration = Date.now() - startTime;

    return {
      totalEmails: batchOptions.emails.length,
      successfulSends,
      failedSends,
      results,
      duration,
      errors,
    };
  }

  /**
   * Obtiene el estado de un item en la cola
   * @param id ID del item
   * @returns Item de la cola o undefined
   */
  public getQueueItem(id: string): EmailQueueItem | undefined {
    return this.queue.get(id);
  }

  /**
   * Obtiene todos los items de la cola con un estado específico
   * @param status Estado a filtrar
   * @returns Array de items
   */
  public getQueueItemsByStatus(status: EmailQueueItem['status']): EmailQueueItem[] {
    return Array.from(this.queue.values()).filter(item => item.status === status);
  }

  /**
   * Cancela un item de la cola
   * @param id ID del item
   * @returns true si se canceló, false si no se encontró
   */
  public cancelQueueItem(id: string): boolean {
    const item = this.queue.get(id);
    if (item && item.status === 'pending') {
      item.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Limpia items completados de la cola
   * @param olderThanHours Items más antiguos que X horas
   */
  public cleanupQueue(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [id, item] of this.queue) {
      if (
        (item.status === 'sent' || item.status === 'failed' || item.status === 'cancelled') &&
        item.createdAt < cutoffTime
      ) {
        this.queue.delete(id);
        removedCount++;
      }
    }

    if (googleGmailConfig.logging.enabled && removedCount > 0) {
      console.log(`Cleaned up ${removedCount} queue items older than ${olderThanHours} hours`);
    }

    return removedCount;
  }

  /**
   * Obtiene estadísticas de la cola
   * @returns Estadísticas
   */
  public getQueueStats() {
    const items = Array.from(this.queue.values());
    
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      sent: items.filter(i => i.status === 'sent').length,
      failed: items.filter(i => i.status === 'failed').length,
      cancelled: items.filter(i => i.status === 'cancelled').length,
      oldestPending: items
        .filter(i => i.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]?.createdAt,
    };
  }

  /**
   * Detiene el procesamiento de la cola
   */
  public stopProcessing(): void {
    this.processing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Inicia el procesamiento de la cola
   */
  public startProcessing(): void {
    if (this.processing) return;
    
    this.processing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('Error processing email queue:', error);
      });
    }, this.PROCESSING_INTERVAL);
  }

  /**
   * Procesa la cola de emails
   */
  private async processQueue(): Promise<void> {
    if (!this.processing) return;

    const now = new Date();
    const pendingItems = Array.from(this.queue.values())
      .filter(item => 
        item.status === 'pending' && 
        item.scheduledAt <= now
      )
      .sort((a, b) => {
        // Ordenar por prioridad y luego por fecha de creación
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const aPriority = priorityOrder[a.queueOptions.priority || 'normal'];
        const bPriority = priorityOrder[b.queueOptions.priority || 'normal'];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    // Procesar un item a la vez para respetar rate limits
    if (pendingItems.length > 0) {
      const item = pendingItems[0];
      await this.processQueueItem(item);
    }
  }

  /**
   * Procesa un item individual de la cola
   * @param item Item a procesar
   */
  private async processQueueItem(item: EmailQueueItem): Promise<void> {
    item.status = 'processing';
    
    try {
      const impersonateUser = item.emailOptions.headers?.['X-Impersonate-User'] || undefined;
      const cleanEmailOptions = { ...item.emailOptions };
      
      // Limpiar headers internos
      if (cleanEmailOptions.headers) {
        delete cleanEmailOptions.headers['X-Queue-Id'];
        delete cleanEmailOptions.headers['X-Impersonate-User'];
      }
      
      const result = await googleGmailService.sendEmail(cleanEmailOptions, impersonateUser);
      
      if (result.success) {
        item.status = 'sent';
        item.processedAt = new Date();
        
        if (googleGmailConfig.logging.enabled) {
          console.log(`Email sent from queue: ${item.id}`, {
            messageId: result.messageId,
            to: item.emailOptions.to.map(r => r.email),
          });
        }
      } else {
        await this.handleFailedQueueItem(item, result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.handleFailedQueueItem(item, errorMessage);
    }
  }

  /**
   * Maneja un item fallido de la cola
   * @param item Item que falló
   * @param error Error ocurrido
   */
  private async handleFailedQueueItem(item: EmailQueueItem, error: string): Promise<void> {
    item.retryCount++;
    
    const maxRetries = item.queueOptions.maxRetries || googleGmailConfig.retrySettings.maxRetries;
    
    if (item.retryCount < maxRetries) {
      // Programar reintento
      const retryDelay = item.queueOptions.retryDelay || googleGmailConfig.retrySettings.retryDelay;
      const backoffMultiplier = googleGmailConfig.retrySettings.exponentialBackoff ? item.retryCount : 1;
      const delay = retryDelay * backoffMultiplier;
      
      item.status = 'pending';
      item.scheduledAt = new Date(Date.now() + delay);
      
      if (googleGmailConfig.logging.enabled) {
        console.log(`Email retry scheduled: ${item.id} (attempt ${item.retryCount}/${maxRetries})`, {
          error,
          nextAttempt: item.scheduledAt,
        });
      }
    } else {
      // Marcar como fallido permanentemente
      item.status = 'failed';
      item.processedAt = new Date();
      
      console.error(`Email permanently failed: ${item.id}`, {
        error,
        retryCount: item.retryCount,
        to: item.emailOptions.to.map(r => r.email),
      });
    }
  }

  /**
   * Genera un ID único para items de la cola
   * @returns ID único
   */
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utilidad para esperar un tiempo determinado
   * @param ms Milisegundos a esperar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia singleton del servicio de cola
export const emailQueueService = new EmailQueueService();