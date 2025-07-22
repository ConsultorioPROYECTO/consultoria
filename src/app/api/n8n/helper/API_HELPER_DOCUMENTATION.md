# Documentación API Helper para Agentes

## Descripción General

La API Helper (`/api/n8n/helper`) es un endpoint optimizado para que los agentes obtengan información relevante de la base de datos mediante queries eficientes, filtrados por organización.

## Autenticación

- **Header requerido**: `X-API-Key`
- **Valor**: API key válida de la organización

## Endpoint Base

```
GET /api/n8n/helper?endpoint={endpoint_name}
```

## Endpoints Disponibles

### 1. organization-summary

**Descripción**: Obtiene un resumen completo de la organización con estadísticas

**Parámetros**: Ninguno

**Respuesta**: Información de la organización y estadísticas (doctores, pacientes, servicios, citas del día)

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=organization-summary
```

### 2. doctors-with-services

**Descripción**: Obtiene lista de doctores activos con sus servicios

**Parámetros**: Ninguno

**Respuesta**: Array de doctores con especialidad, contacto y estado

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=doctors-with-services
```

### 3. patients-search

**Descripción**: Busca pacientes por término de búsqueda

**Parámetros**:
- `searchTerm` (opcional): Término de búsqueda
- `limit` (opcional): Límite de resultados (default: 20)

**Respuesta**: Array de pacientes que coinciden con la búsqueda

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=patients-search&searchTerm=Juan&limit=10
```

### 4. appointments-today

**Descripción**: Obtiene todas las citas del día actual

**Parámetros**: Ninguno

**Respuesta**: Array de citas con información completa de doctor, paciente y servicio

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=appointments-today
```

### 5. appointments-upcoming

**Descripción**: Obtiene citas próximas

**Parámetros**:
- `days` (opcional): Número de días hacia adelante (default: 7)

**Respuesta**: Array de citas próximas ordenadas por fecha

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=appointments-upcoming&days=14
```

### 6. doctor-availability

**Descripción**: Obtiene información de doctores

**Parámetros**:
- `doctorId` (opcional): ID específico del doctor

**Respuesta**: Array de doctores con información de calendario

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=doctor-availability&doctorId=123
```

### 7. medical-services

**Descripción**: Obtiene lista de servicios médicos activos

**Parámetros**: Ninguno

**Respuesta**: Array de servicios con detalles completos (duración, precio, categoría)

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=medical-services
```

### 8. appointment-details

**Descripción**: Obtiene detalles completos de una cita específica

**Parámetros**:
- `appointmentId` (requerido): ID de la cita

**Respuesta**: Objeto con información detallada de la cita

**Ejemplo**:
```bash
GET /api/n8n/helper?endpoint=appointment-details&appointmentId=123
```

## Schema de Herramienta para Flowise

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

## Estructura de Respuestas

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    // Datos específicos del endpoint
  },
  "message": "Descripción del resultado"
}
```

### Respuesta de Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```

## Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `400 Bad Request`: Parámetros inválidos o endpoint no válido
- `401 Unauthorized`: API key faltante o inválida
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error interno del servidor

## Ejemplos de Respuesta

### organization-summary
```json
{
  "success": true,
  "data": {
    "organization": {
      "id": 1,
      "name": "Clínica Ejemplo",
      "phone": "+57 300 123 4567",
      "email": "info@clinica.com",
      "address": "Calle 123 #45-67"
    },
    "statistics": {
      "totalDoctors": 5,
      "totalPatients": 150,
      "totalServices": 12,
      "appointmentsToday": 8
    }
  },
  "message": "Resumen de organización obtenido exitosamente"
}
```

### patients-search
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "firstName": "Juan",
      "lastName": "Pérez",
      "identificationType": "CC",
      "identificationNumber": "12345678",
      "phone": "+57 300 111 2222",
      "email": "juan.perez@email.com",
      "birthDate": "1990-05-15",
      "gender": "M"
    }
  ],
  "message": "Pacientes obtenidos exitosamente"
}
```

## Notas Importantes

1. **Filtrado por Organización**: Todos los endpoints filtran automáticamente los datos por la organización asociada a la API key.

2. **Límites de Consulta**: Los endpoints de búsqueda tienen límites predeterminados para evitar sobrecarga del servidor.

3. **Joins Optimizados**: La API utiliza joins eficientes para obtener información relacionada en una sola consulta.

4. **Manejo de Errores**: Todos los endpoints incluyen manejo robusto de errores con mensajes descriptivos.

5. **Seguridad**: La autenticación mediante API key garantiza que solo usuarios autorizados puedan acceder a los datos.

## Casos de Uso Comunes

- **Agentes de IA**: Obtener información contextual para responder consultas de pacientes
- **Dashboards**: Mostrar estadísticas y resúmenes en tiempo real
- **Integraciones**: Sincronizar datos con sistemas externos
- **Reportes**: Generar informes automáticos de la organización
- **Búsquedas**: Encontrar pacientes, doctores o citas específicas

Esta API está diseñada para ser eficiente, segura y fácil de usar por agentes automatizados y sistemas de terceros.