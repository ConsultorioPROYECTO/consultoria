# Google Calendar Integration Utils

Utilidades para la integración bidireccional entre la base de datos de citas médicas y Google Calendar.

## Estructura del Módulo

```
src/db/utils/GCalendar/
├── index.ts              # Punto de entrada principal
├── calendar-db-utils.ts  # Utilidades de base de datos
├── sync-service.ts       # Servicio de sincronización
├── types.ts             # Tipos y esquemas
├── config.ts            # Configuraciones y constantes
└── README.md            # Esta documentación
```

## Instalación y Configuración

### 1. Variables de Entorno

Configura las siguientes variables en tu archivo `.env`:

```env
# Google Calendar API
GOOGLE_CALENDAR_API_KEY=tu_api_key
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret

# Base de datos
DATABASE_URL=mysql://usuario:password@localhost:3306/consultoria

# Configuración de logging
LOG_LEVEL=info
NODE_ENV=development
```

### 2. Dependencias Requeridas

Asegúrate de tener instaladas las siguientes dependencias:

```bash
npm install zod drizzle-orm
# También necesitarás las funciones de Google Calendar API
```

## Uso Básico

### Importación

```typescript
import {
  initializeDoctorCalendar,
  performFullSync,
  getDoctorSyncStatus,
  syncAppointmentToGoogle,
  checkAppointmentConflicts,
} from '@/db/utils/GCalendar';
```

### Inicializar Calendario para un Doctor

```typescript
// Configuración básica
await initializeDoctorCalendar(doctorId, {
  timezone: 'America/Bogota',
  color: '#4285f4',
  autoSync: true,
  syncInterval: 30,
});

// Configuración avanzada
await initializeDoctorCalendar(
  doctorId,
  {
    timezone: 'America/Bogota',
    workingHours: {
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5], // Lunes a Viernes
    },
    notifications: {
      email: true,
      popup: true,
      reminderMinutes: [15, 60],
    },
  },
  {
    direction: 'bidirectional',
    conflictResolution: 'manual',
    retryAttempts: 3,
  }
);
```

### Sincronización de Citas

```typescript
// Sincronizar una cita específica a Google Calendar
const result = await syncAppointmentToGoogle(appointment);
if (result.success) {
  console.log(`Cita sincronizada: ${result.googleEventId}`);
} else {
  console.error(`Error: ${result.error}`);
}

// Sincronización completa bidireccional
const syncResult = await performFullSync(doctorId, {
  direction: 'bidirectional',
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
});

console.log(`Procesadas: ${syncResult.totalProcessed}`);
console.log(`Exitosas: ${syncResult.successful}`);
console.log(`Fallidas: ${syncResult.failed}`);
```

### Verificación de Conflictos

```typescript
const conflicts = await checkAppointmentConflicts(
  doctorId,
  new Date('2024-01-15'),
  '10:00 AM',
  30 // duración en minutos
);

if (conflicts.hasConflict) {
  console.log('Conflictos detectados:', conflicts.conflicts);
  console.log('Sugerencias:', conflicts.suggestions);
}
```

### Gestión de Estados

```typescript
// Obtener estado de sincronización
const status = await getDoctorSyncStatus(doctorId);
console.log('Sincronización habilitada:', status.doctor.syncEnabled);
console.log('Última sincronización:', status.doctor.lastSync);
console.log('Tasa de éxito:', status.stats.syncSuccessRate);
console.log('Estado saludable:', status.isHealthy);

// Obtener citas pendientes de sincronización
const pendingAppointments = await getPendingSyncAppointments();
console.log(`${pendingAppointments.length} citas pendientes`);

// Reintentar sincronizaciones fallidas
const retryResults = await retryFailedSyncs(10); // máximo 10 reintentos
console.log(`${retryResults.length} reintentos procesados`);
```

## Funciones Principales

### Base de Datos (`calendar-db-utils.ts`)

#### Doctores
- `getDoctorWithCalendar(doctorId)` - Obtiene doctor con configuración de calendario
- `updateDoctorCalendarConfig(doctorId, config)` - Actualiza configuración del doctor
- `updateDoctorLastSync(doctorId)` - Actualiza timestamp de última sincronización
- `getDoctorsWithSyncEnabled()` - Obtiene doctores con sincronización habilitada

#### Citas
- `createAppointmentWithCalendar(data)` - Crea cita con información de calendario
- `getAppointmentByGoogleEventId(eventId)` - Busca cita por ID de evento de Google
- `updateAppointmentSyncStatus(appointmentId, status)` - Actualiza estado de sincronización
- `getPendingSyncAppointments()` - Obtiene citas pendientes de sincronización
- `getFailedSyncAppointments()` - Obtiene citas con sincronización fallida
- `getDoctorAppointmentsByDateRange(doctorId, start, end)` - Obtiene citas por rango de fechas

#### Estadísticas
- `getDoctorSyncStats(doctorId)` - Estadísticas de sincronización del doctor
- `getGeneralSyncStats()` - Estadísticas generales del sistema

### Sincronización (`sync-service.ts`)

#### Sincronización Principal
- `syncAppointmentToGoogle(appointment)` - Sincroniza cita hacia Google Calendar
- `syncGoogleEventToDatabase(event, doctorId)` - Sincroniza evento desde Google Calendar
- `deleteAppointmentFromGoogle(appointment)` - Elimina evento de Google Calendar
- `syncDoctorPendingAppointments(doctorId)` - Sincroniza todas las citas pendientes
- `syncGoogleCalendarToDatabase(doctorId, start?, end?)` - Sincroniza desde Google Calendar

#### Verificación y Conflictos
- `checkAppointmentConflicts(doctorId, date, time, duration)` - Verifica conflictos de horarios
- `retryFailedSyncs(limit)` - Reintenta sincronizaciones fallidas

## Configuración Avanzada

### Personalización de Colores por Especialidad

```typescript
import { getColorBySpecialty } from '@/db/utils/GCalendar';

const color = getColorBySpecialty('cardiologia'); // #e53e3e
const defaultColor = getColorBySpecialty('general'); // #4285f4
```

### Configuración de Recordatorios

```typescript
import { getRemindersByAppointmentType } from '@/db/utils/GCalendar';

const emergencyReminders = getRemindersByAppointmentType('emergency'); // [15, 5]
const surgeryReminders = getRemindersByAppointmentType('surgery'); // [1440, 120, 30]
```

### Manejo de Errores

```typescript
import {
  CalendarSyncError,
  ConflictError,
  GoogleCalendarApiError,
} from '@/db/utils/GCalendar';

try {
  await syncAppointmentToGoogle(appointment);
} catch (error) {
  if (error instanceof CalendarSyncError) {
    console.error('Error de sincronización:', error.message);
    console.error('Código:', error.code);
    console.error('Cita ID:', error.appointmentId);
  } else if (error instanceof ConflictError) {
    console.error('Conflicto detectado:', error.conflicts);
  } else if (error instanceof GoogleCalendarApiError) {
    console.error('Error de API:', error.statusCode);
  }
}
```

## Estados de Sincronización

### Estados de Citas
- `pending` - Pendiente de sincronización
- `synced` - Sincronizada correctamente
- `failed` - Sincronización fallida
- `not_synced` - No sincronizada (por configuración)

### Estados de Citas Médicas
- `scheduled` - Programada
- `confirmed` - Confirmada
- `in_progress` - En progreso
- `completed` - Completada
- `cancelled` - Cancelada
- `no_show` - No se presentó
- `rescheduled` - Reprogramada

## Mejores Prácticas

### 1. Manejo de Rate Limits
```typescript
// El sistema incluye pausas automáticas entre sincronizaciones
// para evitar exceder los límites de la API de Google
```

### 2. Resolución de Conflictos
```typescript
// Siempre verificar conflictos antes de crear citas
const conflicts = await checkAppointmentConflicts(doctorId, date, time, duration);
if (conflicts.hasConflict) {
  // Manejar conflictos antes de proceder
}
```

### 3. Monitoreo de Sincronización
```typescript
// Verificar regularmente el estado de sincronización
const status = await getDoctorSyncStatus(doctorId);
if (!status.isHealthy) {
  // Investigar y resolver problemas
}
```

### 4. Limpieza Periódica
```typescript
// Limpiar sincronizaciones fallidas antiguas
await cleanupOldFailedSyncs(30); // más de 30 días
```

## Troubleshooting

### Problemas Comunes

1. **Error de autenticación**
   - Verificar credenciales de Google Calendar API
   - Renovar tokens de acceso si es necesario

2. **Conflictos de horarios**
   - Usar `checkAppointmentConflicts()` antes de crear citas
   - Implementar resolución automática o manual

3. **Sincronización lenta**
   - Ajustar `batchSize` en la configuración
   - Verificar límites de API

4. **Datos inconsistentes**
   - Ejecutar sincronización completa periódicamente
   - Verificar integridad de datos

### Logs y Debugging

```typescript
// Habilitar logs detallados
process.env.LOG_LEVEL = 'debug';

// Los errores se registran automáticamente
// Revisar logs para diagnosticar problemas
```

## Contribución

Para contribuir a este módulo:

1. Seguir las convenciones de TypeScript
2. Agregar tests para nuevas funcionalidades
3. Documentar cambios en este README
4. Usar Zod para validación de datos
5. Manejar errores apropiadamente

## Licencia

Este código es parte del sistema de consultoría médica y está sujeto a las políticas de la organización.