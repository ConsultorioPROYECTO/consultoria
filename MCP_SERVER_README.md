# Medical Consultation MCP Server

Este servidor MCP (Model Context Protocol) proporciona herramientas para que los asistentes de IA gestionen citas médicas, disponibilidad de doctores e información de pacientes.

## 🚀 Características

- **Gestión de Citas**: Crear citas médicas con sincronización automática de Google Calendar
- **Disponibilidad de Doctores**: Consultar horarios disponibles con duración personalizable
- **Información de Servicios**: Listar servicios médicos y verificar disponibilidad específica
- **Gestión de Pacientes**: Buscar y obtener información de pacientes
- **Validación Robusta**: Esquemas Zod para validación de entrada y manejo de errores
- **Respuestas Estructuradas**: Formato JSON consistente para fácil consumo por IA

## 🛠️ Herramientas Disponibles

### 1. `create_appointment`
Crea una nueva cita médica con sincronización de calendario.

**Parámetros:**
```typescript
{
  doctorId: number,           // ID único del doctor
  identificationType: string, // Tipo de documento (DNI, CC, TI, CE, PP, RC, AS)
  identificationNumber: string, // Número de identificación del paciente
  serviceId: number,          // ID del servicio médico
  date: string,              // Fecha en formato YYYY-MM-DD
  time: string,              // Hora en formato HH:MM (24 horas)
  isVirtual?: boolean,       // Si la cita es virtual (opcional)
  meetingLink?: string,      // Enlace de reunión (requerido si isVirtual=true)
  notes?: string             // Notas adicionales (opcional)
}
```

**Ejemplo de respuesta:**
```json
{
  "success": true,
  "data": {
    "appointmentId": 123,
    "googleEventId": "abc123",
    "status": "PENDING",
    "appointmentDetails": {
      "doctor": "Dr. Juan Pérez",
      "patient": "María García",
      "service": "Consulta General",
      "dateTime": "2024-01-15T10:00:00.000Z",
      "duration": 30,
      "isVirtual": false
    }
  }
}
```

### 2. `get_doctor_availability`
Obtiene los horarios disponibles de un doctor en una fecha específica.

**Parámetros:**
```typescript
{
  doctorId: number,        // ID del doctor
  date: string,           // Fecha en formato YYYY-MM-DD
  slotDuration?: number   // Duración de cada slot en minutos (15-240, default: 30)
}
```

### 3. `get_doctor_service_availability`
Obtiene disponibilidad específica para un doctor y servicio.

**Parámetros:**
```typescript
{
  doctorId: number,   // ID del doctor
  serviceId: number,  // ID del servicio
  date: string       // Fecha en formato YYYY-MM-DD
}
```

### 4. `list_doctors`
Lista todos los doctores disponibles con su información básica.

**Sin parámetros requeridos**

### 5. `list_services`
Lista todos los servicios médicos disponibles.

**Sin parámetros requeridos**

### 6. `get_patient_info`
Obtiene información de un paciente por su identificación.

**Parámetros:**
```typescript
{
  identificationType: string, // Tipo de documento
  identificationNumber: string // Número de identificación
}
```

## 🔌 Conexión con Clientes MCP

### Usando el SDK de TypeScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Configurar el transporte
const transport = new StreamableHTTPClientTransport({
  baseUrl: 'http://localhost:3000/api/mcp-server'
});

// Crear el cliente
const client = new Client({
  name: 'medical-assistant',
  version: '1.0.0'
});

// Conectar
await client.connect(transport);

// Listar herramientas disponibles
const tools = await client.listTools();
console.log('Herramientas disponibles:', tools);

// Crear una cita
const result = await client.callTool({
  name: 'create_appointment',
  arguments: {
    doctorId: 1,
    identificationType: 'DNI',
    identificationNumber: '12345678',
    serviceId: 1,
    date: '2024-01-15',
    time: '10:00',
    isVirtual: false
  }
});

console.log('Resultado:', result);
```

### Usando Claude Desktop

Agregar a la configuración de Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "medical-consultation": {
      "command": "node",
      "args": ["-e", "require('http').request({hostname:'localhost',port:3000,path:'/api/mcp-server',method:'POST',headers:{'Content-Type':'application/json'}}, res => res.pipe(process.stdout)).end(JSON.stringify(process.argv[2] ? JSON.parse(process.argv[2]) : {method:'initialize',params:{protocolVersion:'2024-11-05',capabilities:{tools:{}},clientInfo:{name:'claude-desktop',version:'1.0.0'}}}))"]
    }
  }
}
```

### Usando cURL para Pruebas

```bash
# Inicializar conexión MCP
curl -X POST http://localhost:3000/api/mcp-server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {
        "tools": {}
      },
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'

# Listar herramientas
curl -X POST http://localhost:3000/api/mcp-server \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'

# Crear una cita
curl -X POST http://localhost:3000/api/mcp-server \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_appointment",
      "arguments": {
        "doctorId": 1,
        "identificationType": "DNI",
        "identificationNumber": "12345678",
        "serviceId": 1,
        "date": "2024-01-15",
        "time": "10:00"
      }
    }
  }'
```

## 🔧 Configuración

### Variables de Entorno

```env
DEFAULT_ORGANIZATION_ID=1  # ID de la organización por defecto
```

### Requisitos

- Node.js 18+
- Base de datos configurada con Drizzle ORM
- Google Calendar API configurada (opcional, para sincronización)
- Next.js 14+

## 📝 Manejo de Errores

Todas las respuestas siguen un formato consistente:

**Éxito:**
```json
{
  "success": true,
  "data": { /* datos de respuesta */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción del error"
  }
}
```

### Códigos de Error Comunes

- `DOCTOR_NOT_FOUND`: Doctor no encontrado
- `PATIENT_NOT_FOUND`: Paciente no encontrado
- `SERVICE_NOT_FOUND`: Servicio médico no encontrado
- `INVALID_DATETIME`: Formato de fecha/hora inválido
- `PAST_APPOINTMENT`: Intento de crear cita en el pasado
- `TIMEZONE_NOT_CONFIGURED`: Zona horaria del doctor no configurada
- `CREATION_FAILED`: Fallo en la creación de la cita

## 🚀 Inicio Rápido

1. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **El servidor MCP estará disponible en:**
   ```
   http://localhost:3000/api/mcp-server
   ```

3. **Probar la conexión:**
   ```bash
   curl -X POST http://localhost:3000/api/mcp-server \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"clientInfo":{"name":"test","version":"1.0.0"}}}'
   ```

## 📚 Recursos Adicionales

- [Documentación oficial de MCP](https://modelcontextprotocol.io/)
- [SDK de TypeScript para MCP](https://github.com/modelcontextprotocol/typescript-sdk)
- [Especificación del protocolo MCP](https://spec.modelcontextprotocol.io/)

## 🤝 Contribución

Para contribuir al desarrollo del servidor MCP:

1. Asegúrate de que todas las pruebas pasen: `npm test`
2. Verifica el linting: `npm run lint`
3. Comprueba los tipos: `npx tsc --noEmit`
4. Documenta cualquier nueva herramienta siguiendo el formato TSDoc

## 📄 Licencia

Este proyecto está bajo la licencia especificada en el archivo LICENSE del proyecto principal.