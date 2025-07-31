import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { db } from '@/db';
import { organization, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/patients/chats/messages?chatId=xxx - Obtener mensajes de un chat específico
export const GET = withAuthentication(async (request: NextRequest, decodedToken) => {
  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId es requerido' },
        { status: 400 }
      );
    }

    // Obtener usuario y organización
    const user = await db.select().from(users).where(eq(users.firebaseUid, decodedToken.uid)).limit(1);
    if (!user.length) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const org = await db.select().from(organization).where(eq(organization.id, user[0].organizationId!)).limit(1);
    if (!org.length) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { instanceId } = org[0];
    const apiKey = process.env.EVOLUTION_API_KEY

    if (!instanceId || !apiKey) {
      return NextResponse.json({ error: 'Configuración de WhatsApp no encontrada' }, { status: 400 });
    }

    // Llamar a la API externa de WhatsApp para obtener mensajes
    console.log(`[CHAT_MESSAGES] Llamando a Evolution API para obtener mensajes:`, {
      url: `${process.env.EVOLUTION_API_SERVER_URL}/chat/findMessages/${instanceId}`,
      chatId,
      instanceId
    });

    const response = await fetch(`${process.env.EVOLUTION_API_SERVER_URL}/chat/findMessages/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        remoteJid: chatId,
        limit: 50 // Limitar a los últimos 50 mensajes
      })
    });

    console.log(`[CHAT_MESSAGES] Respuesta de Evolution API:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CHAT_MESSAGES] Error en API externa:`, {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error en API externa: ${response.status}`);
    }

    const messagesData = await response.json();
    console.log(`[CHAT_MESSAGES] Datos recibidos de Evolution API:`, {
      type: typeof messagesData,
      isArray: Array.isArray(messagesData),
      length: Array.isArray(messagesData) ? messagesData.length : 'N/A',
      keys: typeof messagesData === 'object' ? Object.keys(messagesData) : 'N/A',
      sample: messagesData
    });
    
    // Transformar datos al formato esperado por el frontend
    interface WhatsAppMessage {
      id?: string;
      key?: { id?: string };
      message?: {
        conversation?: string;
        extendedTextMessage?: { text?: string };
      };
      messageTimestamp?: number;
      fromMe?: boolean;
      status?: string;
    }

    // Verificar si messagesData es un array o necesita ser extraído
    let messagesArray: WhatsAppMessage[];
    
    if (Array.isArray(messagesData)) {
      console.log(`[CHAT_MESSAGES] messagesData es un array directo con ${messagesData.length} elementos`);
      messagesArray = messagesData;
    } else if (messagesData && typeof messagesData === 'object') {
      console.log(`[CHAT_MESSAGES] messagesData es un objeto, buscando array anidado:`, Object.keys(messagesData));
      
      // Intentar diferentes propiedades comunes donde podría estar el array
      if (messagesData.messages && Array.isArray(messagesData.messages)) {
        console.log(`[CHAT_MESSAGES] Encontrado array en messagesData.messages con ${messagesData.messages.length} elementos`);
        messagesArray = messagesData.messages;
      } else if (messagesData.data && Array.isArray(messagesData.data)) {
        console.log(`[CHAT_MESSAGES] Encontrado array en messagesData.data con ${messagesData.data.length} elementos`);
        messagesArray = messagesData.data;
      } else if (messagesData.result && Array.isArray(messagesData.result)) {
        console.log(`[CHAT_MESSAGES] Encontrado array en messagesData.result con ${messagesData.result.length} elementos`);
        messagesArray = messagesData.result;
      } else {
        console.warn(`[CHAT_MESSAGES] No se encontró array de mensajes en la respuesta:`, messagesData);
        messagesArray = [];
      }
    } else {
      console.warn(`[CHAT_MESSAGES] messagesData no es un objeto válido:`, messagesData);
      messagesArray = [];
    }

    console.log(`[CHAT_MESSAGES] Procesando ${messagesArray.length} mensajes`);

    const transformedMessages = messagesArray.map((msg: WhatsAppMessage, index: number) => {
      console.log(`[CHAT_MESSAGES] Procesando mensaje ${index + 1}:`, {
        id: msg.id,
        keyId: msg.key?.id,
        hasMessage: !!msg.message,
        messageKeys: msg.message ? Object.keys(msg.message) : [],
        fromMe: msg.fromMe,
        timestamp: msg.messageTimestamp
      });
      
      return {
        id: msg.id || msg.key?.id || Math.random().toString(36),
        content: msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'Mensaje no disponible',
        timestamp: msg.messageTimestamp ? 
          new Date(msg.messageTimestamp * 1000).toISOString() : 
          new Date().toISOString(),
        isFromDoctor: msg.fromMe || false,
        status: msg.status === 'read' ? 'read' : msg.status === 'delivered' ? 'delivered' : 'sent'
      };
    });

    console.log(`[CHAT_MESSAGES] Mensajes transformados exitosamente:`, {
      count: transformedMessages.length,
      sample: transformedMessages.slice(0, 2)
    });

    return NextResponse.json(transformedMessages);
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});

// POST /api/patients/chats/messages - Enviar mensaje a un chat específico
export const POST = withAuthentication(async (request: NextRequest, decodedToken) => {
  try {
    const body = await request.json();
    const { chatId, message } = body;

    if (!chatId || !message) {
      return NextResponse.json(
        { error: 'chatId y message son requeridos' },
        { status: 400 }
      );
    }

    // Obtener usuario y organización
    const user = await db.select().from(users).where(eq(users.firebaseUid, decodedToken.uid)).limit(1);
    if (!user.length) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const org = await db.select().from(organization).where(eq(organization.id, user[0].organizationId!)).limit(1);
    if (!org.length) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { instanceId, apiKey } = org[0];
    if (!instanceId || !apiKey) {
      return NextResponse.json({ error: 'Configuración de WhatsApp no encontrada' }, { status: 400 });
    }

    // Enviar mensaje a través de la API externa
    const response = await fetch(`${process.env.WHATSAPP_API_URL}/message/sendText/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: chatId,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Error en API externa: ${response.status}`);
    }

    const result = await response.json();
    
    // Transformar respuesta al formato esperado
    const transformedResult = {
      id: result.id || Math.random().toString(36),
      content: message,
      timestamp: new Date().toISOString(),
      isFromDoctor: true,
      status: 'sent' as const
    };

    return NextResponse.json(transformedResult);
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});