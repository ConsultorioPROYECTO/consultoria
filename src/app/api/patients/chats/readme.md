# Plan Detallado: Sistema de Chat de Pacientes

## 📋 Resumen Ejecutivo

Este documento presenta un plan detallado para el desarrollo y optimización del sistema de chat de pacientes, integrando WhatsApp Business API con una arquitectura escalable y mantenible.

## 🏗️ Arquitectura Actual

### Componentes Existentes

#### 1. **ChatWindow.tsx**
- **Ubicación**: `/src/app/dashboard/patients/chat/_components/ChatWindow.tsx`
- **Responsabilidad**: Interfaz de chat individual con un paciente
- **Funcionalidades**:
  - Visualización de mensajes en tiempo real
  - Entrada de texto y envío de mensajes
  - Manejo de estado local del chat
  - Scroll automático a mensajes nuevos

#### 2. **ChatList.tsx**
- **Ubicación**: `/src/app/dashboard/patients/chat/_components/ChatList.tsx`
- **Responsabilidad**: Lista de chats disponibles
- **Funcionalidades**:
  - Visualización de avatares de pacientes
  - Últimos mensajes y timestamps
  - Contadores de mensajes no leídos
  - Filtrado y búsqueda de chats

#### 3. **chats.tsx**
- **Ubicación**: `/src/app/dashboard/patients/chat/chats.tsx`
- **Responsabilidad**: Orquestador principal de la vista de chats
- **Funcionalidades**:
  - Gestión de selección de chats
  - Coordinación entre ChatList y ChatWindow
  - Manejo de datos mock (temporal)

## 🔌 Integración con APIs Externas

### WhatsApp Business API

#### Endpoint: Obtener Chats
```http
POST {{baseUrl}}/chat/findChats/{{instance}}
Headers:
  apikey: {{EVOLUTION_API_KEY}}
```

**Respuesta**:
```typescript
interface Chat {
  id: string;
  remoteJid: string;
  pushName: string;
  profilePicUrl: string | null;
  updatedAt: string;
  windowStart: string | null;
  windowExpires: string | null;
  windowActive: boolean;
}
```

#### Endpoint: Obtener Mensajes
```http
POST {{baseUrl}}/chat/findMessages/{{instance}}
Headers:
  apikey: {{EVOLUTION_API_KEY}}
Body:
{
  "where": {
    "key": {
      "remoteJid": "{{remoteJid}}"
    }
  },
  "page": 1,
  "offset": 10
}
```

**Respuesta**:
```typescript
interface MessageResponse {
  messages: {
    total: number;
    pages: number;
    currentPage: number;
    records: Message[];
  };
}

interface Message {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
  };
  pushName: string;
  messageType: string;
  message: any;
  messageTimestamp: number;
  instanceId: string;
  source: string;
}
```

## 🎯 Plan de Desarrollo Detallado

### Fase 1: Arquitectura Simplificada (Semana 1-2)

#### 1.1 Definición de Interfaces TypeScript

```typescript
// types/chat.ts
export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  profilePicUrl?: string;
  organizationId: string;
}

// Interfaces basadas directamente en las APIs externas
export interface ExternalChat {
  id: string;
  remoteJid: string;
  pushName: string;
  profilePicUrl: string | null;
  updatedAt: string;
  windowStart: string | null;
  windowExpires: string | null;
  windowActive: boolean;
}

export interface ExternalMessage {
  id: string;
  key: {
    id: string;
    fromMe: boolean;
    remoteJid: string;
  };
  pushName: string;
  messageType: string;
  message: any;
  messageTimestamp: number;
  instanceId: string;
  source: string;
}

export interface ChatState {
  chats: ExternalChat[];
  messages: Record<string, ExternalMessage[]>;
  activeRemoteJid: string | null;
  loading: boolean;
  error: string | null;
}
```

#### 1.2 Arquitectura de Proxy Directo

**Flujo de Datos Simplificado:**
```
Frontend → Next.js API Routes → APIs Externas (WhatsApp)
```

**Beneficios:**
- Sin base de datos adicional
- Datos siempre actualizados
- Menor complejidad
- Mantenimiento reducido

### Fase 2: APIs Internas como Proxy (Semana 2-3)

#### 2.1 API Routes de Next.js

```typescript
// app/api/patients/chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';

/**
 * Manejador para obtener chats de WhatsApp de la organización
 */
const getChatsHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    // Obtener usuario autenticado
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        'Usuario no encontrado o sin organización asociada',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Validar que el usuario tenga permisos para ver chats
    if (!['admin', 'medico', 'asistente'].includes(requestingUser.role)) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'No tienes permisos para acceder a los chats',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Obtener configuración de la organización
    const orgConfig = await db.query.organization.findFirst({
      where: eq(organization.id, requestingUser.organizationId),
      columns: { instanceId: true, apiKey: true }
    });

    if (!orgConfig || !orgConfig.instanceId) {
      return createErrorResponse(
        API_ERRORS.NOT_FOUND,
        'Configuración de WhatsApp no encontrada para la organización',
        HTTP_STATUS.NOT_FOUND
      );
    }

    // Llamar a la API externa de WhatsApp
    const response = await fetch(`${process.env.EVOLUTION_API_SERVER_URL}/chat/findChats/${orgConfig.instanceId}`, {
      method: 'POST',
      headers: {
        'apikey': process.env.EVOLUTION_API_KEY!,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }
    
    const chats = await response.json();
    return createSuccessResponse(chats, 'Chats obtenidos exitosamente');
  } catch (error) {
    console.error('Error fetching chats:', error);
    return createErrorResponse(
      API_ERRORS.INTERNAL_ERROR,
      'Error interno del servidor',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
};

export const GET = withAuthentication(getChatsHandler);
```

```typescript
// app/api/patients/chats/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';
import { createErrorResponse, createSuccessResponse, API_ERRORS, HTTP_STATUS } from '@/types/api';
import { z } from 'zod';

// Esquema de validación para el body
const getMessagesSchema = z.object({
  remoteJid: z.string().min(1, 'remoteJid es requerido'),
  page: z.number().int().min(1).default(1),
  offset: z.number().int().min(1).max(100).default(20)
});

/**
 * Manejador para obtener mensajes de un chat específico
 */
const getMessagesHandler = async (
  request: NextRequest,
  decodedToken: DecodedIdToken
): Promise<NextResponse | Response> => {
  try {
    // Obtener usuario autenticado
    const requestingUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, decodedToken.uid),
      columns: { role: true, id: true, organizationId: true },
    });

    if (!requestingUser || !requestingUser.organizationId) {
      return createErrorResponse(
        API_ERRORS.USER_NOT_FOUND,
        'Usuario no encontrado o sin organización asociada',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Validar que el usuario tenga permisos para ver mensajes
    if (!['admin', 'medico', 'asistente'].includes(requestingUser.role)) {
      return createErrorResponse(
        API_ERRORS.FORBIDDEN,
        'No tienes permisos para acceder a los mensajes',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // Validar body de la request
    const body = await request.json();
    const validation = getMessagesSchema.safeParse(body);
    
    if (!validation.success) {
      return createErrorResponse(
        API_ERRORS.VALIDATION_ERROR,
        'Datos de entrada inválidos',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const { remoteJid, page, offset } = validation.data;

    // Obtener configuración de la organización
    const orgConfig = await db.query.organization.findFirst({
      where: eq(organization.id, requestingUser.organizationId),
      columns: { instanceId: true }
    });

    if (!orgConfig || !orgConfig.instanceId) {
      return createErrorResponse(
        API_ERRORS.NOT_FOUND,
        'Configuración de WhatsApp no encontrada para la organización',
        HTTP_STATUS.NOT_FOUND
      );
    }
    
    // Llamar a la API externa de WhatsApp
    const response = await fetch(`${process.env.EVOLUTION_API_SERVER_URL}/chat/findMessages/${orgConfig.instanceId}`, {
      method: 'POST',
      headers: {
        'apikey': process.env.EVOLUTION_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        where: {
          key: { remoteJid }
        },
        page,
        offset
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    
    const messages = await response.json();
    return createSuccessResponse(messages, 'Mensajes obtenidos exitosamente');
  } catch (error) {
    console.error('Error fetching messages:', error);
    return createErrorResponse(
      API_ERRORS.INTERNAL_ERROR,
      'Error interno del servidor',
      HTTP_STATUS.INTERNAL_ERROR
    );
  }
};

export const POST = withAuthentication(getMessagesHandler);
```

#### 2.2 Cliente HTTP Simplificado

```typescript
// services/chatApiClient.ts
import { getFirebaseAuthToken } from '@/app/lib/firebase/clientUtils';

export class ChatApiClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await getFirebaseAuthToken();
    if (!token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getChats(): Promise<ExternalChat[]> {
    const headers = await this.getAuthHeaders();
    const response = await fetch('/api/patients/chats', {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to fetch chats');
    }
    
    const result = await response.json();
    return result.data;
  }

  async getMessages(remoteJid: string, page = 1, offset = 20) {
    const headers = await this.getAuthHeaders();
    const response = await fetch('/api/patients/chats/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ remoteJid, page, offset })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to fetch messages');
    }
    
    const result = await response.json();
    return result.data;
  }

  async sendMessage(remoteJid: string, message: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch('/api/patients/chats/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({ remoteJid, message })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to send message');
    }
    
    const result = await response.json();
    return result.data;
  }
}
```

### Fase 3: Gestión de Estado Simplificada (Semana 3-4)

#### 3.1 Context API para Chat

```typescript
// contexts/ChatContext.tsx
interface ChatContextType {
  state: ChatState;
  actions: {
    loadChats: (instanceId: string) => Promise<void>;
    selectChat: (remoteJid: string) => Promise<void>;
    loadMessages: (instanceId: string, remoteJid: string) => Promise<void>;
    refreshData: () => Promise<void>;
  };
}

export const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ChatState>({
    chats: [],
    messages: {},
    activeRemoteJid: null,
    loading: false,
    error: null
  });

  const apiClient = useMemo(() => new ChatApiClient(), []);

  const actions = useMemo(() => ({
    loadChats: async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const chats = await apiClient.getChats();
        setState(prev => ({ ...prev, chats, loading: false }));
      } catch (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }));
      }
    },
    
    selectChat: async (remoteJid: string) => {
      setState(prev => ({ ...prev, activeRemoteJid: remoteJid }));
    },
    
    loadMessages: async (remoteJid: string) => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        const response = await apiClient.getMessages(remoteJid);
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [remoteJid]: response.messages.records
          },
          loading: false
        }));
      } catch (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }));
      }
    },
    
    refreshData: async () => {
      // Recargar datos actuales
      if (state.activeRemoteJid) {
        await actions.loadMessages(state.activeRemoteJid);
      }
    },

    sendMessage: async (remoteJid: string, message: string) => {
      try {
        await apiClient.sendMessage(remoteJid, message);
        // Recargar mensajes después de enviar
        await actions.loadMessages(remoteJid);
      } catch (error) {
        setState(prev => ({ ...prev, error: error.message }));
        throw error;
      }
    }
  }), [apiClient, state.activeRemoteJid]);

  return (
    <ChatContext.Provider value={{ state, actions }}>
      {children}
    </ChatContext.Provider>
  );
}
```

#### 3.2 Custom Hooks Simplificados

```typescript
// hooks/useChat.ts
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

// hooks/useChatMessages.ts
export function useChatMessages(remoteJid: string | null) {
  const { state, actions } = useChat();
  
  const messages = remoteJid ? state.messages[remoteJid] || [] : [];
  
  useEffect(() => {
    if (remoteJid) {
      actions.loadMessages(remoteJid);
    }
  }, [remoteJid]);
  
  return {
    messages,
    loading: state.loading,
    error: state.error,
    refreshMessages: () => remoteJid && actions.loadMessages(remoteJid),
    sendMessage: (message: string) => remoteJid && actions.sendMessage(remoteJid, message)
  };
}
```

### Fase 4: Componentes Optimizados (Semana 4-5)

#### 4.1 ChatWindow Mejorado

```typescript
// components/ChatWindow.tsx
interface ChatWindowProps {
  sessionId: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const { messages, sendMessage, markAsRead } = useChatMessages(sessionId);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll a nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Marcar como leído cuando se abre el chat
  useEffect(() => {
    markAsRead();
  }, [sessionId]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    await sendMessage(newMessage);
    setNewMessage('');
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header del chat */}
      <ChatHeader sessionId={sessionId} />
      
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input de mensaje */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
```

#### 4.2 ChatList Optimizado

```typescript
// components/ChatList.tsx
export function ChatList() {
  const { state, actions } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredSessions = useMemo(() => {
    return state.sessions.filter(session => 
      session.patient?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [state.sessions, searchTerm]);
  
  useEffect(() => {
    actions.loadChats();
  }, []);
  
  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col">
      {/* Barra de búsqueda */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Buscar chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      {/* Lista de chats */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.map((session) => (
          <ChatListItem
            key={session.id}
            session={session}
            isActive={session.id === state.activeSessionId}
            onClick={() => actions.selectChat(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### Fase 5: Tiempo Real y WebSockets (Semana 5-6)

#### 5.1 Configuración de WebSocket

```typescript
// services/websocketService.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  connect(instanceId: string, onMessage: (data: any) => void) {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/chat/${instanceId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.handleReconnect(instanceId, onMessage);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }
  
  private handleReconnect(instanceId: string, onMessage: (data: any) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect(instanceId, onMessage);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### Fase 6: Optimización y Performance (Semana 6-7)

#### 6.1 Virtualización de Mensajes

```typescript
// components/VirtualizedMessageList.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualizedMessageListProps {
  messages: ChatMessage[];
  height: number;
}

export function VirtualizedMessageList({ messages, height }: VirtualizedMessageListProps) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  );
  
  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={80} // Altura estimada por mensaje
      width="100%"
    >
      {Row}
    </List>
  );
}
```

#### 6.2 Caché y Persistencia

```typescript
// utils/cacheManager.ts
export class CacheManager {
  private cache = new Map<string, any>();
  private ttl = new Map<string, number>();
  
  set(key: string, value: any, ttlMs = 300000) { // 5 minutos por defecto
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }
  
  get(key: string): any | null {
    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }
  
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}
```

### Fase 7: Testing y Calidad (Semana 7-8)

#### 7.1 Tests Unitarios

```typescript
// __tests__/chatService.test.ts
import { ChatService } from '../services/chatService';

describe('ChatService', () => {
  let chatService: ChatService;
  
  beforeEach(() => {
    chatService = new ChatService({
      baseUrl: 'https://test-api.com',
      apiKey: 'test-key'
    });
  });
  
  it('should fetch chats successfully', async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ id: '1', remoteJid: 'test@s.whatsapp.net' }])
    });
    
    const chats = await chatService.getChats('test-instance');
    expect(chats).toHaveLength(1);
    expect(chats[0].id).toBe('1');
  });
});
```

#### 7.2 Tests de Integración

```typescript
// __tests__/chatFlow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatProvider } from '../contexts/ChatContext';
import { ChatsView } from '../components/ChatsView';

describe('Chat Flow', () => {
  it('should load and display chats', async () => {
    render(
      <ChatProvider>
        <ChatsView />
      </ChatProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Cargando chats...')).toBeInTheDocument();
    });
    
    // Verificar que los chats se cargan
    await waitFor(() => {
      expect(screen.getByText('Santiago Prada')).toBeInTheDocument();
    });
  });
});
```

## 🔒 Seguridad y Autenticación

### Consideraciones de Seguridad

1. **Autenticación con Firebase**
   - Todos los endpoints requieren token de Firebase válido
   - Validación de permisos por rol de usuario (admin, medico, asistente)
   - Aislamiento de datos por organización del usuario autenticado
   - Uso del middleware `withAuthentication` para verificación automática de tokens

2. **Autorización por Organización**
   - Cada usuario solo puede acceder a chats de su organización
   - La instancia de WhatsApp se obtiene automáticamente de la organización del usuario
   - No se requiere pasar instanceId desde el frontend por seguridad

2. **Sanitización de Mensajes**
   - Validación de contenido entrante
   - Filtrado de scripts maliciosos
   - Límites de tamaño de mensaje

3. **Rate Limiting**
   - Límites por usuario y organización
   - Protección contra spam
   - Throttling de requests

## 📊 Métricas y Monitoreo

### KPIs a Monitorear

1. **Performance**
   - Tiempo de carga de chats
   - Latencia de mensajes
   - Tiempo de respuesta de API

2. **Uso**
   - Número de chats activos
   - Mensajes enviados/recibidos
   - Usuarios activos

3. **Errores**
   - Fallos de conexión WebSocket
   - Errores de API
   - Timeouts

### Implementación de Métricas

```typescript
// utils/analytics.ts
export class Analytics {
  static trackEvent(event: string, properties: Record<string, any>) {
    // Implementar tracking
    console.log('Event:', event, properties);
  }
  
  static trackError(error: Error, context: string) {
    // Implementar error tracking
    console.error('Error in', context, error);
  }
  
  static trackPerformance(metric: string, duration: number) {
    // Implementar performance tracking
    console.log('Performance:', metric, duration + 'ms');
  }
}
```

## 🚀 Plan de Implementación

### Cronograma Detallado

| Semana | Fase | Tareas Principales | Entregables |
|--------|------|-------------------|-------------|
| 1-2 | Arquitectura Simplificada | Definir interfaces, API Routes | Tipos TypeScript, APIs Proxy |
| 2-3 | APIs Proxy | Implementar endpoints internos | APIs integradas |
| 3-4 | Estado | Context, Hooks simplificados | Gestión de estado |
| 4-5 | UI | Componentes optimizados | Interfaz funcional |
| 5-6 | Tiempo Real | WebSockets (opcional) | Chat en tiempo real |
| 6-7 | Performance | Caché y optimizaciones | Sistema optimizado |
| 7-8 | Testing | Tests, QA | Sistema probado |

### Dependencias

1. **Técnicas**
   - Configuración de WebSocket server (opcional)
   - Variables de entorno para APIs externas
   - Configuración de CORS

2. **Organizacionales**
   - Acceso a APIs de WhatsApp
   - Configuración de instancias
   - Permisos de usuario

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Límites de API WhatsApp | Media | Alto | Implementar rate limiting y caché en memoria |
| Problemas de conectividad | Alta | Medio | Reconexión automática y fallbacks |
| Latencia de APIs externas | Media | Medio | Caché inteligente y loading states |
| Dependencia de APIs externas | Baja | Alto | Monitoreo y alertas de disponibilidad |

## 📝 Conclusiones

Este plan proporciona una hoja de ruta completa para desarrollar un sistema de chat robusto, escalable y mantenible. La implementación por fases permite un desarrollo iterativo con entregables tangibles en cada etapa.

### Próximos Pasos

1. **Revisión del plan** con el equipo de desarrollo
2. **Configuración del entorno** de desarrollo
3. **Inicio de la Fase 1** - Arquitectura de datos
4. **Configuración de CI/CD** para deployment continuo

---

*Documento creado: [Fecha]*  
*Última actualización: [Fecha]*  
*Versión: 1.0*