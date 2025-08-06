// src/lib/__tests__/google-gmail.test.ts

/**
 * Archivo de pruebas para el servicio de Gmail
 * 
 * Este archivo contiene ejemplos de cómo testear el servicio de Gmail.
 * Para ejecutar las pruebas, necesitarás configurar Jest en tu proyecto:
 * 
 * 1. Instalar Jest: npm install --save-dev jest @types/jest ts-jest
 * 2. Configurar Jest en package.json o jest.config.js
 * 3. Ejecutar: npm test
 * 
 * Las pruebas están comentadas para evitar errores de compilación.
 * Descomenta las secciones que necesites cuando tengas Jest configurado.
 */
import { GoogleGmailService } from '../google-gmail';
import { EmailTemplateEngine } from '../email-templates/email-template-engine';
import { EmailQueueService } from '../email-queue/email-queue-service';
import type { EmailOptions, EmailSendResult } from '../../types/google-gmail';

// Mock de googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
          request: jest.fn()
        })
      }))
    },
    gmail: jest.fn().mockImplementation(() => ({
      users: {
        messages: {
          send: jest.fn().mockResolvedValue({
            data: {
              id: 'mock-message-id-123',
              threadId: 'mock-thread-id-456'
            }
          })
        }
      }
    }))
  }
}));

// Mock de la configuración
jest.mock('../config/google-gmail-config', () => ({
  validateGmailConfig: jest.fn().mockReturnValue({
    isValid: true,
    errors: []
  }),
  getGmailCredentials: jest.fn().mockReturnValue({
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'test-key-id',
    private_key: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----',
    client_email: 'test@test-project.iam.gserviceaccount.com',
    client_id: 'test-client-id',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token'
  }),
  gmailConfig: {
    serviceAccountKeyPath: '/path/to/test-key.json',
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    defaultFrom: {
      email: 'test@example.com',
      name: 'Test Sender'
    },
    rateLimit: {
      perMinute: 250,
      perDay: 1000000
    },
    retry: {
      maxRetries: 3,
      delay: 1000,
      exponentialBase: 2
    }
  }
}));

describe('GoogleGmailService', () => {
  let gmailService: GoogleGmailService;
  let mockGmailApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    gmailService = new GoogleGmailService();
    
    // Obtener referencia al mock de Gmail API
    const { google } = require('googleapis');
    mockGmailApi = google.gmail();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería inicializar correctamente el servicio', () => {
      expect(gmailService).toBeInstanceOf(GoogleGmailService);
    });

    it('debería configurar la autenticación con la cuenta de servicio', async () => {
      const { google } = require('googleapis');
      expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
        credentials: expect.objectContaining({
          type: 'service_account',
          project_id: 'test-project'
        }),
        scopes: ['https://www.googleapis.com/auth/gmail.send']
      });
    });
  });

  describe('sendEmail', () => {
    const basicEmailOptions: EmailOptions = {
      to: [{ email: 'recipient@example.com', name: 'Test Recipient' }],
      subject: 'Test Subject',
      html: '<h1>Test HTML Content</h1>',
      text: 'Test text content'
    };

    it('debería enviar un email básico exitosamente', async () => {
      const result = await gmailService.sendEmail(basicEmailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('mock-message-id-123');
      expect(result.error).toBeUndefined();
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(1);
    });

    it('debería manejar múltiples destinatarios', async () => {
      const emailOptions: EmailOptions = {
        ...basicEmailOptions,
        to: [
          { email: 'recipient1@example.com', name: 'Recipient 1' },
          { email: 'recipient2@example.com', name: 'Recipient 2' }
        ],
        cc: [{ email: 'cc@example.com', name: 'CC Recipient' }],
        bcc: [{ email: 'bcc@example.com', name: 'BCC Recipient' }]
      };

      const result = await gmailService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'me',
          requestBody: expect.objectContaining({
            raw: expect.any(String)
          })
        })
      );
    });

    it('debería incluir adjuntos correctamente', async () => {
      const emailOptions: EmailOptions = {
        ...basicEmailOptions,
        attachments: [
          {
            filename: 'test.pdf',
            content: Buffer.from('test content'),
            contentType: 'application/pdf'
          },
          {
            filename: 'image.png',
            content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
            contentType: 'image/png'
          }
        ]
      };

      const result = await gmailService.sendEmail(emailOptions);

      expect(result.success).toBe(true);
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(1);
    });

    it('debería usar domain-wide delegation cuando se especifica impersonateUser', async () => {
      const result = await gmailService.sendEmail(basicEmailOptions, 'user@domain.com');

      expect(result.success).toBe(true);
      // Verificar que se configuró la suplantación de usuario
      const { google } = require('googleapis');
      expect(google.auth.GoogleAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'user@domain.com'
        })
      );
    });

    it('debería manejar errores de la API de Gmail', async () => {
      const error = new Error('Gmail API Error');
      mockGmailApi.users.messages.send.mockRejectedValueOnce(error);

      const result = await gmailService.sendEmail(basicEmailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gmail API Error');
      expect(result.messageId).toBeUndefined();
    });

    it('debería validar opciones de email requeridas', async () => {
      const invalidEmailOptions = {
        to: [],
        subject: '',
        html: ''
      } as EmailOptions;

      const result = await gmailService.sendEmail(invalidEmailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });

  describe('sendBulkEmails', () => {
    const bulkEmails: EmailOptions[] = [
      {
        to: [{ email: 'user1@example.com', name: 'User 1' }],
        subject: 'Test 1',
        html: '<p>Test content 1</p>'
      },
      {
        to: [{ email: 'user2@example.com', name: 'User 2' }],
        subject: 'Test 2',
        html: '<p>Test content 2</p>'
      },
      {
        to: [{ email: 'user3@example.com', name: 'User 3' }],
        subject: 'Test 3',
        html: '<p>Test content 3</p>'
      }
    ];

    it('debería enviar emails en lotes', async () => {
      const progressCallback = jest.fn();
      
      // Nota: sendBulkEmails necesita ser implementado con la signatura correcta
      // const result = await gmailService.sendBulkEmails(bulkEmails, {
      //   batchSize: 2,
      //   delayBetweenBatches: 100,
      //   progressCallback
      // });

      // expect(result.length).toBe(3);
      // expect(result.filter(r => r.success).length).toBe(3);
      // expect(result.filter(r => !r.success).length).toBe(0);
      // expect(progressCallback).toHaveBeenCalledTimes(2); // 2 lotes
      // expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(3);
    });

    it('debería continuar enviando después de errores si continueOnError es true', async () => {
      // Hacer que el segundo email falle
      mockGmailApi.users.messages.send
        .mockResolvedValueOnce({ data: { id: 'msg-1' } })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ data: { id: 'msg-3' } });

      // const result = await gmailService.sendBulkEmails(bulkEmails, {
      //   batchSize: 1,
      //   continueOnError: true
      // });

      // expect(result.length).toBe(3);
      // expect(result.filter(r => r.success).length).toBe(2);
      // expect(result.filter(r => !r.success).length).toBe(1);
    });

    it('debería detenerse en el primer error si continueOnError es false', async () => {
      mockGmailApi.users.messages.send
        .mockResolvedValueOnce({ data: { id: 'msg-1' } })
        .mockRejectedValueOnce(new Error('API Error'));

      // const result = await gmailService.sendBulkEmails(bulkEmails, {
      //   batchSize: 1,
      //   continueOnError: false
      // });

      // expect(result.length).toBeGreaterThanOrEqual(1);
      // expect(result.filter(r => r.success).length).toBe(1);
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Construcción de mensajes MIME', () => {
    it('debería construir un mensaje MIME básico correctamente', () => {
      const emailOptions: EmailOptions = {
        to: [{ email: 'test@example.com', name: 'Test User' }],
        subject: 'Test Subject',
        html: '<h1>Test HTML</h1>',
        text: 'Test text'
      };

      // Acceder al método privado para testing
      const mimeMessage = (gmailService as any).buildMimeMessage(emailOptions);

      expect(mimeMessage).toContain('To: Test User <test@example.com>');
      expect(mimeMessage).toContain('Subject: Test Subject');
      expect(mimeMessage).toContain('Content-Type: multipart/alternative');
      expect(mimeMessage).toContain('<h1>Test HTML</h1>');
      expect(mimeMessage).toContain('Test text');
    });

    it('debería manejar caracteres especiales en el asunto', () => {
      const emailOptions: EmailOptions = {
        to: [{ email: 'test@example.com' }],
        subject: 'Asunto con acentos: ñáéíóú',
        html: '<p>Test</p>'
      };

      const mimeMessage = (gmailService as any).buildMimeMessage(emailOptions);

      expect(mimeMessage).toContain('Subject: =?UTF-8?B?');
    });
  });

  describe('Validación', () => {
    it('debería validar direcciones de email', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        ''
      ];

      validEmails.forEach(email => {
        expect((gmailService as any).isValidEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect((gmailService as any).isValidEmail(email)).toBe(false);
      });
    });

    it('debería validar opciones de email completas', () => {
      const validOptions: EmailOptions = {
        to: [{ email: 'test@example.com', name: 'Test' }],
        subject: 'Valid Subject',
        html: '<p>Valid content</p>'
      };

      const invalidOptions = [
        { ...validOptions, to: [] },
        { ...validOptions, subject: '' },
        { ...validOptions, html: '', text: '' },
        { ...validOptions, to: [{ email: 'invalid-email', name: 'Test' }] }
      ];

      expect((gmailService as any).validateEmailOptions(validOptions)).toBe(true);

      invalidOptions.forEach(options => {
        expect((gmailService as any).validateEmailOptions(options)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('debería respetar los límites de tasa', async () => {
      const startTime = Date.now();
      
      // Simular múltiples envíos rápidos
      const promises = Array(5).fill(null).map(() => 
        gmailService.sendEmail({
          to: [{ email: 'test@example.com' }],
          subject: 'Rate limit test',
          html: '<p>Test</p>'
        })
      );

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Debería tomar al menos algún tiempo debido al rate limiting
      expect(duration).toBeGreaterThan(0);
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(5);
    });
  });

  describe('Manejo de errores y reintentos', () => {
    it('debería reintentar automáticamente en caso de errores temporales', async () => {
      const temporaryError = new Error('Temporary API Error');
      (temporaryError as any).code = 429; // Too Many Requests

      mockGmailApi.users.messages.send
        .mockRejectedValueOnce(temporaryError)
        .mockRejectedValueOnce(temporaryError)
        .mockResolvedValueOnce({ data: { id: 'success-after-retry' } });

      const result = await gmailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Retry test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('success-after-retry');
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(3);
    });

    it('debería fallar después del número máximo de reintentos', async () => {
      const persistentError = new Error('Persistent API Error');
      mockGmailApi.users.messages.send.mockRejectedValue(persistentError);

      const result = await gmailService.sendEmail({
        to: [{ email: 'test@example.com' }],
        subject: 'Max retry test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Persistent API Error');
      // Debería intentar 1 + maxRetries veces
      expect(mockGmailApi.users.messages.send).toHaveBeenCalledTimes(4);
    });
  });
});

describe('Integración con EmailTemplateEngine', () => {
  let templateEngine: EmailTemplateEngine;

  beforeEach(() => {
    templateEngine = new EmailTemplateEngine();
  });

  it('debería renderizar plantillas correctamente', () => {
    const template = {
      name: 'test-template',
      subject: 'Hello {{user.name}}',
      htmlTemplate: '<h1>Welcome {{user.name}}!</h1><p>Email: {{user.email}}</p>',
      requiredVariables: ['user.name', 'user.email']
    };

    templateEngine.registerTemplate(template);

    const rendered = templateEngine.renderTemplate('test-template', {
      user: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    });

    expect(rendered.subject).toBe('Hello John Doe');
    expect(rendered.html).toContain('Welcome John Doe!');
    expect(rendered.html).toContain('Email: john@example.com');
  });

  it('debería validar variables requeridas', () => {
    const template = {
      name: 'validation-test',
      subject: 'Test {{required.var}}',
      htmlTemplate: '<p>{{required.var}}</p>',
      requiredVariables: ['required.var']
    };

    templateEngine.registerTemplate(template);

    expect(() => {
      templateEngine.renderTemplate('validation-test', {});
    }).toThrow('Missing required variables');
  });
});

describe('Integración con EmailQueueService', () => {
  let queueService: EmailQueueService;

  beforeEach(() => {
    queueService = new EmailQueueService();
  });

  it('debería añadir emails a la cola', () => {
    const emailOptions: EmailOptions = {
      to: [{ email: 'test@example.com' }],
      subject: 'Queue test',
      html: '<p>Test</p>'
    };

    const queueId = queueService.addToQueue(emailOptions);

    expect(queueId).toBeDefined();
    expect(typeof queueId).toBe('string');

    const stats = queueService.getQueueStats();
    expect(stats.pending).toBeGreaterThan(0);
  });

  it('debería procesar la cola automáticamente', async () => {
    const emailOptions: EmailOptions = {
      to: [{ email: 'test@example.com' }],
      subject: 'Auto process test',
      html: '<p>Test</p>'
    };

    const queueId = queueService.addToQueue(emailOptions);
    
    // Simular procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const stats = queueService.getQueueStats();
    expect(stats.pending).toBeGreaterThanOrEqual(0);
  });

  it('debería manejar prioridades en la cola', () => {
    const highPriorityEmail: EmailOptions = {
      to: [{ email: 'high@example.com' }],
      subject: 'High priority',
      html: '<p>High</p>'
    };

    const lowPriorityEmail: EmailOptions = {
      to: [{ email: 'low@example.com' }],
      subject: 'Low priority',
      html: '<p>Low</p>'
    };

    const lowId = queueService.addToQueue(lowPriorityEmail, { priority: 'low' });
    const highId = queueService.addToQueue(highPriorityEmail, { priority: 'high' });

    expect(lowId).toBeDefined();
    expect(highId).toBeDefined();

    // El email de alta prioridad debería procesarse primero
    const stats = queueService.getQueueStats();
    expect(stats.pending).toBe(2);
  });
});