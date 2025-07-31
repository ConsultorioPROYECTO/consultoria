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

### Fase 1: Arquitectura de Datos (Semana 1-2)

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

export interface ChatSession {
  id: string;
  patientId: string;
  remoteJid: string;
  instanceId: string;
  isActive: boolean;
  lastMessageAt: Date;
  unreadCount: number;
  windowStart?: Date;
  windowExpires?: Date;
  windowActive: boolean;
}

export interface ChatMessage {
  id: string;
  chatSessionId: string;
  messageId: string;
  fromMe: boolean;
  content: string;
  messageType: 'text' | 'image' | 'document' | 'interactive';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, any>;
}

export interface ChatState {
  sessions: ChatSession[];
  messages: Record<string, ChatMessage[]>;
  activeSessionId: string | null;
  loading: boolean;
  error: string | null;
}
```

#### 1.2 Esquema de Base de Datos

```sql
-- Tabla de sesiones de chat
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  remote_jid VARCHAR(255) NOT NULL,
  instance_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP,
  unread_count INTEGER DEFAULT 0,
  window_start TIMESTAMP,
  window_expires TIMESTAMP,
  window_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID REFERENCES chat_sessions(id),
  message_id VARCHAR(255) UNIQUE NOT NULL,
  from_me BOOLEAN NOT NULL,
  content TEXT,
  message_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_chat_sessions_patient_id ON chat_sessions(patient_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
```

### Fase 2: Capa de Servicios (Semana 2-3)

#### 2.1 Servicio de Chat

```typescript
// services/chatService.ts
export class ChatService {
  private baseUrl: string;
  private apiKey: string;

  constructor(organizationConfig: { baseUrl: string; apiKey: string }) {
    this.baseUrl = organizationConfig.baseUrl;
    this.apiKey = organizationConfig.apiKey;
  }

  async getChats(instanceId: string): Promise<Chat[]> {
    const response = await fetch(`${this.baseUrl}/chat/findChats/${instanceId}`, {
      method: 'POST',
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch chats: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getMessages(instanceId: string, remoteJid: string, page = 1, offset = 20): Promise<MessageResponse> {
    const response = await fetch(`${this.baseUrl}/chat/findMessages/${instanceId}`, {
      method: 'POST',
      headers: {
        'apikey': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid
          }
        },
        page,
        offset
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    
    return response.json();
  }

  async sendMessage(instanceId: string, remoteJid: string, message: string): Promise<void> {
    // Implementar envío de mensajes
  }
}
```

#### 2.2 Repository Pattern

```typescript
// repositories/chatRepository.ts
export class ChatRepository {
  async saveChatSession(session: Omit<ChatSession, 'id'>): Promise<ChatSession> {
    // Implementar guardado en base de datos
  }

  async getChatSessions(patientId: string): Promise<ChatSession[]> {
    // Implementar consulta de sesiones
  }

  async saveMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    // Implementar guardado de mensaje
  }

  async getMessages(sessionId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    // Implementar consulta de mensajes
  }

  async markMessagesAsRead(sessionId: string): Promise<void> {
    // Implementar marcado como leído
  }
}
```

### Fase 3: Gestión de Estado (Semana 3-4)

#### 3.1 Context API para Chat

```typescript
// contexts/ChatContext.tsx
interface ChatContextType {
  state: ChatState;
  actions: {
    loadChats: () => Promise<void>;
    selectChat: (sessionId: string) => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    markAsRead: (sessionId: string) => Promise<void>;
    refreshMessages: () => Promise<void>;
  };
}

export const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ChatState>({
    sessions: [],
    messages: {},
    activeSessionId: null,
    loading: false,
    error: null
  });

  const chatService = useMemo(() => {
    // Obtener configuración de la organización
    const orgConfig = getOrganizationConfig();
    return new ChatService(orgConfig);
  }, []);

  const actions = useMemo(() => ({
    loadChats: async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const chats = await chatService.getChats(instanceId);
        // Procesar y guardar chats
        setState(prev => ({ ...prev, sessions: processedSessions, loading: false }));
      } catch (error) {
        setState(prev => ({ ...prev, error: error.message, loading: false }));
      }
    },
    // ... otras acciones
  }), [chatService]);

  return (
    <ChatContext.Provider value={{ state, actions }}>
      {children}
    </ChatContext.Provider>
  );
}
```

#### 3.2 Custom Hooks

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
export function useChatMessages(sessionId: string | null) {
  const { state, actions } = useChat();
  
  const messages = sessionId ? state.messages[sessionId] || [] : [];
  
  useEffect(() => {
    if (sessionId) {
      actions.loadMessages(sessionId);
    }
  }, [sessionId]);
  
  return {
    messages,
    loading: state.loading,
    error: state.error,
    sendMessage: actions.sendMessage,
    markAsRead: () => actions.markAsRead(sessionId!)
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

1. **Autenticación por Organización**
   - Cada organización tiene su propia API key
   - Validación de permisos por usuario
   - Aislamiento de datos entre organizaciones

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
| 1-2 | Arquitectura | Definir interfaces, esquemas DB | Tipos TypeScript, Migraciones |
| 2-3 | Servicios | ChatService, Repository | APIs integradas |
| 3-4 | Estado | Context, Hooks | Gestión de estado |
| 4-5 | UI | Componentes optimizados | Interfaz funcional |
| 5-6 | Tiempo Real | WebSockets | Chat en tiempo real |
| 6-7 | Performance | Optimizaciones | Sistema optimizado |
| 7-8 | Testing | Tests, QA | Sistema probado |

### Dependencias

1. **Técnicas**
   - Configuración de WebSocket server
   - Migraciones de base de datos
   - Variables de entorno

2. **Organizacionales**
   - Acceso a APIs de WhatsApp
   - Configuración de instancias
   - Permisos de usuario

### Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Límites de API WhatsApp | Media | Alto | Implementar rate limiting y caché |
| Problemas de conectividad | Alta | Medio | Reconexión automática y fallbacks |
| Escalabilidad | Baja | Alto | Arquitectura modular y optimizaciones |

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