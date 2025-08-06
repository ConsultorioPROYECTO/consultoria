// src/lib/google-gmail.ts

import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import { 
  getGmailServiceAccountCredentials, 
  googleGmailConfig,
  type EmailOptions,
  type EmailSendResult,
  type EmailAttachment,
  type EmailRecipient
} from './config/google-gmail-config';

/**
 * Configuración del cliente de Gmail
 * Utiliza una cuenta de servicio para autenticación
 */
export class GoogleGmailService {
  public gmail: gmail_v1.Gmail; // Make gmail public for direct SDK access
  private auth: InstanceType<typeof google.auth.GoogleAuth>;
  private rateLimiter: Map<string, number> = new Map();

  constructor() {
    // Configurar autenticación con cuenta de servicio usando GoogleAuth
    const credentials = getGmailServiceAccountCredentials();
    
    this.auth = new google.auth.GoogleAuth({
      credentials: credentials || undefined,
      keyFile: credentials ? undefined : googleGmailConfig.serviceAccountKeyPath,
      scopes: googleGmailConfig.scopes,
    });

    // Inicializar el cliente de Gmail con autenticación
    this.gmail = google.gmail({
      version: 'v1',
      auth: this.auth,
    });
  }

  /**
   * Envía un email usando la Gmail API
   * @param emailOptions Opciones del email a enviar
   * @param impersonateUser Email del usuario a suplantar (para domain-wide delegation)
   * @returns Resultado del envío
   */
  public async sendEmail(
    emailOptions: EmailOptions, 
    impersonateUser?: string
  ): Promise<EmailSendResult> {
    try {
      // Verificar rate limiting
      await this.checkRateLimit();

      // Crear cliente con suplantación si es necesario
      const gmailClient = impersonateUser ? await this.getImpersonatedClient(impersonateUser) : this.gmail;
      
      // Construir el mensaje MIME
      const mimeMessage = this.buildMimeMessage(emailOptions);
      
      // Codificar en base64url
      const encodedMessage = Buffer.from(mimeMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Enviar el email
      const response = await gmailClient.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      const result: EmailSendResult = {
        success: true,
        messageId: response.data.id || undefined,
        timestamp: new Date(),
      };

      if (googleGmailConfig.logging.enabled) {
        console.log('Email sent successfully:', {
          messageId: result.messageId,
          to: emailOptions.to.map(r => r.email),
          subject: emailOptions.subject,
        });
      }

      return result;
    } catch (error) {
      const result: EmailSendResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };

      console.error('Error sending email:', {
        error: result.error,
        to: emailOptions.to.map(r => r.email),
        subject: emailOptions.subject,
      });

      return result;
    }
  }

  /**
   * Envía múltiples emails de forma secuencial con rate limiting
   * @param emailsList Lista de emails a enviar
   * @param impersonateUser Email del usuario a suplantar
   * @returns Array de resultados
   */
  public async sendBulkEmails(
    emailsList: EmailOptions[], 
    impersonateUser?: string
  ): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    
    for (const emailOptions of emailsList) {
      const result = await this.sendEmail(emailOptions, impersonateUser);
      results.push(result);
      
      // Esperar entre envíos para respetar rate limits
      if (emailsList.indexOf(emailOptions) < emailsList.length - 1) {
        await this.delay(1000 / googleGmailConfig.apiLimits.maxEmailsPerSecond);
      }
    }
    
    return results;
  }

  /**
   * Obtiene el perfil del usuario actual
   * @param impersonateUser Email del usuario a suplantar
   * @returns Perfil del usuario
   */
  public async getUserProfile(impersonateUser?: string) {
    try {
      const gmailClient = impersonateUser ? await this.getImpersonatedClient(impersonateUser) : this.gmail;
      const response = await gmailClient.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   * @returns Estado de la configuración
   */
  public async healthCheck(): Promise<{ isHealthy: boolean; error?: string }> {
    try {
      await this.getUserProfile();
      return { isHealthy: true };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Crea un cliente Gmail con suplantación de usuario (domain-wide delegation)
   * @param userEmail Email del usuario a suplantar
   * @returns Cliente Gmail configurado
   */
  private async getImpersonatedClient(userEmail: string): Promise<gmail_v1.Gmail> {
    const credentials = getGmailServiceAccountCredentials();
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials || undefined,
      keyFile: credentials ? undefined : googleGmailConfig.serviceAccountKeyPath,
      scopes: googleGmailConfig.scopes,
      clientOptions: {
        subject: userEmail, // Usuario a suplantar
      },
    });

    return google.gmail({
      version: 'v1',
      auth,
    });
  }

  /**
   * Construye el mensaje MIME para el email
   * @param emailOptions Opciones del email
   * @returns Mensaje MIME como string
   */
  private buildMimeMessage(emailOptions: EmailOptions): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const from = emailOptions.from || googleGmailConfig.defaultEmailSettings.from;
    const replyTo = emailOptions.replyTo || googleGmailConfig.defaultEmailSettings.replyTo;
    
    // Headers principales
    let mimeMessage = [
      `From: ${from}`,
      `To: ${this.formatRecipients(emailOptions.to)}`,
    ];

    if (emailOptions.cc && emailOptions.cc.length > 0) {
      mimeMessage.push(`Cc: ${this.formatRecipients(emailOptions.cc)}`);
    }

    if (emailOptions.bcc && emailOptions.bcc.length > 0) {
      mimeMessage.push(`Bcc: ${this.formatRecipients(emailOptions.bcc)}`);
    }

    if (replyTo) {
      mimeMessage.push(`Reply-To: ${replyTo}`);
    }

    mimeMessage.push(`Subject: ${emailOptions.subject}`);
    
    // Headers adicionales
    if (emailOptions.headers) {
      Object.entries(emailOptions.headers).forEach(([key, value]) => {
        mimeMessage.push(`${key}: ${value}`);
      });
    }

    // Prioridad
    if (emailOptions.priority) {
      const priorityMap = { high: '1', normal: '3', low: '5' };
      mimeMessage.push(`X-Priority: ${priorityMap[emailOptions.priority]}`);
    }

    // Content-Type
    if (emailOptions.attachments && emailOptions.attachments.length > 0) {
      mimeMessage.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    } else if (emailOptions.html && emailOptions.text) {
      mimeMessage.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    } else if (emailOptions.html) {
      mimeMessage.push(`Content-Type: text/html; charset=UTF-8`);
    } else {
      mimeMessage.push(`Content-Type: text/plain; charset=UTF-8`);
    }

    mimeMessage.push(''); // Línea vacía después de headers

    // Cuerpo del mensaje
    if (emailOptions.attachments && emailOptions.attachments.length > 0) {
      // Mensaje con adjuntos
      mimeMessage.push(`--${boundary}`);
      
      if (emailOptions.html && emailOptions.text) {
        // Multipart/alternative dentro de multipart/mixed
        const altBoundary = `alt_${boundary}`;
        mimeMessage.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
        mimeMessage.push('');
        
        mimeMessage.push(`--${altBoundary}`);
        mimeMessage.push('Content-Type: text/plain; charset=UTF-8');
        mimeMessage.push('');
        mimeMessage.push(emailOptions.text);
        mimeMessage.push('');
        
        mimeMessage.push(`--${altBoundary}`);
        mimeMessage.push('Content-Type: text/html; charset=UTF-8');
        mimeMessage.push('');
        mimeMessage.push(emailOptions.html);
        mimeMessage.push('');
        mimeMessage.push(`--${altBoundary}--`);
      } else if (emailOptions.html) {
        mimeMessage.push('Content-Type: text/html; charset=UTF-8');
        mimeMessage.push('');
        mimeMessage.push(emailOptions.html);
      } else if (emailOptions.text) {
        mimeMessage.push('Content-Type: text/plain; charset=UTF-8');
        mimeMessage.push('');
        mimeMessage.push(emailOptions.text);
      }
      
      // Adjuntos
      emailOptions.attachments.forEach(attachment => {
        mimeMessage.push('');
        mimeMessage.push(`--${boundary}`);
        mimeMessage.push(`Content-Type: ${attachment.contentType}`);
        mimeMessage.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        mimeMessage.push('Content-Transfer-Encoding: base64');
        mimeMessage.push('');
        
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64');
        
        // Dividir en líneas de 76 caracteres
        const lines = content.match(/.{1,76}/g) || [];
        mimeMessage.push(...lines);
      });
      
      mimeMessage.push('');
      mimeMessage.push(`--${boundary}--`);
    } else if (emailOptions.html && emailOptions.text) {
      // Multipart/alternative sin adjuntos
      mimeMessage.push(`--${boundary}`);
      mimeMessage.push('Content-Type: text/plain; charset=UTF-8');
      mimeMessage.push('');
      mimeMessage.push(emailOptions.text);
      mimeMessage.push('');
      
      mimeMessage.push(`--${boundary}`);
      mimeMessage.push('Content-Type: text/html; charset=UTF-8');
      mimeMessage.push('');
      mimeMessage.push(emailOptions.html);
      mimeMessage.push('');
      mimeMessage.push(`--${boundary}--`);
    } else {
      // Mensaje simple
      mimeMessage.push(emailOptions.html || emailOptions.text || '');
    }

    return mimeMessage.join('\r\n');
  }

  /**
   * Formatea la lista de destinatarios
   * @param recipients Lista de destinatarios
   * @returns String formateado
   */
  private formatRecipients(recipients: EmailRecipient[]): string {
    return recipients
      .map(recipient => 
        recipient.name 
          ? `"${recipient.name}" <${recipient.email}>`
          : recipient.email
      )
      .join(', ');
  }

  /**
   * Verifica y aplica rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = Math.floor(now / 1000) * 1000; // Ventana de 1 segundo
    const currentCount = this.rateLimiter.get(windowStart.toString()) || 0;
    
    if (currentCount >= googleGmailConfig.apiLimits.maxEmailsPerSecond) {
      const waitTime = 1000 - (now - windowStart);
      await this.delay(waitTime);
      return this.checkRateLimit(); // Recursivo para la siguiente ventana
    }
    
    this.rateLimiter.set(windowStart.toString(), currentCount + 1);
    
    // Limpiar ventanas antiguas
    for (const [key] of this.rateLimiter) {
      if (parseInt(key) < now - 5000) { // Mantener solo últimos 5 segundos
        this.rateLimiter.delete(key);
      }
    }
  }

  /**
   * Utilidad para esperar un tiempo determinado
   * @param ms Milisegundos a esperar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instancia singleton del servicio
export const googleGmailService = new GoogleGmailService();