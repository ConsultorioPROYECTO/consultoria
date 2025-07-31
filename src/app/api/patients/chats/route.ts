import { NextRequest, NextResponse } from 'next/server';
import { withAuthentication } from '@/app/lib/firebase/server/middleware/authMiddleware';
import { db } from '@/db';
import { organization } from '@/db/schema/organization';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';

// GET /api/patients/chats - Obtener lista de chats
export const GET = withAuthentication(async (request: NextRequest, decodedToken) => {
  try {
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

    // Llamar a la API externa de WhatsApp
    const response = await fetch(`${process.env.EVOLUTION_API_SERVER_URL}/chat/findChats/${instanceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Error en API externa: ${response.status}, respuesta}`);
    }

    const chatsData = await response.json();
    
    // Transformar datos al formato esperado por el frontend
    const transformedChats = chatsData.map((chat: unknown) => {
      const chatData = chat as {
        id?: string;
        remoteJid?: string;
        name?: string;
        pushName?: string;
        profilePicUrl?: string;
        lastMessage?: { message?: string; messageTimestamp?: number };
        timestamp?: number;
        unreadCount?: number;
        isOnline?: boolean;
      };
      return {
        id: chatData.id || chatData.remoteJid,
        patientName: chatData.name || chatData.pushName || chatData.remoteJid?.split('@')[0] || 'Usuario',
        patientAvatar: chatData.profilePicUrl,
        lastMessage: chatData.lastMessage?.message || 'Sin mensajes',
        timestamp: chatData.lastMessage?.messageTimestamp ? 
          new Date(chatData.lastMessage.messageTimestamp * 1000).toISOString() : 
          new Date().toISOString(),
        unreadCount: chatData.unreadCount || 0,
        isOnline: chatData.isOnline || false,
        messageStatus: 'read' as const
      };
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
export const POST = withAuthentication(async (request: NextRequest, decodedToken) => {
  try {
    const body = await request.json();
    const { phoneNumber, message } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Número de teléfono y mensaje son requeridos' },
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