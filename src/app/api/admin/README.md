# API Administrativa - Sistema de Gestión Médica

API administrativa sin autenticación para acceder a toda la información del sistema de gestión médica, incluyendo doctores, citas, calendarios, eventos y disponibilidad.

## Endpoints Principales

### 1. API General - `/api/admin`

**GET** - Obtiene información general del sistema

**Parámetros de consulta:**
- `section` (opcional): Sección específica a obtener (`doctors`, `appointments`, `calendars`, `availability`)
- `doctorId` (opcional): ID del doctor específico
- `startDate` (opcional): Fecha de inicio (ISO 8601)
- `endDate` (opcional): Fecha de fin (ISO 8601)
- `limit` (opcional): Límite de resultados (default: 100)

**Ejemplos:**
```bash
# Obtener toda la información del sistema
GET /api/admin

# Obtener solo información de doctores
GET /api/admin?section=doctors

# Obtener información de un doctor específico
GET /api/admin?section=doctors&doctorId=1

# Obtener citas en un rango de fechas
GET /api/admin?section=appointments&startDate=2024-01-01&endDate=2024-01-31
```

### 2. API de Doctores - `/api/admin/doctors`

**GET** - Obtiene información de doctores

**Parámetros de consulta:**
- `id` (opcional): ID del doctor específico
- `includeSyncStats` (opcional): Incluir estadísticas de sincronización (`true`/`false`)
- `includeAppointments` (opcional): Incluir citas del doctor (`true`/`false`)
- `startDate` (opcional): Fecha de inicio para citas
- `endDate` (opcional): Fecha de fin para citas

**PUT** - Actualiza configuración de calendario del doctor

**Parámetros de consulta:**
- `id` (requerido): ID del doctor
- `action` (requerido): Acción a realizar (`update-calendar`, `sync-calendar`)

**Ejemplos:**
```bash
# Obtener todos los doctores
GET /api/admin/doctors

# Obtener doctor específico con estadísticas
GET /api/admin/doctors?id=1&includeSyncStats=true

# Obtener doctor con sus citas
GET /api/admin/doctors?id=1&includeAppointments=true&startDate=2024-01-01&endDate=2024-01-31

# Actualizar calendario del doctor
PUT /api/admin/doctors?id=1&action=update-calendar
Content-Type: application/json
{
  "googleCalendarId": "doctor@example.com",
  "syncEnabled": true
}
```

### 3. API de Citas - `/api/admin/appointments`

**GET** - Obtiene información de citas

**Parámetros de consulta:**
- `id` (opcional): ID de la cita específica
- `doctorId` (opcional): ID del doctor
- `calendarId` (opcional): ID del calendario de Google
- `googleEventId` (opcional): ID del evento de Google
- `startDate` (opcional): Fecha de inicio
- `endDate` (opcional): Fecha de fin
- `syncStatus` (opcional): Estado de sincronización (`pending`, `failed`, `synced`)
- `search` (opcional): Término de búsqueda
- `page` (opcional): Número de página (default: 1)
- `pageSize` (opcional): Tamaño de página (default: 50)

**PUT** - Actualiza estado de sincronización de citas

**Parámetros de consulta:**
- `id` (requerido): ID de la cita
- `action` (requerido): Acción a realizar (`sync-status`, `remove-calendar`)

**Ejemplos:**
```bash
# Obtener todas las citas
GET /api/admin/appointments

# Obtener cita específica
GET /api/admin/appointments?id=123

# Obtener citas de un doctor en rango de fechas
GET /api/admin/appointments?doctorId=1&startDate=2024-01-01&endDate=2024-01-31

# Obtener citas pendientes de sincronización
GET /api/admin/appointments?syncStatus=pending

# Buscar citas en calendario
GET /api/admin/appointments?calendarId=doctor@example.com&search=consulta

# Actualizar estado de sincronización
PUT /api/admin/appointments?id=123&action=sync-status
Content-Type: application/json
{
  "syncStatus": "synced",
  "lastSyncAt": "2024-01-15T10:30:00Z"
}
```

### 4. API de Calendarios - `/api/admin/calendars`

**GET** - Obtiene información de calendarios y eventos

**Parámetros de consulta:**
- `calendarId` (opcional): ID del calendario específico
- `eventId` (opcional): ID del evento específico
- `doctorId` (opcional): ID del doctor
- `action` (opcional): Acción específica (`events`, `appointments`, `settings`, `acl`, `freebusy`, `colors`, `full`)
- `startDate` (opcional): Fecha de inicio
- `endDate` (opcional): Fecha de fin
- `searchQuery` (opcional): Término de búsqueda
- `maxResults` (opcional): Máximo de resultados (default: 250)
- `timeZone` (opcional): Zona horaria (default: America/Bogota)

**POST** - Crear calendario o evento

**Parámetros de consulta:**
- `action` (requerido): Acción a realizar (`create-calendar`, `create-event`)
- `calendarId` (requerido para crear evento): ID del calendario

**PUT** - Actualizar calendario o evento

**Parámetros de consulta:**
- `action` (requerido): Acción a realizar (`update-calendar`, `update-event`, `update-settings`, `update-acl`)
- `calendarId` (requerido): ID del calendario
- `eventId` (requerido para eventos): ID del evento

**DELETE** - Eliminar calendario o evento

**Parámetros de consulta:**
- `action` (requerido): Acción a realizar (`delete-calendar`, `delete-event`)
- `calendarId` (requerido): ID del calendario
- `eventId` (requerido para eventos): ID del evento

**Ejemplos:**
```bash
# Obtener todos los calendarios del sistema
GET /api/admin/calendars

# Obtener calendario específico
GET /api/admin/calendars?calendarId=doctor@example.com

# Obtener eventos de un calendario
GET /api/admin/calendars?calendarId=doctor@example.com&action=events&startDate=2024-01-01&endDate=2024-01-31

# Obtener información completa de un calendario
GET /api/admin/calendars?calendarId=doctor@example.com&action=full

# Obtener disponibilidad (freebusy)
GET /api/admin/calendars?calendarId=doctor@example.com&action=freebusy&startDate=2024-01-15T00:00:00Z&endDate=2024-01-22T23:59:59Z

# Obtener calendarios de un doctor
GET /api/admin/calendars?doctorId=1

# Obtener evento específico
GET /api/admin/calendars?calendarId=doctor@example.com&eventId=event123
```

### 5. API de Disponibilidad - `/api/admin/availability`

**GET** - Obtiene información de disponibilidad y estadísticas

**Parámetros de consulta:**
- `doctorId` (opcional): ID del doctor específico
- `calendarId` (opcional): ID del calendario específico
- `startDate` (opcional): Fecha de inicio
- `endDate` (opcional): Fecha de fin
- `timeZone` (opcional): Zona horaria (default: America/Bogota)
- `action` (opcional): Acción específica (`freebusy`, `appointments`, `events`, `stats`, `schedule`, `full`)
- `granularity` (opcional): Granularidad de datos (`day`, `week`, `month`) (default: day)
- `includeWeekends` (opcional): Incluir fines de semana (`true`/`false`)

**Ejemplos:**
```bash
# Obtener estadísticas generales del sistema
GET /api/admin/availability

# Obtener disponibilidad de un doctor
GET /api/admin/availability?doctorId=1&action=freebusy&startDate=2024-01-15&endDate=2024-01-22

# Obtener horario completo de un doctor
GET /api/admin/availability?doctorId=1&action=full&startDate=2024-01-01&endDate=2024-01-31

# Obtener estadísticas de citas de un doctor
GET /api/admin/availability?doctorId=1&action=stats&startDate=2024-01-01&endDate=2024-01-31&granularity=week

# Obtener disponibilidad de un calendario
GET /api/admin/availability?calendarId=doctor@example.com&action=freebusy&startDate=2024-01-15&endDate=2024-01-22
```

## Estructura de Respuestas

Todas las respuestas siguen el siguiente formato:

```json
{
  "success": true|false,
  "data": { /* datos específicos del endpoint */ },
  "error": "mensaje de error (si aplica)",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Respuestas de Error

```json
{
  "success": false,
  "error": "Descripción del error",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Casos de Uso Comunes

### 1. Monitoreo del Sistema
```bash
# Obtener resumen completo del sistema
GET /api/admin

# Verificar estado de sincronización
GET /api/admin/appointments?syncStatus=failed
GET /api/admin/appointments?syncStatus=pending
```

### 2. Gestión de Doctores
```bash
# Listar todos los doctores con sus calendarios
GET /api/admin/doctors?includeSyncStats=true

# Configurar calendario para un doctor
PUT /api/admin/doctors?id=1&action=update-calendar
```

### 3. Análisis de Disponibilidad
```bash
# Ver disponibilidad de todos los doctores
GET /api/admin/availability

# Analizar horario específico de un doctor
GET /api/admin/availability?doctorId=1&action=schedule&startDate=2024-01-15&endDate=2024-01-22
```

### 4. Gestión de Citas
```bash
# Buscar citas específicas
GET /api/admin/appointments?search=urgente&calendarId=doctor@example.com

# Ver citas de un período específico
GET /api/admin/appointments?startDate=2024-01-01&endDate=2024-01-31&page=1&pageSize=100
```

### 5. Administración de Calendarios
```bash
# Ver todos los eventos de un calendario
GET /api/admin/calendars?calendarId=doctor@example.com&action=events&maxResults=500

# Obtener configuraciones de un calendario
GET /api/admin/calendars?calendarId=doctor@example.com&action=settings
```

## Notas Importantes

1. **Sin Autenticación**: Esta API no requiere autenticación. Úsala solo en entornos seguros.

2. **Límites de Rate**: Respeta los límites de la API de Google Calendar para evitar errores de cuota.

3. **Zonas Horarias**: Todas las fechas deben estar en formato ISO 8601. La zona horaria por defecto es `America/Bogota`.

4. **Paginación**: Los endpoints que retornan listas grandes soportan paginación con `page` y `pageSize`.

5. **Filtros de Fecha**: Usa `startDate` y `endDate` para filtrar resultados por rango de fechas.

6. **Manejo de Errores**: Siempre verifica el campo `success` en la respuesta antes de procesar los datos.

7. **Rendimiento**: Para consultas grandes, usa filtros específicos para mejorar el rendimiento.

## Integración con Servicios Existentes

Esta API utiliza los siguientes servicios internos:

- **appointment-service.ts**: Gestión de citas en Google Calendar
- **calendar-utils.ts**: Utilidades para calendarios de Google
- **calendar-db-utils.ts**: Utilidades de base de datos para calendarios
- **Base de datos Drizzle**: Almacenamiento de datos locales

Todos los endpoints están diseñados para proporcionar una vista unificada de la información almacenada tanto en la base de datos local como en Google Calendar.