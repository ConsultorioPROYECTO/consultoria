import { NextRequest, NextResponse } from 'next/server';
import { withOptimizedAuthentication } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import type { AuthenticatedUserInfo } from '@/app/lib/firebase/server/middleware/optimizedAuthMiddleware';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { eq } from 'drizzle-orm';
import type { EvolutionChat } from '@/types/evolution-api';
import { transformChat } from '@/types/evolution-api';

// GET /api/patients/chats - Obtener lista de chats
export const GET = withOptimizedAuthentication(async (request: NextRequest, userInfo: AuthenticatedUserInfo) => {
  try {
    // La información del usuario ya está disponible en userInfo
    const user = userInfo.user;

    const org = await db.select().from(organization).where(eq(organization.id, user.organizationId!)).limit(1);
    if (!org.length) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { instanceId } = org[0];

    const apiKey = process.env.EVOLUTION_API_KEY
    if (!instanceId || !apiKey) {
      return NextResponse.json({ error: 'Configuración de WhatsApp no encontrada' }, { status: 400 });
    }

    // Llamar a la API externa de WhatsApp para obtener chats
    console.log(`[CHATS] Llamando a Evolution API para obtener chats:`, {
      url: `${process.env.EVOLUTION_API_SERVER_URL}/chat/findChats/${instanceId}`,
      instanceId
    });

    const response = await fetch(`${process.env.EVOLUTION_API_SERVER_URL}/chat/findChats/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({})
    });

    console.log(`[CHATS] Respuesta de Evolution API:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CHATS] Error en API externa:`, {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error en API externa: ${response.status}`);
    }

    const chatsData = await response.json();
    console.log(`[CHATS] Datos recibidos de Evolution API:`, {
      type: typeof chatsData,
      isArray: Array.isArray(chatsData),
      length: Array.isArray(chatsData) ? chatsData.length : 'N/A',
      keys: typeof chatsData === 'object' ? Object.keys(chatsData) : 'N/A',
      sample: Array.isArray(chatsData) ? chatsData.slice(0, 2) : chatsData
    });
    
    // Verificar si chatsData es un array o necesita ser extraído
    let chatsArray: EvolutionChat[];
    
    if (Array.isArray(chatsData)) {
      console.log(`[CHATS] chatsData es un array directo con ${chatsData.length} elementos`);
      chatsArray = chatsData;
    } else if (chatsData && typeof chatsData === 'object') {
      console.log(`[CHATS] chatsData es un objeto, buscando array anidado:`, Object.keys(chatsData));
      
      // Intentar diferentes propiedades comunes donde podría estar el array
      if (chatsData.chats && Array.isArray(chatsData.chats)) {
        console.log(`[CHATS] Encontrado array en chatsData.chats con ${chatsData.chats.length} elementos`);
        chatsArray = chatsData.chats;
      } else if (chatsData.data && Array.isArray(chatsData.data)) {
        console.log(`[CHATS] Encontrado array en chatsData.data con ${chatsData.data.length} elementos`);
        chatsArray = chatsData.data;
      } else if (chatsData.result && Array.isArray(chatsData.result)) {
        console.log(`[CHATS] Encontrado array en chatsData.result con ${chatsData.result.length} elementos`);
        chatsArray = chatsData.result;
      } else {
        console.warn(`[CHATS] No se encontró array de chats en la respuesta:`, chatsData);
        chatsArray = [];
      }
    } else {
      console.warn(`[CHATS] chatsData no es un objeto válido:`, chatsData);
      chatsArray = [];
    }

    console.log(`[CHATS] Procesando ${chatsArray.length} chats`);

    // Transformar datos al formato esperado por el frontend
    const transformedChats = chatsArray.map((chat: EvolutionChat, index: number) => {
      console.log(`[CHATS] Procesando chat ${index + 1}:`, {
         id: chat.id,
         remoteJid: chat.remoteJid,
         name: chat.name,
         pushName: chat.pushName,
         hasLastMessage: false,
         lastMessageKeys: [],
         unreadCount: chat.unreadCount,
         isOnline: chat.isOnline
       });
      
      // Usar la función de transformación de tipos
      return transformChat(chat);
    });

    console.log(`[CHATS] Chats transformados exitosamente:`, {
      count: transformedChats.length,
      sample: transformedChats.slice(0, 2)
    });

    return NextResponse.json(transformedChats);
  } catch (error) {
    console.error('Error obteniendo chats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});

// POST /api/patients/chats - Crear nuevo chat o enviar mensaje
export const POST = withOptimizedAuthentication(async (request: NextRequest, userInfo: AuthenticatedUserInfo) => {
  try {
    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Número de teléfono y mensaje son requeridos' },
        { status: 400 }
      );
    }

    // La información del usuario ya está disponible en userInfo
    const user = userInfo.user;

    const org = await db.select().from(organization).where(eq(organization.id, user.organizationId!)).limit(1);
    if (!org.length) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const { instanceId } = org[0];
    const apiKey = process.env.EVOLUTION_API_KEY

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
        number: phoneNumber,
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Error en API externa: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});