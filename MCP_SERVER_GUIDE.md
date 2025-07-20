# Guía del Servidor MCP - Consultoría Médica

## Descripción General

Este proyecto incluye un servidor MCP (Model Context Protocol) optimizado para la gestión de consultas médicas, implementado con `mcp-handler` para máxima compatibilidad con clientes como Claude Desktop, Cursor, y otros asistentes de IA.

## Características Principales

### ✅ Soporte Dual de Transporte
- **Streamable HTTP** (`/api/mcp`) - Transporte recomendado y más eficiente
- **Server-Sent Events** (`/api/sse`) - Para compatibilidad con clientes legacy

### ✅ Herramientas MCP Disponibles
1. `create_appointment` - Crear citas médicas con sincronización de calendario
2. `get_doctor_availability` - Obtener disponibilidad de doctores
3. `get_doctor_service_availability` - Disponibilidad específica doctor-servicio
4. `list_doctors` - Listar todos los doctores disponibles
5. `list_services` - Listar servicios médicos
6. `get_patient_info` - Obtener información de pacientes

### ✅ Integración Avanzada
- Sincronización automática con Google Calendar
- Validación completa de datos
- Manejo robusto de errores
- Soporte para citas virtuales
- Gestión de zonas horarias

## Configuración de Clientes

### Claude Desktop

```json
{
  "mcpServers": {
    "consultoria-medical": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3000/api/mcp"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Cursor (con soporte SSE directo)

```json
{
  "mcp": {
    "servers": {
      "consultoria-medical": {
        "url": "http://localhost:3000/api/sse",
        "transport": "sse"
      }
    }
  }
}
```

### Cliente HTTP Directo

```bash
# Streamable HTTP
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}'

# Server-Sent Events
curl -X GET http://localhost:3000/api/sse \
  -H "Accept: text/event-stream" \
  -H "Cache-Control: no-cache"
```

## Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL="mysql://user:password@localhost:3306/consultoria"

# Organización por defecto
DEFAULT_ORGANIZATION_ID="1"

# Google Calendar (opcional)
GOOGLE_CALENDAR_CREDENTIALS="path/to/credentials.json"

# Redis para SSE (opcional)
REDIS_URL="redis://localhost:6379"

# Desarrollo
NODE_ENV="development"
```

## Estructura de Archivos

```
src/app/api/
├── [transport]/
│   └── route.ts          # Nuevo servidor MCP con mcp-handler
└── mcp-server/
    └── route.ts          # Servidor MCP original (legacy)
```

## Migración desde el Servidor Legacy

### Diferencias Principales

| Aspecto | Legacy (`/api/mcp-server`) | Nuevo (`/api/[transport]`) |
|---------|---------------------------|----------------------------|
| Transporte | Solo Streamable HTTP | Streamable HTTP + SSE |
| Compatibilidad | Limitada | Máxima |
| Configuración | Manual compleja | Automática con mcp-handler |
| Manejo de errores | Básico | Robusto y estructurado |
| Documentación | Mínima | Completa con tipos |

### Pasos de Migración

1. **Actualizar configuración del cliente**:
   - Cambiar URL de `/api/mcp-server` a `/api/mcp` o `/api/sse`
   - Usar `mcp-remote` para Streamable HTTP si es necesario

2. **Verificar variables de entorno**:
   - Asegurar que todas las variables requeridas estén configuradas

3. **Probar conectividad**:
   ```bash
   # Probar Streamable HTTP
   curl -X POST http://localhost:3000/api/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
   
   # Probar SSE
   curl -X GET http://localhost:3000/api/sse -H "Accept: text/event-stream"
   ```

4. **Eliminar servidor legacy** (opcional):
   - Una vez verificado el funcionamiento, se puede eliminar `/api/mcp-server/`

## Resolución de Problemas

### Error: "Could not connect to server"
- Verificar que el servidor Next.js esté ejecutándose en el puerto correcto
- Comprobar que la URL del cliente coincida con la configuración del servidor

### Error: "Transport not supported"
- Para clientes que solo soportan SSE, usar `/api/sse`
- Para clientes modernos, usar `/api/mcp` con `mcp-remote` si es necesario

### Error: "Tool not found"
- Verificar que el servidor se haya inicializado correctamente
- Comprobar los logs del servidor para errores de configuración

### Problemas de Sincronización de Calendario
- Verificar credenciales de Google Calendar
- Comprobar que el doctor tenga `calendar_id` configurado
- Revisar permisos de la API de Google Calendar

## Desarrollo y Testing

### Ejecutar el Servidor

```bash
npm run dev
# o
yarn dev
```

### Probar Herramientas MCP

```bash
# Listar doctores
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_doctors","arguments":{}}}'

# Crear cita
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_appointment","arguments":{"doctorId":1,"identificationType":"CC","identificationNumber":"12345678","serviceId":1,"date":"2024-12-20","time":"10:00"}}}'
```

## Beneficios de la Nueva Implementación

1. **Compatibilidad Universal**: Funciona con todos los clientes MCP principales
2. **Mejor Rendimiento**: Optimizado para Next.js App Router
3. **Mantenimiento Simplificado**: Menos código boilerplate
4. **Documentación Automática**: Tipos y esquemas auto-generados
5. **Escalabilidad**: Soporte para Redis y conexiones concurrentes
6. **Debugging Mejorado**: Logs estructurados y manejo de errores

## Próximos Pasos

- [ ] Implementar autenticación y autorización
- [ ] Añadir métricas y monitoreo
- [ ] Crear tests automatizados
- [ ] Documentar API REST complementaria
- [ ] Implementar notificaciones en tiempo real