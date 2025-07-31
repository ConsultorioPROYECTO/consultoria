# API de Evolution - Documentación de Respuestas

## Tipos TypeScript Actualizados

**IMPORTANTE**: Se han creado tipos TypeScript completos en `/src/types/evolution-api.ts` que reflejan la estructura real de la API de Evolution basada en los logs del sistema.

## Endpoint: GET /findMessages

### Respuesta de la API de Evolution para Mensajes

Basado en los logs del sistema, la API de Evolution devuelve la siguiente estructura para los mensajes:

```json
{
  "messages": {
    "total": 2763,
    "pages": 56,
    "currentPage": 1,
    "records": [
      {
        "id": "string",
        "key": {
          "id": "string"
        },
        "message": {
          "conversation": "string",
          "extendedTextMessage": {
            "text": "string"
          }
        },
        "messageTimestamp": 1643723400,
        "fromMe": false,
        "status": "read"
      }
    ]
  }
}
```

### Estructura de Datos

#### Objeto Principal
- **messages**: Objeto que contiene la información paginada
  - **total**: Número total de mensajes disponibles
  - **pages**: Número total de páginas
  - **currentPage**: Página actual (1-indexed)
  - **records**: Array que contiene los mensajes actuales

#### Estructura de Mensaje Individual
- **id**: Identificador único del mensaje
- **key**: Objeto con información adicional
  - **id**: ID alternativo del mensaje
- **message**: Contenido del mensaje
  - **conversation**: Texto del mensaje (para mensajes simples)
  - **extendedTextMessage**: Para mensajes de texto extendido
    - **text**: Contenido del texto
- **messageTimestamp**: Timestamp Unix del mensaje
- **fromMe**: Boolean que indica si el mensaje fue enviado por la instancia actual
- **status**: Estado del mensaje ("read", "delivered", "sent")

### Problema Identificado

El sistema inicialmente no estaba extrayendo correctamente los mensajes porque:

1. La respuesta no es un array directo, sino un objeto con estructura paginada
2. Los mensajes están anidados en `messages.records`
3. La lógica de extracción necesitaba verificar específicamente esta estructura

### Solución Implementada

Se modificó el código para:

1. **Tipos TypeScript**: Se crearon tipos completos en `/src/types/evolution-api.ts`:
   - `EvolutionMessage`: Estructura de mensaje individual
   - `EvolutionMessagesResponse`: Respuesta completa con paginación
   - `EvolutionChat`: Estructura de chat individual
   - `TransformedMessage` y `TransformedChat`: Tipos para el frontend

2. **Funciones de transformación**:
   - `transformMessage()`: Convierte mensaje de Evolution API al formato del frontend
   - `transformChat()`: Convierte chat de Evolution API al formato del frontend
   - `extractMessageContent()`: Extrae contenido de diferentes tipos de mensaje

3. **Actualización de rutas API**:
   - Verificar si `messagesData.messages.records` existe y es un array
   - Extraer los mensajes de `messagesData.messages.records`
   - Procesar la información de paginación
   - Usar funciones de transformación tipadas

### Transformación de Datos

Cada mensaje se transforma usando la función `transformMessage()` de la estructura de Evolution API (`EvolutionMessage`) al formato del frontend (`TransformedMessage`):

```typescript
// Tipo de entrada (Evolution API)
interface EvolutionMessage {
  id: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    audioMessage?: { url?: string; seconds?: number };
    imageMessage?: { url?: string; caption?: string };
    // ... otros tipos de mensaje
  };
  messageTimestamp?: number;
  fromMe?: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

// Tipo de salida (Frontend)
interface TransformedMessage {
  id: string;
  content: string;
  timestamp: string; // ISO 8601
  isFromDoctor: boolean;
  status: 'sent' | 'delivered' | 'read';
}
```

### Problema Actual: Detección de Remitente

Basado en los logs, existe un problema con la identificación correcta del remitente de los mensajes:

- **fromMe**: Este campo indica si el mensaje fue enviado desde la instancia actual de WhatsApp
- **Problema**: Todos los mensajes parecen mostrar que solo una persona está escribiendo
- **Causa**: La lógica `isFromDoctor: msg.fromMe || false` puede no estar diferenciando correctamente entre doctor y paciente

### Archivos Actualizados

1. **`/src/types/evolution-api.ts`** (NUEVO): Tipos TypeScript completos
2. **`/src/lib/chatApiClient.ts`**: Actualizado para usar tipos de evolution-api
3. **`/src/app/api/patients/chats/messages/route.ts`**: Usa tipos y funciones de transformación
4. **`/src/app/api/patients/chats/route.ts`**: Usa tipos y funciones de transformación

### Logs de Depuración

Para diagnosticar problemas futuros, el sistema incluye logs detallados que muestran:

- Estructura de la respuesta de la API
- Verificación de tipos de datos
- Información de paginación
- Conteo de mensajes procesados
- Detalles de transformación de cada mensaje
- Verificación específica de la estructura `messages.records`

### Próximos Pasos

1. Verificar que la lógica de extracción de `messages.records` funcione correctamente
2. Analizar los datos reales de los mensajes para entender la estructura del campo `fromMe`
3. Ajustar la lógica de identificación del remitente si es necesario