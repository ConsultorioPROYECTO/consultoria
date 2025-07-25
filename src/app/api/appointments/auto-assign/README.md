# API de Citas con Asignación Automática de Doctor

## Descripción

Esta API permite crear citas médicas sin especificar un `doctorId`. El sistema automáticamente busca y asigna el primer doctor disponible que:

1. **Pueda atender el servicio** - El doctor debe estar habilitado para ofrecer el servicio médico solicitado
2. **Tenga disponibilidad** - El doctor debe tener disponibilidad en la fecha y hora solicitadas

## Endpoint

```
POST /api/appointments/auto-assign
```

## Autenticación

Requiere autenticación Firebase con rol de `admin` o `asistente`.

```
Authorization: Bearer <firebase-token>
Content-Type: application/json
```

## Parámetros de Entrada

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `identificationNumber` | string | ✅ | Número de identificación del paciente |
| `identificationType` | string | ✅ | Tipo de documento (DNI, CC, TI, CE, PP, RC, AS) |
| `serviceId` | number | ✅ | ID del servicio médico |
| `organizationId` | number | ✅ | ID de la organización |
| `date` | string | ✅ | Fecha de la cita (YYYY-MM-DD) |
| `time` | string | ✅ | Hora de la cita (HH:MM) |
| `isVirtual` | boolean | ❌ | Si la cita es virtual (default: false) |
| `meetingLink` | string | ❌ | Link de reunión (requerido si isVirtual=true) |
| `notes` | string | ❌ | Notas adicionales |

## Ejemplo de Solicitud

```json
{
  "identificationNumber": "12345678",
  "identificationType": "CC",
  "serviceId": 5,
  "organizationId": 1,
  "date": "2024-01-15",
  "time": "14:30",
  "isVirtual": true,
  "meetingLink": "https://meet.google.com/abc-defg-hij",
  "notes": "Consulta de seguimiento"
}
```

## Respuesta Exitosa (201)

```json
{
  "message": "Cita creada exitosamente con doctor asignado automáticamente",
  "data": {
    "appointmentId": 456,
    "assignedDoctorId": 12,
    "assignedDoctorName": "Dr. Juan Pérez",
    "googleEventId": "abc123def456",
    "googleCalendarId": "doctor_calendar_id",
    "status": "pending",
    "syncStatus": "synced"
  }
}
```

## Respuestas de Error

### 400 - Solicitud Inválida
```json
{
  "error": "Campos requeridos faltantes: identificationNumber, identificationType, serviceId, organizationId, date, time"
}
```

### 401 - No Autenticado
```json
{
  "error": "Acceso denegado: Token inválido"
}
```

### 403 - Sin Permisos
```json
{
  "error": "Usuario no tiene permisos para crear citas. Se requiere rol de admin o asistente"
}
```

### 404 - Paciente No Encontrado
```json
{
  "error": "Paciente no encontrado",
  "details": "No se encontró un paciente con CC 12345678 en esta organización"
}
```

### 404 - Servicio No Encontrado
```json
{
  "error": "Servicio médico no encontrado",
  "details": "No se encontró un servicio médico con ID 5"
}
```

### 409 - No Hay Doctores Disponibles
```json
{
  "error": "No hay doctores disponibles",
  "details": "No se encontró ningún doctor disponible para el servicio en la fecha y hora solicitadas. Intente con otra fecha u hora."
}
```

### 500 - Error Interno
```json
{
  "error": "Error interno del servidor"
}
```

## Validaciones

### Validaciones de Formato
- **Fecha**: Debe estar en formato `YYYY-MM-DD`
- **Hora**: Debe estar en formato `HH:MM` (24 horas)
- **Tipo de Identificación**: Debe ser uno de: DNI, CC, TI, CE, PP, RC, AS

### Validaciones de Negocio
- El paciente debe existir en la organización especificada
- El servicio médico debe pertenecer a la organización
- El usuario debe tener permisos en la organización solicitada
- Debe existir al menos un doctor habilitado para el servicio
- El doctor asignado debe tener disponibilidad en la fecha/hora solicitada

### Validaciones de Citas Virtuales
- Si `isVirtual` es `true`, el campo `meetingLink` es obligatorio

## Algoritmo de Asignación

El sistema busca doctores disponibles en el siguiente orden:

1. **Filtrar doctores habilitados**: Solo doctores que pueden ofrecer el servicio solicitado
2. **Verificar organización**: Solo doctores que pertenecen a la misma organización
3. **Verificar calendario**: Solo doctores con integración de Google Calendar habilitada
4. **Verificar disponibilidad**: Solo doctores con disponibilidad en la fecha/hora exacta
5. **Seleccionar el primero**: Se asigna el primer doctor que cumple todos los criterios

## Integración con Google Calendar

- Si el doctor asignado tiene Google Calendar habilitado, se crea automáticamente un evento
- El evento incluye información del paciente, servicio y notas
- Se retorna el `googleEventId` y `googleCalendarId` en la respuesta
- El `syncStatus` indica si la sincronización fue exitosa

## Casos de Uso

### 1. Cita Presencial Básica
```json
{
  "identificationNumber": "87654321",
  "identificationType": "CC",
  "serviceId": 3,
  "organizationId": 1,
  "date": "2024-02-20",
  "time": "09:00"
}
```

### 2. Cita Virtual con Notas
```json
{
  "identificationNumber": "11223344",
  "identificationType": "TI",
  "serviceId": 7,
  "organizationId": 2,
  "date": "2024-02-21",
  "time": "16:30",
  "isVirtual": true,
  "meetingLink": "https://zoom.us/j/123456789",
  "notes": "Primera consulta - revisar historial médico"
}
```

## Diferencias con la API Regular

| Característica | API Regular | API Auto-Assign |
|----------------|-------------|------------------|
| Doctor ID | Requerido | No requerido |
| Identificación del Paciente | Patient ID | Número + Tipo de Identificación |
| Asignación | Manual | Automática |
| Validación de Disponibilidad | Manual | Automática |

## Consideraciones de Rendimiento

- La búsqueda de doctores disponibles puede tomar tiempo si hay muchos doctores
- Se recomienda tener índices en las tablas de doctores y servicios
- La integración con Google Calendar puede añadir latencia
- Se procesan doctores secuencialmente hasta encontrar uno disponible

## Monitoreo y Logs

La API genera logs detallados para:
- Búsqueda de doctores disponibles
- Validación de disponibilidad por doctor
- Errores de integración con Google Calendar
- Creación exitosa de citas

Estos logs ayudan a diagnosticar problemas de disponibilidad y rendimiento.