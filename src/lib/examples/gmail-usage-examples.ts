// src/lib/examples/gmail-usage-examples.ts

import { emailService } from '../email-service';
import type { EmailOptions, EmailTemplateData } from '../../types/google-gmail';

/**
 * Ejemplos de uso del servicio de Gmail
 * Este archivo muestra diferentes formas de usar el servicio de email
 */

/**
 * Ejemplo 1: Envío básico de email
 */
export async function sendBasicEmail() {
  const emailOptions: EmailOptions = {
    to: [{ email: 'usuario@ejemplo.com', name: 'Usuario Ejemplo' }],
    subject: 'Email de prueba',
    html: `
      <h1>¡Hola!</h1>
      <p>Este es un email de prueba enviado desde nuestro sistema.</p>
      <p>Saludos,<br>El equipo</p>
    `,
    text: 'Hola! Este es un email de prueba enviado desde nuestro sistema. Saludos, El equipo',
  };

  try {
    const result = await emailService.sendEmail(emailOptions);
    
    if (result.success) {
      console.log('Email enviado exitosamente:', result.messageId);
    } else {
      console.error('Error enviando email:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error inesperado:', error);
    throw error;
  }
}

/**
 * Ejemplo 2: Envío con plantilla de bienvenida
 */
export async function sendWelcomeEmail(userEmail: string, userName: string) {
  const templateData: EmailTemplateData = {
    user: {
      name: userName,
      email: userEmail,
    },
    company: {
      name: 'Mi Empresa',
      website: 'https://miempresa.com',
    },
  };

  try {
    const result = await emailService.sendTemplateEmail(
      'welcome',
      templateData,
      [{ email: userEmail, name: userName }]
    );
    
    console.log('Email de bienvenida enviado:', result.success ? 'exitoso' : 'falló');
    return result;
  } catch (error) {
    console.error('Error enviando email de bienvenida:', error);
    throw error;
  }
}

/**
 * Ejemplo 3: Confirmación de cita médica
 */
export async function sendAppointmentConfirmation(
  patientEmail: string,
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string
) {
  const templateData: EmailTemplateData = {
    patient: {
      name: patientName,
    },
    doctor: {
      name: doctorName,
      specialty: 'Medicina General',
    },
    appointment: {
      date: appointmentDate,
      time: appointmentTime,
      duration: 30,
      location: 'Consultorio 101',
    },
    clinic: {
      name: 'Clínica Ejemplo',
      phone: '+57 1 234 5678',
    },
  };

  try {
    const result = await emailService.sendTemplateEmail(
      'appointment-confirmation',
      templateData,
      [{ email: patientEmail, name: patientName }]
    );
    
    return result;
  } catch (error) {
    console.error('Error enviando confirmación de cita:', error);
    throw error;
  }
}

/**
 * Ejemplo 4: Envío con adjuntos
 */
export async function sendEmailWithAttachment() {
  const emailOptions: EmailOptions = {
    to: [{ email: 'usuario@ejemplo.com', name: 'Usuario' }],
    subject: 'Documento adjunto',
    html: `
      <h2>Documento Adjunto</h2>
      <p>Estimado usuario,</p>
      <p>Adjunto encontrarás el documento solicitado.</p>
      <p>Saludos cordiales.</p>
    `,
    attachments: [
      {
        filename: 'documento.pdf',
        content: 'JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0K...', // Base64 del PDF
        contentType: 'application/pdf',
      },
      {
        filename: 'imagen.png',
        content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'),
        contentType: 'image/png',
      },
    ],
  };

  try {
    const result = await emailService.sendEmail(emailOptions);
    return result;
  } catch (error) {
    console.error('Error enviando email con adjuntos:', error);
    throw error;
  }
}

/**
 * Ejemplo 5: Envío en cola (asíncrono)
 */
export async function queueEmailForLater() {
  const emailOptions: EmailOptions = {
    to: [{ email: 'usuario@ejemplo.com', name: 'Usuario' }],
    subject: 'Email programado',
    html: '<p>Este email fue programado para enviarse más tarde.</p>',
  };

  try {
    // Programar para enviar en 5 minutos
    const queueId = await emailService.queueEmail(emailOptions, {
      delay: 5 * 60 * 1000, // 5 minutos en milisegundos
      priority: 'normal',
      maxRetries: 3,
    });
    
    console.log('Email añadido a la cola:', queueId);
    
    // Verificar estado después de un tiempo
    setTimeout(async () => {
      const status = emailService.getQueueStatus(queueId);
      console.log('Estado del email en cola:', status?.status);
    }, 1000);
    
    return queueId;
  } catch (error) {
    console.error('Error añadiendo email a la cola:', error);
    throw error;
  }
}

/**
 * Ejemplo 6: Envío masivo con progreso
 */
export async function sendBulkEmails(recipients: Array<{ email: string; name: string }>) {
  const emails: EmailOptions[] = recipients.map(recipient => ({
    to: [recipient],
    subject: `Hola ${recipient.name}`,
    html: `
      <h2>Hola ${recipient.name}!</h2>
      <p>Este es un mensaje personalizado para ti.</p>
      <p>Gracias por ser parte de nuestra comunidad.</p>
    `,
  }));

  try {
    const result = await emailService.sendBulkEmails({
      emails,
      batchSize: 5, // Enviar de 5 en 5
      delayBetweenBatches: 2000, // 2 segundos entre lotes
      continueOnError: true,
      progressCallback: (sent, total, errors) => {
        console.log(`Progreso: ${sent}/${total} enviados, ${errors} errores`);
      },
    });
    
    console.log('Envío masivo completado:', {
      total: result.totalEmails,
      exitosos: result.successfulSends,
      fallidos: result.failedSends,
      duracion: `${result.duration}ms`,
    });
    
    return result;
  } catch (error) {
    console.error('Error en envío masivo:', error);
    throw error;
  }
}

/**
 * Ejemplo 7: Uso con suplantación de usuario (domain-wide delegation)
 */
export async function sendEmailAsUser(userEmail: string) {
  const emailOptions: EmailOptions = {
    to: [{ email: 'destinatario@ejemplo.com', name: 'Destinatario' }],
    subject: 'Email enviado en nombre de usuario',
    html: '<p>Este email fue enviado usando domain-wide delegation.</p>',
  };

  try {
    // Enviar como si fuera el usuario especificado
    const result = await emailService.sendEmail(emailOptions, userEmail);
    
    console.log('Email enviado en nombre de:', userEmail);
    return result;
  } catch (error) {
    console.error('Error con suplantación de usuario:', error);
    throw error;
  }
}

/**
 * Ejemplo 8: Registro de plantilla personalizada
 */
export function registerCustomTemplate() {
  emailService.registerTemplate({
    name: 'invoice',
    subject: 'Factura #{{invoice.number}} - {{company.name}}',
    htmlTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Factura #{{invoice.number}}</h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0;">
          <h3>Detalles de Facturación</h3>
          <p><strong>Cliente:</strong> {{customer.name}}</p>
          <p><strong>Email:</strong> {{customer.email}}</p>
          <p><strong>Fecha:</strong> {{invoice.date}}</p>
          <p><strong>Vencimiento:</strong> {{invoice.dueDate}}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e9ecef;">
              <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Descripción</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Cantidad</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Precio</th>
              <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border: 1px solid #dee2e6;">{{item.description}}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">{{item.quantity}}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">{{item.price}}</td>
              <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">{{item.total}}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="text-align: right; margin-top: 20px;">
          <h3>Total: {{invoice.total}}</h3>
        </div>
        
        <p>Gracias por tu negocio.</p>
        
        <p>Saludos,<br>{{company.name}}</p>
      </div>
    `,
    requiredVariables: [
      'invoice.number',
      'invoice.date',
      'invoice.dueDate',
      'invoice.total',
      'customer.name',
      'customer.email',
      'item.description',
      'item.quantity',
      'item.price',
      'item.total',
      'company.name'
    ],
  });
  
  console.log('Plantilla de factura registrada exitosamente');
}

/**
 * Ejemplo 9: Monitoreo y estadísticas
 */
export async function checkServiceHealth() {
  try {
    const health = await emailService.healthCheck();
    
    console.log('Estado del servicio de email:', {
      saludable: health.isHealthy,
      gmail: health.services.gmail.isHealthy ? 'OK' : 'ERROR',
      cola: `${health.services.queue.stats.pending} pendientes`,
      plantillas: `${health.services.templates.count} disponibles`,
      configuracion: health.configuration.isValid ? 'OK' : 'ERRORES',
    });
    
    if (!health.isHealthy) {
      console.error('Errores de configuración:', health.configuration.errors);
    }
    
    // Obtener estadísticas
    const stats = emailService.getServiceStats();
    console.log('Estadísticas del servicio:', {
      totalEnviados: stats.totalSent,
      totalFallidos: stats.totalFailed,
      tasaExito: `${stats.successRate.toFixed(2)}%`,
      ultimoEnvio: stats.lastSent,
    });
    
    return health;
  } catch (error) {
    console.error('Error verificando salud del servicio:', error);
    throw error;
  }
}

/**
 * Ejemplo 10: Limpieza y mantenimiento
 */
export function performMaintenance() {
  // Limpiar cola de emails antiguos
  const removedItems = emailService.cleanupQueue(24); // Eliminar items de más de 24 horas
  console.log(`Limpieza completada: ${removedItems} items eliminados`);
  
  // Obtener estadísticas de la cola
  const queueStats = emailService.getQueueStats();
  console.log('Estado de la cola:', queueStats);
  
  // Listar plantillas disponibles
  const templates = emailService.getAvailableTemplates();
  console.log('Plantillas disponibles:', templates.map(t => t.name));
}

/**
 * Función de demostración que ejecuta varios ejemplos
 */
export async function runEmailExamples() {
  console.log('=== Iniciando ejemplos de uso del servicio de Gmail ===\n');
  
  try {
    // 1. Verificar salud del servicio
    console.log('1. Verificando salud del servicio...');
    await checkServiceHealth();
    
    // 2. Registrar plantilla personalizada
    console.log('\n2. Registrando plantilla personalizada...');
    registerCustomTemplate();
    
    // 3. Envío básico
    console.log('\n3. Enviando email básico...');
    // await sendBasicEmail(); // Descomenta para probar
    
    // 4. Email con plantilla
    console.log('\n4. Enviando email de bienvenida...');
    // await sendWelcomeEmail('test@ejemplo.com', 'Usuario Test'); // Descomenta para probar
    
    // 5. Añadir a cola
    console.log('\n5. Añadiendo email a la cola...');
    // await queueEmailForLater(); // Descomenta para probar
    
    // 6. Mantenimiento
    console.log('\n6. Realizando mantenimiento...');
    performMaintenance();
    
    console.log('\n=== Ejemplos completados ===');
  } catch (error) {
    console.error('Error ejecutando ejemplos:', error);
  }
}


// Exportar función principal para uso fácil
export default runEmailExamples;