# API de Disponibilidad de Doctores por Servicio con Autenticación API Key

## Descripción General

Esta API permite consultar la disponibilidad de horarios de un doctor específico para un servicio médico determinado utilizando autenticación por API Key. Está diseñada para integraciones externas como n8n workflows, sistemas de automatización y agentes de IA que utilizan Model Context Protocol (MCP). La duración de los intervalos se determina automáticamente según la duración configurada del servicio médico.

## Información del Endpoint

- **URL**: `/api/n8n/doctors/[doctorId]/availability/[serviceId]`
- **Método**: `GET`
- **Autenticación**: API Key (Header: `X-API-Key`)
- **Formato de Respuesta**: JSON
- **Versión**: 1.0.0

**Características principales:**
- Autenticación segura con API Key
- Duración de intervalos basada en el servicio médico
- Zona horaria específica del doctor
- Validación con Zod para mayor robustez
- Logging detallado para debugging

## Autenticación

### Requerimientos de API Key

```http
GET /api/n8n/doctors/123/availability/456?date=2025-01-15
Headers:
  X-API-Key: your-api-key-here
  Content-Type: application/json
```

**Variables de Entorno Requeridas:**
- `N8N_API_KEY`: La API key válida para autenticación

## Parámetros de Entrada

### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `doctorId` | string/number | ✅ | ID único del doctor. Acepta tanto string como number, se convierte automáticamente |
| `serviceId` | string/number | ✅ | ID único del servicio médico. Determina la duración de los intervalos |

### Parámetros de Consulta (Query Parameters)

| Parámetro | Tipo | Requerido | Default | Descripción | Validación |
|-----------|------|-----------|---------|-------------|------------|
| `date` | string | ✅ | - | Fecha para consultar disponibilidad | Formato YYYY-MM-DD, validado con Luxon |

### Validaciones Detalladas

#### doctorId
- **Acepta**: String numérico ("123") o number (123)
- **Conversión**: Automática de string a number
- **Validación**: Debe ser un número entero positivo
- **Ejemplo**: `"1"` → `1`, `123` → `123`

#### serviceId
- **Acepta**: String numérico ("456") o number (456)
- **Conversión**: Automática de string a number
- **Validación**: Debe ser un número entero positivo y existir en la base de datos
- **Función**: Determina la duración de los intervalos según `durationMinutes` del servicio
- **Ejemplo**: `"1"` → `1`, `456` → `456`

#### date
- **Formato**: YYYY-MM-DD
- **Validación**: 
  - Formato de fecha válido usando Luxon
  - Debe ser una fecha real
- **Zona Horaria**: Se interpreta en la zona horaria del doctor
- **Ejemplos**: 
  - ✅ `"2025-01-15"`
  - ✅ `"2025-12-31"`
  - ❌ `"2025-13-01"` (mes inválido)
  - ❌ `"invalid-date"` (formato inválido)

## Respuesta Exitosa

### Estructura de Respuesta (200 OK)

```json
{
  "intervals": [
    {
      "start": "2025-01-15T09:00:00",
      "end": "2025-01-15T09:30:00"
    },
    {
      "start": "2025-01-15T09:30:00",
      "end": "2025-01-15T10:00:00"
    },
    {
      "start": "2025-01-15T10:30:00",
      "end": "2025-01-15T11:00:00"
    }
  ],
  "timezone": "America/Bogota"
}
```

### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `intervals` | array | Array de objetos TimeSlot con horarios disponibles |
| `intervals[].start` | string | Fecha y hora de inicio del slot (sin offset de zona horaria) |
| `intervals[].end` | string | Fecha y hora de fin del slot (sin offset de zona horaria) |
| `timezone` | string | Zona horaria del doctor para interpretar los horarios |

### Características de los Intervalos

- **Duración**: Determinada por el campo `durationMinutes` del servicio médico
- **Formato de Hora**: ISO 8601 sin offset (`includeOffset: false`)
- **Zona Horaria**: Los horarios están en la zona horaria del doctor
- **Validación**: La duración del servicio debe ser mínimo 5 minutos

## Manejo de Errores

### Errores de Autenticación (401)

```json
{
  "error": "API Key requerida en el header X-API-Key"
}
```

```json
{
  "error": "API Key inválida"
}
```

```json
{
  "error": "Configuración de API Key no disponible"
}
```

```json
{
  "error": "Error interno de autenticación"
}
```

### Errores de Validación (400)

```json
{
  "error": "El parámetro \"date\" es requerido"
}
```

```json
{
  "error": "Formato de fecha inválido. Use YYYY-MM-DD."
}
```

```json
{
  "error": "El doctorId debe ser un número válido"
}
```

```json
{
  "error": "El serviceId debe ser un número válido"
}
```

### Errores del Servidor (500)

```json
{
  "error": "Error interno del servidor"
}
```

**Causas comunes de errores 500:**
- Doctor no encontrado o sin zona horaria configurada
- Servicio médico no encontrado
- Duración del servicio inválida (< 5 minutos)
- Error en la consulta de disponibilidad

## Ejemplos de Uso

### Ejemplo 1: Consulta Básica

```bash
curl -X GET \
  "https://your-domain.com/api/n8n/doctors/123/availability/456?date=2025-01-15" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

### Ejemplo 2: Usando n8n HTTP Request Node

```json
{
  "method": "GET",
  "url": "https://your-domain.com/api/n8n/doctors/{{ $json.doctorId }}/availability/{{ $json.serviceId }}",
  "headers": {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json"
  },
  "qs": {
    "date": "{{ $json.date }}"
  }
}
```

### Ejemplo 3: Respuesta con Servicio de 45 minutos

```json
{
  "intervals": [
    {
      "start": "2025-01-15T09:00:00",
      "end": "2025-01-15T09:45:00"
    },
    {
      "start": "2025-01-15T10:00:00",
      "end": "2025-01-15T10:45:00"
    }
  ],
  "timezone": "America/Bogota"
}
```

## Integración con Base de Datos

### Configuración Requerida del Doctor

- `calendar_id`: ID del calendario de Google del doctor
- `working_hours`: Horarios de trabajo por día de la semana
- `calendar_timezone`: Zona horaria del doctor (ej: "America/Bogota")
- `break_times`: Tiempos de descanso (opcional)

### Configuración Requerida del Servicio Médico

- `id`: ID único del servicio
- `durationMinutes`: Duración en minutos del servicio (mínimo 5)
- `name`: Nombre del servicio (para referencia)

### Consultas de Base de Datos

```sql
-- Obtener doctor con zona horaria
SELECT calendar_timezone FROM doctors WHERE idDoctor = ?

-- Obtener duración del servicio
SELECT durationMinutes FROM medicalServices WHERE id = ?
```

## Consideraciones para AI/MCP

### Optimizaciones para Agentes de IA

1. **Validación Robusta con Zod**:
   - Validación de esquemas estricta
   - Mensajes de error específicos y claros
   - Validación de tipos automática

2. **Flexibilidad de Entrada**:
   - Los IDs pueden enviarse como strings y se convierten automáticamente
   - Validación de formato de fecha con Luxon

3. **Respuesta Estructurada**:
   - Incluye zona horaria para interpretación correcta
   - Formato de hora consistente sin offset
   - Duración automática basada en el servicio

### Flujo de Trabajo Recomendado

1. **Autenticación**: Configurar API Key en headers
2. **Validación de Recursos**: Verificar que doctor y servicio existen
3. **Consulta de Disponibilidad**: Llamar al endpoint con fecha deseada
4. **Interpretación de Resultados**: Usar timezone para convertir horarios si es necesario
5. **Procesamiento**: Usar los slots para agendar citas del servicio específico

### Ejemplo de Implementación en MCP

```typescript
// Función para obtener disponibilidad por servicio
async function getDoctorServiceAvailability(
  doctorId: string, 
  serviceId: string, 
  date: string
) {
  const response = await fetch(
    `/api/n8n/doctors/${doctorId}/availability/${serviceId}?date=${date}`,
    {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error ${response.status}: ${error.error}`);
  }
  
  const data = await response.json();
  return {
    intervals: data.intervals,
    timezone: data.timezone,
    // Convertir a zona horaria local si es necesario
    localIntervals: data.intervals.map(slot => ({
      start: DateTime.fromISO(slot.start, { zone: data.timezone }).toLocal().toISO(),
      end: DateTime.fromISO(slot.end, { zone: data.timezone }).toLocal().toISO()
    }))
  };
}
```

## Diferencias con la API Base

### Ventajas de esta API

1. **Duración Automática**: No requiere especificar `interval`, se obtiene del servicio
2. **Zona Horaria Incluida**: Respuesta incluye timezone para interpretación correcta
3. **Validación Mejorada**: Usa Zod para validación más robusta
4. **Contexto de Servicio**: Los intervalos están optimizados para el servicio específico

### Cuándo Usar Esta API vs la Base

**Usar esta API cuando:**
- Necesites agendar un servicio médico específico
- Requieras la duración exacta del servicio
- Necesites la zona horaria del doctor
- Quieras validación más estricta

**Usar la API base cuando:**
- Necesites intervalos personalizables
- No tengas un servicio específico en mente
- Requieras mayor flexibilidad en duración

## Troubleshooting

### Problemas Comunes

1. **Error 401 - API Key Inválida**
   - Verificar que `N8N_API_KEY` esté configurada
   - Confirmar que el header `X-API-Key` esté presente
   - Validar que la API Key sea correcta

2. **Error 500 - Doctor o Servicio No Encontrado**
   - Verificar que el doctor existe y tiene `calendar_timezone`
   - Confirmar que el servicio existe y tiene `durationMinutes` válido
   - Validar que la duración del servicio sea ≥ 5 minutos

3. **Error 400 - Validación Zod**
   - Revisar formato de fecha (YYYY-MM-DD)
   - Verificar que doctorId y serviceId sean números válidos
   - Confirmar que todos los parámetros requeridos estén presentes

4. **Array Vacío en intervals**
   - El doctor no trabaja ese día
   - Todos los horarios están ocupados
   - La duración del servicio es muy larga para los intervalos disponibles

### Logs de Debug

La API incluye logs detallados para debugging:

```
API: /api/n8n/doctors/[doctorId]/availability/[serviceId] - Request received
Request Params: date=2025-01-15
Parsed doctorId: 123, serviceId: 456
Service duration: 30 minutes
Attempting to get availability for doctor 123 on 2025-01-15 with service 456
Date Range: startDate=2025-01-15T00:00:00.000-05:00, endDate=2025-01-15T23:59:59.999-05:00, timezone=America/Bogota
Calling getDoctorAvailability...
Received X available intervals from getDoctorAvailability.
Generated X final available slots.
```

## Seguridad

### Mejores Prácticas

1. **API Key Management**:
   - Rotar API Keys regularmente
   - No exponer API Keys en logs
   - Usar variables de entorno seguras

2. **Validación de Entrada**:
   - Validación estricta con Zod
   - Sanitización automática de datos
   - Prevención de inyección de código

3. **Rate Limiting**:
   - Implementar rate limiting por IP/API Key
   - Monitorear uso de Google Calendar API

4. **Logging Seguro**:
   - No loggear información sensible
   - Logs estructurados para auditoría
   - Monitoreo de errores de autenticación

---

**Nota**: Esta API está optimizada para uso con servicios médicos específicos y proporciona mayor precisión en la duración de los intervalos. Para casos de uso más flexibles, considere usar la API base `/api/n8n/doctors/[doctorId]/availability`.