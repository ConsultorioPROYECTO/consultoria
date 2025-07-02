# API de Disponibilidad de Doctores con Autenticación API Key

## Descripción General

Esta API permite consultar la disponibilidad de horarios de un doctor específico utilizando autenticación por API Key. Está diseñada para integraciones externas como n8n workflows, sistemas de automatización y agentes de IA que utilizan Model Context Protocol (MCP).

## Información del Endpoint

- **URL**: `/api/n8n/doctors/[doctorId]/availability`
- **Método**: `GET`
- **Autenticación**: API Key (Header: `X-API-Key`)
- **Formato de Respuesta**: JSON
- **Versión**: 1.1.0

## Autenticación

### Requerimientos de API Key

```http
GET /api/n8n/doctors/123/availability?date=2024-01-15&interval=30
Headers:
  X-API-Key: your-api-key-here
  Content-Type: application/json
```

**Variables de Entorno Requeridas:**
- `N8N_API_KEY`: La API key válida para autenticación
- `DEFAULT_ORGANIZATION_ID`: ID de la organización por defecto (opcional, default: 1)

## Parámetros de Entrada

### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `doctorId` | string/number | ✅ | ID único del doctor. Acepta tanto string como number, se convierte automáticamente |

### Parámetros de Consulta (Query Parameters)

| Parámetro | Tipo | Requerido | Default | Descripción | Validación |
|-----------|------|-----------|---------|-------------|------------|
| `date` | string | ✅ | - | Fecha para consultar disponibilidad | Formato YYYY-MM-DD, no puede ser en el pasado |
| `interval` | string/number | ❌ | 30 | Duración del intervalo en minutos | Entre 5 y 120 minutos, acepta string o number |

### Validaciones Detalladas

#### doctorId
- **Acepta**: String numérico ("123") o number (123)
- **Conversión**: Automática de string a number
- **Validación**: Debe ser un número entero positivo
- **Ejemplo**: `"1"` → `1`, `123` → `123`

#### date
- **Formato**: YYYY-MM-DD
- **Validación**: 
  - Formato de fecha válido
  - No puede ser una fecha pasada
  - Debe ser una fecha real (no 2024-02-30)
- **Ejemplos**: 
  - ✅ `"2024-01-15"`
  - ✅ `"2024-12-31"`
  - ❌ `"2024-13-01"` (mes inválido)
  - ❌ `"2023-01-01"` (fecha pasada)

#### interval
- **Acepta**: String numérico ("30") o number (30)
- **Conversión**: Automática de string a number
- **Rango**: 5-120 minutos
- **Default**: 30 minutos
- **Ejemplos**: `"15"` → `15`, `60` → `60`

## Respuesta Exitosa

### Estructura de Respuesta (200 OK)

```json
[
  {
    "start": "2024-01-15T09:00:00.000Z",
    "end": "2024-01-15T09:30:00.000Z"
  },
  {
    "start": "2024-01-15T09:30:00.000Z",
    "end": "2024-01-15T10:00:00.000Z"
  },
  {
    "start": "2024-01-15T10:30:00.000Z",
    "end": "2024-01-15T11:00:00.000Z"
  }
]
```

### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `start` | string | Fecha y hora de inicio del slot en formato ISO 8601 |
| `end` | string | Fecha y hora de fin del slot en formato ISO 8601 |

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

### Errores de Validación (400)

```json
{
  "error": "Errores de validación: doctorId: Doctor ID debe ser un número válido, date: Fecha debe estar en formato YYYY-MM-DD"
}
```

```json
{
  "error": "Errores de validación: interval: Interval debe estar entre 5 y 120 minutos"
}
```

### Errores de Recurso No Encontrado (404)

```json
{
  "error": "Doctor no encontrado o sin configuración de calendario/horario"
}
```

### Errores del Servidor (500)

```json
{
  "error": "Error interno del servidor"
}
```

## Ejemplos de Uso

### Ejemplo 1: Consulta Básica

```bash
curl -X GET \
  "https://your-domain.com/api/n8n/doctors/123/availability?date=2024-01-15" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

### Ejemplo 2: Con Intervalo Personalizado

```bash
curl -X GET \
  "https://your-domain.com/api/n8n/doctors/123/availability?date=2024-01-15&interval=15" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json"
```

### Ejemplo 3: Usando n8n HTTP Request Node

```json
{
  "method": "GET",
  "url": "https://your-domain.com/api/n8n/doctors/{{ $json.doctorId }}/availability",
  "headers": {
    "X-API-Key": "your-api-key",
    "Content-Type": "application/json"
  },
  "qs": {
    "date": "{{ $json.date }}",
    "interval": "{{ $json.interval || 30 }}"
  }
}
```

## Integración con Google Calendar

### Funcionalidades

- **Consulta de Eventos**: Obtiene eventos ocupados del calendario de Google del doctor
- **Zona Horaria**: Respeta la zona horaria configurada del doctor
- **Filtrado Inteligente**: Excluye automáticamente horarios ocupados
- **Descansos**: Considera los tiempos de descanso configurados del doctor

### Configuración Requerida del Doctor

- `calendar_id`: ID del calendario de Google del doctor
- `working_hours`: Horarios de trabajo por día de la semana
- `break_times`: Tiempos de descanso (opcional)
- `calendar_timezone`: Zona horaria del doctor (default: America/Bogota)

## Consideraciones para AI/MCP

### Optimizaciones para Agentes de IA

1. **Conversión Automática de Tipos**: 
   - Los IDs pueden enviarse como strings y se convierten automáticamente
   - Los intervalos aceptan tanto strings como numbers

2. **Validación Robusta**:
   - Mensajes de error detallados y específicos
   - Validación de formato de fecha estricta
   - Rangos de valores claramente definidos

3. **Flexibilidad de Entrada**:
   - Acepta múltiples formatos para facilitar la integración
   - Valores por defecto sensatos

### Flujo de Trabajo Recomendado

1. **Autenticación**: Configurar API Key en headers
2. **Validación de Doctor**: Verificar que el doctor existe
3. **Consulta de Disponibilidad**: Llamar al endpoint con fecha deseada
4. **Procesamiento de Resultados**: Usar los slots disponibles para agendar citas
5. **Manejo de Errores**: Implementar retry logic para errores temporales

### Ejemplo de Implementación en MCP

```typescript
// Función para obtener disponibilidad
async function getDoctorAvailability(doctorId: string, date: string, interval?: number) {
  const response = await fetch(`/api/n8n/doctors/${doctorId}/availability?date=${date}&interval=${interval || 30}`, {
    method: 'GET',
    headers: {
      'X-API-Key': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error ${response.status}: ${error.error}`);
  }
  
  return await response.json();
}
```

## Limitaciones

### Restricciones Actuales

- **Organización Única**: Actualmente soporta una sola organización por API Key
- **Zona Horaria**: Limitado a zonas horarias predefinidas
- **Rate Limiting**: Sujeto a límites de Google Calendar API
- **Fecha Futura**: Solo permite consultar fechas futuras

### Consideraciones de Rendimiento

- **Cache**: No implementa cache, cada consulta es en tiempo real
- **Google Calendar API**: Dependiente de la disponibilidad de Google Calendar
- **Concurrencia**: Sin límites específicos de concurrencia

## Troubleshooting

### Problemas Comunes

1. **Error 401 - API Key Inválida**
   - Verificar que `N8N_API_KEY` esté configurada
   - Confirmar que el header `X-API-Key` esté presente
   - Validar que la API Key sea correcta

2. **Error 404 - Doctor No Encontrado**
   - Verificar que el doctor existe en la base de datos
   - Confirmar que tiene `calendar_id` configurado
   - Validar que tiene `working_hours` definidos

3. **Error 400 - Validación**
   - Revisar formato de fecha (YYYY-MM-DD)
   - Verificar que la fecha no sea pasada
   - Confirmar que el interval esté en rango 5-120

4. **Array Vacío en Respuesta**
   - El doctor no trabaja ese día
   - Todos los horarios están ocupados
   - Horarios de trabajo no configurados para ese día

### Logs de Debug

La API incluye logs detallados para debugging:

```
=== DEBUG AVAILABILITY API (N8N) ===
Doctor ID: 123
Organization ID: 1
Calendar ID: doctor@example.com
Doctor timezone: America/Bogota
Fecha solicitada: 2024-01-15
Interval minutes: 30
```

## Seguridad

### Mejores Prácticas

1. **API Key Management**:
   - Rotar API Keys regularmente
   - No exponer API Keys en logs
   - Usar variables de entorno seguras

2. **Rate Limiting**:
   - Implementar rate limiting por IP/API Key
   - Monitorear uso de Google Calendar API

3. **Validación de Entrada**:
   - Toda entrada es validada con Zod
   - Sanitización automática de datos
   - Prevención de inyección de código

4. **Logging**:
   - No loggear información sensible
   - Logs estructurados para auditoría
   - Monitoreo de errores de autenticación

---

**Nota**: Esta documentación está optimizada para uso con Model Context Protocol (MCP) y sistemas de automatización como n8n. Para uso en aplicaciones web tradicionales, considere usar la API estándar sin autenticación por API Key.