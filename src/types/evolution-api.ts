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
    /** Indica si el mensaje fue enviado por la instancia actual (true) o recibido (false) */
    fromMe?: boolean;
    /** JID remoto del chat */
    remoteJid?: string;
  };
  /** Nombre del remitente (pushName) */
  pushName?: string;
  /** Tipo de mensaje */
  messageType?: string;
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
      /** Indica si es un mensaje de voz (push to talk) */
      ptt?: boolean;
      /** URL del archivo de audio */
      url?: string;
      /** Duración en segundos */
      seconds?: number;
      /** Clave de medios */
      mediaKey?: string;
      /** Tipo MIME */
      mimetype?: string;
      /** Ruta directa del archivo */
      directPath?: string;
      /** Tamaño del archivo */
      fileLength?: string;
      /** Hash SHA256 del archivo */
      fileSha256?: string;
      /** Hash SHA256 del archivo encriptado */
      fileEncSha256?: string;
      /** Timestamp de la clave de medios */
      mediaKeyTimestamp?: string;
      /** Forma de onda del audio (para mensajes de voz) */
      waveform?: string;
      /** Sidecar de streaming */
      streamingSidecar?: string;
    };
    /** Para mensajes de imagen */
    imageMessage?: {
      /** URL de la imagen */
      url?: string;
      /** Texto de la imagen (caption) */
      caption?: string;
      /** Clave de medios */
      mediaKey?: string;
      /** Tipo MIME */
      mimetype?: string;
      /** Ruta directa del archivo */
      directPath?: string;
      /** Tamaño del archivo */
      fileLength?: string;
      /** Hash SHA256 del archivo */
      fileSha256?: string;
      /** Hash SHA256 del archivo encriptado */
      fileEncSha256?: string;
      /** Timestamp de la clave de medios */
      mediaKeyTimestamp?: string;
    };
    /** Para mensajes de documento */
    documentMessage?: {
      /** URL del documento */
      url?: string;
      /** Nombre del archivo */
      fileName?: string;
      /** Tipo MIME */
      mimetype?: string;
      /** Clave de medios */
      mediaKey?: string;
      /** Ruta directa del archivo */
      directPath?: string;
      /** Tamaño del archivo */
      fileLength?: string;
      /** Hash SHA256 del archivo */
      fileSha256?: string;
      /** Hash SHA256 del archivo encriptado */
      fileEncSha256?: string;
      /** Timestamp de la clave de medios */
      mediaKeyTimestamp?: string;
    };
    /** Información de contexto del mensaje */
    messageContextInfo?: {
      /** Secreto del mensaje */
      messageSecret?: string;
      /** Metadatos de la lista de dispositivos */
      deviceListMetadata?: {
        /** Hash de la clave del remitente */
        senderKeyHash?: string;
        /** Timestamp del remitente */
        senderTimestamp?: string;
        /** Hash de la clave del destinatario */
        recipientKeyHash?: string;
        /** Timestamp del destinatario */
        recipientTimestamp?: string;
      };
      /** Versión de los metadatos de la lista de dispositivos */
      deviceListMetadataVersion?: number;
      /** Información adicional del contexto */
      [key: string]: unknown;
    };
  };
  /** Timestamp Unix del mensaje */
  messageTimestamp?: number;
  /** ID de la instancia */
  instanceId?: string;
  /** Fuente del mensaje (ios, android, web, etc.) */
  source?: string;
  /** Información de contexto adicional */
  contextInfo?: unknown;
  /** Actualizaciones del estado del mensaje */
  MessageUpdate?: Array<{
    /** Estado del mensaje */
    status?: string;
  }>;
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
  /** JID remoto del destinatario */
  remoteJid: string;
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
  /** Tipo de mensaje */
  messageType?: 'text' | 'audio' | 'image' | 'document';
  /** Datos específicos para mensajes de audio */
  audioData?: {
    /** URL del archivo de audio */
    url: string;
    /** Duración en segundos */
    duration?: number;
    /** Indica si es un mensaje de voz (push to talk) */
    isPtt?: boolean;
    /** Tipo MIME del archivo */
    mimetype?: string;
    /** Forma de onda del audio */
    waveform?: string;
  };
}

/**
 * Chat transformado para el frontend de la aplicación
 */
export interface TransformedChat {
  /** ID único del chat */
  id: string;
  /** JID remoto del chat (identificador de WhatsApp) */
  remoteJid: string;
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
    const duration = message.message.audioMessage.seconds;
    const durationText = duration ? ` (${duration}s)` : '';
    return `[Mensaje de audio]${durationText}`;
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
  // Determinar el estado del mensaje basado en MessageUpdate
  let status: 'sent' | 'delivered' | 'read' = 'sent';
  if (message.MessageUpdate && message.MessageUpdate.length > 0) {
    const lastUpdate = message.MessageUpdate[message.MessageUpdate.length - 1];
    if (lastUpdate.status === 'READ' || lastUpdate.status === 'PLAYED') {
      status = 'read';
    } else if (lastUpdate.status === 'DELIVERY_ACK') {
      status = 'delivered';
    }
  }

  // Determinar el tipo de mensaje
  let messageType: 'text' | 'audio' | 'image' | 'document' = 'text';
  let audioData: TransformedMessage['audioData'];

  if (message.message?.audioMessage) {
    messageType = 'audio';
    audioData = {
      url: message.message.audioMessage.url || '',
      duration: message.message.audioMessage.seconds,
      isPtt: message.message.audioMessage.ptt,
      mimetype: message.message.audioMessage.mimetype,
      waveform: message.message.audioMessage.waveform
    };
  } else if (message.message?.imageMessage) {
    messageType = 'image';
  } else if (message.message?.documentMessage) {
    messageType = 'document';
  }

  return {
    id: message.id,
    content: extractMessageContent(message),
    timestamp: message.messageTimestamp 
      ? new Date(message.messageTimestamp * 1000).toISOString()
      : new Date().toISOString(),
    isFromDoctor: message.key?.fromMe || false,
    status,
    messageType,
    audioData
  };
}

/**
 * Función para transformar un chat de Evolution API al formato del frontend
 */
export function transformChat(chat: EvolutionChat): TransformedChat {
  return {
    id: chat.id,
    remoteJid: chat.remoteJid,
    patientName: chat.pushName || chat.name || 'Usuario sin nombre',
    patientAvatar: chat.profilePicUrl,
    lastMessage: 'Sin mensajes',
    timestamp: chat.updatedAt || new Date().toISOString(),
    unreadCount: chat.unreadCount || 0,
    isOnline: chat.isOnline || false,
    messageStatus: 'read'
  };
}