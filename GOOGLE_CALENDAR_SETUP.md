# Configuración de Google Calendar API

Esta guía te ayudará a configurar la integración con Google Calendar para tu aplicación de consultoría médica.

## 📋 Requisitos Previos

- Cuenta de Google
- Proyecto en Google Cloud Console
- Node.js y npm instalados

## 🚀 Configuración Inicial

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el **Project ID** para uso posterior

### 2. Habilitar Google Calendar API

1. En el menú lateral, ve a **APIs & Services > Library**
2. Busca "Google Calendar API"
3. Haz clic en **Enable**

### 3. Crear Cuenta de Servicio

1. Ve a **APIs & Services > Credentials**
2. Haz clic en **Create Credentials > Service Account**
3. Completa los datos:
   - **Service account name**: `calendar-service`
   - **Service account ID**: `calendar-service`
   - **Description**: `Service account for Google Calendar integration`
4. Haz clic en **Create and Continue**
5. En **Grant this service account access to project**:
   - Rol: `Editor` (o crea un rol personalizado con permisos específicos)
6. Haz clic en **Continue** y luego **Done**

### 4. Generar Clave de Cuenta de Servicio

1. En la lista de cuentas de servicio, haz clic en la que acabas de crear
2. Ve a la pestaña **Keys**
3. Haz clic en **Add Key > Create new key**
4. Selecciona **JSON** y haz clic en **Create**
5. Se descargará un archivo JSON con las credenciales

## ⚙️ Configuración del Proyecto

### 1. Variables de Entorno

Crea o actualiza tu archivo `.env.local` con las siguientes variables:

```env
# Opción 1: Ruta al archivo de credenciales JSON
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/your/service-account-key.json

# Opción 2: Contenido del archivo JSON como string (recomendado para producción)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'
```

**Nota**: Usa solo una de las dos opciones. La opción 2 es más segura para despliegues en producción.

### 2. Instalación de Dependencias

Las dependencias ya están incluidas en tu `package.json`:

```bash
npm install
```

### 3. Verificar Configuración

Puedes verificar que la configuración es correcta ejecutando:

```typescript
import { validateGoogleCalendarConfig } from '@/lib/config/google-calendar-config';

const validation = validateGoogleCalendarConfig();
console.log('Config valid:', validation.isValid);
if (!validation.isValid) {
  console.log('Missing vars:', validation.missingVars);
  console.log('Errors:', validation.errors);
}
```

## 📚 Uso de la API

### 1. Crear Calendario para un Doctor

```typescript
import { doctorCalendarService } from '@/lib/doctor-calendar';

const result = await doctorCalendarService.createDoctorCalendar({
  doctorId: 1,
  calendarName: 'Dr. Juan Pérez - Consultas',
  timezone: 'America/Bogota',
  syncEnabled: true,
});
```

### 2. Sincronizar Cita con Google Calendar

```typescript
import { appointmentSyncService } from '@/lib/appointment-sync';

const result = await appointmentSyncService.syncAppointmentToCalendar(appointmentId);
```

### 3. Verificar Disponibilidad

```typescript
import { doctorCalendarService } from '@/lib/doctor-calendar';

const result = await doctorCalendarService.checkDoctorAvailability(
  doctorId,
  '2024-01-15T10:00:00Z',
  '2024-01-15T11:00:00Z'
);
```

## 🔗 Endpoints de API

### Gestión de Calendarios de Doctores

- `GET /api/doctors/[id]/calendar` - Obtener configuración del calendario
- `POST /api/doctors/[id]/calendar` - Crear calendario para doctor
- `PUT /api/doctors/[id]/calendar` - Actualizar configuración
- `DELETE /api/doctors/[id]/calendar` - Eliminar calendario

### Sincronización

- `POST /api/doctors/[id]/calendar/sync` - Sincronizar todas las citas pendientes
- `PUT /api/doctors/[id]/calendar/toggle-sync` - Habilitar/deshabilitar sincronización

### Disponibilidad y Eventos

- `GET /api/doctors/[id]/calendar/availability` - Verificar disponibilidad
- `GET /api/doctors/[id]/calendar/events` - Obtener eventos del calendario

### Sincronización de Citas Individuales

- `POST /api/appointments/[id]/sync` - Sincronizar cita específica
- `PUT /api/appointments/[id]/sync` - Actualizar cita en calendario
- `DELETE /api/appointments/[id]/sync` - Eliminar cita del calendario

## 🔧 Hooks Automáticos

La integración incluye hooks que se ejecutan automáticamente:

### En tu código de creación de doctores:

```typescript
import { onDoctorCreated } from '@/lib/hooks/calendar-hooks';

// Después de crear un doctor en la base de datos
const calendarResult = await onDoctorCreated(doctorId, {
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@example.com',
  timezone: 'America/Bogota',
});
```

### En tu código de gestión de citas:

```typescript
import { 
  onAppointmentCreated, 
  onAppointmentUpdated, 
  onAppointmentDeleted 
} from '@/lib/hooks/calendar-hooks';

// Después de crear una cita
await onAppointmentCreated(appointmentId);

// Después de actualizar una cita
await onAppointmentUpdated(appointmentId);

// Después de eliminar una cita
await onAppointmentDeleted(appointmentId);
```

## 🛡️ Seguridad

### Mejores Prácticas

1. **Nunca commits las credenciales** al repositorio
2. **Usa variables de entorno** para las credenciales
3. **Restringe los permisos** de la cuenta de servicio
4. **Rota las claves** periódicamente
5. **Monitorea el uso** de la API

### Configuración de Permisos

Para mayor seguridad, puedes crear un rol personalizado con solo los permisos necesarios:

1. Ve a **IAM & Admin > Roles**
2. Haz clic en **Create Role**
3. Agrega estos permisos:
   - `calendar.calendars.create`
   - `calendar.calendars.get`
   - `calendar.calendars.update`
   - `calendar.events.create`
   - `calendar.events.get`
   - `calendar.events.update`
   - `calendar.events.delete`

## 🐛 Solución de Problemas

### Error: "Calendar API has not been used"

- Asegúrate de haber habilitado la Google Calendar API en tu proyecto
- Verifica que estés usando el proyecto correcto

### Error: "Invalid credentials"

- Verifica que el archivo JSON de credenciales sea válido
- Asegúrate de que las variables de entorno estén configuradas correctamente
- Verifica que la cuenta de servicio tenga los permisos necesarios

### Error: "Quota exceeded"

- Verifica los límites de tu proyecto en Google Cloud Console
- Considera implementar rate limiting en tu aplicación

### Citas no se sincronizan automáticamente

- Verifica que `calendar_sync_enabled` esté en `true` para el doctor
- Revisa los logs para errores de sincronización
- Verifica que el doctor tenga un `calendar_id` asignado

## 📊 Monitoreo

### Logs Importantes

La integración registra eventos importantes:

```typescript
// Éxito en sincronización
console.log(`Appointment ${appointmentId} synced successfully: ${googleEventId}`);

// Errores de sincronización
console.error(`Failed to sync appointment ${appointmentId}: ${error}`);

// Creación de calendarios
console.log(`Calendar created successfully for doctor ${doctorId}: ${calendarId}`);
```

### Métricas Recomendadas

- Número de citas sincronizadas exitosamente
- Número de errores de sincronización
- Tiempo de respuesta de la API de Google Calendar
- Uso de cuota de la API

## 🔄 Mantenimiento

### Tareas Periódicas

1. **Revisar logs de errores** semanalmente
2. **Verificar cuotas de API** mensualmente
3. **Rotar credenciales** cada 6 meses
4. **Actualizar dependencias** regularmente

### Backup y Recuperación

- Los calendarios se crean en la cuenta de servicio de Google
- Los datos de sincronización se almacenan en tu base de datos
- Implementa backups regulares de tu base de datos

## 📞 Soporte

Si encuentras problemas:

1. Revisa esta documentación
2. Verifica los logs de la aplicación
3. Consulta la [documentación oficial de Google Calendar API](https://developers.google.com/calendar/api)
4. Revisa el estado de los servicios de Google en [Google Cloud Status](https://status.cloud.google.com/)