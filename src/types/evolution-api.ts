/**
 * Tipos TypeScript para las respuestas de la API de Evolution
 * Basados en la estructura real de datos observada en los logs del sistema
 * @packageDocumentation
 * @module types/evolution-api
 */

// === Tipos para Mensajes ===

/**
 * Estructura de un mensaje individual de WhatsApp desde Evolution API
 */
export interface EvolutionMessage {
  /** Identificador único del mensaje */
  id: string;
  /** Información de la clave del mensaje */
  key?: {
    /** ID alternativo del mensaje */
    id?: string;
  };
  /** Contenido del mensaje */
  message?: {
    /** Texto del mensaje (para mensajes simples) */
    conversation?: string;
    /** Para mensajes de texto extendido */
    extendedTextMessage?: {
      /** Contenido del texto extendido */
      text?: string;
    };
    /** Para mensajes de audio */
    audioMessage?: {
      /** URL del archivo de audio */
      url?: string;
      /** Duración en segundos */
      seconds?: number;
    };
    /** Para mensajes de imagen */
    imageMessage?: {
      /** URL de la imagen */
      url?: string;
      /** Texto de la imagen (caption) */
      caption?: string;
    };
    /** Para mensajes de documento */
    documentMessage?: {
      /** URL del documento */
      url?: string;
      /** Nombre del archivo */
      fileName?: string;
      /** Tipo MIME */
      mimetype?: string;
    };
    /** Información de contexto del mensaje */
    messageContextInfo?: {
      /** Información adicional del contexto */
      [key: string]: unknown;
    };
  };
  /** Timestamp Unix del mensaje */
  messageTimestamp?: number;
  /** Indica si el mensaje fue enviado por la instancia actual (true) o recibido (false) */
  fromMe?: boolean;
  /** Estado del mensaje */
  status?: 'sent' | 'delivered' | 'read';
}

/**
 * Información de paginación para mensajes
 */
export interface MessagesPagination {
  /** Número total de mensajes disponibles */
  total: number;
  /** Número total de páginas */
  pages: number;
  /** Página actual (1-indexed) */
  currentPage: number;
}

/**
 * Respuesta completa de la API de Evolution para mensajes
 */
export interface EvolutionMessagesResponse {
  /** Objeto que contiene la información paginada de mensajes */
  messages: {
    /** Información de paginación */
    total: number;
    pages: number;
    currentPage: number;
    /** Array de mensajes en la página actual */
    records: EvolutionMessage[];
  };
}

// === Tipos para Chats ===

/**
 * Estructura de un chat individual desde Evolution API
 */
export interface EvolutionChat {
  /** Identificador único del chat */
  id: string;
  /** JID remoto del chat (identificador de WhatsApp) */
  remoteJid: string;
  /** Nombre del contacto/grupo */
  name?: string;
  /** Nombre mostrado en WhatsApp */
  pushName?: string;
  /** URL de la foto de perfil */
  profilePicUrl?: string;
  /** Fecha de última actualización */
  updatedAt?: string;
  /** Inicio de ventana de mensajes */
  windowStart?: string | null;
  /** Expiración de ventana de mensajes */
  windowExpires?: string | null;
  /** Indica si la ventana está activa */
  windowActive?: boolean;
  /** Número de mensajes no leídos */
  unreadCount?: number;
  /** Indica si el contacto está en línea */
  isOnline?: boolean;
}

/**
 * Respuesta de la API de Evolution para chats (array directo)
 */
export type EvolutionChatsResponse = EvolutionChat[];

// === Tipos para Estados de Conexión ===

/**
 * Estados posibles de conexión de una instancia
 */
export type ConnectionState = 'open' | 'close' | 'connecting' | 'qr' | 'starting';

/**
 * Respuesta de estado de conexión de Evolution API
 */
export interface EvolutionConnectionStateResponse {
  instance: {
    /** Nombre de la instancia */
    instanceName: string;
    /** Estado actual de la conexión */
    state: ConnectionState;
  };
}

/**
 * Información detallada de la instancia
 */
export interface EvolutionInstanceInfo {
  /** Nombre de la instancia */
  instanceName?: string;
  /** ID de la instancia */
  instanceId?: string;
  /** Propietario de la instancia */
  owner?: string;
  /** Nombre del perfil */
  profileName?: string;
  /** URL de la foto de perfil */
  profilePictureUrl?: string;
  /** Número de teléfono */
  phoneNumber?: string;
  /** Estado de la conexión */
  state?: ConnectionState;
}

/**
 * Respuesta de información de instancia
 */
export interface EvolutionInstanceInfoResponse {
  data: EvolutionInstanceInfo[];
}

// === Tipos para Códigos QR ===

/**
 * Respuesta de generación de código QR
 */
export interface EvolutionQRResponse {
  /** Código QR como data URL */
  qrcode?: string;
  /** Código QR como string raw */
  code?: string;
  /** Código QR como imagen base64 */
  base64?: string;
  /** Estado de la conexión */
  status?: string;
}

// === Tipos para Envío de Mensajes ===

/**
 * Request para enviar un mensaje de texto
 */
export interface SendTextMessageRequest {
  /** Número de teléfono o JID del destinatario */
  number: string;
  /** Contenido del mensaje */
  text: string;
  /** Opciones adicionales */
  options?: {
    /** Retrasar el envío */
    delay?: number;
    /** Presencia (typing, recording, etc.) */
    presence?: string;
  };
}

/**
 * Respuesta de envío de mensaje
 */
export interface SendMessageResponse {
  /** Información del mensaje enviado */
  message?: {
    /** ID del mensaje */
    id?: string;
    /** Timestamp del envío */
    timestamp?: number;
    /** Estado del envío */
    status?: string;
  };
  /** Mensaje de éxito */
  success?: boolean;
  /** Mensaje de error si falló */
  error?: string;
}

// === Tipos Transformados para el Frontend ===

/**
 * Mensaje transformado para el frontend de la aplicación
 */
export interface TransformedMessage {
  /** ID único del mensaje */
  id: string;
  /** Contenido del mensaje */
  content: string;
  /** Timestamp en formato ISO */
  timestamp: string;
  /** Indica si el mensaje es del doctor (true) o del paciente (false) */
  isFromDoctor: boolean;
  /** Estado del mensaje */
  status: 'sent' | 'delivered' | 'read';
}

/**
 * Chat transformado para el frontend de la aplicación
 */
export interface TransformedChat {
  /** ID único del chat */
  id: string;
  /** Nombre del paciente */
  patientName: string;
  /** Avatar del paciente */
  patientAvatar?: string;
  /** Último mensaje del chat */
  lastMessage: string;
  /** Timestamp del último mensaje */
  timestamp: string;
  /** Número de mensajes no leídos */
  unreadCount: number;
  /** Indica si el paciente está en línea */
  isOnline: boolean;
  /** Estado del último mensaje */
  messageStatus: 'sent' | 'delivered' | 'read';
}

// === Tipos de Utilidad ===

/**
 * Función para extraer el contenido de texto de un mensaje
 */
export function extractMessageContent(message: EvolutionMessage): string {
  if (message.message?.conversation) {
    return message.message.conversation;
  }
  if (message.message?.extendedTextMessage?.text) {
    return message.message.extendedTextMessage.text;
  }
  if (message.message?.imageMessage?.caption) {
    return `[Imagen] ${message.message.imageMessage.caption}`;
  }
  if (message.message?.audioMessage) {
    return '[Mensaje de audio]';
  }
  if (message.message?.documentMessage?.fileName) {
    return `[Documento] ${message.message.documentMessage.fileName}`;
  }
  return '[Mensaje no compatible]';
}

/**
 * Función para transformar un mensaje de Evolution API al formato del frontend
 */
export function transformMessage(message: EvolutionMessage): TransformedMessage {
  return {
    id: message.id,
    content: extractMessageContent(message),
    timestamp: message.messageTimestamp 
      ? new Date(message.messageTimestamp * 1000).toISOString()
      : new Date().toISOString(),
    isFromDoctor: message.fromMe || false,
    status: message.status || 'sent'
  };
}

/**
 * Función para transformar un chat de Evolution API al formato del frontend
 */
export function transformChat(chat: EvolutionChat): TransformedChat {
  return {
    id: chat.id,
    patientName: chat.pushName || chat.name || 'Usuario sin nombre',
    patientAvatar: chat.profilePicUrl,
    lastMessage: 'Sin mensajes',
    timestamp: chat.updatedAt || new Date().toISOString(),
    unreadCount: chat.unreadCount || 0,
    isOnline: chat.isOnline || false,
    messageStatus: 'read'
  };
}