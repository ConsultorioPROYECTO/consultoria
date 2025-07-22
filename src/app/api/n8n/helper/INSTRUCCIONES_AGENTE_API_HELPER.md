# Instrucciones Paso a Paso para Agente - API Helper

## Objetivo
Este documento proporciona instrucciones detalladas para que un agente de IA pueda implementar y utilizar eficazmente la API Helper para consultar información médica de la organización.

## Prerrequisitos

### 1. Verificar Acceso a la API
- **URL Base**: `http://irina.makilacloud.com:3000/api/n8n/helper`
- **API Key**: `39djg9wjr0ekw90fiwjc90fjjedijfidi0jv8jkmokxowkri9vr8`
- **Método**: GET únicamente
- **Header requerido**: `X-API-Key`

### 2. Configuración en FlowiseAI

#### Paso 1: Crear Nueva Herramienta
1. Acceder a FlowiseAI
2. Ir a la sección "Tools" o "Herramientas"
3. Hacer clic en "Create New Tool" o "Crear Nueva Herramienta"
4. Seleccionar "Custom Tool" o "Herramienta Personalizada"

#### Paso 2: Configurar Herramienta
```json
{
  "name": "consultarInformacionMedica",
  "description": "Usa esta herramienta para consultar información médica de la organización. Puedes obtener resúmenes, buscar pacientes, consultar citas, doctores y servicios médicos. Especifica el endpoint y los parámetros necesarios según el tipo de consulta.",
  "color": "linear-gradient(rgb(121,211,109), rgb(240,47,170))",
  "iconSrc": "",
  "schema": "[{\"id\":0,\"property\":\"endpoint\",\"description\":\"El endpoint específico a consultar. Opciones: organization-summary, doctors-with-services, patients-search, appointments-today, appointments-upcoming, doctor-availability, medical-services, appointment-details\",\"type\":\"string\",\"required\":true},{\"id\":1,\"property\":\"searchTerm\",\"description\":\"Término de búsqueda para pacientes (solo para endpoint patients-search)\",\"type\":\"string\",\"required\":false},{\"id\":2,\"property\":\"limit\",\"description\":\"Límite de resultados para búsqueda de pacientes (default: 20)\",\"type\":\"number\",\"required\":false},{\"id\":3,\"property\":\"days\",\"description\":\"Número de días para citas próximas (default: 7, solo para endpoint appointments-upcoming)\",\"type\":\"number\",\"required\":false},{\"id\":4,\"property\":\"doctorId\",\"description\":\"ID del doctor para consultar disponibilidad (solo para endpoint doctor-availability)\",\"type\":\"number\",\"required\":false},{\"id\":5,\"property\":\"appointmentId\",\"description\":\"ID de la cita para obtener detalles (requerido para endpoint appointment-details)\",\"type\":\"number\",\"required\":false}]",
  "func": "const fetch = require('node-fetch');\nconst endpoint = $endpoint;\nconst searchTerm = $searchTerm;\nconst limit = $limit;\nconst days = $days;\nconst doctorId = $doctorId;\nconst appointmentId = $appointmentId;\nconst webhookUrl = 'http://irina.makilacloud.com:3000/api/n8n/helper';\n\nconst options = {\n\tmethod: 'GET',\n\theaders: {\n\t\t'Content-Type': 'application/json',\n        'X-API-Key': '39djg9wjr0ekw90fiwjc90fjjedijfidi0jv8jkmokxowkri9vr8'\n\t}\n};\n\n// Construir URL con parámetros\nlet url = `${webhookUrl}?endpoint=${endpoint}`;\n\nif (searchTerm && endpoint === 'patients-search') {\n\turl += `&searchTerm=${encodeURIComponent(searchTerm)}`;\n}\nif (limit && endpoint === 'patients-search') {\n\turl += `&limit=${limit}`;\n}\nif (days && endpoint === 'appointments-upcoming') {\n\turl += `&days=${days}`;\n}\nif (doctorId && endpoint === 'doctor-availability') {\n\turl += `&doctorId=${doctorId}`;\n}\nif (appointmentId && endpoint === 'appointment-details') {\n\turl += `&appointmentId=${appointmentId}`;\n}\n\ntry {\n\tconst response = await fetch(url, options);\n\tconst text = await response.text();\n\treturn text;\n} catch (error) {\n\tconsole.error(error);\n\treturn '';\n}",
  "workspaceId": "14eb28a4-062f-4b6c-a4d7-bba781b92a5a"
}
```

#### Paso 3: Guardar y Probar
1. Guardar la herramienta
2. Realizar una prueba con el endpoint `organization-summary`
3. Verificar que la respuesta sea exitosa

## Guía de Uso por Endpoint

### 1. Obtener Resumen de Organización

**Cuándo usar**: Al inicio de conversaciones o cuando se necesite contexto general

**Parámetros**:
- `endpoint`: "organization-summary"

**Ejemplo de uso**:
```
Usuario: "¿Puedes darme un resumen de la clínica?"
Agente: Usar herramienta con endpoint="organization-summary"
```

**Información obtenida**:
- Datos básicos de la organización
- Estadísticas: total de doctores, pacientes, servicios
- Citas del día actual

### 2. Consultar Doctores Disponibles

**Cuándo usar**: Cuando se necesite información sobre el personal médico

**Parámetros**:
- `endpoint`: "doctors-with-services"

**Ejemplo de uso**:
```
Usuario: "¿Qué doctores están disponibles?"
Agente: Usar herramienta con endpoint="doctors-with-services"
```

**Información obtenida**:
- Lista de doctores activos
- Especialidades
- Información de contacto

### 3. Buscar Pacientes

**Cuándo usar**: Para encontrar información específica de pacientes

**Parámetros**:
- `endpoint`: "patients-search"
- `searchTerm`: Nombre, apellido, cédula, teléfono o email
- `limit`: Número máximo de resultados (opcional)

**Ejemplo de uso**:
```
Usuario: "Busca al paciente Juan Pérez"
Agente: Usar herramienta con endpoint="patients-search", searchTerm="Juan Pérez"
```

**Información obtenida**:
- Datos personales del paciente
- Información de contacto
- Datos de identificación

### 4. Consultar Citas del Día

**Cuándo usar**: Para revisar la agenda diaria

**Parámetros**:
- `endpoint`: "appointments-today"

**Ejemplo de uso**:
```
Usuario: "¿Qué citas hay hoy?"
Agente: Usar herramienta con endpoint="appointments-today"
```

**Información obtenida**:
- Todas las citas del día actual
- Información completa de doctor, paciente y servicio
- Estado de las citas

### 5. Consultar Citas Próximas

**Cuándo usar**: Para planificación y seguimiento

**Parámetros**:
- `endpoint`: "appointments-upcoming"
- `days`: Número de días hacia adelante (opcional, default: 7)

**Ejemplo de uso**:
```
Usuario: "¿Qué citas hay en los próximos 3 días?"
Agente: Usar herramienta con endpoint="appointments-upcoming", days=3
```

**Información obtenida**:
- Citas programadas en el rango especificado
- Ordenadas por fecha
- Información completa de cada cita

### 6. Consultar Disponibilidad de Doctores

**Cuándo usar**: Para verificar disponibilidad para nuevas citas

**Parámetros**:
- `endpoint`: "doctor-availability"
- `doctorId`: ID específico del doctor (opcional)

**Ejemplo de uso**:
```
Usuario: "¿Está disponible el doctor con ID 5?"
Agente: Usar herramienta con endpoint="doctor-availability", doctorId=5
```

**Información obtenida**:
- Información de calendario de doctores
- Tokens de Google Calendar
- Estado de disponibilidad

### 7. Consultar Servicios Médicos

**Cuándo usar**: Para informar sobre servicios disponibles

**Parámetros**:
- `endpoint`: "medical-services"

**Ejemplo de uso**:
```
Usuario: "¿Qué servicios médicos ofrecen?"
Agente: Usar herramienta con endpoint="medical-services"
```

**Información obtenida**:
- Lista completa de servicios activos
- Duración y precios
- Categorías y descripciones
- Instrucciones de preparación

### 8. Obtener Detalles de Cita Específica

**Cuándo usar**: Para consultas detalladas sobre una cita particular

**Parámetros**:
- `endpoint`: "appointment-details"
- `appointmentId`: ID de la cita (requerido)

**Ejemplo de uso**:
```
Usuario: "Dame los detalles de la cita 123"
Agente: Usar herramienta con endpoint="appointment-details", appointmentId=123
```

**Información obtenida**:
- Información completa de la cita
- Detalles del doctor, paciente y servicio
- Estado de sincronización con Google Calendar
- Historial de cambios

## Flujos de Conversación Recomendados

### Flujo 1: Consulta General
1. **Inicio**: Usar `organization-summary` para contexto
2. **Seguimiento**: Según la consulta, usar endpoints específicos
3. **Detalle**: Si se necesita información específica, usar endpoints de detalle

### Flujo 2: Búsqueda de Paciente
1. **Búsqueda**: Usar `patients-search` con término proporcionado
2. **Verificación**: Si hay múltiples resultados, pedir aclaración
3. **Detalles**: Una vez identificado, usar otros endpoints si es necesario

### Flujo 3: Consulta de Agenda
1. **Hoy**: Usar `appointments-today` para agenda actual
2. **Próximas**: Usar `appointments-upcoming` para planificación
3. **Específica**: Usar `appointment-details` para citas particulares

### Flujo 4: Información de Servicios
1. **Lista**: Usar `medical-services` para mostrar opciones
2. **Doctores**: Usar `doctors-with-services` para personal disponible
3. **Disponibilidad**: Usar `doctor-availability` para verificar horarios

## Manejo de Errores

### Errores Comunes y Soluciones

1. **Error 401 (Unauthorized)**
   - Verificar que el header `X-API-Key` esté presente
   - Confirmar que la API key sea correcta

2. **Error 400 (Bad Request)**
   - Verificar que el endpoint sea válido
   - Revisar parámetros requeridos

3. **Error 404 (Not Found)**
   - Confirmar que el recurso solicitado existe
   - Verificar IDs proporcionados

4. **Error 500 (Internal Server Error)**
   - Reportar el error
   - Intentar con un endpoint diferente

### Respuestas de Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```

## Mejores Prácticas

### 1. Optimización de Consultas
- Usar `limit` en búsquedas para evitar respuestas muy largas
- Combinar endpoints para obtener información completa
- Cachear información que no cambia frecuentemente

### 2. Experiencia del Usuario
- Proporcionar contexto antes de mostrar listas largas
- Formatear fechas y números de manera legible
- Ofrecer opciones cuando hay múltiples resultados

### 3. Seguridad
- No exponer la API key en logs o mensajes
- Validar datos antes de mostrarlos al usuario
- Manejar información sensible apropiadamente

### 4. Rendimiento
- Usar endpoints específicos en lugar de consultas generales
- Limitar el número de consultas por conversación
- Implementar timeouts apropiados

## Ejemplos de Implementación

### Ejemplo 1: Consulta de Agenda Diaria
```
Usuario: "¿Qué citas hay hoy?"

Paso 1: Usar endpoint="appointments-today"
Paso 2: Procesar respuesta
Paso 3: Formatear información para el usuario

Respuesta: "Hoy hay 5 citas programadas:
1. Dr. García - Juan Pérez - 9:00 AM - Consulta General
2. Dra. López - María Rodríguez - 10:30 AM - Cardiología
..."
```

### Ejemplo 2: Búsqueda de Paciente
```
Usuario: "Busca información de Ana García"

Paso 1: Usar endpoint="patients-search", searchTerm="Ana García"
Paso 2: Evaluar resultados
Paso 3: Si hay múltiples resultados, pedir aclaración
Paso 4: Mostrar información del paciente seleccionado

Respuesta: "Encontré 2 pacientes con ese nombre:
1. Ana García Pérez - CC 12345678
2. Ana García López - CC 87654321
¿Cuál necesitas?"
```

### Ejemplo 3: Información de Servicios
```
Usuario: "¿Qué servicios de cardiología tienen?"

Paso 1: Usar endpoint="medical-services"
Paso 2: Filtrar servicios de cardiología
Paso 3: Mostrar información relevante

Respuesta: "Ofrecemos estos servicios de cardiología:
1. Consulta Cardiológica - 30 min - $150.000
2. Electrocardiograma - 15 min - $80.000
3. Ecocardiograma - 45 min - $250.000"
```

## Monitoreo y Mantenimiento

### Métricas a Seguir
- Tiempo de respuesta de la API
- Tasa de errores por endpoint
- Uso frecuente de endpoints
- Satisfacción del usuario

### Actualizaciones
- Revisar regularmente la documentación de la API
- Actualizar la herramienta si hay cambios en endpoints
- Mantener la API key segura y actualizada

### Soporte
- Documentar problemas recurrentes
- Mantener logs de errores
- Proporcionar feedback sobre mejoras necesarias

## Conclusión

Esta API Helper está diseñada para proporcionar acceso eficiente y seguro a la información médica de la organización. Siguiendo estas instrucciones paso a paso, el agente podrá brindar un servicio completo y profesional a los usuarios, manteniendo la seguridad y eficiencia en todas las consultas.

Recuerda siempre validar las respuestas, manejar errores apropiadamente y proporcionar una experiencia de usuario excepcional.