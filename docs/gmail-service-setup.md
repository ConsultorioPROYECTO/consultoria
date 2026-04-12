# Configuración del Servicio de Gmail

Esta guía explica cómo configurar y usar el servicio de Gmail en el proyecto, siguiendo el mismo patrón utilizado para el Google Calendar SDK.

## Requisitos Previos

1. **Proyecto de Google Cloud Platform**
   - Tener un proyecto activo en Google Cloud Console
   - Gmail API habilitada
   - Cuenta de servicio creada con las credenciales apropiadas

2. **Domain-wide Delegation (Opcional)**
   - Configurado si necesitas enviar emails en nombre de otros usuarios
   - Client ID de la cuenta de servicio autorizado en Google Workspace Admin

## Configuración

### 1. Variables de Entorno

Añade las siguientes variables a tu archivo `.env`:

```env
# Configuración de Gmail API
GOOGLE_GMAIL_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account-key.json
# O alternativamente, el JSON completo como string:
# GOOGLE_GMAIL_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'

# Configuración de email por defecto
GMAIL_DEFAULT_FROM_EMAIL=noreply@tudominio.com
GMAIL_DEFAULT_FROM_NAME="Tu Empresa"
GMAIL_DEFAULT_REPLY_TO=support@tudominio.com

# Configuración de límites y reintentos
GMAIL_RATE_LIMIT_PER_MINUTE=250
GMAIL_RATE_LIMIT_PER_DAY=1000000
GMAIL_MAX_RETRIES=3
GMAIL_RETRY_DELAY=1000

# Configuración de cola de emails
GMAIL_QUEUE_BATCH_SIZE=10
GMAIL_QUEUE_PROCESS_INTERVAL=5000
GMAIL_QUEUE_MAX_RETRIES=3

# Configuración de logging
GMAIL_LOG_LEVEL=info
GMAIL_LOG_EMAILS=true
```

### 2. Habilitar Gmail API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a "APIs & Services" > "Library"
4. Busca "Gmail API" y habilítala

### 3. Configurar Domain-wide Delegation (Si es necesario)

1. En Google Cloud Console, ve a "IAM & Admin" > "Service Accounts"
2. Encuentra tu cuenta de servicio y copia el "Client ID"
3. En Google Workspace Admin Console:
   - Ve a "Security" > "API Controls" > "Domain-wide Delegation"
   - Añade el Client ID con los siguientes scopes:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`

## Uso Básico

### Importar el Servicio

```typescript
import { emailService } from '@/lib/email-service';
import type { EmailOptions } from '@/types/google-gmail';
```

### Envío Simple

```typescript
const emailOptions: EmailOptions = {
  to: [{ email: 'usuario@ejemplo.com', name: 'Usuario' }],
  subject: 'Asunto del email',
  html: '<h1>Hola!</h1><p>Este es el contenido HTML.</p>',
  text: 'Hola! Este es el contenido en texto plano.',
};

const result = await emailService.sendEmail(emailOptions);

if (result.success) {
  console.log('Email enviado:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

### Uso con Plantillas

```typescript
// Enviar email de bienvenida
const result = await emailService.sendTemplateEmail(
  'welcome',
  {
    user: { name: 'Juan Pérez', email: 'juan@ejemplo.com' },
    company: { name: 'Mi Empresa', website: 'https://miempresa.com' }
  },
  [{ email: 'juan@ejemplo.com', name: 'Juan Pérez' }]
);
```

### Envío con Adjuntos

```typescript
const emailOptions: EmailOptions = {
  to: [{ email: 'usuario@ejemplo.com' }],
  subject: 'Documento adjunto',
  html: '<p>Adjunto el documento solicitado.</p>',
  attachments: [
    {
      filename: 'documento.pdf',
      content: pdfBuffer, // Buffer o string base64
      contentType: 'application/pdf'
    }
  ]
};

const result = await emailService.sendEmail(emailOptions);
```

### Envío Asíncrono (Cola)

```typescript
// Añadir email a la cola para envío posterior
const queueId = await emailService.queueEmail(emailOptions, {
  delay: 5 * 60 * 1000, // 5 minutos
  priority: 'high',
  maxRetries: 3
});

// Verificar estado
const status = emailService.getQueueStatus(queueId);
console.log('Estado:', status?.status);
```

### Envío Masivo

```typescript
const emails: EmailOptions[] = recipients.map(recipient => ({
  to: [recipient],
  subject: `Hola ${recipient.name}`,
  html: `<p>Mensaje personalizado para ${recipient.name}</p>`
}));

const result = await emailService.sendBulkEmails({
  emails,
  batchSize: 5,
  delayBetweenBatches: 2000,
  progressCallback: (sent, total) => {
    console.log(`Progreso: ${sent}/${total}`);
  }
});
```

## Plantillas Disponibles

El sistema incluye plantillas predefinidas:

- **welcome**: Email de bienvenida
- **appointment-confirmation**: Confirmación de cita
- **appointment-reminder**: Recordatorio de cita
- **password-reset**: Restablecimiento de contraseña
- **notification**: Notificación general

### Crear Plantilla Personalizada

```typescript
emailService.registerTemplate({
  name: 'mi-plantilla',
  subject: 'Asunto con {{variable}}',
  htmlTemplate: `
    <h1>Hola {{user.name}}!</h1>
    <p>{{mensaje}}</p>
  `,
  requiredVariables: ['user.name', 'mensaje']
});
```

## Monitoreo y Mantenimiento

### Verificar Salud del Servicio

```typescript
const health = await emailService.healthCheck();
console.log('Servicio saludable:', health.isHealthy);
```

### Obtener Estadísticas

```typescript
const stats = emailService.getServiceStats();
console.log('Emails enviados:', stats.totalSent);
console.log('Tasa de éxito:', stats.successRate);
```

### Limpiar Cola

```typescript
// Eliminar items de más de 24 horas
const removed = emailService.cleanupQueue(24);
console.log('Items eliminados:', removed);
```

## Manejo de Errores

### Errores Comunes

1. **400 Bad Request**
   - Verificar formato del email
   - Validar que todos los campos requeridos estén presentes

2. **401 Unauthorized**
   - Verificar credenciales de la cuenta de servicio
   - Confirmar que Gmail API esté habilitada

3. **403 Forbidden**
   - Verificar domain-wide delegation si es necesario
   - Confirmar scopes en Google Workspace Admin

4. **429 Too Many Requests**
   - El sistema maneja automáticamente los límites de tasa
   - Ajustar `GMAIL_RATE_LIMIT_PER_MINUTE` si es necesario

### Logging

El servicio registra automáticamente:
- Emails enviados exitosamente
- Errores de envío
- Estadísticas de uso
- Estado de la cola

Configura el nivel de logging con `GMAIL_LOG_LEVEL`:
- `error`: Solo errores
- `warn`: Errores y advertencias
- `info`: Información general (recomendado)
- `debug`: Información detallada

## Integración con Next.js

### API Route Example

```typescript
// app/api/send-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, message, template, templateData } = await request.json();
    
    let result;
    
    if (template) {
      result = await emailService.sendTemplateEmail(template, templateData, to);
    } else {
      result = await emailService.sendEmail({
        to,
        subject,
        html: message
      });
    }
    
    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Server Action Example

```typescript
// app/actions/email-actions.ts
'use server';

import { emailService } from '@/lib/email-service';
import { revalidatePath } from 'next/cache';

export async function sendWelcomeEmail(userEmail: string, userName: string) {
  try {
    const result = await emailService.sendTemplateEmail(
      'welcome',
      {
        user: { name: userName, email: userEmail },
        company: { name: 'Mi Empresa' }
      },
      [{ email: userEmail, name: userName }]
    );
    
    if (result.success) {
      revalidatePath('/dashboard');
      return { success: true, messageId: result.messageId };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
```

## Mejores Prácticas

1. **Seguridad**
   - Nunca expongas las credenciales de la cuenta de servicio
   - Usa variables de entorno para la configuración
   - Implementa validación de entrada en las APIs

2. **Performance**
   - Usa la cola para emails no críticos
   - Implementa envío en lotes para grandes volúmenes
   - Monitorea las estadísticas regularmente

3. **Mantenimiento**
   - Limpia la cola regularmente
   - Monitorea los logs de errores
   - Mantén las plantillas actualizadas

4. **Testing**
   - Usa emails de prueba en desarrollo
   - Implementa tests unitarios para las plantillas
   - Verifica la configuración con `healthCheck()`

## Troubleshooting

### Verificar Configuración

```typescript
// Verificar que el servicio esté configurado correctamente
const health = await emailService.healthCheck();
if (!health.isHealthy) {
  console.error('Errores de configuración:', health.configuration.errors);
}
```

### Debug Mode

```env
# Activar modo debug
GMAIL_LOG_LEVEL=debug
GMAIL_LOG_EMAILS=true
```

### Verificar Credenciales

```bash
# Verificar que el archivo de credenciales existe y es válido
cat $GOOGLE_GMAIL_SERVICE_ACCOUNT_KEY_PATH | jq .
```

Para más ejemplos detallados, consulta el archivo `src/lib/examples/gmail-usage-examples.ts`.