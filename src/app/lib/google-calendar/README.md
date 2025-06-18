# Google Calendar API - Módulo de Consultoría

## Descripción

Módulo completo para la gestión de calendarios y citas médicas utilizando Google Calendar API con Service Account. Diseñado específicamente para aplicaciones de consultoría médica.

## Características

- ✅ **Autenticación con Service Account** - Sin OAuth, sin guardar en cuenta personal
- ✅ **CRUD completo de calendarios** - Crear, leer, actualizar, eliminar
- ✅ **CRUD completo de eventos/citas** - Gestión completa de citas médicas
- ✅ **Validación con Zod** - Esquemas robustos para validación de datos
- ✅ **Tipos TypeScript** - Tipado completo para mejor DX
- ✅ **Funciones especializadas** - Lógica específica para consultorios médicos
- ✅ **Búsqueda y filtros** - Búsqueda avanzada de citas
- ✅ **Estadísticas** - Métricas y análisis del consultorio
- ✅ **Gestión de horarios** - Verificación de disponibilidad y slots libres

## Configuración

### Variables de Entorno

Asegúrate de tener estas variables en tu archivo `.env`:

```env
# Google Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=tu-service-account@proyecto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Configuración del calendario
GOOGLE_MAIN_CALENDAR_ID=tu-calendario-principal@gmail.com
DEFAULT_TIMEZONE=America/Mexico_City
```

### Instalación de Dependencias

```bash
npm install @googleapis/calendar googleapis zod
```

## Uso Básico

### Importación

```typescript
import {
  // Configuración
  googleCalendarClient,
  verifyConnection,
  
  // CRUD de calendarios
  createCalendar,
  listCalendars,
  
  // CRUD de citas
  createAppointment,
  listAppointments,
  updateAppointment,
  cancelAppointment,
  
  // Utilidades
  getAvailableAppointmentSlots,
  getConsultorioStatistics,
  
  // Tipos
  type CreateAppointmentInput,
  type Appointment,
  AppointmentStatus,
  ConsultationType,
} from '@/lib/google-calendar';
```

### Verificar Conexión

```typescript
async function checkConnection() {
  const result = await verifyConnection();
  
  if (result.success) {
    console.log('✅ Conexión exitosa con Google Calendar');
  } else {
    console.error('❌ Error de conexión:', result.error);
  }
}
```

### Crear un Calendario

```typescript
async function createConsultorioCalendar() {
  const result = await createCalendar({
    summary: 'Consultorio Dr. García',
    description: 'Calendario para citas médicas',
    timeZone: 'America/Mexico_City',
    location: 'Av. Principal 123, Ciudad',
  });
  
  if (result.success) {
    console.log('Calendario creado:', result.data?.id);
    return result.data?.id;
  } else {
    console.error('Error:', result.error);
  }
}
```

### Crear una Cita

```typescript
async function createMedicalAppointment() {
  const appointmentData: CreateAppointmentInput = {
    patient: {
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      phone: '+52 55 1234 5678',
      dateOfBirth: '1985-03-15',
    },
    doctor: {
      id: 'dr-garcia-001',
      name: 'Dr. Carlos García',
      email: 'dr.garcia@consultorio.com',
      specialization: 'Medicina General',
    },
    consultationType: ConsultationType.INITIAL,
    startDateTime: '2024-02-15T10:00:00-06:00',
    endDateTime: '2024-02-15T10:30:00-06:00',
    reasonForVisit: 'Consulta de rutina y chequeo general',
    location: 'Consultorio 1, Av. Principal 123',
    notes: 'Paciente nuevo, primera consulta',
  };
  
  const result = await createAppointment('calendar-id', appointmentData);
  
  if (result.success) {
    console.log('Cita creada:', result.data?.appointmentId);
  } else {
    console.error('Error:', result.error);
  }
}
```

### Listar Citas

```typescript
async function getAppointments() {
  const result = await listAppointments('calendar-id', {
    startDate: '2024-02-01T00:00:00Z',
    endDate: '2024-02-29T23:59:59Z',
    status: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
  }, {
    page: 1,
    pageSize: 20,
  });
  
  if (result.success) {
    console.log(`Total de citas: ${result.data?.total}`);
    result.data?.data.forEach(appointment => {
      console.log(`- ${appointment.patient.name}: ${appointment.startDateTime}`);
    });
  }
}
```

### Verificar Disponibilidad

```typescript
async function checkAvailableSlots() {
  const result = await getAvailableAppointmentSlots(
    'calendar-id',
    '2024-02-15', // fecha
    30, // duración en minutos
    { start: '09:00', end: '17:00' } // horario de trabajo
  );
  
  if (result.success) {
    console.log('Horarios disponibles:');
    result.data?.forEach(slot => {
      console.log(`- ${slot.start} a ${slot.end}`);
    });
  }
}
```

### Obtener Estadísticas

```typescript
async function getStats() {
  const result = await getConsultorioStatistics(
    'calendar-id',
    '2024-01-01T00:00:00Z',
    '2024-12-31T23:59:59Z'
  );
  
  if (result.success) {
    const stats = result.data!;
    console.log(`Total de citas: ${stats.totalAppointments}`);
    console.log(`Citas completadas: ${stats.completedAppointments}`);
    console.log(`Tasa de retención: ${stats.patientRetentionRate}%`);
  }
}
```

## API Reference

### Configuración

#### `verifyConnection()`
Verifica la conexión con Google Calendar API.

**Returns:** `Promise<CalendarOperationResult<boolean>>`

#### `getServiceAccountInfo()`
Obtiene información de la cuenta de servicio.

**Returns:** `Promise<CalendarOperationResult<object>>`

### CRUD de Calendarios

#### `createCalendar(input: CreateCalendarInput)`
Crea un nuevo calendario.

**Parameters:**
- `input.summary` - Nombre del calendario
- `input.description` - Descripción (opcional)
- `input.timeZone` - Zona horaria (opcional)
- `input.location` - Ubicación (opcional)

#### `listCalendars()`
Lista todos los calendarios accesibles.

#### `updateCalendar(calendarId: string, updates: Partial<CreateCalendarInput>)`
Actualiza un calendario existente.

#### `deleteCalendar(calendarId: string)`
Elimina un calendario.

### CRUD de Citas

#### `createAppointment(calendarId: string, input: CreateAppointmentInput)`
Crea una nueva cita médica.

#### `getAppointment(calendarId: string, eventId: string)`
Obtiene una cita específica.

#### `listAppointments(calendarId: string, filters?: AppointmentFilters, pagination?)`
Lista citas con filtros y paginación.

#### `updateAppointment(calendarId: string, eventId: string, updates: UpdateAppointmentInput)`
Actualiza una cita existente.

#### `cancelAppointment(calendarId: string, eventId: string, reason?: string)`
Cancela una cita (la marca como cancelada).

#### `deleteAppointment(calendarId: string, eventId: string)`
Elimina permanentemente una cita.

### Utilidades

#### `searchAppointments(calendarId: string, query: string, filters?)`
Busca citas por texto.

#### `getAvailableAppointmentSlots(calendarId: string, date: string, duration?, workingHours?)`
Obtiene horarios disponibles para un día específico.

#### `getConsultorioStatistics(calendarId: string, startDate: string, endDate: string)`
Obtiene estadísticas del consultorio en un rango de fechas.

## Tipos Principales

### `CreateAppointmentInput`
```typescript
interface CreateAppointmentInput {
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultationType: ConsultationType;
  priority?: AppointmentPriority;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  notes?: string;
  symptoms?: string;
  reasonForVisit: string;
  isTelemedicine?: boolean;
  meetingLink?: string;
  reminderMinutes?: number[];
}
```

### `Appointment`
```typescript
interface Appointment {
  id: string;
  calendarId: string;
  eventId: string;
  patient: PatientInfo;
  doctor: DoctorInfo;
  consultationType: ConsultationType;
  priority: AppointmentPriority;
  status: AppointmentStatus;
  startDateTime: string;
  endDateTime: string;
  // ... más propiedades
}
```

### Enums

```typescript
enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

enum ConsultationType {
  INITIAL = 'initial',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  TELEMEDICINE = 'telemedicine',
  PROCEDURE = 'procedure',
  CONSULTATION = 'consultation',
}
```

## Manejo de Errores

Todas las funciones retornan un objeto `CalendarOperationResult<T>` con la siguiente estructura:

```typescript
interface CalendarOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**Ejemplo de manejo:**

```typescript
const result = await createAppointment(calendarId, appointmentData);

if (result.success) {
  // Operación exitosa
  console.log('Datos:', result.data);
} else {
  // Error
  console.error('Error:', result.error);
}
```

## Mejores Prácticas

1. **Validación de entrada:** Siempre valida los datos antes de enviarlos a las funciones.
2. **Manejo de errores:** Implementa manejo robusto de errores en tu aplicación.
3. **Verificación de disponibilidad:** Siempre verifica disponibilidad antes de crear citas.
4. **Logging:** Utiliza los logs para debugging y monitoreo.
5. **Rate limiting:** Respeta los límites de la API de Google Calendar.
6. **Caché:** Considera implementar caché para consultas frecuentes.

## Troubleshooting

### Error de autenticación
- Verifica que las credenciales del Service Account sean correctas
- Asegúrate de que la clave privada esté correctamente formateada
- Verifica que el Service Account tenga permisos en el calendario

### Error de permisos
- Comparte el calendario con el email del Service Account
- Otorga permisos de "Hacer cambios y gestionar uso compartido"

### Error de zona horaria
- Verifica que las fechas estén en formato ISO 8601
- Asegúrate de incluir la zona horaria correcta

## Contribución

Para contribuir al módulo:

1. Mantén la consistencia en el estilo de código
2. Agrega tests para nuevas funcionalidades
3. Actualiza la documentación
4. Sigue las convenciones de TypeScript
5. Utiliza ESLint y Prettier

## Licencia

Este módulo es parte del proyecto de consultoría médica y está sujeto a las mismas condiciones de licencia del proyecto principal.