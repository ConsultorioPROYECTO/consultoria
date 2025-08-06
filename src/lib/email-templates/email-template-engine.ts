// src/lib/email-templates/email-template-engine.ts

import type { 
  EmailTemplateConfig, 
  EmailTemplateData, 
  EmailTemplateMetadata,
  EmailOptions 
} from '../../types/google-gmail';

/**
 * Motor de plantillas de email con soporte para variables dinámicas
 */
export class EmailTemplateEngine {
  private templates: Map<string, EmailTemplateConfig> = new Map();
  private templateCache: Map<string, { html: string; text?: string }> = new Map();

  /**
   * Registra una nueva plantilla
   * @param template Configuración de la plantilla
   */
  public registerTemplate(template: EmailTemplateConfig): void {
    this.templates.set(template.name, template);
    // Limpiar cache cuando se registra una nueva plantilla
    this.templateCache.delete(template.name);
  }

  /**
   * Renderiza una plantilla con los datos proporcionados
   * @param templateName Nombre de la plantilla
   * @param data Datos para reemplazar en la plantilla
   * @returns Email options listo para enviar
   */
  public renderTemplate(
    templateName: string, 
    data: EmailTemplateData
  ): Partial<EmailOptions> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Validar variables requeridas
    this.validateRequiredVariables(template, data);

    // Renderizar subject
    const subject = this.replaceVariables(template.subject, data);

    // Renderizar HTML
    const html = this.replaceVariables(template.htmlTemplate, data);

    // Renderizar texto plano si existe
    const text = template.textTemplate 
      ? this.replaceVariables(template.textTemplate, data)
      : this.htmlToText(html);

    return {
      subject,
      html,
      text,
    };
  }

  /**
   * Obtiene la lista de plantillas registradas
   * @returns Array de metadatos de plantillas
   */
  public getTemplates(): EmailTemplateMetadata[] {
    return Array.from(this.templates.values()).map(template => ({
      id: template.name,
      name: template.name,
      description: `Template for ${template.name}`,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      variables: template.requiredVariables.map(name => ({
        name,
        type: 'string' as const,
        required: true,
      })),
    }));
  }

  /**
   * Valida que todas las variables requeridas estén presentes
   * @param template Configuración de la plantilla
   * @param data Datos proporcionados
   */
  private validateRequiredVariables(
    template: EmailTemplateConfig, 
    data: EmailTemplateData
  ): void {
    const missingVariables = template.requiredVariables.filter(
      variable => !(variable in data) || data[variable] === undefined || data[variable] === null
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required variables for template '${template.name}': ${missingVariables.join(', ')}`
      );
    }
  }

  /**
   * Reemplaza variables en un string usando sintaxis {{variable}}
   * @param template String de la plantilla
   * @param data Datos para reemplazar
   * @returns String con variables reemplazadas
   */
  private replaceVariables(template: string, data: EmailTemplateData): string {
    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variablePath) => {
      const value = this.getNestedValue(data, variablePath.trim());
      
      if (value === undefined || value === null) {
        console.warn(`Variable '${variablePath}' not found in template data`);
        return match; // Mantener la variable sin reemplazar
      }
      
      return String(value);
    });
  }

  /**
   * Obtiene un valor anidado de un objeto usando notación de punto
   * @param obj Objeto de datos
   * @param path Ruta del valor (ej: 'user.name')
   * @returns Valor encontrado o undefined
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Convierte HTML básico a texto plano
   * @param html String HTML
   * @returns Texto plano
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }
}

// Instancia singleton del motor de plantillas
export const emailTemplateEngine = new EmailTemplateEngine();

// Plantillas predefinidas
export const defaultTemplates: EmailTemplateConfig[] = [
  {
    name: 'welcome',
    subject: 'Bienvenido {{user.name}} - {{company.name}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">¡Bienvenido {{user.name}}!</h1>
        <p>Nos complace darte la bienvenida a <strong>{{company.name}}</strong>.</p>
        <p>Tu cuenta ha sido creada exitosamente con el email: <strong>{{user.email}}</strong></p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Próximos pasos:</h3>
          <ul>
            <li>Completa tu perfil</li>
            <li>Explora nuestras funcionalidades</li>
            <li>Contacta a nuestro equipo de soporte si necesitas ayuda</li>
          </ul>
        </div>
        
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        
        <p>Saludos,<br>
        El equipo de {{company.name}}</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          Este email fue enviado a {{user.email}}. Si no esperabas este mensaje, puedes ignorarlo.
        </p>
      </div>
    `,
    textTemplate: `
¡Bienvenido {{user.name}}!

Nos complace darte la bienvenida a {{company.name}}.

Tu cuenta ha sido creada exitosamente con el email: {{user.email}}

Próximos pasos:
- Completa tu perfil
- Explora nuestras funcionalidades
- Contacta a nuestro equipo de soporte si necesitas ayuda

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
El equipo de {{company.name}}

---
Este email fue enviado a {{user.email}}. Si no esperabas este mensaje, puedes ignorarlo.
    `,
    requiredVariables: ['user.name', 'user.email', 'company.name'],
    optionalVariables: ['company.logo', 'company.website'],
  },
  {
    name: 'appointment-confirmation',
    subject: 'Confirmación de cita - {{appointment.date}} con {{doctor.name}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c5aa0;">Confirmación de Cita</h1>
        
        <p>Hola {{patient.name}},</p>
        
        <p>Tu cita ha sido confirmada con los siguientes detalles:</p>
        
        <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c5aa0;">Detalles de la Cita</h3>
          <p><strong>Doctor:</strong> {{doctor.name}}</p>
          <p><strong>Especialidad:</strong> {{doctor.specialty}}</p>
          <p><strong>Fecha:</strong> {{appointment.date}}</p>
          <p><strong>Hora:</strong> {{appointment.time}}</p>
          <p><strong>Duración:</strong> {{appointment.duration}} minutos</p>
          {{#if appointment.location}}
          <p><strong>Ubicación:</strong> {{appointment.location}}</p>
          {{/if}}
          {{#if appointment.notes}}
          <p><strong>Notas:</strong> {{appointment.notes}}</p>
          {{/if}}
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">Recordatorios importantes:</h4>
          <ul style="margin-bottom: 0;">
            <li>Llega 15 minutos antes de tu cita</li>
            <li>Trae tu documento de identidad</li>
            <li>Si necesitas cancelar, hazlo con al menos 24 horas de anticipación</li>
          </ul>
        </div>
        
        <p>Si necesitas hacer cambios o tienes preguntas, contáctanos.</p>
        
        <p>¡Esperamos verte pronto!</p>
        
        <p>Saludos,<br>
        {{clinic.name}}</p>
      </div>
    `,
    requiredVariables: [
      'patient.name',
      'doctor.name',
      'doctor.specialty',
      'appointment.date',
      'appointment.time',
      'appointment.duration',
      'clinic.name'
    ],
    optionalVariables: ['appointment.location', 'appointment.notes', 'clinic.phone', 'clinic.address'],
  },
  {
    name: 'password-reset',
    subject: 'Restablecimiento de contraseña - {{company.name}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #d73527;">Restablecimiento de Contraseña</h1>
        
        <p>Hola {{user.name}},</p>
        
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{reset.url}}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        
        <p>Este enlace expirará en {{reset.expirationHours}} horas.</p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #721c24;">
            <strong>Importante:</strong> Si no solicitaste este restablecimiento, 
            puedes ignorar este email. Tu contraseña no será cambiada.
          </p>
        </div>
        
        <p>Si tienes problemas con el enlace, copia y pega la siguiente URL en tu navegador:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">{{reset.url}}</p>
        
        <p>Saludos,<br>
        El equipo de {{company.name}}</p>
      </div>
    `,
    requiredVariables: ['user.name', 'reset.url', 'reset.expirationHours', 'company.name'],
  },
];

// Registrar plantillas por defecto
defaultTemplates.forEach(template => {
  emailTemplateEngine.registerTemplate(template);
});